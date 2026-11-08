import { TileColor } from '@features/game/domain/game.models';
import { RenderTile, renderBoard } from './game-board-renderer';

type PathCommand = readonly [string, ...number[]];
interface TestGradient {
  readonly stops: [number, string][];
  addColorStop(offset: number, color: string): void;
}
interface PaintedShape {
  readonly path: readonly PathCommand[];
  readonly fill: string | TestGradient;
}

const colors: readonly TileColor[] = ['coral', 'amber', 'cyan', 'violet', 'green'];
const tiles: readonly RenderTile[] = colors.map((color, column) => ({
  id: column,
  color,
  column,
  row: 0,
}));

describe('Game board artwork and sprite caching', () => {
  let contexts: CanvasRenderingContext2D[];
  let paintings: WeakMap<CanvasRenderingContext2D, PaintedShape[]>;
  let context: CanvasRenderingContext2D;

  function makeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    let path: PathCommand[] = [];
    const shapes: PaintedShape[] = [];
    const paint = {
      canvas,
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      lineWidth: 1,
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: () => (path = []),
      closePath: () => path.push(['close']),
      roundRect: (...values: number[]) => path.push(['roundRect', ...values]),
      arc: (...values: number[]) => path.push(['arc', ...values]),
      moveTo: (...values: number[]) => path.push(['moveTo', ...values]),
      lineTo: (...values: number[]) => path.push(['lineTo', ...values]),
      quadraticCurveTo: (...values: number[]) => path.push(['quadraticCurveTo', ...values]),
      fill: () => shapes.push({ path: [...path], fill: paint.fillStyle }),
      stroke: vi.fn(),
      createLinearGradient: vi.fn((): TestGradient => {
        const stops: [number, string][] = [];
        return { stops, addColorStop: (offset, color) => stops.push([offset, color]) };
      }),
    };
    const result = paint as unknown as CanvasRenderingContext2D;
    paintings.set(result, shapes);
    contexts.push(result);
    return result;
  }

  function surface(width = 360, height = 540): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d')!;
  }

  function draw(
    values: readonly RenderTile[] = tiles,
    selected: ReadonlySet<number> = new Set(),
    focused: number | null = null,
    dimOthers = true,
    showSymbols = true,
  ): void {
    renderBoard(
      context,
      context.canvas.width,
      context.canvas.height,
      values,
      selected,
      focused,
      'classic',
      dimOthers,
      [],
      showSymbols,
    );
  }

  beforeEach(() => {
    contexts = [];
    paintings = new WeakMap();
    const byCanvas = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      let paint = byCanvas.get(this);
      if (!paint) {
        paint = makeContext(this);
        byCanvas.set(this, paint);
      }
      return paint;
    });
    context = surface();
  });

  afterEach(() => vi.restoreAllMocks());

  it('keeps the minimal border, bevel and circle with the shared tile palette', () => {
    renderBoard(context, 360, 540, [tiles[0]], new Set(), null, 'minimal');

    expect(paintings.get(context)).toEqual([
      { path: [['roundRect', 0, 504, 36, 36, 7]], fill: '#121a37' },
      { path: [['roundRect', 2, 506, 32, 32, 5]], fill: '#ff4936' },
      {
        path: [['roundRect', 2, 506, 32, 32, 5]],
        fill: {
          stops: [
            [0, '#ffffff70'],
            [3 / 32, '#ffffff00'],
            [0.85, '#00000000'],
            [1, '#00000018'],
          ],
          addColorStop: expect.any(Function),
        },
      },
      { path: [['arc', 12, 12, 6, 0, Math.PI * 2]], fill: '#ffffffad' },
    ]);
    expect(contexts).toHaveLength(1);
  });

  it('retains five distinct shape cues in minimal and in the cached jelly artwork', () => {
    renderBoard(context, 360, 540, tiles, new Set(), null, 'minimal');
    const minimalSymbols = paintings.get(context)!.filter((_, index) => index % 4 === 3);
    expect(minimalSymbols.map((shape) => shape.fill)).toEqual(colors.map(() => '#ffffffad'));
    expect(new Set(minimalSymbols.map((shape) => JSON.stringify(shape.path))).size).toBe(5);

    draw();
    const jellySymbols = contexts.slice(1).map((paint) => paintings.get(paint)!.at(-1)!);
    expect(jellySymbols.map((shape) => shape.path)).toEqual(
      minimalSymbols.map((shape) => shape.path),
    );
  });

  it.each(['classic', 'minimal'] as const)(
    'hides only the five decorative symbol paths when symbols are disabled for %s',
    (style) => {
      renderBoard(context, 360, 540, tiles, new Set(), null, 'minimal');
      const symbols = paintings
        .get(context)!
        .filter((_, index) => index % 4 === 3)
        .map((shape) => JSON.stringify(shape.path));
      const paintFrame = (showSymbols: boolean) => {
        const previousContexts = contexts.length;
        const previousPaintings = paintings.get(context)!.length;
        renderBoard(context, 360, 540, tiles, new Set(), null, style, true, [], showSymbols);
        return style === 'minimal'
          ? paintings.get(context)!.slice(previousPaintings)
          : contexts.slice(previousContexts).flatMap((paint) => paintings.get(paint)!);
      };

      const enabled = paintFrame(true);
      const disabled = paintFrame(false);
      const isSymbol = (shape: PaintedShape) => symbols.includes(JSON.stringify(shape.path));
      expect(enabled.filter(isSymbol)).toHaveLength(5);
      expect(disabled.filter(isSymbol)).toEqual([]);
      expect(disabled.map((shape) => shape.path)).toEqual(
        enabled.filter((shape) => !isSymbol(shape)).map((shape) => shape.path),
      );
    },
  );

  it('reuses color artwork during idle redraws, selection, focus and dimming changes', () => {
    draw();
    const baked = contexts.slice(1);
    expect(baked).toHaveLength(5);
    expect(baked.every((paint) => paintings.get(paint)!.length > 0)).toBe(true);

    draw();
    draw(tiles, new Set([0, 1]), 2);
    draw(tiles, new Set([2, 3]), 4, false);
    expect(contexts.slice(1)).toEqual(baked);
    expect(context.drawImage).toHaveBeenCalledTimes(20);
    expect(context.createLinearGradient).not.toHaveBeenCalled();
  });

  it('bakes each landing pose once and keeps ordinary tiles cached alongside it', () => {
    draw();
    const landing = tiles.map((tile) => ({ ...tile, scaleX: 1.04, scaleY: 0.94 }));
    draw(landing);
    expect(contexts).toHaveLength(11);

    draw(landing);
    draw(tiles);
    expect(contexts).toHaveLength(11);
    expect(context.drawImage).toHaveBeenCalledTimes(20);
  });

  it('rebuilds symbol artwork on toggle and reuses both ordinary and landing sprites between toggles', () => {
    const landing = tiles.map((tile) => ({ ...tile, scaleX: 1.04, scaleY: 0.94 }));
    draw();
    draw(landing);
    expect(contexts).toHaveLength(11);
    const enabledSymbols = contexts.slice(1).map((paint) => paintings.get(paint)!.at(-1)!.path);

    draw(tiles, new Set(), null, true, false);
    draw(landing, new Set(), null, true, false);
    expect(contexts).toHaveLength(21);
    expect(
      contexts.slice(11).every((paint) => paintings.get(paint)!.at(-1)!.fill !== '#ffffffad'),
    ).toBe(true);
    draw(tiles, new Set([0]), 1, true, false);
    draw(landing, new Set(), null, true, false);
    expect(contexts).toHaveLength(21);

    draw(landing);
    draw();
    expect(contexts).toHaveLength(31);
    expect(contexts.slice(21).map((paint) => paintings.get(paint)!.at(-1)!.path)).toEqual(
      enabledSymbols,
    );
    draw();
    draw(landing);
    expect(contexts).toHaveLength(31);
  });

  it('rebuilds for resized backing stores, including DPR changes, without accumulating old sizes', () => {
    draw();
    expect(contexts).toHaveLength(6);
    context.canvas.width = 720;
    context.canvas.height = 1080;
    draw();
    expect(contexts).toHaveLength(11);
    draw();
    expect(contexts).toHaveLength(11);

    context.canvas.width = 360;
    context.canvas.height = 540;
    draw();
    expect(contexts).toHaveLength(16);
    draw();
    expect(contexts).toHaveLength(16);
  });

  it('owns cached artwork per drawing surface', () => {
    draw();
    const first = context;
    context = surface();
    draw();
    expect(contexts).toHaveLength(12);
    context = first;
    draw();
    expect(contexts).toHaveLength(12);
  });
});
