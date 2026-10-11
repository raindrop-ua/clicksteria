import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'block shrink-0' },
  templateUrl: './app-footer.component.html',
})
export class AppFooter {}
