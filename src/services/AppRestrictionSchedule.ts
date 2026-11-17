export interface TimedRestriction {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface PrayerRestriction {
  enabled: boolean;
  times: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
}

export interface AppRestrictionSchedule {
  homework: TimedRestriction;
  bedtime: TimedRestriction;
  prayer: PrayerRestriction;
}

export interface RestrictionWindow {
  startTime: string;
  endTime: string;
}

export const DEFAULT_APP_RESTRICTION_SCHEDULE: AppRestrictionSchedule = {
  homework: { enabled: false, startTime: '15:00', endTime: '17:00' },
  bedtime: { enabled: false, startTime: '21:00', endTime: '07:00' },
  prayer: {
    enabled: false,
    times: {
      fajr: '',
      dhuhr: '',
      asr: '',
      maghrib: '',
      isha: '',
    },
  },
};

const PRAYER_DURATION_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;

const toMinutes = (time: string): number => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error(`Enter a valid 24-hour time (HH:mm): ${time || '(empty)'}.`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const fromMinutes = (minutes: number): string => {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const remainingMinutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

export const buildRestrictionWindows = (
  schedule: AppRestrictionSchedule,
): RestrictionWindow[] => {
  const intervals: Array<[number, number]> = [];
  const addInterval = (startTime: string, endTime: string) => {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start === end) {
      throw new Error('A restriction start and end time must be different.');
    }

    if (start < end) {
      intervals.push([start, end]);
    } else {
      intervals.push([start, MINUTES_PER_DAY], [0, end]);
    }
  };

  if (schedule.homework.enabled) {
    addInterval(schedule.homework.startTime, schedule.homework.endTime);
  }
  if (schedule.bedtime.enabled) {
    addInterval(schedule.bedtime.startTime, schedule.bedtime.endTime);
  }
  if (schedule.prayer.enabled) {
    Object.values(schedule.prayer.times).forEach((time) => {
      if (!time) {
        throw new Error('Enter all five prayer times or turn off prayer restrictions.');
      }
      const endTime = fromMinutes(toMinutes(time) + PRAYER_DURATION_MINUTES);
      addInterval(time, endTime);
    });
  }

  const sorted = intervals
    .filter(([start, end]) => start !== end)
    .sort(([startA], [startB]) => startA - startB);
  const merged: Array<[number, number]> = [];

  sorted.forEach(([start, end]) => {
    const previous = merged[merged.length - 1];
    if (previous && start <= previous[1]) {
      previous[1] = Math.max(previous[1], end);
    } else {
      merged.push([start, end]);
    }
  });

  if (merged.length > 1 && merged[0][0] === 0
    && merged[merged.length - 1][1] === MINUTES_PER_DAY) {
    const first = merged.shift()!;
    const last = merged.pop()!;
    merged.unshift([last[0], first[1]]);
  }

  return merged.map(([start, end]) => ({
    startTime: fromMinutes(start),
    endTime: fromMinutes(end),
  }));
};

export const isRestrictionActiveAt = (
  windows: RestrictionWindow[],
  time: string,
): boolean => {
  const currentMinute = toMinutes(time);
  return windows.some(({ startTime, endTime }) => {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return start < end
      ? currentMinute >= start && currentMinute < end
      : currentMinute >= start || currentMinute < end;
  });
};
