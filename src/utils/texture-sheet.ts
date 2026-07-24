import * as THREE from 'three';
import type { TextureAnimationConfig } from '@/types/effect';
import { sampleCurveConfig } from '@/utils/curve-utils';
import { normalizeTextureAnimation, sampleRangeValue } from '@/utils/particle-size';
import { configureParticleTexture } from '@/utils/texture-loader';

export interface TextureSheetFrameContext {
  startFrameOffset: number;
  sheetRow: number;
}

/** Sample per-particle sheet context once at spawn. */
export function sampleTextureSheetContext(config: TextureAnimationConfig): TextureSheetFrameContext {
  const ta = normalizeTextureAnimation(config);
  const startFrameOffset = Math.floor(sampleRangeValue(ta.startFrame));
  const sheetRow = ta.animation === 1 && ta.randomRow
    ? Math.floor(Math.random() * Math.max(1, ta.numTilesY))
    : ta.rowIndex;
  return { startFrameOffset, sheetRow };
}

/** Cocos `TextureAnimationModule.animation`: 0 = whole sheet, 1 = single row. */
export function resolveTextureSheetFrameIndex(
  config: TextureAnimationConfig,
  life01: number,
  context?: TextureSheetFrameContext
): number {
  const ta = normalizeTextureAnimation(config);
  if (!ta.enabled || ta.numTilesX < 1 || ta.numTilesY < 1) return 0;

  const cycleCount = Math.max(1, ta.cycleCount);
  const curveValue = sampleCurveConfig(ta.frameOverTime, life01);
  const progress = Math.min(1, curveValue * cycleCount);
  const start = context?.startFrameOffset ?? Math.floor(sampleRangeValue(ta.startFrame));

  if (ta.animation === 1) {
    const col = Math.min(ta.numTilesX - 1, Math.floor(progress * ta.numTilesX));
    const row = Math.min(
      ta.numTilesY - 1,
      Math.max(0, context?.sheetRow ?? ta.rowIndex ?? 0)
    );
    return start + row * ta.numTilesX + col;
  }

  const total = ta.numTilesX * ta.numTilesY;
  const idx = Math.min(total - 1, Math.floor(progress * total));
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
  numTilesY: number,
  flipU = false,
  flipV = false
): void {
  const { col, row } = frameIndexToGrid(frameIndex, numTilesX, numTilesY);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  let repeatX = 1 / numTilesX;
  let repeatY = 1 / numTilesY;
  let offsetX = col / numTilesX;
  let offsetY = (numTilesY - 1 - row) / numTilesY;

  if (flipU) {
    repeatX = -repeatX;
    offsetX += 1 / numTilesX;
  }
  if (flipV) {
    repeatY = -repeatY;
    offsetY += 1 / numTilesY;
  }

  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
}

export function cloneTextureForSheet(base: THREE.Texture): THREE.Texture {
  const tex = base.clone();
  configureParticleTexture(tex);
  return tex;
}

export function usesTextureSheet(config: TextureAnimationConfig): boolean {
  const ta = normalizeTextureAnimation(config);
  return ta.enabled && (ta.numTilesX > 1 || ta.numTilesY > 1);
}

export function updateParticleTextureSheet(
  texture: THREE.Texture,
  config: TextureAnimationConfig,
  life01: number,
  context?: TextureSheetFrameContext
): void {
  const ta = normalizeTextureAnimation(config);
  if (!usesTextureSheet(ta)) return;
  const frame = resolveTextureSheetFrameIndex(ta, life01, context);
  applyTextureSheetFrame(
    texture,
    frame,
    ta.numTilesX,
    ta.numTilesY,
    ta.flipU,
    ta.flipV
  );
}
