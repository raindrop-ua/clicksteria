import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameStatus } from '../domain/game.models';
import { GameControls } from './game-controls/game-controls.component';
import { GameHelp } from './game-help/game-help.component';

@Component({
  selector: 'app-game-sidebar',
  imports: [DecimalPipe, GameControls, GameHelp],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
