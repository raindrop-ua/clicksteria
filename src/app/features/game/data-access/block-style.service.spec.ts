import { TestBed } from '@angular/core/testing';
import { BlockStyleService } from './block-style.service';

const STORAGE_KEY = 'clicksteria.block-style';

describe('BlockStyleService', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.removeItem(STORAGE_KEY);
  });

  function setup() {
    const service = TestBed.inject(BlockStyleService);
    TestBed.tick();
    return service;
  }

  it('uses classic for the first render before restoring a saved style', () => {
    localStorage.setItem(STORAGE_KEY, 'glass');
    const service = TestBed.inject(BlockStyleService);
    expect(service.style()).toBe('classic');
    TestBed.tick();
    expect(service.style()).toBe('glass');
  });

  it('persists a choice across visits and removes the override for classic', () => {
    const service = setup();
    service.setStyle('minimal');
    expect(service.style()).toBe('minimal');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('minimal');
    TestBed.resetTestingModule();
    const restored = setup();
    expect(restored.style()).toBe('minimal');
    restored.setStyle('classic');
    expect(restored.style()).toBe('classic');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('synchronizes other tabs and resets after storage is cleared or invalid', () => {
    const service = setup();
    const storage = (key: string | null, newValue: string | null, area = localStorage) =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }));
    storage(STORAGE_KEY, 'glass');
    expect(service.style()).toBe('glass');
    storage('unrelated', 'minimal');
    storage(STORAGE_KEY, 'minimal', sessionStorage);
    expect(service.style()).toBe('glass');
    storage(STORAGE_KEY, 'invalid');
    expect(service.style()).toBe('classic');
    storage(STORAGE_KEY, 'minimal');
    storage(null, null);
    expect(service.style()).toBe('classic');
  });

  it('ignores invalid saved values and keeps choices usable when storage is blocked', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    expect(setup().style()).toBe('classic');
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
    expect(() => service.setStyle('glass')).not.toThrow();
    expect(service.style()).toBe('glass');
    expect(() => service.setStyle('classic')).not.toThrow();
    expect(service.style()).toBe('classic');
  });

  it('releases its storage listener on destruction', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    setup();
    TestBed.resetTestingModule();
    expect(removeListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
