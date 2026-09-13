import { TestBed } from '@angular/core/testing';
import { Board } from '../domain/game.models';
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
const after: Board = [before[0]];

async function setup() {
  const fixture = TestBed.createComponent(GameBoard);
  fixture.componentRef.setInput('board', before);
  fixture.componentRef.setInput('highlighted', new Set<number>());
  await fixture.whenStable();
  const preview = vi.fn();
  fixture.componentInstance.preview.subscribe(preview);
  fixture.componentInstance.play.subscribe(() => fixture.componentRef.setInput('board', after));
  const tile = fixture.nativeElement.querySelector('[data-tile="2"]') as HTMLButtonElement;
  tile.focus();
  preview.mockClear();
  return { fixture, preview, tile };
}

describe('Game board focus after removal', () => {
  it('restores focus after a pointer click without previewing the bottom-left group', async () => {
    const { fixture, preview, tile } = await setup();
    tile.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-tile')).toBe('0');
    expect(preview).not.toHaveBeenCalled();
  });

  it('keeps group preview when restoring focus after keyboard activation', async () => {
    const { fixture, preview, tile } = await setup();
    tile.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-tile')).toBe('0');
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({ column: 0, row: 0 }));
  });

  it('still previews tiles on hover and keyboard navigation after a pointer move', async () => {
    const { fixture, preview, tile } = await setup();
    tile.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await fixture.whenStable();
    preview.mockClear();
    const survivor = fixture.nativeElement.querySelector('[data-tile="0"]') as HTMLButtonElement;
    survivor.dispatchEvent(new Event('pointerenter'));
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({ column: 0, row: 0 }));
    survivor.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-tile')).toBe('1');
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({ column: 0, row: 1 }));
  });
});
