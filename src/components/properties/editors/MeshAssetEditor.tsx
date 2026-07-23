import React, { useCallback, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { MeshPreviewView } from '@/components/assets/MeshPreviewView';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';

interface MeshAssetEditorProps {
  asset: AssetEntry;
}

export const MeshAssetEditor: React.FC<MeshAssetEditorProps> = ({ asset }) => {
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const { showToastMessage } = useAppStore();
  const editable = isProjectEditableAsset(asset);
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.meta?.description ?? '');

  const commitName = useCallback(() => {
    const v = name.trim();
    if (!v || v === asset.name || !editable) return;
    updateProjectAsset(asset.id, { name: v });
    showToastMessage('已更新名称');
  }, [name, asset.id, asset.name, editable, updateProjectAsset, showToastMessage]);

  const commitDescription = useCallback(() => {
    if (!editable) return;
    updateProjectAsset(asset.id, { meta: { ...asset.meta, description: description.trim() } });
  }, [asset, description, editable, updateProjectAsset]);

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="3D 预览">
        <MeshPreviewView asset={asset} />
      </AssetEditorSection>

      <AssetEditorSection title="网格信息">
        {editable && (
          <>
            <FieldLabel label="名称">
              <input
                style={textInputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
              />
            </FieldLabel>
            <FieldLabel label="说明">
              <textarea
                style={{ ...textInputStyle, minHeight: 48, resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={commitDescription}
              />
            </FieldLabel>
          </>
        )}
        {asset.meta?.category && (
          <div style={{ fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>分类：</span>{asset.meta.category}
          </div>
        )}
        {!editable && asset.meta?.description && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {asset.meta.description}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>
          用于粒子渲染模式 Mesh；导出时引用 .mesh 资源。
        </p>
      </AssetEditorSection>

      <AssetMetaFields asset={asset} />
    </div>
  );
};
