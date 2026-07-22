import { describe, it, expect } from 'vitest';
import { generatePrefab } from '../src/utils/export-pipeline';
import { getDefaultEffectConfig } from '../src/utils/effect-defaults';

describe('export-pipeline', () => {
  it('generates valid .prefab JSON array', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TestFire');
    const result = generatePrefab(effect);

    expect(result.prefabContent).toBeTruthy();
    expect(result.metaContent).toBeTruthy();

    const parsed = JSON.parse(result.prefabContent);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(4);
    expect(parsed[0].__type__).toBe('cc.Prefab');
    expect(parsed[1].__type__).toBe('cc.Node');
    expect(parsed[2].__type__).toBe('cc.ParticleSystem');
    expect(parsed[3].__type__).toBe('cc.PrefabInfo');

    // Check particle system data
    const ps = parsed[2];
    expect(ps._N$mainModule).toBeDefined();
    expect(ps._N$mainModule.duration).toBe(5);
    expect(ps._N$mainModule.capacity).toBe(100);
  });

  it('generates valid .meta JSON', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TestFire');
    const result = generatePrefab(effect);

    const meta = JSON.parse(result.metaContent);
    expect(meta.ver).toBe('1.1.0');
    expect(meta.uuid).toBe(effect.id);
    expect(meta.importer).toBe('prefab');
    expect(meta.imported).toBe(true);
    expect(meta.files).toContain('TestFire.prefab');
  });

  it('includes optional modules when enabled', () => {
    const effect = getDefaultEffectConfig('particle3d', 'Test');
    (effect.config as any).noiseModule.enabled = true;
    (effect.config as any).trailModule.enabled = true;
    const result = generatePrefab(effect);
    const parsed = JSON.parse(result.prefabContent);
    expect(parsed[2]._N$noiseModule).toBeDefined();
    expect(parsed[2]._N$noiseModule.enable).toBe(true);
    expect(parsed[2]._N$trailModule).toBeDefined();
    expect(parsed[2]._N$trailModule.enable).toBe(true);
  });
});
