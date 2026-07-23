import { describe, it, expect } from 'vitest';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';

describe('builtin-assets', () => {
  it('includes 10 builtin materials, shaders, and meshes', () => {
    const all = createBuiltinAssetEntries();
    const materials = all.filter(a => a.type === 'material');
    const shaders = all.filter(a => a.type === 'shader');
    const meshes = all.filter(a => a.type === 'mesh');
    expect(materials).toHaveLength(10);
    expect(shaders).toHaveLength(10);
    expect(meshes).toHaveLength(10);
  });

  it('each non-texture builtin has description meta', () => {
    const all = createBuiltinAssetEntries().filter(a =>
      a.type === 'material' || a.type === 'shader' || a.type === 'mesh'
    );
    for (const asset of all) {
      expect(asset.meta?.description, asset.name).toBeTruthy();
    }
  });
});
