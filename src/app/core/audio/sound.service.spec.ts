import { TestBed } from '@angular/core/testing';
import { SoundToggle } from '../../shared/ui/sound-toggle/sound-toggle.component';
import { SoundService } from './sound.service';

function audioMock() {
  const oscillator = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
  const constructor = vi.fn(function () {
    return context;
  });
  return { context, oscillator, gain, constructor };
}

describe('SoundService', () => {
  let audio: ReturnType<typeof audioMock>;
  beforeEach(() => {
    localStorage.removeItem('clicksteria.sound');
    audio = audioMock();
    vi.stubGlobal('AudioContext', audio.constructor);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('clicksteria.sound');
  });
  async function setup() {
    const fixture = TestBed.createComponent(SoundToggle);
    await fixture.whenStable();
    return { service: TestBed.inject(SoundService), fixture };
  }
  it('creates audio lazily and reuses one context for repeated clicks', async () => {
    const { service } = await setup();
    expect(service.enabled()).toBe(true);
    expect(audio.constructor).not.toHaveBeenCalled();
    service.playClick();
    service.playClick();
    expect(audio.constructor).toHaveBeenCalledTimes(1);
    expect(audio.oscillator.start).toHaveBeenCalledTimes(2);
    expect(audio.gain.disconnect).toHaveBeenCalledTimes(1);
  });
  it('persists the toggle and restores mute on the next initialization', async () => {
    const { service, fixture } = await setup();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.enabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(localStorage.getItem('clicksteria.sound')).toBe('false');
    TestBed.resetTestingModule();
    const restored = await setup();
    restored.service.playClick();
    expect(audio.constructor).not.toHaveBeenCalled();
    restored.service.toggle();
    expect(localStorage.getItem('clicksteria.sound')).toBe('true');
  });
  it('discards delayed playback when muted while audio is resuming', async () => {
    audio.context.state = 'suspended';
    let resume!: () => void;
    audio.context.resume.mockReturnValue(
      new Promise<void>((resolve) => {
        resume = resolve;
      }),
    );
    const { service } = await setup();
    service.playClick();
    service.toggle();
    resume();
    await Promise.resolve();
    expect(audio.oscillator.start).not.toHaveBeenCalled();
  });
  it('stops a current sound and follows preference changes from other tabs', async () => {
    const { service } = await setup();
    service.playClick();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'clicksteria.sound',
        newValue: 'false',
        storageArea: localStorage,
      }),
    );
    expect(service.enabled()).toBe(false);
    expect(audio.gain.disconnect).toHaveBeenCalled();
    service.playClick();
    expect(audio.oscillator.start).toHaveBeenCalledTimes(1);
  });
  it('keeps working when storage is denied and handles rejected audio without leaking errors', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { service } = await setup();
    expect(() => service.toggle()).not.toThrow();
    service.toggle();
    audio.context.state = 'suspended';
    audio.context.resume.mockRejectedValue(new Error('blocked'));
    service.playClick();
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.oscillator.start).not.toHaveBeenCalled();
  });
  it('tolerates missing Web Audio and closes an existing context on destruction', async () => {
    const { service } = await setup();
    vi.stubGlobal('AudioContext', undefined);
    service.playClick();
    expect(audio.constructor).not.toHaveBeenCalled();
    vi.stubGlobal('AudioContext', audio.constructor);
    service.playClick();
    TestBed.resetTestingModule();
    expect(audio.context.close).toHaveBeenCalledTimes(1);
    expect(audio.gain.disconnect).toHaveBeenCalled();
  });
});
