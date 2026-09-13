import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SoundService } from '../../../core/audio/sound.service';
import { Icon } from '../icon';

@Component({
  selector: 'app-sound-toggle',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:bg-hover hover:text-ink"
      aria-label="Game sounds"
      [attr.aria-pressed]="sound.enabled()"
      [attr.title]="sound.enabled() ? 'Mute sounds' : 'Enable sounds'"
      (click)="sound.toggle()"
    >
      <app-icon [name]="sound.enabled() ? 'volume' : 'volume-off'" />
    </button>
  `,
})
export class SoundToggle {
  protected readonly sound = inject(SoundService);
}
