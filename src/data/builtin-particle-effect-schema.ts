import type { EffectSchema } from '@/types/effect-schema';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '@/types/material';

/**
 * Hard-coded schema for Cocos Creator builtin particle Effect
 * (`d1346436-ac96-4271-b863-1f4fdead95b0`).
 * Technique 0 = transparent, 1 = additive (engine convention).
 */
export const BUILTIN_PARTICLE_EFFECT_SCHEMA: EffectSchema = {
  name: 'builtin-particle',
  builtin: true,
  partial: false,
  techniques: [
    {
      name: 'transparent',
      passes: [{ name: 'default', macros: [] }]
    },
    {
      name: 'additive',
      passes: [{ name: 'default', macros: [] }]
    }
  ],
  properties: [
    {
      name: 'mainTexture',
      type: 'texture',
      displayName: 'mainTexture',
      defaultValue: null
    },
    {
      name: 'tintColor',
      type: 'color',
      displayName: 'tintColor',
      defaultValue: { r: 255, g: 255, b: 255, a: 255 }
    }
  ],
  macros: [
    { name: 'USE_ALPHA_TEST', defaultValue: false, displayName: 'Alpha Test' },
    { name: 'CC_USE_EMBEDDED_ALPHA', defaultValue: false, displayName: 'Embedded Alpha' }
  ]
};

export function isBuiltinParticleEffectUuid(uuid: string | undefined): boolean {
  return !!uuid && uuid === BUILTIN_PARTICLE_EFFECT_UUID;
}
