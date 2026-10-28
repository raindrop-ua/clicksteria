import { TestBed } from '@angular/core/testing';
import { BoardSceneryService } from './board-scenery.service';

const STORAGE_KEY = 'clicksteria.scenery';

describe('BoardSceneryService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 12));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.removeItem(STORAGE_KEY);
  });

  function setup() {
    const service = TestBed.inject(BoardSceneryService);
    TestBed.tick();
    return service;
  }

  it('keeps the first render stable, then chooses a local-calendar celebration', () => {
    const service = TestBed.inject(BoardSceneryService);
    expect(service.scenery().id).toBe('classic');
    TestBed.tick();
    expect(service.preference()).toBe('auto');
    expect(service.scenery().id).toBe('halloween');
    expect(service.automaticScenery().id).toBe('halloween');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('persists and restores a manual choice without following calendar changes', () => {
    const service = setup();
    service.setPreference('summer');
    expect(service.scenery().id).toBe('summer');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('summer');
    vi.setSystemTime(new Date(2026, 11, 25, 12));
    window.dispatchEvent(new Event('focus'));
    expect(service.scenery().id).toBe('summer');
    expect(service.automaticScenery().id).toBe('christmas');
    TestBed.resetTestingModule();
    expect(setup().scenery().id).toBe('summer');
  });

  it('returns to the current automatic scene and removes the stored override', () => {
    localStorage.setItem(STORAGE_KEY, 'classic');
    const service = setup();
    expect(service.scenery().id).toBe('classic');
    service.setPreference('auto');
    expect(service.scenery().id).toBe('halloween');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('recomputes at the next local midnight across a year boundary', () => {
    vi.setSystemTime(new Date(2026, 11, 26, 23, 59, 58));
    const timeout = vi.spyOn(window, 'setTimeout');
    const service = setup();
    expect(service.scenery().id).toBe('christmas');
    const [refresh, delay] = timeout.mock.calls.at(-1)!;
    expect(delay).toBe(2000);
    vi.setSystemTime(new Date(2026, 11, 27));
    (refresh as () => void)();
    expect(service.scenery().id).toBe('new-year');
    expect(timeout.mock.calls.at(-1)?.[1]).toBe(24 * 60 * 60 * 1000);
  });

  it('catches a suspended tab up when it becomes visible', () => {
    const service = setup();
    vi.setSystemTime(new Date(2027, 0, 8, 9));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(service.scenery().id).toBe('halloween');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(service.scenery().id).toBe('winter');
  });

  it('synchronizes cross-tab preferences and clears, ignoring unrelated storage', () => {
    const service = setup();
    const storage = (key: string | null, newValue: string | null, area = localStorage) =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }));
    storage(STORAGE_KEY, 'winter');
    expect(service.scenery().id).toBe('winter');
    storage('unrelated', 'summer');
    storage(STORAGE_KEY, 'summer', sessionStorage);
    expect(service.scenery().id).toBe('winter');
    storage(STORAGE_KEY, 'invalid');
    expect(service.preference()).toBe('auto');
    storage(STORAGE_KEY, 'classic');
    storage(null, null);
    expect(service.preference()).toBe('auto');
    expect(service.scenery().id).toBe('halloween');
  });

  it('ignores an invalid saved preference and tolerates blocked storage', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    expect(setup().preference()).toBe('auto');
    TestBed.resetTestingModule();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const service = setup();
    expect(() => service.setPreference('spring')).not.toThrow();
    expect(service.scenery().id).toBe('spring');
    expect(() => service.setPreference('auto')).not.toThrow();
    expect(service.scenery().id).toBe('halloween');
  });

  it('releases its midnight timer and browser listeners on destruction', () => {
    const timeout = vi.spyOn(window, 'setTimeout');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    setup();
    const timer = timeout.mock.results.at(-1)?.value;
    clearTimeout.mockClear();
    TestBed.resetTestingModule();
    expect(timer).toBeDefined();
    expect(clearTimeout).toHaveBeenCalledWith(timer);
    expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
