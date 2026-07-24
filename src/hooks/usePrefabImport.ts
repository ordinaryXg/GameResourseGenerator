import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { parsePrefabToProject } from '@/utils/prefab-importer';
import {
  bindPrefabImportAssets,
  readBrowserFileBundle,
  type PrefabImportFile
} from '@/utils/prefab-import-bundle';
import { generateId } from '@/utils/effect-defaults';
import { getEmitterNodes } from '@/utils/preview-sources';
import { wrapImportedAsNewProject } from '@/utils/project-tree';
import { invalidateAssetUrlCache } from '@/utils/asset-resolver';
import { invalidateThumbnailCache } from '@/utils/asset-thumbnail';

function isPrefabDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

export function usePrefabImport() {
  const { showToastMessage } = useAppStore();
  const { project, loadProjectData, importPrefabRoot, addMessage } = useProjectStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finishImport = useCallback((
    importedProject: ReturnType<typeof parsePrefabToProject>['project'],
    warnings: string[],
    assetRootDir: string | null,
    mode: 'merge' | 'new'
  ) => {
    invalidateAssetUrlCache();
    invalidateThumbnailCache();

    let emitterCount: number;
    let rootName: string;

    if (mode === 'merge') {
      const result = importPrefabRoot(importedProject, { assetRootDir });
      if (!result) {
        showToastMessage('导入失败：没有打开的项目');
        return;
      }
      emitterCount = result.emitterCount;
      const addedNode = useProjectStore.getState().project?.root.children.find(
        (node) => node.id === result.addedRootId
      );
      rootName = addedNode?.name ?? importedProject.name;
    } else {
      const wrapped = wrapImportedAsNewProject(importedProject);
      loadProjectData(wrapped, null, { assetRootDir });
      emitterCount = getEmitterNodes(wrapped.root).length;
      rootName = wrapped.root.children[0]?.name ?? wrapped.name;
    }

    addMessage({
      id: generateId(),
      role: 'system',
      content: mode === 'merge'
        ? `已导入 Prefab 根节点：**${rootName}**（项目共 ${emitterCount} 个发射器）${warnings.length > 0 ? `\n\n⚠ ${warnings.join('\n')}` : ''}`
        : `已导入项目：**${rootName}**（${emitterCount} 个发射器）${warnings.length > 0 ? `\n\n⚠ ${warnings.join('\n')}` : ''}`,
      timestamp: Date.now()
    });
    showToastMessage(mode === 'merge' ? `已添加根节点：${rootName}` : `导入成功：${rootName}`);
    if (warnings.length > 0) {
      setTimeout(() => showToastMessage(warnings[0]!), 2000);
    }
  }, [importPrefabRoot, loadProjectData, addMessage, showToastMessage]);

  const importFromBundle = useCallback((
    prefab: PrefabImportFile,
    files: PrefabImportFile[],
    assetRootDir: string | null
  ) => {
    try {
      const parsed = parsePrefabToProject(prefab.content, prefab.name.replace(/\.prefab$/i, ''));
      const bound = bindPrefabImportAssets(parsed.project, files);
      const warnings = [...parsed.warnings, ...bound.warnings];
      if (bound.boundAssetCount > 0) {
        warnings.push(`已绑定 ${bound.boundAssetCount} 个磁盘资产（贴图/材质/模型）`);
      }
      const mode = useProjectStore.getState().project ? 'merge' : 'new';
      finishImport(bound.project, warnings, assetRootDir, mode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      showToastMessage(`导入失败：${msg}`);
    }
  }, [finishImport, showToastMessage]);

  const handleImportClick = useCallback(async () => {
    if (!project) {
      showToastMessage('请先新建或打开项目');
      return;
    }
    const api = window.electronAPI;
    if (api?.importPrefabBundle) {
      showToastMessage('正在扫描关联资产…');
      try {
        const bundle = await api.importPrefabBundle();
        if (!bundle) return;
        const prefabName = bundle.prefabPath.split(/[/\\]/).pop()?.toLowerCase();
        const prefab = bundle.files.find(
          f => f.name.toLowerCase() === prefabName && f.relativePath.toLowerCase().endsWith('.prefab')
        );
        if (!prefab) {
          showToastMessage('未找到所选 .prefab 文件');
          return;
        }
        importFromBundle(prefab, bundle.files, bundle.assetRootDir);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误';
        showToastMessage(`导入失败：${msg}`);
      }
      return;
    }
    fileInputRef.current?.click();
  }, [project, importFromBundle, showToastMessage]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) {
      showToastMessage('请先新建或打开项目');
      e.target.value = '';
      return;
    }
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    try {
      const bundle = await readBrowserFileBundle(files);
      importFromBundle(bundle.prefab, bundle.files, bundle.assetRootDir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      showToastMessage(`导入失败：${msg}`);
    }
  }, [project, importFromBundle, showToastMessage]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!isPrefabDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isPrefabDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!isPrefabDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);

    if (!project) {
      showToastMessage('请先新建或打开项目');
      return;
    }

    const dropped = Array.from(e.dataTransfer.files);
    const prefabFiles = dropped.filter(f => f.name.toLowerCase().endsWith('.prefab'));
    if (prefabFiles.length === 0) {
      showToastMessage('请拖入 .prefab 文件（可连同 .mtl / .png / .meta）');
      return;
    }
    try {
      const bundle = await readBrowserFileBundle(dropped);
      importFromBundle(bundle.prefab, bundle.files, bundle.assetRootDir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      showToastMessage(`导入失败：${msg}`);
    }
  }, [project, importFromBundle, showToastMessage]);

  return {
    isDragOver,
    fileInputRef,
    handleImportClick,
    handleFileChange,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
