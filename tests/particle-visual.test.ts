import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createParticleVisual,
  usesHorizontalPlane,
  setParticleVisualSize,
  applyParticleVisualRotation
} from '../src/utils/particle-visual';

describe('particle-visual', () => {
  it('uses horizontal plane for mesh and horizontalBillboard modes', () => {
    expect(usesHorizontalPlane('mesh')).toBe(true);
    expect(usesHorizontalPlane('horizontalBillboard')).toBe(true);
    expect(usesHorizontalPlane('billboard')).toBe(false);
  });

  it('creates mesh plane for horizontalBillboard', () => {
    const visual = createParticleVisual({
      texture: new THREE.Texture(),
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 1, 1),
      opacity: 1,
      renderMode: 'horizontalBillboard',
      size: 2
    });
    expect(visual.kind).toBe('mesh');
    expect(visual.object.rotation.x).toBeCloseTo(-Math.PI / 2, 4);
    setParticleVisualSize(visual, 3);
    expect(visual.object.scale.x).toBe(3);
    applyParticleVisualRotation(visual, 1.2);
    expect(visual.object.rotation.z).toBeCloseTo(1.2, 4);
    visual.material.dispose();
    (visual.object as THREE.Mesh).geometry.dispose();
  });
});
