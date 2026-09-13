import { Board, GameState, TileColor } from './game.models';
import {
  countTiles,
  createBoard,
  findGroup,
  findLargestGroup,
  getStatus,
  groupScore,
  removeGroup,
} from './game.engine';
function board(columns: TileColor[][]): Board {
  let id = 0;
  return columns.map((column) => column.map((color) => ({ id: id++, color })));
}
function state(value: Board): GameState {
  return { board: value, score: 0, moves: 0 };
}

describe('Clickomania engine', () => {
  it('creates 150 unique tiles with five valid colors and a playable opening', () => {
    const value = createBoard();
    expect(value).toHaveLength(10);
    expect(value.every((column) => column.length === 15)).toBe(true);
    expect(new Set(value.flat().map((tile) => tile.id)).size).toBe(150);
    expect(getStatus(value)).toBe('playing');
  });
  it('follows connected sides, including branching groups, but never diagonals', () => {
    const value = board([
      ['coral', 'coral', 'cyan'],
      ['coral', 'cyan', 'coral'],
      ['coral', 'green', 'green'],
    ]);
    expect(findGroup(value, { column: 0, row: 0 })).toHaveLength(4);
    expect(findGroup(value, { column: 1, row: 2 })).toHaveLength(1);
    expect(findGroup(value, { column: -1, row: 0 })).toEqual([]);
  });
  it('ignores single tiles without changing the state reference', () => {
    const previous = state(board([['coral', 'cyan']]));
    expect(removeGroup(previous, { column: 0, row: 0 })).toBe(previous);
  });
  it('applies gravity, shifts empty columns left, and preserves surviving tile IDs', () => {
    const previous = state(board([['coral', 'coral'], ['cyan', 'coral', 'green'], ['amber']]));
    const original = JSON.stringify(previous);
    const next = removeGroup(previous, { column: 0, row: 0 });
    expect(next.board.map((column) => column.map((tile) => tile.color))).toEqual([
      ['cyan', 'green'],
      ['amber'],
    ]);
    expect(next.board[0].map((tile) => tile.id)).toEqual([2, 4]);
    expect(next.score).toBe(6);
    expect(next.moves).toBe(1);
    expect(JSON.stringify(previous)).toBe(original);
  });
  it('awards the clear bonus once and recognizes a win', () => {
    const next = removeGroup(state(board([['violet', 'violet']])), { column: 0, row: 0 });
    expect(next.score).toBe(1002);
    expect(countTiles(next.board)).toBe(0);
    expect(getStatus(next.board)).toBe('won');
    expect(removeGroup(next, { column: 0, row: 0 })).toBe(next);
  });
  it('recognizes a blocked board and finds the largest available group', () => {
    expect(
      getStatus(
        board([
          ['coral', 'cyan'],
          ['cyan', 'coral'],
        ]),
      ),
    ).toBe('over');
    expect(
      findLargestGroup(
        board([
          ['coral', 'coral'],
          ['green', 'green', 'green'],
        ]),
      ),
    ).toHaveLength(3);
    expect(groupScore(1)).toBe(0);
    expect(groupScore(10)).toBe(90);
  });
  it('finishes complete seeded games without invalid coordinates or negative counts', () => {
    for (let seed = 1; seed <= 12; seed++) {
      let value = seed;
      let current = state(
        createBoard(() => {
          value = (value * 1664525 + 1013904223) >>> 0;
          return value / 2 ** 32;
        }),
      );
      let removed = 0;
      while (getStatus(current.board) === 'playing') {
        const next = removeGroup(current, findLargestGroup(current.board)[0]);
        expect(countTiles(next.board)).toBeLessThan(countTiles(current.board));
        expect(next.score).toBeGreaterThan(current.score);
        removed += countTiles(current.board) - countTiles(next.board);
        current = next;
      }
      expect(countTiles(current.board) + removed).toBe(150);
    }
  });
});
