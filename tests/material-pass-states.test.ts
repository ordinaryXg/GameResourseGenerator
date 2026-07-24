import { describe, it, expect } from 'vitest';
import type { AssetEntry } from '../src/types/asset';
import {
  addPassState,
  getMaterialDocument,
  removePassState,
  setPassAt,
  defaultPassState
} from '../src/utils/material-document';
import { parseMtlContent, serializeMaterialDocument } from '../src/utils/mtl-io';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/types/material';

describe('material pass states B3', () => {
  it('normalizes stencil and advanced blend fields from .mtl', () => {
    const mtl = {
      __type__: 'cc.Material',
      _effectAsset: { __uuid__: BUILTIN_PARTICLE_EFFECT_UUID },
      _techIdx: 1,
      _defines: [{}],
      _states: [
        {
          name: 'main',
          rasterizerState: { cullMode: 'back' },
          depthStencilState: {
            depthTest: true,
            depthWrite: false,
            depthFunc: 515,
            stencilTest: true,
            stencilFunc: 514,
            stencilRef: 3,
            stencilReadMask: 15,
            stencilWriteMask: 15,
            stencilFailOp: 7680,
            stencilZFailOp: 7681,
            stencilZPassOp: 7682
          },
          blendState: {
            targets: [{
              blend: true,
              blendSrc: 770,
              blendDst: 1,
              blendSrcAlpha: 1,
              blendDstAlpha: 771,
              blendEq: 32774,
              blendAlphaEq: 32778
            }]
          }
        },
        {
          name: 'overlay',
          rasterizerState: { cullMode: 'none' },
          depthStencilState: { depthTest: false, depthWrite: false, stencilTest: false },
          blendState: { targets: [{ blend: true, blendSrc: 1, blendDst: 1 }] }
        }
      ],
      _props: [{}]
    };

    const meta = parseMtlContent(JSON.stringify(mtl));
    const doc = getMaterialDocument({
      id: 'm',
      name: 'multi',
      type: 'material',
      source: 'imported',
      uri: 'x',
      meta
    });

    expect(doc.states).toHaveLength(2);
    expect(doc.states[0].name).toBe('main');
    expect(doc.states[0].depthStencilState.stencilTest).toBe(true);
    expect(doc.states[0].depthStencilState.stencilRef).toBe(3);
    expect(doc.states[0].blendState.targets[0].blendSrcAlpha).toBe(1);
    expect(doc.states[0].blendState.targets[0].blendAlphaEq).toBe(32778);
    expect(doc.states[1].name).toBe('overlay');

    const out = serializeMaterialDocument(doc, { name: 'multi' });
    const states = out._states as Array<Record<string, unknown>>;
    expect(states).toHaveLength(2);
    const ds = states[0].depthStencilState as Record<string, unknown>;
    expect(ds.stencilTest).toBe(true);
    expect(ds.stencilRef).toBe(3);
  });

  it('adds and removes passes (keeps at least one)', () => {
    let doc = getMaterialDocument({
      id: 'm',
      name: 'p',
      type: 'material',
      source: 'project',
      uri: 'x',
      meta: { blend: 'additive' }
    });
    expect(doc.states).toHaveLength(1);

    doc = addPassState(doc);
    expect(doc.states).toHaveLength(2);
    expect(doc.states[1].name).toBe('pass-1');

    doc = setPassAt(doc, 1, {
      ...defaultPassState('alpha', 'custom'),
      depthStencilState: {
        ...defaultPassState().depthStencilState,
        stencilTest: true,
        stencilRef: 7
      }
    });
    expect(doc.states[1].depthStencilState.stencilRef).toBe(7);

    doc = removePassState(doc, 0);
    expect(doc.states).toHaveLength(1);
    expect(doc.states[0].name).toBe('custom');

    const alone = removePassState(doc, 0);
    expect(alone.states).toHaveLength(1);
  });
});
