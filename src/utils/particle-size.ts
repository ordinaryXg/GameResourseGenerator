import type { Particle3DConfig, RangeValue } from '@/types/effect';
import type { Transform3D } from '@/types/project';
import { sampleCurveConfig } from '@/utils/curve-utils';

export function sampleRangeValue(range: RangeValue): number {
  if (range.mode === 'constant') return range.constant ?? 1;
  const min = range.min ?? 0;
  const max = range.max ?? 1;
  return min + Math.random() * (max - min);
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
