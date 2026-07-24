import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { collectPrefabImportFiles } from '../src/utils/prefab-import-scan';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { bindPrefabImportAssets } from '../src/utils/prefab-import-bundle';
import { mergeImportedProjectInto } from '../src/utils/project-tree';
import { createDefaultProject } from '../src/utils/project-factory';
import { getEmitterNodes } from '../src/utils/preview-sources';

const PREFAB_PATH = 'd:/Desktop/blizzardWhirl/resources/effect_anima/BlizzardWhirl/blizzardWhirl.prefab';

describe('blizzardWhirl import debug', () => {
  it('imports complex blizzardWhirl prefab when folder exists', async () => {
    if (!existsSync(PREFAB_PATH)) {
      console.warn('Skip: blizzardWhirl prefab not found at', PREFAB_PATH);
      return;
    }

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

    expect(files.length).toBeGreaterThan(0);
    const prefab = files.find(
      (f) => f.name.toLowerCase() === 'blizzardwhirl.prefab'
    );
    expect(prefab).toBeDefined();

    const parsed = parsePrefabToProject(prefab!.content, 'blizzardWhirl');
    const bound = bindPrefabImportAssets(parsed.project, files);
    const merged = mergeImportedProjectInto(createDefaultProject('test'), bound.project);

    expect(getEmitterNodes(merged.project.root).length).toBeGreaterThan(0);
    expect(merged.project.root.children.length).toBe(2);
  });
});
