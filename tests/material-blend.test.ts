import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveParticleBlending,
  resolveMaterialTintRgba,
  applyTintToRgba
} from '../src/utils/material-blend';
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
    }],
    ['tinted', {
      id: 'tinted',
      name: 'tinted',
      type: 'material',
      source: 'project',
      uri: 'x',
      meta: { blend: 'additive', tintColor: { r: 128, g: 64, b: 0, a: 255 } }
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

  it('resolves tint rgba from material', () => {
    expect(resolveMaterialTintRgba('tinted', getAsset)[0]).toBeCloseTo(128 / 255);
    expect(applyTintToRgba([1, 1, 1, 1], [0.5, 0.5, 0.5, 1])).toEqual([0.5, 0.5, 0.5, 1]);
  });
});
