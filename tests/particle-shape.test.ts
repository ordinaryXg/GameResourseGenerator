import { describe, it, expect } from 'vitest';
import { sampleShapeEmitPosition } from '../src/utils/particle-shape';
import type { ShapeModuleConfig } from '../src/types/effect';

function coneShape(emitFrom: ShapeModuleConfig['emitFrom']): ShapeModuleConfig {
  return {
    enabled: true,
    shapeType: 'cone',
    radius: 0.1,
    angle: 55.87,
    arc: 360,
    emitFrom
  };
}

describe('particle-shape', () => {
  it('keeps cone shell samples near surface with small radius', () => {
    const shape = coneShape('shell');
    for (let i = 0; i < 30; i++) {
      const p = sampleShapeEmitPosition(shape);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(coneHeight(shape) + 0.001);
      const rMax = shape.radius * (1 - p.y / coneHeight(shape));
      const r = Math.hypot(p.x, p.z);
      expect(r).toBeCloseTo(rMax, 2);
    }
  });

  it('places cone edge samples on base ring', () => {
    const shape = coneShape('edge');
    for (let i = 0; i < 20; i++) {
      const p = sampleShapeEmitPosition(shape);
      expect(p.y).toBeCloseTo(0);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(shape.radius, 4);
    }
  });
});

function coneHeight(shape: ShapeModuleConfig): number {
  const half = (shape.angle * Math.PI) / 360;
  return shape.radius / Math.tan(half);
}
