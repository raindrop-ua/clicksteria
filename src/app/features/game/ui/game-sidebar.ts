import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon';
import { GameStatus } from '../domain/game.models';
@Component({
  selector: 'app-game-sidebar',
  imports: [DecimalPipe, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Score and controls" class="rounded-2xl border border-line bg-surface p-6">
      <p class="text-xs font-semibold tracking-widest text-muted">SCORE</p>
      <p class="mt-1 mb-5 text-[64px] leading-tight font-bold tracking-[-3px] tabular-nums">
        {{ score() | number }}
      </p>
      <dl class="space-y-3 border-t border-line pt-5 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted">Best score</dt>
          <dd class="font-bold tabular-nums">{{ record() | number }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">Blocks left</dt>
          <dd class="font-bold tabular-nums">{{ remaining() }}</dd>
        </div>
      </dl>
      <div class="mt-6 grid gap-2.5">
        @if (confirming()) {
          <p class="text-sm leading-6" role="status">Start over? Your current game will be lost.</p>
          <button class="button button-primary" (click)="confirming.set(false); newGame.emit()">
            Yes, start a new game
          </button>
          <button class="button" (click)="confirming.set(false)">Keep playing</button>
        } @else {
          <button class="button button-primary" [disabled]="!ready()" (click)="requestNew()">
            New game
          </button>
          <button class="button" [disabled]="!canUndo()" (click)="undo.emit()">
            <app-icon name="undo" />Undo move
          </button>
          <button
            class="button"
            [disabled]="!ready() || status() !== 'playing'"
            (click)="hint.emit()"
          >
            <app-icon name="bulb" />Hint
          </button>
        }
      </div>
    </section>
    <section class="mt-4 rounded-2xl border border-panel-line bg-panel p-6">
      <p class="mb-4 text-[11px] font-semibold tracking-widest text-muted">HOW TO PLAY</p>
      <h2 class="text-2xl leading-tight font-bold tracking-[-.5px]">
        Fewer blocks.<br />More points.
      </h2>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        Click groups of two or more matching blocks to remove them from the board.
      </p>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        The bigger the group, the more points you earn.
      </p>
      <a
        routerLink="/rules"
        class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
        >All the rules <app-icon name="arrow"
      /></a>
    </section>
  `,
})
export class GameSidebar {
  readonly score = input.required<number>();
  readonly record = input.required<number>();
  readonly remaining = input.required<number>();
  readonly canUndo = input.required<boolean>();
  readonly ready = input.required<boolean>();
  readonly status = input.required<GameStatus>();
  readonly newGame = output<void>();
  readonly undo = output<void>();
  readonly hint = output<void>();
  protected readonly confirming = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private hasRequestedNew = false;
  constructor() {
    afterRenderEffect(() => {
      this.confirming();
      if (this.hasRequestedNew) {
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('button')
          ?.focus({ preventScroll: true });
      }
    });
  }
  protected requestNew(): void {
    this.hasRequestedNew = true;
    if (this.canUndo() && this.status() === 'playing') this.confirming.set(true);
    else this.newGame.emit();
  }
}
