import { Component, input, output } from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { GameStatus } from '@features/game/domain/game.models';
import { GameControls } from '@features/game/ui/game-controls/game-controls.component';
import { GameHelp } from '@features/game/ui/game-help/game-help.component';

@Component({
  selector: 'app-game-sidebar',
  imports: [DecimalPipe, NgOptimizedImage, GameControls, GameHelp],
  templateUrl: './game-sidebar.html',
  styleUrl: './game-sidebar.css',
})
export class GameSidebar {
  readonly canUndo = input.required<boolean>();
  readonly ready = input.required<boolean>();
  readonly status = input.required<GameStatus>();
  readonly gamesPlayed = input(0);
  readonly newGame = output<void>();
}
