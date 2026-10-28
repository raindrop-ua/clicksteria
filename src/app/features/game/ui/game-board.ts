import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Board, GAME_CONFIG, Position, TILE_LABELS } from '@features/game/domain/game.models';
import { GameBoardCanvas } from './game-board-canvas';
import { positionAtPoint } from './game-board-renderer';

@Component({
  selector: 'app-game-board',
  imports: [NgOptimizedImage],
  templateUrl: './game-board.html',
  styleUrl: './game-board.css',
})
export class GameBoard {
  readonly board = input.required<Board>();
  readonly highlighted = input.required<ReadonlySet<number>>();
  readonly tileActivated = output<Position>();
  readonly preview = output<Position | null>();
  protected readonly config = GAME_CONFIG;
  protected readonly labels = TILE_LABELS;
  private readonly activeId = signal<number | null>(null);
  private readonly keyboardFocus = signal(false);
  protected readonly activeTile = computed(() => {
    const board = this.board();
    for (let column = 0; column < board.length; column++) {
      const row = board[column].findIndex((tile) => tile.id === this.activeId());
      if (row !== -1) return { ...board[column][row], column, row };
    }
    return board[0]?.[0] ? { ...board[0][0], column: 0, row: 0 } : null;
  });
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly grid = viewChild.required<ElementRef<HTMLDivElement>>('grid');
  private readonly destroyRef = inject(DestroyRef);
  private surface: GameBoardCanvas | null = null;
  private pointerFocus = false;
  private hoveredId: number | null = null;
  private readonly keyboardPreviewPending = signal(false);

  constructor() {
    afterNextRender(() => {
      this.surface = new GameBoardCanvas(this.canvas().nativeElement);
      this.surface.update(this.board(), this.highlighted(), this.focusedId());
    });
    afterRenderEffect({
      write: () => {
        const board = this.board();
        const highlighted = this.highlighted();
        const focusedId = this.focusedId();
        const previewPending = this.keyboardPreviewPending();
        untracked(() => {
          this.activeId.set(this.activeTile()?.id ?? null);
          this.surface?.update(board, highlighted, focusedId);
          if (previewPending) {
            this.keyboardPreviewPending.set(false);
            if (this.keyboardFocus()) this.previewActive();
          }
        });
      },
    });
    this.destroyRef.onDestroy(() => this.surface?.destroy());
  }

  protected focusBoard(): void {
    if (this.pointerFocus) return;
    this.keyboardFocus.set(true);
    this.previewActive();
  }

  protected blurBoard(): void {
    this.keyboardFocus.set(false);
    this.preview.emit(null);
  }

  protected pointerDown(): void {
    this.keyboardFocus.set(false);
    this.pointerFocus = true;
    this.grid().nativeElement.focus({ preventScroll: true });
    this.pointerFocus = false;
  }

  protected hover(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    const position = this.positionForEvent(event);
    const id = position ? this.board()[position.column][position.row].id : null;
    if (id === this.hoveredId && !this.keyboardFocus()) return;
    this.hoveredId = id;
    this.keyboardFocus.set(false);
    this.preview.emit(position);
  }

  protected leave(): void {
    this.hoveredId = null;
    if (!this.keyboardFocus()) this.preview.emit(null);
  }

  protected activate(event: MouseEvent): void {
    const keyboard = event.detail === 0;
    const position = keyboard ? this.activeTile() : this.positionForEvent(event);
    if (!position) return;
    this.activeId.set(this.board()[position.column][position.row].id);
    this.keyboardFocus.set(keyboard);
    this.keyboardPreviewPending.set(keyboard);
    this.hoveredId = null;
    this.tileActivated.emit({ column: position.column, row: position.row });
  }

  protected navigate(event: KeyboardEvent): void {
    const active = this.activeTile();
    if (!active) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      this.keyboardFocus.set(true);
      this.keyboardPreviewPending.set(true);
      this.tileActivated.emit({ column: active.column, row: active.row });
      return;
    }
    const offsets: Record<string, Position> = {
      ArrowLeft: { column: -1, row: 0 },
      ArrowRight: { column: 1, row: 0 },
      ArrowUp: { column: 0, row: 1 },
      ArrowDown: { column: 0, row: -1 },
    };
    const offset = offsets[event.key];
    if (!offset && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const board = this.board();
    const column = Math.max(
      0,
      Math.min(
        board.length - 1,
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? board.length - 1
            : active.column + offset.column,
      ),
    );
    const row = Math.max(0, Math.min(board[column].length - 1, active.row + (offset?.row ?? 0)));
    this.activeId.set(board[column][row].id);
    this.keyboardFocus.set(true);
    this.hoveredId = null;
    this.preview.emit({ column, row });
  }

  private focusedId(): number | null {
    return this.keyboardFocus() ? (this.activeTile()?.id ?? null) : null;
  }

  private previewActive(): void {
    const tile = this.activeTile();
    this.preview.emit(tile ? { column: tile.column, row: tile.row } : null);
  }

  private positionForEvent(event: MouseEvent): Position | null {
    const bounds = this.canvas().nativeElement.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return this.surface
      ? this.surface.hitTest(x, y, bounds.width, bounds.height)
      : positionAtPoint(x, y, bounds.width, bounds.height, this.board());
  }
}
