import type { AssetEntry } from '@/types/asset';

/** 项目内可编辑（非内置）资产 */
export function isProjectEditableAsset(asset: AssetEntry): boolean {
  return asset.source === 'imported' || asset.source === 'project';
}

export function assetSourceLabel(source: AssetEntry['source']): string {
  if (source === 'builtin') return '内置';
  if (source === 'imported') return '导入';
  return '项目';
}
