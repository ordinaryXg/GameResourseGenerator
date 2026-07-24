import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { existsSync, readFileSync } from 'fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';
import {
  computeParticleScale3D,
  computeMeshParticleQuaternion,
  sampleStartParticleSize3D,
  applyMeshParticleOrientation,
  particleQuaternionFromCocosEuler
} from '../src/utils/particle-mesh';
import { createParticleVisual } from '../src/utils/particle-visual';
import { normalizeParticleMeshGeometry } from '../src/utils/mesh-loader';

describe('particle-mesh', () => {
  it('uses non-uniform startSize3D axes', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.mainModule.useStartSize3D = true;
    cfg.mainModule.startSize3D = {
      x: { mode: 'constant', constant: 3.2 },
      y: { mode: 'constant', constant: 3.1 },
      z: { mode: 'constant', constant: 2.5 }
    };
    expect(sampleStartParticleSize3D(cfg)).toEqual([3.2, 3.1, 2.5]);
    expect(computeParticleScale3D(cfg, [3.2, 3.1, 2.5], 0)).toEqual([3.2, 3.1, 2.5]);
  });

  it('integrates separate-axis angular velocity with quaternion multiply', () => {
    const cfg = getDefaultParticle3DConfig();
    cfg.rotationOverLifetime.enabled = true;
    cfg.rotationOverLifetime.separateAxes = true;
    const quat = computeMeshParticleQuaternion(
      cfg,
      [0, 0, 0],
      [0, 0, 2],
      1.5,
      0.3
    );
    const delta = particleQuaternionFromCocosEuler([0, 0, 3]);
    expect(quat.angleTo(delta)).toBeLessThan(0.01);
  });

  it('applies alignSpace world rotation before particle rotation', () => {
    const visual = createParticleVisual({
      texture: new THREE.Texture(),
      blending: THREE.NormalBlending,
      color: new THREE.Color(1, 1, 1),
      opacity: 1,
      renderMode: 'mesh',
      size: 1,
      meshGeometry: new THREE.BoxGeometry(1, 1, 1)
    });
    applyMeshParticleOrientation(visual, new THREE.Quaternion(), {
      alignSpace: 'world',
      simulationSpace: 'local',
      emitterTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 180],
        scale: [1, 1, 1]
      }
    });
    const euler = new THREE.Euler().setFromQuaternion(visual.object.quaternion, 'XYZ');
    expect(Math.abs(euler.z)).toBeCloseTo(Math.PI, 3);
    visual.material.dispose();
    (visual.object as THREE.Mesh).geometry.dispose();
  });

  it('feng wind mesh points upward after Cocos basis fix and startRotation3D', () => {
    const windMeshPath = 'd:/Desktop/blizzardWhirl/resources/effect_anima/WhirlRes/wind_mesh1.FBX';
    if (!existsSync(windMeshPath)) return;

    const loader = new FBXLoader();
    const root = loader.parse(readFileSync(windMeshPath).buffer, windMeshPath);
    root.updateMatrixWorld(true);
    const parts: THREE.BufferGeometry[] = [];
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      parts.push(geo);
    });
    expect(parts.length).toBeGreaterThan(0);
    const geometry = normalizeParticleMeshGeometry(parts[0]!);

    const cfg = getDefaultParticle3DConfig();
    const startRotation3D: [number, number, number] = [-Math.PI / 2, -Math.PI, Math.PI];
    const particleQuat = computeMeshParticleQuaternion(cfg, startRotation3D, [0, 0, 0], 0, 0);
    const visual = createParticleVisual({
      texture: new THREE.Texture(),
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 1, 1),
      opacity: 1,
      renderMode: 'mesh',
      size: 1,
      meshGeometry: geometry
    });
    applyMeshParticleOrientation(visual, particleQuat, {
      alignSpace: 'world',
      simulationSpace: 'local',
      emitterTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 180],
        scale: [1, 1, 1]
      }
    });

    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    const dominantAxis = size.y >= size.x && size.y >= size.z
      ? new THREE.Vector3(0, 1, 0)
      : size.x >= size.y && size.x >= size.z
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 0, 1);

    const up = dominantAxis.applyQuaternion(visual.object.quaternion);
    expect(up.y).toBeGreaterThan(0.95);
    expect(Math.abs(up.x)).toBeLessThan(0.2);
    expect(Math.abs(up.z)).toBeLessThan(0.2);

    visual.material.dispose();
    (visual.object as THREE.Mesh).geometry.dispose();
    for (const part of parts) part.dispose();
  });
});
