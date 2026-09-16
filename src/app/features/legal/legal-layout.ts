import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-layout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="mx-auto max-w-2xl py-8 sm:py-12">
      <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl">{{ title() }}</h1>
      <p class="mt-4 text-sm text-muted">
        Last updated: <time datetime="2026-09-16">September 16, 2026</time>
      </p>
      <div
        class="mt-8 space-y-8 text-base leading-7 text-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_p+p]:mt-3 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
      >
        <ng-content />
      </div>
      <a routerLink="/play" class="button mt-8">Back to game</a>
    </article>
  `,
})
export class LegalLayout {
  readonly title = input.required<string>();
}
