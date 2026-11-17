import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
let DeviceActivitySelectionView: React.ComponentType<any> = () => null;
if (Platform.OS === 'ios') {
  try {
    const mod = require('react-native-device-activity');
    if (mod?.DeviceActivitySelectionView) {
      DeviceActivitySelectionView = mod.DeviceActivitySelectionView;
    }
  } catch {
    // Native module unavailable in Expo Go
  }
}

import {
  AppRestrictionSchedule,
  DEFAULT_APP_RESTRICTION_SCHEDULE,
  PrayerRestriction,
  TimedRestriction,
} from '../services/AppRestrictionSchedule';
import {
  applyAppRestrictionSchedule,
  applyRemoteSocialMediaPause,
  clearAppRestrictionSchedule,
  getAppRestrictionAuthorizationStatus,
  getSavedAppSelection,
  getSavedSocialMediaSelection,
  isAppRestrictionAvailable,
  requestAppRestrictionAuthorization,
  saveSocialMediaSelection,
} from '../services/DeviceAppRestrictionService';
import { ApiError, parentApi } from '../services/ParentApi';

const STORAGE_KEY = 'app-restrictions-v1';
const SOCIAL_SELECTION_COUNTS_KEY = 'social-app-selection-counts-v1';

interface SelectionCounts {
  applications: number;
  categories: number;
  websites: number;
}

interface StoredPreferences {
  schedule: AppRestrictionSchedule;
  selectionCounts: SelectionCounts;
}

const DEFAULT_SELECTION_COUNTS: SelectionCounts = {
  applications: 0,
  categories: 0,
  websites: 0,
};
const APPROVED_AUTHORIZATION_STATUS = 2;
const isSelectionCounts = (value: unknown): value is SelectionCounts =>
  isRecord(value)
  && typeof value.applications === 'number'
  && typeof value.categories === 'number'
  && typeof value.websites === 'number';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTimedRestriction = (value: unknown): value is TimedRestriction =>
  isRecord(value)
  && typeof value.enabled === 'boolean'
  && typeof value.startTime === 'string'
  && typeof value.endTime === 'string';

const isPrayerRestriction = (value: unknown): value is PrayerRestriction => {
  if (!isRecord(value) || typeof value.enabled !== 'boolean' || !isRecord(value.times)) {
    return false;
  }
  const times = value.times;
  return ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].every(
    (name) => typeof times[name] === 'string',
  );
};

const isStoredPreferences = (value: unknown): value is StoredPreferences => {
  if (!isRecord(value) || !isRecord(value.schedule) || !isRecord(value.selectionCounts)) {
    return false;
  }
  const counts = value.selectionCounts;
  return isTimedRestriction(value.schedule.homework)
    && isTimedRestriction(value.schedule.bedtime)
    && isPrayerRestriction(value.schedule.prayer)
    && typeof counts.applications === 'number'
    && typeof counts.categories === 'number'
    && typeof counts.websites === 'number';
};

const AppRestrictionsPanel: React.FC = () => {
  const [schedule, setSchedule] = useState<AppRestrictionSchedule>(
    DEFAULT_APP_RESTRICTION_SCHEDULE,
  );
  const [selectionToken, setSelectionToken] = useState<string | undefined>();
  const [selectionCounts, setSelectionCounts] = useState(DEFAULT_SELECTION_COUNTS);
  const [socialSelectionToken, setSocialSelectionToken] = useState<string | undefined>();
  const [socialSelectionCounts, setSocialSelectionCounts] = useState(DEFAULT_SELECTION_COUNTS);
  const [authorizationStatus, setAuthorizationStatus] = useState(0);
  const [loading, setLoading] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);
  const [syncingRemote, setSyncingRemote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [remoteControlStatus, setRemoteControlStatus] = useState('Waiting for the parent control.');
  const lastControlRevision = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let active = true;
    const loadPreferences = async () => {
      try {
        if (!isAppRestrictionAvailable()) {
          throw new Error('Screen Time support is not available in this iOS build.');
        }
        const [stored, selectedApps, selectedSocialApps, socialCountsStored] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          Promise.resolve(getSavedAppSelection()),
          Promise.resolve(getSavedSocialMediaSelection()),
          AsyncStorage.getItem(SOCIAL_SELECTION_COUNTS_KEY),
        ]);
        if (!active) return;

        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (!isStoredPreferences(parsed)) {
            throw new Error('Saved app restriction settings are invalid.');
          }
          setSchedule(parsed.schedule);
          setSelectionCounts(parsed.selectionCounts);
        }
        if (socialCountsStored) {
          const parsedCounts: unknown = JSON.parse(socialCountsStored);
          if (!isSelectionCounts(parsedCounts)) {
            throw new Error('Saved social-app selection counts are invalid.');
          }
          setSocialSelectionCounts(parsedCounts);
        }
        setSelectionToken(selectedApps);
        setSocialSelectionToken(selectedSocialApps);
        setAuthorizationStatus(getAppRestrictionAuthorizationStatus());
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load iOS app restriction settings.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'ios'
      || loading
      || !parentApi.isConfigured
      || authorizationStatus !== APPROVED_AUTHORIZATION_STATUS
    ) return undefined;

    let active = true;
    let checking = false;
    const syncParentControl = async () => {
      if (!active || checking || AppState.currentState !== 'active') return;
      checking = true;
      try {
        const control = await parentApi.getAssignedSocialMediaControl();
        if (!active) return;
        if (control.revision === 0) {
          setRemoteControlStatus('No parent social-app pause is active.');
          return;
        }
        if (lastControlRevision.current === control.revision) {
          if (control.paused) {
            await applyRemoteSocialMediaPause(
              true,
              socialSelectionToken,
              schedule,
              selectionToken,
            );
          }
          setRemoteControlStatus(
            control.paused
              ? 'Parent pause is active on this device; the app is checking for changes.'
              : 'Parent pause is off on this device.',
          );
          return;
        }
        if (
          control.paused
          && (!socialSelectionToken
            || socialSelectionCounts.applications === 0
            || socialSelectionCounts.categories > 0
            || socialSelectionCounts.websites > 0)
        ) {
          setRemoteControlStatus(
            'Parent requested a pause. Choose individual social apps below to apply it.',
          );
          return;
        }

        await applyRemoteSocialMediaPause(
          control.paused,
          socialSelectionToken,
          schedule,
          selectionToken,
        );
        await parentApi.acknowledgeSocialMediaControl(control.revision, control.paused);
        if (!active) return;
        lastControlRevision.current = control.revision;
        setRemoteControlStatus(
          control.paused
            ? 'Parent pause is active on this device.'
            : 'Parent pause is off on this device.',
        );
      } catch (controlError) {
        if (!active) return;
        const detail = controlError instanceof Error ? controlError.message : 'Could not apply the parent control.';
        setRemoteControlStatus(`Parent control is waiting: ${detail}`);
      } finally {
        checking = false;
      }
    };

    void syncParentControl();
    const interval = setInterval(() => { void syncParentControl(); }, 15000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void syncParentControl();
    });

    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [
    authorizationStatus,
    loading,
    schedule,
    selectionToken,
    socialSelectionCounts,
    socialSelectionToken,
  ]);

  const updateTimedRestriction = (
    key: 'homework' | 'bedtime',
    changes: Partial<TimedRestriction>,
  ) => {
    setSchedule((current) => ({
      ...current,
      [key]: { ...current[key], ...changes },
    }));
    setMessage(null);
  };

  const handleSocialSelectionChange = async (selection: {
    familyActivitySelection: string;
    applicationCount: number;
    categoryCount: number;
    webDomainCount: number;
  }) => {
    const token = selection.familyActivitySelection;
    const counts = {
      applications: selection.applicationCount,
      categories: selection.categoryCount,
      websites: selection.webDomainCount,
    };
    setSocialSelectionToken(token);
    setSocialSelectionCounts(counts);
    setError(null);
    setMessage(null);
    try {
      saveSocialMediaSelection(token);
      await AsyncStorage.setItem(SOCIAL_SELECTION_COUNTS_KEY, JSON.stringify(counts));
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Could not save the selected social apps.',
      );
    }
  };

  const updatePrayerRestriction = (changes: Partial<PrayerRestriction>) => {
    setSchedule((current) => ({
      ...current,
      prayer: { ...current.prayer, ...changes },
    }));
    setMessage(null);
  };

  const updatePrayerTime = (name: keyof PrayerRestriction['times'], time: string) => {
    updatePrayerRestriction({
      times: { ...schedule.prayer.times, [name]: time },
    });
  };

  const handleAuthorization = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await requestAppRestrictionAuthorization();
      setAuthorizationStatus(getAppRestrictionAuthorizationStatus());
    } catch (authorizationError) {
      setError(
        authorizationError instanceof Error
          ? authorizationError.message
          : 'Could not request Screen Time authorization.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoteScheduleSync = async () => {
    setSyncingRemote(true);
    setError(null);
    setMessage(null);
    try {
      const result = await parentApi.getAssignedRestrictionSchedule();
      setSchedule(result.schedule);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ schedule: result.schedule, selectionCounts }),
      );

      if (
        selectionToken
        && selectionCounts.applications > 0
        && selectionCounts.categories === 0
        && selectionCounts.websites === 0
        && authorizationStatus === APPROVED_AUTHORIZATION_STATUS
      ) {
        const windowCount = await applyAppRestrictionSchedule(result.schedule, selectionToken);
        setMessage(
          windowCount === 0
            ? 'Parent schedule synced. No restriction windows are enabled yet.'
            : 'Parent schedule synced and scheduled app restrictions are active on this device.',
        );
      } else {
        setMessage(
          'Parent schedule synced. Approve Screen Time and select individual apps on this device to enforce it.',
        );
      }
    } catch (syncError) {
      if (syncError instanceof ApiError && syncError.status === 401) {
        try {
          await clearAppRestrictionSchedule();
        } catch (clearError) {
          setError(
            clearError instanceof Error
              ? `This device is no longer linked, but its local restrictions could not be cleared: ${clearError.message}`
              : 'This device is no longer linked, but its local restrictions could not be cleared.',
          );
          return;
        }
        setSchedule(DEFAULT_APP_RESTRICTION_SCHEDULE);
        setSelectionToken(undefined);
        setSelectionCounts(DEFAULT_SELECTION_COUNTS);
        setSocialSelectionToken(undefined);
        setSocialSelectionCounts(DEFAULT_SELECTION_COUNTS);
        try {
          saveSocialMediaSelection('');
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEY),
            AsyncStorage.removeItem(SOCIAL_SELECTION_COUNTS_KEY),
          ]);
          await parentApi.signOut();
          setMessage('This device is no longer linked. Its saved Screen Time restrictions were cleared on this device.');
        } catch (storageError) {
          setError(
            storageError instanceof Error
              ? `Restrictions were cleared on this device, but saved settings could not be removed: ${storageError.message}`
              : 'Restrictions were cleared on this device, but saved settings could not be removed.',
          );
        }
        return;
      }
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync the parent schedule from the family server.',
      );
    } finally {
      setSyncingRemote(false);
    }
  };

  const handleSelectionChange = (selection: {
    familyActivitySelection: string;
    applicationCount: number;
    categoryCount: number;
    webDomainCount: number;
  }) => {
    setSelectionToken(selection.familyActivitySelection);
    setSelectionCounts({
      applications: selection.applicationCount,
      categories: selection.categoryCount,
      websites: selection.webDomainCount,
    });
    setError(null);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (selectionCounts.categories > 0 || selectionCounts.websites > 0) {
        throw new Error('Select individual apps only, not categories or websites.');
      }
      if (selectionCounts.applications === 0 || !selectionToken) {
        await clearAppRestrictionSchedule();
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ schedule, selectionCounts }),
        );
        setMessage('App restrictions were removed from this device.');
        return;
      }
      const windowCount = await applyAppRestrictionSchedule(schedule, selectionToken);
      const stored: StoredPreferences = { schedule, selectionCounts };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setMessage(
        windowCount === 0
          ? 'Settings saved. Turn on a schedule to start blocking selected apps.'
          : 'Restrictions saved and scheduled on this iPhone or iPad.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the app restriction schedule.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scheduled app restrictions</Text>
        <Text style={styles.body}>
          Parents can set schedule times on the 4001 family server. Actual app pausing requires the
          native iOS app, Screen Time approval, and apps selected on this device. Android and web
          cannot enforce these schedules in this build.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#167E78" />
        <Text style={styles.body}>Loading Screen Time settings…</Text>
      </View>
    );
  }

  const isAuthorized = authorizationStatus === APPROVED_AUTHORIZATION_STATUS;
  const canEdit = isAuthorized && !saving;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scheduled app restrictions</Text>
      <Text style={styles.body}>
        A parent can set homework, bedtime, and prayer times on the 4001 family server. This iOS
        device must approve Screen Time and select apps before those times can pause them.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={saving || syncingRemote || !parentApi.isConfigured}
        onPress={handleRemoteScheduleSync}
        style={({ pressed }) => [
          styles.secondaryButton,
          (pressed || saving || syncingRemote || !parentApi.isConfigured) && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {syncingRemote ? 'Syncing…' : 'Sync parent schedule'}
        </Text>
      </Pressable>
      {!parentApi.isConfigured && (
        <Text style={styles.warning}>
          Set EXPO_PUBLIC_PARENT_API_URL in the native build to sync schedules from the 4001 server.
        </Text>
      )}

      {!isAuthorized ? (
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleAuthorization}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Waiting for approval…' : 'Set up Screen Time restrictions'}
          </Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Parent social-app switch</Text>
          <Text style={styles.body}>
            Choose the individual social apps the parent switch may pause. Keep Family Safety open
            and connected on this iPhone or iPad to receive changes; iOS does not deliver this
            control while the app is closed. Screen Time restricts access but does not force-close
            apps or remove them from the app switcher.
          </Text>
          <Text style={styles.selectionTitle}>
            Social apps selected: {socialSelectionCounts.applications}
          </Text>
          <View style={styles.picker}>
            <DeviceActivitySelectionView
              familyActivitySelection={socialSelectionToken}
              headerText="Choose social apps"
              onSelectionChange={(event: { nativeEvent: Parameters<typeof handleSocialSelectionChange>[0] }) =>
                void handleSocialSelectionChange(event.nativeEvent)}
              style={styles.pickerView}
            />
          </View>
          {(socialSelectionCounts.categories > 0 || socialSelectionCounts.websites > 0) && (
            <Text accessibilityRole="alert" style={styles.warning}>
              Select individual social apps only; categories and websites are not supported by this switch.
            </Text>
          )}
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {remoteControlStatus}
          </Text>

          <Text style={styles.selectionTitle}>
            Selected apps: {selectionCounts.applications}
          </Text>
          <Text style={styles.body}>
            Use the Apple picker to select individual apps only. Categories and websites are not
            included in the schedule.
          </Text>
          <View style={styles.picker}>
            <DeviceActivitySelectionView
              familyActivitySelection={selectionToken}
              headerText="Choose apps to pause"
              onSelectionChange={(event: { nativeEvent: Parameters<typeof handleSelectionChange>[0] }) =>
                handleSelectionChange(event.nativeEvent)}
              style={styles.pickerView}
            />
          </View>

          {(selectionCounts.categories > 0 || selectionCounts.websites > 0) && (
            <Text accessibilityRole="alert" style={styles.warning}>
              Remove selected categories and websites; this schedule is for individual apps only.
            </Text>
          )}

          <Text style={styles.sectionTitle}>Homework</Text>
          <TimedRestrictionEditor
            disabled={!canEdit}
            enabled={schedule.homework.enabled}
            endTime={schedule.homework.endTime}
            onChange={(changes) => updateTimedRestriction('homework', changes)}
            startTime={schedule.homework.startTime}
          />

          <Text style={styles.sectionTitle}>Bedtime</Text>
          <TimedRestrictionEditor
            disabled={!canEdit}
            enabled={schedule.bedtime.enabled}
            endTime={schedule.bedtime.endTime}
            onChange={(changes) => updateTimedRestriction('bedtime', changes)}
            startTime={schedule.bedtime.startTime}
          />

          <Text style={styles.sectionTitle}>Prayer times</Text>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Pause selected apps at prayer times</Text>
            <Switch
              disabled={!canEdit}
              onValueChange={(enabled) => updatePrayerRestriction({ enabled })}
              value={schedule.prayer.enabled}
            />
          </View>
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((name) => (
            <View key={name} style={styles.prayerRow}>
              <Text style={styles.prayerName}>{name[0].toUpperCase() + name.slice(1)}</Text>
              <TextInput
                accessibilityLabel={`${name} prayer time`}
                editable={canEdit && schedule.prayer.enabled}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                onChangeText={(time) => updatePrayerTime(name, time)}
                placeholder="HH:mm"
                style={styles.timeInput}
                value={schedule.prayer.times[name]}
              />
            </View>
          ))}
          <Text style={styles.note}>
            Enter your local 24-hour prayer times. Selected apps are blocked for 15 minutes from
            each prayer time. Schedules repeat every day and follow this device’s local time.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={!canEdit}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canEdit || pressed) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving…' : 'Save app restrictions'}
            </Text>
          </Pressable>
        </>
      )}

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {message}
        </Text>
      )}
      <Text style={styles.note}>
        This feature shields selected apps; it does not power off or lock the whole device.
        Parent schedules are stored on the family server. Sync again after the parent changes a schedule;
        social-app changes are checked every 15 seconds while the iOS app is active and again when
        it returns to the foreground. Changes cannot be delivered while it is closed. If the device
        is unlinked, sync from this screen to clear restrictions already stored locally.
      </Text>
    </View>
  );
};

interface TimedRestrictionEditorProps {
  disabled: boolean;
  enabled: boolean;
  startTime: string;
  endTime: string;
  onChange: (changes: Partial<TimedRestriction>) => void;
}

const TimedRestrictionEditor: React.FC<TimedRestrictionEditorProps> = ({
  disabled,
  enabled,
  startTime,
  endTime,
  onChange,
}) => (
  <>
    <View style={styles.switchRow}>
      <Text style={styles.label}>Enable daily schedule</Text>
      <Switch
        disabled={disabled}
        onValueChange={(nextEnabled) => onChange({ enabled: nextEnabled })}
        value={enabled}
      />
    </View>
    <View style={styles.timeRow}>
      <TimeInput
        accessibilityLabel="Restriction start time"
        editable={enabled && !disabled}
        label="Start"
        onChangeText={(time) => onChange({ startTime: time })}
        value={startTime}
      />
      <TimeInput
        accessibilityLabel="Restriction end time"
        editable={enabled && !disabled}
        label="End"
        onChangeText={(time) => onChange({ endTime: time })}
        value={endTime}
      />
    </View>
  </>
);

interface TimeInputProps {
  accessibilityLabel: string;
  editable: boolean;
  label: string;
  onChangeText: (time: string) => void;
  value: string;
}

const TimeInput: React.FC<TimeInputProps> = ({
  accessibilityLabel,
  editable,
  label,
  onChangeText,
  value,
}) => (
  <View style={styles.timeField}>
    <Text style={styles.label}>{label} (24-hour)</Text>
    <TextInput
      accessibilityLabel={accessibilityLabel}
      editable={editable}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      onChangeText={onChangeText}
      placeholder="HH:mm"
      style={[styles.timeInput, !editable && styles.disabledInput]}
      value={value}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  title: {
    color: '#183A3C',
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: '#46585B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  status: {
    backgroundColor: '#F3F6F6',
    borderRadius: 8,
    color: '#365254',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    padding: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#167E78',
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFF5EF',
    borderColor: '#F0CBB3',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#A43E0D',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
  selectionTitle: {
    color: '#183A3C',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
  picker: {
    borderColor: '#D5DEDE',
    borderRadius: 8,
    borderWidth: 1,
    height: 300,
    marginTop: 10,
    overflow: 'hidden',
  },
  pickerView: {
    flex: 1,
    width: '100%',
  },
  warning: {
    color: '#9B4B00',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#183A3C',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
  },
  switchRow: {
    alignItems: 'center',
    borderBottomColor: '#E8EEEE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    color: '#34494B',
    flexShrink: 1,
    fontSize: 14,
    marginRight: 12,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  timeField: {
    flex: 1,
  },
  timeInput: {
    borderColor: '#D5DEDE',
    borderRadius: 7,
    borderWidth: 1,
    color: '#183A3C',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  disabledInput: {
    backgroundColor: '#F3F6F6',
    color: '#708082',
  },
  prayerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  prayerName: {
    color: '#34494B',
    fontSize: 14,
    width: 90,
  },
  note: {
    color: '#657679',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  error: {
    color: '#A12A2A',
    fontSize: 13,
    marginTop: 12,
  },
  success: {
    color: '#167E78',
    fontSize: 13,
    marginTop: 12,
  },
});

export default AppRestrictionsPanel;
