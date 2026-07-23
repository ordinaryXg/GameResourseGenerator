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
  if (entry.source === 'builtin') {
    if (entry.uri.startsWith('builtin://')) {
      return entry.uri.replace('builtin://', '/assets/builtin/');
    }
    if (entry.type === 'texture' || entry.type === 'spriteFrame') {
      const cached = dataUrlCache.get(entry.id);
      if (cached) return cached;
      const shape = getBuiltinShape(entry.id);
      const url = createBuiltinTextureDataUrl(shape);
      dataUrlCache.set(entry.id, url);
      return url;
    }
  }
  if (entry.uri.startsWith('project://') && projectDir) {
    const rel = entry.uri.replace('project://', '');
    const sep = projectDir.includes('\\') ? '\\' : '/';
    return `${projectDir}${sep}${rel}`;
  }
  if (projectDir && !entry.uri.includes('://')) {
    return joinPath(projectDir, entry.uri);
  }
  return entry.uri;
}

/** Join base path with relative segments (supports `../`). */
export function joinPath(base: string, rel: string): string {
  const win = base.includes('\\');
  const sep = win ? '\\' : '/';
  const baseParts = base.replace(/\\/g, '/').replace(/\/+$/, '').split('/').filter(p => p.length > 0);
  const relParts = rel.replace(/\\/g, '/').split('/').filter(p => p.length > 0);
  const stack = [...baseParts];
  for (const part of relParts) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  let joined = stack.join(sep);
  if (win && /^[A-Za-z]:/.test(base)) {
    const drive = base.slice(0, 2);
    joined = joined.startsWith(drive) ? joined : `${drive}${sep}${joined.replace(/^[A-Za-z]:[\\/]?/, '')}`;
  }
  return joined;
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
