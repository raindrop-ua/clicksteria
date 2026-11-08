import { Board, GAME_CONFIG, Position, TileColor } from '@features/game/domain/game.models';
import { BlockStyle } from '@features/game/domain/block-style';
import { drawJelly, jellyGeometry } from './game-board-jelly';
import { drawSymbol } from './game-board-symbol';
import { BLOCK_PALETTE } from './block-palette';

/** Positions may be fractional while surviving tiles settle after a move. */
export interface RenderTile extends Position {
  readonly id: number;
  readonly color: TileColor;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly opacity?: number;
}

const HIGHLIGHT_PALETTE = varyPalette(1.17);
const DIMMED_PALETTE = varyPalette(0.92);
const NO_HIGHLIGHTS: ReadonlySet<number> = new Set();

function varyPalette(brightness: number): typeof BLOCK_PALETTE {
  const adjust = (hex: string): string =>
    `rgb(${[1, 3, 5]
      .map((start) =>
        Math.min(255, Math.round(parseInt(hex.slice(start, start + 2), 16) * brightness)),
      )
      .join(' ')})`;
  return Object.fromEntries(
    Object.entries(BLOCK_PALETTE).map(([color, values]) => [
      color,
      { ...values, fill: adjust(values.fill) },
    ]),
  ) as typeof BLOCK_PALETTE;
}

/** Draw in backing-store pixels so resting tile edges never land between pixels. */
export function renderBoard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tiles: readonly RenderTile[],
  highlighted: ReadonlySet<number>,
  focusedId: number | null,
  style: BlockStyle = 'classic',
  dimOthers = true,
  departingTiles: readonly RenderTile[] = [],
  showSymbols = true,
): void {
  context.clearRect(0, 0, width, height);
  if (style === 'classic') {
    for (const tile of tiles) {
      drawCandy(context, width, height, tile, highlighted, focusedId, dimOthers, showSymbols);
    }
    for (const tile of departingTiles) {
      drawCandy(context, width, height, tile, NO_HIGHLIGHTS, null, false, showSymbols);
    }
    return;
  }
  const unit = Math.min(width / GAME_CONFIG.columns, height / GAME_CONFIG.rows) / 36;
  const border = Math.max(1, Math.round(2 * unit));
  const radius = Math.max(1, Math.round(7 * unit));

  for (const tile of tiles) {
    const left = Math.round((tile.column * width) / GAME_CONFIG.columns);
    const top = Math.round(((GAME_CONFIG.rows - tile.row - 1) * height) / GAME_CONFIG.rows);
    const tileWidth = Math.round(((tile.column + 1) * width) / GAME_CONFIG.columns) - left;
    const tileHeight =
      Math.round(((GAME_CONFIG.rows - tile.row) * height) / GAME_CONFIG.rows) - top;
    const selected = highlighted.has(tile.id);
    const palette = selected
      ? HIGHLIGHT_PALETTE[tile.color]
      : highlighted.size && dimOthers
        ? DIMMED_PALETTE[tile.color]
        : BLOCK_PALETTE[tile.color];

    context.beginPath();
    context.roundRect(left, top, tileWidth, tileHeight, radius);
    context.fillStyle = '#121a37';
    context.fill();

    const x = left + border;
    const y = top + border;
    const innerWidth = Math.max(0, tileWidth - border * 2);
    const innerHeight = Math.max(0, tileHeight - border * 2);
    const innerRadius = Math.max(0, radius - border);
    context.beginPath();
    context.roundRect(x, y, innerWidth, innerHeight, innerRadius);
    context.fillStyle = palette.fill;
    context.fill();

    const bevel = context.createLinearGradient(0, y, 0, y + innerHeight);
    bevel.addColorStop(0, '#ffffff70');
    bevel.addColorStop(Math.min(0.4, (3 * unit) / Math.max(1, innerHeight)), '#ffffff00');
    bevel.addColorStop(0.85, '#00000000');
    bevel.addColorStop(1, '#00000018');
    context.fillStyle = bevel;
    context.fill();

    if (selected || tile.id === focusedId) {
      const lineWidth = Math.max(1, Math.round((tile.id === focusedId ? 3 : 2) * unit));
      context.beginPath();
      context.roundRect(
        x + lineWidth / 2,
        y + lineWidth / 2,
        Math.max(0, innerWidth - lineWidth),
        Math.max(0, innerHeight - lineWidth),
        Math.max(0, innerRadius - lineWidth / 2),
      );
      context.strokeStyle = '#ffffff';
      context.lineWidth = lineWidth;
      context.stroke();
    }

    if (showSymbols) {
      context.save();
      const symbolSize = innerWidth * 0.51;
      context.translate(left + (tileWidth - symbolSize) / 2, top + (tileHeight - symbolSize) / 2);
      context.scale(symbolSize / 24, symbolSize / 24);
      drawSymbol(context, tile.color);
      context.restore();
    }
  }
}

function drawCandy(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tile: RenderTile,
  highlighted: ReadonlySet<number>,
  focusedId: number | null,
  dimOthers: boolean,
  showSymbols: boolean,
): void {
  const left = Math.round((tile.column * width) / GAME_CONFIG.columns);
  const top = Math.round(((GAME_CONFIG.rows - tile.row - 1) * height) / GAME_CONFIG.rows);
  const tileWidth = Math.round(((tile.column + 1) * width) / GAME_CONFIG.columns) - left;
  const tileHeight = Math.round(((GAME_CONFIG.rows - tile.row) * height) / GAME_CONFIG.rows) - top;
  const body = jellyGeometry(tileWidth, tileHeight);
  const selected = highlighted.has(tile.id);
  const scaleX = tile.scaleX ?? 1;
  const scaleY = tile.scaleY ?? 1;
  context.save();
  context.translate(left, top);
  context.globalAlpha = tile.opacity ?? 1;
  drawJelly(context, tileWidth, tileHeight, tile.color, scaleX, scaleY, showSymbols);

  if (selected || (highlighted.size && dimOthers) || tile.id === focusedId) {
    context.translate(tileWidth / 2, body.y + body.height);
    context.scale(scaleX, scaleY);
    context.translate(-tileWidth / 2, -body.y - body.height);
    context.beginPath();
    context.roundRect(body.x, body.y, body.width, body.height, body.radius);
    if (selected) {
      context.fillStyle = '#ffffff1a';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = Math.max(1, body.side * 0.055);
      context.stroke();
    } else if (highlighted.size && dimOthers) {
      context.fillStyle = '#00000070';
      context.fill();
    }
    if (tile.id === focusedId) {
      const inset = body.side * 0.09;
      context.beginPath();
      context.roundRect(
        body.x + inset,
        body.y + inset,
        body.width - inset * 2,
        body.height - inset * 2,
        Math.max(0, body.radius - inset),
      );
      context.strokeStyle = '#000000d9';
      context.lineWidth = Math.max(3, body.side * 0.1);
      context.stroke();
      context.setLineDash([body.side * 0.11, body.side * 0.06]);
      context.strokeStyle = '#ffffff';
      context.lineWidth = Math.max(1.5, body.side * 0.045);
      context.stroke();
    }
  }
  context.restore();
}

/** Pointer coordinates are local CSS pixels; empty cells never activate a tile. */
export function positionAtPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  board: Board,
): Position | null {
  if (width <= 0 || height <= 0 || x < 0 || y < 0 || x >= width || y >= height) return null;
  const column = Math.floor((x / width) * GAME_CONFIG.columns);
  const row = GAME_CONFIG.rows - 1 - Math.floor((y / height) * GAME_CONFIG.rows);
  return board[column]?.[row] ? { column, row } : null;
}
