import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  createDefaultEmitter,
  createDefaultTransform
} from '../src/utils/project-factory';
import { generateProjectPrefab } from '../src/utils/export-pipeline';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { getEmitterNodes } from '../src/utils/preview-sources';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';
import { isGroupNode } from '../src/types/project';
import { createExplosionProject } from './helpers/explosion-project';

describe('export-composite', () => {
  const builtins = createBuiltinAssetEntries();
  const ctx = {
    projectAssets: builtins,
    getAsset: (id: string) => builtins.find(a => a.id === id) ?? null
  };

  it('exports 3-emitter project with group hierarchy and transforms', () => {
    const project = createExplosionProject();
    const result = generateProjectPrefab(project, ctx);
    const parsed = JSON.parse(result.prefabContent);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].__type__).toBe('cc.Prefab');
    expect(result.emitterCount).toBe(3);

    const particleSystems = parsed.filter((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystem');
    expect(particleSystems).toHaveLength(3);

    const rootIdx = parsed[0].data.__id__;
    const rootNode = parsed[rootIdx];
    expect(rootNode.__type__).toBe('cc.Node');
    expect(rootNode._name).toBe('Explosion');
    expect(rootNode._children).toHaveLength(3);

    const smokeNode = parsed[rootNode._children[1].__id__];
    expect(smokeNode._name).toBe('Smoke');
    expect(smokeNode._lpos.y).toBe(1.5);
    expect(smokeNode._lscale.x).toBe(2);

    const glowNode = parsed[rootNode._children[2].__id__];
    expect(glowNode._euler.y).toBe(45);
  });

  it('dedupes shared textures and collects distinct materials', () => {
    const project = createExplosionProject();
    const result = generateProjectPrefab(project, ctx);

    const textureFiles = result.assetFiles.filter(f => f.fileName.endsWith('.png'));
    const materialFiles = result.assetFiles.filter(f => f.fileName.endsWith('.mtl'));
    expect(textureFiles).toHaveLength(3);
    expect(materialFiles).toHaveLength(3);
    expect(textureFiles.map(f => f.fileName).sort()).toEqual([
      'particle-glow.png',
      'particle-smoke.png',
      'particle-star.png'
    ].sort());
  });

  it('round-trips multi-emitter prefab to EffectProject', () => {
    const project = createExplosionProject();
    const exported = generateProjectPrefab(project, ctx);
    const imported = parsePrefabToProject(exported.prefabContent, project.name);

    expect(imported.project.name).toBe('ExplosionCombo');
    const emitters = getEmitterNodes(imported.project.root);
    expect(emitters).toHaveLength(3);
    expect(emitters.map(e => e.name).sort()).toEqual(['Explosion', 'Glow', 'Smoke']);

    const smoke = emitters.find(e => e.name === 'Smoke')!;
    expect(smoke.transform.position[1]).toBe(1.5);
    expect(smoke.transform.scale[0]).toBe(2);

    expect(isGroupNode(imported.project.root)).toBe(true);
    expect(imported.project.root.name).toBe('Explosion');
  });

  it('exports non-default textures referenced by emitters', () => {
    const project = createExplosionProject();
    const result = generateProjectPrefab(project, ctx);
    expect(result.emitterSummaries).toHaveLength(3);
    expect(result.emitterSummaries.some(s => s.textureName === 'particle-star.png')).toBe(true);
    expect(result.emitterSummaries.some(s => s.materialBlend === '透明混合')).toBe(true);
  });
});

describe('transform-utils cocos round-trip', () => {
  it('preserves transform through export structure', () => {
    const project = createDefaultProject('TransformTest');
    const emitter = createDefaultEmitter('Offset');
    emitter.transform = createDefaultTransform();
    emitter.transform.position = [1, 2, 3];
    emitter.transform.rotation = [10, 20, 30];
    emitter.transform.scale = [0.5, 0.5, 0.5];
    project.root.children = [emitter];

    const exported = generateProjectPrefab(project);
    const parsed = JSON.parse(exported.prefabContent);
    const rootIdx = parsed[0].data.__id__;
    const root = parsed[rootIdx];
    const child = parsed[root._children[0].__id__];

    expect(child._lpos).toEqual({ __type__: 'cc.Vec3', x: 1, y: 2, z: 3 });
    expect(child._lscale).toEqual({ __type__: 'cc.Vec3', x: 0.5, y: 0.5, z: 0.5 });
    expect(child._euler.x).toBeCloseTo(10, 4);
    expect(child._euler.y).toBeCloseTo(20, 4);
    expect(child._euler.z).toBeCloseTo(30, 4);
  });
});
