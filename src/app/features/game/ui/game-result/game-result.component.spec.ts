import { TestBed } from '@angular/core/testing';
import { GameResult } from './game-result.component';

describe('Game result', () => {
  it.each(['won', 'over'] as const)('focuses the %s result and forwards replay', async (status) => {
    const fixture = TestBed.createComponent(GameResult);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('score', 1234);
    const playAgain = vi.fn();
    fixture.componentInstance.playAgain.subscribe(playAgain);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(document.activeElement).toBe(element.querySelector('[data-result]'));
    expect(element.textContent).toContain(status === 'won' ? 'Board cleared!' : 'No moves left');
    expect(element.textContent).toContain('1234 points');
    element.querySelector('button')?.click();
    expect(playAgain).toHaveBeenCalledOnce();
  });
});
