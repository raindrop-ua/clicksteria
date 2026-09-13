import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';
import { Icon } from '../icon';

@Component({
  selector: 'app-theme-switcher',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-switcher.component.html',
})
export class ThemeSwitcher {
  protected readonly theme = inject(ThemeService);
  protected readonly options = [
    { value: 'system', label: 'System theme', icon: 'monitor' },
    { value: 'light', label: 'Light theme', icon: 'sun' },
    { value: 'dark', label: 'Dark theme', icon: 'moon' },
  ] as const;
}
