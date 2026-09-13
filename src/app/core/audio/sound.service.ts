import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'clicksteria.sound';

/** Owns preference persistence and a single, lazily created Web Audio context. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal(true);
  private view: (Window & typeof globalThis) | null = null;
  private context?: AudioContext;
  private voice?: { oscillator: OscillatorNode; gain: GainNode };
  private sequence = 0;
  readonly enabled = this.selected.asReadonly();

  constructor() {
    afterNextRender(() => {
      this.view = this.document.defaultView;
      if (!this.view) return;
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
        }
      };
      this.view.addEventListener('storage', onStorage);
      this.destroyRef.onDestroy(() => this.view?.removeEventListener('storage', onStorage));
    });
    this.destroyRef.onDestroy(() => {
      this.stop();
      void this.context?.close().catch(() => {});
    });
  }

  toggle(): void {
    this.selected.update((enabled) => !enabled);
    if (!this.enabled()) this.stop();
    try {
      this.view?.localStorage.setItem(STORAGE_KEY, String(this.enabled()));
    } catch {
      /* Keep the in-memory preference when storage is unavailable. */
    }
  }

  /** Invoke from a user action, including keyboard activation; never during render. */
  playClick(): void {
    void this.play().catch(() => {
      /* Unsupported or blocked audio must not interrupt gameplay. */
    });
  }

  private async play(): Promise<void> {
    if (!this.enabled() || !this.view?.AudioContext || this.destroyRef.destroyed) return;
    const sequence = ++this.sequence;
    const context = (this.context ??= new this.view.AudioContext());
    if (context.state !== 'running') await context.resume();
    // Discard delayed playback after muting, another click, or destruction.
    if (!this.enabled() || sequence !== this.sequence || this.destroyRef.destroyed) return;
    this.stopVoice();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const voice = { oscillator, gain };
    this.voice = voice;
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(320, now + 0.065);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (this.voice === voice) this.voice = undefined;
    };
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  private stop(): void {
    ++this.sequence;
    this.stopVoice();
  }

  private stopVoice(): void {
    if (!this.voice) return;
    this.voice.oscillator.stop();
    this.voice.oscillator.disconnect();
    this.voice.gain.disconnect();
    this.voice = undefined;
  }
}
