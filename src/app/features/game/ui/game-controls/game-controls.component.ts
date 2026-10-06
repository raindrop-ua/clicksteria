import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from '../../../../shared/ui/icon';
import { GameStatus } from '../../domain/game.models';

@Component({
  selector: 'app-game-controls',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './game-controls.component.html',
})
export class GameControls {
  readonly canUndo = input.required<boolean>();
  readonly ready = input.required<boolean>();
  readonly status = input.required<GameStatus>();
  readonly newGame = output<void>();
  readonly undo = output<void>();
  readonly hint = output<void>();
  protected readonly confirming = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private hasRequestedNew = false;
  constructor() {
    afterRenderEffect(() => {
      this.confirming();
      if (this.hasRequestedNew) {
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('button')
          ?.focus({ preventScroll: true });
      }
    });
  }
  protected requestNew(): void {
    this.hasRequestedNew = true;
    if (this.canUndo() && this.status() === 'playing') this.confirming.set(true);
    else this.newGame.emit();
  }
}
