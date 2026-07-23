import type { AssetEntry } from '@/types/asset';
import { resolveAssetUrl } from '@/utils/asset-resolver';

const thumbCache = new Map<string, string>();

export function getAssetThumbnailUrl(
  entry: AssetEntry,
  projectDir?: string | null,
  size = 64
): string {
  const key = `${entry.id}@${size}`;
  const cached = thumbCache.get(key);
  if (cached) return cached;

  if (entry.type === 'texture') {
    const url = resolveAssetUrl(entry, projectDir);
    thumbCache.set(key, url);
    return url;
  }
  return '';
}

export function invalidateThumbnailCache(assetId?: string) {
  if (!assetId) {
    thumbCache.clear();
    return;
  }
  for (const key of thumbCache.keys()) {
    if (key.startsWith(`${assetId}@`)) thumbCache.delete(key);
  }
}
