import { countTiles, getStatus, removeGroup } from './game.engine';
import { GAME_CONFIG, GameState, Position, Tile, TILE_COLORS, TileColor } from './game.models';

export interface GameSessionSnapshot {
  readonly version: 1;
  readonly current: GameState;
  readonly history: readonly GameState[];
}

const MAX_TILES = GAME_CONFIG.columns * GAME_CONFIG.rows;
const MAX_MOVES = Math.floor(MAX_TILES / 2);

/** Restore only complete sessions whose entire Undo history follows the game rules. */
export function decodeGameSession(value: unknown): GameSessionSnapshot | null {
  if (!isRecord(value) || value['version'] !== 1) return null;
  const savedHistory: unknown = value['history'];
  if (!Array.isArray(savedHistory) || savedHistory.length > MAX_MOVES) return null;
  const current = decodeState(value['current']);
  if (!current || current.moves !== savedHistory.length) return null;

  const history: GameState[] = [];
  for (let index = 0; index < savedHistory.length; index++) {
    const state = decodeState(savedHistory[index]);
    if (!state || state.moves !== index) return null;
    history.push(state);
  }

  const initial = history[0] ?? current;
  if (
    initial.score !== 0 ||
    initial.moves !== 0 ||
    countTiles(initial.board) !== MAX_TILES ||
    getStatus(initial.board) !== 'playing'
  ) {
    return null;
  }

  for (let index = 0; index < history.length; index++) {
    const previous = history[index];
    const next = history[index + 1] ?? current;
    const removed = removedPosition(previous, next);
    if (!removed || !sameState(removeGroup(previous, removed), next)) return null;
  }
  return { version: 1, current, history };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isTileColor(value: unknown): value is TileColor {
  return typeof value === 'string' && TILE_COLORS.some((color) => color === value);
}

function decodeState(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  const score = value['score'];
  const moves = value['moves'];
  const savedBoard: unknown = value['board'];
  if (
    !isNonnegativeInteger(score) ||
    !isNonnegativeInteger(moves) ||
    moves > MAX_MOVES ||
    !Array.isArray(savedBoard) ||
    savedBoard.length > GAME_CONFIG.columns
  ) {
    return null;
  }

  const ids = new Set<number>();
  const board: Tile[][] = [];
  for (const savedColumn of savedBoard) {
    if (
      !Array.isArray(savedColumn) ||
      savedColumn.length === 0 ||
      savedColumn.length > GAME_CONFIG.rows
    ) {
      return null;
    }
    const column: Tile[] = [];
    for (const savedTile of savedColumn) {
      if (!isRecord(savedTile)) return null;
      const id = savedTile['id'];
      const color = savedTile['color'];
      if (!isNonnegativeInteger(id) || id >= MAX_TILES || ids.has(id) || !isTileColor(color)) {
        return null;
      }
      ids.add(id);
      column.push({ id, color });
    }
    board.push(column);
  }
  return { board, score, moves };
}

function removedPosition(previous: GameState, next: GameState): Position | null {
  const survivors = new Set(next.board.flatMap((column) => column.map((tile) => tile.id)));
  for (let column = 0; column < previous.board.length; column++) {
    for (let row = 0; row < previous.board[column].length; row++) {
      if (!survivors.has(previous.board[column][row].id)) return { column, row };
    }
  }
  return null;
}

function sameState(expected: GameState, actual: GameState): boolean {
  return (
    expected.score === actual.score &&
    expected.moves === actual.moves &&
    expected.board.length === actual.board.length &&
    expected.board.every(
      (column, x) =>
        column.length === actual.board[x].length &&
        column.every(
          (tile, y) => tile.id === actual.board[x][y].id && tile.color === actual.board[x][y].color,
        ),
    )
  );
}
