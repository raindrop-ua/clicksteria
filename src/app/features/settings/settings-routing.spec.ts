import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';
import { SoundService } from '@core/audio/sound.service';
import { GameStore } from '@features/game/data-access/game-store';
import { GameBoard } from '@features/game/ui/game-board';
import { findLargestGroup } from '@features/game/domain/game.engine';

describe('Settings navigation', () => {
  beforeEach(() => {
    localStorage.removeItem('clicksteria:classic:session:v1');
    localStorage.removeItem('clicksteria.scenery');
    localStorage.removeItem('clicksteria.block-style');
    localStorage.removeItem('clicksteria.dim-others');
    localStorage.removeItem('clicksteria.show-symbols');
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(TestBed.inject(SoundService), 'playGroup').mockImplementation(() => undefined);
    vi.spyOn(TestBed.inject(SoundService), 'playSingle').mockImplementation(() => undefined);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('clicksteria:classic:session:v1');
    localStorage.removeItem('clicksteria.scenery');
    localStorage.removeItem('clicksteria.block-style');
    localStorage.removeItem('clicksteria.dim-others');
    localStorage.removeItem('clicksteria.show-symbols');
  });

  it('opens settings directly and applies its choices when starting the game', async () => {
    const harness = await RouterTestingHarness.create('/settings');
    const game = TestBed.inject(GameStore);
    const settings = harness.routeNativeElement!;
    expect(settings.querySelector('h1')?.textContent).toContain('Settings');
    expect(settings.querySelector('a[href="/play"]')).toBeTruthy();
    expect(game.state()).toBeNull();

    const scenery = settings.querySelector('select')!;
    scenery.value = 'summer';
    scenery.dispatchEvent(new Event('change'));
    const minimalist = Array.from(settings.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Minimalist'),
    )!;
    minimalist.click();
    const dimming = settings.querySelector<HTMLInputElement>('#board-dimming')!;
    expect(dimming.checked).toBe(true);
    dimming.checked = false;
    dimming.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    expect(localStorage.getItem('clicksteria.scenery')).toBe('summer');
    expect(localStorage.getItem('clicksteria.block-style')).toBe('minimal');
    expect(localStorage.getItem('clicksteria.dim-others')).toBe('false');

    await harness.navigateByUrl('/play');
    await harness.fixture.whenStable();
    const play = harness.routeNativeElement!;
    expect(play.querySelector('[data-board]')?.getAttribute('data-scenery')).toBe('summer');
    expect(play.querySelector('[data-board]')?.getAttribute('data-block-style')).toBe('minimal');
    expect(play.querySelector('app-board-scenery-picker')).toBeNull();
    expect(play.querySelector('app-block-style-picker')).toBeNull();
    expect(
      harness.fixture.debugElement
        .query((element) => element.componentInstance instanceof GameBoard)
        ?.componentInstance.dimOthers(),
    ).toBe(false);
    expect(game.remaining()).toBe(150);
  });

  it('preserves the exact game and undo history across a trip through settings', async () => {
    const harness = await RouterTestingHarness.create('/play');
    await harness.fixture.whenStable();
    const game = TestBed.inject(GameStore);
    const opening = game.state();
    game.play(findLargestGroup(game.board())[0]);
    const played = game.state();
    expect(game.canUndo()).toBe(true);

    await harness.navigateByUrl('/settings');
    await harness.fixture.whenStable();
    const minimal = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Minimalist'),
    )!;
    minimal.click();
    await harness.fixture.whenStable();
    await harness.navigateByUrl('/play');
    await harness.fixture.whenStable();

    expect(game.state()).toBe(played);
    expect(game.canUndo()).toBe(true);
    expect(
      harness.routeNativeElement!.querySelector('[data-board]')?.getAttribute('data-block-style'),
    ).toBe('minimal');
    game.undo();
    expect(game.state()).toBe(opening);
  });

  it.each(['classic', 'minimal'] as const)(
    'applies and restores the symbol preference in %s without changing the game or undo history',
    async (style) => {
      const harness = await RouterTestingHarness.create('/play');
      await harness.fixture.whenStable();
      const game = TestBed.inject(GameStore);
      const opening = game.state();
      game.play(findLargestGroup(game.board())[0]);
      const played = game.state();

      await harness.navigateByUrl('/settings');
      await harness.fixture.whenStable();
      const settings = harness.routeNativeElement!;
      const styleLabel = style === 'classic' ? 'Classic' : 'Minimalist';
      const choice = Array.from(settings.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === styleLabel,
      )!;
      choice.click();
      const symbols = settings.querySelector<HTMLInputElement>('#board-symbols')!;
      expect(symbols.checked).toBe(true);
      symbols.click();
      await harness.fixture.whenStable();
      expect(localStorage.getItem('clicksteria.show-symbols')).toBe('false');
      expect(settings.querySelectorAll('.preview-no-symbols')).toHaveLength(2);

      await harness.navigateByUrl('/play');
      await harness.fixture.whenStable();
      const board = () =>
        harness.fixture.debugElement.query(
          (element) => element.componentInstance instanceof GameBoard,
        )?.componentInstance as GameBoard;
      expect(board().blockStyle()).toBe(style);
      expect(board().showSymbols()).toBe(false);
      expect(game.state()).toBe(played);
      expect(game.canUndo()).toBe(true);

      await harness.navigateByUrl('/settings');
      await harness.fixture.whenStable();
      const restored =
        harness.routeNativeElement!.querySelector<HTMLInputElement>('#board-symbols')!;
      expect(restored.checked).toBe(false);
      restored.click();
      await harness.fixture.whenStable();
      expect(localStorage.getItem('clicksteria.show-symbols')).toBeNull();

      await harness.navigateByUrl('/play');
      await harness.fixture.whenStable();
      expect(board().showSymbols()).toBe(true);
      expect(board().blockStyle()).toBe(style);
      expect(game.state()).toBe(played);
      game.undo();
      expect(game.state()).toBe(opening);
    },
  );
});
