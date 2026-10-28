export const CLASSIC_SCENERY = {
  id: 'classic',
  label: 'Classic lake',
  group: 'classic',
  image: '/images/board-night-lake.webp',
  accent: '#a5b6d7',
} as const;

export const SCENERIES = [
  {
    id: 'winter',
    label: 'Winter',
    group: 'season',
    image: '/images/scenery/winter.svg',
    accent: '#a8d9ee',
  },
  {
    id: 'spring',
    label: 'Spring',
    group: 'season',
    image: '/images/scenery/spring.svg',
    accent: '#e9aec9',
  },
  {
    id: 'summer',
    label: 'Summer',
    group: 'season',
    image: '/images/scenery/summer.svg',
    accent: '#eac980',
  },
  {
    id: 'autumn',
    label: 'Autumn',
    group: 'season',
    image: '/images/scenery/autumn.svg',
    accent: '#e8aa79',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    group: 'celebration',
    image: '/images/scenery/halloween.svg',
    accent: '#eeb07b',
  },
  {
    id: 'christmas',
    label: 'Christmas',
    group: 'celebration',
    image: '/images/scenery/christmas.svg',
    accent: '#cfb681',
  },
  {
    id: 'new-year',
    label: 'New Year',
    group: 'celebration',
    image: '/images/scenery/new-year.svg',
    accent: '#ddc389',
  },
  {
    id: 'st-patrick',
    label: 'St. Patrick’s Day',
    group: 'celebration',
    image: '/images/scenery/st-patrick.svg',
    accent: '#a2d49f',
  },
  {
    id: 'valentine',
    label: 'Valentine’s Day',
    group: 'celebration',
    image: '/images/scenery/valentine.svg',
    accent: '#e4a1b7',
  },
  {
    id: 'easter',
    label: 'Easter',
    group: 'celebration',
    image: '/images/scenery/easter.svg',
    accent: '#d5b4e6',
  },
  {
    id: 'earth-day',
    label: 'Earth Day',
    group: 'celebration',
    image: '/images/scenery/earth-day.svg',
    accent: '#9fceb6',
  },
  {
    id: 'midsummer',
    label: 'Midsummer',
    group: 'celebration',
    image: '/images/scenery/midsummer.svg',
    accent: '#dfc492',
  },
  {
    id: 'april-fools',
    label: 'April Fools’ Day',
    group: 'celebration',
    image: '/images/scenery/april-fools.svg',
    accent: '#c4b0eb',
  },
  CLASSIC_SCENERY,
] as const;

export type BoardScenery = (typeof SCENERIES)[number];
export type SceneryId = BoardScenery['id'];
export type SceneryPreference = 'auto' | SceneryId;

export function isSceneryPreference(value: unknown): value is SceneryPreference {
  return value === 'auto' || SCENERIES.some((scenery) => scenery.id === value);
}

function scenery(id: SceneryId): BoardScenery {
  return SCENERIES.find((entry) => entry.id === id)!;
}

/** A local calendar date, independent of time of day, timezone offset, or DST. */
function civilDay(year: number, month: number, day: number, julian = false): number {
  const adjustment = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - adjustment;
  const adjustedMonth = month + 12 * adjustment - 3;
  const base =
    day +
    Math.floor((153 * adjustedMonth + 2) / 5) +
    365 * adjustedYear +
    Math.floor(adjustedYear / 4);
  return julian
    ? base - 32083
    : base - Math.floor(adjustedYear / 100) + Math.floor(adjustedYear / 400) - 32045;
}

/** Gregorian computus; the result is a civil-day number for Easter Sunday. */
function westernEaster(year: number): number {
  const cycle = year % 19;
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const leapCenturies = Math.floor(century / 4);
  const correction = Math.floor((century + 8) / 25);
  const lunarCorrection = Math.floor((century - correction + 1) / 3);
  const epact = (19 * cycle + century - leapCenturies - lunarCorrection + 15) % 30;
  const weekday =
    (32 + 2 * (century % 4) + 2 * Math.floor(yearInCentury / 4) - epact - (yearInCentury % 4)) % 7;
  const exception = Math.floor((cycle + 11 * epact + 22 * weekday) / 451);
  const total = epact + weekday - 7 * exception + 114;
  return civilDay(year, Math.floor(total / 31), (total % 31) + 1);
}

/** Julian computus, converted through civil days rather than a fixed 13-day offset. */
function orthodoxEaster(year: number): number {
  const epact = (19 * (year % 19) + 15) % 30;
  const weekday = (2 * (year % 4) + 4 * (year % 7) - epact + 34) % 7;
  const total = epact + weekday + 114;
  return civilDay(year, Math.floor(total / 31), (total % 31) + 1, true);
}

/** Northern-hemisphere seasons with celebrations taking priority over the season. */
export function sceneryForDate(date: Date): BoardScenery {
  if (!Number.isFinite(date.getTime())) return scenery('classic');

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const calendarDay = month * 100 + day;

  if (calendarDay >= 1227 || calendarDay <= 107) return scenery('new-year');
  if (calendarDay >= 1218 && calendarDay <= 1226) return scenery('christmas');
  if (calendarDay >= 1024 && calendarDay <= 1102) return scenery('halloween');
  if (calendarDay >= 314 && calendarDay <= 318) return scenery('st-patrick');
  if (calendarDay >= 212 && calendarDay <= 215) return scenery('valentine');
  if (calendarDay === 401) return scenery('april-fools');

  const today = civilDay(year, month, day);
  if (
    [westernEaster(year), orthodoxEaster(year)].some(
      (sunday) => today >= sunday - 2 && today <= sunday + 1,
    )
  ) {
    return scenery('easter');
  }

  if (calendarDay >= 420 && calendarDay <= 423) return scenery('earth-day');
  if (calendarDay >= 620 && calendarDay <= 624) return scenery('midsummer');
  if (month >= 3 && month <= 5) return scenery('spring');
  if (month >= 6 && month <= 8) return scenery('summer');
  if (month >= 9 && month <= 11) return scenery('autumn');
  return scenery('winter');
}

export function resolveScenery(preference: SceneryPreference, date: Date): BoardScenery {
  return preference === 'auto' ? sceneryForDate(date) : scenery(preference);
}
