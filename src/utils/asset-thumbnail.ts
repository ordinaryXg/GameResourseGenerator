import type { AssetEntry } from '@/types/asset';
import { resolveAssetUrl } from '@/utils/asset-resolver';
import { assetCategoryIcon } from '@/data/builtin-assets';

const thumbCache = new Map<string, string>();

export function getAssetThumbnailUrl(
  entry: AssetEntry,
  projectDir?: string | null,
  size = 64
): string {
  const key = `${entry.id}@${size}`;
  const cached = thumbCache.get(key);
  if (cached) return cached;

  if (entry.type === 'texture' || entry.type === 'spriteFrame') {
    const url = resolveAssetUrl(entry, projectDir);
    thumbCache.set(key, url);
    return url;
  }

  // Non-image assets: procedural placeholder for grid display
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#404050';
    ctx.strokeRect(4, 4, size - 8, size - 8);
    ctx.fillStyle = '#8b949e';
    ctx.font = `${Math.floor(size * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(assetCategoryIcon(entry.type), size / 2, size / 2);
    const url = canvas.toDataURL('image/png');
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
