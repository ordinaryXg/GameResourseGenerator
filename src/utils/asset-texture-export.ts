import type { AssetEntry } from '@/types/asset';
import type { EmitterAssetRefs } from '@/types/asset';
import { DEFAULT_TEXTURE_ASSET_ID } from '@/data/builtin-assets';
import { getBuiltinShape } from '@/data/builtin-assets';
import {
  buildDefaultTextureExport,
  generateDefaultParticlePngBase64,
  type DefaultTextureExport
} from '@/utils/default-particle-texture';
import { generateBuiltinTexturePngBase64 } from '@/utils/builtin-texture-draw';
import { findAssetById, mergeAssetRegistries } from '@/utils/asset-resolver';
import { createBuiltinAssetEntries } from '@/data/builtin-assets';

export function buildTextureExportFromAsset(asset: AssetEntry): DefaultTextureExport {
  const baseName = asset.name.replace(/-sf$/, '').replace(/\.png$/i, '');
  let pngBase64: string;

  if (asset.uri.startsWith('data:')) {
    const comma = asset.uri.indexOf(',');
    pngBase64 = comma >= 0 ? asset.uri.slice(comma + 1) : generateDefaultParticlePngBase64();
  } else if (asset.source === 'builtin' && (asset.type === 'texture' || asset.type === 'spriteFrame')) {
    pngBase64 = generateBuiltinTexturePngBase64(getBuiltinShape(asset.id));
  } else {
    pngBase64 = generateDefaultParticlePngBase64();
  }

  const built = buildDefaultTextureExport(baseName);
  return { ...built, pngBase64, fileName: `${baseName}.png` };
}

export function resolveTextureAssetForExport(
  assetRefs: EmitterAssetRefs | undefined,
  projectAssets: AssetEntry[]
): AssetEntry {
  const registry = mergeAssetRegistries(projectAssets, createBuiltinAssetEntries());
  const textureId = assetRefs?.mainTexture ?? DEFAULT_TEXTURE_ASSET_ID;
  return findAssetById(registry, textureId)
    ?? findAssetById(registry, DEFAULT_TEXTURE_ASSET_ID)!;
}

/** Cocos particle material tech index: 0 = alpha blend, 1 = additive (typical builtin setup). */
export function resolveMaterialTechIdx(
  materialAssetId: string | undefined,
  getAsset: (id: string) => AssetEntry | null
): number {
  if (!materialAssetId) return 1;
  const mat = getAsset(materialAssetId);
  if (!mat || mat.type !== 'material') return 1;
  if (typeof mat.meta?.techIdx === 'number') return mat.meta.techIdx === 0 ? 0 : 1;
  if (mat.meta?.blend === 'alpha') return 0;
  return 1;
}

export interface ExportAssetSummary {
  textureName: string;
  textureAssetName: string;
  materialName: string;
  materialBlend: string;
}

export function buildExportAssetSummary(
  assetRefs: EmitterAssetRefs | undefined,
  projectAssets: AssetEntry[],
  getAsset: (id: string) => AssetEntry | null
): ExportAssetSummary {
  const tex = resolveTextureAssetForExport(assetRefs, projectAssets);
  const matId = assetRefs?.material;
  const mat = matId ? getAsset(matId) : null;
  return {
    textureName: `${tex.name.replace(/-sf$/, '')}.png`,
    textureAssetName: tex.name,
    materialName: mat?.name ?? 'builtin-particle-additive',
    materialBlend: mat?.meta?.blend === 'alpha' ? '透明混合' : '加法混合'
  };
}
