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

export interface ParticleScaleContext {
  /** Emitter world transform (preview tree). */
  worldTransform?: Transform3D;
  /** Emitter local transform (without parent chain). */
  localTransform?: Transform3D;
}

function absScale(transform: Transform3D): [number, number, number] {
  const [sx, sy, sz] = transform.scale;
  return [Math.abs(sx), Math.abs(sy), Math.abs(sz)];
}

/** Match Cocos renderer `updateScale`: local uses node scale, world uses world scale. */
export function resolveEmitterScaleVector(
  config: Particle3DConfig,
  context?: ParticleScaleContext
): [number, number, number] {
  const scaleSpace = config.mainModule.scaleSpace ?? 'local';
  const source = scaleSpace === 'local'
    ? (context?.localTransform ?? context?.worldTransform)
    : context?.worldTransform;
  if (!source) return [1, 1, 1];
  return absScale(source);
}

/** Sample per-axis start size like Cocos `apply startSize` on spawn. */
export function sampleStartParticleSize3D(config: Particle3DConfig): [number, number, number] {
  const main = config.mainModule;
  const startX = sampleRangeValue(main.startSize3D.x);
  if (main.useStartSize3D) {
    return [
      startX,
      sampleRangeValue(main.startSize3D.y),
      sampleRangeValue(main.startSize3D.z)
    ];
  }
  return [startX, startX, 1];
}

/** Initial billboard size sampled once at spawn (uniform X when startSize3D is off). */
export function sampleStartParticleSize(config: Particle3DConfig): number {
  return sampleStartParticleSize3D(config)[0];
}

function sizeOverLifetimeMultiplier(config: Particle3DConfig, life01: number): number {
  if (!config.sizeOverLifetime.enabled) return 1;
  return sampleCurveConfig(config.sizeOverLifetime.size, life01);
}

function applyScaleSpace(
  size: [number, number, number],
  emitterScale: [number, number, number]
): [number, number, number] {
  return [
    size[0] * emitterScale[0],
    size[1] * emitterScale[1],
    size[2] * emitterScale[2]
  ];
}

/** World-space particle scale vector at normalized lifetime (Cocos size × nodeScale). */
export function computeParticleScale3D(
  config: Particle3DConfig,
  startSize3D: [number, number, number],
  life01: number,
  context?: ParticleScaleContext
): [number, number, number] {
  const mult = sizeOverLifetimeMultiplier(config, life01);
  const scaled: [number, number, number] = [
    Math.max(0, startSize3D[0] * mult),
    Math.max(0, startSize3D[1] * mult),
    Math.max(0, startSize3D[2] * mult)
  ];
  const emitterScale = resolveEmitterScaleVector(config, context);
  return applyScaleSpace(scaled, emitterScale);
}

/** Uniform scale for sprites / legacy call sites. Uses max axis of resolved size vector. */
export function computeParticleScale(
  config: Particle3DConfig,
  startSize: number,
  life01: number,
  context?: ParticleScaleContext
): number {
  const size3D: [number, number, number] = config.mainModule.useStartSize3D
    ? [startSize, startSize, startSize]
    : [startSize, startSize, 1];
  const scaled = computeParticleScale3D(config, size3D, life01, context);
  if (config.mainModule.useStartSize3D) {
    return Math.max(scaled[0], scaled[1], scaled[2]);
  }
  return Math.max(scaled[0], scaled[1]);
}

/** @deprecated use resolveEmitterScaleVector */
export function transformParticleScaleFactor(transform: Transform3D): number {
  return Math.max(...absScale(transform), 0.0001);
}
