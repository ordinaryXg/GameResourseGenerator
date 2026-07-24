import { describe, it, expect } from 'vitest';
import { computeParticleScale, coerceRangeValue, sampleRangeValue } from '../src/utils/particle-size';
import { resolveTextureSheetFrameIndex, sampleTextureSheetContext } from '../src/utils/texture-sheet';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';

describe('particle-size', () => {
  it('applies size-over-lifetime curve multiplier', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.sizeOverLifetime.enabled = true;
    cfg.sizeOverLifetime.size = {
      keys: [{ time: 0, value: 0.5 }, { time: 1, value: 0 }],
      multiplier: 1
    };
    expect(computeParticleScale(cfg, 0.4, 0)).toBeCloseTo(0.2);
    expect(computeParticleScale(cfg, 0.4, 0.5)).toBeCloseTo(0.1);
    expect(computeParticleScale(cfg, 0.4, 1)).toBeCloseTo(0);
  });

  it('coerces legacy numeric and missing range values', () => {
    expect(coerceRangeValue(undefined).constant).toBe(0);
    expect(coerceRangeValue(3).constant).toBe(3);
    expect(sampleRangeValue(undefined)).toBe(0);
  });

  it('ignores Z axis for uniform billboard size when startSize3D is off', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.mainModule.useStartSize3D = false;
    expect(computeParticleScale(cfg, 0.4, 0)).toBeCloseTo(0.4);
  });

  it('applies scaleSpace local vs world from transform context', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.mainModule.startSize3D.x = { mode: 'constant', constant: 2 };
    const localCtx = {
      localTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [2, 1, 1] },
      worldTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [3, 3, 3] }
    };
    cfg.mainModule.scaleSpace = 'local';
    expect(computeParticleScale(cfg, 2, 0, localCtx)).toBeCloseTo(4);
    cfg.mainModule.scaleSpace = 'world';
    expect(computeParticleScale(cfg, 2, 0, localCtx)).toBeCloseTo(6);
  });
});

describe('texture-sheet legacy config', () => {
  it('does not throw when texture animation fields are partial', () => {
    const partial = {
      enabled: true,
      numTilesX: 4,
      numTilesY: 4
    } as any;
    const ctx = sampleTextureSheetContext(partial);
    expect(resolveTextureSheetFrameIndex(partial, 0.5, ctx)).toBe(8);
  });
});
