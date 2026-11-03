import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from '@shared/ui/icon';
import { GameStatus } from '@features/game/domain/game.models';

@Component({
  selector: 'app-game-controls',
  imports: [Icon],
  host: { '(keydown.escape)': 'cancelConfirmation($event)' },
  templateUrl: './game-controls.component.html',
  styleUrl: './game-controls.component.css',
})
export class GameControls {
  readonly canUndo = input.required<boolean>();
  readonly ready = input.required<boolean>();
  readonly status = input.required<GameStatus>();
  readonly newGame = output<void>();
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
  protected cancelConfirmation(event: Event): void {
    if (!this.confirming()) return;
    event.preventDefault();
    this.confirming.set(false);
  }
}
