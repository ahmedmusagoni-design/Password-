import {
  AppRestrictionSchedule,
  buildRestrictionWindows,
  DEFAULT_APP_RESTRICTION_SCHEDULE,
  isRestrictionActiveAt,
} from './AppRestrictionSchedule';

const makeSchedule = (
  overrides: Partial<AppRestrictionSchedule> = {},
): AppRestrictionSchedule => ({
  ...DEFAULT_APP_RESTRICTION_SCHEDULE,
  ...overrides,
});

describe('buildRestrictionWindows', () => {
  it('merges overlapping homework, sleep, and prayer windows', () => {
    const windows = buildRestrictionWindows(makeSchedule({
      homework: { enabled: true, startTime: '14:00', endTime: '16:00' },
      prayer: {
        enabled: true,
        times: {
          fajr: '05:00',
          dhuhr: '14:30',
          asr: '16:00',
          maghrib: '18:00',
          isha: '20:00',
        },
      },
    }));

    expect(windows).toEqual([
      { startTime: '05:00', endTime: '05:15' },
      { startTime: '14:00', endTime: '16:15' },
      { startTime: '18:00', endTime: '18:15' },
      { startTime: '20:00', endTime: '20:15' },
    ]);
  });

  it('merges bedtime and prayer windows across midnight', () => {
    const windows = buildRestrictionWindows(makeSchedule({
      bedtime: { enabled: true, startTime: '21:00', endTime: '06:00' },
      prayer: {
        enabled: true,
        times: {
          fajr: '05:50',
          dhuhr: '12:00',
          asr: '15:00',
          maghrib: '18:00',
          isha: '20:00',
        },
      },
    }));

    expect(windows).toEqual([
      { startTime: '21:00', endTime: '06:05' },
      { startTime: '12:00', endTime: '12:15' },
      { startTime: '15:00', endTime: '15:15' },
      { startTime: '18:00', endTime: '18:15' },
      { startTime: '20:00', endTime: '20:15' },
    ]);
  });

  it('merges a prayer window across midnight with another restriction', () => {
    const windows = buildRestrictionWindows(makeSchedule({
      homework: { enabled: true, startTime: '00:05', endTime: '00:30' },
      prayer: {
        enabled: true,
        times: {
          fajr: '05:00',
          dhuhr: '12:00',
          asr: '15:00',
          maghrib: '18:00',
          isha: '23:55',
        },
      },
    }));

    expect(windows).toContainEqual({ startTime: '23:55', endTime: '00:30' });
    expect(isRestrictionActiveAt(windows, '00:20')).toBe(true);
  });

  it('ignores disabled schedules and returns no windows by default', () => {
    expect(buildRestrictionWindows(DEFAULT_APP_RESTRICTION_SCHEDULE)).toEqual([]);
  });

  it('rejects invalid times and incomplete enabled prayer schedules', () => {
    expect(() => buildRestrictionWindows(makeSchedule({
      homework: { enabled: true, startTime: '25:00', endTime: '17:00' },
    }))).toThrow('Enter a valid 24-hour time');

    expect(() => buildRestrictionWindows(makeSchedule({
      prayer: { ...DEFAULT_APP_RESTRICTION_SCHEDULE.prayer, enabled: true },
    }))).toThrow('Enter all five prayer times');
  });

  it('rejects equal start and end times instead of treating them as all-day blocks', () => {
    expect(() => buildRestrictionWindows(makeSchedule({
      homework: { enabled: true, startTime: '15:00', endTime: '15:00' },
    }))).toThrow('must be different');
  });
});

describe('isRestrictionActiveAt', () => {
  it('checks both sides of an overnight window and excludes its end time', () => {
    const windows = [{ startTime: '21:00', endTime: '06:00' }];

    expect(isRestrictionActiveAt(windows, '23:30')).toBe(true);
    expect(isRestrictionActiveAt(windows, '05:59')).toBe(true);
    expect(isRestrictionActiveAt(windows, '06:00')).toBe(false);
    expect(isRestrictionActiveAt(windows, '12:00')).toBe(false);
  });
});
