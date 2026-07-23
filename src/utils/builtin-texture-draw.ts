import type { BuiltinTextureShape } from '@/data/builtin-assets';
import { generateDefaultParticlePngBase64 } from '@/utils/default-particle-texture';

export function drawBuiltinTexture(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: BuiltinTextureShape
) {
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);

  switch (shape) {
    case 'circle': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'soft': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half * 0.95);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'star':
      drawStar(ctx, half, half, half * 0.85, 5);
      break;
    case 'spark':
      drawSpark(ctx, half, half, half * 0.9);
      break;
    case 'smoke': {
      const g = ctx.createRadialGradient(half, half, half * 0.1, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'glow': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'ring': {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = size * 0.12;
      ctx.beginPath();
      ctx.arc(half, half, half * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      const g = ctx.createRadialGradient(half, half, half * 0.35, half, half, half * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'square': {
      const pad = size * 0.22;
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);
      break;
    }
    case 'cross':
      drawCross(ctx, half, half, half * 0.75, size * 0.14);
      break;
    case 'flare':
      drawFlare(ctx, half, half, half);
      break;
    default:
      drawBuiltinTexture(ctx, size, 'circle');
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, points: number) {
  const inner = radius * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = g;
  ctx.fill();
}

function drawSpark(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const inner = len * 0.15;
    const outer = len * (i % 2 === 0 ? 1 : 0.55);
    ctx.lineWidth = i % 2 === 0 ? len * 0.08 : len * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, len: number, width: number
) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - width / 2, cy - len, width, len * 2);
  ctx.fillRect(cx - len, cy - width / 2, len * 2, width);
}

function drawFlare(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = radius * 0.04;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius * 0.95, cy + Math.sin(a) * radius * 0.95);
    ctx.stroke();
  }
}

export function createBuiltinTextureDataUrl(shape: BuiltinTextureShape, size = 64): string {
  if (typeof document === 'undefined') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawBuiltinTexture(ctx, size, shape);
  return canvas.toDataURL('image/png');
}

/** PNG base64 for export (Node/Vitest falls back to default circle). */
export function generateBuiltinTexturePngBase64(shape: BuiltinTextureShape, size = 64): string {
  if (typeof document === 'undefined') {
    return generateDefaultParticlePngBase64(size);
  }
  return createBuiltinTextureDataUrl(shape, size).split(',')[1];
}
