import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameSidebar } from './game-sidebar';

describe('Game sidebar', () => {
  it('shows a formatted count after initialization and updates it without requesting a new game', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(GameSidebar);
    fixture.componentRef.setInput('canUndo', false);
    fixture.componentRef.setInput('ready', false);
    fixture.componentRef.setInput('status', 'playing');
    fixture.componentRef.setInput('gamesPlayed', 1234);
    const newGame = vi.fn();
    fixture.componentInstance.newGame.subscribe(newGame);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.rail-games')).toBeNull();

    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();
    expect(element.querySelector('.rail-games')?.textContent).toContain('Games played: 1,234');

    fixture.componentRef.setInput('gamesPlayed', 2345678);
    await fixture.whenStable();
    expect(element.querySelector('.rail-games strong')?.textContent).toBe('2,345,678');
    expect(newGame).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('app-game-controls button')?.click();
    expect(newGame).toHaveBeenCalledOnce();
  });
});
