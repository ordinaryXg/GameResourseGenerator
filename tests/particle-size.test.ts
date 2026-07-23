import { describe, it, expect } from 'vitest';
import { computeParticleScale, sampleStartParticleSize } from '../src/utils/particle-size';
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

  it('samples randomBetween start size once', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.mainModule.startSize3D.x = { mode: 'randomBetween', min: 0.3, max: 0.4 };
    const a = sampleStartParticleSize(cfg);
    const b = sampleStartParticleSize(cfg);
    expect(a).toBeGreaterThanOrEqual(0.3);
    expect(a).toBeLessThanOrEqual(0.4);
    expect(b).toBeGreaterThanOrEqual(0.3);
    expect(b).toBeLessThanOrEqual(0.4);
  });
});
