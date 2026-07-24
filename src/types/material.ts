/** Cocos Creator Color (0–255 channels). */
export interface CocosColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ParticleBlendMode = 'additive' | 'alpha';

/**
 * Particle material subset aligned with Cocos builtin particle Effect
 * (`d1346436-ac96-4271-b863-1f4fdead95b0`): Technique 0 = alpha, 1 = additive.
 */
export interface ParticleMaterialConfig {
  effectUuid: string;
  /** 0 = transparent / alpha, 1 = additive */
  techIdx: number;
  blend: ParticleBlendMode;
  tintColor: CocosColorRGBA;
  /** Project texture asset used as material `_props.mainTexture` when exporting. */
  mainTextureAssetId?: string;
  /** Cocos texture / sprite-frame UUID from imported `.mtl` when no local asset is bound. */
  mainTextureUuid?: string;
}

export const DEFAULT_TINT_COLOR: CocosColorRGBA = { r: 255, g: 255, b: 255, a: 255 };

/** Cocos Creator 3.x builtin particle Effect UUID. */
export const BUILTIN_PARTICLE_EFFECT_UUID = 'd1346436-ac96-4271-b863-1f4fdead95b0';
