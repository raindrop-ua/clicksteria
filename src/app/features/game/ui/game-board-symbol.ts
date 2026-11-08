import { TileColor } from '@features/game/domain/game.models';

export function drawSymbol(context: CanvasRenderingContext2D, color: TileColor): void {
  context.beginPath();
  switch (color) {
    case 'coral':
      context.arc(12, 12, 6, 0, Math.PI * 2);
      break;
    case 'amber':
      context.moveTo(12, 4);
      context.lineTo(20, 12);
      context.lineTo(12, 20);
      context.lineTo(4, 12);
      context.closePath();
      break;
    case 'cyan':
      context.roundRect(6, 6, 12, 12, 1.5);
      break;
    case 'violet':
      context.moveTo(12, 3);
      context.lineTo(14.8, 8.7);
      context.lineTo(21, 9.6);
      context.lineTo(16.5, 14);
      context.lineTo(17.6, 20.2);
      context.lineTo(12, 17.2);
      context.lineTo(6.4, 20.2);
      context.lineTo(7.5, 14);
      context.lineTo(3, 9.6);
      context.lineTo(9.2, 8.7);
      context.closePath();
      break;
    case 'green':
      context.moveTo(12, 4);
      context.lineTo(20, 19);
      context.lineTo(4, 19);
      context.closePath();
      break;
  }
  context.fillStyle = '#ffffffad';
  context.fill();
  context.strokeStyle = '#00000080';
  context.lineWidth = 1.25;
  context.stroke();
}
