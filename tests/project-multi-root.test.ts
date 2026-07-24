import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { mergeImportedProjectInto, getExportTreeRoot } from '../src/utils/project-tree';
import { getEmitterNodes } from '../src/utils/preview-sources';
import { buildExplosionPresetProject } from '../src/data/preset-projects';
import { generateProjectPrefab } from '../src/utils/export-pipeline';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';

describe('multi-root project tree', () => {
  it('merges imported prefab as a new top-level root', () => {
    const base = createDefaultProject('Demo');
    const explosion = buildExplosionPresetProject();
    const exported = generateProjectPrefab(explosion, {
      projectAssets: createBuiltinAssetEntries(),
      getAsset: (id) => createBuiltinAssetEntries().find(a => a.id === id) ?? null
    });
    const imported = parsePrefabToProject(exported.prefabContent, 'Explosion');

    const { project, addedRootId } = mergeImportedProjectInto(base, imported.project);
    expect(project.root.children).toHaveLength(2);
    expect(project.root.children.some((node) => node.id === addedRootId)).toBe(true);
    expect(getEmitterNodes(project.root).length).toBe(4);
  });

  it('exports single-scene-root projects through the visible root group', () => {
    const project = buildExplosionPresetProject();
    const exportRoot = getExportTreeRoot(project);
    expect(exportRoot.name).toBe('Explosion');
    expect(getEmitterNodes(exportRoot)).toHaveLength(3);
  });
});
