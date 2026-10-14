import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameStatus } from '@features/game/domain/game.models';
import { GameControls } from '@features/game/ui/game-controls/game-controls.component';
import { GameHelp } from '@features/game/ui/game-help/game-help.component';

@Component({
  selector: 'app-game-sidebar',
  imports: [DecimalPipe, GameControls, GameHelp],
  templateUrl: './game-sidebar.html',
})
export class GameSidebar {
  readonly score = input.required<number>();
  readonly record = input.required<number>();
  readonly remaining = input.required<number>();
  readonly canUndo = input.required<boolean>();
  readonly ready = input.required<boolean>();
  readonly status = input.required<GameStatus>();
  readonly newGame = output<void>();
  readonly undo = output<void>();
  readonly hint = output<void>();
}
