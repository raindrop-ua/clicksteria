import { TestBed } from '@angular/core/testing';
import { createBoard, removeGroup } from '@features/game/domain/game.engine';
import { GameSessionSnapshot } from '@features/game/domain/game-session';
import { GameSessionStorage } from './game-session-storage';

const STORAGE_KEY = 'clicksteria:classic:session:v1';
const RECORD_KEY = 'clicksteria:classic:best:v1';
const STYLE_KEY = 'clicksteria.block-style';

function opening(): GameSessionSnapshot {
  return { version: 1, current: { board: createBoard(() => 0), score: 0, moves: 0 }, history: [] };
}

function played(): GameSessionSnapshot {
  const initial = opening().current;
  return { version: 1, current: removeGroup(initial, { column: 0, row: 0 }), history: [initial] };
}

describe('Game session storage', () => {
  let storage: GameSessionStorage;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(RECORD_KEY, '73');
    localStorage.setItem(STYLE_KEY, 'minimal');
    storage = TestBed.inject(GameSessionStorage);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RECORD_KEY);
    localStorage.removeItem(STYLE_KEY);
  });

  it('returns null when there is no saved game', () => {
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    expect(storage.read()).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });

  it('writes the entire session with one setItem and restores the board and undo history', () => {
    const snapshot = played();
    const set = vi.spyOn(Storage.prototype, 'setItem');
    storage.write(snapshot);
    expect(set).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, JSON.stringify(snapshot));
    const restored = storage.read();
    expect(restored).toEqual(snapshot);
    expect(restored?.current).not.toBe(snapshot.current);
    expect(restored?.history[0].board).not.toBe(snapshot.history[0].board);
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it.each([
    ['broken JSON', '{'],
    ['empty text', ''],
    ['null', 'null'],
    ['missing data', '{}'],
    ['old data shape', '[]'],
    ['unknown version', JSON.stringify({ ...opening(), version: 2 })],
    ['invalid history', JSON.stringify({ ...played(), history: [] })],
  ])('discards %s without changing records or preferences', (_label, serialized) => {
    localStorage.setItem(STORAGE_KEY, serialized);
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    expect(storage.read()).toBeNull();
    expect(remove).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it('rejects oversized stored data before attempting to parse it', () => {
    localStorage.setItem(STORAGE_KEY, ' '.repeat(1_000_001));
    const parse = vi.spyOn(JSON, 'parse');
    expect(storage.read()).toBeNull();
    expect(parse).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('accepts valid stored JSON exactly at the size limit', () => {
    const snapshot = opening();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot).padEnd(1_000_000, ' '));
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    expect(storage.read()).toEqual(snapshot);
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps the last successful save when the next serialization exceeds the limit', () => {
    const snapshot = opening();
    storage.write(snapshot);
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const oversized = { ...played(), extra: 'x'.repeat(1_000_001) };
    storage.write(oversized);
    expect(set).not.toHaveBeenCalled();
    expect(storage.read()).toEqual(snapshot);
  });

  it('keeps the last successful save when setItem is blocked', () => {
    const snapshot = opening();
    storage.write(snapshot);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => storage.write(played())).not.toThrow();
    expect(storage.read()).toEqual(snapshot);
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
  });

  it('returns null when getItem is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(() => storage.read()).not.toThrow();
    expect(storage.read()).toBeNull();
  });

  it('returns null even when removing corrupt storage is blocked', () => {
    localStorage.setItem(STORAGE_KEY, '{');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(() => storage.read()).not.toThrow();
    expect(storage.read()).toBeNull();
    expect(localStorage.getItem(RECORD_KEY)).toBe('73');
    expect(localStorage.getItem(STYLE_KEY)).toBe('minimal');
  });

  it('does nothing when localStorage is unavailable during server rendering', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(storage.read()).toBeNull();
    expect(() => storage.write(opening())).not.toThrow();
  });

  it('tolerates a blocked localStorage getter', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(storage.read()).toBeNull();
    expect(() => storage.write(opening())).not.toThrow();
  });

  it('keeps the prior save if JSON serialization fails', () => {
    const snapshot = opening();
    storage.write(snapshot);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => storage.write(circular as unknown as GameSessionSnapshot)).not.toThrow();
    expect(storage.read()).toEqual(snapshot);
  });
});
