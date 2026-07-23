import type { AssetEntry } from '@/types/asset';

export const DEFAULT_TEXTURE_ASSET_ID = 'builtin-particle-circle';

export type BuiltinTextureShape =
  | 'circle'
  | 'soft'
  | 'star'
  | 'spark'
  | 'smoke'
  | 'glow'
  | 'ring'
  | 'square'
  | 'cross'
  | 'flare';

export interface BuiltinTextureDef {
  id: string;
  name: string;
  shape: BuiltinTextureShape;
}

export const BUILTIN_TEXTURE_DEFS: BuiltinTextureDef[] = [
  { id: DEFAULT_TEXTURE_ASSET_ID, name: 'particle-circle', shape: 'circle' },
  { id: 'builtin-particle-soft', name: 'particle-soft', shape: 'soft' },
  { id: 'builtin-particle-star', name: 'particle-star', shape: 'star' },
  { id: 'builtin-particle-spark', name: 'particle-spark', shape: 'spark' },
  { id: 'builtin-particle-smoke', name: 'particle-smoke', shape: 'smoke' },
  { id: 'builtin-particle-glow', name: 'particle-glow', shape: 'glow' },
  { id: 'builtin-particle-ring', name: 'particle-ring', shape: 'ring' },
  { id: 'builtin-particle-square', name: 'particle-square', shape: 'square' },
  { id: 'builtin-particle-cross', name: 'particle-cross', shape: 'cross' },
  { id: 'builtin-particle-flare', name: 'particle-flare', shape: 'flare' }
];

export function createBuiltinAssetEntries(): AssetEntry[] {
  return BUILTIN_TEXTURE_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'texture' as const,
    source: 'builtin' as const,
    uri: `builtin://textures/${def.name}.png`,
    meta: { shape: def.shape }
  }));
}

export function getBuiltinShape(assetId: string): BuiltinTextureShape {
  return BUILTIN_TEXTURE_DEFS.find(d => d.id === assetId)?.shape ?? 'circle';
}
