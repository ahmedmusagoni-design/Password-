export interface AppLaunchInterceptor {
  onAppLaunchAttempted(
    childId: string,
    appPackageName: string,
    appName: string,
  ): Promise<boolean>;
}

export interface StudyPlanNotice {
  title: string;
  subtitle: string;
  message: string;
  timeRemaining: string;
  timeRemainingLabel: string;
}

export class HomeworkModeDeviceController implements AppLaunchInterceptor {
  async onAppLaunchAttempted(
    _childId: string,
    _appPackageName: string,
    _appName: string,
  ): Promise<boolean> {
    return false;
  }

  getStudyPlanNotice(appName: string, timeRemainingMs: number): StudyPlanNotice {
    const totalMinutes = Math.max(0, Math.ceil(timeRemainingMs / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      title: 'Study plan',
      subtitle: `${appName} remains available`,
      message: 'This study timer does not block or monitor other apps.',
      timeRemaining: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      timeRemainingLabel: 'Study plan ends in',
    };
  }

  isAppCurrentlyBlocked(_childId: string, _appPackageName: string): boolean {
    return false;
  }
}

export const homeworkModeDeviceController = new HomeworkModeDeviceController();
