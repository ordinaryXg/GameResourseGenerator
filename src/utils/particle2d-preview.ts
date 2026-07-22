import * as THREE from 'three';
import { BaseParticlePreview } from './base-particle-preview';
import type { Particle3DConfig } from '@/types/effect';

export class Particle2DPreview extends BaseParticlePreview {
  private camera: THREE.OrthographicCamera;

  constructor() {
    super();
    this.maxParticles = 300;
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.camera.position.z = 10;
    this.camera.lookAt(0, 0, 0);
  }

  protected getCamera(): THREE.Camera { return this.camera; }

  resize() {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container!.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer!.setSize(width, height);
    this.camera.left = -width / 100;
    this.camera.right = width / 100;
    this.camera.top = height / 100;
    this.camera.bottom = -height / 100;
    this.camera.updateProjectionMatrix();
  }

  protected getEmitPosition(cfg: Particle3DConfig): THREE.Vector3 {
    const r = cfg.shapeModule.radius || 5;
    return new THREE.Vector3((Math.random() - 0.5) * r * 2, -2 + Math.random(), 0);
  }

  protected getEmitVelocity(cfg: Particle3DConfig): THREE.Vector3 {
    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    return new THREE.Vector3((Math.random() - 0.5) * 1, speed * (0.5 + Math.random() * 0.5), 0);
  }

  protected applyForces(p: any, cfg: Particle3DConfig, dt: number) {
    p.velocity.y -= cfg.mainModule.gravityModifier * 9.8 * dt;
  }

  protected updateSpriteScale(p: any, _cfg: Particle3DConfig) {
    const size = this.getValueFromRange(_cfg.mainModule.startSize3D.x) * (1 - p.life * 0.5);
    p.sprite.scale.setScalar(size);
  }
}
