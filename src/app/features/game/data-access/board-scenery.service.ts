import { DOCUMENT } from '@angular/common';
import { afterNextRender, computed, DestroyRef, inject, Service, signal } from '@angular/core';
import {
  CLASSIC_SCENERY,
  isSceneryPreference,
  resolveScenery,
  sceneryForDate,
  SceneryPreference,
} from '@features/game/domain/board-scenery';

const STORAGE_KEY = 'clicksteria.scenery';

@Service()
export class BoardSceneryService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal<SceneryPreference>('auto');
  private readonly today = signal<Date | null>(null);
  readonly preference = this.selected.asReadonly();
  readonly automaticScenery = computed(() => {
    const today = this.today();
    return today ? sceneryForDate(today) : CLASSIC_SCENERY;
  });
  readonly scenery = computed(() => {
    const today = this.today();
    return today ? resolveScenery(this.selected(), today) : CLASSIC_SCENERY;
  });

  constructor() {
    // Use the same quiet backdrop for server rendering and the first browser render.
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;

      let storage: Storage | undefined;
      try {
        storage = view.localStorage;
        this.selected.set(this.parse(storage.getItem(STORAGE_KEY)));
      } catch {
        // Storage restrictions do not prevent choosing a backdrop for this visit.
      }

      let timer: number | undefined;
      const refresh = () => {
        const now = new Date();
        this.today.set(now);
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        view.clearTimeout(timer);
        // A local midnight also handles shorter/longer days around clock changes.
        timer = view.setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
      };
      const onVisibility = () => {
        if (this.document.visibilityState === 'visible') refresh();
      };
      const onStorage = (event: StorageEvent) => {
        if (!storage || event.storageArea !== storage) return;
        if (event.key === STORAGE_KEY || event.key === null) {
          this.selected.set(this.parse(event.newValue));
        }
      };

      refresh();
      this.document.addEventListener('visibilitychange', onVisibility);
      view.addEventListener('focus', refresh);
      view.addEventListener('storage', onStorage);
      this.destroyRef.onDestroy(() => {
        view.clearTimeout(timer);
        this.document.removeEventListener('visibilitychange', onVisibility);
        view.removeEventListener('focus', refresh);
        view.removeEventListener('storage', onStorage);
      });
    });
  }

  setPreference(preference: SceneryPreference): void {
    this.selected.set(preference);
    try {
      const storage = this.document.defaultView?.localStorage;
      if (preference === 'auto') storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, preference);
    } catch {
      // Keep the in-memory choice when persistence is unavailable.
    }
  }

  private parse(value: string | null): SceneryPreference {
    return isSceneryPreference(value) ? value : 'auto';
  }
}
