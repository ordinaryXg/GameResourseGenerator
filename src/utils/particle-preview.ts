import * as THREE from 'three';
import { BaseParticlePreview } from './base-particle-preview';
import type { Particle3DConfig } from '@/types/effect';
import { sampleEmitPosition, sampleEmitVelocity } from '@/utils/particle-shape';

type CameraDragMode = 'orbit' | 'pan';

export class ParticlePreview extends BaseParticlePreview {
  private camera: THREE.PerspectiveCamera;
  private isDragging = false;
  private dragMode: CameraDragMode | null = null;
  private previousMouse = { x: 0, y: 0 };
  private spherical = { radius: 8, theta: Math.PI / 4, phi: Math.PI / 4 };
  private lookAtTarget = new THREE.Vector3(0, 1, 0);
  private panRight = new THREE.Vector3();
  private panUp = new THREE.Vector3();

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(5, 3, 8);
    this.camera.lookAt(this.lookAtTarget);
  }

  protected getCamera(): THREE.Camera { return this.camera; }

  resize() {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.applyRendererSize();
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  protected getEmitPosition(cfg: Particle3DConfig): THREE.Vector3 {
    return sampleEmitPosition(cfg);
  }

  protected getEmitVelocity(cfg: Particle3DConfig): THREE.Vector3 {
    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    return sampleEmitVelocity(cfg, speed);
  }

  protected applyForces(p: any, cfg: Particle3DConfig, dt: number) {
    p.velocity.y -= cfg.mainModule.gravityModifier * 9.8 * dt;
    if (cfg.noiseModule.enabled) {
      const ns = cfg.noiseModule.strength * 0.01;
      p.velocity.x += (Math.random()-0.5) * ns;
      p.velocity.y += (Math.random()-0.5) * ns;
      p.velocity.z += (Math.random()-0.5) * ns;
    }
  }

  onMouseDown(x: number, y: number, button = 0) {
    if (button === 1) {
      this.dragMode = 'pan';
    } else if (button === 0) {
      this.dragMode = 'orbit';
    } else {
      return;
    }
    this.isDragging = true;
    this.previousMouse = { x, y };
  }

  onMouseMove(x: number, y: number) {
    if (!this.isDragging || !this.dragMode) return;
    const dx = x - this.previousMouse.x;
    const dy = y - this.previousMouse.y;

    if (this.dragMode === 'orbit') {
      this.spherical.theta -= dx * 0.005;
      this.spherical.phi -= dy * 0.005;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    } else {
      this.panCamera(dx, dy);
    }

    this.previousMouse = { x, y };
    this.updateCam();
  }

  onMouseUp(_button?: number) {
    this.isDragging = false;
    this.dragMode = null;
  }

  onWheel(deltaY: number) {
    this.spherical.radius = Math.max(0.5, Math.min(20, this.spherical.radius + deltaY * 0.01));
    this.updateCam();
  }

  private panCamera(dx: number, dy: number) {
    const panSpeed = this.spherical.radius * 0.002;
    this.panRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    this.panUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
    this.lookAtTarget.addScaledVector(this.panRight, -dx * panSpeed);
    this.lookAtTarget.addScaledVector(this.panUp, dy * panSpeed);
  }

  private updateCam() {
    const { radius, theta, phi } = this.spherical;
    const offset = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.position.copy(this.lookAtTarget).add(offset);
    this.camera.lookAt(this.lookAtTarget);
  }

  mount(container: HTMLElement) {
    super.mount(container);
    this.resetCamera();
    this.updateCam();
  }

  resetCamera() {
    this.spherical = { radius: 8, theta: Math.PI / 4, phi: Math.PI / 4 };
    this.lookAtTarget.set(0, 1, 0);
  }
}
