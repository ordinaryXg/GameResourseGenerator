# Material Editor B1 Skeleton — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a MaterialDocument-backed inspector with Effect selection, Defines KV, single-pass States, and full `.mtl` round-trip while keeping Plan A particle props.

**Architecture:** Store canonical `meta.materialDoc`; migrate legacy blend/tint fields on read; serialize through `mtl-io`; UI edits patch the document and sync compat mirrors.

**Tech Stack:** TypeScript, React, Vitest, existing Zustand asset/project stores.

**Spec:** `docs/superpowers/specs/2026-07-24-material-editor-b-design.md`

## Global Constraints

- Do not break Plan A materials (`meta.blend` only).
- Do not export `.effect` files in B1.
- Builtin particle Effect UUID remains `d1346436-ac96-4271-b863-1f4fdead95b0`.
- Prefer extending existing `mtl-io` / `MaterialAssetEditor` over parallel systems.

---

## File map

| File | Role |
|------|------|
| `src/types/material.ts` | Add MaterialDocument, PassState, EffectRef |
| `src/types/asset.ts` | Add `meta.materialDoc`, `effectShaderAssetId` |
| `src/utils/material-document.ts` | **New** get/migrate/patch/sync |
| `src/utils/mtl-io.ts` | Full defines/states/props parse/serialize |
| `src/utils/particle-material.ts` | Delegate to material-document or thin wrappers |
| `src/utils/export-pipeline.ts` | Export from MaterialDocument |
| `src/utils/prefab-import-bundle.ts` | Import fills materialDoc |
| `src/components/properties/editors/MaterialAssetEditor.tsx` | B1 UI sections |
| `tests/material-document.test.ts` | **New** migration + patch tests |
| `tests/mtl-io.test.ts` | Expand round-trip cases |

---

## Task 1: Types + material-document core

- [ ] Extend `src/types/material.ts` with `EffectRef`, `PassState`, `MaterialDocument`, defaults
- [ ] Add `meta.materialDoc?: MaterialDocument` and `effectShaderAssetId?: string` to `asset.ts`
- [ ] Create `src/utils/material-document.ts`:
  - `defaultMaterialDocument()`
  - `getMaterialDocument(asset)`
  - `materialDocumentMetaPatch(doc | partial)`
  - `syncCompatMirrors(doc)` → blend/techIdx/tint/effectUuid/…
- [ ] Write `tests/material-document.test.ts` for legacy blend→doc migration
- [ ] Run tests; commit

## Task 2: mtl-io full round-trip

- [ ] `parseMtlObject` → MaterialDocument (defines, states, props, effect)
- [ ] `serializeMaterialDocument(doc, options)` → cc.Material JSON
- [ ] Keep `serializeParticleMaterial` as wrapper for compat
- [ ] Tests: parse sample with non-empty states/defines; serialize equality of key fields
- [ ] Run tests; commit

## Task 3: Wire export/import

- [ ] `export-pipeline` builds `.mtl` via `serializeMaterialDocument(getMaterialDocument(matAsset))`
- [ ] `prefab-import-bundle` merges parsed doc into `meta.materialDoc`
- [ ] `buildParticleMaterial` can accept document or keep options object
- [ ] Run export / import related tests; commit

## Task 4: MaterialAssetEditor B1 UI

- [ ] Effect section: select `builtin-particle` | project shaders list | external UUID text
- [ ] Technique: number/select techIdx
- [ ] Defines: simple table add/remove key + bool/string value for defines[0]
- [ ] Pass States (pass 0): cullMode, depthTest, depthWrite, blend, blendSrc, blendDst (common GL enums as select)
- [ ] Props: retain tintColor + mainTexture AssetSlot; show note that unknown props are preserved
- [ ] `.mtl` preview from `serializeMaterialDocument`
- [ ] Manual smoke: copy builtin mat → edit states → preview source updates

## Task 5: Preview + regression

- [ ] Ensure blend/tint still drive preview via compat mirrors
- [ ] Optionally map depthWrite to SpriteMaterial.depthWrite
- [ ] `npm run build && npm test`
- [ ] Commit + push

---

## Done when

- Legacy materials open and export unchanged in behavior
- New fields round-trip through parse → edit → serialize
- Inspector exposes Effect / Defines / Pass States for project materials
- All tests green
