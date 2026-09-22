import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SeoService } from '../core/services/seo.service';
import { ThemeSwitcher } from '../shared/ui/theme-switcher/theme-switcher.component';
import { UpdateBannerComponent } from '../shared/ui/update-banner/update-banner.component';
import { SoundToggle } from '../shared/ui/sound-toggle/sound-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeSwitcher,
    SoundToggle,
    UpdateBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    inject(SeoService);
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.element.nativeElement.querySelector('header')?.scrollIntoView?.({ block: 'start' });
          this.element.nativeElement
            .querySelector<HTMLElement>('main')
            ?.focus({ preventScroll: true });
        }
      });
  }
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.element.nativeElement.querySelector<HTMLElement>('main')?.focus();
  }
}
