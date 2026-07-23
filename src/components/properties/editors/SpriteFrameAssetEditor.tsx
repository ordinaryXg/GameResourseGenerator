import React, { useCallback, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import { resolveAssetUrl } from '@/utils/asset-resolver';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';

interface SpriteFrameAssetEditorProps {
  asset: AssetEntry;
}

export const SpriteFrameAssetEditor: React.FC<SpriteFrameAssetEditorProps> = ({ asset }) => {
  const projectDir = useProjectStore(s => s.projectDir);
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const getAssetById = useAssetStore(s => s.getAssetById);
  const selectAssetForInspector = useAppStore(s => s.selectAssetForInspector);
  const { showToastMessage } = useAppStore();
  const editable = isProjectEditableAsset(asset);
  const [name, setName] = useState(asset.name);

  const linkedTexture = asset.meta?.textureId ? getAssetById(String(asset.meta.textureId)) : null;
  const thumbUrl = linkedTexture
    ? getAssetThumbnailUrl(linkedTexture, projectDir, 120)
    : getAssetThumbnailUrl(asset, projectDir, 120);

  const commitName = useCallback(() => {
    const v = name.trim();
    if (!v || v === asset.name || !editable) return;
    updateProjectAsset(asset.id, { name: v });
    showToastMessage('已更新名称');
  }, [name, asset.id, asset.name, editable, updateProjectAsset, showToastMessage]);

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="预览">
        <div style={{
          width: 120,
          height: 120,
          margin: '0 auto',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          background: '#12121a',
          backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />
      </AssetEditorSection>

      <AssetEditorSection title="精灵帧">
        {editable && (
          <FieldLabel label="名称">
            <input
              style={textInputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }}
            />
          </FieldLabel>
        )}
        {linkedTexture ? (
          <div style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>关联贴图：</span>
            <button
              type="button"
              className="btn-sm"
              style={{ fontSize: 10, marginLeft: 4 }}
              onClick={() => selectAssetForInspector(linkedTexture.id)}
            >
              {linkedTexture.name}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>无关联贴图</div>
        )}
        {asset.meta?.shape && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
            形状：{asset.meta.shape}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>
          导出时引用 Cocos SpriteFrame 子资源；预览使用底层贴图。
        </p>
      </AssetEditorSection>

      <AssetMetaFields asset={asset} fullUrl={resolveAssetUrl(asset, projectDir)} />
    </div>
  );
};
