import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { resolveParticleBlending } from '../src/utils/material-blend';
import type { AssetEntry } from '../src/types/asset';

describe('material-blend', () => {
  const assets = new Map<string, AssetEntry>([
    ['builtin-mat-particle-additive', {
      id: 'builtin-mat-particle-additive',
      name: 'additive',
      type: 'material',
      source: 'builtin',
      uri: 'x',
      meta: { blend: 'additive' }
    }],
    ['builtin-mat-particle-alpha', {
      id: 'builtin-mat-particle-alpha',
      name: 'alpha',
      type: 'material',
      source: 'builtin',
      uri: 'x',
      meta: { blend: 'alpha' }
    }]
  ]);
  const getAsset = (id: string) => assets.get(id) ?? null;

  it('uses additive material blend', () => {
    expect(resolveParticleBlending('builtin-mat-particle-additive', getAsset, 'billboard'))
      .toBe(THREE.AdditiveBlending);
  });

  it('uses alpha material blend', () => {
    expect(resolveParticleBlending('builtin-mat-particle-alpha', getAsset, 'stretchedBillboard'))
      .toBe(THREE.NormalBlending);
  });
});
