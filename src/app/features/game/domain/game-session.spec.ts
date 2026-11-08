import { countTiles, createBoard, findLargestGroup, getStatus, removeGroup } from './game.engine';
import { GameState, TILE_COLORS } from './game.models';
import { decodeGameSession, GameSessionSnapshot } from './game-session';

interface SavedState {
  board: { id: number; color: string }[][];
  score: number;
  moves: number;
}
interface SavedSession {
  version: number;
  current: SavedState;
  history: SavedState[];
}

function session(states: readonly GameState[]): GameSessionSnapshot {
  return { version: 1, current: states.at(-1)!, history: states.slice(0, -1) };
}

function wire(value: unknown): SavedSession {
  return JSON.parse(JSON.stringify(value)) as SavedSession;
}

function opening(): GameState {
  return { board: createBoard(() => 0), score: 0, moves: 0 };
}

function activeStates(): readonly GameState[] {
  let random = 17;
  let current: GameState = {
    board: createBoard(() => {
      random = (random * 1664525 + 1013904223) >>> 0;
      return random / 2 ** 32;
    }),
    score: 0,
    moves: 0,
  };
  const states = [current];
  for (let move = 0; move < 4; move++) {
    current = removeGroup(current, findLargestGroup(current.board)[0]);
    states.push(current);
  }
  return states;
}

describe('Saved game session decoder', () => {
  it('round-trips a new game and an active game with the complete Undo history', () => {
    const fresh = session([opening()]);
    expect(decodeGameSession(wire(fresh))).toEqual(fresh);
    const saved = session(activeStates());
    expect(getStatus(saved.current.board)).toBe('playing');
    const restored = decodeGameSession(wire(saved))!;
    expect(restored).toEqual(saved);
    expect(restored.history.at(-1)).toEqual(saved.history.at(-1));
  });

  it('restores the remaining history after an Undo, without retaining the abandoned move', () => {
    const states = activeStates();
    const afterUndo = session(states.slice(0, -1));
    const restored = decodeGameSession(wire(afterUndo))!;
    expect(restored.current).toEqual(states.at(-2));
    expect(restored.current.moves).toBe(3);
    expect(restored.history).toEqual(states.slice(0, -2));
    expect(restored.history.at(-1)).toEqual(states.at(-3));
  });

  it('restores a cleared board and its exact one-time clear bonus', () => {
    const initial = opening();
    const saved = session([initial, removeGroup(initial, { column: 0, row: 0 })]);
    const restored = decodeGameSession(wire(saved))!;
    expect(restored).toEqual(saved);
    expect(restored.current.board).toEqual([]);
    expect(restored.current.score).toBe(150 * 149 + 1000);
    expect(getStatus(restored.current.board)).toBe('won');
  });

  it('accepts a complete 75-move game with every Undo state at the history limit', () => {
    let current: GameState = {
      board: Array.from({ length: 10 }, (_, column) =>
        Array.from({ length: 15 }, (_, row) => ({
          id: column * 15 + row,
          color: TILE_COLORS[(Math.floor(column / 2) + row) % TILE_COLORS.length],
        })),
      ),
      score: 0,
      moves: 0,
    };
    const states = [current];
    for (let move = 0; move < 75; move++) {
      const previousCount = countTiles(current.board);
      current = removeGroup(current, { column: 0, row: current.board[0].length - 1 });
      expect(previousCount - countTiles(current.board)).toBe(2);
      states.push(current);
    }
    expect(current).toMatchObject({ board: [], moves: 75, score: 1150 });
    expect(getStatus(current.board)).toBe('won');
    const saved = session(states);
    const restored = decodeGameSession(saved);
    expect(restored).toEqual(saved);
    expect(restored?.history).toHaveLength(75);
  });

  it('restores a no-moves board without rejecting its isolated surviving block', () => {
    const initial: GameState = {
      ...opening(),
      board: createBoard(() => 0).map((column, x) =>
        column.map((tile, y) => (x === 9 && y === 14 ? { ...tile, color: 'cyan' } : tile)),
      ),
    };
    const saved = session([initial, removeGroup(initial, { column: 0, row: 0 })]);
    const restored = decodeGameSession(wire(saved))!;
    expect(restored).toEqual(saved);
    expect(restored.current.board).toEqual([[{ id: 149, color: 'cyan' }]]);
    expect(getStatus(restored.current.board)).toBe('over');
  });

  it('copies every state, column and tile so later input changes cannot alter the restored game', () => {
    const input = wire(session(activeStates()));
    const expected = wire(input);
    const restored = decodeGameSession(input)!;
    expect(restored.current).not.toBe(input.current);
    expect(restored.current.board[0]).not.toBe(input.current.board[0]);
    expect(restored.current.board[0][0]).not.toBe(input.current.board[0][0]);
    expect(restored.history[0]).not.toBe(input.history[0]);
    input.current.board[0][0].color = 'invalid';
    input.history[0].board[0][0].id = -1;
    input.history.pop();
    expect(restored).toEqual(expected);
  });

  it.each([null, undefined, [], {}, 1, 'session', { version: 2 }, { version: 1 }])(
    'rejects malformed or unsupported envelopes: %j',
    (input) => expect(decodeGameSession(input)).toBeNull(),
  );

  it('rejects oversized board, column and history arrays before accepting a session', () => {
    const valid = wire(session([opening()]));
    const largeBoard = { ...valid, current: { ...valid.current, board: Array(11).fill([]) } };
    const largeColumn = {
      ...valid,
      current: { ...valid.current, board: [Array(16).fill({ id: 0, color: 'coral' })] },
    };
    const largeHistory = { ...valid, history: Array(76).fill(valid.current) };
    for (const input of [largeBoard, largeColumn, largeHistory]) {
      expect(decodeGameSession(input)).toBeNull();
    }
  });

  it('rejects missing columns, empty internal columns, sparse arrays and invalid tile objects', () => {
    const valid = wire(session([opening()]));
    for (const board of [null, {}, [], [[]], Array(10), [Array(15)], [[null]], [[{}]]]) {
      expect(decodeGameSession({ ...valid, current: { ...valid.current, board } })).toBeNull();
    }
    const shortened = wire(session([opening()]));
    shortened.current.board[0].pop();
    expect(decodeGameSession(shortened)).toBeNull();
  });

  it.each([-1, 0.5, 150, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid tile ID %s',
    (id) => {
      const saved = wire(session([opening()]));
      saved.current.board[0][0].id = id;
      expect(decodeGameSession(saved)).toBeNull();
    },
  );

  it('rejects duplicate IDs, unknown colors and a full initial board with no possible move', () => {
    const duplicate = wire(session([opening()]));
    duplicate.current.board[0][0].id = duplicate.current.board[0][1].id;
    expect(decodeGameSession(duplicate)).toBeNull();
    const invalidColor = wire(session([opening()]));
    invalidColor.current.board[0][0].color = 'blue';
    expect(decodeGameSession(invalidColor)).toBeNull();
    const blocked = wire(session([opening()]));
    blocked.current.board.forEach((column, x) => {
      column.forEach((tile, y) => (tile.color = TILE_COLORS[(x + y) % TILE_COLORS.length]));
    });
    expect(getStatus(blocked.current.board as GameState['board'])).toBe('over');
    expect(decodeGameSession(blocked)).toBeNull();
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid scores and move counters: %s',
    (value) => {
      const saved = wire(session(activeStates()));
      expect(
        decodeGameSession({ ...saved, current: { ...saved.current, score: value } }),
      ).toBeNull();
      expect(
        decodeGameSession({ ...saved, current: { ...saved.current, moves: value } }),
      ).toBeNull();
    },
  );

  it('requires a complete chronological history matching the move counter', () => {
    const saved = wire(session(activeStates()));
    expect(decodeGameSession({ ...saved, history: saved.history.slice(1) })).toBeNull();
    expect(decodeGameSession({ ...saved, history: [...saved.history].reverse() })).toBeNull();
    expect(decodeGameSession({ ...saved, current: { ...saved.current, moves: 0 } })).toBeNull();
    const alteredHistory = wire(session(activeStates()));
    alteredHistory.history[1].score++;
    expect(decodeGameSession(alteredHistory)).toBeNull();
  });

  it('rejects partial removal of a connected group even when the dimensions and score look valid', () => {
    const initial = opening();
    const invalid: GameState = {
      board: initial.board.map((column, x) => (x === 0 ? column.slice(2) : column)),
      score: 2,
      moves: 1,
    };
    expect(decodeGameSession(session([initial, invalid]))).toBeNull();
  });

  it('rejects forged scores, changed survivor colors and rearranged survivor IDs', () => {
    const saved = wire(session(activeStates()));
    const changedScore = wire(saved);
    changedScore.current.score++;
    expect(decodeGameSession(changedScore)).toBeNull();
    const changedColor = wire(saved);
    const tile = changedColor.current.board[0][0];
    tile.color = tile.color === 'coral' ? 'cyan' : 'coral';
    expect(decodeGameSession(changedColor)).toBeNull();
    const rearranged = wire(saved);
    const first = rearranged.current.board[0][0];
    rearranged.current.board[0][0] = rearranged.current.board[0][1];
    rearranged.current.board[0][1] = first;
    expect(decodeGameSession(rearranged)).toBeNull();
  });

  it('rejects missing or duplicated clear bonuses and attempts to play after a win', () => {
    const initial = opening();
    const won = removeGroup(initial, { column: 0, row: 0 });
    for (const adjustment of [-1000, 1000]) {
      expect(
        decodeGameSession(session([initial, { ...won, score: won.score + adjustment }])),
      ).toBeNull();
    }
    expect(decodeGameSession(session([initial, won, { ...won, moves: 2 }]))).toBeNull();
  });
});
