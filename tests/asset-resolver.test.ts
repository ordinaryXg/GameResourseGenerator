import { describe, it, expect } from 'vitest';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';
import { mergeAssetRegistries, findAssetById } from '../src/utils/asset-resolver';
import type { AssetEntry } from '../src/types/asset';

describe('asset-resolver', () => {
  it('merges builtin and project assets without duplicate ids', () => {
    const builtin = createBuiltinAssetEntries();
    const projectAsset: AssetEntry = {
      id: 'custom-tex',
      name: 'my-smoke',
      type: 'texture',
      source: 'imported',
      uri: 'data:image/png;base64,abc'
    };
    const merged = mergeAssetRegistries([projectAsset], builtin);
    expect(merged.length).toBe(builtin.length + 1);
    expect(findAssetById(merged, 'custom-tex')?.name).toBe('my-smoke');
  });

  it('project asset overrides builtin with same id', () => {
    const builtin = createBuiltinAssetEntries();
    const override: AssetEntry = {
      id: builtin[0].id,
      name: 'override-circle',
      type: 'texture',
      source: 'project',
      uri: 'data:image/png;base64,xyz'
    };
    const merged = mergeAssetRegistries([override], builtin);
    expect(findAssetById(merged, builtin[0].id)?.name).toBe('override-circle');
  });
});
