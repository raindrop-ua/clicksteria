import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon';

@Component({
  selector: 'app-game-help',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './game-help.component.html',
})
export class GameHelp {}
