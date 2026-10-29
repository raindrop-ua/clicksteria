import { Board } from '@features/game/domain/game.models';
import { BLOCK_STYLES } from '@features/game/domain/block-style';
import { GameBoardCanvas } from './game-board-canvas';

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

function drawingContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
}

describe('Game board canvas lifecycle', () => {
  let surface: GameBoardCanvas;
  let canvas: HTMLCanvasElement;
  let now: number;
  let nextFrame: number;
  let frames: Map<number, FrameRequestCallback>;
  let queries: Map<string, MediaQuery>;
  let disconnect: ReturnType<typeof vi.fn>;
  let context: ReturnType<typeof drawingContext>;

  function drawAt(time: number): void {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(time));
  }

  beforeEach(() => {
    now = 0;
    nextFrame = 0;
    frames = new Map();
    queries = new Map();
    disconnect = vi.fn();
    context = drawingContext();
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
      context as unknown as CanvasRenderingContext2D,
    );
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 540));
    surface = new GameBoardCanvas(canvas);
  });

  afterEach(() => {
    surface.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('coalesces changes into one frame and stops drawing when the board is idle', () => {
    surface.update(opening, new Set(), null);
    surface.update(opening, new Set([0, 1]), 0);
    expect(frames.size).toBe(1);
    drawAt(0);
    expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 360, 540);
    expect(context.stroke).toHaveBeenCalled();
    expect(frames.size).toBe(0);

    surface.update(settled, new Set(), null);
    drawAt(45);
    expect(frames.size).toBe(1);
    drawAt(180);
    expect(frames.size).toBe(0);
    expect(context.clearRect).toHaveBeenCalledTimes(3);
  });

  it('activates a falling tile at its visible position using its current board coordinates', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update(settled, new Set(), null);
    drawAt(45);

    // The surviving blue tile is visibly above row zero halfway through its fall.
    expect(surface.hitTest(18, 490, 360, 540)).toEqual({ column: 0, row: 0 });
    expect(surface.hitTest(18, 535, 360, 540)).toBeNull();
    expect(surface.hitTest(360, 490, 360, 540)).toBeNull();
  });

  it('redraws the same board in a new style without moving tiles or keeping an idle loop', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    const symbols = context.translate.mock.calls.length;
    expect(symbols).toBe(4);

    surface.update(opening, new Set([0, 1]), 0, 'minimal');
    expect(frames.size).toBe(1);
    drawAt(16);
    expect(context.translate).toHaveBeenCalledTimes(symbols);
    expect(context.stroke).toHaveBeenCalledTimes(2);
    expect(context.clearRect).toHaveBeenCalledTimes(2);
    expect(surface.hitTest(18, 450, 360, 540)).toEqual({ column: 0, row: 2 });
    expect(frames.size).toBe(0);
  });

  it('keeps the original falling timeline when the block style changes mid-animation', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update(settled, new Set(), null);
    drawAt(45);
    expect(surface.hitTest(18, 490, 360, 540)).toEqual({ column: 0, row: 0 });

    surface.update(settled, new Set(), 2, 'glass');
    drawAt(90);
    expect(surface.hitTest(18, 490, 360, 540)).toBeNull();
    expect(surface.hitTest(18, 522, 360, 540)).toEqual({ column: 0, row: 0 });
    expect(frames.size).toBe(1);
    drawAt(180);
    expect(frames.size).toBe(0);
  });

  it.each(BLOCK_STYLES)(
    'renders $id with keyboard and group outlines, and only classic symbols',
    ({ id }) => {
      surface.update(opening, new Set([0, 1]), 3, id);
      drawAt(0);
      expect(context.stroke.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(context.translate).toHaveBeenCalledTimes(id === 'classic' ? 4 : 0);
      if (id === 'minimal') expect(context.createLinearGradient).not.toHaveBeenCalled();
      expect(frames.size).toBe(0);
    },
  );

  it.each(BLOCK_STYLES)(
    'can disable dimming in $id while keeping the selected group bright and focus visible',
    ({ id }) => {
      const drawing = context as unknown as CanvasRenderingContext2D;
      const colors: string[] = [];
      const outlines: string[] = [];
      context.fill.mockImplementation(() => {
        if (typeof drawing.fillStyle === 'string') colors.push(drawing.fillStyle);
      });
      context.stroke.mockImplementation(() => {
        if (typeof drawing.strokeStyle === 'string') outlines.push(drawing.strokeStyle);
      });

      function paint(highlighted: ReadonlySet<number>, time: number, dimOthers?: boolean) {
        colors.length = 0;
        outlines.length = 0;
        surface.update(opening, highlighted, 3, id, dimOthers);
        expect(frames.size).toBe(1);
        drawAt(time);
        expect(frames.size).toBe(0);
        return { colors: [...colors], outlines: [...outlines] };
      }

      const resting = paint(new Set(), 0);
      const group = new Set([0, 1]);
      const defaultDimming = paint(group, 16);
      const disabled = paint(group, 32, false);
      const enabled = paint(group, 48, true);
      // The first two tiles form the selected group; the last two remain outside it.
      const middle = resting.colors.length / 2;
      expect(disabled.colors.slice(middle)).toEqual(resting.colors.slice(middle));
      expect(defaultDimming.colors.slice(middle)).not.toEqual(resting.colors.slice(middle));
      expect(disabled.colors.slice(0, middle)).not.toEqual(resting.colors.slice(0, middle));
      expect(disabled.colors.slice(0, middle)).toEqual(defaultDimming.colors.slice(0, middle));
      expect(enabled.colors).toEqual(defaultDimming.colors);
      expect(disabled.outlines.filter((color) => color === '#ffffff')).toHaveLength(3);
      expect(surface.hitTest(18, 450, 360, 540)).toEqual({ column: 0, row: 2 });
      expect(context.clearRect).toHaveBeenCalledTimes(4);
    },
  );

  it('updates bitmap density after moving between displays without changing CSS coordinates', () => {
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

  it('settles immediately when reduced motion is enabled during a fall', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update(settled, new Set(), null);
    drawAt(45);
    const motion = queries.get('(prefers-reduced-motion: reduce)')!;
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    drawAt(46);
    expect(surface.hitTest(18, 490, 360, 540)).toBeNull();
    expect(surface.hitTest(18, 522, 360, 540)).toEqual({ column: 0, row: 0 });
    expect(frames.size).toBe(0);
  });

  it('cancels pending animation and disconnects observers when destroyed', () => {
    surface.update(opening, new Set(), null);
    drawAt(0);
    surface.update(settled, new Set(), null);
    expect(frames.size).toBe(1);
    surface.destroy();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('resize'));
    queries.get('(resolution: 1dppx)')?.dispatchEvent(new Event('change'));
    surface.update(opening, new Set(), null);
    expect(frames.size).toBe(0);
    expect(context.clearRect).toHaveBeenCalledTimes(1);
  });
});
