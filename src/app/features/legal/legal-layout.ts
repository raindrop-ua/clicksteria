import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'app-legal-layout',
  imports: [RouterLink, Icon],
  templateUrl: './legal-layout.html',
  styleUrl: './legal-layout.css',
})
export class LegalLayout {
  readonly title = input.required<string>();
  readonly updatedDate = input('2026-09-16');
  readonly updatedLabel = input('September 16, 2026');
}
