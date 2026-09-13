import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { GameStore } from '../data-access/game-store';
import { GameBoard } from '../ui/game-board';
import { GameSidebar } from '../ui/game-sidebar';
@Component({
  imports: [GameBoard, GameSidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-4 text-center">
      <h1 class="text-[clamp(42px,6vw,64px)] leading-[1.05] font-extrabold tracking-[-3px]">
        Clicksteria<span class="text-accent">.</span>
      </h1>
      <p class="mt-3 text-base font-medium text-muted sm:text-xl">
        A familiar game. One more move.
      </p>
    </div>
    <div class="mx-auto mb-3 flex max-w-[740px] justify-end">
      <p class="text-xs text-muted">No rush. No timer.</p>
    </div>
    <div class="mx-auto grid max-w-[740px] items-start gap-4 md:grid-cols-[minmax(0,1fr)_270px]">
      <section
        aria-label="Clicksteria"
        class="min-w-0 rounded-2xl border border-line bg-surface p-3 sm:p-4"
      >
        <div class="mb-3 flex items-center justify-between gap-2 px-1">
          <h2 class="text-xs font-bold sm:text-sm">Classic mode</h2>
          <span class="text-[11px] text-muted sm:text-xs">10 × 15 · 5 colors</span>
        </div>
        <div class="relative rounded-xl bg-[#121a37] p-2.5 sm:p-3">
          <app-game-board
            [inert]="game.status() !== 'playing'"
            [board]="game.board()"
            [highlighted]="game.highlightedIds()"
            (tileActivated)="game.play($event)"
            (preview)="game.preview($event)"
          />
          @if (!game.state()) {
            <div role="status" class="absolute inset-0 grid place-items-center text-sm text-white">
              Preparing the board…
            </div>
          } @else if (game.status() !== 'playing') {
            <div
              class="absolute inset-0 flex items-center justify-center rounded-xl bg-[#121a37]/90 p-6 text-center text-white"
            >
              <div data-result tabindex="-1" role="status" class="outline-none">
                <p class="text-3xl font-bold">
                  {{ game.status() === 'won' ? 'Board cleared!' : 'No moves left' }}
                </p>
                <p class="mt-3 text-sm leading-6">
                  {{
                    game.status() === 'won'
                      ? 'Nicely done! Clear-board bonus: +1,000 points.'
                      : 'Undo a move and try a different path.'
                  }}
                </p>
                <p class="mt-4 text-2xl font-bold">{{ game.score() }} points</p>
                <button class="button button-primary mt-6 w-full" (click)="game.newGame()">
                  Play again
                </button>
              </div>
            </div>
          }
        </div>
        <div
          class="mt-3 flex min-h-5 items-center justify-between gap-2 px-1 text-[11px] text-muted"
        >
          <span>Moves: {{ game.moves() }}</span>
          <span>{{
            game.previewScore()
              ? '+' + game.previewScore() + ' points for this group'
              : 'Match two or more'
          }}</span>
        </div>
      </section>
      <app-game-sidebar
        [score]="game.score()"
        [record]="game.record()"
        [remaining]="game.remaining()"
        [canUndo]="game.canUndo()"
        [ready]="!!game.state()"
        [status]="game.status()"
        (newGame)="game.newGame()"
        (undo)="game.undo()"
        (hint)="game.hint()"
      />
    </div>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ game.message() }}</p>
  `,
})
export default class GamePage {
  protected readonly game = inject(GameStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    // Random generation and localStorage run only after browser hydration.
    afterNextRender(() => this.game.initialize());
    afterRenderEffect(() => {
      if (this.game.status() !== 'playing') {
        this.element.nativeElement
          .querySelector<HTMLElement>('[data-result]')
          ?.focus({ preventScroll: true });
      }
    });
  }
}
