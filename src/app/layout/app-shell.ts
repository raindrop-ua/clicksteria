import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main"
      (click)="skipToMain($event)"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4"
      >Skip to content</a
    >
    <div class="mx-auto flex min-h-dvh max-w-[1240px] flex-col px-4 sm:px-10">
      <header class="flex h-20 shrink-0 items-center gap-8 sm:gap-12">
        <a
          routerLink="/play"
          aria-label="Clixie — play"
          class="flex items-center gap-2.5 text-2xl font-extrabold tracking-[-1px]"
        >
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Clixie
        </a>
        <nav
          aria-label="Main navigation"
          class="flex h-full items-center gap-7 text-sm font-semibold"
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
        </nav>
        <p class="ml-auto hidden text-right text-xs leading-5 text-muted sm:block">
          Simple games.<br />Brighter breaks.
        </p>
      </header>
      <main id="main" tabindex="-1" class="flex-1 outline-none"><router-outlet /></main>
      <footer
        class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted"
      >
        <span>Inspired by classic Clickomania.</span>
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
