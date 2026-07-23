import { describe, it, expect } from 'vitest';
import { ImportAssetCollector, extractParticleAssetUuids } from '../src/utils/import-asset-resolver';
import { generateProjectPrefab } from '../src/utils/export-pipeline';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { createExplosionProject } from './helpers/explosion-project';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';

describe('import-asset-resolver', () => {
  it('creates imported texture asset from spriteFrame UUID', () => {
    const collector = new ImportAssetCollector();
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890@6c48a';
    const id = collector.resolveTextureRef(uuid);
    expect(id).toMatch(/^imported-tex-/);
    const assets = collector.getImportedAssets();
    expect(assets).toHaveLength(1);
    expect(assets[0].type).toBe('texture');
    expect(assets[0].meta?.uuid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(assets[0].meta?.spriteFrameUuid).toBe(uuid);
  });

  it('dedupes texture UUID lookups', () => {
    const collector = new ImportAssetCollector();
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890@6c48a';
    const a = collector.resolveTextureRef(uuid);
    const b = collector.resolveTextureRef(uuid);
    expect(a).toBe(b);
    expect(collector.getImportedAssets()).toHaveLength(1);
  });

  it('creates imported material asset from material UUID', () => {
    const collector = new ImportAssetCollector();
    const uuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const id = collector.resolveMaterialRef(uuid, 'alpha');
    expect(id).toMatch(/^imported-mat-/);
    expect(collector.getImportedAssets()[0].meta?.blend).toBe('alpha');
  });

  it('extracts material and texture UUIDs from exported prefab', () => {
    const project = createExplosionProject();
    const builtins = createBuiltinAssetEntries();
    const exported = generateProjectPrefab(project, {
      projectAssets: builtins,
      getAsset: (id) => builtins.find(a => a.id === id) ?? null
    });
    const pool = JSON.parse(exported.prefabContent);
    const ps = pool.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystem');
    const refs = extractParticleAssetUuids(pool, ps);
    expect(refs.materialUuid).toBeTruthy();
    expect(refs.spriteFrameUuid).toContain('@');
  });
});

describe('export-composite asset round-trip', () => {
  it('preserves material/texture UUID refs as imported AssetEntry', () => {
    const project = createExplosionProject();
    const builtins = createBuiltinAssetEntries();
    const ctx = {
      projectAssets: builtins,
      getAsset: (id: string) => builtins.find(a => a.id === id) ?? null
    };
    const exported = generateProjectPrefab(project, ctx);
    const imported = parsePrefabToProject(exported.prefabContent, project.name);

    const importedAssets = imported.project.assetRegistry.filter(a => a.source === 'imported');
    expect(importedAssets.length).toBeGreaterThan(0);
    expect(imported.warnings.some(w => w.includes('外部资产'))).toBe(true);

    const explosion = imported.project.root.children.find(
      c => c.type === 'emitter' && c.name === 'Explosion'
    );
    expect(explosion?.type).toBe('emitter');
    if (explosion?.type === 'emitter') {
      expect(explosion.assetRefs.mainTexture).toMatch(/^imported-tex-/);
      expect(explosion.assetRefs.material).toMatch(/^imported-mat-/);
    }
  });
});
