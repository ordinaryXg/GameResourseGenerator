import type { AssetEntry } from '@/types/asset';
import { getBuiltinShape } from '@/data/builtin-assets';
import { createBuiltinTextureDataUrl } from '@/utils/builtin-texture-draw';
import { assetCategoryIcon } from '@/data/builtin-assets';

const dataUrlCache = new Map<string, string>();

/** Resolve an asset entry to a loadable URL (data:, blob:, http:, or /assets/...). */
export function resolveAssetUrl(entry: AssetEntry, projectDir?: string | null): string {
  if (entry.uri.startsWith('data:') || entry.uri.startsWith('blob:')) {
    return entry.uri;
  }
  if (entry.source === 'builtin' && (entry.type === 'texture' || entry.type === 'spriteFrame')) {
    const cached = dataUrlCache.get(entry.id);
    if (cached) return cached;
    const shape = getBuiltinShape(entry.id);
    const url = createBuiltinTextureDataUrl(shape);
    dataUrlCache.set(entry.id, url);
    return url;
  }
  if (entry.uri.startsWith('builtin://')) {
    return entry.uri.replace('builtin://', '/assets/builtin/');
  }
  if (entry.uri.startsWith('project://') && projectDir) {
    const rel = entry.uri.replace('project://', '');
    const sep = projectDir.includes('\\') ? '\\' : '/';
    return `${projectDir}${sep}${rel}`;
  }
  if (projectDir && !entry.uri.includes('://')) {
    const sep = projectDir.includes('\\') ? '\\' : '/';
    return `${projectDir}${sep}${entry.uri}`;
  }
  return entry.uri;
}

export function invalidateAssetUrlCache(assetId?: string) {
  if (assetId) dataUrlCache.delete(assetId);
  else dataUrlCache.clear();
}

export function mergeAssetRegistries(
  projectAssets: AssetEntry[],
  builtinAssets: AssetEntry[]
): AssetEntry[] {
  const map = new Map<string, AssetEntry>();
  for (const a of builtinAssets) map.set(a.id, a);
  for (const a of projectAssets) map.set(a.id, a);
  return Array.from(map.values());
}

export function findAssetById(assets: AssetEntry[], id: string | undefined): AssetEntry | null {
  if (!id) return null;
  return assets.find(a => a.id === id) ?? null;
}
