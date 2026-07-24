import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import type { EmitterAssetRefs } from '@/types/asset';
import type { AssetEntry } from '@/types/asset';
import type { EffectProject } from '@/types/project';
import { generateUUID } from './effect-defaults';
import {
  CocosPrefabBuilder,
  buildMaterialMeta,
  buildPrefabMeta
} from './cocos-serializers';
import { buildDefaultTextureExport } from './default-particle-texture';
import {
  buildTextureExportFromAsset,
  resolveTextureAssetForExport,
  resolveMaterialTechIdx,
  buildExportAssetSummary,
  type ExportAssetSummary
} from './asset-texture-export';
import { getParticleMaterialConfig } from './particle-material';
import { getMaterialDocument, getEffectUuid, withResolvedEffectUuid } from './material-document';
import { serializeMaterialDocument } from './mtl-io';
import { getEmitterNodes } from './preview-sources';
import {
  buildEffectExportFile,
  ensureShaderEffectUuid,
  resolveShaderEffectUuid
} from './effect-io';
import type { MaterialDocument } from '@/types/material';

export interface ProjectExportAssetFile {
  fileName: string;
  content: string;
  metaFileName: string;
  metaContent: string;
  encoding?: 'base64';
}

export interface ProjectPrefabExportResult {
  prefabContent: string;
  metaContent: string;
  assetFiles: ProjectExportAssetFile[];
  emitterSummaries: ExportAssetSummary[];
  emitterCount: number;
}

export interface ProjectExportContext {
  projectAssets?: AssetEntry[];
  getAsset?: (id: string) => AssetEntry | null;
}

function sanitizeExportBaseName(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
}

function collectProjectExportBindings(
  project: EffectProject,
  ctx?: ProjectExportContext
): {
  textureByAssetId: Map<string, ReturnType<typeof buildTextureExportFromAsset>>;
  materialByKey: Map<string, {
    uuid: string;
    techIdx: number;
    spriteFrameUuid: string;
    fileBase: string;
    tintColor: { r: number; g: number; b: number; a: number };
    effectUuid: string;
    blend: 'additive' | 'alpha';
    name: string;
    materialAssetId?: string;
    materialDoc: MaterialDocument;
    shaderAssetId?: string;
  }>;
  shaderByAssetId: Map<string, AssetEntry>;
  emitterBindings: Map<string, { materialUuid: string; spriteFrameUuid: string }>;
  emitterSummaries: ExportAssetSummary[];
} {
  const getAsset = ctx?.getAsset ?? (() => null);
  const projectAssets = ctx?.projectAssets ?? project.assetRegistry;
  const emitters = getEmitterNodes(project.root);
  const textureByAssetId = new Map<string, ReturnType<typeof buildTextureExportFromAsset>>();
  const materialByKey = new Map<string, {
    uuid: string;
    techIdx: number;
    spriteFrameUuid: string;
    fileBase: string;
    tintColor: { r: number; g: number; b: number; a: number };
    effectUuid: string;
    blend: 'additive' | 'alpha';
    name: string;
    materialAssetId?: string;
    materialDoc: MaterialDocument;
    shaderAssetId?: string;
  }>();
  const shaderByAssetId = new Map<string, AssetEntry>();
  const shaderUuidCache = new Map<string, string>();
  const emitterBindings = new Map<string, { materialUuid: string; spriteFrameUuid: string }>();
  const emitterSummaries: ExportAssetSummary[] = [];

  const resolveExportEffect = (matDoc: MaterialDocument): {
    doc: MaterialDocument;
    effectUuid: string;
    shaderAssetId?: string;
  } => {
    if (matDoc.effect.kind !== 'shader-asset' || !matDoc.effect.assetId) {
      const doc = withResolvedEffectUuid(matDoc, getAsset);
      return { doc, effectUuid: getEffectUuid(doc, getAsset) };
    }
    const rawShader = getAsset(matDoc.effect.assetId);
    if (!rawShader || rawShader.type !== 'shader') {
      const doc = withResolvedEffectUuid(matDoc, getAsset);
      return { doc, effectUuid: getEffectUuid(doc, getAsset) };
    }
    let uuid = shaderUuidCache.get(rawShader.id);
    if (!uuid) {
      const stamped = ensureShaderEffectUuid(rawShader);
      uuid = resolveShaderEffectUuid(stamped);
      shaderUuidCache.set(rawShader.id, uuid);
      shaderByAssetId.set(rawShader.id, { ...stamped, meta: { ...stamped.meta, uuid } });
    }
    const doc: MaterialDocument = {
      ...matDoc,
      effect: { kind: 'shader-asset', assetId: rawShader.id, uuid }
    };
    return { doc, effectUuid: uuid, shaderAssetId: rawShader.id };
  };

  for (const emitter of emitters) {
    const texAsset = resolveTextureAssetForExport(emitter.assetRefs, projectAssets);
    if (!textureByAssetId.has(texAsset.id)) {
      textureByAssetId.set(texAsset.id, buildTextureExportFromAsset(texAsset));
    }
    const tex = textureByAssetId.get(texAsset.id)!;
    const matAsset = emitter.assetRefs.material ? getAsset(emitter.assetRefs.material) : null;
    const matConfig = getParticleMaterialConfig(matAsset);
    const rawDoc = getMaterialDocument(matAsset);
    const { doc: matDoc, effectUuid, shaderAssetId } = resolveExportEffect(rawDoc);
    // Material may override mainTexture via its own prop; otherwise use emitter texture.
    let spriteFrameUuid = tex.spriteFrameUuid;
    if (matConfig.mainTextureAssetId) {
      const matTex = resolveTextureAssetForExport(
        { mainTexture: matConfig.mainTextureAssetId },
        projectAssets
      );
      if (!textureByAssetId.has(matTex.id)) {
        textureByAssetId.set(matTex.id, buildTextureExportFromAsset(matTex));
      }
      spriteFrameUuid = textureByAssetId.get(matTex.id)!.spriteFrameUuid;
    } else if (matConfig.mainTextureUuid) {
      spriteFrameUuid = matConfig.mainTextureUuid;
    }

    const matKey = `${emitter.assetRefs.material ?? 'default'}|${spriteFrameUuid}|${JSON.stringify(matDoc)}`;
    if (!materialByKey.has(matKey)) {
      materialByKey.set(matKey, {
        uuid: generateUUID(),
        techIdx: resolveMaterialTechIdx(emitter.assetRefs.material, getAsset),
        spriteFrameUuid,
        fileBase: sanitizeExportBaseName(matAsset?.name ?? `${emitter.name}-particle`),
        tintColor: matConfig.tintColor,
        effectUuid,
        blend: matConfig.blend,
        name: matAsset?.name ?? `${emitter.name}-particle`,
        materialAssetId: matAsset?.id,
        materialDoc: matDoc,
        shaderAssetId
      });
    }
    const mat = materialByKey.get(matKey)!;
    emitterBindings.set(emitter.id, {
      materialUuid: mat.uuid,
      spriteFrameUuid: mat.spriteFrameUuid
    });
    emitterSummaries.push(buildExportAssetSummary(emitter.assetRefs, projectAssets, getAsset));
  }

  return { textureByAssetId, materialByKey, shaderByAssetId, emitterBindings, emitterSummaries };
}

export function generateProjectPrefab(
  project: EffectProject,
  ctx?: ProjectExportContext
): ProjectPrefabExportResult {
  const { textureByAssetId, materialByKey, shaderByAssetId, emitterBindings, emitterSummaries } =
    collectProjectExportBindings(project, ctx);
  const emitters = getEmitterNodes(project.root);

  const prefabContent = new CocosPrefabBuilder().buildFromTree(
    project.root,
    project.name,
    (emitter) => emitterBindings.get(emitter.id)!
  );
  const metaContent = JSON.stringify(buildPrefabMeta(project.id, project.name), null, 2);

  const assetFiles: ProjectExportAssetFile[] = [];
  const usedTextureNames = new Set<string>();
  for (const [, tex] of textureByAssetId) {
    if (usedTextureNames.has(tex.fileName)) continue;
    usedTextureNames.add(tex.fileName);
    assetFiles.push({
      fileName: tex.fileName,
      content: tex.pngBase64,
      encoding: 'base64',
      metaFileName: `${tex.fileName}.meta`,
      metaContent: tex.metaContent
    });
  }

  const usedEffectNames = new Set<string>();
  for (const [, shader] of shaderByAssetId) {
    let fileBase = sanitizeExportBaseName(shader.name);
    if (usedEffectNames.has(fileBase)) {
      let i = 2;
      while (usedEffectNames.has(`${fileBase}-${i}`)) i++;
      fileBase = `${fileBase}-${i}`;
    }
    usedEffectNames.add(fileBase);
    const effectFile = buildEffectExportFile(shader, { fileBase });
    assetFiles.push({
      fileName: effectFile.fileName,
      content: effectFile.content,
      metaFileName: effectFile.metaFileName,
      metaContent: effectFile.metaContent
    });
  }

  const usedMaterialNames = new Set<string>();
  for (const [, mat] of materialByKey) {
    let fileBase = mat.fileBase;
    if (usedMaterialNames.has(fileBase)) {
      let i = 2;
      while (usedMaterialNames.has(`${fileBase}-${i}`)) i++;
      fileBase = `${fileBase}-${i}`;
    }
    usedMaterialNames.add(fileBase);
    const mtlJson = serializeMaterialDocument(mat.materialDoc, {
      name: mat.name,
      mainTextureUuid: mat.spriteFrameUuid
    });
    assetFiles.push({
      fileName: `${fileBase}.mtl`,
      content: JSON.stringify(mtlJson, null, 2),
      metaFileName: `${fileBase}.mtl.meta`,
      metaContent: JSON.stringify(buildMaterialMeta(mat.uuid), null, 2)
    });
  }

  return {
    prefabContent,
    metaContent,
    assetFiles,
    emitterSummaries,
    emitterCount: emitters.length
  };
}

export type ExportManifestCategory = 'prefab' | 'texture' | 'material' | 'effect';

export interface ExportManifestItem {
  category: ExportManifestCategory;
  fileName: string;
  metaFileName: string;
  detail?: string;
}

export interface ProjectExportManifest {
  prefabName: string;
  targetSubdir: string;
  items: ExportManifestItem[];
  emitterSummaries: ExportAssetSummary[];
  emitterCount: number;
  uniqueTextureCount: number;
  uniqueMaterialCount: number;
  uniqueEffectCount: number;
  totalFileCount: number;
}

/** 导出前资产/文件清单（供 ExportModal 与测试使用）。 */
export function buildProjectExportManifest(
  project: EffectProject,
  ctx?: ProjectExportContext
): ProjectExportManifest {
  const preview = generateProjectPrefab(project, ctx);
  const items: ExportManifestItem[] = [
    {
      category: 'prefab',
      fileName: `${project.name}.prefab`,
      metaFileName: `${project.name}.prefab.meta`,
      detail: `${preview.emitterCount} 个 ParticleSystem`
    }
  ];

  let textureCount = 0;
  let materialCount = 0;
  let effectCount = 0;
  for (const asset of preview.assetFiles) {
    if (asset.fileName.endsWith('.mtl')) {
      materialCount += 1;
      items.push({
        category: 'material',
        fileName: asset.fileName,
        metaFileName: asset.metaFileName,
        detail: '粒子材质'
      });
    } else if (asset.fileName.endsWith('.effect')) {
      effectCount += 1;
      items.push({
        category: 'effect',
        fileName: asset.fileName,
        metaFileName: asset.metaFileName,
        detail: '自定义 Effect'
      });
    } else {
      textureCount += 1;
      items.push({
        category: 'texture',
        fileName: asset.fileName,
        metaFileName: asset.metaFileName,
        detail: '主贴图'
      });
    }
  }

  return {
    prefabName: project.name,
    targetSubdir: `assets/effects/${project.id}/`,
    items,
    emitterSummaries: preview.emitterSummaries,
    emitterCount: preview.emitterCount,
    uniqueTextureCount: textureCount,
    uniqueMaterialCount: materialCount,
    uniqueEffectCount: effectCount,
    totalFileCount: items.reduce((n, item) => n + 2, 0)
  };
}

export async function exportProjectToCocos(
  project: EffectProject,
  projectPath: string,
  ctx?: ProjectExportContext
): Promise<{ success: boolean; paths: string[]; error?: string }> {
  const { prefabContent, metaContent, assetFiles } = generateProjectPrefab(project, ctx);
  const targetDir = `${projectPath}/assets/effects/${project.id}`;
  const prefabPath = `${targetDir}/${project.name}.prefab`;
  const metaPath = `${targetDir}/${project.name}.prefab.meta`;

  const writes: Array<{ path: string; content: string; encoding?: 'base64' | 'utf8' }> = [
    { path: prefabPath, content: prefabContent },
    { path: metaPath, content: metaContent },
    ...assetFiles.flatMap(a => [
      { path: `${targetDir}/${a.fileName}`, content: a.content, encoding: a.encoding },
      { path: `${targetDir}/${a.metaFileName}`, content: a.metaContent }
    ])
  ];

  try {
    if (window.electronAPI) {
      const results = await window.electronAPI.writeExportFiles(writes);
      const paths: string[] = [];
      let hasError = false;
      let errorMsg = '';
      for (const r of results) {
        if (r.success) paths.push(r.path);
        else { hasError = true; errorMsg = r.error || 'Unknown error'; }
      }
      return { success: !hasError, paths, error: hasError ? errorMsg : undefined };
    }

    downloadFile(`${project.name}.prefab`, prefabContent);
    downloadFile(`${project.name}.prefab.meta`, metaContent);
    for (const asset of assetFiles) {
      if (asset.encoding === 'base64') downloadTexture(asset.fileName, asset.content);
      else downloadFile(asset.fileName, asset.content);
      downloadFile(asset.metaFileName, asset.metaContent);
    }
    return {
      success: true,
      paths: [`${project.name}.prefab`, ...assetFiles.map(a => a.fileName)]
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, paths: [], error: msg };
  }
}

export interface PrefabExportResult {
  prefabContent: string;
  metaContent: string;
  materialContent: string;
  materialMetaContent: string;
  textureFileName: string;
  textureMetaContent: string;
  texturePngBase64: string;
}

export interface PrefabExportContext {
  assetRefs?: EmitterAssetRefs;
  projectAssets?: AssetEntry[];
  getAsset?: (id: string) => AssetEntry | null;
}

export function generatePrefab(effectConfig: EffectConfig, ctx?: PrefabExportContext): PrefabExportResult {
  const config = effectConfig.config as Particle3DConfig;
  const name = effectConfig.name;
  const prefabUuid = effectConfig.id;
  const materialUuid = generateUUID();

  const getAsset = ctx?.getAsset ?? (() => null);
  const textureAsset = ctx
    ? resolveTextureAssetForExport(ctx.assetRefs, ctx.projectAssets ?? [])
    : null;
  const texture = textureAsset
    ? buildTextureExportFromAsset(textureAsset)
    : buildDefaultTextureExport('particle-circle');

  const techIdx = resolveMaterialTechIdx(ctx?.assetRefs?.material, getAsset);
  const matAsset = ctx?.assetRefs?.material ? getAsset(ctx.assetRefs.material) : null;
  const matConfig = getParticleMaterialConfig(matAsset);
  const matDoc = getMaterialDocument(matAsset);

  const prefabContent = new CocosPrefabBuilder().build(
    config, name, materialUuid, texture.spriteFrameUuid
  );
  const metaContent = JSON.stringify(buildPrefabMeta(prefabUuid, name), null, 2);
  const materialContent = JSON.stringify(
    serializeMaterialDocument(matDoc, {
      name: matAsset?.name ?? `${name}-particle`,
      mainTextureUuid: matConfig.mainTextureUuid ?? texture.spriteFrameUuid
    }),
    null,
    2
  );
  const materialMetaContent = JSON.stringify(buildMaterialMeta(materialUuid), null, 2);

  return {
    prefabContent,
    metaContent,
    materialContent,
    materialMetaContent,
    textureFileName: texture.fileName,
    textureMetaContent: texture.metaContent,
    texturePngBase64: texture.pngBase64
  };
}

export async function exportToCocosProject(
  effectConfig: EffectConfig,
  projectPath: string,
  ctx?: PrefabExportContext
): Promise<{ success: boolean; paths: string[]; error?: string }> {
  const {
    prefabContent, metaContent, materialContent, materialMetaContent,
    textureFileName, textureMetaContent, texturePngBase64
  } = generatePrefab(effectConfig, ctx);
  const uuid = effectConfig.id;
  const name = effectConfig.name;
  const materialName = `${name}-particle`;
  const targetDir = `${projectPath}/assets/effects/${uuid}`;
  const prefabPath = `${targetDir}/${name}.prefab`;
  const metaPath = `${targetDir}/${name}.prefab.meta`;
  const mtlPath = `${targetDir}/${materialName}.mtl`;
  const mtlMetaPath = `${targetDir}/${materialName}.mtl.meta`;
  const texPath = `${targetDir}/${textureFileName}`;
  const texMetaPath = `${targetDir}/${textureFileName}.meta`;

  try {
    if (window.electronAPI) {
      const results = await window.electronAPI.writeExportFiles([
        { path: prefabPath, content: prefabContent },
        { path: metaPath, content: metaContent },
        { path: mtlPath, content: materialContent },
        { path: mtlMetaPath, content: materialMetaContent },
        { path: texPath, content: texturePngBase64, encoding: 'base64' },
        { path: texMetaPath, content: textureMetaContent }
      ]);

      const paths: string[] = [];
      let hasError = false;
      let errorMsg = '';

      for (const r of results) {
        if (r.success) paths.push(r.path);
        else { hasError = true; errorMsg = r.error || 'Unknown error'; }
      }

      return { success: !hasError, paths, error: hasError ? errorMsg : undefined };
    }

    downloadFile(`${name}.prefab`, prefabContent);
    downloadFile(`${name}.prefab.meta`, metaContent);
    downloadFile(`${materialName}.mtl`, materialContent);
    downloadFile(`${materialName}.mtl.meta`, materialMetaContent);
    downloadTexture(`${textureFileName}`, texturePngBase64);
    downloadFile(`${textureFileName}.meta`, textureMetaContent);
    return { success: true, paths: [`${name}.prefab`, `${materialName}.mtl`, textureFileName] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, paths: [], error: msg };
  }
}

function downloadTexture(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}