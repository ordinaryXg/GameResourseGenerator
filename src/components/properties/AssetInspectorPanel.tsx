import React from 'react';
import { useAssetStore } from '@/stores/asset-store';
import type { AssetEntry } from '@/types/asset';
import { AssetEditorActions } from '@/components/properties/editors/AssetEditorActions';
import { TextureAssetEditor } from '@/components/properties/editors/TextureAssetEditor';
import { SpriteFrameAssetEditor } from '@/components/properties/editors/SpriteFrameAssetEditor';
import { MaterialAssetEditor } from '@/components/properties/editors/MaterialAssetEditor';
import { ShaderAssetEditor } from '@/components/properties/editors/ShaderAssetEditor';
import { MeshAssetEditor } from '@/components/properties/editors/MeshAssetEditor';

interface AssetInspectorPanelProps {
  assetId: string;
  onApplyAsset?: (asset: AssetEntry) => void;
}

function renderAssetEditor(asset: AssetEntry) {
  switch (asset.type) {
    case 'texture':
      return <TextureAssetEditor key={asset.id} asset={asset} />;
    case 'spriteFrame':
      return <SpriteFrameAssetEditor key={asset.id} asset={asset} />;
    case 'material':
      return <MaterialAssetEditor key={asset.id} asset={asset} />;
    case 'shader':
      return <ShaderAssetEditor key={asset.id} asset={asset} />;
    case 'mesh':
      return <MeshAssetEditor key={asset.id} asset={asset} />;
    default:
      return null;
  }
}

export const AssetInspectorPanel: React.FC<AssetInspectorPanelProps> = ({ assetId, onApplyAsset }) => {
  const getAssetById = useAssetStore(s => s.getAssetById);
  const asset = getAssetById(assetId);

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
        {renderAssetEditor(asset)}
      </div>
    </div>
  );
};
