/** Effect reflection schema used to drive Material Inspector (Plan B2). */

export type EffectPropEditorType =
  | 'color'
  | 'texture'
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'number'
  | 'boolean'
  | 'unknown';

export interface EffectPropertyDef {
  name: string;
  type: EffectPropEditorType;
  /** Default value hint (Cocos `value`). */
  defaultValue?: unknown;
  displayName?: string;
}

export interface EffectMacroDef {
  name: string;
  defaultValue?: boolean | number | string;
  displayName?: string;
}

export interface EffectPassDef {
  name?: string;
  macros?: EffectMacroDef[];
}

export interface EffectTechniqueDef {
  name: string;
  passes: EffectPassDef[];
}

export interface EffectSchema {
  /** Source label for UI. */
  name: string;
  /** True when schema came from hard-coded builtin table. */
  builtin: boolean;
  /** True when parser failed / incomplete — UI should allow KV fallback. */
  partial: boolean;
  techniques: EffectTechniqueDef[];
  /** Material-level properties (Cocos `properties:`). */
  properties: EffectPropertyDef[];
  /** Union of macros from techniques/passes + top-level. */
  macros: EffectMacroDef[];
}

export const EMPTY_EFFECT_SCHEMA: EffectSchema = {
  name: 'unknown',
  builtin: false,
  partial: true,
  techniques: [{ name: 'technique-0', passes: [{}] }],
  properties: [],
  macros: []
};
