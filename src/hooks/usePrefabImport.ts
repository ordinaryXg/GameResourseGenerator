import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { parsePrefabToProject } from '@/utils/prefab-importer';
import { generateId } from '@/utils/effect-defaults';
import { getEmitterNodes } from '@/utils/preview-sources';

export function usePrefabImport() {
  const { showToastMessage } = useAppStore();
  const { loadProjectData, addMessage } = useProjectStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parsePrefabToProject(text, file.name.replace(/\.prefab$/i, ''));
      loadProjectData(result.project);
      const emitterCount = getEmitterNodes(result.project.root).length;
      addMessage({
        id: generateId(),
        role: 'system',
        content: `已导入项目：**${result.project.name}**（${emitterCount} 个发射器）${result.warnings.length > 0 ? `\n\n⚠ ${result.warnings.join('\n')}` : ''}`,
        timestamp: Date.now()
      });
      showToastMessage(`导入成功：${result.project.name}`);
      if (result.warnings.length > 0) {
        setTimeout(() => showToastMessage(result.warnings[0]), 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      showToastMessage(`导入失败：${msg}`);
    }
  }, [loadProjectData, addMessage, showToastMessage]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleImportFile);
    }
    e.target.value = '';
  }, [handleImportFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.prefab'));
    if (files.length === 0) {
      showToastMessage('仅支持导入 .prefab 文件');
      return;
    }
    files.forEach(handleImportFile);
  }, [handleImportFile, showToastMessage]);

  return { isDragOver, fileInputRef, handleImportClick, handleFileChange, handleDragOver, handleDragLeave, handleDrop };
};
