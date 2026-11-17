import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppRestrictionSchedule,
  buildRestrictionWindows,
  isRestrictionActiveAt,
} from './AppRestrictionSchedule';

let DeviceActivity: typeof import('react-native-device-activity') | null = null;

if (Platform.OS === 'ios') {
  try {
    DeviceActivity = require('react-native-device-activity');
  } catch {
    DeviceActivity = null;
  }
}

const APP_SELECTION_ID = 'family-safety-selected-apps';
const SOCIAL_APP_SELECTION_ID = 'family-safety-social-apps';
const ACTIVITY_PREFIX = `family-safety-${APP_SELECTION_ID}-`;
const SOCIAL_PAUSE_KEY = 'family-safety-social-paused';
const APPROVED_AUTHORIZATION_STATUS = 2;
const MIN_WINDOW_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;

export type ScreenTimeAuthorizationMode = 'child' | 'individual';

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const windowLength = (startTime: string, endTime: string): number =>
  (toMinutes(endTime) - toMinutes(startTime) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

const currentClockTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// The parent's social pause is remembered locally so schedule changes and the end
// of a schedule window do not silently lift it (library 0.1.0 can only unblock everything).
const readSocialPaused = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(SOCIAL_PAUSE_KEY)) === '1';
  } catch {
    return false;
  }
};

const writeSocialPaused = async (paused: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(SOCIAL_PAUSE_KEY, paused ? '1' : '0');
  } catch {
    // Best effort: the pause itself was already applied on the device.
  }
};

// Actions run by the monitor extension when a window ends. If a parent pause is
// active, re-block the social selection after the global unblock.
const buildEndActions = (socialPaused: boolean) => [
  { type: 'unblockAllApps' as const },
  ...(socialPaused
    ? [{
      type: 'blockSelection' as const,
      familyActivitySelectionId: SOCIAL_APP_SELECTION_ID,
    }]
    : []),
];

const syncEndActions = (socialPaused: boolean): void => {
  const module = DeviceActivity;
  if (!module) {
    return;
  }
  module
    .getActivities()
    .filter((activityName) => activityName.startsWith(ACTIVITY_PREFIX))
    .forEach((activityName) => {
      module.configureActions({
        activityName,
        callbackName: 'intervalDidEnd',
        actions: buildEndActions(socialPaused),
      });
    });
};

const restoreSocialPause = async (): Promise<void> => {
  if (!DeviceActivity || !(await readSocialPaused())) {
    return;
  }
  const socialToken = DeviceActivity.getFamilyActivitySelectionId(SOCIAL_APP_SELECTION_ID);
  if (socialToken) {
    await DeviceActivity.blockApps(socialToken);
  }
};

const setShieldMessage = (title: string, subtitle: string): void => {
  DeviceActivity?.updateShield(
    {
      title,
      subtitle,
      iconSystemName: 'book.closed.fill',
      primaryButtonLabel: 'OK',
    },
    {
      primary: {
        type: 'dismiss',
        behavior: 'close',
      },
    },
  );
};

export const isAppRestrictionAvailable = (): boolean =>
  Platform.OS === 'ios'
  && DeviceActivity !== null
  && typeof DeviceActivity.isAvailable === 'function'
  && DeviceActivity.isAvailable();

export const getAppRestrictionAuthorizationStatus = () => {
  if (!DeviceActivity) {
    return 0;
  }
  return DeviceActivity.getAuthorizationStatus();
};

// Use 'child' on a child's device (needs Family Sharing). 'individual' is for testing
// on your own device only, because the user can turn it off in Settings.
export const requestAppRestrictionAuthorization = async (
  mode: ScreenTimeAuthorizationMode = 'child',
): Promise<void> => {
  if (!isAppRestrictionAvailable() || !DeviceActivity) {
    throw new Error('Scheduled app restrictions are available only in a custom iOS build.');
  }

  await DeviceActivity.requestAuthorization(mode);
  if (
    DeviceActivity.getAuthorizationStatus()
    !== APPROVED_AUTHORIZATION_STATUS
  ) {
    throw new Error('Screen Time authorization was not approved on this device.');
  }
};

export const saveSelectedApps = (selectionToken: string): void => {
  if (!DeviceActivity) {
    throw new Error('Screen Time is unavailable in Expo Go.');
  }
  if (!selectionToken) {
    throw new Error('Select at least one app to restrict.');
  }
  DeviceActivity.setFamilyActivitySelectionId({
    id: APP_SELECTION_ID,
    familyActivitySelection: selectionToken,
  });
};

export const saveSocialMediaSelection = (selectionToken: string): void => {
  if (!DeviceActivity) {
    throw new Error('Screen Time is unavailable in Expo Go.');
  }
  DeviceActivity.setFamilyActivitySelectionId({
    id: SOCIAL_APP_SELECTION_ID,
    familyActivitySelection: selectionToken,
  });
};

export const applyRemoteSocialMediaPause = async (
  paused: boolean,
  socialSelectionToken: string | undefined,
  schedule: AppRestrictionSchedule,
  scheduleSelectionToken: string | undefined,
): Promise<void> => {
  if (!isAppRestrictionAvailable() || !DeviceActivity) {
    throw new Error('Social-app controls are available only in a custom iOS build.');
  }
  if (DeviceActivity.getAuthorizationStatus() !== APPROVED_AUTHORIZATION_STATUS) {
    throw new Error('Authorize Screen Time on this device before applying the parent control.');
  }

  if (paused) {
    if (!socialSelectionToken) {
      throw new Error('Choose the social apps to include in the parent pause on this device first.');
    }
    setShieldMessage('Social apps restricted', 'A parent set a Screen Time restriction for these apps.');
    await DeviceActivity.blockApps(socialSelectionToken);
    await writeSocialPaused(true);
    syncEndActions(true);
    return;
  }

  await DeviceActivity.unblockApps();
  await writeSocialPaused(false);
  syncEndActions(false);
  setShieldMessage('Focus time', 'These apps are unavailable during a scheduled focus period.');
  if (scheduleSelectionToken) {
    const windows = buildRestrictionWindows(schedule);
    if (isRestrictionActiveAt(windows, currentClockTime())) {
      await DeviceActivity.blockApps(scheduleSelectionToken);
    }
  }
};

export const applyAppRestrictionSchedule = async (
  schedule: AppRestrictionSchedule,
  selectionToken: string,
): Promise<number> => {
  if (!isAppRestrictionAvailable() || !DeviceActivity) {
    throw new Error('Scheduled app restrictions are available only in a custom iOS build.');
  }
  if (
    DeviceActivity.getAuthorizationStatus()
    !== APPROVED_AUTHORIZATION_STATUS
  ) {
    throw new Error('Authorize Screen Time on this device before saving restrictions.');
  }
  const windows = buildRestrictionWindows(schedule);
  if (windows.length > 20) {
    throw new Error('The schedule creates too many daily restriction windows.');
  }
  if (windows.some(({ startTime, endTime }) => windowLength(startTime, endTime) < MIN_WINDOW_MINUTES)) {
    throw new Error(`Each restriction window must be at least ${MIN_WINDOW_MINUTES} minutes.`);
  }

  if (!selectionToken) {
    DeviceActivity.stopMonitoring();
    DeviceActivity.getActivities().forEach(DeviceActivity.cleanUpAfterActivity);
    DeviceActivity.setFamilyActivitySelectionId({
      id: APP_SELECTION_ID,
      familyActivitySelection: '',
    });
    await DeviceActivity.unblockApps();
    await restoreSocialPause();
    return 0;
  }

  saveSelectedApps(selectionToken);
  setShieldMessage('Focus time', 'These apps are unavailable during a scheduled focus period.');

  const socialPaused = await readSocialPaused();
  const previousActivities = DeviceActivity.getActivities();
  DeviceActivity.stopMonitoring(previousActivities);
  previousActivities.forEach(DeviceActivity.cleanUpAfterActivity);
  await DeviceActivity.unblockApps();

  try {
    await Promise.all(windows.map(async ({ startTime, endTime }, index) => {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const activityName = `${ACTIVITY_PREFIX}${index + 1}`;

      DeviceActivity.configureActions({
        activityName,
        callbackName: 'intervalDidStart',
        actions: [
          {
            type: 'blockSelection',
            familyActivitySelectionId: APP_SELECTION_ID,
          },
        ],
      });
      DeviceActivity.configureActions({
        activityName,
        callbackName: 'intervalDidEnd',
        actions: buildEndActions(socialPaused),
      });

      await DeviceActivity.startMonitoring(
        activityName,
        {
          intervalStart: { hour: startHour, minute: startMinute },
          intervalEnd: { hour: endHour, minute: endMinute },
          repeats: true,
        },
        [],
      );
    }));
  } catch (error) {
    DeviceActivity.stopMonitoring();
    DeviceActivity.getActivities().forEach(DeviceActivity.cleanUpAfterActivity);
    await DeviceActivity.unblockApps();
    await restoreSocialPause();
    throw error;
  }

  if (isRestrictionActiveAt(windows, currentClockTime())) {
    await DeviceActivity.blockApps(selectionToken);
  }
  // The parent's explicit pause is applied last so it is never lost.
  await restoreSocialPause();

  return windows.length;
};

export const clearAppRestrictionSchedule = async (): Promise<void> => {
  if (!DeviceActivity) {
    return;
  }
  const activities = DeviceActivity.getActivities();
  DeviceActivity.stopMonitoring(activities);
  activities.forEach(DeviceActivity.cleanUpAfterActivity);
  DeviceActivity.setFamilyActivitySelectionId({
    id: APP_SELECTION_ID,
    familyActivitySelection: '',
  });
  await DeviceActivity.unblockApps();
  await restoreSocialPause();
};

export const getSavedAppSelection = (): string | undefined => {
  if (!DeviceActivity) {
    return undefined;
  }
  return DeviceActivity.getFamilyActivitySelectionId(APP_SELECTION_ID);
};

export const getSavedSocialMediaSelection = (): string | undefined => {
  if (!DeviceActivity) {
    return undefined;
  }
  return DeviceActivity.getFamilyActivitySelectionId(SOCIAL_APP_SELECTION_ID);
};