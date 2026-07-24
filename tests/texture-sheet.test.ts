import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyTextureSheetFrame,
  frameIndexToGrid,
  resolveTextureSheetFrameIndex,
  sampleTextureSheetContext
} from '../src/utils/texture-sheet';
import type { TextureAnimationConfig } from '../src/types/effect';

function sheetConfig(overrides: Partial<TextureAnimationConfig> = {}): TextureAnimationConfig {
  return {
    enabled: true,
    numTilesX: 4,
    numTilesY: 4,
    animation: 0,
    frameOverTime: {
      keys: [{ time: 0, value: 0 }, { time: 1, value: 1 }],
      multiplier: 1
    },
    startFrame: { mode: 'constant', constant: 0 },
    cycleCount: 1,
    flipU: false,
    flipV: false,
    randomRow: false,
    rowIndex: 0,
    ...overrides
  };
}

describe('texture-sheet', () => {
  it('maps whole-sheet animation across 4x4 tiles', () => {
    const cfg = sheetConfig();
    const ctx = sampleTextureSheetContext(cfg);
    expect(resolveTextureSheetFrameIndex(cfg, 0, ctx)).toBe(0);
    expect(resolveTextureSheetFrameIndex(cfg, 0.5, ctx)).toBe(8);
    expect(resolveTextureSheetFrameIndex(cfg, 1, ctx)).toBe(15);
  });

  it('applies cycleCount over particle lifetime', () => {
    const cfg = sheetConfig({ cycleCount: 2 });
    const ctx = sampleTextureSheetContext(cfg);
    expect(resolveTextureSheetFrameIndex(cfg, 0.25, ctx)).toBe(8);
    expect(resolveTextureSheetFrameIndex(cfg, 0.5, ctx)).toBe(15);
  });

  it('maps single-row animation on selected row', () => {
    const cfg = sheetConfig({ animation: 1, rowIndex: 2 });
    const ctx = sampleTextureSheetContext(cfg);
    expect(resolveTextureSheetFrameIndex(cfg, 0, ctx)).toBe(8);
    expect(resolveTextureSheetFrameIndex(cfg, 0.5, ctx)).toBe(10);
  });

  it('applies startFrame offset', () => {
    const cfg = sheetConfig({ startFrame: { mode: 'constant', constant: 2 } });
    const ctx = sampleTextureSheetContext(cfg);
    expect(resolveTextureSheetFrameIndex(cfg, 0, ctx)).toBe(2);
  });

  it('sets UV offset for top-left tile in 4x4 sheet', () => {
    const tex = new THREE.Texture();
    applyTextureSheetFrame(tex, 0, 4, 4);
    expect(tex.repeat.x).toBeCloseTo(0.25);
    expect(tex.repeat.y).toBeCloseTo(0.25);
    expect(tex.offset.x).toBeCloseTo(0);
    expect(tex.offset.y).toBeCloseTo(0.75);
  });

  it('flips U/V when requested', () => {
    const tex = new THREE.Texture();
    applyTextureSheetFrame(tex, 0, 4, 4, true, true);
    expect(tex.repeat.x).toBeLessThan(0);
    expect(tex.repeat.y).toBeLessThan(0);
  });

  it('sets UV offset for second row first column (frame 4)', () => {
    const tex = new THREE.Texture();
    const { col, row } = frameIndexToGrid(4, 4, 4);
    expect(col).toBe(0);
    expect(row).toBe(1);
    applyTextureSheetFrame(tex, 4, 4, 4);
    expect(tex.offset.x).toBeCloseTo(0);
    expect(tex.offset.y).toBeCloseTo(0.5);
  });
});
