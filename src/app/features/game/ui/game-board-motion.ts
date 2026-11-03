import { GAME_CONFIG } from '@features/game/domain/game.models';
import { RenderTile } from './game-board-renderer';

export const JELLY_REMOVAL_DURATION = 340;
const LANDING_DURATION = 140;
const CASCADE_DELAY = 25;
const LATERAL_DURATION = 190;

// These small, pre-defined poses mirror the native board: stretch in the air,
// compress on impact, then release into a short, damped wobble.
const JELLY_POSES = [
  [1, 1],
  [1.04, 0.94],
  [1.035, 0.95],
  [1.018, 0.975],
  [0.985, 1.035],
  [0.99, 1.024],
  [1.013, 0.984],
  [1.006, 0.992],
  [0.997, 1.006],
  [0.985, 1.025],
] as const;

export function jellyDuration(from: RenderTile, to: RenderTile): number {
  const droppedRows = Math.max(0, from.row - to.row);
  const vertical = droppedRows ? CASCADE_DELAY + fallDuration(droppedRows) + LANDING_DURATION : 0;
  return Math.max(vertical, from.column !== to.column ? LATERAL_DURATION : 0);
}

export function sampleJellyTile(from: RenderTile, to: RenderTile, elapsed: number): RenderTile {
  const time = Math.max(0, elapsed);
  if (time >= jellyDuration(from, to)) return to;
  const xTime = Math.min(1, time / LATERAL_DURATION);
  const xProgress = from.column === to.column ? 1 : 1 - (1 - xTime) ** 3;
  let yProgress = 1;
  let poseIndex = 0;
  const droppedRows = Math.max(0, from.row - to.row);
  if (droppedRows) {
    const fallingTime = time - CASCADE_DELAY;
    const duration = fallDuration(droppedRows);
    if (fallingTime < 0) {
      yProgress = 0;
    } else if (fallingTime < duration) {
      yProgress = (fallingTime / duration) ** 2;
      poseIndex = 9;
    } else {
      const landingProgress = Math.min(1, (fallingTime - duration) / LANDING_DURATION);
      poseIndex = Math.min(8, Math.floor(landingProgress * 8) + 1);
    }
  }
  const [scaleX, scaleY] = JELLY_POSES[poseIndex];
  return {
    ...to,
    column: from.column + (to.column - from.column) * xProgress,
    row: from.row + (to.row - from.row) * yProgress,
    scaleX,
    scaleY,
  };
}

export function sampleDepartingTile(tile: RenderTile, elapsed: number): RenderTile {
  const progress = Math.min(1, Math.max(0, elapsed / JELLY_REMOVAL_DURATION));
  const row = tile.row - (GAME_CONFIG.rows + 2) * progress * progress;
  return { ...tile, row, scaleX: 1, scaleY: 1, opacity: Math.min(1, Math.max(0, row + 1)) };
}

function fallDuration(droppedRows: number): number {
  return Math.min(290, Math.max(150, 115 + 45 * Math.sqrt(droppedRows)));
}
