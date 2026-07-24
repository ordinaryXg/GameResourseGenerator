import * as THREE from 'three';
import type { RenderMode } from '@/types/effect';

export interface ParticleVisual {
  object: THREE.Object3D;
  material: THREE.SpriteMaterial | THREE.MeshBasicMaterial;
  kind: 'sprite' | 'mesh';
}

export function usesHorizontalPlane(renderMode: RenderMode): boolean {
  return renderMode === 'horizontalBillboard' || renderMode === 'mesh';
}

export function createParticleVisual(options: {
  texture: THREE.Texture;
  blending: THREE.Blending;
  color: THREE.Color;
  opacity: number;
  renderMode: RenderMode;
  size: number;
  meshGeometry?: THREE.BufferGeometry | null;
}): ParticleVisual {
  const { texture, blending, color, opacity, renderMode, size, meshGeometry } = options;
  const depthTest = blending !== THREE.AdditiveBlending;

  if (renderMode === 'mesh' && meshGeometry) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      blending,
      depthWrite: false,
      depthTest,
      transparent: true,
      color,
      opacity,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(meshGeometry.clone(), material);
    mesh.scale.setScalar(size);
    return { object: mesh, material, kind: 'mesh' };
  }

  if (usesHorizontalPlane(renderMode)) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      blending,
      depthWrite: false,
      depthTest,
      transparent: true,
      color,
      opacity
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(size);
    return { object: mesh, material, kind: 'mesh' };
  }

  const material = new THREE.SpriteMaterial({
    map: texture,
    blending,
    depthWrite: false,
    depthTest,
    transparent: true,
    color,
    opacity
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  return { object: sprite, material, kind: 'sprite' };
}

export function setParticleVisualSize(visual: ParticleVisual, size: number) {
  if (visual.kind === 'sprite') {
    (visual.object as THREE.Sprite).scale.setScalar(size);
    return;
  }
  visual.object.scale.set(size, size, size);
}

export function setParticleVisualSize3D(visual: ParticleVisual, size: [number, number, number]) {
  if (visual.kind === 'sprite') {
    const uniform = Math.max(size[0], size[1], size[2]);
    (visual.object as THREE.Sprite).scale.setScalar(uniform);
    return;
  }
  visual.object.scale.set(size[0], size[1], size[2]);
}

export function applyParticleVisualRotation(visual: ParticleVisual, radians: number) {
  if (visual.kind === 'mesh') {
    visual.object.rotation.z = radians;
    return;
  }
  if (visual.material instanceof THREE.SpriteMaterial) {
    visual.material.rotation = radians;
  }
}

export function disposeParticleVisual(visual: ParticleVisual) {
  visual.object.removeFromParent();
  if (visual.kind === 'mesh') {
    (visual.object as THREE.Mesh).geometry.dispose();
  }
  visual.material.dispose();
}
