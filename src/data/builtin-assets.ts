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
  { id: DEFAULT_MATERIAL_ASSET_ID, name: 'particle-additive', blend: 'additive', category: '通用', description: '默认加法粒子材质，适合火焰、光效' },
  { id: 'builtin-mat-particle-alpha', name: 'particle-alpha-blend', blend: 'alpha', category: '通用', description: '标准透明混合，适合烟雾、灰尘' },
  { id: 'builtin-mat-fire-additive', name: 'particle-fire-additive', blend: 'additive', category: '火焰', description: '高亮加法混合，爆炸与火焰特效' },
  { id: 'builtin-mat-magic-additive', name: 'particle-magic-additive', blend: 'additive', category: '魔法', description: '魔法光晕、技能命中特效' },
  { id: 'builtin-mat-spark-additive', name: 'particle-spark-additive', blend: 'additive', category: '火花', description: '火花、闪电、碎屑飞溅' },
  { id: 'builtin-mat-glow-additive', name: 'particle-glow-additive', blend: 'additive', category: '光晕', description: '柔和发光、能量护盾边缘' },
  { id: 'builtin-mat-soft-additive', name: 'particle-soft-additive', blend: 'additive', category: '环境', description: '低强度加法，环境粒子与氛围' },
  { id: 'builtin-mat-smoke-alpha', name: 'particle-smoke-alpha', blend: 'alpha', category: '烟雾', description: '半透明烟雾、蒸汽' },
  { id: 'builtin-mat-dust-alpha', name: 'particle-dust-alpha', blend: 'alpha', category: '灰尘', description: '尘土、沙粒、落叶' },
  { id: 'builtin-mat-fade-alpha', name: 'particle-fade-alpha', blend: 'alpha', category: '淡出', description: '渐隐消失、残留痕迹' }
];

const BUILTIN_SHADER_DEFS = [
  { id: 'builtin-shader-particle', name: 'builtin-particle', category: '核心', description: 'Cocos 内置标准粒子 Effect' },
  { id: 'builtin-shader-particle-trail', name: 'builtin-particle-trail', category: '拖尾', description: '拖尾粒子专用着色器' },
  { id: 'builtin-shader-particle-additive', name: 'builtin-particle-additive', category: '混合', description: '加法混合粒子变体' },
  { id: 'builtin-shader-particle-alpha', name: 'builtin-particle-alpha', category: '混合', description: 'Alpha 混合粒子变体' },
  { id: 'builtin-shader-particle-dissolve', name: 'builtin-particle-dissolve', category: '特效', description: '溶解消失效果' },
  { id: 'builtin-shader-particle-distortion', name: 'builtin-particle-distortion', category: '特效', description: '扭曲/热浪扰动' },
  { id: 'builtin-shader-particle-soft', name: 'builtin-particle-soft', category: '通用', description: '柔边粒子，减少硬边' },
  { id: 'builtin-shader-particle-mesh', name: 'builtin-particle-mesh', category: '网格', description: 'Mesh 渲染模式粒子' },
  { id: 'builtin-shader-particle-unlit', name: 'builtin-particle-unlit', category: '通用', description: '无光照粒子，性能友好' },
  { id: 'builtin-shader-particle-fresnel', name: 'builtin-particle-fresnel', category: '特效', description: '菲涅尔边缘发光' }
];

const BUILTIN_MESH_DEFS = [
  { id: 'builtin-mesh-quad', name: 'quad', category: '基础', description: '四边形面片，Billboard 默认' },
  { id: 'builtin-mesh-cone', name: 'cone', category: '基础', description: '圆锥体，喷射/冲击波' },
  { id: 'builtin-mesh-sphere', name: 'sphere', category: '基础', description: '球体，爆炸、能量球' },
  { id: 'builtin-mesh-cube', name: 'cube', category: '基础', description: '立方体，碎片、方块' },
  { id: 'builtin-mesh-cylinder', name: 'cylinder', category: '基础', description: '圆柱，柱形喷射' },
  { id: 'builtin-mesh-plane', name: 'plane', category: '基础', description: '大平面，地面扬尘/贴花' },
  { id: 'builtin-mesh-torus', name: 'torus', category: '特效', description: '圆环，魔法阵、冲击环' },
  { id: 'builtin-mesh-capsule', name: 'capsule', category: '基础', description: '胶囊体，轨迹、子弹' },
  { id: 'builtin-mesh-hemisphere', name: 'hemisphere', category: '基础', description: '半球，地面爆发' },
  { id: 'builtin-mesh-octahedron', name: 'octahedron', category: '特效', description: '八面体，水晶、能量碎片' }
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
    meta: { blend: def.blend, category: def.category, description: def.description }
  }));

  const shaders: AssetEntry[] = BUILTIN_SHADER_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'shader' as const,
    source: 'builtin' as const,
    uri: `builtin://shaders/${def.name}.effect`,
    meta: { category: def.category, description: def.description }
  }));

  const meshes: AssetEntry[] = BUILTIN_MESH_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    type: 'mesh' as const,
    source: 'builtin' as const,
    uri: `builtin://meshes/${def.name}.mesh`,
    meta: { category: def.category, description: def.description }
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
