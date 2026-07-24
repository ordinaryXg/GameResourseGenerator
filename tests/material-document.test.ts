import { describe, it, expect } from 'vitest';
import type { AssetEntry } from '../src/types/asset';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/types/material';
import {
  getMaterialDocument,
  materialDocumentMetaPatch,
  setDefines0,
  setPass0
} from '../src/utils/material-document';
import { parseMtlContent, serializeMaterialDocument } from '../src/utils/mtl-io';

describe('material-document B1', () => {
  it('migrates legacy blend-only meta into a document', () => {
    const asset: AssetEntry = {
      id: 'm1',
      name: 'smoke',
      type: 'material',
      source: 'imported',
      uri: 'x.mtl',
      meta: { blend: 'alpha' }
    };
    const doc = getMaterialDocument(asset);
    expect(doc.techIdx).toBe(0);
    expect(doc.effect.kind).toBe('builtin-uuid');
    expect(doc.effect).toMatchObject({ uuid: BUILTIN_PARTICLE_EFFECT_UUID });
    expect(doc.defines).toEqual([{}]);
    expect(doc.states[0]?.depthStencilState.depthWrite).toBe(false);
    expect(doc.props[0]).toHaveProperty('tintColor');
  });

  it('patches defines and pass states into meta.materialDoc', () => {
    const asset: AssetEntry = {
      id: 'm2',
      name: 'fire',
      type: 'material',
      source: 'project',
      uri: 'x.mtl',
      meta: { blend: 'additive' }
    };
    const patch = materialDocumentMetaPatch((prev) => {
      let next = setDefines0(prev, { USE_ALPHA_TEST: true });
      next = setPass0(next, {
        ...next.states[0]!,
        depthStencilState: { depthTest: true, depthWrite: true },
        blendState: {
          targets: [{ blend: true, blendSrc: 770, blendDst: 1 }]
        }
      });
      return next;
    }, asset);

    expect(patch.materialDoc?.defines[0]).toEqual({ USE_ALPHA_TEST: true });
    expect(patch.materialDoc?.states[0]?.depthStencilState.depthWrite).toBe(true);
    expect(patch.blend).toBe('additive');
    expect(patch.techIdx).toBe(1);
  });

  it('round-trips defines and states through mtl parse/serialize', () => {
    const mtl = {
      __type__: 'cc.Material',
      _name: 'custom',
      _effectAsset: { __uuid__: BUILTIN_PARTICLE_EFFECT_UUID },
      _techIdx: 0,
      _defines: [{ FOG: true, LEVEL: 2 }],
      _states: [{
        rasterizerState: { cullMode: 'back' },
        depthStencilState: { depthTest: true, depthWrite: false },
        blendState: { targets: [{ blend: true, blendSrc: 1, blendDst: 771 }] }
      }],
      _props: [{
        tintColor: { __type__: 'cc.Color', r: 10, g: 20, b: 30, a: 40 }
      }]
    };
    const meta = parseMtlContent(JSON.stringify(mtl));
    expect(meta?.materialDoc?.defines[0]).toEqual({ FOG: true, LEVEL: 2 });
    expect(meta?.materialDoc?.states[0]?.rasterizerState.cullMode).toBe('back');
    expect(meta?.tintColor).toEqual({ r: 10, g: 20, b: 30, a: 40 });

    const asset: AssetEntry = {
      id: 'm3',
      name: 'custom',
      type: 'material',
      source: 'imported',
      uri: 'x.mtl',
      meta
    };
    const out = serializeMaterialDocument(getMaterialDocument(asset), { name: 'custom' });
    expect(out._techIdx).toBe(0);
    expect(out._defines).toEqual([{ FOG: true, LEVEL: 2 }]);
    const states = out._states as Array<{ rasterizerState: { cullMode: string } }>;
    expect(states[0].rasterizerState.cullMode).toBe('back');
  });
});
