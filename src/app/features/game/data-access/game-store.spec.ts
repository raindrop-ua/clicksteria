import { TestBed } from '@angular/core/testing';
import { RecordStorage } from '@core/services/record-storage';
import { SoundService } from '@core/audio/sound.service';
import { findLargestGroup } from '@features/game/domain/game.engine';
import { GameStore } from './game-store';
import { BlockStyleService } from './block-style.service';

describe('GameStore', () => {
  const storage = { read: vi.fn(() => 17), write: vi.fn() };
  const sound = { playGroup: vi.fn(), playSingle: vi.fn() };
  beforeEach(() => {
    localStorage.removeItem('clicksteria.block-style');
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: RecordStorage, useValue: storage },
        { provide: SoundService, useValue: sound },
      ],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('clicksteria.block-style');
  });
  it('initializes once, preserving a session when navigating back', () => {
    const game = TestBed.inject(GameStore);
    expect(game.state()).toBeNull();
    game.initialize();
    const first = game.state();
    game.initialize();
    expect(game.state()).toBe(first);
    expect(game.record()).toBe(17);
  });
  it('restores the exact previous board and score, and resets history for a new game', () => {
    const game = TestBed.inject(GameStore);
    game.initialize();
    const first = game.state();
    game.play(findLargestGroup(game.board())[0]);
    expect(game.remaining()).toBeLessThan(150);
    expect(game.canUndo()).toBe(true);
    game.undo();
    expect(game.state()).toBe(first);
    expect(game.canUndo()).toBe(false);
    game.play(findLargestGroup(game.board())[0]);
    game.newGame();
    expect(game.remaining()).toBe(150);
    expect(game.score()).toBe(0);
    expect(game.canUndo()).toBe(false);
  });
  it('previews a real group without spending a move', () => {
    const game = TestBed.inject(GameStore);
    game.initialize();
    const previous = game.state();
    game.hint();
    expect(game.highlightedIds().size).toBeGreaterThanOrEqual(2);
    expect(game.previewScore()).toBeGreaterThan(0);
    expect(game.state()).toBe(previous);
    expect(sound.playGroup).not.toHaveBeenCalled();
    expect(sound.playSingle).not.toHaveBeenCalled();
  });
  it('plays the matching group sound using the exact removed count', () => {
    const game = TestBed.inject(GameStore);
    game.initialize();
    const group = findLargestGroup(game.board());
    const before = game.remaining();
    game.play(group[0]);
    expect(sound.playGroup).toHaveBeenCalledExactlyOnceWith(group.length, 'bubbles');
    expect(game.remaining()).toBe(before - group.length);
    expect(sound.playSingle).not.toHaveBeenCalled();
    game.undo();
    game.newGame();
    expect(sound.playGroup).toHaveBeenCalledOnce();
  });
  it('uses the current block style on the next move without replacing the game', () => {
    const game = TestBed.inject(GameStore);
    const blocks = TestBed.inject(BlockStyleService);
    game.initialize();
    const opening = game.state();
    const group = findLargestGroup(game.board());
    for (const [style, audio] of [
      ['minimal', 'clicks'],
      ['classic', 'bubbles'],
      ['minimal', 'clicks'],
    ] as const) {
      blocks.setStyle(style);
      expect(game.state()).toBe(opening);
      game.play(group[0]);
      expect(sound.playGroup).toHaveBeenLastCalledWith(group.length, audio);
      game.undo();
      expect(game.state()).toBe(opening);
    }
    expect(sound.playGroup).toHaveBeenCalledTimes(3);
  });
  it.each([
    ['classic', 'bubbles'],
    ['minimal', 'clicks'],
  ] as const)(
    'plays the quiet %s singleton effect only for an existing isolated block',
    (style, audio) => {
      let index = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        const column = Math.floor(index / 15);
        const row = index++ % 15;
        return ((column + row) % 5) / 5;
      });
      const game = TestBed.inject(GameStore);
      TestBed.inject(BlockStyleService).setStyle(style);
      game.play({ column: 0, row: 2 });
      expect(sound.playSingle).not.toHaveBeenCalled();
      game.initialize();
      const previous = game.state();
      game.play({ column: 0, row: 2 });
      expect(sound.playSingle).toHaveBeenCalledExactlyOnceWith(audio);
      expect(sound.playGroup).not.toHaveBeenCalled();
      expect(game.state()).toBe(previous);
      game.play({ column: 10, row: 0 });
      expect(sound.playSingle).toHaveBeenCalledOnce();
    },
  );
});
