import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import { resolveAssetUrl, invalidateAssetUrlCache } from '@/utils/asset-resolver';
import { invalidateThumbnailCache } from '@/utils/asset-thumbnail';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import { isTextureImageFile, loadImageDimensions, readTextureFileAsDataUrl } from '@/utils/texture-image';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';

interface TextureAssetEditorProps {
  asset: AssetEntry;
}

export const TextureAssetEditor: React.FC<TextureAssetEditorProps> = ({ asset }) => {
  const projectDir = useProjectStore(s => s.projectDir);
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const { showToastMessage } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = isProjectEditableAsset(asset);
  const [name, setName] = useState(asset.name);

  useEffect(() => {
    setName(asset.name);
  }, [asset.id, asset.name]);

  const thumbUrl = getAssetThumbnailUrl(asset, projectDir, 200);
  const fullUrl = resolveAssetUrl(asset, projectDir);

  const commitName = useCallback(() => {
    const v = name.trim();
    if (!v || v === asset.name || !editable) return;
    updateProjectAsset(asset.id, { name: v });
    showToastMessage('已更新贴图名称');
  }, [name, asset.id, asset.name, editable, updateProjectAsset, showToastMessage]);

  const handleReplace = useCallback(async (file: File) => {
    if (!editable) return;
    if (!isTextureImageFile(file)) {
      showToastMessage('仅支持 PNG / JPG / WebP');
      return;
    }
    try {
      const dataUrl = await readTextureFileAsDataUrl(file);
      const dims = await loadImageDimensions(dataUrl);
      updateProjectAsset(asset.id, {
        uri: dataUrl,
        meta: { ...asset.meta, width: dims.width, height: dims.height }
      });
      invalidateAssetUrlCache(asset.id);
      invalidateThumbnailCache();
      showToastMessage('已替换贴图');
    } catch {
      showToastMessage('替换失败');
    }
  }, [asset, editable, updateProjectAsset, showToastMessage]);

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="预览">
        <div style={{
          width: '100%',
          maxWidth: 200,
          aspectRatio: '1',
          margin: '0 auto',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          background: '#12121a',
          backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />
        {asset.meta?.width && asset.meta?.height && (
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-secondary)', marginTop: 6 }}>
            {asset.meta.width} × {asset.meta.height} px
          </div>
        )}
        {asset.meta?.shape && (
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
            形状：{asset.meta.shape}
          </div>
        )}
      </AssetEditorSection>

      {editable && (
        <AssetEditorSection title="编辑">
          <FieldLabel label="名称">
            <input
              style={textInputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }}
            />
          </FieldLabel>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void handleReplace(f);
            }}
          />
          <button type="button" className="btn-sm" style={{ fontSize: 11 }} onClick={() => fileRef.current?.click()}>
            替换贴图…
          </button>
        </AssetEditorSection>
      )}

      <AssetMetaFields asset={asset} fullUrl={fullUrl} />
    </div>
  );
};
