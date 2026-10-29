import { TestBed } from '@angular/core/testing';
import { BoardDimmingService } from './board-dimming.service';

const STORAGE_KEY = 'clicksteria.dim-others';

describe('BoardDimmingService', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.removeItem(STORAGE_KEY);
  });

  function setup() {
    const service = TestBed.inject(BoardDimmingService);
    TestBed.tick();
    return service;
  }

  it('keeps dimming enabled for the first render before restoring a saved opt-out', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const service = TestBed.inject(BoardDimmingService);
    expect(service.enabled()).toBe(true);
    TestBed.tick();
    expect(service.enabled()).toBe(false);
  });

  it('defaults to enabled and persists an opt-out across visits', () => {
    const service = setup();
    expect(service.enabled()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    service.setEnabled(false);
    expect(service.enabled()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    TestBed.resetTestingModule();
    const restored = setup();
    expect(restored.enabled()).toBe(false);
    restored.setEnabled(true);
    expect(restored.enabled()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('synchronizes tabs and resets for removed, cleared, or invalid preferences', () => {
    const service = setup();
    const storage = (key: string | null, newValue: string | null, area = localStorage) =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }));
    storage(STORAGE_KEY, 'false');
    expect(service.enabled()).toBe(false);
    storage('unrelated', 'true');
    storage(STORAGE_KEY, 'true', sessionStorage);
    expect(service.enabled()).toBe(false);
    storage(STORAGE_KEY, null);
    expect(service.enabled()).toBe(true);
    storage(STORAGE_KEY, 'false');
    storage(STORAGE_KEY, 'invalid');
    expect(service.enabled()).toBe(true);
    storage(STORAGE_KEY, 'false');
    storage(null, null);
    expect(service.enabled()).toBe(true);
  });

  it('ignores invalid saved values and remains usable when storage is blocked', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    expect(setup().enabled()).toBe(true);
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
    expect(() => service.setEnabled(false)).not.toThrow();
    expect(service.enabled()).toBe(false);
    expect(() => service.setEnabled(true)).not.toThrow();
    expect(service.enabled()).toBe(true);
  });

  it('releases its storage listener on destruction', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    setup();
    TestBed.resetTestingModule();
    expect(removeListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
