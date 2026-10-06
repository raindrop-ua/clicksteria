import { TestBed } from '@angular/core/testing';
import { GameControls } from './game-controls.component';

async function setup(canUndo = true) {
  const fixture = TestBed.createComponent(GameControls);
  fixture.componentRef.setInput('canUndo', canUndo);
  fixture.componentRef.setInput('ready', true);
  fixture.componentRef.setInput('status', 'playing');
  await fixture.whenStable();
  const newGame = vi.fn();
  fixture.componentInstance.newGame.subscribe(newGame);
  const buttons = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  return { fixture, newGame, buttons };
}

describe('Game controls', () => {
  it('keeps the current game when confirmation is cancelled and restores focus', async () => {
    const { fixture, newGame, buttons } = await setup();
    buttons()[0].click();
    await fixture.whenStable();
    expect(newGame).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(buttons()[0]);
    expect(buttons()[0].textContent).toContain('Yes, start a new game');
    buttons()[1].click();
    await fixture.whenStable();
    expect(newGame).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(buttons()[0]);
    expect(buttons()[0].textContent).toContain('New game');
  });

  it('starts a new game only after confirming an active game', async () => {
    const { fixture, newGame, buttons } = await setup();
    buttons()[0].click();
    await fixture.whenStable();
    buttons()[0].click();
    await fixture.whenStable();
    expect(newGame).toHaveBeenCalledOnce();
    expect(buttons()).toHaveLength(3);
  });

  it('starts immediately when there are no moves to lose', async () => {
    const { newGame, buttons } = await setup(false);
    buttons()[0].click();
    expect(newGame).toHaveBeenCalledOnce();
  });
});
