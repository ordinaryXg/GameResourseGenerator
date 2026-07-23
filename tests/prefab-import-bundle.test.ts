import { describe, it, expect } from 'vitest';
import {
  bindPrefabImportAssets,
  buildImportAssetUuidIndex,
  buildSampleTextureMeta,
  relativePathFromPrefabDir,
  collectPrefabImportScanRoots
} from '../src/utils/prefab-import-bundle';
import { joinPath } from '../src/utils/asset-resolver';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { generateProjectPrefab } from '../src/utils/export-pipeline';
import { createExplosionProject } from './helpers/explosion-project';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';

describe('prefab-import-bundle', () => {
  it('indexes Cocos subMetas spriteFrame UUIDs', () => {
    const texUuid = '8f03f6bb-7e12-4465-b966-09ee9a9f6121';
    const map = buildImportAssetUuidIndex([
      { name: 'fx.png', relativePath: 'textures/fx.png', content: 'abc', encoding: 'base64' },
      { name: 'fx.png.meta', relativePath: 'textures/fx.png.meta', content: buildSampleTextureMeta(texUuid) }
    ]);
    expect(map.get(texUuid.toLowerCase())?.relativePath).toBe('textures/fx.png');
    expect(map.get(`${texUuid}@6c48a`.toLowerCase())?.relativePath).toBe('textures/fx.png');
  });

  it('binds textures in subdirectories via relative paths', () => {
    const project = createExplosionProject();
    const builtins = createBuiltinAssetEntries();
    const exported = generateProjectPrefab(project, {
      projectAssets: builtins,
      getAsset: (id) => builtins.find(a => a.id === id) ?? null
    });

    const pool = JSON.parse(exported.prefabContent);
    const ps = pool.find((o: { __type__?: string }) => o.__type__ === 'cc.ParticleSystem');
    const matUuid = ps._materials[0].__uuid__ as string;
    const renderer = pool[ps.renderer.__id__];
    const sfUuid = renderer._mainTexture.__uuid__ as string;
    const texBase = sfUuid.split('@')[0];

    const texFile = exported.assetFiles.find(f => !f.fileName.endsWith('.mtl'))!;
    const matFile = exported.assetFiles.find(f => f.fileName.endsWith('.mtl'))!;

    const files = [
      { name: `${project.name}.prefab`, relativePath: `${project.name}.prefab`, content: exported.prefabContent },
      { name: texFile.fileName, relativePath: `textures/${texFile.fileName}`, content: texFile.content, encoding: 'base64' as const },
      { name: `${texFile.fileName}.meta`, relativePath: `textures/${texFile.fileName}.meta`, content: texFile.metaContent },
      { name: matFile.fileName, relativePath: matFile.fileName, content: matFile.content },
      { name: `${matFile.fileName}.meta`, relativePath: `${matFile.fileName}.meta`, content: matFile.metaContent }
    ];

    const parsed = parsePrefabToProject(exported.prefabContent, project.name);
    const bound = bindPrefabImportAssets(parsed.project, files);
    expect(bound.boundAssetCount).toBeGreaterThan(0);

    const tex = bound.project.assetRegistry.find(a => a.meta?.uuid === texBase);
    expect(tex?.uri.startsWith('data:image')).toBe(true);
  });

  it('computes relative path from prefab dir to nested files', () => {
    expect(relativePathFromPrefabDir('D:/Desktop/smok', 'D:/Desktop/smok/textures/a.png')).toBe('textures/a.png');
    expect(relativePathFromPrefabDir('D:/Desktop/smok', 'D:/Desktop/shared/a.png')).toBe('../shared/a.png');
  });

  it('collects scan roots up to assets folder', () => {
    const roots = collectPrefabImportScanRoots('D:/Game/assets/effects/smoke');
    expect(roots[0]).toBe('D:/Game/assets/effects/smoke');
    expect(roots).toContain('D:/Game/assets');
  });

  it('joinPath resolves parent-relative texture paths', () => {
    expect(joinPath('D:\\Desktop\\smok', '../shared/tex.png')).toBe('D:\\Desktop\\shared\\tex.png');
  });
});
