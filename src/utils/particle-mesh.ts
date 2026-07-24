import * as THREE from 'three';
import type { AlignmentSpace, Particle3DConfig, SimulationSpace } from '@/types/effect';
import type { Transform3D } from '@/types/project';
import { sampleCurveConfig } from '@/utils/curve-utils';
import { sampleRangeValue } from '@/utils/particle-size';
import { transformToMatrix } from '@/utils/transform-utils';
import type { ParticleVisual } from '@/utils/particle-visual';

export {
  sampleStartParticleSize3D,
  computeParticleScale3D
} from '@/utils/particle-size';

export function sampleStartRotation3D(config: Particle3DConfig): [number, number, number] {
  const rot = config.mainModule.startRotation3D;
  return [
    sampleRangeValue(rot.x),
    sampleRangeValue(rot.y),
    sampleRangeValue(rot.z)
  ];
}

export function sampleAngularVelocity3D(config: Particle3DConfig): [number, number, number] {
  const rot = config.rotationOverLifetime;
  return [
    sampleRangeValue(rot.angularVelocityX ?? { mode: 'constant', constant: 0 }),
    sampleRangeValue(rot.angularVelocityY ?? { mode: 'constant', constant: 0 }),
    sampleRangeValue(rot.angularVelocityZ ?? { mode: 'constant', constant: 0 })
  ];
}

/** Cocos `Quat.fromEuler` uses intrinsic Y-Z-X with radian inputs converted to degrees internally. */
const COCOS_PARTICLE_EULER_ORDER = 'YZX' as const;

export function particleQuaternionFromCocosEuler(rotation3D: [number, number, number]): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      rotation3D[0],
      rotation3D[1],
      rotation3D[2],
      COCOS_PARTICLE_EULER_ORDER
    )
  );
}

/**
 * Match Cocos rotation-overtime: startRotation matrix × accumulated angular delta.
 * @see cocos-engine rotation-overtime.ts
 */
export function computeMeshParticleQuaternion(
  config: Particle3DConfig,
  startRotation3D: [number, number, number],
  angularVelocity3D: [number, number, number],
  elapsed: number,
  life01: number
): THREE.Quaternion {
  const startQuat = particleQuaternionFromCocosEuler(startRotation3D);
  const rotCfg = config.rotationOverLifetime;

  if (!rotCfg.enabled) {
    return startQuat;
  }

  if (rotCfg.separateAxes) {
    const deltaQuat = particleQuaternionFromCocosEuler([
      angularVelocity3D[0] * elapsed,
      angularVelocity3D[1] * elapsed,
      angularVelocity3D[2] * elapsed
    ]);
    return startQuat.clone().multiply(deltaQuat);
  }

  const extraZ = sampleCurveConfig(rotCfg.rotation, life01);
  const deltaQuat = particleQuaternionFromCocosEuler([0, 0, extraZ]);
  return startQuat.clone().multiply(deltaQuat);
}

/** @deprecated use computeMeshParticleQuaternion */
export function computeMeshParticleRotation(
  config: Particle3DConfig,
  startRotation3D: [number, number, number],
  angularVelocity3D: [number, number, number],
  elapsed: number,
  life01: number
): [number, number, number] {
  const quat = computeMeshParticleQuaternion(
    config,
    startRotation3D,
    angularVelocity3D,
    elapsed,
    life01
  );
  const euler = new THREE.Euler().setFromQuaternion(quat, COCOS_PARTICLE_EULER_ORDER);
  return [euler.x, euler.y, euler.z];
}

export interface MeshParticleOrientationOptions {
  alignSpace: AlignmentSpace;
  simulationSpace: SimulationSpace;
  emitterTransform?: Transform3D;
  emitterLocalTransform?: Transform3D;
}

function quaternionFromTransform(transform: Transform3D): THREE.Quaternion {
  const matrix = transformToMatrix(transform);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return quaternion;
}

function resolveAlignQuaternion(options: MeshParticleOrientationOptions): THREE.Quaternion {
  if (options.alignSpace === 'local') {
    if (options.emitterLocalTransform) {
      return quaternionFromTransform(options.emitterLocalTransform);
    }
    if (options.emitterTransform) {
      return quaternionFromTransform(options.emitterTransform);
    }
    return new THREE.Quaternion();
  }

  if (options.alignSpace === 'world' && options.emitterTransform) {
    return quaternionFromTransform(options.emitterTransform);
  }

  return new THREE.Quaternion();
}

/** Cocos mesh path: nodeRotation (alignSpace) × particle rotation quaternion. */
export function applyMeshParticleOrientation(
  visual: ParticleVisual,
  particleQuat: THREE.Quaternion,
  options: MeshParticleOrientationOptions
) {
  if (visual.kind !== 'mesh') return;
  const alignQuat = resolveAlignQuaternion(options);
  visual.object.quaternion.copy(alignQuat).multiply(particleQuat);
}
