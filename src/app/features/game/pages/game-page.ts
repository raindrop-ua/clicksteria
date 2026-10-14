import { afterNextRender, Component, inject } from '@angular/core';
import { GameStore } from '@features/game/data-access/game-store';
import { GameBoard } from '@features/game/ui/game-board';
import { GameSidebar } from '@features/game/ui/game-sidebar';
import { GameResult } from '@features/game/ui/game-result/game-result.component';
@Component({
  imports: [GameBoard, GameSidebar, GameResult],
  templateUrl: './game-page.html',
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
  }
}
