# Material Editor B4 — Custom Effect Export Loop Implementation Plan

> **For agentic workers:** Implement task-by-task.

**Goal:** Export project Shader assets as Cocos `.effect` + `.meta` with stable UUIDs; materials reference that UUID; import preserves `materialDoc` and re-links shaders.

**Spec:** `docs/superpowers/specs/2026-07-24-material-editor-b-design.md` § B4

**Architecture:** Stable Effect UUID lives on `AssetEntry.meta.uuid` for shader assets and is mirrored onto `MaterialDocument.effect.uuid`. Export co-writes `.effect`/`.effect.meta` beside `.mtl`. Import indexes `.effect` by UUID and rebinds materials to `shader-asset` refs.

**Tech Stack:** TypeScript, existing export-pipeline / prefab-import-bundle, Vitest

## File map

| File | Role |
|------|------|
| `src/utils/effect-io.ts` | Stable UUID, `.effect` content + `.meta` builders |
| `src/utils/material-document.ts` | `getEffectUuid(doc, getAsset?)` resolves shader UUID |
| `src/utils/export-pipeline.ts` | Collect/export referenced shaders; manifest category `effect` |
| `src/utils/export-formats.ts` | Delegate / accept stable UUID |
| `src/utils/prefab-import-bundle.ts` | Index/bind `.effect`; preserve materialDoc; re-link shader |
| `src/utils/prefab-import-scan.ts` | Scan `.effect` + `effects`/`shaders` dirs |
| `src/utils/cocos-serializers.ts` | `buildEffectMeta` (or keep in effect-io) |
| `MaterialAssetEditor.tsx` / `ShaderAssetEditor.tsx` | Stamp UUID; remove B4 placeholder |
| `tests/effect-export.test.ts` | Export + import round-trip |

## Tasks

1. effect-io + stable UUID helpers
2. Export pipeline co-export `.effect`
3. Import bind `.effect` + materialDoc re-link
4. UI + docs + tests + commit

## Acceptance

- [x] Material with project Shader exports `.effect` + `.mtl` sharing UUID
- [x] Re-export same shader keeps same UUID when `meta.uuid` set
- [x] Import restores materialDoc defines/states/props
- [x] Import creates shader asset and links `effectShaderAssetId`
