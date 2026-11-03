import { afterNextRender, Component, ElementRef, inject, Injector } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameStore } from '@features/game/data-access/game-store';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { BlockStyleService } from '@features/game/data-access/block-style.service';
import { BoardDimmingService } from '@features/game/data-access/board-dimming.service';
import { BoardSymbolsService } from '@features/game/data-access/board-symbols.service';
import { GameBoard } from '@features/game/ui/game-board';
import { GameSidebar } from '@features/game/ui/game-sidebar';
import { GameResult } from '@features/game/ui/game-result/game-result.component';
import { Icon } from '@shared/ui/icon';
@Component({
  imports: [DecimalPipe, Icon, GameBoard, GameSidebar, GameResult],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  protected readonly scenery = inject(BoardSceneryService);
  protected readonly blocks = inject(BlockStyleService);
  protected readonly dimming = inject(BoardDimmingService);
  protected readonly symbols = inject(BoardSymbolsService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
  }

  protected playAgain(): void {
    this.game.newGame();
    afterNextRender(
      () => {
        this.element.nativeElement
          .querySelector<HTMLElement>('[data-board]')
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
