import { TestBed } from '@angular/core/testing';
import { GameCountStorage } from './game-count-storage';

const STORAGE_KEY = 'clicksteria:games-started:v1';
const RECORD_KEY = 'clicksteria:classic:best:v1';
const STYLE_KEY = 'clicksteria.block-style';

describe('Game count storage', () => {
  let storage: GameCountStorage;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(RECORD_KEY, '73');
    localStorage.setItem(STYLE_KEY, 'minimal');
    storage = TestBed.inject(GameCountStorage);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RECORD_KEY);
    localStorage.removeItem(STYLE_KEY);
  });

  it('reads a missing counter as zero without changing other stored values', () => {
    expect(storage.read()).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it.each([0, 1, 402, Number.MAX_SAFE_INTEGER])(
    'restores the safe nonnegative count %i',
    (count) => {
      localStorage.setItem(STORAGE_KEY, String(count));
      expect(storage.read()).toBe(count);
    },
  );

  it.each([
    '',
    ' ',
    '\n',
    '-1',
    '1.5',
    '3.0',
    'NaN',
    'Infinity',
    '-Infinity',
    '9007199254740992',
    '1e3',
    '0x10',
    '+3',
    '3 games',
    'null',
    'undefined',
    '{}',
  ])('treats malformed stored text %j as zero', (serialized) => {
    localStorage.setItem(STORAGE_KEY, serialized);
    expect(storage.read()).toBe(0);
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it('writes one count without overwriting records or preferences', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    storage.write(9);
    expect(set).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, '9');
    expect(storage.read()).toBe(9);
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it.each([-1, 2.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'keeps a valid save when asked to write invalid count %j',
    (count) => {
      storage.write(8);
      const set = vi.spyOn(Storage.prototype, 'setItem');
      storage.write(count);
      expect(set).not.toHaveBeenCalled();
      expect(storage.read()).toBe(8);
    },
  );

  it('starts at one and advances from the latest value written by another tab', () => {
    expect(storage.increment(0)).toBe(1);
    localStorage.setItem(STORAGE_KEY, '12');
    expect(storage.increment(1)).toBe(13);
    expect(storage.read()).toBe(13);
    localStorage.setItem(STORAGE_KEY, '24');
    expect(storage.increment(13)).toBe(25);
    expect(storage.read()).toBe(25);
  });

  it('preserves a higher in-memory count when storage contains an earlier value', () => {
    storage.write(4);
    expect(storage.increment(9)).toBe(10);
    expect(storage.read()).toBe(10);
  });

  it.each([-1, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'ignores invalid in-memory count %j when incrementing',
    (current) => {
      storage.write(4);
      expect(storage.increment(current)).toBe(5);
      expect(storage.read()).toBe(5);
    },
  );

  it.each(['memory', 'storage'] as const)('saturates a maximum safe count from %s', (source) => {
    storage.write(source === 'storage' ? Number.MAX_SAFE_INTEGER : 3);
    const current = source === 'memory' ? Number.MAX_SAFE_INTEGER : 3;
    expect(storage.increment(current)).toBe(Number.MAX_SAFE_INTEGER);
    expect(storage.read()).toBe(Number.MAX_SAFE_INTEGER);
    expect(storage.increment(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('keeps advancing in memory if writes are blocked', () => {
    storage.write(12);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => storage.write(13)).not.toThrow();
    expect(storage.increment(7)).toBe(13);
    expect(storage.increment(13)).toBe(14);
    expect(storage.read()).toBe(12);
  });

  it('returns zero for blocked reads and still saves the incremented in-memory count', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem');
    expect(storage.read()).toBe(0);
    expect(storage.increment(7)).toBe(8);
    expect(set).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, '8');
  });

  it('handles unavailable storage during server rendering', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(storage.read()).toBe(0);
    expect(() => storage.write(3)).not.toThrow();
    expect(storage.increment(3)).toBe(4);
  });

  it('handles a blocked storage getter without losing the in-memory increment', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(storage.read()).toBe(0);
    expect(() => storage.write(3)).not.toThrow();
    expect(storage.increment(3)).toBe(4);
  });
});
