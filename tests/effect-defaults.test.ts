import { describe, it, expect } from 'vitest';
import { generateId, generateUUID, getDefaultEffectConfig, getDefaultParticle3DConfig } from '../src/utils/effect-defaults';

describe('effect-defaults', () => {
  it('generateId returns unique string', () => {
    const a = generateId();
    const b = generateId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('generateUUID returns valid UUID v4 format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('getDefaultEffectConfig returns valid structure', () => {
    const config = getDefaultEffectConfig('particle3d', 'test');
    expect(config.name).toBe('test');
    expect(config.type).toBe('particle3d');
    expect(config.targetEngineVersion).toBe('3.8.x');
    expect(config.source).toBe('manual');
    expect(config.config).toBeDefined();
  });

  it('getDefaultParticle3DConfig has all modules', () => {
    const cfg = getDefaultParticle3DConfig();
    expect(cfg.mainModule).toBeDefined();
    expect(cfg.mainModule.capacity).toBeGreaterThan(0);
    expect(cfg.shapeModule).toBeDefined();
    expect(cfg.shapeModule.enabled).toBe(true);
    expect(cfg.colorOverLifetime).toBeDefined();
    expect(cfg.noiseModule).toBeDefined();
    expect(cfg.trailModule).toBeDefined();
    expect(cfg.rendererModule).toBeDefined();
  });
});
