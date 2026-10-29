import { afterNextRender, Component, inject } from '@angular/core';
import { GameStore } from '@features/game/data-access/game-store';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { BlockStyleService } from '@features/game/data-access/block-style.service';
import { GameBoard } from '@features/game/ui/game-board';
import { GameSidebar } from '@features/game/ui/game-sidebar';
import { GameResult } from '@features/game/ui/game-result/game-result.component';
@Component({
  imports: [GameBoard, GameSidebar, GameResult],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  protected readonly scenery = inject(BoardSceneryService);
  protected readonly blocks = inject(BlockStyleService);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
  }
}
