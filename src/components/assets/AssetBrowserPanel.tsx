import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAssetStore } from '@/stores/asset-store';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { ContextMenu } from '@/components/layout/ContextMenu';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import type { AssetEntry, AssetType } from '@/types/asset';
import {
  ASSET_CATEGORY_OPTIONS,
  assetCategoryIcon
} from '@/data/builtin-assets';
import { assetTypeLabel, writeAssetDragData } from '@/utils/asset-dnd';
import { openAssetInFolder, resolveAssetFilesystemTarget } from '@/utils/asset-filesystem';

type AssetMenu =
  | { kind: 'asset'; asset: AssetEntry; x: number; y: number }
  | { kind: 'blank'; x: number; y: number };

interface AssetBrowserPanelProps {
  onApplyAsset?: (asset: AssetEntry) => void;
  onImportAsset?: () => void;
}

export const AssetBrowserPanel: React.FC<AssetBrowserPanelProps> = ({
  onApplyAsset,
  onImportAsset
}) => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState<AssetType | 'all'>('all');
  const [showBuiltin, setShowBuiltin] = useState(true);
  const [showProject, setShowProject] = useState(true);
  const [menu, setMenu] = useState<AssetMenu | null>(null);
  const projectDir = useProjectStore(s => s.projectDir);
  const projectPath = useProjectStore(s => s.projectPath);
  const removeProjectAsset = useProjectStore(s => s.removeProjectAsset);
  const getMergedAssets = useAssetStore(s => s.getMergedAssets);
  const inspectorTarget = useAppStore(s => s.inspectorTarget);
  const selectAssetForInspector = useAppStore(s => s.selectAssetForInspector);
  const clearInspectorTarget = useAppStore(s => s.clearInspectorTarget);
  const { showToastMessage } = useAppStore();
  const gridRef = useRef<HTMLDivElement>(null);

  const selectedAssetId = inspectorTarget?.kind === 'asset' ? inspectorTarget.assetId : null;

  const assets = useMemo(() => {
    let list = getMergedAssets();
    if (category !== 'all') list = list.filter(a => a.type === category);
    if (!showBuiltin) list = list.filter(a => a.source !== 'builtin');
    if (!showProject) list = list.filter(a => a.source === 'builtin');
    const q = filter.trim().toLowerCase();
    if (q) list = list.filter(a => a.name.toLowerCase().includes(q) || assetTypeLabel(a.type).includes(q));
    return list;
  }, [getMergedAssets, filter, showBuiltin, showProject, category]);

  useEffect(() => {
    if (!selectedAssetId || !gridRef.current) return;
    const el = gridRef.current.querySelector(`[data-asset-id="${selectedAssetId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedAssetId, assets]);

  const handleDragStart = useCallback((e: React.DragEvent, asset: AssetEntry) => {
    writeAssetDragData(e.dataTransfer, { id: asset.id, type: asset.type, name: asset.name });
    e.dataTransfer.setData('text/plain', asset.name);
  }, []);

  const handleSelect = useCallback((asset: AssetEntry) => {
    selectAssetForInspector(asset.id);
  }, [selectAssetForInspector]);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage(`已复制${label}`);
    } catch {
      showToastMessage('复制失败');
    }
  }, [showToastMessage]);

  const menuItems = useMemo(() => {
    if (!menu) return [];

    if (menu.kind === 'blank') {
      const items: { label: string; disabled?: boolean; onClick: () => void }[] = [];
      if (onImportAsset) {
        items.push({ label: '导入贴图', onClick: onImportAsset });
      }
      return items;
    }

    const { asset } = menu;
    const isImported = asset.source !== 'builtin';
    const canOpenFolder = !!resolveAssetFilesystemTarget(asset, projectDir, projectPath);
    return [
      {
        label: '应用到当前发射器',
        disabled: !onApplyAsset,
        onClick: () => onApplyAsset?.(asset)
      },
      {
        label: '在文件夹中显示',
        disabled: !canOpenFolder,
        onClick: () => {
          void openAssetInFolder(asset, projectDir, projectPath).then(result => {
            if (result === 'ok') showToastMessage('已打开文件夹');
            else if (result === 'no-path') showToastMessage('内置资产无本地文件，请先保存项目');
            else showToastMessage('当前环境不支持打开文件夹');
          });
        }
      },
      {
        label: '复制名称',
        onClick: () => { void copyText(asset.name, '名称'); }
      },
      {
        label: '复制 ID',
        onClick: () => { void copyText(asset.id, ' ID'); }
      },
      {
        label: '删除资产',
        disabled: !isImported,
        danger: isImported,
        onClick: () => {
          removeProjectAsset(asset.id);
          showToastMessage(`已删除：${asset.name}`);
        }
      }
    ];
  }, [menu, onApplyAsset, onImportAsset, copyText, removeProjectAsset, showToastMessage, projectDir, projectPath]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="panel-header asset-browser-header">
        <span style={{ fontWeight: 600, fontSize: 12 }}>资产</span>
        <div style={{ flex: 1, minWidth: 0 }} />
        <label className="asset-source-check">
          <input
            type="checkbox"
            checked={showBuiltin}
            onChange={(e) => setShowBuiltin(e.target.checked)}
          />
          <span>内置</span>
        </label>
        <label className="asset-source-check">
          <input
            type="checkbox"
            checked={showProject}
            onChange={(e) => setShowProject(e.target.checked)}
          />
          <span>项目</span>
        </label>
      </div>

      <div style={{ padding: '0 6px 4px', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="搜索..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '100%', fontSize: 11, padding: '3px 6px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{
          width: 56,
          flexShrink: 0,
          borderRight: '1px solid var(--border-color)',
          padding: '4px 2px',
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
              style={{ fontSize: 9, textAlign: 'center', padding: '3px 2px', width: '100%', lineHeight: 1.2 }}
              title={opt.id === 'spriteFrame' ? 'Cocos SpriteFrame，导出时引用子资源' : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          ref={gridRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            padding: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: 6,
            alignContent: 'start'
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-asset-item]')) return;
            clearInspectorTarget();
          }}
          onContextMenu={(e) => {
            if ((e.target as HTMLElement).closest('[data-asset-item]')) return;
            e.preventDefault();
            setMenu({ kind: 'blank', x: e.clientX, y: e.clientY });
          }}
        >
          {assets.map(asset => {
            const thumb = getAssetThumbnailUrl(asset, projectDir, 64);
            const selected = selectedAssetId === asset.id;
            return (
              <div
                key={asset.id}
                data-asset-item
                data-asset-id={asset.id}
                draggable
                onClick={() => handleSelect(asset)}
                onDragStart={(e) => handleDragStart(e, asset)}
                onDoubleClick={() => onApplyAsset?.(asset)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectAssetForInspector(asset.id);
                  setMenu({ kind: 'asset', asset, x: e.clientX, y: e.clientY });
                }}
                title={`${asset.name}\n单击 · 拖拽 · 双击应用`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: 4,
                  borderRadius: 6,
                  border: selected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  background: selected ? 'rgba(88,166,255,0.12)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  minWidth: 0,
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
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
      </div>

      {menu && menuItems.length > 0 && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  );
};
