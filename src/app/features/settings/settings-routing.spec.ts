import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';
import { SoundService } from '@core/audio/sound.service';
import { GameStore } from '@features/game/data-access/game-store';
import { findLargestGroup } from '@features/game/domain/game.engine';

describe('Settings navigation', () => {
  beforeEach(() => {
    localStorage.removeItem('clicksteria.scenery');
    localStorage.removeItem('clicksteria.block-style');
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(TestBed.inject(SoundService), 'playClick').mockImplementation(() => undefined);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('clicksteria.scenery');
    localStorage.removeItem('clicksteria.block-style');
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
    const glass = Array.from(settings.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Glass'),
    )!;
    glass.click();
    await harness.fixture.whenStable();
    expect(localStorage.getItem('clicksteria.scenery')).toBe('summer');
    expect(localStorage.getItem('clicksteria.block-style')).toBe('glass');

    await harness.navigateByUrl('/play');
    await harness.fixture.whenStable();
    const play = harness.routeNativeElement!;
    expect(play.querySelector('[data-board]')?.getAttribute('data-scenery')).toBe('summer');
    expect(play.querySelector('[data-board]')?.getAttribute('data-block-style')).toBe('glass');
    expect(play.querySelector('app-board-scenery-picker')).toBeNull();
    expect(play.querySelector('app-block-style-picker')).toBeNull();
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
      (button) => button.textContent?.includes('Minimal'),
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
});
