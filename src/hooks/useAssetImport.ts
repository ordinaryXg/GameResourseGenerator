import { useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { buildImportedTextureEntry } from '@/utils/asset-filesystem';
import { invalidateAssetUrlCache } from '@/utils/asset-resolver';
import { invalidateThumbnailCache } from '@/utils/asset-thumbnail';

export function useAssetImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importAsset = useProjectStore(s => s.importProjectAsset);
  const project = useProjectStore(s => s.project);
  const projectDir = useProjectStore(s => s.projectDir);
  const projectPath = useProjectStore(s => s.projectPath);
  const { showToastMessage } = useAppStore();

  const openImportDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'webp') {
      showToastMessage('仅支持 PNG / JPG / WebP 贴图');
      return;
    }

    if (!project) {
      showToastMessage('请先打开项目');
      return;
    }

    try {
      const existingNames = project.assetRegistry
        .filter(a => a.uri.startsWith('project://assets/textures/'))
        .map(a => a.uri.replace('project://', '').split('/').pop()!)
        .filter(Boolean);

      let dir = projectDir;
      if (!dir && projectPath) {
        const sep = Math.max(projectPath.lastIndexOf('/'), projectPath.lastIndexOf('\\'));
        dir = sep >= 0 ? projectPath.slice(0, sep) : null;
      }

      const entry = await buildImportedTextureEntry(file, dir, existingNames);
      importAsset(entry);
      invalidateAssetUrlCache();
      invalidateThumbnailCache();
      const saved = entry.uri.startsWith('project://');
      showToastMessage(saved ? `已导入并保存：${entry.name}` : `已导入贴图：${entry.name}（保存项目后可落盘）`);
    } catch {
      showToastMessage('导入失败');
    }
  }, [importAsset, project, projectDir, projectPath, showToastMessage]);

  return { fileInputRef, openImportDialog, handleFileChange };
}
