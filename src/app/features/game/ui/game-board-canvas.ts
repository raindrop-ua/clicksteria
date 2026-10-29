import { Board, GAME_CONFIG, Position } from '@features/game/domain/game.models';
import { BlockStyle } from '@features/game/domain/block-style';
import { RenderTile, renderBoard } from './game-board-renderer';

const FALL_DURATION = 180;

/** Owns only the browser drawing surface; rules and interaction stay outside the renderer. */
export class GameBoardCanvas {
  private readonly context: CanvasRenderingContext2D | null;
  private readonly view: Window;
  private readonly motion: MediaQueryList | undefined;
  private density: MediaQueryList | undefined;
  private observer: ResizeObserver | undefined;
  private board: Board | null = null;
  private tiles: readonly RenderTile[] = [];
  private targets = new Map<number, RenderTile>();
  private displayed: readonly RenderTile[] = [];
  private origins = new Map<number, RenderTile>();
  private highlighted: ReadonlySet<number> = new Set();
  private focusedId: number | null = null;
  private style: BlockStyle = 'classic';
  private startedAt = 0;
  private frame: number | null = null;
  private needsResize = true;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.view = canvas.ownerDocument.defaultView ?? window;
    this.context = canvas.getContext('2d');
    this.motion = this.view.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!this.context) return;

    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(canvas);
    }
    this.view.addEventListener('resize', this.resize);
    this.motion?.addEventListener('change', this.motionChanged);
    this.watchDensity();
    this.schedule();
  }

  update(
    board: Board,
    highlighted: ReadonlySet<number>,
    focusedId: number | null,
    style: BlockStyle = 'classic',
  ): void {
    if (this.destroyed) return;
    if (board !== this.board) {
      const now = this.view.performance.now();
      const previous = new Map(this.sample(now).map((tile) => [tile.id, tile]));
      this.tiles = board.flatMap((column, x) =>
        column.map((tile, y) => ({ ...tile, column: x, row: y })),
      );
      this.targets = new Map(this.tiles.map((tile) => [tile.id, tile]));
      // A fresh game reuses IDs; a changed color identifies it as a reset, not gravity.
      const reset = this.tiles.some((tile) => {
        const old = previous.get(tile.id);
        return old && old.color !== tile.color;
      });
      this.origins = new Map(
        !reset && !this.motion?.matches
          ? this.tiles.flatMap((tile) => {
              const old = previous.get(tile.id);
              return old && (old.column !== tile.column || old.row !== tile.row)
                ? [[tile.id, old] as const]
                : [];
            })
          : [],
      );
      this.startedAt = now;
      this.board = board;
    }
    this.highlighted = highlighted;
    this.focusedId = focusedId;
    this.style = style;
    this.schedule();
  }

  /** Use visible positions during a fall, then resolve the clicked ID in the current board. */
  hitTest(x: number, y: number, width: number, height: number): Position | null {
    if (width <= 0 || height <= 0 || x < 0 || y < 0 || x >= width || y >= height) return null;
    const visible = this.context ? this.displayed : this.tiles;
    for (let index = visible.length - 1; index >= 0; index--) {
      const tile = visible[index];
      const target = this.targets.get(tile.id);
      if (!target) continue;
      const left = (tile.column * width) / GAME_CONFIG.columns;
      const top = ((GAME_CONFIG.rows - tile.row - 1) * height) / GAME_CONFIG.rows;
      if (
        x >= left &&
        x < left + width / GAME_CONFIG.columns &&
        y >= top &&
        y < top + height / GAME_CONFIG.rows
      ) {
        return { column: target.column, row: target.row };
      }
    }
    return null;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.frame !== null) this.view.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.observer?.disconnect();
    this.view.removeEventListener('resize', this.resize);
    this.motion?.removeEventListener('change', this.motionChanged);
    this.density?.removeEventListener('change', this.densityChanged);
  }

  private readonly resize = (): void => {
    this.needsResize = true;
    this.schedule();
  };

  private readonly motionChanged = (): void => {
    if (this.motion?.matches) this.origins.clear();
    this.schedule();
  };

  private readonly densityChanged = (): void => {
    this.watchDensity();
    this.resize();
  };

  private watchDensity(): void {
    this.density?.removeEventListener('change', this.densityChanged);
    this.density = this.view.matchMedia?.(`(resolution: ${this.view.devicePixelRatio || 1}dppx)`);
    this.density?.addEventListener('change', this.densityChanged);
  }

  private schedule(): void {
    if (!this.context || this.destroyed || this.frame !== null) return;
    this.frame = this.view.requestAnimationFrame(this.draw);
  }

  private sample(now: number): readonly RenderTile[] {
    if (!this.origins.size) return this.tiles;
    const progress = Math.min(1, Math.max(0, (now - this.startedAt) / FALL_DURATION));
    if (progress === 1) {
      this.origins.clear();
      return this.tiles;
    }
    const eased = 1 - (1 - progress) ** 3;
    return this.tiles.map((tile) => {
      const origin = this.origins.get(tile.id);
      return origin
        ? {
            ...tile,
            column: origin.column + (tile.column - origin.column) * eased,
            row: origin.row + (tile.row - origin.row) * eased,
          }
        : tile;
    });
  }

  private readonly draw = (now: number): void => {
    this.frame = null;
    if (!this.context || this.destroyed) return;
    if (this.needsResize) {
      const bounds = this.canvas.getBoundingClientRect();
      const ratio = this.view.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      this.needsResize = false;
    }
    this.displayed = this.sample(now);
    renderBoard(
      this.context,
      this.canvas.width,
      this.canvas.height,
      this.displayed,
      this.highlighted,
      this.focusedId,
      this.style,
    );
    if (this.origins.size) this.schedule();
  };
}
