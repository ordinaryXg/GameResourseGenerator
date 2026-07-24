import * as THREE from 'three';
import type { EmitFrom, Particle3DConfig, ShapeModuleConfig } from '@/types/effect';
import { getDefaultParticle3DConfig } from '@/utils/effect-defaults';
import { coerceRangeValue, sampleRangeValue } from '@/utils/particle-size';

function readVec3(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!raw || typeof raw !== 'object') return fallback;
  const v = raw as { x?: number; y?: number; z?: number };
  return [v.x ?? fallback[0], v.y ?? fallback[1], v.z ?? fallback[2]];
}

/** Merge partial / legacy shape module data with defaults. */
export function normalizeShapeModule(raw: Partial<ShapeModuleConfig> | undefined): ShapeModuleConfig {
  const defaults = getDefaultParticle3DConfig().shapeModule;
  const shape = raw ?? {};
  return {
    ...defaults,
    ...shape,
    emitFrom: shape.emitFrom ?? defaults.emitFrom,
    radiusThickness: shape.radiusThickness ?? defaults.radiusThickness,
    length: shape.length ?? defaults.length,
    arcMode: (shape.arcMode ?? defaults.arcMode) as ShapeModuleConfig['arcMode'],
    arcSpread: shape.arcSpread ?? defaults.arcSpread,
    arcSpeed: coerceRangeValue(shape.arcSpeed, defaults.arcSpeed.constant ?? 1),
    boxThickness: shape.boxThickness ?? defaults.boxThickness,
    position: shape.position ?? defaults.position,
    rotation: shape.rotation ?? defaults.rotation,
    scale: shape.scale ?? defaults.scale
  };
}

function randomOnUnitSphere(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );
}

/** Cocos `_angle` half-angle in radians; our `angle` field stores the same value in degrees. */
export function coneAngleRad(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180;
}

/** Cone axis length along local -Z (Cocos `length`, or derived from radius + angle). */
export function coneAxisLength(shape: Pick<ShapeModuleConfig, 'length' | 'radius' | 'angle'>): number {
  const angleRad = coneAngleRad(shape.angle);
  if (shape.length > 0) return shape.length;
  return angleRad > 0.001 ? shape.radius / Math.tan(angleRad) : shape.radius * 2;
}

/** Top radius of the truncated cone at z = -axisLength. */
export function coneTopRadius(
  shape: Pick<ShapeModuleConfig, 'radius' | 'angle'>,
  axisLength: number
): number {
  return Math.max(0, shape.radius - axisLength * Math.tan(coneAngleRad(shape.angle)));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function sampleArcTheta(shape: ShapeModuleConfig): number {
  const arcRad = (Math.min(360, Math.max(0, shape.arc)) * Math.PI) / 180;
  if (arcRad <= 0) return 0;
  const spread = clamp01(shape.arcSpread);
  if (shape.arcMode === 1) {
    return ((performance.now() * 0.001 * sampleRangeValue(shape.arcSpeed)) % 1) * arcRad - arcRad / 2;
  }
  if (spread > 0) {
    const steps = Math.max(1, Math.floor(1 / spread));
    const step = Math.floor(Math.random() * steps);
    return ((step / steps) * arcRad) - arcRad / 2;
  }
  return (Math.random() - 0.5) * arcRad;
}

function applyShapeTransform(shape: ShapeModuleConfig, point: THREE.Vector3): THREE.Vector3 {
  const [px, py, pz] = shape.position;
  const [rx, ry, rz] = shape.rotation;
  const [sx, sy, sz] = shape.scale;
  point.multiply(new THREE.Vector3(sx, sy, sz));
  point.applyEuler(new THREE.Euler(
    (rx * Math.PI) / 180,
    (ry * Math.PI) / 180,
    (rz * Math.PI) / 180
  ));
  point.add(new THREE.Vector3(px, py, pz));
  if (shape.randomPositionAmount > 0) {
    const jitter = shape.randomPositionAmount;
    point.x += (Math.random() - 0.5) * 2 * jitter;
    point.y += (Math.random() - 0.5) * 2 * jitter;
    point.z += (Math.random() - 0.5) * 2 * jitter;
  }
  return point;
}

function applyShapeDirection(shape: ShapeModuleConfig, dir: THREE.Vector3): THREE.Vector3 {
  const [rx, ry, rz] = shape.rotation;
  dir.applyEuler(new THREE.Euler(
    (rx * Math.PI) / 180,
    (ry * Math.PI) / 180,
    (rz * Math.PI) / 180
  ));
  if (shape.randomDirectionAmount > 0) {
    const rand = randomOnUnitSphere();
    dir.lerp(rand, clamp01(shape.randomDirectionAmount)).normalize();
  }
  return dir;
}

function randomPointBetweenCircleAtFixedAngle(
  innerR: number,
  outerR: number,
  theta: number
): THREE.Vector3 {
  const r = innerR + Math.sqrt(Math.random()) * Math.max(0, outerR - innerR);
  return new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0);
}

function fixedAngleUnitVector2(theta: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);
}

function resolveConeEmitFrom(emitFrom: EmitFrom): 'base' | 'shell' | 'volume' {
  if (emitFrom === 'base') return 'base';
  if (emitFrom === 'volume') return 'volume';
  return 'shell';
}

/** Cocos `coneEmit` in shape-local space: base on XY plane, emission along -Z. */
function sampleConeEmitLocal(shape: ShapeModuleConfig): { position: THREE.Vector3; direction: THREE.Vector3 } {
  const radius = Math.max(0.0001, shape.radius);
  const angleRad = coneAngleRad(shape.angle);
  const theta = sampleArcTheta(shape) || (Math.random() * Math.PI * 2);
  const emitFrom = resolveConeEmitFrom(shape.emitFrom);
  const innerR = radius * (1 - clamp01(shape.radiusThickness));

  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();

  switch (emitFrom) {
    case 'base': {
      position.copy(randomPointBetweenCircleAtFixedAngle(innerR, radius, theta));
      direction.set(
        position.x * Math.sin(angleRad),
        position.y * Math.sin(angleRad),
        -Math.cos(angleRad) * radius
      );
      direction.normalize();
      position.z = 0;
      break;
    }
    case 'shell': {
      position.copy(fixedAngleUnitVector2(theta));
      direction.set(
        position.x * Math.sin(angleRad),
        position.y * Math.sin(angleRad),
        -Math.cos(angleRad)
      );
      direction.normalize();
      position.multiplyScalar(radius);
      position.z = 0;
      break;
    }
    case 'volume': {
      position.copy(randomPointBetweenCircleAtFixedAngle(innerR, radius, theta));
      direction.set(
        position.x * Math.sin(angleRad),
        position.y * Math.sin(angleRad),
        -Math.cos(angleRad) * radius
      );
      direction.normalize();
      position.z = 0;
      const length = coneAxisLength(shape);
      if (length > 0 && direction.z < -1e-6) {
        position.addScaledVector(direction, (length * Math.random()) / -direction.z);
      }
      break;
    }
  }

  return { position, direction };
}

/** Position + direction pair for cone emitters (Cocos `coneEmit`). */
export function sampleConeEmitPair(shapeInput: ShapeModuleConfig): {
  position: THREE.Vector3;
  direction: THREE.Vector3;
} {
  const shape = normalizeShapeModule(shapeInput);
  const local = sampleConeEmitLocal(shape);
  return {
    position: applyShapeTransform(shape, local.position),
    direction: applyShapeDirection(shape, local.direction)
  };
}

function sampleConePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  return sampleConeEmitPair(shape).position;
}

function sampleConeVelocity(shape: ShapeModuleConfig, speed: number): THREE.Vector3 {
  return sampleConeEmitPair(shape).direction.multiplyScalar(speed);
}

function sampleSpherePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  let dir = randomOnUnitSphere();
  if (shape.sphericalDirectionAmount > 0) {
    dir.lerp(randomOnUnitSphere(), clamp01(shape.sphericalDirectionAmount)).normalize();
  }
  const randomize = shape.emitFrom === 'volume';
  const outer = 1 - clamp01(shape.radiusThickness);
  const r = randomize
    ? outer + (1 - outer) * Math.cbrt(Math.random())
    : outer;
  return applyShapeTransform(shape, dir.multiplyScalar(shape.radius * r));
}

function sampleCirclePosition(shape: ShapeModuleConfig): THREE.Vector3 {
  const theta = sampleArcTheta(shape);
  const randomize = shape.emitFrom === 'volume';
  const outer = 1 - clamp01(shape.radiusThickness);
  const r = (randomize || shape.emitFrom === 'edge')
    ? outer + (1 - outer) * Math.sqrt(Math.random())
    : outer;
  return applyShapeTransform(shape, new THREE.Vector3(Math.sin(theta) * shape.radius * r, 0, Math.cos(theta) * shape.radius * r));
}

function sampleBoxPosition(shape: ShapeModuleConfig): THREE.Vector3 {
  const [tx, ty, tz] = shape.boxThickness;
  const sx = Math.max(0.0001, tx > 0 ? tx : shape.radius);
  const sy = Math.max(0.0001, ty > 0 ? ty : shape.radius);
  const sz = Math.max(0.0001, tz > 0 ? tz : shape.radius);

  if (shape.emitFrom === 'shell' || shape.emitFrom === 'edge') {
    const face = Math.floor(Math.random() * 6);
    const u = (Math.random() - 0.5) * 2;
    const v = (Math.random() - 0.5) * 2;
    switch (face) {
      case 0: return applyShapeTransform(shape, new THREE.Vector3(1, u, v).multiply(new THREE.Vector3(sx, sy, sz)));
      case 1: return applyShapeTransform(shape, new THREE.Vector3(-1, u, v).multiply(new THREE.Vector3(sx, sy, sz)));
      case 2: return applyShapeTransform(shape, new THREE.Vector3(u, 1, v).multiply(new THREE.Vector3(sx, sy, sz)));
      case 3: return applyShapeTransform(shape, new THREE.Vector3(u, -1, v).multiply(new THREE.Vector3(sx, sy, sz)));
      case 4: return applyShapeTransform(shape, new THREE.Vector3(u, v, 1).multiply(new THREE.Vector3(sx, sy, sz)));
      default: return applyShapeTransform(shape, new THREE.Vector3(u, v, -1).multiply(new THREE.Vector3(sx, sy, sz)));
    }
  }

  return applyShapeTransform(shape, new THREE.Vector3(
    (Math.random() - 0.5) * 2 * sx,
    (Math.random() - 0.5) * 2 * sy,
    (Math.random() - 0.5) * 2 * sz
  ));
}

/** Local-space emission point matching Cocos shape + emitFrom semantics. */
export function sampleShapeEmitPosition(shapeInput: ShapeModuleConfig): THREE.Vector3 {
  const shape = normalizeShapeModule(shapeInput);
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
    case 'box':
      return sampleBoxPosition(shape);
    case 'circle':
      return sampleCirclePosition(shape);
    default:
      return new THREE.Vector3(0, 0, 0);
  }
}

/** Local-space initial velocity from shape + start speed. */
export function sampleShapeEmitVelocity(shapeInput: ShapeModuleConfig, speed: number, emitPos?: THREE.Vector3): THREE.Vector3 {
  const shape = normalizeShapeModule(shapeInput);
  if (!shape.enabled || speed <= 0) return new THREE.Vector3(0, 0, 0);

  switch (shape.shapeType) {
    case 'cone':
      return sampleConeVelocity(shape, speed);
    case 'sphere':
    case 'hemisphere': {
      const pos = emitPos ?? sampleShapeEmitPosition(shape);
      if (shape.alignToDirection && pos.lengthSq() > 1e-6) {
        return pos.clone().normalize().multiplyScalar(speed);
      }
      return randomOnUnitSphere().multiplyScalar(speed);
    }
    case 'box':
      return new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 0.3
      ).normalize().multiplyScalar(speed);
    default: {
      const pos = emitPos ?? sampleShapeEmitPosition(shape);
      if (shape.alignToDirection && pos.lengthSq() > 1e-6) {
        return pos.clone().normalize().multiplyScalar(speed);
      }
      return new THREE.Vector3(0, speed, 0);
    }
  }
}

/** Sample matched position/velocity for preview spawn (cone uses single Cocos draw). */
export function sampleEmitMotion(
  cfg: Particle3DConfig,
  speed: number
): { position: THREE.Vector3; velocity: THREE.Vector3 } {
  const shape = normalizeShapeModule(cfg.shapeModule);
  if (shape.enabled && shape.shapeType === 'cone') {
    const { position, direction } = sampleConeEmitPair(shape);
    return { position, velocity: direction.multiplyScalar(speed) };
  }
  const position = sampleShapeEmitPosition(shape);
  const velocity = sampleShapeEmitVelocity(shape, speed, position);
  return { position, velocity };
}

export function sampleEmitPosition(cfg: Particle3DConfig): THREE.Vector3 {
  return sampleShapeEmitPosition(cfg.shapeModule);
}

export function sampleEmitVelocity(cfg: Particle3DConfig, speed: number): THREE.Vector3 {
  const shape = normalizeShapeModule(cfg.shapeModule);
  if (shape.enabled && shape.shapeType === 'cone') {
    return sampleConeEmitPair(shape).direction.multiplyScalar(speed);
  }
  const pos = sampleEmitPosition(cfg);
  return sampleShapeEmitVelocity(cfg.shapeModule, speed, pos);
}

export { readVec3 as readShapeVec3 };
