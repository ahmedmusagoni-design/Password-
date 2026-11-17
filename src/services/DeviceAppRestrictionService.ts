import { Platform } from 'react-native';
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
const APPROVED_AUTHORIZATION_STATUS = 2;

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

export const requestAppRestrictionAuthorization = async (): Promise<void> => {
  if (!isAppRestrictionAvailable() || !DeviceActivity) {
    throw new Error('Scheduled app restrictions are available only in a custom iOS build.');
  }

  await DeviceActivity.requestAuthorization('individual');
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
    return;
  }

  await DeviceActivity.unblockApps();
  setShieldMessage('Focus time', 'These apps are unavailable during a scheduled focus period.');
  if (scheduleSelectionToken) {
    const windows = buildRestrictionWindows(schedule);
    const currentTime = new Date();
    const currentClockTime = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    if (isRestrictionActiveAt(windows, currentClockTime)) {
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

  if (!selectionToken) {
    DeviceActivity.stopMonitoring();
    DeviceActivity.getActivities().forEach(DeviceActivity.cleanUpAfterActivity);
    DeviceActivity.setFamilyActivitySelectionId({
      id: APP_SELECTION_ID,
      familyActivitySelection: '',
    });
    await DeviceActivity.unblockApps();
    return 0;
  }

  saveSelectedApps(selectionToken);
  setShieldMessage('Focus time', 'These apps are unavailable during a scheduled focus period.');

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
        actions: [{ type: 'unblockAllApps' }],
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
    throw error;
  }

  const currentTime = new Date();
  const currentClockTime = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
  if (isRestrictionActiveAt(windows, currentClockTime)) {
    await DeviceActivity.blockApps(selectionToken);
  }

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
