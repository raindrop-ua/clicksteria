import { Component, inject } from '@angular/core';
import { AppUpdateService } from '../../../core/pwa/app-update.service';

@Component({
  selector: 'app-update-banner',
  templateUrl: './update-banner.component.html',
})
export class UpdateBannerComponent {
  protected readonly updates = inject(AppUpdateService);
}
