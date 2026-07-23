import type { AssetEntry } from '@/types/asset';
import { generateUUID } from '@/utils/effect-defaults';

export function patchAssetInRegistry(
  registry: AssetEntry[],
  assetId: string,
  patch: Partial<AssetEntry> | ((asset: AssetEntry) => AssetEntry)
): AssetEntry[] {
  return registry.map(a => {
    if (a.id !== assetId) return a;
    if (typeof patch === 'function') return patch(a);
    return { ...a, ...patch, meta: patch.meta ? { ...a.meta, ...patch.meta } : a.meta };
  });
}

export function duplicateAssetEntry(source: AssetEntry, nameSuffix = ' (副本)'): AssetEntry {
  return {
    ...JSON.parse(JSON.stringify(source)) as AssetEntry,
    id: generateUUID(),
    name: `${source.name}${nameSuffix}`,
    source: 'project'
  };
}

export function findProjectAsset(registry: AssetEntry[], assetId: string): AssetEntry | undefined {
  return registry.find(a => a.id === assetId);
}
