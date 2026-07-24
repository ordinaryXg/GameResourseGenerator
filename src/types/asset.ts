export type AssetType = 'texture' | 'material' | 'shader' | 'mesh' | 'spriteFrame';

export type AssetSource = 'builtin' | 'project' | 'imported';

export interface AssetEntry {
  id: string;
  name: string;
  type: AssetType;
  source: AssetSource;
  /** builtin://textures/foo.png or project-relative path under assets/ */
  uri: string;
  meta?: {
    width?: number;
    height?: number;
    uuid?: string;
    spriteFrameUuid?: string;
    cocosMeta?: string;
    shape?: string;
    textureId?: string;
    /** Particle material: 'additive' | 'alpha' (synced with techIdx). */
    blend?: string;
    /** Cocos `_techIdx`: 0 = alpha, 1 = additive. */
    techIdx?: number;
    /** Cocos Effect UUID (particle builtin by default). */
    effectUuid?: string;
    /** Material tintColor (0–255 channels). */
    tintColor?: { r: number; g: number; b: number; a: number };
    /** Project texture asset id for material mainTexture prop. */
    mainTextureAssetId?: string;
    /** Imported Cocos texture UUID when no local asset is bound. */
    mainTextureUuid?: string;
    /** Project Shader asset used as Effect (Plan B). */
    effectShaderAssetId?: string;
    /** Full material document (Plan B canonical). */
    materialDoc?: import('@/types/material').MaterialDocument;
    description?: string;
    category?: string;
    /** 项目 Shader 资产的 Effect 源码 */
    shaderSource?: string;
  };
}

export interface EmitterAssetRefs {
  mainTexture?: string;
  material?: string;
  mesh?: string;
}
