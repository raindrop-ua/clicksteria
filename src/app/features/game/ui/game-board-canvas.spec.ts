import { Board } from '@features/game/domain/game.models';
import { BLOCK_STYLES } from '@features/game/domain/block-style';
import { GameBoardCanvas } from './game-board-canvas';
import { renderBoard } from './game-board-renderer';

const opening: Board = [
  [
    { id: 0, color: 'coral' },
    { id: 1, color: 'coral' },
    { id: 2, color: 'cyan' },
  ],
  [{ id: 3, color: 'green' }],
];
const settled: Board = [[opening[0][2]], opening[1]];
class MediaQuery extends EventTarget {
  matches = false;
}

describe('Game board canvas lifecycle and motion', () => {
  let surface: GameBoardCanvas;
  let canvas: HTMLCanvasElement;
  let now: number;
  let nextFrame: number;
  let frames: Map<number, FrameRequestCallback>;
  let queries: Map<string, MediaQuery>;
  let disconnect: ReturnType<typeof vi.fn>;
  const renderer = vi.fn<typeof renderBoard>();

  function drawAt(time: number): void {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(time));
  }
  function drawing() {
    const call = renderer.mock.lastCall!;
    return {
      tiles: call[3],
      highlighted: call[4],
      focused: call[5],
      style: call[6],
      dim: call[7],
      departing: call[8] ?? [],
      showSymbols: call[9],
    };
  }
  function startMove() {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update(settled, new Set(), null);
  }
  beforeEach(() => {
    renderer.mockClear();
    now = 0;
    nextFrame = 0;
    frames = new Map();
    queries = new Map();
    disconnect = vi.fn();
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
    vi.stubGlobal('matchMedia', (query: string) => {
      const media = new MediaQuery();
      queries.set(query, media);
      return media;
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 540));
    surface = new GameBoardCanvas(canvas, renderer);
  });
  afterEach(() => {
    surface.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['minimal', 'spectrum'] as const)(
    'preserves the %s 180ms fall and stops while idle',
    (style) => {
      surface.update(opening, new Set(), null, style);
      surface.update(opening, new Set([0, 1]), 0, style);
      expect(frames.size).toBe(1);
      drawAt(0);
      expect(renderer).toHaveBeenCalledOnce();
      expect(frames.size).toBe(0);
      surface.update(settled, new Set(), null, style);
      drawAt(45);
      expect(drawing().tiles[0].row).toBeCloseTo(2 * (1 - 0.25) ** 3);
      expect(drawing().tiles[0].scaleX).toBeUndefined();
      expect(drawing().departing).toEqual([]);
      expect(frames.size).toBe(1);
      drawAt(180);
      expect(drawing().tiles[0].row).toBe(0);
      expect(frames.size).toBe(0);
      expect(renderer).toHaveBeenCalledTimes(3);
    },
  );
  it.each(['minimal', 'spectrum'] as const)(
    'hit-tests a falling %s tile at its visible position',
    (style) => {
      surface.update(opening, new Set(), null, style);
      drawAt(0);
      surface.update(settled, new Set(), null, style);
      drawAt(45);
      expect(surface.hitTest(18, 490, 360, 540)).toEqual({ column: 0, row: 0 });
      expect(surface.hitTest(18, 535, 360, 540)).toBeNull();
      expect(surface.hitTest(360, 490, 360, 540)).toBeNull();
    },
  );
  it.each(BLOCK_STYLES)(
    'forwards $id selection, keyboard focus, and dimming independently of board state',
    ({ id }) => {
      const group = new Set([0, 1]);
      surface.update(opening, group, 3, id, false);
      drawAt(0);
      expect(drawing()).toMatchObject({ highlighted: group, focused: 3, style: id, dim: false });
      expect(drawing().tiles).toHaveLength(4);
      expect(frames.size).toBe(0);
      surface.update(opening, group, 3, id, true);
      drawAt(16);
      expect(drawing().dim).toBe(true);
      expect(surface.hitTest(18, 450, 360, 540)).toEqual({ column: 0, row: 2 });
      expect(frames.size).toBe(0);
    },
  );
  it.each(BLOCK_STYLES)(
    'toggles $id symbols during a fall without restarting movement or changing hit coordinates',
    ({ id }) => {
      surface.update(opening, new Set(), null, id, true, true);
      drawAt(0);
      surface.update(settled, new Set(), null, id, true, true);
      drawAt(100);
      const previousTiles = drawing().tiles;
      const previousDepartures = drawing().departing;
      const row = previousTiles[0].row;
      const y = (14.5 - row) * 36;
      expect(drawing().showSymbols).toBe(true);
      expect(surface.hitTest(18, y, 360, 540)).toEqual({ column: 0, row: 0 });

      surface.update(settled, new Set(), null, id, true, false);
      drawAt(100);
      expect(drawing().showSymbols).toBe(false);
      expect(drawing().tiles).toEqual(previousTiles);
      expect(drawing().departing).toEqual(previousDepartures);
      expect(surface.hitTest(18, y, 360, 540)).toEqual({ column: 0, row: 0 });
      expect(frames.size).toBe(1);

      drawAt(150);
      const expectedRow =
        id !== 'classic'
          ? 2 * (1 - 150 / 180) ** 3
          : 2 - 2 * (125 / (115 + 45 * Math.sqrt(2))) ** 2;
      expect(drawing().tiles[0].row).toBeCloseTo(expectedRow);
      expect(drawing().departing).toHaveLength(id === 'classic' ? 2 : 0);

      surface.update(settled, new Set(), null, id, true, true);
      drawAt(345);
      expect(drawing().showSymbols).toBe(true);
      expect(drawing().tiles[0].row).toBe(0);
      expect(drawing().departing).toEqual([]);
      expect(frames.size).toBe(0);
    },
  );
  it('uses delayed accelerating jelly gravity, stretch, and a short landing wobble', () => {
    startMove();
    drawAt(20);
    expect(drawing().tiles[0]).toMatchObject({ row: 2, scaleX: 1, scaleY: 1 });
    drawAt(100);
    const fallDuration = 115 + 45 * Math.sqrt(2);
    expect(drawing().tiles[0].row).toBeCloseTo(2 - 2 * (75 / fallDuration) ** 2);
    expect(drawing().tiles[0]).toMatchObject({ scaleX: 0.985, scaleY: 1.025 });
    expect(surface.hitTest(18, 455, 360, 540)).toEqual({ column: 0, row: 0 });
    drawAt(205);
    expect(drawing().tiles[0]).toMatchObject({ row: 0, scaleX: 1.04, scaleY: 0.94 });
    expect(frames.size).toBe(1);
    drawAt(345);
    expect(drawing().tiles[0].row).toBe(0);
    expect(drawing().tiles[0].scaleX).toBeUndefined();
    expect(drawing().departing).toEqual([]);
    expect(frames.size).toBe(0);
  });
  it('drops removed jelly blocks below the board without making them clickable', () => {
    startMove();
    drawAt(50);
    expect(drawing().departing.map((tile) => tile.id)).toEqual([0, 1]);
    expect(drawing().departing[0].row).toBeCloseTo(-17 * (50 / 340) ** 2);
    expect(drawing().departing[0].color).toBe('coral');
    expect(surface.hitTest(18, 530, 360, 540)).toBeNull();
    drawAt(340);
    expect(drawing().departing).toEqual([]);
  });
  it('animates lateral collapse and keeps earlier departures moving during rapid moves', () => {
    startMove();
    drawAt(100);
    const blueRow = drawing().tiles[0].row;
    surface.update([opening[1]], new Set(), null);
    drawAt(150);
    expect(drawing().tiles[0].column).toBeCloseTo((1 - 50 / 190) ** 3);
    expect(drawing().departing.map((tile) => tile.id)).toEqual([0, 1, 2]);
    expect(drawing().departing[0].row).toBeCloseTo(-17 * (150 / 340) ** 2);
    expect(drawing().departing[2].row).toBeCloseTo(blueRow - 17 * (50 / 340) ** 2);
    drawAt(440);
    expect(drawing().departing).toEqual([]);
    expect(drawing().tiles[0].column).toBe(0);
    expect(frames.size).toBe(0);
  });
  it('keeps departures running when a move clears the entire board', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update([], new Set(), null);
    drawAt(100);
    expect(drawing().tiles).toEqual([]);
    expect(drawing().departing).toHaveLength(4);
    expect(frames.size).toBe(1);
    drawAt(340);
    expect(drawing().departing).toEqual([]);
    expect(frames.size).toBe(0);
  });
  it.each(['undo', 'new-game'] as const)('clears jelly motion immediately on $0', (action) => {
    startMove();
    drawAt(100);
    const restored: Board = action === 'undo' ? opening : [[{ id: 2, color: 'amber' }]];
    surface.update(restored, new Set(), null);
    drawAt(101);
    expect(drawing().departing).toEqual([]);
    expect(
      drawing().tiles.every((tile) => tile.scaleX === undefined && Number.isInteger(tile.row)),
    ).toBe(true);
    expect(frames.size).toBe(0);
  });
  it('settles and discards jelly effects when switching styles mid-animation', () => {
    startMove();
    drawAt(100);
    surface.update(settled, new Set(), 2, 'minimal');
    drawAt(101);
    expect(drawing()).toMatchObject({ style: 'minimal', departing: [] });
    expect(drawing().tiles[0].row).toBe(0);
    expect(drawing().tiles[0].scaleX).toBeUndefined();
    expect(frames.size).toBe(0);
  });
  it('updates bitmap density without changing CSS hit coordinates', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    expect([canvas.width, canvas.height]).toEqual([360, 540]);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
    queries.get('(resolution: 1dppx)')?.dispatchEvent(new Event('change'));
    drawAt(16);
    expect([canvas.width, canvas.height]).toEqual([720, 1080]);
    expect(queries.has('(resolution: 2dppx)')).toBe(true);
    expect(surface.hitTest(18, 450, 360, 540)).toEqual({ column: 0, row: 2 });
    expect(frames.size).toBe(0);
  });
  it.each(BLOCK_STYLES)(
    'settles $id immediately when reduced motion is enabled during a fall',
    ({ id }) => {
      surface.update(opening, new Set(), null, id);
      drawAt(0);
      surface.update(settled, new Set(), null, id);
      drawAt(45);
      const motion = queries.get('(prefers-reduced-motion: reduce)')!;
      motion.matches = true;
      motion.dispatchEvent(new Event('change'));
      drawAt(46);
      expect(drawing().departing).toEqual([]);
      expect(drawing().tiles[0].scaleX).toBeUndefined();
      expect(surface.hitTest(18, 490, 360, 540)).toBeNull();
      expect(surface.hitTest(18, 522, 360, 540)).toEqual({ column: 0, row: 0 });
      expect(frames.size).toBe(0);
    },
  );
  it('skips jelly motion when reduced motion was already enabled', () => {
    queries.get('(prefers-reduced-motion: reduce)')!.matches = true;
    startMove();
    drawAt(16);
    expect(drawing().departing).toEqual([]);
    expect(drawing().tiles[0].row).toBe(0);
    expect(frames.size).toBe(0);
  });
  it('cancels pending animation and disconnects observers when destroyed', () => {
    startMove();
    expect(frames.size).toBe(1);
    surface.destroy();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('resize'));
    queries.get('(resolution: 1dppx)')?.dispatchEvent(new Event('change'));
    surface.update(opening, new Set(), null);
    expect(frames.size).toBe(0);
    expect(renderer).toHaveBeenCalledOnce();
  });
});
