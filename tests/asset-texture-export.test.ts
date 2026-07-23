import { describe, it, expect } from 'vitest';
import { buildTextureExportFromAsset, resolveTextureAssetForExport } from '../src/utils/asset-texture-export';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';

describe('asset-texture-export', () => {
  it('builds export png file name from asset', () => {
    const star = createBuiltinAssetEntries().find(a => a.id === 'builtin-particle-star')!;
    const exp = buildTextureExportFromAsset(star);
    expect(exp.fileName).toBe('particle-star.png');
    expect(exp.pngBase64).toBeTruthy();
    expect(exp.spriteFrameUuid).toContain('@6c48a');
  });

  it('resolves default texture when ref missing', () => {
    const tex = resolveTextureAssetForExport(undefined, []);
    expect(tex.id).toBe('builtin-particle-circle');
  });
});
