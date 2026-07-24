# Material Editor B2 — Schema-driven UI Implementation Plan

> **For agentic workers:** Implement task-by-task.

**Goal:** Drive Material Technique / Defines / Props UI from EffectSchema (builtin particle + CCEffect subset parse), with KV fallback for unknown effects.

**Spec:** `docs/superpowers/specs/2026-07-24-material-editor-b-design.md` § B2

## File map

| File | Role |
|------|------|
| `src/types/effect-schema.ts` | EffectSchema types |
| `src/data/builtin-particle-effect-schema.ts` | Hard-coded Cocos particle Effect schema |
| `src/utils/effect-schema.ts` | Parse CCEffect + resolve schema for MaterialDocument |
| `src/components/properties/editors/MaterialSchemaFields.tsx` | Schema-driven Defines/Props widgets |
| `MaterialAssetEditor.tsx` | Use schema for technique list + schema fields |
| `tests/effect-schema.test.ts` | Parser + builtin schema tests |

## Tasks

1. Types + builtin particle schema
2. CCEffect `%{...}%` subset parser (techniques names, properties, macros)
3. `resolveEffectSchema(doc, getAsset)` 
4. Wire MaterialAssetEditor
5. Tests + build + commit
