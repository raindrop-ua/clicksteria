import { NgOptimizedImage } from '@angular/common';
import { Component, computed, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { AppHeader } from '@layout/app-header/app-header.component';
import { AppFooter } from '@layout/app-footer/app-footer.component';
import { UpdateBannerComponent } from '@shared/ui/update-banner/update-banner.component';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, AppFooter, UpdateBannerComponent, NgOptimizedImage],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly scenery = inject(BoardSceneryService);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly backdrop = computed(() =>
    this.url().split('?')[0] === '/play'
      ? this.scenery.scenery().image
      : '/images/branding/menu-sunset.png',
  );

  constructor() {
    inject(SeoService);
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
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
