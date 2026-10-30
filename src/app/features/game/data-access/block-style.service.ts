import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Service, signal } from '@angular/core';
import { BlockStyle, isBlockStyle } from '@features/game/domain/block-style';

const STORAGE_KEY = 'clicksteria.block-style';

@Service()
export class BlockStyleService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal<BlockStyle>('classic');
  readonly style = this.selected.asReadonly();

  constructor() {
    // Keep server rendering and the first browser render in agreement.
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;

      let storage: Storage | undefined;
      try {
        storage = view.localStorage;
        this.selected.set(this.parse(storage.getItem(STORAGE_KEY)));
      } catch {
        // The picker still works for this visit when storage is unavailable.
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

  setStyle(style: BlockStyle): void {
    this.selected.set(style);
    try {
      const storage = this.document.defaultView?.localStorage;
      if (style === 'classic') storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, style);
    } catch {
      // Preserve the in-memory choice even if saving is blocked.
    }
  }

  private parse(value: string | null): BlockStyle {
    return isBlockStyle(value) ? value : 'classic';
  }
}
