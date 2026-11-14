import { computed, inject, Service, signal } from '@angular/core';
import { SoundService } from '@core/audio/sound.service';
import { GameSoundStyle } from '@core/audio/game-sounds';
import { RecordStorage } from '@core/services/record-storage';
import {
  countTiles,
  createBoard,
  findGroup,
  findLargestGroup,
  getStatus,
  groupScore,
  removeGroup,
} from '@features/game/domain/game.engine';
import { GameState, Position } from '@features/game/domain/game.models';
import { BlockStyle } from '@features/game/domain/block-style';
import { BlockStyleService } from './block-style.service';
import { GameSessionStorage } from './game-session-storage';
import { GameCountStorage } from './game-count-storage';

const SOUND_STYLES: Record<BlockStyle, GameSoundStyle> = {
  classic: 'bubbles',
  minimal: 'clicks',
  spectrum: 'spectrum',
};

/** Active sessions survive reloads. The engine owns rules; this service owns history and UI state. */
@Service()
export class GameStore {
  private readonly storage = inject(RecordStorage);
  private readonly sessions = inject(GameSessionStorage);
  private readonly gameCounts = inject(GameCountStorage);
  private readonly sound = inject(SoundService);
  private readonly blocks = inject(BlockStyleService);
  private readonly current = signal<GameState | null>(null);
  private readonly history = signal<readonly GameState[]>([]);
  private readonly selection = signal<Position | null>(null);
  private readonly best = signal(0);
  private readonly gamesStarted = signal(0);
  readonly state = this.current.asReadonly();
  readonly record = this.best.asReadonly();
  readonly gamesPlayed = this.gamesStarted.asReadonly();
  readonly message = signal('Select a group of two or more matching blocks.');
  readonly board = computed(() => this.current()?.board ?? []);
  readonly score = computed(() => this.current()?.score ?? 0);
  readonly remaining = computed(() => countTiles(this.board()));
  readonly moves = computed(() => this.current()?.moves ?? 0);
  readonly status = computed(() => (this.current() ? getStatus(this.board()) : 'playing'));
  readonly canUndo = computed(() => this.history().length > 0);
  readonly group = computed(() =>
    this.selection() ? findGroup(this.board(), this.selection()!) : [],
  );
  readonly highlightedIds = computed(
    () =>
      new Set(
        this.group().length > 1 ? this.group().map((p) => this.board()[p.column][p.row].id) : [],
      ),
  );
  readonly previewScore = computed(() => groupScore(this.group().length));

  initialize(): void {
    if (this.current()) return;
    this.best.set(this.storage.read());
    this.gamesStarted.set(this.gameCounts.read());
    const saved = this.sessions.read();
    if (saved) {
      this.updateRecord(saved.current.score);
      if (getStatus(saved.current.board) === 'playing') {
        if (this.gamesStarted() === 0) {
          this.gamesStarted.set(1);
          this.gameCounts.write(1);
        }
        this.current.set(saved.current);
        this.history.set(saved.history);
        this.selection.set(null);
        this.message.set('Saved game restored. Continue where you left off.');
        return;
      }
    }
    this.newGame();
  }
  newGame(): void {
    this.current.set({ board: createBoard(), score: 0, moves: 0 });
    this.history.set([]);
    this.selection.set(null);
    this.message.set('New game. Find a group of matching blocks.');
    this.gamesStarted.set(this.gameCounts.increment(this.gamesStarted()));
    this.saveSession();
  }
  preview(position: Position | null): void {
    this.selection.set(position);
  }
  play(position: Position): void {
    const previous = this.current();
    if (!previous) return;
    const soundStyle = SOUND_STYLES[this.blocks.style()];
    const next = removeGroup(previous, position);
    if (next === previous) {
      if (previous.board[position.column]?.[position.row]) this.sound.playSingle(soundStyle);
      this.message.set('This block is on its own. Select a group of two or more.');
      return;
    }
    this.history.update((history) => [...history, previous]);
    this.current.set(next);
    this.selection.set(null);
    this.saveSession();
    const removed = countTiles(previous.board) - countTiles(next.board);
    this.sound.playGroup(removed, soundStyle);
    this.message.set(`Blocks removed: ${removed}. +${next.score - previous.score} points.`);
    this.updateRecord(next.score);
  }
  undo(): void {
    const previous = this.history().at(-1);
    if (!previous) return;
    this.current.set(previous);
    this.history.update((history) => history.slice(0, -1));
    this.selection.set(null);
    this.message.set('Last move undone.');
    this.saveSession();
  }
  hint(): void {
    const group = findLargestGroup(this.board());
    this.selection.set(group[0] ?? null);
    this.message.set(
      group.length
        ? `Hint: a group of ${group.length} blocks worth ${groupScore(group.length)} points.`
        : 'No moves left.',
    );
  }

  private saveSession(): void {
    const current = this.current();
    if (current) this.sessions.write({ version: 1, current, history: this.history() });
  }

  private updateRecord(score: number): void {
    if (score <= this.best()) return;
    this.best.set(score);
    this.storage.write(score);
  }
}
