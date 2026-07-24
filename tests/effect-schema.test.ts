import { describe, it, expect } from 'vitest';
import {
  extractCCEffectBody,
  parseCCEffectSchema,
  resolveEffectSchema,
  mergeDefineEntries
} from '../src/utils/effect-schema';
import { BUILTIN_PARTICLE_EFFECT_SCHEMA } from '../src/data/builtin-particle-effect-schema';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/types/material';
import type { AssetEntry } from '../src/types/asset';
import { getMaterialDocument } from '../src/utils/material-document';

const SAMPLE_EFFECT = `
CCEffect %{
  techniques:
  - name: opaque
    passes:
    - vert: vs:vert
      frag: fs:frag
      macros:
        USE_NORMAL_MAP: false
  - name: transparent
    passes:
    - vert: vs:vert
      frag: fs:frag
  properties:
    mainTexture:
      value: white
      editor:
        type: texture
    tintColor:
      value: [1, 1, 1, 1]
      editor: { type: color }
    metallic:
      value: 0.5
      editor: { type: float }
}%
`;

describe('effect-schema B2', () => {
  it('extracts CCEffect body', () => {
    const body = extractCCEffectBody(SAMPLE_EFFECT);
    expect(body).toBeTruthy();
    expect(body!).toContain('techniques:');
    expect(body!).toContain('properties:');
  });

  it('parses techniques, properties and macros from CCEffect', () => {
    const schema = parseCCEffectSchema(SAMPLE_EFFECT, 'demo');
    expect(schema.partial).toBe(false);
    expect(schema.techniques.map(t => t.name)).toEqual(['opaque', 'transparent']);
    expect(schema.properties.find(p => p.name === 'tintColor')?.type).toBe('color');
    expect(schema.properties.find(p => p.name === 'mainTexture')?.type).toBe('texture');
    expect(schema.properties.find(p => p.name === 'metallic')?.type).toBe('float');
    expect(schema.macros.some(m => m.name === 'USE_NORMAL_MAP')).toBe(true);
  });

  it('resolves builtin particle schema for default materials', () => {
    const asset: AssetEntry = {
      id: 'm',
      name: 'particle',
      type: 'material',
      source: 'builtin',
      uri: 'x',
      meta: { blend: 'additive', effectUuid: BUILTIN_PARTICLE_EFFECT_UUID }
    };
    const schema = resolveEffectSchema(getMaterialDocument(asset), () => null);
    expect(schema).toBe(BUILTIN_PARTICLE_EFFECT_SCHEMA);
    expect(schema.techniques[0].name).toBe('transparent');
    expect(schema.techniques[1].name).toBe('additive');
  });

  it('resolves shader-asset schema from shaderSource', () => {
    const shader: AssetEntry = {
      id: 'sh1',
      name: 'my-fx',
      type: 'shader',
      source: 'project',
      uri: 'x.effect',
      meta: { shaderSource: SAMPLE_EFFECT }
    };
    const mat: AssetEntry = {
      id: 'm2',
      name: 'mat',
      type: 'material',
      source: 'project',
      uri: 'x.mtl',
      meta: {
        materialDoc: {
          effect: { kind: 'shader-asset', assetId: 'sh1' },
          techIdx: 0,
          defines: [{}],
          states: [],
          props: [{}]
        }
      }
    };
    const schema = resolveEffectSchema(getMaterialDocument(mat), (id) => id === 'sh1' ? shader : null);
    expect(schema.name).toBe('my-fx');
    expect(schema.techniques).toHaveLength(2);
    expect(schema.properties.some(p => p.name === 'metallic')).toBe(true);
  });

  it('merges schema macros with existing defines', () => {
    const rows = mergeDefineEntries(BUILTIN_PARTICLE_EFFECT_SCHEMA, {
      USE_ALPHA_TEST: true,
      CUSTOM_FLAG: 1
    });
    expect(rows.find(r => r.name === 'USE_ALPHA_TEST')?.value).toBe(true);
    expect(rows.find(r => r.name === 'CUSTOM_FLAG')?.fromSchema).toBe(false);
  });

  it('returns partial schema for unknown external uuid', () => {
    const asset: AssetEntry = {
      id: 'm3',
      name: 'ext',
      type: 'material',
      source: 'imported',
      uri: 'x',
      meta: {
        materialDoc: {
          effect: { kind: 'external-uuid', uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
          techIdx: 0,
          defines: [{}],
          states: [],
          props: [{}]
        }
      }
    };
    const schema = resolveEffectSchema(getMaterialDocument(asset), () => null);
    expect(schema.partial).toBe(true);
    expect(schema.properties).toEqual([]);
  });
});
