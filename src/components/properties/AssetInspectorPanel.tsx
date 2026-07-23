import React from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import type { AssetEntry } from '@/types/asset';
import { AssetDetailPanel } from '@/components/assets/AssetDetailPanel';
import { AssetEditorActions } from '@/components/properties/editors/AssetEditorActions';

interface AssetInspectorPanelProps {
  assetId: string;
  onApplyAsset?: (asset: AssetEntry) => void;
}

export const AssetInspectorPanel: React.FC<AssetInspectorPanelProps> = ({ assetId, onApplyAsset }) => {
  const projectDir = useProjectStore(s => s.projectDir);
  const getAssetById = useAssetStore(s => s.getAssetById);
  const asset = getAssetById(assetId);
  const linkedTextureName = asset?.meta?.textureId
    ? getAssetById(String(asset.meta.textureId))?.name
    : undefined;

  if (!asset) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
        fontSize: 13,
        padding: 16,
        textAlign: 'center'
      }}>
        资产不存在或已被删除
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <AssetEditorActions asset={asset} onApplyAsset={onApplyAsset} />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <AssetDetailPanel
          asset={asset}
          projectDir={projectDir}
          linkedTextureName={linkedTextureName}
          embedded
        />
      </div>
    </div>
  );
};
