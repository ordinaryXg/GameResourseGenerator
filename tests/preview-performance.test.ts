import { describe, it, expect } from 'vitest';
import { createExplosionProject } from './helpers/explosion-project';
import {
  collectEmitterPreviewSources,
  estimatePreviewParticleBudget
} from '../src/utils/preview-sources';

/** v2.0 非功能基线：5 Emitter × 200 粒子 → 预览 ≥ 30 FPS（手工在 E2E 中验证帧率）。 */
const PERF_EMITTER_LIMIT = 5;
const PERF_PARTICLE_PER_EMITTER = 200;
const PERF_TOTAL_BUDGET = PERF_EMITTER_LIMIT * PERF_PARTICLE_PER_EMITTER;

describe('preview performance budget', () => {
  it('explosion preset stays within 5-emitter particle budget when capped', () => {
    const project = createExplosionProject();
    const sources = collectEmitterPreviewSources(project.root).slice(0, PERF_EMITTER_LIMIT);
    const capped = sources.map(s => ({
      ...s,
      config: {
        ...s.config,
        mainModule: { ...s.config.mainModule, capacity: PERF_PARTICLE_PER_EMITTER }
      }
    }));
    expect(capped.length).toBeLessThanOrEqual(PERF_EMITTER_LIMIT);
    expect(estimatePreviewParticleBudget(capped)).toBeLessThanOrEqual(PERF_TOTAL_BUDGET);
  });

  it('estimatePreviewParticleBudget sums emitter capacities', () => {
    const project = createExplosionProject();
    const sources = collectEmitterPreviewSources(project.root);
    const budget = estimatePreviewParticleBudget(sources);
    expect(budget).toBeGreaterThan(0);
    expect(budget).toBe(
      sources.reduce((n, s) => n + s.config.mainModule.capacity, 0)
    );
  });
});
