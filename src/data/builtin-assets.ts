import type { AssetEntry, AssetType } from '@/types/asset';

export const DEFAULT_TEXTURE_ASSET_ID = 'builtin-particle-circle';
export const DEFAULT_MATERIAL_ASSET_ID = 'builtin-mat-particle-additive';

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

/** SpriteFrame entries mirror textures for Cocos export semantics. */
function createSpriteFrameEntries(): AssetEntry[] {
  return BUILTIN_TEXTURE_DEFS.map(def => ({
    id: `${def.id}-sf`,
    name: `${def.name}-sf`,
    type: 'spriteFrame' as const,
    source: 'builtin' as const,
    uri: `builtin://textures/${def.name}.png`,
    meta: { shape: def.shape, textureId: def.id }
  }));
}

const BUILTIN_MATERIAL_DEFS = [
  { id: DEFAULT_MATERIAL_ASSET_ID, name: 'particle-additive', blend: 'additive' },
  { id: 'builtin-mat-particle-alpha', name: 'particle-alpha-blend', blend: 'alpha' }
];

const BUILTIN_SHADER_DEFS = [
  { id: 'builtin-shader-particle', name: 'builtin-particle' },
  { id: 'builtin-shader-particle-trail', name: 'builtin-particle-trail' }
];

const BUILTIN_MESH_DEFS = [
  { id: 'builtin-mesh-quad', name: 'quad' },
  { id: 'builtin-mesh-cone', name: 'cone' },
  { id: 'builtin-mesh-sphere', name: 'sphere' }
];

export function createBuiltinAssetEntries(): AssetEntry[] {
  const textures: AssetEntry[] = BUILTIN_TEXTURE_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'texture' as const,
    source: 'builtin' as const,
    uri: `builtin://textures/${def.name}.png`,
    meta: { shape: def.shape }
  }));

  const materials: AssetEntry[] = BUILTIN_MATERIAL_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'material' as const,
    source: 'builtin' as const,
    uri: `builtin://materials/${def.name}.mtl`,
    meta: { blend: def.blend }
  }));

  const shaders: AssetEntry[] = BUILTIN_SHADER_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'shader' as const,
    source: 'builtin' as const,
    uri: `builtin://shaders/${def.name}.effect`
  }));

  const meshes: AssetEntry[] = BUILTIN_MESH_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'mesh' as const,
    source: 'builtin' as const,
    uri: `builtin://meshes/${def.name}.mesh`
  }));

  return [...textures, ...createSpriteFrameEntries(), ...materials, ...shaders, ...meshes];
}

export function getBuiltinShape(assetId: string): BuiltinTextureShape {
  const baseId = assetId.replace(/-sf$/, '');
  return BUILTIN_TEXTURE_DEFS.find(d => d.id === baseId)?.shape ?? 'circle';
}

export const ASSET_CATEGORY_OPTIONS: { id: AssetType | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'texture', label: '贴图' },
  { id: 'spriteFrame', label: '精灵帧' },
  { id: 'material', label: '材质' },
  { id: 'shader', label: 'Shader' },
  { id: 'mesh', label: '模型' }
];

export function assetCategoryIcon(type: AssetType): string {
  switch (type) {
    case 'texture': return '🖼';
    case 'spriteFrame': return '🎞';
    case 'material': return '💎';
    case 'shader': return '✦';
    case 'mesh': return '📦';
    default: return '📄';
  }
}
