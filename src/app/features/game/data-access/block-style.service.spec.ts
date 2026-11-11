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

  it.each(['minimal', 'spectrum'] as const)(
    'restores saved %s after a classic first render',
    (style) => {
      localStorage.setItem(STORAGE_KEY, style);
      const service = TestBed.inject(BlockStyleService);
      expect(service.style()).toBe('classic');
      TestBed.tick();
      expect(service.style()).toBe(style);
    },
  );

  it.each(['minimal', 'spectrum'] as const)(
    'persists %s across visits and resets to classic',
    (style) => {
      const service = setup();
      service.setStyle(style);
      expect(service.style()).toBe(style);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(style);
      TestBed.resetTestingModule();
      const restored = setup();
      expect(restored.style()).toBe(style);
      restored.setStyle('classic');
      expect(restored.style()).toBe('classic');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    },
  );

  it('synchronizes other tabs and resets after storage is cleared or invalid', () => {
    const service = setup();
    const storage = (key: string | null, newValue: string | null, area = localStorage) =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }));
    storage(STORAGE_KEY, 'minimal');
    expect(service.style()).toBe('minimal');
    storage(STORAGE_KEY, 'spectrum');
    expect(service.style()).toBe('spectrum');
    storage('unrelated', 'classic');
    storage(STORAGE_KEY, 'classic', sessionStorage);
    expect(service.style()).toBe('spectrum');
    storage(STORAGE_KEY, 'invalid');
    expect(service.style()).toBe('classic');
    storage(STORAGE_KEY, 'minimal');
    storage(null, null);
    expect(service.style()).toBe('classic');
  });

  it('falls back to classic for the retired glass style on restore and in other tabs', () => {
    localStorage.setItem(STORAGE_KEY, 'glass');
    const service = setup();
    expect(service.style()).toBe('classic');
    service.setStyle('minimal');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: 'glass',
        storageArea: localStorage,
      }),
    );
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
    expect(() => service.setStyle('minimal')).not.toThrow();
    expect(service.style()).toBe('minimal');
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
