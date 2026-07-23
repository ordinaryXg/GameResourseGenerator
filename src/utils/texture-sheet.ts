import * as THREE from 'three';
import type { TextureAnimationConfig } from '@/types/effect';
import { sampleCurveConfig } from '@/utils/curve-utils';

/** Cocos `TextureAnimationModule.animation`: 0 = whole sheet, 1 = single row. */
export function resolveTextureSheetFrameIndex(
  config: TextureAnimationConfig,
  life01: number
): number {
  if (!config.enabled || config.numTilesX < 1 || config.numTilesY < 1) return 0;

  const curveValue = sampleCurveConfig(config.frameOverTime, life01);
  const normalized = Math.min(1, Math.max(0, curveValue));
  const start = config.startFrame ?? 0;

  if (config.animation === 1) {
    const col = Math.min(config.numTilesX - 1, Math.floor(normalized * config.numTilesX));
    const row = Math.min(config.numTilesY - 1, Math.max(0, config.rowIndex ?? 0));
    return start + row * config.numTilesX + col;
  }

  const total = config.numTilesX * config.numTilesY;
  const idx = Math.min(total - 1, Math.floor(normalized * total));
  return start + idx;
}

export function frameIndexToGrid(
  frameIndex: number,
  numTilesX: number,
  numTilesY: number
): { col: number; row: number } {
  const total = numTilesX * numTilesY;
  const wrapped = ((frameIndex % total) + total) % total;
  return {
    col: wrapped % numTilesX,
    row: Math.floor(wrapped / numTilesX)
  };
}

/** Apply sprite-sheet UV on a texture (Cocos top-left tile origin → Three.js bottom-left). */
export function applyTextureSheetFrame(
  texture: THREE.Texture,
  frameIndex: number,
  numTilesX: number,
  numTilesY: number
): void {
  const { col, row } = frameIndexToGrid(frameIndex, numTilesX, numTilesY);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / numTilesX, 1 / numTilesY);
  texture.offset.set(col / numTilesX, (numTilesY - 1 - row) / numTilesY);
  texture.needsUpdate = true;
}

export function cloneTextureForSheet(base: THREE.Texture): THREE.Texture {
  const tex = base.clone();
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function usesTextureSheet(config: TextureAnimationConfig): boolean {
  return config.enabled && (config.numTilesX > 1 || config.numTilesY > 1);
}

export function updateParticleTextureSheet(
  texture: THREE.Texture,
  config: TextureAnimationConfig,
  life01: number
): void {
  if (!usesTextureSheet(config)) return;
  const frame = resolveTextureSheetFrameIndex(config, life01);
  applyTextureSheetFrame(texture, frame, config.numTilesX, config.numTilesY);
}
