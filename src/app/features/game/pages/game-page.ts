import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStore } from '../data-access/game-store';
import { GameBoard } from '../ui/game-board';
import { GameSidebar } from '../ui/game-sidebar';
import { GameResult } from '../ui/game-result/game-result.component';
@Component({
  imports: [GameBoard, GameSidebar, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-page.html',
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
  }
}
