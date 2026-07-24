# Material Editor Plan B (Complete) — Design Spec

| Field | Value |
|-------|-------|
| Status | Approved (recommended path) |
| Date | 2026-07-24 |
| Scope | Cocos-like `cc.Material` inspector + `.mtl` / `.effect` round-trip |
| Baseline | Plan A (Technique / tint / mainTexture) already shipped |

---

## Goal

Provide a Material properties panel approaching Cocos Creator’s Material Inspector, with a durable document model that round-trips through `.mtl`, and (later) exports project Shader assets as `.effect` files.

## Non-Goals (this program)

- Full WebGL compile of arbitrary custom GLSL for pixel-perfect preview
- Shader Graph / node-based authoring
- Unity / Unreal material pipelines
- Scanning Cocos install directory for all builtin Effects

---

## Architecture

### Storage

- Primary: `AssetEntry.meta.materialDoc` — full `MaterialDocument` JSON
- Compatibility mirrors (kept in sync by getters/setters):
  - `blend`, `techIdx`, `effectUuid`, `tintColor`, `mainTextureAssetId`, `mainTextureUuid`, `effectShaderAssetId`
- Old projects with only `meta.blend` continue to load via migration in `getMaterialDocument()`

### Document model

```ts
type EffectRef =
  | { kind: 'builtin-uuid'; uuid: string }
  | { kind: 'shader-asset'; assetId: string; uuid?: string }
  | { kind: 'external-uuid'; uuid: string };

interface MaterialDocument {
  effect: EffectRef;
  techIdx: number;
  defines: Record<string, boolean | number | string>[];
  states: PassState[];
  props: Record<string, unknown>[];
  /** FX-only convenience mirrors */
  mainTextureAssetId?: string;
}

interface PassState {
  rasterizerState: { cullMode?: 'none' | 'front' | 'back' };
  depthStencilState: {
    depthTest?: boolean;
    depthWrite?: boolean;
    stencilTest?: boolean;
    // Stencil detail fields added in B3
  };
  blendState: {
    targets: Array<{
      blend?: boolean;
      blendSrc?: number | string;
      blendDst?: number | string;
      blendSrcAlpha?: number | string;
      blendDstAlpha?: number | string;
      blendEq?: number | string;
    }>;
  };
}
```

### Effect schema (B2+)

- Builtin particle Effect: hard-coded schema (techniques, macros, properties)
- Project Shader: parse `CCEffect %{...}%` YAML subset → `EffectSchema`
- Parse failure → empty schema; UI falls back to KV editors; raw `_props` / `_defines` preserved

### Layers

| Layer | Responsibility |
|-------|----------------|
| `types/material.ts` | Document + schema types |
| `utils/material-document.ts` | get/set/migrate/sync compat fields |
| `utils/mtl-io.ts` | parse/serialize full `.mtl` |
| `utils/effect-schema.ts` | CCEffect parse + builtin schemas (B2) |
| `MaterialAssetEditor` | Inspector UI |
| `export-pipeline` | Write `.mtl` (+ `.effect` in B4) |
| `material-blend` / preview | Map states to Three.js where possible |

---

## Phased delivery

### B1 — Skeleton (start now)

**Deliverables**

1. `MaterialDocument` + migration from Plan A fields
2. `.mtl` round-trip for `_defines`, `_states`, `_props`, `_effectAsset`, `_techIdx`
3. Inspector:
   - Effect: builtin particle / project Shader asset / external UUID (read-write)
   - Technique index
   - Defines: editable key-value table for `_defines[0]`
   - Pass States (single pass): cullMode, depthTest, depthWrite, blend, blendSrc, blendDst
   - Props: keep Plan A tint + mainTexture; preserve unknown props on serialize
4. Export/import use document model
5. Preview: blend + tint + mainTexture (existing); depthWrite optional if cheap

**Not in B1:** Effect YAML reflection, multi-pass UI, stencil detail, `.effect` file export

### B2 — Schema-driven UI ✅ (2026-07-24)

- Parse CCEffect techniques / properties / macros
- Builtin particle schema
- Props/Defines widgets generated from schema
- Unknown Effect → KV fallback

### B3 — Multi-pass & Stencil ✅ (2026-07-24)

- Multi-pass list editor
- Full stencil fields
- Optional advanced blend factors (srcAlpha/dstAlpha/eq)

### B4 — Export closed loop

- Export project Shader as `.effect` + `.meta` with stable UUID
- Material `_effectAsset` points at exported UUID
- Import preserves materialDoc
- Preview enhancements where feasible
- Docs update

---

## Compatibility rules

1. Reading always goes through `getMaterialDocument(asset)` (migrates legacy)
2. Writing updates `materialDoc` **and** compat mirrors
3. `techIdx` 0/1 still maps to particle alpha/additive when Effect is builtin particle
4. Changing Effect ref does not wipe unknown props until user confirms (B2 may offer reset)

## Acceptance (program)

- [ ] Open legacy Plan A materials without data loss
- [ ] Edit defines/states; `.mtl` preview matches export
- [ ] Prefab import restores defines/states/props
- [ ] B2+: schema drives particle props
- [ ] B4: custom shader material opens in Cocos after export package

## Risks

| Risk | Mitigation |
|------|------------|
| CCEffect dialect variance | Subset parser + KV fallback |
| Custom Effect missing in Cocos | B4 co-export `.effect` |
| Large UI complexity | Phase B1 first; ship usable skeleton |

---

## Decision log

- 2026-07-24: User chose **B-完整** with recommended order **B1→B2→B3→B4**; custom Effect export deferred to **B4**.
