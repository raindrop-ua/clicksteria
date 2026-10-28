import { afterNextRender, Component, inject } from '@angular/core';
import { GameStore } from '@features/game/data-access/game-store';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { GameBoard } from '@features/game/ui/game-board';
import { GameSidebar } from '@features/game/ui/game-sidebar';
import { GameResult } from '@features/game/ui/game-result/game-result.component';
import { BoardSceneryPicker } from '@features/game/ui/board-scenery-picker/board-scenery-picker';
@Component({
  imports: [GameBoard, GameSidebar, GameResult, BoardSceneryPicker],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  protected readonly scenery = inject(BoardSceneryService);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
  }
}
