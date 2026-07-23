import React from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import { DEFAULT_TEXTURE_ASSET_ID } from '@/data/builtin-assets';

interface AssetSlotProps {
  label: string;
  assetId?: string;
  onChange: (assetId: string | undefined) => void;
  onBrowse?: () => void;
}

export const AssetSlot: React.FC<AssetSlotProps> = ({
  label,
  assetId,
  onChange,
  onBrowse
}) => {
  const projectDir = useProjectStore(s => s.projectDir);
  const getAssetById = useAssetStore(s => s.getAssetById);
  const entry = getAssetById(assetId);
  const thumb = entry ? getAssetThumbnailUrl(entry, projectDir, 48) : '';

  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 4,
          border: '1px solid var(--border-color)',
          background: '#1a1a22',
          backgroundImage: thumb ? `url(${thumb})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry?.name ?? '未指定'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {entry?.source === 'builtin' ? '内置' : entry?.source === 'imported' ? '导入' : '项目'}
          </div>
        </div>
        {onBrowse && (
          <button type="button" className="btn-sm" onClick={onBrowse} style={{ fontSize: 11 }}>
            选择
          </button>
        )}
        <button
          type="button"
          className="btn-sm"
          onClick={() => onChange(DEFAULT_TEXTURE_ASSET_ID)}
          style={{ fontSize: 11 }}
          title="恢复默认圆点贴图"
        >
          默认
        </button>
        {assetId && assetId !== DEFAULT_TEXTURE_ASSET_ID && (
          <button
            type="button"
            className="btn-sm"
            onClick={() => onChange(undefined)}
            style={{ fontSize: 11 }}
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
};
