import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Service, signal } from '@angular/core';

const STORAGE_KEY = 'clicksteria.dim-others';

@Service()
export class BoardDimmingService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal(true);
  readonly enabled = this.selected.asReadonly();

  constructor() {
    // Restore browser preferences only after the stable server/first-browser render.
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;

      let storage: Storage | undefined;
      try {
        storage = view.localStorage;
        this.selected.set(this.parse(storage.getItem(STORAGE_KEY)));
      } catch {
        // Keep the setting usable for this visit when storage is unavailable.
      }

      const onStorage = (event: StorageEvent) => {
        if (!storage || event.storageArea !== storage) return;
        if (event.key === STORAGE_KEY || event.key === null) {
          this.selected.set(this.parse(event.newValue));
        }
      };
      view.addEventListener('storage', onStorage);
      this.destroyRef.onDestroy(() => view.removeEventListener('storage', onStorage));
    });
  }

  setEnabled(enabled: boolean): void {
    this.selected.set(enabled);
    try {
      const storage = this.document.defaultView?.localStorage;
      if (enabled) storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, 'false');
    } catch {
      // Saving failures do not discard the in-memory choice.
    }
  }

  private parse(value: string | null): boolean {
    return value !== 'false';
  }
}
