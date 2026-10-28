import { isSceneryPreference, resolveScenery, SCENERIES, sceneryForDate } from './board-scenery';

function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

describe('board scenery calendar', () => {
  it.each([
    ['2026-01-08', 'winter'],
    ['2026-02-28', 'winter'],
    ['2026-03-01', 'spring'],
    ['2026-05-31', 'spring'],
    ['2026-06-01', 'summer'],
    ['2026-08-31', 'summer'],
    ['2026-09-01', 'autumn'],
    ['2026-11-30', 'autumn'],
    ['2026-12-01', 'winter'],
  ])('uses the northern-hemisphere season on %s', (date, expected) => {
    expect(sceneryForDate(localDate(date)).id).toBe(expected);
  });

  it.each([
    ['2026-12-17', 'winter'],
    ['2026-12-18', 'christmas'],
    ['2026-12-26', 'christmas'],
    ['2026-12-27', 'new-year'],
    ['2026-12-31', 'new-year'],
    ['2027-01-01', 'new-year'],
    ['2027-01-07', 'new-year'],
    ['2027-01-08', 'winter'],
    ['2026-10-23', 'autumn'],
    ['2026-10-24', 'halloween'],
    ['2026-11-02', 'halloween'],
    ['2026-11-03', 'autumn'],
    ['2026-02-11', 'winter'],
    ['2026-02-12', 'valentine'],
    ['2026-02-15', 'valentine'],
    ['2026-02-16', 'winter'],
    ['2026-03-13', 'spring'],
    ['2026-03-14', 'st-patrick'],
    ['2026-03-18', 'st-patrick'],
    ['2026-03-19', 'spring'],
    ['2026-03-31', 'spring'],
    ['2026-04-01', 'april-fools'],
    ['2026-04-02', 'spring'],
    ['2026-04-19', 'spring'],
    ['2026-04-20', 'earth-day'],
    ['2026-04-23', 'earth-day'],
    ['2026-04-24', 'spring'],
    ['2026-06-19', 'summer'],
    ['2026-06-20', 'midsummer'],
    ['2026-06-24', 'midsummer'],
    ['2026-06-25', 'summer'],
  ])('applies celebration boundaries on %s', (date, expected) => {
    expect(sceneryForDate(localDate(date)).id).toBe(expected);
  });

  it.each([
    '2026-04-05', // Western Easter.
    '2026-04-12', // Orthodox Easter.
    '2027-03-28',
    '2027-05-02',
    '2028-04-16', // Both calendars coincide.
    '2029-04-01', // April Fools takes priority on the Sunday itself.
    '2029-04-08',
    '2030-04-21',
    '2030-04-28',
    '2100-03-28',
    '2100-05-02', // Julian/Gregorian offset becomes fourteen days.
  ])('covers the Friday through Monday around Easter %s', (value) => {
    const sunday = localDate(value);
    for (let offset = -2; offset <= 1; offset++) {
      const date = new Date(sunday);
      date.setDate(date.getDate() + offset);
      const expected = date.getMonth() === 3 && date.getDate() === 1 ? 'april-fools' : 'easter';
      expect(sceneryForDate(date).id).toBe(expected);
    }
  });

  it('gives Easter priority over Earth Day where their windows overlap', () => {
    expect(sceneryForDate(localDate('2030-04-20')).id).toBe('easter');
    expect(sceneryForDate(localDate('2030-04-22')).id).toBe('easter');
    expect(sceneryForDate(localDate('2030-04-23')).id).toBe('earth-day');
  });

  it('does not extend Easter beyond the Friday through Monday window', () => {
    expect(sceneryForDate(localDate('2026-04-02')).id).toBe('spring');
    expect(sceneryForDate(localDate('2026-04-07')).id).toBe('spring');
    expect(sceneryForDate(localDate('2026-04-09')).id).toBe('spring');
    expect(sceneryForDate(localDate('2026-04-14')).id).toBe('spring');
  });

  it('uses the browser-local calendar date at both ends of a day', () => {
    expect(sceneryForDate(new Date(2026, 9, 24, 0, 0, 0)).id).toBe('halloween');
    expect(sceneryForDate(new Date(2026, 10, 2, 23, 59, 59)).id).toBe('halloween');
  });

  it('falls back to the original lake for invalid dates', () => {
    expect(sceneryForDate(new Date(Number.NaN)).id).toBe('classic');
  });

  it('keeps an explicit choice regardless of the current season or celebration', () => {
    expect(resolveScenery('winter', localDate('2026-10-31')).id).toBe('winter');
    expect(resolveScenery('classic', localDate('2026-12-25')).id).toBe('classic');
    expect(resolveScenery('auto', localDate('2026-10-31')).id).toBe('halloween');
  });

  it('accepts only known saved preferences', () => {
    for (const entry of SCENERIES) expect(isSceneryPreference(entry.id)).toBe(true);
    expect(isSceneryPreference('auto')).toBe(true);
    for (const value of [undefined, null, '', 'constructor', '__proto__', 'snow', 0, {}]) {
      expect(isSceneryPreference(value)).toBe(false);
    }
  });

  it('provides unique local assets and labels for every scenery', () => {
    expect(new Set(SCENERIES.map((entry) => entry.id)).size).toBe(SCENERIES.length);
    expect(new Set(SCENERIES.map((entry) => entry.image)).size).toBe(SCENERIES.length);
    expect(SCENERIES.every((entry) => entry.image.startsWith('/images/') && entry.label)).toBe(
      true,
    );
  });
});
