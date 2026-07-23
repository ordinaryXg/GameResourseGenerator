import * as THREE from 'three';
import type { Transform3D } from '@/types/project';

const DEG2RAD = Math.PI / 180;

export function identityTransform(): Transform3D {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export function transformToMatrix(t: Transform3D): THREE.Matrix4 {
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3(t.position[0], t.position[1], t.position[2]);
  const quat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(t.rotation[0] * DEG2RAD, t.rotation[1] * DEG2RAD, t.rotation[2] * DEG2RAD, 'XYZ')
  );
  const scale = new THREE.Vector3(t.scale[0], t.scale[1], t.scale[2]);
  mat.compose(pos, quat, scale);
  return mat;
}

export function combineTransforms(parent: Transform3D, local: Transform3D): Transform3D {
  const combined = transformToMatrix(parent).multiply(transformToMatrix(local));
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  combined.decompose(pos, quat, scale);
  const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
  return {
    position: [pos.x, pos.y, pos.z],
    rotation: [euler.x / DEG2RAD, euler.y / DEG2RAD, euler.z / DEG2RAD],
    scale: [scale.x, scale.y, scale.z]
  };
}

export function applyTransformToPoint(t: Transform3D, local: THREE.Vector3): THREE.Vector3 {
  const mat = transformToMatrix(t);
  return local.clone().applyMatrix4(mat);
}

export function applyTransformToDirection(t: Transform3D, dir: THREE.Vector3): THREE.Vector3 {
  const mat = transformToMatrix(t);
  const origin = new THREE.Vector3();
  const transformed = dir.clone().applyMatrix4(mat).sub(origin.applyMatrix4(mat));
  return transformed.normalize().multiplyScalar(dir.length());
}
