import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import type { EmitterAssetRefs } from '@/types/asset';
import type { AssetEntry } from '@/types/asset';
import { generateUUID } from './effect-defaults';
import {
  CocosPrefabBuilder,
  buildParticleMaterial,
  buildMaterialMeta,
  buildPrefabMeta
} from './cocos-serializers';
import { buildDefaultTextureExport } from './default-particle-texture';
import {
  buildTextureExportFromAsset,
  resolveTextureAssetForExport,
  resolveMaterialTechIdx
} from './asset-texture-export';

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

  const prefabContent = new CocosPrefabBuilder().build(
    config, name, materialUuid, texture.spriteFrameUuid
  );
  const metaContent = JSON.stringify(buildPrefabMeta(prefabUuid, name), null, 2);
  const materialContent = JSON.stringify(
    buildParticleMaterial(texture.spriteFrameUuid, techIdx), null, 2
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