import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { parsePrefab } from '@/utils/prefab-importer';
import { generateId } from '@/utils/effect-defaults';

export function usePrefabImport() {
  const { setCurrentEffect, addMessage, showToastMessage } = useAppStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parsePrefab(text);
      setCurrentEffect(result.effectConfig);
      addMessage({
        id: generateId(),
        role: 'system',
        content: `已导入：**${result.effectConfig.name}**${result.warnings.length > 0 ? `\n\n⚠ ${result.warnings.join('\n')}` : ''}`,
        timestamp: Date.now()
      });
      showToastMessage(`导入成功：${result.effectConfig.name}`);
      if (result.warnings.length > 0) {
        setTimeout(() => showToastMessage(result.warnings[0]), 2000);
      }
    } catch (err: any) {
      showToastMessage(`导入失败：${err.message}`);
    }
  }, [setCurrentEffect, addMessage, showToastMessage]);

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
}
