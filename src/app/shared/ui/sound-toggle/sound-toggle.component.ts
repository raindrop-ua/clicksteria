import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SoundService } from '../../../core/audio/sound.service';
import { Icon } from '../icon';

@Component({
  selector: 'app-sound-toggle',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sound-toggle.component.html',
})
export class SoundToggle {
  protected readonly sound = inject(SoundService);
}
