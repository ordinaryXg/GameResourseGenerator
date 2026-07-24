# Material Editor B3 — Multi-pass & Stencil Implementation Plan

> **For agentic workers:** Implement task-by-task.

**Goal:** Multi-pass list editor with full stencil fields and advanced blend factors (srcAlpha/dstAlpha/eq).

**Spec:** `docs/superpowers/specs/2026-07-24-material-editor-b-design.md` § B3

## File map

| File | Role |
|------|------|
| `src/types/material.ts` | Extend PassState.depthStencilState + blend eq options |
| `src/utils/material-document.ts` | Normalize new stencil/blend fields |
| `src/components/properties/editors/MaterialPassStatesEditor.tsx` | Multi-pass UI |
| `MaterialAssetEditor.tsx` | Replace Pass 0-only section |
| `tests/material-pass-states.test.ts` | Round-trip + normalize tests |

## Tasks

1. Types + normalizePassState
2. MaterialPassStatesEditor (add/remove/select pass, stencil, advanced blend)
3. Wire editor + mtl round-trip tests
4. Commit + push
