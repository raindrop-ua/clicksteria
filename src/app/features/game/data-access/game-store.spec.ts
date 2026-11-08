import { TestBed } from '@angular/core/testing';
import { RecordStorage } from '@core/services/record-storage';
import { SoundService } from '@core/audio/sound.service';
import { createBoard, findLargestGroup, removeGroup } from '@features/game/domain/game.engine';
import { GameState } from '@features/game/domain/game.models';
import { GameSessionSnapshot } from '@features/game/domain/game-session';
import { GameStore } from './game-store';
import { BlockStyleService } from './block-style.service';
import { GameSessionStorage } from './game-session-storage';

describe('GameStore', () => {
  const storage = { read: vi.fn(() => 17), write: vi.fn() };
  const sound = { playGroup: vi.fn(), playSingle: vi.fn() };
  const sessions = { read: vi.fn((): GameSessionSnapshot | null => null), write: vi.fn() };

  function savedGame(): GameSessionSnapshot {
    let index = 0;
    const opening: GameState = {
      board: createBoard(() => (Math.floor(index++ / 3) % 5) / 5),
      score: 0,
      moves: 0,
    };
    const first = removeGroup(opening, findLargestGroup(opening.board)[0]);
    const current = removeGroup(first, findLargestGroup(first.board)[0]);
    return { version: 1, current, history: [opening, first] };
  }
  beforeEach(() => {
    localStorage.removeItem('clicksteria.block-style');
    vi.clearAllMocks();
    storage.read.mockReturnValue(17);
    sessions.read.mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: RecordStorage, useValue: storage },
        { provide: SoundService, useValue: sound },
        { provide: GameSessionStorage, useValue: sessions },
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
    expect(sessions.read).toHaveBeenCalledOnce();
    expect(sessions.write).toHaveBeenCalledExactlyOnceWith({
      version: 1,
      current: first,
      history: [],
    });
  });
  it('restores the saved board, score and complete undo history without generating a game', () => {
    const saved = savedGame();
    sessions.read.mockReturnValue(saved);
    const random = vi.spyOn(Math, 'random');
    const game = TestBed.inject(GameStore);
    game.initialize();

    expect(game.state()).toBe(saved.current);
    expect(game.moves()).toBe(2);
    expect(game.canUndo()).toBe(true);
    expect(game.highlightedIds().size).toBe(0);
    expect(game.message()).toContain('Saved game restored');
    expect(random).not.toHaveBeenCalled();
    expect(sound.playGroup).not.toHaveBeenCalled();
    expect(sound.playSingle).not.toHaveBeenCalled();
    expect(sessions.write).not.toHaveBeenCalled();
    expect(game.record()).toBe(saved.current.score);
    expect(storage.write).toHaveBeenCalledWith(saved.current.score);

    game.undo();
    expect(game.state()).toBe(saved.history[1]);
    expect(sessions.write).toHaveBeenLastCalledWith({
      version: 1,
      current: saved.history[1],
      history: [saved.history[0]],
    });
    game.undo();
    expect(game.state()).toBe(saved.history[0]);
    expect(game.canUndo()).toBe(false);
    expect(game.record()).toBe(saved.current.score);
    expect(sessions.write).toHaveBeenLastCalledWith({
      version: 1,
      current: saved.history[0],
      history: [],
    });
  });
  it.each(['won', 'over'] as const)(
    'replaces a saved %s result with a new game on reload',
    (status) => {
      let index = 0;
      const opening: GameState = {
        board: createBoard(() => {
          const column = Math.floor(index / 15);
          const row = index++ % 15;
          return status === 'won' ? 0 : ((column + row) % 5) / 5;
        }),
        score: 0,
        moves: 0,
      };
      const current = removeGroup(opening, { column: 0, row: 0 });
      sessions.read.mockReturnValue({ version: 1, current, history: [opening] });
      const game = TestBed.inject(GameStore);
      game.initialize();

      expect(game.state()).not.toBe(current);
      expect(game.remaining()).toBe(150);
      expect(game.score()).toBe(0);
      expect(game.moves()).toBe(0);
      expect(game.canUndo()).toBe(false);
      expect(game.status()).toBe('playing');
      expect(game.record()).toBe(Math.max(17, current.score));
      expect(game.message()).toContain('New game');
      expect(sessions.write).toHaveBeenCalledExactlyOnceWith({
        version: 1,
        current: game.state(),
        history: [],
      });
      expect(sound.playGroup).not.toHaveBeenCalled();
      expect(sound.playSingle).not.toHaveBeenCalled();
    },
  );
  it.each(['won', 'over'] as const)(
    'keeps Undo available after a %s result until the page is reloaded',
    (status) => {
      const opening: GameState = {
        board: createBoard(() => 0).map((column, x) =>
          column.map((tile, y) =>
            status === 'over' && x === 9 && y === 14 ? { ...tile, color: 'cyan' } : tile,
          ),
        ),
        score: 0,
        moves: 0,
      };
      sessions.read.mockReturnValue({ version: 1, current: opening, history: [] });
      const game = TestBed.inject(GameStore);
      game.initialize();
      game.play({ column: 0, row: 0 });
      expect(game.status()).toBe(status);
      const finished = game.state();
      game.initialize();
      expect(game.state()).toBe(finished);
      expect(game.canUndo()).toBe(true);
      game.undo();
      expect(game.state()).toBe(opening);
      expect(game.status()).toBe('playing');
      expect(sessions.write).toHaveBeenLastCalledWith({
        version: 1,
        current: opening,
        history: [],
      });
    },
  );
  it('saves a successful move before audio and replaces a restored session on new game', () => {
    const saved = savedGame();
    sessions.read.mockReturnValue(saved);
    const game = TestBed.inject(GameStore);
    game.initialize();
    sound.playGroup.mockImplementationOnce(() => {
      expect(sessions.write).toHaveBeenLastCalledWith({
        version: 1,
        current: game.state(),
        history: [...saved.history, saved.current],
      });
    });
    game.play(findLargestGroup(game.board())[0]);
    expect(game.moves()).toBe(3);
    game.newGame();
    expect(game.remaining()).toBe(150);
    expect(game.score()).toBe(0);
    expect(game.moves()).toBe(0);
    expect(game.canUndo()).toBe(false);
    expect(sessions.write).toHaveBeenLastCalledWith({
      version: 1,
      current: game.state(),
      history: [],
    });
  });
  it('keeps a higher stored record when restoring an earlier point in a game', () => {
    storage.read.mockReturnValue(5000);
    sessions.read.mockReturnValue(savedGame());
    const game = TestBed.inject(GameStore);
    game.initialize();
    expect(game.record()).toBe(5000);
    expect(storage.write).not.toHaveBeenCalled();
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
    expect(sessions.write).toHaveBeenCalledOnce();
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
      expect(sessions.write).toHaveBeenCalledOnce();
    },
  );
});
