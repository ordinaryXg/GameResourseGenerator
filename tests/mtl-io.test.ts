import { describe, it, expect } from 'vitest';
import { parseMtlContent, serializeParticleMaterial } from '../src/utils/mtl-io';
import {
  getParticleMaterialConfig,
  particleMaterialMetaPatch,
  techIdxFromBlend
} from '../src/utils/particle-material';
import type { AssetEntry } from '../src/types/asset';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/types/material';

describe('particle-material + mtl-io', () => {
  it('derives techIdx from legacy blend meta', () => {
    const asset: AssetEntry = {
      id: 'm1',
      name: 'smoke',
      type: 'material',
      source: 'imported',
      uri: 'x.mtl',
      meta: { blend: 'alpha' }
    };
    const cfg = getParticleMaterialConfig(asset);
    expect(cfg.techIdx).toBe(0);
    expect(cfg.blend).toBe('alpha');
    expect(cfg.tintColor).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(cfg.effectUuid).toBe(BUILTIN_PARTICLE_EFFECT_UUID);
  });

  it('syncs blend when patching techIdx', () => {
    const patch = particleMaterialMetaPatch({ techIdx: 0 });
    expect(patch.techIdx).toBe(0);
    expect(patch.blend).toBe('alpha');
    expect(techIdxFromBlend('additive')).toBe(1);
  });

  it('parses Cocos .mtl tint and techIdx', () => {
    const mtl = JSON.stringify({
      __type__: 'cc.Material',
      _effectAsset: { __uuid__: BUILTIN_PARTICLE_EFFECT_UUID },
      _techIdx: 0,
      _props: [{
        tintColor: { __type__: 'cc.Color', r: 200, g: 100, b: 50, a: 128 },
        mainTexture: { __uuid__: 'tex-uuid-1' }
      }]
    });
    const meta = parseMtlContent(mtl);
    expect(meta?.techIdx).toBe(0);
    expect(meta?.blend).toBe('alpha');
    expect(meta?.tintColor).toEqual({ r: 200, g: 100, b: 50, a: 128 });
    expect(meta?.mainTextureUuid).toBe('tex-uuid-1');
  });

  it('serializes editable material fields into .mtl', () => {
    const json = serializeParticleMaterial({
      effectUuid: BUILTIN_PARTICLE_EFFECT_UUID,
      techIdx: 1,
      blend: 'additive',
      tintColor: { r: 10, g: 20, b: 30, a: 40 },
      mainTextureUuid: 'sf-1'
    }, { name: 'attckSmoke' });

    expect(json._name).toBe('attckSmoke');
    expect(json._techIdx).toBe(1);
    const props = (json._props as Array<Record<string, unknown>>)[0];
    expect(props.tintColor).toMatchObject({ r: 10, g: 20, b: 30, a: 40 });
    expect(props.mainTexture).toEqual({ __uuid__: 'sf-1' });
  });
});
