import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'app-game-help',
  imports: [RouterLink, Icon],
  templateUrl: './game-help.component.html',
  styleUrl: './game-help.component.css',
})
export class GameHelp {}
