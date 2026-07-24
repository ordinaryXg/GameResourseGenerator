import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { collectPrefabImportFiles } from '../src/utils/prefab-import-scan';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { bindPrefabImportAssets } from '../src/utils/prefab-import-bundle';
import { getEmitterNodes } from '../src/utils/preview-sources';
import {
  sampleStartParticleSize3D,
  sampleStartRotation3D,
  sampleAngularVelocity3D
} from '../src/utils/particle-mesh';

const PREFAB_PATH = 'd:/Desktop/blizzardWhirl/resources/effect_anima/BlizzardWhirl/blizzardWhirl.prefab';

describe('blizzardWhirl mesh import', () => {
  it('binds wind mesh for feng emitter when folder exists', async () => {
    if (!existsSync(PREFAB_PATH)) return;

    const prefabDir = dirname(PREFAB_PATH);
    const files = await collectPrefabImportFiles(PREFAB_PATH, {
      readdir: async (dir) => readdirSync(dir, { withFileTypes: true }),
      readText: async (path) => readFileSync(path, 'utf-8'),
      readBase64: async (path) => readFileSync(path).toString('base64'),
      exists: (path) => existsSync(path),
      join,
      dirname,
      basename,
      relative
    });

    const fbxFiles = files.filter(f => /\.fbx$/i.test(f.name));
    expect(fbxFiles.length).toBeGreaterThan(0);
    expect(fbxFiles[0]?.encoding).toBe('base64');

    const prefab = files.find(f => f.name.toLowerCase() === 'blizzardwhirl.prefab');
    expect(prefab).toBeDefined();

    const parsed = parsePrefabToProject(prefab!.content, 'blizzardWhirl');
    const bound = bindPrefabImportAssets(parsed.project, files);
    const feng = getEmitterNodes(bound.project.root).find(e => e.name === 'feng');
    expect(feng).toBeDefined();
    expect(feng!.config.rendererModule.renderMode).toBe('mesh');
    expect(feng!.config.rendererModule.alignSpace).toBe('world');
    expect(feng!.config.mainModule.scaleSpace).toBe('local');
    expect(feng!.assetRefs.mesh).toBeDefined();

    const size3D = sampleStartParticleSize3D(feng!.config);
    expect(size3D[0]).toBeGreaterThan(3);
    expect(size3D[2]).toBeGreaterThan(1.5);
    expect(size3D[2]).toBeLessThan(3);

    const startRot = sampleStartRotation3D(feng!.config);
    expect(startRot[0]).toBeCloseTo(-Math.PI / 2, 3);
    expect(Math.abs(startRot[1])).toBeCloseTo(Math.PI, 3);
    expect(Math.abs(startRot[2])).toBeCloseTo(Math.PI, 3);

    expect(feng!.config.rotationOverLifetime.separateAxes).toBe(true);
    const spin = sampleAngularVelocity3D(feng!.config);
    expect(spin[2]).toBeGreaterThan(10);

    const meshAsset = bound.project.assetRegistry.find(a => a.id === feng!.assetRefs.mesh);
    expect(meshAsset).toBeDefined();
    expect(meshAsset!.uri.startsWith('data:model/fbx;base64,')).toBe(true);
    expect(meshAsset!.name.toLowerCase()).toContain('wind_mesh');
    expect(resolveAssetUrl(meshAsset!, prefabDir)).toBe(meshAsset!.uri);
  });
});

function resolveAssetUrl(entry: { uri: string }, _projectDir: string) {
  return entry.uri;
}
