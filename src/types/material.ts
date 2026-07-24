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
  blendAlphaEq?: number | string;
}

export interface DepthStencilState {
  depthTest?: boolean;
  depthWrite?: boolean;
  depthFunc?: number | string;
  stencilTest?: boolean;
  stencilFunc?: number | string;
  stencilReadMask?: number;
  stencilWriteMask?: number;
  stencilFailOp?: number | string;
  stencilZFailOp?: number | string;
  stencilZPassOp?: number | string;
  stencilRef?: number;
}

export interface PassState {
  /** Optional display label in multi-pass UI. */
  name?: string;
  rasterizerState: {
    cullMode?: CullMode;
  };
  depthStencilState: DepthStencilState;
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

/** WebGL blend equation enums. */
export const BLEND_EQ_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 32774, label: 'FUNC_ADD (32774)' },
  { value: 32778, label: 'FUNC_SUBTRACT (32778)' },
  { value: 32779, label: 'FUNC_REVERSE_SUBTRACT (32779)' },
  { value: 32775, label: 'MIN (32775)' },
  { value: 32776, label: 'MAX (32776)' }
];

/** Common depth / stencil compare funcs. */
export const COMPARE_FUNC_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 512, label: 'NEVER (512)' },
  { value: 513, label: 'LESS (513)' },
  { value: 514, label: 'EQUAL (514)' },
  { value: 515, label: 'LEQUAL (515)' },
  { value: 516, label: 'GREATER (516)' },
  { value: 517, label: 'NOTEQUAL (517)' },
  { value: 518, label: 'GEQUAL (518)' },
  { value: 519, label: 'ALWAYS (519)' }
];

/** Stencil ops. */
export const STENCIL_OP_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7680, label: 'KEEP (7680)' },
  { value: 7681, label: 'ZERO (7681)' },
  { value: 7682, label: 'REPLACE (7682)' },
  { value: 7683, label: 'INCR (7683)' },
  { value: 7684, label: 'DECR (7684)' },
  { value: 5386, label: 'INVERT (5386)' },
  { value: 34055, label: 'INCR_WRAP (34055)' },
  { value: 34056, label: 'DECR_WRAP (34056)' }
];
