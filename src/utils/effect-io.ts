import type { AssetEntry } from '@/types/asset';
import { generateUUID } from '@/utils/effect-defaults';
import { generateBuiltinShaderSource } from '@/utils/builtin-asset-content';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string | undefined | null): boolean {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** Cocos Creator `.effect.meta` sidecar. */
export function buildEffectMeta(uuid: string) {
  return {
    ver: '1.0.0',
    importer: 'effect',
    imported: true,
    uuid,
    files: ['.json'],
    subMetas: {},
    userData: {}
  };
}

/** Resolve a stable Effect UUID for a shader asset (does not mutate). */
export function resolveShaderEffectUuid(asset: AssetEntry): string {
  if (asset.meta?.uuid && looksLikeUuid(asset.meta.uuid)) return asset.meta.uuid;
  if (looksLikeUuid(asset.id)) return asset.id;
  return generateUUID();
}

/** Ensure `meta.uuid` is set on a shader asset (immutable). */
export function ensureShaderEffectUuid(asset: AssetEntry): AssetEntry {
  if (asset.type !== 'shader') return asset;
  const uuid = resolveShaderEffectUuid(asset);
  if (asset.meta?.uuid === uuid) return asset;
  return {
    ...asset,
    meta: { ...asset.meta, uuid }
  };
}

/** Effect source text for export / import round-trip. */
export function getShaderEffectSource(asset: AssetEntry): string {
  return asset.meta?.shaderSource || generateBuiltinShaderSource(asset);
}

export interface EffectExportFile {
  fileName: string;
  content: string;
  metaFileName: string;
  metaContent: string;
  uuid: string;
}

function sanitizeBaseName(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '') || 'effect';
}

/** Build `.effect` + `.effect.meta` for a shader asset. */
export function buildEffectExportFile(
  asset: AssetEntry,
  options: { fileBase?: string; uuid?: string } = {}
): EffectExportFile {
  const ensured = ensureShaderEffectUuid(asset);
  const uuid = options.uuid ?? resolveShaderEffectUuid(ensured);
  const fileBase = options.fileBase ?? sanitizeBaseName(asset.name);
  const source = getShaderEffectSource(ensured);
  const header = `// Cocos Creator 3.8 Effect\n// UUID: ${uuid}\n// name: ${asset.name}\n\n`;
  const content = source.includes('CCEffect') ? source : `${header}${source}`;
  return {
    fileName: `${fileBase}.effect`,
    content,
    metaFileName: `${fileBase}.effect.meta`,
    metaContent: JSON.stringify(buildEffectMeta(uuid), null, 2),
    uuid
  };
}

/** Stamp missing Effect UUIDs onto all shader assets in a registry. */
export function stampShaderEffectUuids(registry: AssetEntry[]): AssetEntry[] {
  let changed = false;
  const next = registry.map((asset) => {
    if (asset.type !== 'shader') return asset;
    const stamped = ensureShaderEffectUuid(asset);
    if (stamped !== asset) changed = true;
    return stamped;
  });
  return changed ? next : registry;
}
