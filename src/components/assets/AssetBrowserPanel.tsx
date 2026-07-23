import React, { useMemo, useState } from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import type { AssetEntry } from '@/types/asset';

interface AssetBrowserPanelProps {
  onSelectTexture?: (asset: AssetEntry) => void;
  selectedAssetId?: string | null;
}

export const AssetBrowserPanel: React.FC<AssetBrowserPanelProps> = ({
  onSelectTexture,
  selectedAssetId
}) => {
  const [filter, setFilter] = useState('');
  const [sourceTab, setSourceTab] = useState<'all' | 'builtin' | 'project'>('all');
  const projectDir = useProjectStore(s => s.projectDir);
  const getMergedAssets = useAssetStore(s => s.getMergedAssets);

  const textures = useMemo(() => {
    let list = getMergedAssets().filter(a => a.type === 'texture');
    if (sourceTab === 'builtin') list = list.filter(a => a.source === 'builtin');
    if (sourceTab === 'project') list = list.filter(a => a.source !== 'builtin');
    const q = filter.trim().toLowerCase();
    if (q) list = list.filter(a => a.name.toLowerCase().includes(q));
    return list;
  }, [getMergedAssets, filter, sourceTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="panel-header" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>资产浏览器</span>
        <div style={{ flex: 1 }} />
        {(['all', 'builtin', 'project'] as const).map(tab => (
          <button
            key={tab}
            className={`btn-sm${sourceTab === tab ? ' active' : ''}`}
            onClick={() => setSourceTab(tab)}
            style={{ fontSize: 11 }}
          >
            {tab === 'all' ? '全部' : tab === 'builtin' ? '内置' : '项目'}
          </button>
        ))}
        <input
          type="search"
          placeholder="搜索贴图..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 120, fontSize: 11, padding: '2px 6px' }}
        />
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        gap: 8,
        alignContent: 'start'
      }}>
        {textures.map(asset => {
          const thumb = getAssetThumbnailUrl(asset, projectDir, 64);
          const selected = selectedAssetId === asset.id;
          return (
            <button
              key={asset.id}
              type="button"
              title={asset.name}
              onClick={() => onSelectTexture?.(asset)}
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
                minWidth: 0
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 4,
                background: '#1a1a22',
                backgroundImage: thumb ? `url(${thumb})` : undefined,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }} />
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
            </button>
          );
        })}
        {textures.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: 16 }}>
            无匹配贴图
          </div>
        )}
      </div>
    </div>
  );
};
