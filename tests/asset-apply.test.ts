import { describe, it, expect } from 'vitest';
import { assetToEmitterRefsPatch } from '../src/utils/asset-apply';
import type { AssetEntry } from '../src/types/asset';

describe('asset-apply', () => {
  it('maps spriteFrame to underlying texture id', () => {
    const sf: AssetEntry = {
      id: 'builtin-particle-star-sf',
      name: 'star-sf',
      type: 'spriteFrame',
      source: 'builtin',
      uri: 'builtin://textures/particle-star.png',
      meta: { textureId: 'builtin-particle-star' }
    };
    expect(assetToEmitterRefsPatch(sf)).toEqual({ mainTexture: 'builtin-particle-star' });
  });

  it('maps material and mesh types', () => {
    const mat: AssetEntry = {
      id: 'm1', name: 'mat', type: 'material', source: 'builtin', uri: 'x'
    };
    expect(assetToEmitterRefsPatch(mat)).toEqual({ material: 'm1' });
  });
});
