import { Component, inject } from '@angular/core';
import { SoundService } from '@core/audio/sound.service';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'app-sound-toggle',
  imports: [Icon],
  templateUrl: './sound-toggle.component.html',
})
export class SoundToggle {
  protected readonly sound = inject(SoundService);
}
