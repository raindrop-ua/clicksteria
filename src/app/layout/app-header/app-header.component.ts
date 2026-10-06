import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SoundToggle } from '../../shared/ui/sound-toggle/sound-toggle.component';
import { ThemeSwitcher } from '../../shared/ui/theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, SoundToggle, ThemeSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0' },
  templateUrl: './app-header.component.html',
})
export class AppHeader {}
