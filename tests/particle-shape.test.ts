import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { normalizeShapeModule, sampleShapeEmitPosition, sampleConeEmitPair, coneAxisLength, coneTopRadius, sampleShapeEmitVelocity, sampleEmitMotion } from '../src/utils/particle-shape';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { collectEmitterPreviewSources } from '../src/utils/preview-sources';
import type { ShapeModuleConfig } from '../src/types/effect';

function coneShape(emitFrom: ShapeModuleConfig['emitFrom']): ShapeModuleConfig {
  return normalizeShapeModule({
    enabled: true,
    shapeType: 'cone',
    radius: 0.1,
    angle: 55.87,
    length: 0.087,
    arc: 360,
    emitFrom,
    radiusThickness: 1
  });
}

describe('particle-shape', () => {
  it('keeps cone shell samples on bottom ring (Cocos shell)', () => {
    const shape = coneShape('shell');
    for (let i = 0; i < 30; i++) {
      const p = sampleShapeEmitPosition(shape);
      expect(Math.abs(p.z)).toBeLessThan(0.001);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(shape.radius, 2);
    }
  });

  it('places cone base samples on base disk', () => {
    const shape = coneShape('base');
    for (let i = 0; i < 20; i++) {
      const p = sampleShapeEmitPosition(shape);
      expect(Math.abs(p.z)).toBeLessThan(0.001);
    }
  });

  it('fills cone volume along -Z up to length', () => {
    const shape = coneShape('volume');
    for (let i = 0; i < 30; i++) {
      const p = sampleShapeEmitPosition(shape);
      expect(p.z).toBeLessThanOrEqual(0.001);
      expect(p.z).toBeGreaterThanOrEqual(-shape.length - 0.001);
    }
  });

  it('returns matched position and direction for cone emit pair', () => {
    const shape = coneShape('shell');
    const { position, direction } = sampleConeEmitPair(shape);
    expect(direction.z).toBeLessThan(0);
  });

  it('computes truncated cone dimensions for smok', () => {
    const shape = coneShape('shell');
    const axisLength = coneAxisLength(shape);
    const topRadius = coneTopRadius(shape, axisLength);
    expect(axisLength).toBeCloseTo(0.087, 3);
    expect(topRadius).toBeGreaterThanOrEqual(0);
    expect(topRadius).toBeLessThanOrEqual(shape.radius);
  });

  it('normalizes legacy partial shape configs', () => {
    const shape = normalizeShapeModule({
      enabled: true,
      shapeType: 'cone',
      radius: 0.1,
      angle: 30,
      arc: 360,
      emitFrom: 'shell'
    } as any);
    expect(shape.radiusThickness).toBe(1);
    expect(shape.length).toBe(0);
    expect(shape.alignToDirection).toBe(false);
    expect(shape.boxThickness).toEqual([0, 0, 0]);
  });

  it('uses Cocos particleEmitZAxis when shape module is disabled', () => {
    const shape = normalizeShapeModule({
      enabled: false,
      shapeType: 'cone',
      radius: 1,
      angle: 25,
      arc: 360,
      emitFrom: 'volume'
    });
    const velocity = sampleShapeEmitVelocity(shape, 5);
    expect(velocity.x).toBeCloseTo(0);
    expect(velocity.y).toBeCloseTo(0);
    expect(velocity.z).toBeCloseTo(-5);

    const motion = sampleEmitMotion(
      { shapeModule: shape, mainModule: { startSpeed: { mode: 'constant', constant: 5 } } } as any,
      5
    );
    expect(motion.position.x).toBeCloseTo(0);
    expect(motion.position.y).toBeCloseTo(0);
    expect(motion.position.z).toBeCloseTo(0);
    expect(motion.velocity.z).toBeCloseTo(-5);
  });
});

describe('blizzardWhirl fire_glow disabled shape', () => {
  it('emits along local -Z when shape module is disabled', () => {
    const prefabPath = 'd:/Desktop/blizzardWhirl/resources/effect_anima/BlizzardWhirl/blizzardWhirl.prefab';
    if (!existsSync(prefabPath)) return;

    const parsed = parsePrefabToProject(readFileSync(prefabPath, 'utf8'), 'blizzardWhirl');
    const source = collectEmitterPreviewSources(parsed.project.root).find(s => s.name === 'fire_glow');
    expect(source).toBeTruthy();
    expect(source.config.shapeModule.enabled).toBe(false);
    expect(source.config.mainModule.startSpeed.constant).toBe(5);

    const motion = sampleEmitMotion(source.config, 5);
    expect(motion.velocity.z).toBeCloseTo(-5);
    expect(motion.velocity.length()).toBeCloseTo(5);
  });
});

describe('smok shape import expectations', () => {
  it('matches smok cone shell settings when normalized', () => {
    const shape = normalizeShapeModule({
      enabled: true,
      shapeType: 'cone',
      emitFrom: 'shell',
      radius: 0.1,
      radiusThickness: 1,
      angle: 55.87,
      length: 0.087,
      arc: 360,
      arcMode: 0,
      arcSpread: 0
    });
    expect(shape.emitFrom).toBe('shell');
    expect(shape.length).toBe(0.087);
    expect(shape.radiusThickness).toBe(1);
  });
});
