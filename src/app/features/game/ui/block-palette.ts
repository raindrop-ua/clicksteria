import { TileColor } from '@features/game/domain/game.models';

/** Shared tile colors; each style supplies its own surface treatment. */
export const BLOCK_PALETTE: Record<TileColor, { fill: string; highlight: string; depth: string }> =
  {
    coral: { fill: '#ff4936', highlight: '#ff8c78', depth: '#e92b23' },
    amber: { fill: '#f4c23b', highlight: '#ffdd7a', depth: '#eaa221' },
    cyan: { fill: '#2477ff', highlight: '#56c4ff', depth: '#163af3' },
    violet: { fill: '#ab20f5', highlight: '#d66aff', depth: '#7907db' },
    green: { fill: '#58c443', highlight: '#93e075', depth: '#329f2e' },
  };
