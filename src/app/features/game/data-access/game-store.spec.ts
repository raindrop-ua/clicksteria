import { TestBed } from '@angular/core/testing';
import { RecordStorage } from '../../../core/services/record-storage';
import { findLargestGroup } from '../domain/game.engine';
import { GameStore } from './game-store';

describe('GameStore', () => {
  const storage = { read: vi.fn(() => 17), write: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: RecordStorage, useValue: storage }] });
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
  });
});
