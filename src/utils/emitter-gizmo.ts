import * as THREE from 'three';
import type { Particle3DConfig, RangeValue, ShapeModuleConfig } from '@/types/effect';
import type { Transform3D } from '@/types/project';
import { transformToMatrix } from '@/utils/transform-utils';

export interface EmitterGizmoInput {
  id: string;
  name: string;
  config: Particle3DConfig;
  transform: Transform3D;
  enabled: boolean;
}

export interface EmitterGizmoOptions {
  selectedId?: string | null;
}

const GIZMO_COLORS = {
  normal: 0x5fd48a,
  selected: 0xffc857,
  disabled: 0x6e7681,
  pivot: { x: 0xff5f6d, y: 0x5fd48a, z: 0x5f9cff },
  direction: 0x5f9cff
};

function avgRangeValue(range: RangeValue): number {
  if (range.mode === 'constant') return range.constant ?? 1;
  const min = range.min ?? 0;
  const max = range.max ?? 1;
  return (min + max) / 2;
}

function wireframeFromGeometry(
  geometry: THREE.BufferGeometry,
  color: number,
  opacity: number,
  lineWidth = 1
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    linewidth: lineWidth
  });
  return new THREE.LineSegments(edges, material);
}

function createPivotAxes(size: number, opacity: number): THREE.Group {
  const group = new THREE.Group();
  const dirs: Array<{ dir: THREE.Vector3; color: number }> = [
    { dir: new THREE.Vector3(1, 0, 0), color: GIZMO_COLORS.pivot.x },
    { dir: new THREE.Vector3(0, 1, 0), color: GIZMO_COLORS.pivot.y },
    { dir: new THREE.Vector3(0, 0, 1), color: GIZMO_COLORS.pivot.z }
  ];
  for (const { dir, color } of dirs) {
    const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(size)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true });
    group.add(new THREE.Line(geo, mat));
  }
  return group;
}

function createCircleOutline(radius: number, color: number, opacity: number, segments = 48): THREE.Line {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true });
  return new THREE.Line(geo, mat);
}

function createArcOutline(radius: number, arcDeg: number, color: number, opacity: number, segments = 32): THREE.Line {
  const arcRad = (Math.min(360, Math.max(0, arcDeg)) * Math.PI) / 180;
  const points: THREE.Vector3[] = [];
  const count = Math.max(2, Math.round(segments * (arcDeg / 360)));
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * arcRad - arcRad / 2;
    points.push(new THREE.Vector3(Math.sin(t) * radius, 0, Math.cos(t) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true });
  return new THREE.Line(geo, mat);
}

function createShapeOutline(shape: ShapeModuleConfig, color: number, opacity: number): THREE.Object3D | null {
  if (!shape.enabled) return null;

  const radius = Math.max(0.05, shape.radius || 0.5);
  const group = new THREE.Group();

  switch (shape.shapeType) {
    case 'sphere':
      group.add(wireframeFromGeometry(new THREE.SphereGeometry(radius, 16, 12), color, opacity));
      break;
    case 'hemisphere':
      group.add(wireframeFromGeometry(
        new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        color,
        opacity
      ));
      group.add(createCircleOutline(radius, color, opacity * 0.7));
      break;
    case 'cone': {
      const halfAngle = ((shape.angle || 25) * Math.PI) / 360;
      const height = halfAngle > 0.01 ? radius / Math.tan(halfAngle) : radius * 2;
      group.add(wireframeFromGeometry(new THREE.ConeGeometry(radius, height, 16, 1, true), color, opacity));
      group.add(createCircleOutline(radius, color, opacity * 0.85));
      break;
    }
    case 'box':
      group.add(wireframeFromGeometry(new THREE.BoxGeometry(radius * 2, radius * 2, radius * 2), color, opacity));
      break;
    case 'circle':
      if (shape.arc >= 359.9) {
        group.add(createCircleOutline(radius, color, opacity));
      } else {
        group.add(createArcOutline(radius, shape.arc, color, opacity));
      }
      break;
    default:
      group.add(createCircleOutline(radius, color, opacity * 0.6));
      break;
  }

  return group;
}

function createDirectionArrow(length: number, color: number, opacity: number): THREE.ArrowHelper {
  const dir = new THREE.Vector3(0, 1, 0);
  const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), length, color, length * 0.2, length * 0.12);
  arrow.line.material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true });
  arrow.cone.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: true });
  return arrow;
}

function createNameLabel(name: string, selected: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 14;
  ctx.font = `600 ${fontSize}px Segoe UI, sans-serif`;
  const text = name.length > 18 ? `${name.slice(0, 16)}…` : name;
  const width = Math.ceil(ctx.measureText(text).width) + 16;
  canvas.width = width;
  canvas.height = 24;
  ctx.font = `600 ${fontSize}px Segoe UI, sans-serif`;
  ctx.fillStyle = selected ? 'rgba(255, 200, 87, 0.92)' : 'rgba(95, 212, 138, 0.92)';
  ctx.fillText(text, 8, 17);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 80, 0.3, 1);
  sprite.position.y = 0.15;
  sprite.renderOrder = 999;
  return sprite;
}

/** Build a Unity-style emitter gizmo (pivot, shape outline, direction, label). */
export function buildEmitterGizmo(source: EmitterGizmoInput, options?: EmitterGizmoOptions): THREE.Group {
  const selected = options?.selectedId === source.id;
  const color = !source.enabled
    ? GIZMO_COLORS.disabled
    : selected
      ? GIZMO_COLORS.selected
      : GIZMO_COLORS.normal;
  const opacity = !source.enabled ? 0.35 : selected ? 1 : 0.78;
  const axisSize = selected ? 0.45 : 0.32;

  const root = new THREE.Group();
  root.name = `gizmo-${source.id}`;
  root.matrixAutoUpdate = false;
  root.matrix.copy(transformToMatrix(source.transform));

  root.add(createPivotAxes(axisSize, opacity));

  const shape = source.config.shapeModule;
  const labelOffset = shape.enabled
    ? Math.max(0.4, shape.radius * (shape.shapeType === 'cone' ? 2 : 1.2) + 0.25)
    : 0.45;
  const label = createNameLabel(source.name, selected);
  label.position.y = labelOffset;
  root.add(label);

  const shapeGroup = createShapeOutline(source.config.shapeModule, color, opacity);
  if (shapeGroup) root.add(shapeGroup);

  if (shape.enabled) {
    const speed = avgRangeValue(source.config.mainModule.startSpeed);
    const arrowLen = Math.max(0.35, Math.min(2.5, speed * 0.25 + (shape.radius || 0.5) * 0.5));
    let origin = new THREE.Vector3(0, 0, 0);
    if (shape.shapeType === 'cone') {
      const halfAngle = ((shape.angle || 25) * Math.PI) / 360;
      const height = halfAngle > 0.01 ? shape.radius / Math.tan(halfAngle) : shape.radius * 2;
      origin = new THREE.Vector3(0, height * 0.5, 0);
    }
    const arrow = createDirectionArrow(arrowLen, GIZMO_COLORS.direction, opacity * 0.9);
    arrow.position.copy(origin);
    root.add(arrow);
  }

  return root;
}

export function syncEmitterGizmoGroup(
  root: THREE.Group,
  sources: EmitterGizmoInput[],
  options?: EmitterGizmoOptions
): void {
  while (root.children.length > 0) {
    const child = root.children[0];
    root.remove(child);
    disposeGizmoObject(child);
  }
  for (const source of sources) {
    root.add(buildEmitterGizmo(source, options));
  }
}

function disposeGizmoObject(obj: THREE.Object3D): void {
  obj.traverse((node) => {
    if (node instanceof THREE.Line || node instanceof THREE.LineSegments) {
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    } else if (node instanceof THREE.ArrowHelper) {
      node.line.geometry.dispose();
      (node.line.material as THREE.Material).dispose();
      node.cone.geometry.dispose();
      (node.cone.material as THREE.Material).dispose();
    } else if (node instanceof THREE.Sprite) {
      const mat = node.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
