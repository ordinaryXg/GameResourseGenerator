import type { Dirent } from 'fs';

export const PREFAB_IMPORT_ASSET_SUBDIRS = ['textures', 'materials', 'texture', 'material', 'images'] as const;

export const PREFAB_IMPORT_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'library',
  'temp',
  'build',
  'release',
  'dist'
]);

export interface CollectedPrefabFile {
  name: string;
  relativePath: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

export interface CollectPrefabFilesOptions {
  readdir: (dir: string) => Promise<Dirent[]>;
  readText: (path: string) => Promise<string>;
  readBase64: (path: string) => Promise<string>;
  exists: (path: string) => boolean;
  join: (...parts: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string) => string;
  relative: (from: string, to: string) => string;
}

function isImportCandidate(name: string): boolean {
  return /\.(prefab|mtl|png|jpg|jpeg|webp|meta)$/i.test(name);
}

function isImage(name: string): boolean {
  return /\.(png|jpg|jpeg|webp)$/i.test(name);
}

/** Collect prefab bundle files without scanning huge parent folders. */
export async function collectPrefabImportFiles(
  prefabPath: string,
  opts: CollectPrefabFilesOptions
): Promise<CollectedPrefabFile[]> {
  const prefabDir = opts.dirname(prefabPath);
  const seen = new Set<string>();
  const files: CollectedPrefabFile[] = [];

  const addFile = async (fullPath: string) => {
    const key = fullPath.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const name = opts.basename(fullPath);
    const relativePath = opts.relative(prefabDir, fullPath).split('\\').join('/');
    if (isImage(name)) {
      files.push({
        name,
        relativePath,
        content: await opts.readBase64(fullPath),
        encoding: 'base64'
      });
    } else {
      files.push({
        name,
        relativePath,
        content: await opts.readText(fullPath),
        encoding: 'utf8'
      });
    }
  };

  const walk = async (dir: string, maxDepth: number, depth = 0) => {
    if (depth > maxDepth) return;
    let entries: Dirent[];
    try {
      entries = await opts.readdir(dir);
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const fullPath = opts.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (PREFAB_IMPORT_SKIP_DIRS.has(ent.name.toLowerCase())) continue;
        await walk(fullPath, maxDepth, depth + 1);
        continue;
      }
      if (!isImportCandidate(ent.name)) continue;
      await addFile(fullPath);
    }
  };

  // 1) Prefab folder + all subfolders (e.g. smok/textures/*.png)
  await walk(prefabDir, 12);

  // 2) Parent folders: loose files, sibling effect packages, known asset subdirs
  let cursor = prefabDir;
  for (let i = 0; i < 5; i++) {
    const parent = opts.dirname(cursor);
    if (parent === cursor) break;

    await walk(parent, 0);

    // Cocos 常见：贴图在同级目录（如 effect/Ex_smokeLight/*.png），只扫描靠近 prefab 的 2 层父目录
    if (i < 2) {
      let parentEntries: Dirent[];
      try {
        parentEntries = await opts.readdir(parent);
      } catch {
        parentEntries = [];
      }
      for (const ent of parentEntries) {
        if (!ent.isDirectory()) continue;
        if (PREFAB_IMPORT_SKIP_DIRS.has(ent.name.toLowerCase())) continue;
        await walk(opts.join(parent, ent.name), 12);
      }
    }

    for (const sub of PREFAB_IMPORT_ASSET_SUBDIRS) {
      const subPath = opts.join(parent, sub);
      if (opts.exists(subPath)) {
        await walk(subPath, 10);
      }
    }

    if (opts.basename(parent).toLowerCase() === 'assets') break;
    cursor = parent;
  }

  return files;
}

export function pickSelectedPrefabFile(
  files: CollectedPrefabFile[],
  prefabPath: string,
  basenameFn: (path: string) => string
): CollectedPrefabFile | undefined {
  const selectedName = basenameFn(prefabPath).toLowerCase();
  return files.find(f => f.name.toLowerCase() === selectedName && f.relativePath.toLowerCase().endsWith('.prefab'));
}
