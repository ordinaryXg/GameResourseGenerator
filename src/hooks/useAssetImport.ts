import { useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { generateUUID } from '@/utils/effect-defaults';
import type { AssetEntry } from '@/types/asset';
import { invalidateAssetUrlCache } from '@/utils/asset-resolver';
import { invalidateThumbnailCache } from '@/utils/asset-thumbnail';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useAssetImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importAsset = useProjectStore(s => s.importProjectAsset);
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

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const entry: AssetEntry = {
        id: generateUUID(),
        name: baseName,
        type: 'texture',
        source: 'imported',
        uri: dataUrl,
        meta: { width: undefined, height: undefined }
      };
      importAsset(entry);
      invalidateAssetUrlCache();
      invalidateThumbnailCache();
      showToastMessage(`已导入贴图：${baseName}`);
    } catch {
      showToastMessage('导入失败');
    }
  }, [importAsset, showToastMessage]);

  return { fileInputRef, openImportDialog, handleFileChange };
}
