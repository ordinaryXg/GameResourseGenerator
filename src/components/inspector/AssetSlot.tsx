import React, { useState, useCallback } from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import { DEFAULT_TEXTURE_ASSET_ID } from '@/data/builtin-assets';
import type { AssetType } from '@/types/asset';
import {
  assetTypeAcceptsSlot,
  assetTypeLabel,
  readAssetDragData
} from '@/utils/asset-dnd';
import { assetCategoryIcon } from '@/data/builtin-assets';
import { assetToEmitterRefsPatch } from '@/utils/asset-apply';

export type AssetSlotKind = 'mainTexture' | 'material' | 'mesh';

interface AssetSlotProps {
  label: string;
  slot: AssetSlotKind;
  assetId?: string;
  onChange: (assetId: string | undefined) => void;
  defaultAssetId?: string;
}

export const AssetSlot: React.FC<AssetSlotProps> = ({
  label,
  slot,
  assetId,
  onChange,
  defaultAssetId = DEFAULT_TEXTURE_ASSET_ID
}) => {
  const [dragOver, setDragOver] = useState(false);
  const projectDir = useProjectStore(s => s.projectDir);
  const getAssetById = useAssetStore(s => s.getAssetById);
  const entry = getAssetById(assetId);
  const thumb = entry && (entry.type === 'texture' || entry.type === 'spriteFrame')
    ? getAssetThumbnailUrl(entry, projectDir, 48)
    : '';

  const acceptTypes: AssetType[] = slot === 'mainTexture'
    ? ['texture', 'spriteFrame']
    : slot === 'material'
      ? ['material']
      : ['mesh'];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const payload = readAssetDragData(e.dataTransfer);
    if (payload && assetTypeAcceptsSlot(payload.type, slot)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    }
  }, [slot]);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const payload = readAssetDragData(e.dataTransfer);
    if (!payload || !assetTypeAcceptsSlot(payload.type, slot)) return;
    const asset = getAssetById(payload.id);
    if (!asset) return;
    const patch = assetToEmitterRefsPatch(asset);
    if (!patch) return;
    if (slot === 'mainTexture' && patch.mainTexture !== undefined) onChange(patch.mainTexture);
    else if (slot === 'material' && patch.material !== undefined) onChange(patch.material);
    else if (slot === 'mesh' && patch.mesh !== undefined) onChange(patch.mesh);
  }, [slot, onChange, getAssetById]);

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 8,
          borderRadius: 6,
          border: dragOver
            ? '2px dashed var(--accent)'
            : '1px dashed var(--border-color)',
          background: dragOver ? 'rgba(88,166,255,0.1)' : 'var(--bg-secondary)',
          transition: 'border-color 0.15s, background 0.15s'
        }}
      >
        <div style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 4,
          border: '1px solid var(--border-color)',
          background: '#1a1a22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          backgroundImage: thumb ? `url(${thumb})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          color: 'var(--text-secondary)'
        }}>
          {entry && !thumb && assetCategoryIcon(entry.type)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry?.name ?? '拖入资产或双击浏览器项'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {entry
              ? `${entry.source === 'builtin' ? '内置' : entry.source === 'imported' ? '导入' : '项目'} · ${assetTypeLabel(entry.type)}`
              : `接受：${acceptTypes.map(assetTypeLabel).join(' / ')}`}
          </div>
        </div>
        <button
          type="button"
          className="btn-sm"
          onClick={() => onChange(defaultAssetId)}
          style={{ fontSize: 11 }}
          title="恢复默认"
        >
          默认
        </button>
        {assetId && assetId !== defaultAssetId && (
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
