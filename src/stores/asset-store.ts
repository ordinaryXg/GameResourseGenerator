import { create } from 'zustand';
import type { AssetEntry, AssetType } from '@/types/asset';
import { createBuiltinAssetEntries } from '@/data/builtin-assets';
import { mergeAssetRegistries } from '@/utils/asset-resolver';

interface AssetStoreState {
  projectAssets: AssetEntry[];
  setProjectAssets: (assets: AssetEntry[]) => void;
  getMergedAssets: () => AssetEntry[];
  getAssetById: (id: string | undefined) => AssetEntry | null;
  getAssetsByType: (type: AssetType) => AssetEntry[];
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  projectAssets: [],

  setProjectAssets: (assets) => set({ projectAssets: assets }),

  getMergedAssets: () => mergeAssetRegistries(get().projectAssets, createBuiltinAssetEntries()),

  getAssetById: (id) => {
    if (!id) return null;
    return get().getMergedAssets().find(a => a.id === id) ?? null;
  },

  getAssetsByType: (type) => get().getMergedAssets().filter(a => a.type === type)
}));

export function syncAssetStoreFromProject(assetRegistry: AssetEntry[]) {
  useAssetStore.getState().setProjectAssets(
    assetRegistry.filter(a => a.source !== 'builtin')
  );
}
