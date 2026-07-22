import { describe, it, expect } from 'vitest';
import { getCompatibilityReport } from '../src/utils/multi-engine-export';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';

describe('multi-engine-export', () => {
  it('cocos engine is fully compatible', () => {
    const cfg = getDefaultParticle3DConfig();
    const report = getCompatibilityReport(cfg, 'cocos');
    expect(report.length).toBeGreaterThan(0);
    expect(report.every(r => r.status === 'full')).toBe(true);
  });

  it('unity report includes partial compatibility notes', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.noiseModule.enabled = true;
    cfg.trailModule.enabled = true;
    const report = getCompatibilityReport(cfg, 'unity');
    const hasPartial = report.some(r => r.status === 'partial');
    const hasNone = report.some(r => r.status === 'none');
    expect(hasPartial || hasNone).toBe(true);
  });

  it('godot report handles noise as partial', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.noiseModule.enabled = true;
    const report = getCompatibilityReport(cfg, 'godot');
    const noiseItem = report.find(r => r.module === '噪声模块');
    expect(noiseItem).toBeDefined();
    expect(noiseItem!.status).toBe('partial');
  });
});
