import { TileColor } from '@features/game/domain/game.models';
import { drawSymbol } from './game-board-symbol';

/** The candy colors and lighting are shared with the native iOS field. */
const PALETTE: Record<TileColor, { fill: string; highlight: string; depth: string }> = {
  coral: { fill: '#ff4936', highlight: '#ff8c78', depth: '#e92b23' },
  amber: { fill: '#f4c23b', highlight: '#ffdd7a', depth: '#eaa221' },
  cyan: { fill: '#2477ff', highlight: '#56c4ff', depth: '#163af3' },
  violet: { fill: '#ab20f5', highlight: '#d66aff', depth: '#7907db' },
  green: { fill: '#58c443', highlight: '#93e075', depth: '#329f2e' },
};

interface SpriteCache {
  readonly width: number;
  readonly height: number;
  readonly showSymbols: boolean;
  readonly sprites: Map<string, HTMLCanvasElement>;
}

const caches = new WeakMap<CanvasRenderingContext2D, SpriteCache>();

export function jellyGeometry(width: number, height: number) {
  const side = Math.min(width, height) * 0.95;
  const shadow = side * 0.045;
  return {
    x: width * 0.025,
    y: height * 0.025 - shadow / 2,
    width: width * 0.95,
    height: height * 0.95,
    radius: side * 0.24,
    side,
    shadow,
  };
}

/** Bake artwork and landing poses once; animation frames only blit pixel-aligned sprites. */
export function drawJelly(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: TileColor,
  scaleX = 1,
  scaleY = 1,
  showSymbols = true,
): void {
  const document = context.canvas?.ownerDocument;
  const padding = Math.ceil(Math.max(width, height) * 0.1) + 2;
  const surfaceWidth = context.canvas?.width ?? width;
  const surfaceHeight = context.canvas?.height ?? height;
  let cache = caches.get(context);
  if (
    !cache ||
    cache.width !== surfaceWidth ||
    cache.height !== surfaceHeight ||
    cache.showSymbols !== showSymbols
  ) {
    cache = { width: surfaceWidth, height: surfaceHeight, showSymbols, sprites: new Map() };
    caches.set(context, cache);
  }
  const key = `${width}:${height}:${color}:${scaleX}:${scaleY}`;
  let sprite = cache.sprites.get(key);
  if (!sprite && document) {
    sprite = document.createElement('canvas');
    sprite.width = width + padding * 2;
    sprite.height = height + padding * 2;
    const paint = sprite.getContext('2d');
    if (paint) {
      paint.translate(padding, padding);
      const body = jellyGeometry(width, height);
      paint.translate(width / 2, body.y + body.height);
      paint.scale(scaleX, scaleY);
      paint.translate(-width / 2, -body.y - body.height);
      drawArtwork(paint, width, height, color, showSymbols);
      cache.sprites.set(key, sprite);
    } else {
      sprite = undefined;
    }
  }
  if (sprite) {
    context.drawImage(sprite, -padding, -padding);
  } else {
    context.save();
    const body = jellyGeometry(width, height);
    context.translate(width / 2, body.y + body.height);
    context.scale(scaleX, scaleY);
    context.translate(-width / 2, -body.y - body.height);
    drawArtwork(context, width, height, color, showSymbols);
    context.restore();
  }
}

function drawArtwork(
  context: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  color: TileColor,
  showSymbols: boolean,
): void {
  const { x, y, width, height, radius, side, shadow } = jellyGeometry(cellWidth, cellHeight);
  const palette = PALETTE[color];
  context.beginPath();
  context.roundRect(x, y + shadow, width, height, radius);
  context.fillStyle = '#0000003d';
  context.fill();

  const face = context.createLinearGradient(x, y, x, y + height);
  face.addColorStop(0, palette.highlight);
  face.addColorStop(0.38, palette.fill);
  face.addColorStop(1, palette.depth);
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = face;
  context.fill();

  const edge = context.createLinearGradient(x, y, x + width, y + height);
  edge.addColorStop(0, '#ffffffe0');
  edge.addColorStop(0.5, '#ffffff2e');
  edge.addColorStop(1, '#0000001f');
  strokeInset(context, x, y, width, height, radius, 0, Math.max(0.8, side * 0.025), edge);

  const inner = context.createLinearGradient(x, y, x, y + height);
  inner.addColorStop(0, '#ffffff4d');
  inner.addColorStop(0.5, '#ffffff00');
  inner.addColorStop(1, '#ffffff1f');
  strokeInset(
    context,
    x,
    y,
    width,
    height,
    radius,
    side * 0.055,
    Math.max(0.6, side * 0.028),
    inner,
  );

  context.save();
  context.translate(x, y);
  context.scale(width, height);
  context.beginPath();
  context.moveTo(0.1, 0.28);
  context.quadraticCurveTo(0.1, 0.095, 0.27, 0.095);
  context.quadraticCurveTo(0.37, 0.07, 0.47, 0.09);
  context.quadraticCurveTo(0.44, 0.13, 0.31, 0.15);
  context.quadraticCurveTo(0.17, 0.15, 0.13, 0.29);
  context.closePath();
  const reflection = context.createLinearGradient(0.1, 0.09, 0.47, 0.29);
  reflection.addColorStop(0, '#fffffff2');
  reflection.addColorStop(1, '#ffffff33');
  context.fillStyle = reflection;
  context.fill();
  context.restore();

  if (showSymbols) {
    // A quiet shape cue keeps all five colors distinguishable without relying on hue alone.
    const symbolSize = side * 0.48;
    context.save();
    context.translate(x + (width - symbolSize) / 2, y + (height - symbolSize) / 2);
    context.scale(symbolSize / 24, symbolSize / 24);
    context.fillStyle = '#ffffffad';
    drawSymbol(context, color);
    context.strokeStyle = '#00000080';
    context.lineWidth = 1.25;
    context.stroke();
    context.restore();
  }
}

function strokeInset(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  inset: number,
  line: number,
  color: CanvasGradient,
): void {
  const offset = inset + line / 2;
  context.beginPath();
  context.roundRect(
    x + offset,
    y + offset,
    Math.max(0, width - offset * 2),
    Math.max(0, height - offset * 2),
    Math.max(0, radius - offset),
  );
  context.strokeStyle = color;
  context.lineWidth = line;
  context.stroke();
}
