import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Board, GAME_CONFIG, Position, TILE_LABELS } from '../domain/game.models';

@Component({
  selector: 'app-game-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-board.html',
  styleUrl: './game-board.css',
})
export class GameBoard {
  readonly board = input.required<Board>();
  readonly highlighted = input.required<ReadonlySet<number>>();
  readonly play = output<Position>();
  readonly preview = output<Position | null>();
  protected readonly config = GAME_CONFIG;
  protected readonly labels = TILE_LABELS;
  protected readonly activeId = signal<number | null>(null);
  protected readonly tiles = computed(() =>
    this.board().flatMap((column, x) => column.map((tile, y) => ({ ...tile, column: x, row: y }))),
  );
  protected readonly tabId = computed(() =>
    this.tiles().some((tile) => tile.id === this.activeId())
      ? this.activeId()
      : this.tiles()[0]?.id,
  );
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private restoreFocus: 'pointer' | 'keyboard' | null = null;
  private suppressFocusPreview = false;
  constructor() {
    afterRenderEffect(() => {
      const id = this.tabId();
      this.board();
      if (!this.restoreFocus) return;
      const source = this.restoreFocus;
      this.restoreFocus = null;
      const target =
        this.element.nativeElement.querySelector<HTMLElement>(`[data-tile="${id}"]`) ??
        this.element.nativeElement.querySelector<HTMLElement>('[data-board]');
      // Preserve the tab stop without turning pointer clicks into a keyboard preview.
      this.suppressFocusPreview = source === 'pointer';
      try {
        target?.focus({ preventScroll: true });
      } finally {
        this.suppressFocusPreview = false;
      }
    });
  }
  protected activate(position: Position, event: MouseEvent): void {
    this.restoreFocus = event.detail === 0 ? 'keyboard' : 'pointer';
    this.play.emit(position);
  }
  protected focusTile(id: number, position: Position): void {
    this.activeId.set(id);
    if (!this.suppressFocusPreview) this.preview.emit(position);
  }
  protected navigate(event: KeyboardEvent, position: Position): void {
    const offsets: Record<string, Position> = {
      ArrowLeft: { column: -1, row: 0 },
      ArrowRight: { column: 1, row: 0 },
      ArrowUp: { column: 0, row: 1 },
      ArrowDown: { column: 0, row: -1 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const column = Math.max(0, Math.min(this.board().length - 1, position.column + offset.column));
    const row = Math.max(0, Math.min(this.board()[column].length - 1, position.row + offset.row));
    this.element.nativeElement
      .querySelector<HTMLElement>(`[data-tile="${this.board()[column][row].id}"]`)
      ?.focus();
  }
}
