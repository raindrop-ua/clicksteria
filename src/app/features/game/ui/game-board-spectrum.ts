import { GAME_CONFIG, TileColor } from '@features/game/domain/game.models';
import type { RenderTile } from './game-board-renderer';

const BRIGHT: Record<TileColor, string> = {
  coral: '#ff0000',
  amber: '#ffff00',
  cyan: '#00ffff',
  violet: '#ff00ff',
  green: '#00ff00',
};

// The manual defines normal/bright attributes, not sRGB values. CD is our normal-level approximation.
// https://worldofspectrum.org/ZXBasicManual/zxmanchap16.html
const NORMAL: Record<TileColor, string> = {
  coral: '#cd0000',
  amber: '#cdcd00',
  cyan: '#00cdcd',
  violet: '#cd00cd',
  green: '#00cd00',
};

interface PixelRun {
  readonly column: number;
  readonly row: number;
  readonly length: number;
}

/** Horizontal runs retain the 8×8 bitmap while reducing work on each drawing frame. */
function bitmap(rows: readonly string[]): readonly PixelRun[] {
  const runs: PixelRun[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      if (row[x] !== '1') continue;
      const start = x;
      while (x + 1 < 8 && row[x + 1] === '1') x++;
      runs.push({ column: start, row: y, length: x - start + 1 });
    }
  });
  return runs;
}

const GLYPHS: Record<TileColor, readonly PixelRun[]> = {
  coral: bitmap([
    '00000000',
    '00111100',
    '01111110',
    '01111110',
    '01111110',
    '01111110',
    '00111100',
    '00000000',
  ]),
  amber: bitmap([
    '00000000',
    '00011000',
    '00111100',
    '01111110',
    '01111110',
    '00111100',
    '00011000',
    '00000000',
  ]),
  cyan: bitmap([
    '00000000',
    '01111110',
    '01111110',
    '01111110',
    '01111110',
    '01111110',
    '01111110',
    '00000000',
  ]),
  violet: bitmap([
    '00011000',
    '00011000',
    '11111111',
    '01111110',
    '00111100',
    '01111110',
    '01100110',
    '01000010',
  ]),
  green: bitmap([
    '00000000',
    '00011000',
    '00011000',
    '00111100',
    '00111100',
    '01111110',
    '01111110',
    '00000000',
  ]),
};

/** One paper color and black bitmap ink per tile; all geometry uses whole backing-store pixels. */
export function drawSpectrumBoard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tiles: readonly RenderTile[],
  highlighted: ReadonlySet<number>,
  focusedId: number | null,
  dimOthers: boolean,
  showSymbols: boolean,
): void {
  const cell = Math.min(width / GAME_CONFIG.columns, height / GAME_CONFIG.rows);
  const gap = Math.max(1, Math.round(cell * 0.04));
  const pixel = Math.floor((cell - gap * 2) / 8);
  if (!Number.isFinite(pixel) || pixel < 1) return;
  const side = pixel * 8;
  const glyphPixel = Math.max(1, Math.floor(pixel / 2));
  const glyphInset = Math.round((side - glyphPixel * 8) / 2);
  const line = Math.max(1, Math.floor(pixel / 3));

  for (const tile of tiles) {
    const left = Math.round((tile.column * width) / GAME_CONFIG.columns);
    const right = Math.round(((tile.column + 1) * width) / GAME_CONFIG.columns);
    const top = Math.round(((GAME_CONFIG.rows - tile.row - 1) * height) / GAME_CONFIG.rows);
    const bottom = Math.round(((GAME_CONFIG.rows - tile.row) * height) / GAME_CONFIG.rows);
    const x = left + Math.round((right - left - side) / 2);
    const y = top + Math.round((bottom - top - side) / 2);
    const selected = highlighted.has(tile.id);
    context.fillStyle =
      highlighted.size && dimOthers && !selected ? NORMAL[tile.color] : BRIGHT[tile.color];
    context.fillRect(x, y, side, side);

    if (showSymbols) {
      context.fillStyle = '#000000';
      for (const run of GLYPHS[tile.color]) {
        context.fillRect(
          x + glyphInset + run.column * glyphPixel,
          y + glyphInset + run.row * glyphPixel,
          run.length * glyphPixel,
          glyphPixel,
        );
      }
    }

    if (selected) {
      context.fillStyle = '#ffffff';
      const corner = pixel * 2;
      for (const cornerX of [x - line, x + side + line - corner]) {
        context.fillRect(cornerX, y - line, corner, line);
        context.fillRect(cornerX, y + side, corner, line);
      }
      for (const cornerY of [y - line, y + side + line - corner]) {
        context.fillRect(x - line, cornerY, line, corner);
        context.fillRect(x + side, cornerY, line, corner);
      }
    }

    if (tile.id === focusedId) {
      const inset = Math.max(1, Math.floor(pixel / 2));
      context.fillStyle = '#000000';
      frame(context, x + inset, y + inset, side - inset * 2, line * 3);
      context.fillStyle = '#ffffff';
      frame(context, x + inset + line, y + inset + line, side - inset * 2 - line * 2, line);
    }
  }
}

function frame(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: number,
  line: number,
): void {
  if (side <= line * 2) {
    context.fillRect(x, y, side, side);
    return;
  }
  context.fillRect(x, y, side, line);
  context.fillRect(x, y + side - line, side, line);
  context.fillRect(x, y + line, line, side - line * 2);
  context.fillRect(x + side - line, y + line, line, side - line * 2);
}
