import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { parseProjectJson } from '../src/utils/project-io';
import { collectEmitterPreviewSources } from '../src/utils/preview-sources';
import { sampleEmitMotion } from '../src/utils/particle-shape';
import { buildEmitterGizmo } from '../src/utils/emitter-gizmo';
import { normalizeParticle3DConfig } from '../src/utils/particle-config-normalize';

const FXPROJ = 'D:/Desktop/Ext_attckSmoke.fxproj';

describe('Ext_attckSmoke.fxproj load', () => {
  beforeAll(() => {
    if (typeof document === 'undefined') {
      (globalThis as typeof globalThis & { document: Document }).document = {
        createElement: () => {
          const ctx = {
            font: '',
            measureText: () => ({ width: 80 }),
            fillText: () => undefined
          };
          return { getContext: () => ctx, width: 96, height: 24 } as unknown as HTMLCanvasElement;
        }
      } as unknown as Document;
    }
  });

  it('normalizes legacy emitter config from saved project', () => {
    if (!existsSync(FXPROJ)) return;

    const project = parseProjectJson(readFileSync(FXPROJ, 'utf8'));
    const sources = collectEmitterPreviewSources(project.root);
    expect(sources).toHaveLength(1);

    const cfg = sources[0].config;
    expect(cfg.shapeModule.radiusThickness).toBe(1);
    expect(cfg.textureAnimation.cycleCount).toBeGreaterThan(0);
    expect(cfg.textureAnimation.startFrame.mode).toBe('constant');

    for (let i = 0; i < 30; i++) {
      const motion = sampleEmitMotion(cfg, 0.8);
      expect(Number.isFinite(motion.position.x)).toBe(true);
      expect(Number.isFinite(motion.velocity.z)).toBe(true);
    }

    const gizmo = buildEmitterGizmo({
      id: sources[0].id,
      name: sources[0].name,
      config: cfg,
      transform: sources[0].transform,
      enabled: true
    });
    expect(gizmo.children.length).toBeGreaterThan(0);
  });

  it('fills missing modules without dropping saved values', () => {
    if (!existsSync(FXPROJ)) return;

    const raw = JSON.parse(readFileSync(FXPROJ, 'utf8'));
    const emitter = raw.root.children[0];
    const normalized = normalizeParticle3DConfig(emitter.config);

    expect(normalized.mainModule.rateOverTime).toBe(100);
    expect(normalized.shapeModule.angle).toBeCloseTo(55.87);
    expect(normalized.shapeModule.emitFrom).toBe('shell');
    expect(normalized.textureAnimation.numTilesX).toBe(4);
  });
});
