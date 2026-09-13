export const GAME_CONFIG = { columns: 10, rows: 15, colors: 5, clearBonus: 1000 } as const;
export type TileColor = 'coral' | 'amber' | 'cyan' | 'violet' | 'green';
export const TILE_COLORS: readonly TileColor[] = ['coral', 'amber', 'cyan', 'violet', 'green'];
export interface Tile {
  readonly id: number;
  readonly color: TileColor;
}
/** Columns run left to right; each column runs bottom to top. No empty slots. */
export type Board = readonly (readonly Tile[])[];
export interface Position {
  readonly column: number;
  readonly row: number;
}
export interface GameState {
  readonly board: Board;
  readonly score: number;
  readonly moves: number;
}
export type GameStatus = 'playing' | 'won' | 'over';
export const TILE_LABELS: Record<TileColor, string> = {
  coral: 'Red circle',
  amber: 'Yellow diamond',
  cyan: 'Blue square',
  violet: 'Purple star',
  green: 'Green triangle',
};
