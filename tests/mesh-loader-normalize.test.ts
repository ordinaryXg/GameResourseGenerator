import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { normalizeParticleMeshGeometry } from '../src/utils/mesh-loader';

describe('normalizeParticleMeshGeometry', () => {
  it('centers geometry and scales max axis to 1', () => {
    const geometry = new THREE.BoxGeometry(20, 10, 5);
    geometry.translate(5, 0, 0);
    normalizeParticleMeshGeometry(geometry);
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1, 4);
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    expect(center.length()).toBeLessThan(1e-4);
    geometry.dispose();
  });
});
