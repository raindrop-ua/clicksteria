import { TILE_COLORS } from '@features/game/domain/game.models';
import type { RenderTile } from './game-board-renderer';
import { drawSpectrumBoard } from './game-board-spectrum';

interface Rectangle {
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const tiles: readonly RenderTile[] = TILE_COLORS.map((color, column) => ({
  id: column,
  color,
  column,
  row: 0,
}));
const bright = ['#ff0000', '#ffff00', '#00ffff', '#ff00ff', '#00ff00'];

function drawing(
  values: readonly RenderTile[] = tiles,
  highlighted: ReadonlySet<number> = new Set(),
  focusedId: number | null = null,
  dimOthers = true,
  showSymbols = false,
  width = 400,
  height = 600,
) {
  const rectangles: Rectangle[] = [];
  // No path, gradient, transform, timer or clear API: the style must need only integer fillRect.
  const paint = {
    fillStyle: '',
    fillRect: (x: number, y: number, width: number, height: number) => {
      rectangles.push({ color: paint.fillStyle, x, y, width, height });
    },
  };
  drawSpectrumBoard(
    paint as unknown as CanvasRenderingContext2D,
    width,
    height,
    values,
    highlighted,
    focusedId,
    dimOthers,
    showSymbols,
  );
  const at = (x: number, y: number) => {
    for (let index = rectangles.length - 1; index >= 0; index--) {
      const rect = rectangles[index];
      if (x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height) {
        return rect.color;
      }
    }
    return '#000000';
  };
  return { rectangles, at };
}

function contrastOnBlack(color: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 + 0.05) / 0.05;
}

describe('Spectrum board renderer', () => {
  it('draws five flat bright paper colors as equally sized square 8×8 cells', () => {
    const { rectangles } = drawing();
    expect(rectangles.map((rect) => rect.color)).toEqual(bright);
    expect(rectangles.map(({ x, y, width, height }) => [x, y, width, height])).toEqual([
      [4, 564, 32, 32],
      [44, 564, 32, 32],
      [84, 564, 32, 32],
      [124, 564, 32, 32],
      [164, 564, 32, 32],
    ]);
  });

  it('uses normal brightness only outside the selection when dimming is enabled', () => {
    const selected = new Set([0]);
    const papers = (rectangles: readonly Rectangle[]) =>
      rectangles.filter((rect) => !['#000000', '#ffffff'].includes(rect.color));
    expect(papers(drawing(tiles, selected).rectangles).map((rect) => rect.color)).toEqual([
      '#ff0000',
      '#cdcd00',
      '#00cdcd',
      '#cd00cd',
      '#00cd00',
    ]);
    expect(
      papers(drawing(tiles, selected, null, false).rectangles).map((rect) => rect.color),
    ).toEqual(bright);
    expect(papers(drawing().rectangles).map((rect) => rect.color)).toEqual(bright);
  });

  it('keeps black glyph contrast at least 3:1 on every bright and normal color', () => {
    for (const highlighted of [new Set<number>(), new Set([99])]) {
      const { rectangles } = drawing(tiles, highlighted, null, true, true);
      const papers = rectangles.filter((rect) => !['#000000', '#ffffff'].includes(rect.color));
      expect(papers).toHaveLength(5);
      expect(papers.every((paper) => contrastOnBlack(paper.color) >= 3)).toBe(true);
      expect(rectangles.some((rect) => rect.color === '#000000')).toBe(true);
    }
  });

  it('draws five distinct 8×8 bitmap shapes and removes all glyph ink when symbols are disabled', () => {
    const withSymbols = drawing(tiles, new Set(), null, true, true);
    const shapes = tiles.map((tile) =>
      Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, column) =>
          withSymbols.at(tile.column * 40 + 12 + column * 2 + 1, 572 + row * 2 + 1) === '#000000'
            ? '1'
            : '0',
        ).join(''),
      ).join('\n'),
    );
    expect(new Set(shapes).size).toBe(5);
    expect(shapes.every((shape) => shape.includes('1') && shape.includes('0'))).toBe(true);
    for (const tile of tiles) {
      const originX = tile.column * 40 + 12;
      const glyph = withSymbols.rectangles.filter(
        (rect) =>
          rect.color === '#000000' && rect.x >= tile.column * 40 && rect.x < (tile.column + 1) * 40,
      );
      expect(glyph.length).toBeGreaterThan(0);
      expect(
        glyph.every(
          (rect) =>
            rect.x >= originX &&
            rect.x + rect.width <= originX + 16 &&
            rect.y >= 572 &&
            rect.y + rect.height <= 588,
        ),
      ).toBe(true);
    }
    expect(withSymbols.at(90, 570)).toBe('#00ffff');
    expect(withSymbols.at(130, 570)).toBe('#ff00ff');
    const withoutSymbols = drawing();
    expect(withoutSymbols.rectangles).toEqual(
      withSymbols.rectangles.filter((rect) => rect.color !== '#000000'),
    );
    expect(withoutSymbols.at(20, 580)).toBe('#ff0000');
    expect(withSymbols.at(20, 580)).toBe('#000000');
  });

  it('puts white selection corners in the black gutter without repainting the paper', () => {
    const { rectangles, at } = drawing([tiles[0]], new Set([0]));
    expect(rectangles[0].color).toBe('#ff0000');
    expect(at(3, 563)).toBe('#ffffff');
    expect(at(36, 596)).toBe('#ffffff');
    expect(at(20, 563)).toBe('#000000');
    expect(at(20, 580)).toBe('#ff0000');
  });

  it('keeps a black and white focus cue when symbols and dimming are disabled', () => {
    const { at } = drawing([tiles[0]], new Set(), 0, false, false);
    expect(at(6, 566)).toBe('#000000');
    expect(at(7, 567)).toBe('#ffffff');
    expect(at(8, 568)).toBe('#000000');
    expect(at(20, 580)).toBe('#ff0000');
  });

  it.each([1, 1.25, 1.5, 2, 3])(
    'aligns moving artwork and feedback to integer pixels at DPR %s',
    (density) => {
      const values = tiles.map((tile) => ({ ...tile, column: tile.column + 0.123, row: 2.345 }));
      const { rectangles } = drawing(
        values,
        new Set([0]),
        1,
        true,
        true,
        Math.round(396 * density),
        Math.round(594 * density),
      );
      expect(rectangles.length).toBeGreaterThan(5);
      expect(
        rectangles.every(({ x, y, width, height }) =>
          [x, y, width, height].every(Number.isInteger),
        ),
      ).toBe(true);
      expect(rectangles.every(({ width, height }) => width > 0 && height > 0)).toBe(true);
      const papers = rectangles.filter((rect) => !['#000000', '#ffffff'].includes(rect.color));
      expect(new Set(papers.map((paper) => paper.width)).size).toBe(1);
      expect(papers.every((paper) => paper.width === paper.height && paper.width % 8 === 0)).toBe(
        true,
      );
    },
  );
});
