import * as THREE from 'three';
import { BaseParticlePreview } from './base-particle-preview';
import type { Particle3DConfig } from '@/types/effect';

export class ParticlePreview extends BaseParticlePreview {
  private camera: THREE.PerspectiveCamera;
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private spherical = { radius: 8, theta: Math.PI / 4, phi: Math.PI / 4 };

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(5, 3, 8);
    this.camera.lookAt(0, 1, 0);
  }

  protected getCamera(): THREE.Camera { return this.camera; }

  resize() {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container!.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer!.setSize(width, height);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  protected getEmitPosition(cfg: Particle3DConfig): THREE.Vector3 {
    const shape = cfg.shapeModule;
    if (!shape.enabled) return new THREE.Vector3(0, 0, 0);
    switch (shape.shapeType) {
      case 'sphere': return this.randomOnSphere(shape.radius);
      case 'hemisphere': { const p = this.randomOnSphere(shape.radius); p.y = Math.abs(p.y); return p; }
      case 'cone': { const angle = (shape.angle * Math.PI) / 180; const r = shape.radius * Math.tan(angle) * Math.sqrt(Math.random()); return new THREE.Vector3(Math.cos(Math.random()*Math.PI*2)*r, 0, Math.sin(Math.random()*Math.PI*2)*r); }
      case 'box': { const s = shape.radius; return new THREE.Vector3((Math.random()-0.5)*s*2, (Math.random()-0.5)*s*2, (Math.random()-0.5)*s*2); }
      case 'circle': { const r = shape.radius * Math.sqrt(Math.random()); return new THREE.Vector3(Math.cos(Math.random()*Math.PI*2)*r, 0, Math.sin(Math.random()*Math.PI*2)*r); }
      default: return new THREE.Vector3(0, 0, 0);
    }
  }

  protected getEmitVelocity(cfg: Particle3DConfig): THREE.Vector3 {
    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    const shape = cfg.shapeModule;
    if (!shape.enabled) return new THREE.Vector3(0, speed, 0);
    switch (shape.shapeType) {
      case 'cone': { const angle = (shape.angle*Math.PI)/180; const sa = (Math.random()-0.5)*angle; const da = Math.random()*Math.PI*2; return new THREE.Vector3(Math.sin(sa)*Math.cos(da), Math.cos(sa), Math.sin(sa)*Math.sin(da)).normalize().multiplyScalar(speed); }
      case 'sphere': case 'hemisphere': return this.randomOnSphere(1).normalize().multiplyScalar(speed);
      case 'box': return new THREE.Vector3((Math.random()-0.5)*0.3, Math.random()*0.8+0.2, (Math.random()-0.5)*0.3).normalize().multiplyScalar(speed);
      default: return new THREE.Vector3(0, speed, 0);
    }
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

  private randomOnSphere(radius: number): THREE.Vector3 {
    const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
    const r = radius * Math.cbrt(Math.random());
    return new THREE.Vector3(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  }

  private updateCam() {
    this.camera.position.set(this.spherical.radius*Math.sin(this.spherical.phi)*Math.cos(this.spherical.theta), this.spherical.radius*Math.cos(this.spherical.phi), this.spherical.radius*Math.sin(this.spherical.phi)*Math.sin(this.spherical.theta));
    this.camera.lookAt(0, 1, 0);
  }

  onMouseDown(x: number, y: number) { this.isDragging = true; this.previousMouse = {x,y}; }
  onMouseMove(x: number, y: number) {
    if (!this.isDragging) return;
    this.spherical.theta -= (x-this.previousMouse.x)*0.005;
    this.spherical.phi -= (y-this.previousMouse.y)*0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI-0.1, this.spherical.phi));
    this.previousMouse = {x,y};
    this.updateCam();
  }
  onMouseUp() { this.isDragging = false; }
  onWheel(deltaY: number) { this.spherical.radius = Math.max(2, Math.min(20, this.spherical.radius + deltaY*0.01)); this.updateCam(); }

  // Override start to include camera update
  mount(container: HTMLElement) {
    super.mount(container);
    this.updateCam();
  }
}
