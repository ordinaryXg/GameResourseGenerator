import * as THREE from 'three';
import type { EmitFrom, Particle3DConfig, ShapeModuleConfig } from '@/types/effect';

function randomOnUnitSphere(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );
}

function coneHalfAngleRad(angleDeg: number): number {
  return (angleDeg * Math.PI) / 360;
}

function coneHeight(radius: number, angleDeg: number): number {
  const half = coneHalfAngleRad(angleDeg);
  return half > 0.001 ? radius / Math.tan(half) : radius * 2;
}

function sampleConePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  const radius = Math.max(0.0001, shape.radius);
  const height = coneHeight(radius, shape.angle);
  const emitFrom: EmitFrom = shape.emitFrom;

  if (emitFrom === 'edge') {
    const theta = Math.random() * Math.PI * 2;
    return new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
  }

  const t = Math.random();
  const y = t * height;
  const rMax = radius * (1 - t);
  const r = emitFrom === 'shell' ? rMax : rMax * Math.sqrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

function sampleConeVelocity(shape: ShapeModuleConfig, speed: number): THREE.Vector3 {
  const half = coneHalfAngleRad(shape.angle);
  const cosMin = Math.cos(Math.min(Math.PI, half));
  const phi = Math.random() * Math.PI * 2;
  const cosTheta = cosMin + Math.random() * (1 - cosMin);
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  return new THREE.Vector3(
    sinTheta * Math.cos(phi),
    cosTheta,
    sinTheta * Math.sin(phi)
  ).multiplyScalar(speed);
}

function sampleSpherePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  const dir = randomOnUnitSphere();
  const r = shape.emitFrom === 'shell'
    ? shape.radius
    : shape.radius * Math.cbrt(Math.random());
  return dir.multiplyScalar(r);
}

function sampleCirclePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  const arcRad = (Math.min(360, Math.max(0, shape.arc)) * Math.PI) / 180;
  const theta = (Math.random() - 0.5) * arcRad;
  const r = shape.emitFrom === 'edge'
    ? shape.radius
    : shape.radius * Math.sqrt(Math.random());
  return new THREE.Vector3(Math.sin(theta) * r, 0, Math.cos(theta) * r);
}

/** Local-space emission point matching Cocos shape + emitFrom semantics. */
export function sampleShapeEmitPosition(shape: ShapeModuleConfig): THREE.Vector3 {
  if (!shape.enabled) return new THREE.Vector3(0, 0, 0);

  switch (shape.shapeType) {
    case 'cone':
      return sampleConePosition(shape);
    case 'sphere':
      return sampleSpherePosition(shape);
    case 'hemisphere': {
      const p = sampleSpherePosition({ ...shape, shapeType: 'sphere' });
      p.y = Math.abs(p.y);
      return p;
    }
    case 'box': {
      const s = shape.radius;
      if (shape.emitFrom === 'shell' || shape.emitFrom === 'edge') {
        const face = Math.floor(Math.random() * 6);
        const u = (Math.random() - 0.5) * 2 * s;
        const v = (Math.random() - 0.5) * 2 * s;
        switch (face) {
          case 0: return new THREE.Vector3(s, u, v);
          case 1: return new THREE.Vector3(-s, u, v);
          case 2: return new THREE.Vector3(u, s, v);
          case 3: return new THREE.Vector3(u, -s, v);
          case 4: return new THREE.Vector3(u, v, s);
          default: return new THREE.Vector3(u, v, -s);
        }
      }
      return new THREE.Vector3(
        (Math.random() - 0.5) * 2 * s,
        (Math.random() - 0.5) * 2 * s,
        (Math.random() - 0.5) * 2 * s
      );
    }
    case 'circle':
      return sampleCirclePosition(shape);
    default:
      return new THREE.Vector3(0, 0, 0);
  }
}

/** Local-space initial velocity from shape + start speed. */
export function sampleShapeEmitVelocity(shape: ShapeModuleConfig, speed: number): THREE.Vector3 {
  if (!shape.enabled || speed <= 0) return new THREE.Vector3(0, 0, 0);

  switch (shape.shapeType) {
    case 'cone':
      return sampleConeVelocity(shape, speed);
    case 'sphere':
    case 'hemisphere':
      return randomOnUnitSphere().multiplyScalar(speed);
    case 'box':
      return new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 0.3
      ).normalize().multiplyScalar(speed);
    default:
      return new THREE.Vector3(0, speed, 0);
  }
}

export function sampleEmitPosition(cfg: Particle3DConfig): THREE.Vector3 {
  return sampleShapeEmitPosition(cfg.shapeModule);
}

export function sampleEmitVelocity(cfg: Particle3DConfig, speed: number): THREE.Vector3 {
  return sampleShapeEmitVelocity(cfg.shapeModule, speed);
}
