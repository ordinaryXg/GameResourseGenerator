/** Cocos Creator Color (0–255 channels). */
export interface CocosColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ParticleBlendMode = 'additive' | 'alpha';

export type CullMode = 'none' | 'front' | 'back';

export type EffectRef =
  | { kind: 'builtin-uuid'; uuid: string }
  | { kind: 'shader-asset'; assetId: string; uuid?: string }
  | { kind: 'external-uuid'; uuid: string };

export interface BlendTargetState {
  blend?: boolean;
  blendSrc?: number | string;
  blendDst?: number | string;
  blendSrcAlpha?: number | string;
  blendDstAlpha?: number | string;
  blendEq?: number | string;
}

export interface PassState {
  rasterizerState: {
    cullMode?: CullMode;
  };
  depthStencilState: {
    depthTest?: boolean;
    depthWrite?: boolean;
    stencilTest?: boolean;
  };
  blendState: {
    targets: BlendTargetState[];
  };
}

/** Canonical material document (Plan B). Stored in `meta.materialDoc`. */
export interface MaterialDocument {
  effect: EffectRef;
  techIdx: number;
  defines: Record<string, boolean | number | string>[];
  states: PassState[];
  props: Record<string, unknown>[];
  mainTextureAssetId?: string;
}

/**
 * Particle material subset (Plan A compat view).
 * Derived from MaterialDocument / legacy meta mirrors.
 */
export interface ParticleMaterialConfig {
  effectUuid: string;
  techIdx: number;
  blend: ParticleBlendMode;
  tintColor: CocosColorRGBA;
  mainTextureAssetId?: string;
  mainTextureUuid?: string;
}

export const DEFAULT_TINT_COLOR: CocosColorRGBA = { r: 255, g: 255, b: 255, a: 255 };

/** Cocos Creator 3.x builtin particle Effect UUID. */
export const BUILTIN_PARTICLE_EFFECT_UUID = 'd1346436-ac96-4271-b863-1f4fdead95b0';

/** Common WebGL blend factor enums used by Cocos. */
export const BLEND_FACTOR_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'ZERO (0)' },
  { value: 1, label: 'ONE (1)' },
  { value: 770, label: 'SRC_ALPHA (770)' },
  { value: 771, label: 'ONE_MINUS_SRC_ALPHA (771)' },
  { value: 768, label: 'SRC_COLOR (768)' },
  { value: 769, label: 'ONE_MINUS_SRC_COLOR (769)' },
  { value: 774, label: 'DST_COLOR (774)' },
  { value: 775, label: 'ONE_MINUS_DST_COLOR (775)' },
  { value: 772, label: 'DST_ALPHA (772)' },
  { value: 773, label: 'ONE_MINUS_DST_ALPHA (773)' }
];
