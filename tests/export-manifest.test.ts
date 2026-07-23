import { describe, it, expect } from 'vitest';
import { buildProjectExportManifest } from '../src/utils/export-pipeline';
import { createExplosionProject } from './helpers/explosion-project';

describe('buildProjectExportManifest', () => {
  it('lists prefab, textures and materials for explosion preset', () => {
    const project = createExplosionProject();
    const manifest = buildProjectExportManifest(project);

    expect(manifest.emitterCount).toBeGreaterThanOrEqual(3);
    expect(manifest.items[0].category).toBe('prefab');
    expect(manifest.uniqueTextureCount).toBeGreaterThan(0);
    expect(manifest.uniqueMaterialCount).toBeGreaterThan(0);
    expect(manifest.totalFileCount).toBe(manifest.items.length * 2);
    expect(manifest.emitterSummaries.length).toBe(manifest.emitterCount);
  });
});
