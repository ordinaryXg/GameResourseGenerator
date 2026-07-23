import type { AssetEntry } from '@/types/asset';
import type { EffectProject } from '@/types/project';
import { buildDefaultTextureExport } from '@/utils/default-particle-texture';

export interface PrefabImportFile {
  /** Basename, e.g. `smoke.png` */
  name: string;
  /** Path relative to prefab directory, e.g. `textures/smoke.png` */
  relativePath: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

export interface PrefabImportBundleResult {
  project: EffectProject;
  boundAssetCount: number;
  warnings: string[];
}

interface UuidBinding {
  relativePath: string;
  kind: 'texture' | 'material';
}

function normalizeRelPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function normalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}

function uuidLookupKeys(uuid: string | undefined): string[] {
  if (!uuid) return [];
  const keys = new Set<string>();
  keys.add(normalizeUuid(uuid));
  if (uuid.includes('@')) {
    keys.add(normalizeUuid(uuid.split('@')[0]!));
  }
  return [...keys];
}

function assetPathFromMetaFile(file: PrefabImportFile): string | null {
  const rel = normalizeRelPath(file.relativePath);
  if (!rel.endsWith('.meta')) return null;
  return rel.slice(0, -'.meta'.length);
}

function assetKindFromPath(path: string): UuidBinding['kind'] | null {
  if (path.endsWith('.mtl')) return 'material';
  if (/\.(png|jpg|jpeg|webp)$/i.test(path)) return 'texture';
  return null;
}

function registerUuid(map: Map<string, UuidBinding>, uuid: unknown, binding: UuidBinding) {
  if (typeof uuid !== 'string' || !uuid) return;
  for (const key of uuidLookupKeys(uuid)) {
    map.set(key, binding);
  }
}

function parseMetaUuids(content: string): string[] {
  const found = new Set<string>();
  try {
    const meta = JSON.parse(content) as {
      uuid?: string;
      userData?: { redirect?: string };
      subMetas?: Record<string, { uuid?: string }>;
    };
    if (meta.uuid) found.add(meta.uuid);
    if (meta.userData?.redirect) found.add(meta.userData.redirect);
    if (meta.subMetas) {
      for (const sub of Object.values(meta.subMetas)) {
        if (sub?.uuid) found.add(sub.uuid);
      }
    }
  } catch {
    const re = /"uuid"\s*:\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      found.add(match[1]!);
    }
  }
  return [...found];
}

/** Index .meta / .mtl → UUID → asset relative path (Cocos Creator compatible). */
export function buildImportAssetUuidIndex(files: PrefabImportFile[]): Map<string, UuidBinding> {
  const map = new Map<string, UuidBinding>();

  for (const file of files) {
    if (file.encoding === 'base64') continue;

    if (file.name.endsWith('.meta') || file.relativePath.endsWith('.meta')) {
      const assetPath = assetPathFromMetaFile(file);
      if (!assetPath) continue;
      const kind = assetKindFromPath(assetPath);
      if (!kind) continue;
      const binding: UuidBinding = { relativePath: assetPath, kind };
      for (const uuid of parseMetaUuids(file.content)) {
        registerUuid(map, uuid, binding);
      }
    }
  }

  return map;
}

/** @deprecated use buildImportAssetUuidIndex */
export function indexPrefabSiblingAssets(files: PrefabImportFile[]): Map<string, UuidBinding> {
  return buildImportAssetUuidIndex(files);
}

function textureUriForFile(file: PrefabImportFile): string {
  if (file.encoding === 'base64') {
    const lower = file.name.toLowerCase();
    const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${file.content}`;
  }
  return normalizeRelPath(file.relativePath);
}

function findMetaForAsset(files: PrefabImportFile[], asset: PrefabImportFile): PrefabImportFile | undefined {
  const metaRel = `${normalizeRelPath(asset.relativePath)}.meta`.toLowerCase();
  return files.find(f => normalizeRelPath(f.relativePath).toLowerCase() === metaRel);
}

function findFile(files: PrefabImportFile[], relativePath: string): PrefabImportFile | undefined {
  const target = normalizeRelPath(relativePath).toLowerCase();
  const base = target.split('/').pop()!;
  return files.find(f => {
    const rel = normalizeRelPath(f.relativePath).toLowerCase();
    return rel === target || (rel.endsWith(`/${base}`) && rel.split('/').pop() === base);
  });
}

function lookupBinding(map: Map<string, UuidBinding>, ...uuids: (string | undefined)[]): UuidBinding | undefined {
  for (const uuid of uuids) {
    for (const key of uuidLookupKeys(uuid)) {
      const hit = map.get(key);
      if (hit) return hit;
    }
  }
  return undefined;
}

function findTextureByMetaContent(files: PrefabImportFile[], ...uuids: (string | undefined)[]): PrefabImportFile | undefined {
  const needles = uuids.flatMap(u => uuidLookupKeys(u));
  if (needles.length === 0) return undefined;

  for (const file of files) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(file.name)) continue;
    const meta = findMetaForAsset(files, file);
    if (!meta) continue;
    const hay = meta.content.toLowerCase();
    if (needles.some(n => hay.includes(n))) return file;
  }
  return undefined;
}

function bindEntry(
  entry: AssetEntry,
  files: PrefabImportFile[],
  byUuid: Map<string, UuidBinding>
): { entry: AssetEntry; bound: boolean; warning?: string } {
  if (entry.source !== 'imported') return { entry, bound: false };

  const binding = lookupBinding(
    byUuid,
    entry.meta?.spriteFrameUuid,
    entry.meta?.uuid
  );

  let file = binding ? findFile(files, binding.relativePath) : undefined;

  if (!file && entry.type === 'texture') {
    file = findTextureByMetaContent(files, entry.meta?.spriteFrameUuid, entry.meta?.uuid);
  }

  if (!file) {
    return {
      entry,
      bound: false,
      warning: `未匹配外部资产：${entry.name} (${entry.meta?.uuid ?? 'no-uuid'})`
    };
  }

  const baseName = (file.relativePath.split('/').pop() ?? file.name);
  const uri = entry.type === 'texture' || binding?.kind === 'texture'
    ? textureUriForFile(file)
    : normalizeRelPath(file.relativePath);

  return {
    entry: {
      ...entry,
      name: baseName.replace(/\.(png|mtl|jpg|jpeg|webp)$/i, ''),
      uri
    },
    bound: true
  };
}

/** Bind imported AssetEntry URIs to PNG/MTL files (data: URL or relative path). */
export function bindPrefabImportAssets(
  project: EffectProject,
  files: PrefabImportFile[]
): PrefabImportBundleResult {
  const byUuid = buildImportAssetUuidIndex(files);
  const warnings: string[] = [];
  let boundAssetCount = 0;

  const registry = project.assetRegistry.map((entry): AssetEntry => {
    const result = bindEntry(entry, files, byUuid);
    if (result.bound) boundAssetCount += 1;
    else if (result.warning) warnings.push(result.warning);
    return result.entry;
  });

  return {
    project: { ...project, assetRegistry: registry },
    boundAssetCount,
    warnings
  };
}

function toImportFile(name: string, relativePath: string, content: string, encoding?: 'utf8' | 'base64'): PrefabImportFile {
  return { name, relativePath: normalizeRelPath(relativePath), content, encoding };
}

export async function readBrowserFileBundle(fileList: FileList | File[]): Promise<{
  prefab: PrefabImportFile;
  files: PrefabImportFile[];
  assetRootDir: string | null;
}> {
  const all = Array.from(fileList);
  const prefabFile = all.find(f => f.name.toLowerCase().endsWith('.prefab'));
  if (!prefabFile) throw new Error('请选择 .prefab 文件');

  const prefabRel = prefabFile.webkitRelativePath || prefabFile.name;
  const prefabDirPrefix = prefabRel.includes('/')
    ? prefabRel.slice(0, prefabRel.lastIndexOf('/') + 1)
    : '';

  const files: PrefabImportFile[] = [];
  for (const file of all) {
    const lower = file.name.toLowerCase();
    if (!/\.(prefab|mtl|png|jpg|jpeg|webp|meta)$/i.test(lower)) continue;

    let relativePath = file.name;
    if (file.webkitRelativePath) {
      relativePath = file.webkitRelativePath;
    } else if (prefabDirPrefix && file !== prefabFile) {
      relativePath = `${prefabDirPrefix}${file.name}`;
    }

    if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      files.push(toImportFile(file.name, relativePath, btoa(binary), 'base64'));
    } else {
      files.push(toImportFile(file.name, relativePath, await file.text(), 'utf8'));
    }
  }

  const prefabContent = files.find(f => f.name === prefabFile.name)?.content
    ?? await prefabFile.text();

  return {
    prefab: toImportFile(prefabFile.name, prefabRel, prefabContent, 'utf8'),
    files,
    assetRootDir: null
  };
}

export function collectPrefabImportScanRoots(prefabDir: string): string[] {
  const roots: string[] = [prefabDir];
  let cursor = prefabDir;
  for (let i = 0; i < 6; i++) {
    const parent = cursor.replace(/[/\\]+$/, '').replace(/[/\\][^/\\]+$/, '') || cursor;
    if (parent === cursor) break;
    roots.push(parent);
    if (parent.split(/[/\\]/).pop()?.toLowerCase() === 'assets') break;
    cursor = parent;
  }
  return [...new Set(roots)];
}

export function relativePathFromPrefabDir(prefabDir: string, absolutePath: string): string {
  const normPrefab = normalizeRelPath(prefabDir).replace(/\/+$/, '');
  const normFile = normalizeRelPath(absolutePath);
  if (normFile.toLowerCase().startsWith(normPrefab.toLowerCase() + '/')) {
    return normFile.slice(normPrefab.length + 1);
  }
  const prefabParts = normPrefab.split('/');
  const fileParts = normFile.split('/');
  let i = 0;
  while (i < prefabParts.length && i < fileParts.length && prefabParts[i]!.toLowerCase() === fileParts[i]!.toLowerCase()) {
    i += 1;
  }
  const up = prefabParts.length - i;
  const down = fileParts.slice(i);
  return normalizeRelPath([...Array(up).fill('..'), ...down].join('/'));
}

/** Build realistic Cocos texture meta for tests. */
export function buildSampleTextureMeta(textureUuid: string) {
  const built = buildDefaultTextureExport('sample');
  const parsed = JSON.parse(built.metaContent) as { uuid: string; subMetas: Record<string, { uuid: string }> };
  parsed.uuid = textureUuid;
  const sub = parsed.subMetas[Object.keys(parsed.subMetas)[0]!]!;
  sub.uuid = `${textureUuid}@${sub.uuid.split('@')[1]}`;
  return JSON.stringify(parsed);
}
