import { describe, it, expect } from 'vitest';
import type { AssetEntry } from '../src/types/asset';
import type { EffectProject } from '../src/types/project';
import {
  buildEffectExportFile,
  buildEffectMeta,
  ensureShaderEffectUuid,
  resolveShaderEffectUuid
} from '../src/utils/effect-io';
import { generateProjectPrefab, buildProjectExportManifest } from '../src/utils/export-pipeline';
import { bindPrefabImportAssets } from '../src/utils/prefab-import-bundle';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { getMaterialDocument } from '../src/utils/material-document';
import { createExplosionProject } from './helpers/explosion-project';
import { createBuiltinAssetEntries } from '../src/data/builtin-assets';
import { generateUUID } from '../src/utils/effect-defaults';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '../src/types/material';

const CUSTOM_SHADER_SOURCE = `CCEffect %{
  techniques:
  - name: custom
    passes:
    - vert: vs:vert
      frag: fs:frag
  properties:
    tintColor: { value: [1, 1, 1, 1], editor: { type: color } }
}%

CCProgram vs %{
  vec4 vert() { return vec4(0.0); }
}%

CCProgram fs %{
  vec4 frag() { return vec4(1.0); }
}%
`;

function createCustomShaderMaterialProject(): {
  project: EffectProject;
  shader: AssetEntry;
  material: AssetEntry;
  getAsset: (id: string) => AssetEntry | null;
} {
  const builtins = createBuiltinAssetEntries();
  const base = createExplosionProject();
  const shaderId = generateUUID();
  const shaderUuid = generateUUID();
  const materialId = generateUUID();

  const shader: AssetEntry = {
    id: shaderId,
    name: 'custom-glow',
    type: 'shader',
    source: 'project',
    uri: 'project://assets/shaders/custom-glow.effect',
    meta: {
      uuid: shaderUuid,
      shaderSource: CUSTOM_SHADER_SOURCE
    }
  };

  const material: AssetEntry = {
    id: materialId,
    name: 'custom-mat',
    type: 'material',
    source: 'project',
    uri: 'project://assets/materials/custom-mat.mtl',
    meta: {
      materialDoc: {
        effect: { kind: 'shader-asset', assetId: shaderId, uuid: shaderUuid },
        techIdx: 0,
        defines: [{ USE_CUSTOM: true }],
        states: [{
          name: 'main',
          rasterizerState: { cullMode: 'none' },
          depthStencilState: {
            depthTest: false,
            depthWrite: false,
            stencilTest: true,
            stencilRef: 2
          },
          blendState: {
            targets: [{ blend: true, blendSrc: 770, blendDst: 1 }]
          }
        }],
        props: [{ tintColor: { __type__: 'cc.Color', r: 255, g: 128, b: 0, a: 255 } }]
      },
      effectUuid: shaderUuid,
      effectShaderAssetId: shaderId,
      techIdx: 0,
      blend: 'alpha'
    }
  };

  const registry = [...builtins, shader, material];
  const project: EffectProject = {
    ...base,
    assetRegistry: registry,
    root: {
      ...base.root,
      children: base.root.children.map((child) => {
        if (child.type !== 'emitter') return child;
        return {
          ...child,
          assetRefs: { ...child.assetRefs, material: materialId }
        };
      })
    }
  };

  const getAsset = (id: string) => registry.find(a => a.id === id) ?? null;
  return { project, shader, material, getAsset };
}

describe('effect-io / B4 export loop', () => {
  it('builds stable effect meta and keeps UUID across exports', () => {
    const asset: AssetEntry = {
      id: 'shader-1',
      name: 'fx',
      type: 'shader',
      source: 'project',
      uri: 'x.effect',
      meta: { uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', shaderSource: CUSTOM_SHADER_SOURCE }
    };
    const a = buildEffectExportFile(asset);
    const b = buildEffectExportFile(asset);
    expect(a.uuid).toBe(b.uuid);
    expect(a.uuid).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(JSON.parse(a.metaContent).importer).toBe('effect');
    expect(a.content).toContain('CCEffect');
    expect(buildEffectMeta(a.uuid).uuid).toBe(a.uuid);
  });

  it('ensureShaderEffectUuid stamps missing uuid once', () => {
    const asset: AssetEntry = {
      id: generateUUID(),
      name: 's',
      type: 'shader',
      source: 'project',
      uri: 'x',
      meta: { shaderSource: 'CCEffect %{}%' }
    };
    const stamped = ensureShaderEffectUuid(asset);
    expect(stamped.meta?.uuid).toBeTruthy();
    expect(resolveShaderEffectUuid(stamped)).toBe(stamped.meta!.uuid);
    expect(ensureShaderEffectUuid(stamped)).toBe(stamped);
  });

  it('exports .effect beside .mtl with matching _effectAsset UUID', () => {
    const { project, shader, getAsset } = createCustomShaderMaterialProject();
    const exported = generateProjectPrefab(project, {
      projectAssets: project.assetRegistry,
      getAsset
    });

    const effectFile = exported.assetFiles.find(f => f.fileName.endsWith('.effect'));
    const mtlFile = exported.assetFiles.find(f => f.fileName.endsWith('.mtl'));
    expect(effectFile).toBeDefined();
    expect(mtlFile).toBeDefined();

    const effectMeta = JSON.parse(effectFile!.metaContent);
    expect(effectMeta.importer).toBe('effect');
    expect(effectMeta.uuid).toBe(shader.meta!.uuid);

    const mtl = JSON.parse(mtlFile!.content);
    expect(mtl._effectAsset.__uuid__).toBe(shader.meta!.uuid);
    expect(mtl._effectAsset.__uuid__).not.toBe(BUILTIN_PARTICLE_EFFECT_UUID);
    expect(mtl._defines[0].USE_CUSTOM).toBe(true);
    expect(mtl._states[0].depthStencilState.stencilRef).toBe(2);

    const manifest = buildProjectExportManifest(project, {
      projectAssets: project.assetRegistry,
      getAsset
    });
    expect(manifest.uniqueEffectCount).toBe(1);
    expect(manifest.items.some(i => i.category === 'effect')).toBe(true);
  });

  it('import round-trip preserves materialDoc and relinks shader asset', () => {
    const { project, shader, getAsset } = createCustomShaderMaterialProject();
    const exported = generateProjectPrefab(project, {
      projectAssets: project.assetRegistry,
      getAsset
    });

    const effectFile = exported.assetFiles.find(f => f.fileName.endsWith('.effect'))!;
    const mtlFile = exported.assetFiles.find(f => f.fileName.endsWith('.mtl'))!;
    const texFile = exported.assetFiles.find(f => f.encoding === 'base64')!;

    const files = [
      { name: `${project.name}.prefab`, relativePath: `${project.name}.prefab`, content: exported.prefabContent },
      {
        name: texFile.fileName,
        relativePath: texFile.fileName,
        content: texFile.content,
        encoding: 'base64' as const
      },
      {
        name: `${texFile.fileName}.meta`,
        relativePath: `${texFile.fileName}.meta`,
        content: texFile.metaContent
      },
      { name: mtlFile.fileName, relativePath: mtlFile.fileName, content: mtlFile.content },
      {
        name: `${mtlFile.fileName}.meta`,
        relativePath: `${mtlFile.fileName}.meta`,
        content: mtlFile.metaContent
      },
      { name: effectFile.fileName, relativePath: effectFile.fileName, content: effectFile.content },
      {
        name: effectFile.metaFileName,
        relativePath: effectFile.metaFileName,
        content: effectFile.metaContent
      }
    ];

    const parsed = parsePrefabToProject(exported.prefabContent, project.name);
    const bound = bindPrefabImportAssets(parsed.project, files);

    const importedShader = bound.project.assetRegistry.find(
      a => a.type === 'shader' && a.meta?.uuid === shader.meta!.uuid
    );
    expect(importedShader).toBeDefined();
    expect(importedShader!.meta?.shaderSource).toContain('CCEffect');

    const importedMat = bound.project.assetRegistry.find(a => a.type === 'material' && a.source === 'imported');
    expect(importedMat).toBeDefined();
    const doc = getMaterialDocument(importedMat!);
    expect(doc.defines[0]?.USE_CUSTOM).toBe(true);
    expect(doc.states[0]?.depthStencilState.stencilRef).toBe(2);
    expect(doc.effect.kind).toBe('shader-asset');
    if (doc.effect.kind === 'shader-asset') {
      expect(doc.effect.assetId).toBe(importedShader!.id);
      expect(doc.effect.uuid).toBe(shader.meta!.uuid);
    }
  });
});
