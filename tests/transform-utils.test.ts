import { describe, it, expect } from 'vitest';
import { combineTransforms, applyTransformToPoint, identityTransform } from '../src/utils/transform-utils';
import * as THREE from 'three';

describe('transform-utils', () => {
  it('combines parent and local transforms', () => {
    const parent = identityTransform();
    parent.position = [2, 0, 0];
    const local = identityTransform();
    local.position = [0, 1, 0];
    const world = combineTransforms(parent, local);
    expect(world.position[0]).toBeCloseTo(2);
    expect(world.position[1]).toBeCloseTo(1);
  });

  it('applies transform to local point', () => {
    const t = identityTransform();
    t.position = [3, 0, 0];
    const p = applyTransformToPoint(t, new THREE.Vector3(1, 0, 0));
    expect(p.x).toBeCloseTo(4);
  });
});
