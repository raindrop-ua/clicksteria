import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Service, signal } from '@angular/core';
import {
  GAME_SOUND_SAMPLES,
  GameSoundSample,
  GameSoundSelector,
  GameSoundStyle,
  soundBankForGroup,
} from './game-sounds';

const STORAGE_KEY = 'clicksteria.sound';
const VOICES_PER_SAMPLE = 2;
const MAX_ATTACK_DELAY_MS = 150;
interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly sampleUrl: string;
}

/** Keeps native game samples warm while activating Web Audio only on a user action. */
@Service()
export class SoundService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal(true);
  private readonly selector = new GameSoundSelector();
  private readonly data = new Map<string, Promise<ArrayBuffer>>();
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly voices = new Set<Voice>();
  private view: (Window & typeof globalThis) | null = null;
  private context?: AudioContext;
  private requests?: AbortController;
  private generation = 0;
  readonly enabled = this.selected.asReadonly();

  constructor() {
    afterNextRender(() => {
      this.view = this.document.defaultView;
      if (!this.view) return;
      this.requests = new this.view.AbortController();
      let storage: Storage | undefined;
      try {
        storage = this.view.localStorage;
        this.selected.set(storage.getItem(STORAGE_KEY) !== 'false');
      } catch {
        /* Sound can still be toggled for this visit. */
      }
      const onStorage = (event: StorageEvent) => {
        if (!storage || event.storageArea !== storage) return;
        if (event.key === STORAGE_KEY || event.key === null) {
          this.selected.set(event.newValue !== 'false');
          if (!this.enabled()) this.stop();
          else this.preload();
        }
      };
      const onVisibility = () => {
        if (this.document.hidden) this.stop();
      };
      const onPageHide = () => this.stop();
      this.view.addEventListener('storage', onStorage);
      this.document.addEventListener('visibilitychange', onVisibility);
      this.view.addEventListener('pagehide', onPageHide);
      this.destroyRef.onDestroy(() => {
        this.view?.removeEventListener('storage', onStorage);
        this.document.removeEventListener('visibilitychange', onVisibility);
        this.view?.removeEventListener('pagehide', onPageHide);
      });
      if (this.enabled()) this.preload();
    });
    this.destroyRef.onDestroy(() => {
      this.stop();
      this.requests?.abort();
      this.data.clear();
      this.buffers.clear();
      void this.context?.close().catch(() => {
        /* Closing an unavailable audio context must not interrupt teardown. */
      });
    });
  }

  toggle(): void {
    this.selected.update((enabled) => !enabled);
    if (!this.enabled()) this.stop();
    else this.preload();
    try {
      this.view?.localStorage.setItem(STORAGE_KEY, String(this.enabled()));
    } catch {
      /* Keep the in-memory preference when storage is unavailable. */
    }
  }

  /** Call only from the group-removal user action, including keyboard activation. */
  playGroup(count: number, style: GameSoundStyle = 'bubbles'): void {
    if (!this.enabled() || !Number.isInteger(count) || count < 2) return;
    this.request(this.selector.next(soundBankForGroup(count), style));
  }

  /** The quieter native effect for a block that cannot be removed on its own. */
  playSingle(style: GameSoundStyle = 'bubbles'): void {
    if (!this.enabled()) return;
    this.request(this.selector.next('single', style));
  }

  private request(sample: GameSoundSample): void {
    void this.play(sample).catch(() => {
      /* Unsupported, unavailable or blocked audio must not interrupt gameplay. */
    });
  }

  private async play(sample: GameSoundSample): Promise<void> {
    const view = this.view;
    if (!this.enabled() || !view?.AudioContext || this.document.hidden || this.destroyRef.destroyed)
      return;
    const generation = this.generation;
    const requestedAt = view.performance.now();
    const context = (this.context ??= new view.AudioContext());
    // Resume is invoked synchronously inside this user action, never by preloading.
    const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
    const loading = this.buffer(sample, context);
    for (const other of GAME_SOUND_SAMPLES) {
      if (other.url !== sample.url) void this.buffer(other, context).catch(() => undefined);
    }
    const [buffer] = await Promise.all([loading, resumed]);
    if (
      !this.enabled() ||
      this.document.hidden ||
      this.destroyRef.destroyed ||
      generation !== this.generation ||
      context.state !== 'running' ||
      view.performance.now() - requestedAt > MAX_ATTACK_DELAY_MS
    )
      return;
    // Let short tails overlap. Only steal the oldest voice when this same sample
    // already occupies both native-style slots.
    const active = [...this.voices].filter((voice) => voice.sampleUrl === sample.url);
    if (active.length >= VOICES_PER_SAMPLE) this.stopVoice(active[0]);
    const source = context.createBufferSource();
    const gain = context.createGain();
    const voice: Voice = { source, gain, sampleUrl: sample.url };
    this.voices.add(voice);
    source.onended = () => this.releaseVoice(voice);
    try {
      source.buffer = buffer;
      gain.gain.setValueAtTime(sample.volume, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      source.start();
    } catch (error) {
      this.releaseVoice(voice);
      throw error;
    }
  }

  private preload(): void {
    if (!this.view || this.destroyRef.destroyed) return;
    // Fetching bytes is silent and does not create or resume an audio context.
    for (const sample of GAME_SOUND_SAMPLES)
      void this.sampleData(sample.url).catch(() => undefined);
  }

  private sampleData(url: string): Promise<ArrayBuffer> {
    const cached = this.data.get(url);
    if (cached) return cached;
    const loading = this.view!.fetch(url, { signal: this.requests?.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Game sound unavailable');
        return response.arrayBuffer();
      })
      .catch((error: unknown) => {
        this.data.delete(url);
        throw error;
      });
    this.data.set(url, loading);
    return loading;
  }

  private buffer(sample: GameSoundSample, context: AudioContext): Promise<AudioBuffer> {
    const cached = this.buffers.get(sample.url);
    if (cached) return cached;
    const loading = this.sampleData(sample.url)
      .then((data) => context.decodeAudioData(data.slice(0)))
      .catch((error: unknown) => {
        this.buffers.delete(sample.url);
        throw error;
      });
    this.buffers.set(sample.url, loading);
    return loading;
  }

  private stop(): void {
    ++this.generation;
    for (const voice of this.voices) this.stopVoice(voice);
  }

  private stopVoice(voice: Voice): void {
    // Remove callbacks first: a stolen or muted voice may end synchronously.
    voice.source.onended = null;
    try {
      voice.source.stop();
    } catch {
      /* A failed or already-ended voice is still released. */
    }
    this.releaseVoice(voice);
  }

  private releaseVoice(voice: Voice): void {
    voice.source.onended = null;
    voice.source.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }
}
