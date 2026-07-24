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
  const len = dir.length();
  if (len === 0) return dir.clone();
  return dir.clone().transformDirection(mat).normalize().multiplyScalar(len);
}

export function applyInverseTransformToDirection(t: Transform3D, dir: THREE.Vector3): THREE.Vector3 {
  const mat = transformToMatrix(t);
  const inv = mat.clone().invert();
  const len = dir.length();
  if (len === 0) return dir.clone();
  return dir.clone().transformDirection(inv).normalize().multiplyScalar(len);
}

export interface CocosLocalTransform {
  _lpos: { __type__: 'cc.Vec3'; x: number; y: number; z: number };
  _lrot: { __type__: 'cc.Quat'; x: number; y: number; z: number; w: number };
  _lscale: { __type__: 'cc.Vec3'; x: number; y: number; z: number };
  _euler: { __type__: 'cc.Vec3'; x: number; y: number; z: number };
}

export function transformToCocosLocal(t: Transform3D): CocosLocalTransform {
  const eulerRad = new THREE.Euler(
    t.rotation[0] * DEG2RAD,
    t.rotation[1] * DEG2RAD,
    t.rotation[2] * DEG2RAD,
    'XYZ'
  );
  const quat = new THREE.Quaternion().setFromEuler(eulerRad);
  const syncedEuler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
  return {
    _lpos: { __type__: 'cc.Vec3', x: t.position[0], y: t.position[1], z: t.position[2] },
    _lrot: { __type__: 'cc.Quat', x: quat.x, y: quat.y, z: quat.z, w: quat.w },
    _lscale: { __type__: 'cc.Vec3', x: t.scale[0], y: t.scale[1], z: t.scale[2] },
    _euler: {
      __type__: 'cc.Vec3',
      x: syncedEuler.x / DEG2RAD,
      y: syncedEuler.y / DEG2RAD,
      z: syncedEuler.z / DEG2RAD
    }
  };
}

export function cocosLocalToTransform(node: Record<string, unknown>): Transform3D {
  const pos = node._lpos as { x?: number; y?: number; z?: number } | undefined;
  const scale = node._lscale as { x?: number; y?: number; z?: number } | undefined;
  const rot = node._lrot as { x?: number; y?: number; z?: number; w?: number } | undefined;
  if (rot) {
    const quat = new THREE.Quaternion(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0, rot.w ?? 1);
    const e = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
    return {
      position: [pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0],
      rotation: [e.x / DEG2RAD, e.y / DEG2RAD, e.z / DEG2RAD],
      scale: [scale?.x ?? 1, scale?.y ?? 1, scale?.z ?? 1]
    };
  }
  const euler = node._euler as { x?: number; y?: number; z?: number } | undefined;
  if (euler) {
    return {
      position: [pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0],
      rotation: [euler.x ?? 0, euler.y ?? 0, euler.z ?? 0],
      scale: [scale?.x ?? 1, scale?.y ?? 1, scale?.z ?? 1]
    };
  }
  return identityTransform();
}
