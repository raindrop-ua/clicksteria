import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/ui/icon';
@Component({
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="mx-auto max-w-2xl py-8 sm:py-12">
      <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl">
        Simple rules.<br /><span class="text-accent">Endless possibilities.</span>
      </h1>
      <p class="mt-5 text-lg leading-relaxed text-muted">
        Clear the board by matching groups of the same color. Take your time — every move is worth
        thinking through.
      </p>
      <ol class="mt-10 space-y-8">
        @for (rule of rules; track rule.title; let index = $index) {
          <li class="flex gap-5">
            <span class="text-xl font-bold text-accent">0{{ index + 1 }}</span>
            <div>
              <h2 class="text-xl font-bold">{{ rule.title }}</h2>
              <p class="mt-2 leading-7 text-muted">{{ rule.text }}</p>
            </div>
          </li>
        }
      </ol>
      <section class="my-9 rounded-2xl border border-violet-200 bg-[#eee9fa] p-6">
        <h2 class="text-xl font-bold">How scoring works</h2>
        <p class="mt-3 leading-7 text-muted">
          A group of n blocks earns n × (n − 1) points. Two blocks earn 2 points, five earn 20, and
          ten earn 90. Clear the entire board for a bonus of 1,000 points.
        </p>
        <p class="mt-3 leading-7 text-muted">
          Your best score is the highest score you have reached. It is saved in this browser and
          does not decrease when you undo a move. Hints are free.
        </p>
      </section>
      <h2 class="text-xl font-bold">Mouse, touch, or keyboard</h2>
      <p class="mt-3 leading-7 text-muted">
        Click or tap a group to remove it. Hover to highlight connected blocks and preview the
        points for that move. With a keyboard: Tab enters the board, arrow keys select a block, and
        Enter or Space makes a move. Press Tab again to leave the board.
      </p>
      <a routerLink="/play" class="button button-primary mt-8"
        >Back to game <app-icon name="arrow"
      /></a>
    </article>
  `,
})
export default class RulesPage {
  protected readonly rules = [
    {
      title: 'Find a group',
      text: 'Two or more matching blocks must share an edge. Diagonal connections do not count. Each color also has a distinct symbol: a circle, diamond, square, star, or triangle.',
    },
    {
      title: 'Make some room',
      text: 'When you remove a group, the blocks above it fall down. If a column becomes empty, the columns to its right shift left. Look for larger groups that will form after the blocks settle.',
    },
    {
      title: 'Try a different path',
      text: 'Undo restores the board and score to the previous move. You can undo every move in the current game, one at a time. A hint highlights the largest available group, but does not guarantee a win.',
    },
    {
      title: 'Clear the board',
      text: 'The game ends when no groups of two or more remain. An empty board means you win! Visiting the rules keeps your game in progress; reloading the page starts a new game.',
    },
  ];
}
