import type { AssetEntry } from '@/types/asset';
import { getProjectDirFromFilePath } from '@/utils/project-io';

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
