import React, { useMemo, useState, useCallback } from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import type { AssetEntry, AssetType } from '@/types/asset';
import {
  ASSET_CATEGORY_OPTIONS,
  assetCategoryIcon
} from '@/data/builtin-assets';
import { assetTypeLabel, writeAssetDragData } from '@/utils/asset-dnd';
import { AssetDetailPanel } from '@/components/assets/AssetDetailPanel';

interface AssetBrowserPanelProps {
  onApplyAsset?: (asset: AssetEntry) => void;
}

export const AssetBrowserPanel: React.FC<AssetBrowserPanelProps> = ({
  onApplyAsset
}) => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState<AssetType | 'all'>('all');
  const [sourceTab, setSourceTab] = useState<'all' | 'builtin' | 'project'>('all');
  const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null);
  const projectDir = useProjectStore(s => s.projectDir);
  const getMergedAssets = useAssetStore(s => s.getMergedAssets);
  const getAssetById = useAssetStore(s => s.getAssetById);

  const assets = useMemo(() => {
    let list = getMergedAssets();
    if (category !== 'all') list = list.filter(a => a.type === category);
    if (sourceTab === 'builtin') list = list.filter(a => a.source === 'builtin');
    if (sourceTab === 'project') list = list.filter(a => a.source !== 'builtin');
    const q = filter.trim().toLowerCase();
    if (q) list = list.filter(a => a.name.toLowerCase().includes(q) || assetTypeLabel(a.type).includes(q));
    return list;
  }, [getMergedAssets, filter, sourceTab, category]);

  const focusedAsset = focusedAssetId ? getAssetById(focusedAssetId) : null;
  const linkedTextureName = focusedAsset?.meta?.textureId
    ? getAssetById(String(focusedAsset.meta.textureId))?.name
    : undefined;

  const handleDragStart = useCallback((e: React.DragEvent, asset: AssetEntry) => {
    writeAssetDragData(e.dataTransfer, { id: asset.id, type: asset.type, name: asset.name });
    e.dataTransfer.setData('text/plain', asset.name);
  }, []);

  const handleSelect = useCallback((asset: AssetEntry) => {
    setFocusedAssetId(asset.id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="panel-header" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>资产浏览器</span>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>单击查看 · 拖拽到槽位 · 双击应用</span>
        <div style={{ flex: 1 }} />
        {(['all', 'builtin', 'project'] as const).map(tab => (
          <button
            key={tab}
            className={`btn-sm${sourceTab === tab ? ' active' : ''}`}
            onClick={() => setSourceTab(tab)}
            style={{ fontSize: 11 }}
          >
            {tab === 'all' ? '全部来源' : tab === 'builtin' ? '内置' : '项目'}
          </button>
        ))}
        <input
          type="search"
          placeholder="搜索..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 100, fontSize: 11, padding: '2px 6px' }}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{
          width: 72,
          flexShrink: 0,
          borderRight: '1px solid var(--border-color)',
          padding: '6px 4px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {ASSET_CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`btn-sm${category === opt.id ? ' active' : ''}`}
              onClick={() => setCategory(opt.id)}
              style={{ fontSize: 10, textAlign: 'left', padding: '4px 6px', width: '100%' }}
              title={opt.id === 'spriteFrame' ? 'Cocos SpriteFrame，导出时引用子资源' : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: 8,
          alignContent: 'start'
        }}>
          {assets.map(asset => {
            const thumb = getAssetThumbnailUrl(asset, projectDir, 64);
            const selected = focusedAssetId === asset.id;
            return (
              <div
                key={asset.id}
                draggable
                onClick={() => handleSelect(asset)}
                onDragStart={(e) => handleDragStart(e, asset)}
                onDoubleClick={() => onApplyAsset?.(asset)}
                title={`${asset.name}\n单击查看属性 · 拖拽到 Inspector · 双击应用`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: 6,
                  borderRadius: 6,
                  border: selected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  background: selected ? 'rgba(88,166,255,0.12)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  minWidth: 0,
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 4,
                  background: '#1a1a22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: asset.type === 'texture' || asset.type === 'spriteFrame' ? undefined : 22,
                  backgroundImage: thumb ? `url(${thumb})` : undefined,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  {!(asset.type === 'texture' || asset.type === 'spriteFrame') && assetCategoryIcon(asset.type)}
                </div>
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  textAlign: 'center'
                }}>
                  {asset.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.75 }}>
                  {assetTypeLabel(asset.type)}
                </span>
              </div>
            );
          })}
          {assets.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: 16 }}>
              无匹配资产
            </div>
          )}
        </div>

        <AssetDetailPanel
          asset={focusedAsset}
          projectDir={projectDir}
          linkedTextureName={linkedTextureName}
        />
      </div>
    </div>
  );
};
