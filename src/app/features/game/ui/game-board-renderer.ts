import { Board, GAME_CONFIG, Position, TileColor } from '@features/game/domain/game.models';
import { BlockStyle } from '@features/game/domain/block-style';

/** Positions may be fractional while surviving tiles settle after a move. */
export interface RenderTile extends Position {
  readonly id: number;
  readonly color: TileColor;
}

const PALETTE: Record<TileColor, { tile: string; symbol: string }> = {
  coral: { tile: '#ff6578', symbol: '#ad213a' },
  amber: { tile: '#ffc647', symbol: '#805000' },
  cyan: { tile: '#36c4ee', symbol: '#005f89' },
  violet: { tile: '#a174ff', symbol: '#441993' },
  green: { tile: '#5bd97a', symbol: '#146a2d' },
};

const HIGHLIGHT_PALETTE = varyPalette(1.17);
const DIMMED_PALETTE = varyPalette(0.92);

function varyPalette(brightness: number): typeof PALETTE {
  const adjust = (hex: string): string =>
    `rgb(${[1, 3, 5]
      .map((start) =>
        Math.min(255, Math.round(parseInt(hex.slice(start, start + 2), 16) * brightness)),
      )
      .join(' ')})`;
  return Object.fromEntries(
    Object.entries(PALETTE).map(([color, values]) => [
      color,
      { tile: adjust(values.tile), symbol: adjust(values.symbol) },
    ]),
  ) as typeof PALETTE;
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
): void {
  context.clearRect(0, 0, width, height);
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
      : highlighted.size
        ? DIMMED_PALETTE[tile.color]
        : PALETTE[tile.color];

    if (style === 'classic') {
      context.beginPath();
      context.roundRect(left, top, tileWidth, tileHeight, radius);
      context.fillStyle = '#121a37';
      context.fill();
    }

    const x = left + border;
    const y = top + border;
    const innerWidth = Math.max(0, tileWidth - border * 2);
    const innerHeight = Math.max(0, tileHeight - border * 2);
    const innerRadius = Math.max(0, radius - border);
    if (style === 'glass') {
      drawGlass(context, x, y, innerWidth, innerHeight, innerRadius, unit, palette.tile);
    } else {
      context.beginPath();
      context.roundRect(x, y, innerWidth, innerHeight, innerRadius);
      context.fillStyle = palette.tile;
      context.fill();

      if (style === 'classic') {
        const bevel = context.createLinearGradient(0, y, 0, y + innerHeight);
        bevel.addColorStop(0, '#ffffff70');
        bevel.addColorStop(Math.min(0.4, (3 * unit) / Math.max(1, innerHeight)), '#ffffff00');
        bevel.addColorStop(0.85, '#00000000');
        bevel.addColorStop(1, '#00000018');
        context.fillStyle = bevel;
        context.fill();
      }
    }

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

    if (style === 'classic') {
      context.save();
      const symbolSize = innerWidth * 0.51;
      context.translate(left + (tileWidth - symbolSize) / 2, top + (tileHeight - symbolSize) / 2);
      context.scale(symbolSize / 24, symbolSize / 24);
      context.fillStyle = palette.symbol;
      drawSymbol(context, tile.color);
      context.restore();
    }
  }
}

/** Translucent color and a compact reflection give glass depth without washing out the face. */
function drawGlass(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  unit: number,
  color: string,
): void {
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.globalAlpha = 0.72;
  context.fillStyle = color;
  context.fill();
  context.globalAlpha = 1;

  const sheen = context.createLinearGradient(x, y, x + width * 0.7, y + height);
  sheen.addColorStop(0, '#ffffff5c');
  sheen.addColorStop(0.4, '#ffffff0c');
  sheen.addColorStop(0.5, '#ffffff00');
  sheen.addColorStop(1, '#07142b26');
  context.fillStyle = sheen;
  context.fill();

  const edge = context.createLinearGradient(x, y, x + width, y + height);
  edge.addColorStop(0, '#ffffffbf');
  edge.addColorStop(0.45, '#ffffff40');
  edge.addColorStop(0.72, '#ffffff1c');
  edge.addColorStop(1, '#ffffff66');
  const line = Math.max(1, Math.round(unit));
  context.beginPath();
  context.roundRect(
    x + line / 2,
    y + line / 2,
    Math.max(0, width - line),
    Math.max(0, height - line),
    Math.max(0, radius - line / 2),
  );
  context.lineWidth = line;
  context.strokeStyle = edge;
  context.stroke();

  const inset = Math.min(Math.max(1, Math.round(2 * unit)), width / 4, height / 4);
  const reflection = context.createLinearGradient(0, y + inset, 0, y + height * 0.34);
  reflection.addColorStop(0, '#ffffff3d');
  reflection.addColorStop(0.65, '#ffffff0c');
  reflection.addColorStop(1, '#ffffff00');
  context.beginPath();
  context.roundRect(
    x + inset,
    y + inset,
    Math.max(0, width - inset * 2),
    Math.max(0, height * 0.3 - inset),
    Math.max(0, radius - inset / 2),
  );
  context.fillStyle = reflection;
  context.fill();
  context.restore();
}

function drawSymbol(context: CanvasRenderingContext2D, color: TileColor): void {
  context.beginPath();
  switch (color) {
    case 'coral':
      context.arc(12, 12, 6, 0, Math.PI * 2);
      break;
    case 'amber':
      context.moveTo(12, 4);
      context.lineTo(20, 12);
      context.lineTo(12, 20);
      context.lineTo(4, 12);
      context.closePath();
      break;
    case 'cyan':
      context.roundRect(6, 6, 12, 12, 1.5);
      break;
    case 'violet':
      context.moveTo(12, 3);
      context.lineTo(14.8, 8.7);
      context.lineTo(21, 9.6);
      context.lineTo(16.5, 14);
      context.lineTo(17.6, 20.2);
      context.lineTo(12, 17.2);
      context.lineTo(6.4, 20.2);
      context.lineTo(7.5, 14);
      context.lineTo(3, 9.6);
      context.lineTo(9.2, 8.7);
      context.closePath();
      break;
    case 'green':
      context.moveTo(12, 4);
      context.lineTo(20, 19);
      context.lineTo(4, 19);
      context.closePath();
      break;
  }
  context.fill();
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
