import { TestBed } from '@angular/core/testing';
import { SoundToggle } from '@shared/ui/sound-toggle/sound-toggle.component';
import { SoundService } from './sound.service';
import { GAME_SOUND_SAMPLES } from './game-sounds';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function audioMock() {
  const sources: ReturnType<typeof source>[] = [];
  const gains: ReturnType<typeof gain>[] = [];
  function source() {
    return {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  function gain() {
    return { gain: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  }
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    createBufferSource: vi.fn(() => {
      const result = source();
      sources.push(result);
      return result;
    }),
    createGain: vi.fn(() => {
      const result = gain();
      gains.push(result);
      return result;
    }),
    decodeAudioData: vi.fn<(data: ArrayBuffer) => Promise<AudioBuffer>>(
      async () => ({ duration: 0.25 }) as AudioBuffer,
    ),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
  const constructor = vi.fn(function () {
    return context;
  });
  return { context, sources, gains, constructor };
}

describe('SoundService', () => {
  let audio: ReturnType<typeof audioMock>;
  let fetchSample: ReturnType<typeof vi.fn<typeof fetch>>;
  let time: number;
  const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) }) as Response;
  async function flush() {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  }
  async function setup() {
    const fixture = TestBed.createComponent(SoundToggle);
    await fixture.whenStable();
    await flush();
    return { service: TestBed.inject(SoundService), fixture };
  }
  beforeEach(() => {
    localStorage.removeItem('clicksteria.sound');
    audio = audioMock();
    time = 0;
    fetchSample = vi.fn<typeof fetch>(async () => response());
    vi.stubGlobal('fetch', fetchSample);
    vi.stubGlobal('AudioContext', audio.constructor);
    vi.spyOn(window.performance, 'now').mockImplementation(() => time);
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('clicksteria.sound');
  });
  it('prefetches all three ten-file styles silently, then decodes once and reuses one context', async () => {
    const { service } = await setup();
    expect(service.enabled()).toBe(true);
    expect(fetchSample).toHaveBeenCalledTimes(30);
    expect(audio.constructor).not.toHaveBeenCalled();
    expect(audio.context.decodeAudioData).not.toHaveBeenCalled();
    service.playGroup(2);
    await flush();
    service.playGroup(5);
    await flush();
    expect(audio.constructor).toHaveBeenCalledTimes(1);
    expect(audio.context.decodeAudioData).toHaveBeenCalledTimes(30);
    expect(fetchSample).toHaveBeenCalledTimes(30);
    expect(audio.context.createBufferSource).toHaveBeenCalledTimes(2);
    expect(audio.sources[0].stop).not.toHaveBeenCalled();
    expect(audio.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.34, 0);
  });
  it('lets short tails overlap and steals only the oldest of two voices for one sample', async () => {
    const { service } = await setup();
    for (let i = 0; i < 5; i++) {
      service.playSingle();
      await flush();
    }
    expect(audio.sources).toHaveLength(5);
    expect(audio.sources.slice(0, 3).every((source) => source.stop.mock.calls.length === 1)).toBe(
      true,
    );
    expect(audio.sources[3].stop).not.toHaveBeenCalled();
    expect(audio.sources[4].stop).not.toHaveBeenCalled();
    expect(audio.gains[4].gain.setValueAtTime).toHaveBeenCalledWith(0.28, 0);
    audio.sources[3].onended?.();
    expect(audio.sources[3].disconnect).toHaveBeenCalledOnce();
    expect(audio.gains[3].disconnect).toHaveBeenCalledOnce();
    service.toggle();
    expect(audio.sources[3].stop).not.toHaveBeenCalled();
    expect(audio.sources[4].stop).toHaveBeenCalledOnce();
  });
  it('switches group and single banks on the next tap using the same warmed context', async () => {
    fetchSample.mockImplementation(
      async (url) =>
        ({
          ok: true,
          arrayBuffer: async () =>
            new Uint8Array([GAME_SOUND_SAMPLES.findIndex((sample) => sample.url === url) + 1])
              .buffer,
        }) as Response,
    );
    audio.context.decodeAudioData.mockImplementation(
      async (data: ArrayBuffer) =>
        ({
          duration: 0.25,
          length: new Uint8Array(data)[0],
        }) as AudioBuffer,
    );
    const { service } = await setup();
    const sampleId = (url: string) =>
      GAME_SOUND_SAMPLES.findIndex((sample) => sample.url === url) + 1;
    service.playGroup(2);
    await flush();
    service.playGroup(2, 'clicks');
    await flush();
    service.playSingle('clicks');
    await flush();
    service.playSingle('bubbles');
    await flush();
    service.playGroup(2, 'spectrum');
    await flush();
    service.playSingle('spectrum');
    await flush();
    service.playGroup(2, 'bubbles');
    await flush();
    service.playGroup(2, 'clicks');
    await flush();
    service.playGroup(2, 'spectrum');
    await flush();
    expect(audio.sources.map((source) => source.buffer?.length)).toEqual(
      [
        '/audio/bubble-pop-small-1.wav',
        '/audio/pop-small-1.wav',
        '/audio/single-block.wav',
        '/audio/bubble-single-block.wav',
        '/audio/spectrum-pop-small-1.wav',
        '/audio/spectrum-single-block.wav',
        '/audio/bubble-pop-small-2.wav',
        '/audio/pop-small-2.wav',
        '/audio/spectrum-pop-small-2.wav',
      ].map(sampleId),
    );
    expect(audio.constructor).toHaveBeenCalledOnce();
    expect(audio.context.decodeAudioData).toHaveBeenCalledTimes(30);
    expect(fetchSample).toHaveBeenCalledTimes(30);
    expect(audio.sources.every((source) => source.stop.mock.calls.length === 0)).toBe(true);
    expect(audio.gains[4].gain.setValueAtTime).toHaveBeenCalledWith(0.22, 0);
    expect(audio.gains[5].gain.setValueAtTime).toHaveBeenCalledWith(0.16, 0);
  });
  it('persists mute, updates the toggle, and restores it without fetching or creating audio', async () => {
    const { service, fixture } = await setup();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.enabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(localStorage.getItem('clicksteria.sound')).toBe('false');
    TestBed.resetTestingModule();
    fetchSample.mockClear();
    const restored = await setup();
    restored.service.playGroup(2);
    await flush();
    expect(audio.constructor).not.toHaveBeenCalled();
    expect(fetchSample).not.toHaveBeenCalled();
    restored.service.toggle();
    expect(localStorage.getItem('clicksteria.sound')).toBe('true');
    expect(fetchSample).toHaveBeenCalledTimes(30);
  });
  it.each(['bubbles', 'clicks', 'spectrum'] as const)(
    'discards delayed %s playback when muted while resuming, even if unmuted again',
    async (style) => {
      const resume = deferred<void>();
      audio.context.state = 'suspended';
      audio.context.resume.mockReturnValue(resume.promise);
      const { service } = await setup();
      service.playSingle(style);
      service.toggle();
      service.toggle();
      audio.context.state = 'running';
      resume.resolve();
      await flush();
      expect(audio.sources).toHaveLength(0);
    },
  );
  it('drops a sound whose blocked resume resolves after its attack deadline', async () => {
    const resume = deferred<void>();
    audio.context.state = 'suspended';
    audio.context.resume.mockReturnValue(resume.promise);
    const { service } = await setup();
    service.playSingle();
    time = 151;
    audio.context.state = 'running';
    resume.resolve();
    await flush();
    expect(audio.sources).toHaveLength(0);
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(1);
  });
  it('does not play stale loads, and a later gesture can use the cached data', async () => {
    const fetched = deferred<Response>();
    fetchSample.mockReturnValue(fetched.promise);
    const { service } = await setup();
    service.playSingle();
    time = 151;
    fetched.resolve(response());
    await flush();
    expect(audio.sources).toHaveLength(0);
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(1);
  });
  it('invalidates a pending decode when muted without losing the warmed sample', async () => {
    const decoded = deferred<AudioBuffer>();
    audio.context.decodeAudioData.mockReturnValue(decoded.promise);
    const { service } = await setup();
    service.playSingle();
    await flush();
    expect(audio.context.decodeAudioData).toHaveBeenCalledTimes(30);
    service.toggle();
    decoded.resolve({ duration: 0.25 } as AudioBuffer);
    await flush();
    expect(audio.sources).toHaveLength(0);
    service.toggle();
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(1);
    expect(audio.context.decodeAudioData).toHaveBeenCalledTimes(30);
  });
  it.each(['resume', 'decode'] as const)(
    'discards a pending %s when the page becomes hidden',
    async (pending) => {
      const resumed = deferred<void>();
      const decoded = deferred<AudioBuffer>();
      if (pending === 'resume') {
        audio.context.state = 'suspended';
        audio.context.resume.mockReturnValue(resumed.promise);
      } else {
        audio.context.decodeAudioData.mockReturnValue(decoded.promise);
      }
      const { service } = await setup();
      service.playSingle();
      await flush();
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      audio.context.state = 'running';
      resumed.resolve();
      decoded.resolve({ duration: 0.25 } as AudioBuffer);
      await flush();
      expect(audio.sources).toHaveLength(0);
    },
  );
  it('stops current voices on pagehide and ignores requests from a hidden document', async () => {
    const { service } = await setup();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    service.playSingle();
    expect(audio.constructor).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    service.playSingle();
    await flush();
    window.dispatchEvent(new Event('pagehide'));
    expect(audio.sources[0].stop).toHaveBeenCalledOnce();
    expect(audio.gains[0].disconnect).toHaveBeenCalledOnce();
  });
  it('stops every voice on cross-tab mute and follows clearing the preference', async () => {
    const { service } = await setup();
    service.playGroup(2);
    await flush();
    service.playSingle();
    await flush();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'clicksteria.sound',
        newValue: 'false',
        storageArea: localStorage,
      }),
    );
    expect(service.enabled()).toBe(false);
    expect(audio.sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true);
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(2);
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
    expect(service.enabled()).toBe(true);
  });
  it('tolerates failed fetch/decode/resume and retries on later actions', async () => {
    fetchSample.mockRejectedValue(new Error('offline'));
    const { service } = await setup();
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(0);
    fetchSample.mockResolvedValue(response());
    audio.context.decodeAudioData.mockRejectedValue(new Error('corrupt'));
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(0);
    audio.context.decodeAudioData.mockResolvedValue({ duration: 0.25 } as AudioBuffer);
    audio.context.state = 'suspended';
    audio.context.resume.mockRejectedValue(new Error('blocked'));
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(0);
    audio.context.state = 'running';
    service.playSingle();
    await flush();
    expect(audio.sources).toHaveLength(1);
  });
  it('keeps working when storage is denied and ignores invalid group requests', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { service } = await setup();
    expect(() => service.toggle()).not.toThrow();
    service.toggle();
    for (const count of [0, 1, NaN, 2.5]) service.playGroup(count);
    expect(audio.constructor).not.toHaveBeenCalled();
    service.playGroup(2);
    await flush();
    expect(audio.sources).toHaveLength(1);
  });
  it('tolerates missing Web Audio and releases pending/current voices on destruction', async () => {
    const { service } = await setup();
    vi.stubGlobal('AudioContext', undefined);
    service.playSingle();
    expect(audio.constructor).not.toHaveBeenCalled();
    vi.stubGlobal('AudioContext', audio.constructor);
    service.playSingle();
    await flush();
    const decoding = deferred<AudioBuffer>();
    audio.context.decodeAudioData.mockReturnValue(decoding.promise);
    service.playGroup(2);
    TestBed.resetTestingModule();
    decoding.resolve({ duration: 0.25 } as AudioBuffer);
    await flush();
    expect(audio.context.close).toHaveBeenCalledOnce();
    expect(audio.sources).toHaveLength(1);
    expect(audio.sources[0].stop).toHaveBeenCalledOnce();
    expect(audio.gains[0].disconnect).toHaveBeenCalledOnce();
  });
});
