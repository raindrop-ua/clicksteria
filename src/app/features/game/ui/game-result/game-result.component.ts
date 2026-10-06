import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { GameStatus } from '../../domain/game.models';

@Component({
  selector: 'app-game-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-result.component.html',
})
export class GameResult {
  readonly status = input.required<GameStatus>();
  readonly score = input.required<number>();
  readonly playAgain = output<void>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.status();
      this.element.nativeElement
        .querySelector<HTMLElement>('[data-result]')
        ?.focus({ preventScroll: true });
    });
  }
}
