import { describe, it, expect } from 'vitest';
import type { AssetEntry } from '@/types/asset';
import { patchAssetInRegistry, duplicateAssetEntry } from '@/utils/asset-registry';

const sample: AssetEntry = {
  id: 'a1',
  name: 'tex',
  type: 'texture',
  source: 'imported',
  uri: 'data:image/png;base64,abc',
  meta: { width: 64 }
};

describe('asset-registry', () => {
  it('patchAssetInRegistry merges meta', () => {
    const next = patchAssetInRegistry([sample], 'a1', { name: 'tex2', meta: { height: 32 } });
    expect(next[0].name).toBe('tex2');
    expect(next[0].meta?.width).toBe(64);
    expect(next[0].meta?.height).toBe(32);
  });

  it('duplicateAssetEntry creates project copy with new id', () => {
    const dup = duplicateAssetEntry(sample);
    expect(dup.id).not.toBe(sample.id);
    expect(dup.source).toBe('project');
    expect(dup.name).toContain('副本');
  });
});
