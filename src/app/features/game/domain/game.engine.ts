import { Board, GAME_CONFIG, GameState, GameStatus, Position, TILE_COLORS } from './game.models';

export function createBoard(random: () => number = Math.random): Board {
  const board = Array.from({ length: GAME_CONFIG.columns }, (_, column) =>
    Array.from({ length: GAME_CONFIG.rows }, (_, row) => ({
      id: column * GAME_CONFIG.rows + row,
      color:
        TILE_COLORS[
          Math.min(TILE_COLORS.length - 1, Math.max(0, Math.floor(random() * TILE_COLORS.length)))
        ],
    })),
  );
  // Even an unlucky random source must produce a playable opening.
  if (getStatus(board) !== 'playing') board[0][1] = { ...board[0][1], color: board[0][0].color };
  return board;
}

export function findGroup(board: Board, position: Position): readonly Position[] {
  const color = board[position.column]?.[position.row]?.color;
  if (!color) return [];
  const visited = new Set<string>();
  const pending = [position];
  const group: Position[] = [];
  while (pending.length) {
    const current = pending.pop()!;
    const key = `${current.column}:${current.row}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (board[current.column]?.[current.row]?.color !== color) continue;
    group.push(current);
    pending.push(
      { column: current.column - 1, row: current.row },
      { column: current.column + 1, row: current.row },
      { column: current.column, row: current.row - 1 },
      { column: current.column, row: current.row + 1 },
    );
  }
  return group;
}

export function groupScore(size: number): number {
  return size < 2 ? 0 : size * (size - 1);
}

export function countTiles(board: Board): number {
  return board.reduce((total, column) => total + column.length, 0);
}

export function findLargestGroup(board: Board): readonly Position[] {
  const visited = new Set<number>();
  let largest: readonly Position[] = [];
  board.forEach((column, x) =>
    column.forEach((tile, y) => {
      if (visited.has(tile.id)) return;
      const group = findGroup(board, { column: x, row: y });
      group.forEach((position) => visited.add(board[position.column][position.row].id));
      if (group.length > 1 && group.length > largest.length) largest = group;
    }),
  );
  return largest;
}

export function getStatus(board: Board): GameStatus {
  if (!countTiles(board)) return 'won';
  return findLargestGroup(board).length ? 'playing' : 'over';
}

export function removeGroup(state: GameState, position: Position): GameState {
  const group = findGroup(state.board, position);
  if (group.length < 2) return state;
  const removed = new Set(group.map((item) => state.board[item.column][item.row].id));
  // Filtering applies gravity; removing empty columns shifts everything left.
  const board = state.board
    .map((column) => column.filter((tile) => !removed.has(tile.id)))
    .filter((column) => column.length > 0);
  return {
    board,
    score:
      state.score + groupScore(group.length) + (board.length === 0 ? GAME_CONFIG.clearBonus : 0),
    moves: state.moves + 1,
  };
}
