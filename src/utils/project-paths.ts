import { getProjectDirFromFilePath } from '@/utils/project-io';

export function sanitizeProjectFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'untitled';
}

export function pathBasename(path: string): string {
  const norm = path.replace(/[/\\]+$/, '');
  const i = Math.max(norm.lastIndexOf('/'), norm.lastIndexOf('\\'));
  return i >= 0 ? norm.slice(i + 1) : norm;
}

/** Selected folder is the project root; `.fxproj` basename follows folder name. */
export function resolveProjectLocation(pickedDir: string): {
  projectDir: string;
  projectPath: string;
  projectName: string;
} {
  const sep = pickedDir.includes('\\') ? '\\' : '/';
  const projectName = pathBasename(pickedDir);
  const safeFileName = sanitizeProjectFolderName(projectName);
  return {
    projectDir: pickedDir,
    projectPath: `${pickedDir}${sep}${safeFileName}.fxproj`,
    projectName
  };
}

export function getProjectRootDir(projectPath: string | null | undefined): string | null {
  if (!projectPath) return null;
  return getProjectDirFromFilePath(projectPath);
}

export function pickFxprojInFolder(
  folderName: string,
  entries: string[]
): string | null {
  const fxprojs = entries.filter((e) => e.toLowerCase().endsWith('.fxproj'));
  if (fxprojs.length === 0) return null;
  const preferred = fxprojs.find(
    (f) => f.replace(/\.fxproj$/i, '').toLowerCase() === folderName.toLowerCase()
  );
  return preferred ?? fxprojs[0]!;
}
