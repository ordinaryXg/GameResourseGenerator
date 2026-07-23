import type { AssetEntry } from '@/types/asset';
import { getProjectDirFromFilePath } from '@/utils/project-io';
import { generateUUID } from '@/utils/effect-defaults';

export interface AssetFilesystemTarget {
  path: string;
  revealFile: boolean;
}

function joinPath(base: string, rel: string): string {
  const sep = base.includes('\\') ? '\\' : '/';
  const trimmed = rel.replace(/^[/\\]+/, '').replace(/\//g, sep);
  return `${base}${sep}${trimmed}`;
}

/** Resolve a filesystem path for "open in folder" — returns null for virtual builtin assets. */
export function resolveAssetFilesystemTarget(
  asset: AssetEntry,
  projectDir: string | null,
  projectPath: string | null
): AssetFilesystemTarget | null {
  if (asset.uri.startsWith('data:')) {
    if (projectDir) return { path: joinPath(projectDir, 'assets'), revealFile: false };
    if (projectPath) return { path: getProjectDirFromFilePath(projectPath), revealFile: false };
    return null;
  }

  if (asset.uri.startsWith('project://') && projectDir) {
    const rel = asset.uri.replace('project://', '');
    return { path: joinPath(projectDir, rel), revealFile: true };
  }

  if (projectDir && !asset.uri.includes('://')) {
    return { path: joinPath(projectDir, asset.uri), revealFile: true };
  }

  if (asset.source === 'builtin') {
    return null;
  }

  return null;
}

export async function openAssetInFolder(
  asset: AssetEntry,
  projectDir: string | null,
  projectPath: string | null
): Promise<'ok' | 'no-path' | 'no-api'> {
  if (!window.electronAPI?.openPath && !window.electronAPI?.showItemInFolder) {
    return 'no-api';
  }

  const target = resolveAssetFilesystemTarget(asset, projectDir, projectPath);
  if (!target) return 'no-path';

  if (target.revealFile && window.electronAPI.showItemInFolder) {
    await window.electronAPI.showItemInFolder(target.path);
    return 'ok';
  }

  if (window.electronAPI.openPath) {
    await window.electronAPI.openPath(target.path);
    return 'ok';
  }

  return 'no-api';
}

function sanitizeAssetFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'texture';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return readFileAsDataUrl(file).then((dataUrl) => {
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  });
}

/** 导入贴图：有 projectDir 时落盘到 assets/textures/，否则使用 data URL。 */
export async function buildImportedTextureEntry(
  file: File,
  projectDir: string | null,
  existingFileNames: Iterable<string>
): Promise<AssetEntry> {
  const extRaw = file.name.split('.').pop()?.toLowerCase() || 'png';
  const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
  const baseName = sanitizeAssetFileName(file.name.replace(/\.[^.]+$/, ''));
  const used = new Set(existingFileNames);

  let fileName = `${baseName}.${ext}`;
  let suffix = 1;
  while (used.has(fileName)) {
    fileName = `${baseName}_${suffix}.${ext}`;
    suffix += 1;
  }

  const relPath = `assets/textures/${fileName}`;

  if (projectDir && window.electronAPI?.writeExportFiles && window.electronAPI.mkdir) {
    const texturesDir = joinPath(projectDir, 'assets/textures');
    await window.electronAPI.mkdir(texturesDir);
    const base64 = await fileToBase64(file);
    const fullPath = joinPath(projectDir, relPath);
    const results = await window.electronAPI.writeExportFiles([
      { path: fullPath, content: base64, encoding: 'base64' }
    ]);
    if (results.every(r => r.success)) {
      return {
        id: generateUUID(),
        name: baseName,
        type: 'texture',
        source: 'imported',
        uri: `project://${relPath}`,
        meta: {}
      };
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: generateUUID(),
    name: baseName,
    type: 'texture',
    source: 'imported',
    uri: dataUrl,
    meta: {}
  };
}
