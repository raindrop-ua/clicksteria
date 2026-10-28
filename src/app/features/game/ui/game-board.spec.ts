import { TestBed } from '@angular/core/testing';
import { Board } from '@features/game/domain/game.models';
import { SCENERIES } from '@features/game/domain/board-scenery';
import { GameBoard } from './game-board';

const before: Board = [
  [
    { id: 0, color: 'coral' },
    { id: 1, color: 'coral' },
  ],
  [
    { id: 2, color: 'cyan' },
    { id: 3, color: 'cyan' },
  ],
];

const bounds = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 200,
  bottom: 300,
  width: 200,
  height: 300,
  toJSON: () => ({}),
};

async function setup(board: Board = before) {
  const fixture = TestBed.createComponent(GameBoard);
  fixture.componentRef.setInput('board', board);
  fixture.componentRef.setInput('highlighted', new Set<number>());
  const preview = vi.fn();
  const activated = vi.fn();
  fixture.componentInstance.preview.subscribe(preview);
  fixture.componentInstance.tileActivated.subscribe(activated);
  await fixture.whenStable();
  const grid = fixture.nativeElement.querySelector('[data-board]') as HTMLDivElement;
  const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(bounds);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(bounds);
  const cell = () => grid.querySelector('[role="gridcell"]') as HTMLElement | null;
  const key = async (value: string, repeat = false) => {
    const event = new KeyboardEvent('keydown', {
      key: value,
      repeat,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };
  const point = (type: string, x: number, y: number) =>
    canvas.dispatchEvent(
      new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, detail: 1 }),
    );
  return { fixture, grid, canvas, preview, activated, cell, key, point };
}

describe('Canvas game board', () => {
  beforeEach(() => {
    // jsdom does not implement a drawing context; interaction must still be usable.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses one canvas and one board tab stop with an accessible active cell', async () => {
    const { fixture, grid, canvas, cell } = await setup();
    expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(grid.getAttribute('role')).toBe('grid');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(grid.getAttribute('aria-activedescendant')).toBe(cell()?.id);
    expect(cell()?.getAttribute('aria-label')).toBe('Red circle, column 1, row from bottom 1');
  });

  it('previews the current cell when the keyboard enters the board', async () => {
    const { grid, preview } = await setup();
    grid.focus();
    expect(document.activeElement).toBe(grid);
    expect(preview).toHaveBeenLastCalledWith({ column: 0, row: 0 });
  });

  it('changes decorative scenery without replacing the board or losing keyboard selection', async () => {
    const { fixture, grid, key, cell, activated } = await setup();
    grid.focus();
    await key('ArrowUp');
    const selected = cell()?.id;
    const scene = SCENERIES.find((entry) => entry.id === 'halloween')!;
    fixture.componentRef.setInput('scenery', scene);
    await fixture.whenStable();
    const image = grid.querySelector('img')!;
    expect(image.getAttribute('src')).toBe(scene.image);
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('aria-hidden')).toBe('true');
    expect(grid.getAttribute('data-scenery')).toBe('halloween');
    expect(cell()?.id).toBe(selected);
    expect(document.activeElement).toBe(grid);
    expect(fixture.componentInstance.board()).toBe(before);
    expect(activated).not.toHaveBeenCalled();
  });

  it('moves in the visible arrow direction and clamps navigation to occupied cells', async () => {
    const { grid, cell, key, preview } = await setup();
    grid.focus();
    expect((await key('ArrowUp')).defaultPrevented).toBe(true);
    expect(cell()?.getAttribute('data-tile')).toBe('1');
    await key('ArrowRight');
    expect(cell()?.getAttribute('data-tile')).toBe('3');
    await key('ArrowDown');
    expect(cell()?.getAttribute('data-tile')).toBe('2');
    await key('ArrowLeft');
    await key('ArrowLeft');
    await key('ArrowDown');
    expect(cell()?.getAttribute('data-tile')).toBe('0');
    expect(preview).toHaveBeenLastCalledWith({ column: 0, row: 0 });
    expect(document.activeElement).toBe(grid);
  });

  it('clamps the row when moving into a shorter column', async () => {
    const { grid, cell, key } = await setup([before[0], [before[1][0]]]);
    grid.focus();
    await key('ArrowUp');
    await key('ArrowRight');
    expect(cell()?.getAttribute('data-tile')).toBe('2');
    expect(cell()?.getAttribute('aria-label')).toBe('Blue square, column 2, row from bottom 1');
  });

  it('moves Home and End to the first and last occupied column', async () => {
    const { grid, key, cell } = await setup();
    grid.focus();
    await key('ArrowUp');
    expect((await key('End')).defaultPrevented).toBe(true);
    expect(cell()?.getAttribute('data-tile')).toBe('3');
    expect((await key('Home')).defaultPrevented).toBe(true);
    expect(cell()?.getAttribute('data-tile')).toBe('1');
  });

  it('activates with Enter or Space and ignores held activation keys', async () => {
    const { grid, key, activated } = await setup();
    grid.focus();
    await key('ArrowRight');
    expect((await key('Enter')).defaultPrevented).toBe(true);
    expect((await key(' ')).defaultPrevented).toBe(true);
    await key('Enter', true);
    await key(' ', true);
    expect(activated).toHaveBeenCalledTimes(2);
    expect(activated).toHaveBeenNthCalledWith(1, { column: 1, row: 0 });
    expect(activated).toHaveBeenNthCalledWith(2, { column: 1, row: 0 });
  });

  it('supports assistive-technology activation without pointer coordinates', async () => {
    const { grid, key, activated } = await setup();
    grid.focus();
    await key('ArrowUp');
    grid.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    expect(activated).toHaveBeenLastCalledWith({ column: 0, row: 1 });
  });

  it('maps pointer clicks to the bottom-anchored board and ignores empty space', async () => {
    const { point, activated } = await setup();
    point('click', 30, 290);
    expect(activated).toHaveBeenLastCalledWith({ column: 1, row: 0 });
    point('click', 30, 10);
    point('click', 210, 290);
    point('click', -1, 290);
    point('click', 30, 300);
    expect(activated).toHaveBeenCalledTimes(1);
  });

  it('updates hover preview only when the pointed cell changes', async () => {
    const { point, grid, preview } = await setup();
    preview.mockClear();
    point('pointermove', 10, 290);
    point('pointermove', 11, 291);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenLastCalledWith({ column: 0, row: 0 });
    point('pointermove', 30, 290);
    expect(preview).toHaveBeenLastCalledWith({ column: 1, row: 0 });
    point('pointermove', 30, 10);
    expect(preview).toHaveBeenLastCalledWith(null);
    point('pointermove', 10, 290);
    grid.dispatchEvent(new Event('pointerleave'));
    expect(preview).toHaveBeenLastCalledWith(null);
  });

  it('clears keyboard preview when focus leaves the board', async () => {
    const { grid, preview } = await setup();
    grid.focus();
    preview.mockClear();
    grid.blur();
    expect(preview).toHaveBeenLastCalledWith(null);
  });

  it('does not preview tiles while a touch pointer moves across the board', async () => {
    const { canvas, preview } = await setup();
    const event = new MouseEvent('pointermove', {
      clientX: 10,
      clientY: 290,
      bubbles: true,
    });
    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    preview.mockClear();
    canvas.dispatchEvent(event);
    expect(preview).not.toHaveBeenCalled();
  });

  it('keeps the new hover preview after a keyboard move leaves the board unchanged', async () => {
    const { fixture, grid, key, point, preview, activated } = await setup([
      [before[0][0]],
      [before[1][0]],
    ]);
    grid.focus();
    await key('Enter');
    expect(activated).toHaveBeenLastCalledWith({ column: 0, row: 0 });
    preview.mockClear();
    point('pointermove', 30, 290);
    fixture.componentRef.setInput('highlighted', new Set<number>([2]));
    await fixture.whenStable();
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenLastCalledWith({ column: 1, row: 0 });
  });

  it('keeps pointer preview when the mouse moves before keyboard activation finishes rendering', async () => {
    const { fixture, grid, point, preview, activated } = await setup([
      [before[0][0]],
      [before[1][0]],
    ]);
    grid.focus();
    await fixture.whenStable();
    preview.mockClear();
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    point('pointermove', 30, 290);
    await fixture.whenStable();
    expect(activated).toHaveBeenLastCalledWith({ column: 0, row: 0 });
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenLastCalledWith({ column: 1, row: 0 });
  });

  it('resumes mouse preview on the same hovered tile after keyboard focus enters', async () => {
    const { fixture, grid, point, preview } = await setup();
    point('pointermove', 30, 290);
    grid.focus();
    await fixture.whenStable();
    preview.mockClear();
    point('pointermove', 31, 291);
    await fixture.whenStable();
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenLastCalledWith({ column: 1, row: 0 });
  });

  it('keeps focus after pointer removal without previewing the fallback cell', async () => {
    const { fixture, point, grid, preview, cell } = await setup();
    fixture.componentInstance.tileActivated.subscribe(() =>
      fixture.componentRef.setInput('board', [before[0]]),
    );
    point('pointerdown', 30, 290);
    point('click', 30, 290);
    await fixture.whenStable();
    expect(document.activeElement).toBe(grid);
    expect(cell()?.getAttribute('data-tile')).toBe('0');
    expect(preview.mock.calls.some(([position]) => position?.column === 0)).toBe(false);
  });

  it('previews the fallback cell after removing the keyboard-selected group', async () => {
    const { fixture, grid, key, preview, cell } = await setup();
    grid.focus();
    await key('ArrowRight');
    preview.mockClear();
    fixture.componentInstance.tileActivated.subscribe(() =>
      fixture.componentRef.setInput('board', [before[0]]),
    );
    await key('Enter');
    expect(document.activeElement).toBe(grid);
    expect(cell()?.getAttribute('data-tile')).toBe('0');
    expect(preview).toHaveBeenLastCalledWith({ column: 0, row: 0 });
  });

  it('keeps a surviving active tile selected after gravity moves it', async () => {
    const { fixture, grid, key, cell } = await setup();
    grid.focus();
    await key('ArrowUp');
    fixture.componentRef.setInput('board', [[before[0][1]]]);
    await fixture.whenStable();
    expect(cell()?.getAttribute('data-tile')).toBe('1');
    expect(cell()?.getAttribute('aria-label')).toBe('Red circle, column 1, row from bottom 1');
    expect(document.activeElement).toBe(grid);
  });

  it('lets Tab leave the board and safely handles an empty board', async () => {
    const { grid, key, point, activated } = await setup([]);
    grid.focus();
    expect((await key('Tab')).defaultPrevented).toBe(false);
    await key('ArrowUp');
    await key('Enter');
    await key(' ');
    point('click', 10, 290);
    expect(activated).not.toHaveBeenCalled();
    expect(grid.hasAttribute('aria-activedescendant')).toBe(false);
  });
});
