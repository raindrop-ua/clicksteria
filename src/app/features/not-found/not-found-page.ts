import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="py-20 text-center">
    <h1 class="text-4xl font-bold">Nothing here yet</h1>
    <p class="mt-4 text-muted">
      This page does not exist. But there are still blocks on the board.
    </p>
    <a routerLink="/play" class="button button-primary mt-8">Back to game</a>
  </section>`,
})
export default class NotFoundPage {}
