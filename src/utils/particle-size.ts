import type { Particle3DConfig, RangeValue, TextureAnimationConfig } from '@/types/effect';
import type { Transform3D } from '@/types/project';
import { sampleCurveConfig } from '@/utils/curve-utils';
import { getDefaultParticle3DConfig } from '@/utils/effect-defaults';

export function coerceRangeValue(raw: unknown, fallback = 0): RangeValue {
  if (raw == null) return { mode: 'constant', constant: fallback };
  if (typeof raw === 'number') return { mode: 'constant', constant: raw };
  if (typeof raw === 'object' && 'mode' in raw) {
    return raw as RangeValue;
  }
  return { mode: 'constant', constant: fallback };
}

export function sampleRangeValue(range: RangeValue | unknown): number {
  const r = coerceRangeValue(range);
  if (r.mode === 'constant') return r.constant ?? 0;
  const min = r.min ?? 0;
  const max = r.max ?? 1;
  return min + Math.random() * (max - min);
}

/** Merge partial / legacy texture-animation data with defaults. */
export function normalizeTextureAnimation(
  raw: Partial<TextureAnimationConfig> | undefined
): TextureAnimationConfig {
  const defaults = getDefaultParticle3DConfig().textureAnimation;
  const ta = raw ?? {};
  return {
    ...defaults,
    ...ta,
    startFrame: coerceRangeValue(ta.startFrame, defaults.startFrame.constant ?? 0),
    frameOverTime: ta.frameOverTime?.keys?.length
      ? ta.frameOverTime
      : defaults.frameOverTime,
    cycleCount: Math.max(1, ta.cycleCount ?? defaults.cycleCount),
    numTilesX: Math.max(1, ta.numTilesX ?? defaults.numTilesX),
    numTilesY: Math.max(1, ta.numTilesY ?? defaults.numTilesY),
    rowIndex: Math.max(0, ta.rowIndex ?? defaults.rowIndex)
  };
}

/** Initial billboard size sampled once at spawn (Cocos startSize3D.x). */
export function sampleStartParticleSize(config: Particle3DConfig): number {
  return sampleRangeValue(config.mainModule.startSize3D.x);
}

export function transformParticleScaleFactor(transform: Transform3D): number {
  const [sx, sy, sz] = transform.scale;
  return Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz), 0.0001);
}

/** World-space particle scale at normalized lifetime. */
export function computeParticleScale(
  config: Particle3DConfig,
  startSize: number,
  life01: number,
  transform?: Transform3D
): number {
  let size = startSize;
  if (config.sizeOverLifetime.enabled) {
    size *= sampleCurveConfig(config.sizeOverLifetime.size, life01);
  }
  const factor = transform ? transformParticleScaleFactor(transform) : 1;
  return Math.max(0, size * factor);
}
