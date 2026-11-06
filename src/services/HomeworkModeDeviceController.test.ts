import { homeworkModeDeviceController } from './HomeworkModeDeviceController';

describe('study plan platform boundary', () => {
  it('does not claim to block app launches without a native integration', async () => {
    await expect(
      homeworkModeDeviceController.onAppLaunchAttempted('child', 'package.name', 'Example'),
    ).resolves.toBe(false);
    expect(homeworkModeDeviceController.isAppCurrentlyBlocked('child', 'package.name')).toBe(false);
  });

  it('explains that apps remain available during a study plan', () => {
    const notice = homeworkModeDeviceController.getStudyPlanNotice('Example', 30 * 60_000);
    expect(notice.subtitle).toBe('Example remains available');
    expect(notice.message).toContain('does not block or monitor');
  });
});
