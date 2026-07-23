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
    cocosMeta?: string;
    shape?: string;
    textureId?: string;
    blend?: string;
  };
}

export interface EmitterAssetRefs {
  mainTexture?: string;
  material?: string;
  mesh?: string;
}
