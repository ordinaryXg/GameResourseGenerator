import { describe, it, expect } from 'vitest';
import { generatePrefab } from '../src/utils/export-pipeline';
import { getDefaultEffectConfig } from '../src/utils/effect-defaults';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/utils/cocos-serializers';

describe('export-pipeline', () => {
  it('generates valid .prefab JSON array with Cocos 3.8 reference format', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TestFire');
    const result = generatePrefab(effect);

    expect(result.prefabContent).toBeTruthy();
    expect(result.metaContent).toBeTruthy();
    expect(result.materialContent).toBeTruthy();

    const parsed = JSON.parse(result.prefabContent);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].__type__).toBe('cc.Prefab');
    expect(parsed[1].__type__).toBe('cc.Node');

    const ps = parsed.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystem');
    expect(ps).toBeDefined();
    expect(ps.duration).toBe(5);
    expect(ps._capacity).toBe(100);
    expect(ps.startLifetime).toEqual({ __id__: expect.any(Number) });
    expect(ps._materials[0].__uuid__).toBeTruthy();
  });

  it('generates material as single JSON object with valid effect UUID', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TestFire');
    const result = generatePrefab(effect);

    const mtl = JSON.parse(result.materialContent);
    expect(Array.isArray(mtl)).toBe(false);
    expect(mtl.__type__).toBe('cc.Material');
    expect(mtl._effectAsset.__uuid__).toBe(BUILTIN_PARTICLE_EFFECT_UUID);
    expect(mtl._techIdx).toBe(1);

    const mtlMeta = JSON.parse(result.materialMetaContent);
    expect(mtlMeta.importer).toBe('material');
    expect(mtlMeta.files).toEqual(['.json']);
  });

  it('exports bursts in cc.Burst format', () => {
    const effect = getDefaultEffectConfig('particle3d', 'BurstTest');
    (effect.config as any).mainModule.bursts = [{ time: 0.5, count: 100, cycles: 2, interval: 0.3 }];
    const parsed = JSON.parse(generatePrefab(effect).prefabContent);
    const bursts = parsed.filter((o: { __type__?: string }) => o.__type__ === 'cc.Burst');
    expect(bursts).toHaveLength(1);
    expect(bursts[0]._time).toBe(0.5);
    expect(bursts[0]._repeatCount).toBe(2);
  });

  it('generates valid prefab .meta JSON', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TestFire');
    const result = generatePrefab(effect);

    const meta = JSON.parse(result.metaContent);
    expect(meta.ver).toBe('1.1.50');
    expect(meta.uuid).toBe(effect.id);
    expect(meta.importer).toBe('prefab');
    expect(meta.files).toEqual(['.json']);
  });

  it('includes optional modules when enabled', () => {
    const effect = getDefaultEffectConfig('particle3d', 'Test');
    (effect.config as any).noiseModule.enabled = true;
    (effect.config as any).trailModule.enabled = true;
    (effect.config as any).textureAnimation.enabled = true;
    const parsed = JSON.parse(generatePrefab(effect).prefabContent);
    const ps = parsed.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystem');
    expect(ps._textureAnimationModule).toBeDefined();
    const texMod = parsed[ps._textureAnimationModule.__id__];
    expect(texMod._enable).toBe(true);
  });

  it('exports color gradients with _mode 1 (Gradient) for multi-key colors', () => {
    const effect = getDefaultEffectConfig('particle3d', 'ColorTest');
    const cfg = effect.config as import('../src/types/effect').Particle3DConfig;
    cfg.mainModule.startColor = {
      keys: [
        { time: 0, color: [1, 1, 0.5, 1] },
        { time: 0.5, color: [1, 0.6, 0.1, 1] },
        { time: 1, color: [0.1, 0.02, 0, 0] }
      ]
    };
    const parsed = JSON.parse(generatePrefab(effect).prefabContent);
    const gradRanges = parsed.filter((o: { __type__?: string }) => o.__type__ === 'cc.GradientRange');
    const gradientRange = gradRanges.find((g: { _mode?: number }) => g._mode === 1);
    expect(gradientRange).toBeDefined();
    const gradient = parsed[gradientRange.gradient.__id__];
    expect(gradient.__type__).toBe('cc.Gradient');
    expect(gradient.colorKeys).toHaveLength(3);
  });

  it('exports default particle texture and references it in material/renderer', () => {
    const effect = getDefaultEffectConfig('particle3d', 'TexTest');
    const result = generatePrefab(effect);
    expect(result.textureFileName).toBe('particle-circle.png');
    expect(result.texturePngBase64).toBeTruthy();
    expect(result.textureMetaContent).toContain('6c48a');

    const mtl = JSON.parse(result.materialContent);
    expect(mtl._props[0].mainTexture.__uuid__).toBeTruthy();

    const parsed = JSON.parse(result.prefabContent);
    const renderer = parsed.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystemRenderer');
    expect(renderer._mainTexture.__uuid__).toBeTruthy();
    expect(renderer._velocityScale).toBe(1);
    expect(renderer._lengthScale).toBe(1);
    expect(renderer._alignSpace).toBeUndefined();
  });

  it('exports stretched billboard renderer fields', () => {
    const effect = getDefaultEffectConfig('particle3d', 'StretchTest');
    const cfg = effect.config as import('../src/types/effect').Particle3DConfig;
    cfg.rendererModule = {
      renderMode: 'stretchedBillboard',
      velocityScale: 2.5,
      lengthScale: 0.8,
      alignSpace: 'world'
    };
    const parsed = JSON.parse(generatePrefab(effect).prefabContent);
    const renderer = parsed.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystemRenderer');
    expect(renderer._renderMode).toBe(1);
    expect(renderer._velocityScale).toBe(2.5);
    expect(renderer._lengthScale).toBe(0.8);
    expect(renderer._alignSpace).toBeUndefined();
  });
});
