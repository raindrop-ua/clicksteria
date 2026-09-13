import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeSwitcher } from '../shared/ui/theme-switcher/theme-switcher.component';
import { SoundToggle } from '../shared/ui/sound-toggle/sound-toggle.component';
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ThemeSwitcher, SoundToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main"
      (click)="skipToMain($event)"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-4"
      >Skip to content</a
    >
    <div class="mx-auto flex min-h-dvh max-w-[1240px] flex-col px-4 sm:px-10">
      <header
        class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 py-4 sm:h-20 sm:flex-nowrap sm:gap-8 sm:py-0"
      >
        <a
          routerLink="/play"
          aria-label="Clicksteria — play"
          class="flex items-center gap-2.5 text-2xl font-extrabold tracking-[-1px]"
        >
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Clicksteria
        </a>
        <nav
          aria-label="Main navigation"
          class="order-3 flex h-10 w-full items-center gap-7 text-sm font-semibold sm:order-none sm:h-full sm:w-auto"
        >
          <a
            routerLink="/play"
            routerLinkActive="nav-active"
            class="nav-link"
            ariaCurrentWhenActive="page"
            >Play</a
          >
          <a
            routerLink="/rules"
            routerLinkActive="nav-active"
            class="nav-link"
            ariaCurrentWhenActive="page"
            >Rules</a
          >
          <app-sound-toggle class="ml-auto sm:ml-0" />
        </nav>
        <p class="ml-auto hidden text-right text-xs leading-5 text-muted lg:block">
          Simple games.<br />Brighter breaks.
        </p>
        <app-theme-switcher class="ml-auto shrink-0 lg:ml-0" />
      </header>
      <main id="main" tabindex="-1" class="flex-1 outline-none"><router-outlet /></main>
      <footer
        class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted"
      >
        <span>A little color. A little challenge.</span>
        <span class="flex items-center gap-4"
          >Take a break. Match some color.<span class="brand-mark !w-5" aria-hidden="true"
            ><i></i><i></i><i></i><i></i></span
        ></span>
      </footer>
    </div>
  `,
})
export class AppShell {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
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
