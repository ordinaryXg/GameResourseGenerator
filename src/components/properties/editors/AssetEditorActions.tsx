import React, { useCallback } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { openAssetInFolder, resolveAssetFilesystemTarget } from '@/utils/asset-filesystem';

interface AssetEditorActionsProps {
  asset: AssetEntry;
  onApplyAsset?: (asset: AssetEntry) => void;
}

export const AssetEditorActions: React.FC<AssetEditorActionsProps> = ({ asset, onApplyAsset }) => {
  const projectDir = useProjectStore(s => s.projectDir);
  const projectPath = useProjectStore(s => s.projectPath);
  const duplicateAssetToProject = useProjectStore(s => s.duplicateAssetToProject);
  const removeProjectAsset = useProjectStore(s => s.removeProjectAsset);
  const { showToastMessage } = useAppStore();

  const isBuiltin = asset.source === 'builtin';
  const canOpenFolder = !!resolveAssetFilesystemTarget(asset, projectDir, projectPath);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage(`已复制${label}`);
    } catch {
      showToastMessage('复制失败');
    }
  }, [showToastMessage]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      padding: '8px 10px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)'
    }}>
      {onApplyAsset && (
        <button type="button" className="btn-sm" style={{ fontSize: 10 }} onClick={() => onApplyAsset(asset)}>
          应用到发射器
        </button>
      )}
      {isBuiltin && (
        <button
          type="button"
          className="btn-sm"
          style={{ fontSize: 10 }}
          onClick={() => {
            const id = duplicateAssetToProject(asset.id);
            if (id) showToastMessage(`已复制到项目：${asset.name}`);
          }}
        >
          复制到项目
        </button>
      )}
      {canOpenFolder && (
        <button
          type="button"
          className="btn-sm"
          style={{ fontSize: 10 }}
          onClick={() => {
            void openAssetInFolder(asset, projectDir, projectPath).then(result => {
              if (result === 'ok') showToastMessage('已打开文件夹');
              else showToastMessage('无法打开文件夹');
            });
          }}
        >
          打开文件夹
        </button>
      )}
      <button type="button" className="btn-sm" style={{ fontSize: 10 }} onClick={() => { void copyText(asset.name, '名称'); }}>
        复制名称
      </button>
      {!isBuiltin && (
        <button
          type="button"
          className="btn-sm danger"
          style={{ fontSize: 10 }}
          onClick={() => {
            removeProjectAsset(asset.id);
            showToastMessage(`已删除：${asset.name}`);
          }}
        >
          删除
        </button>
      )}
    </div>
  );
};
