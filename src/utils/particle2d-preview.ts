import * as THREE from 'three';
import type { Particle3DConfig } from '@/types/effect';

interface Particle2D {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColor: THREE.Color;
  endColor: THREE.Color;
  startSize: number;
  life: number;
  maxLife: number;
  elapsed: number;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
}

export class Particle2DPreview {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private particles: Particle2D[] = [];
  private maxParticles = 300;
  private isPlaying = true;
  private elapsedTime = 0;
  private emitTimer = 0;
  private animationId: number | null = null;
  private container: HTMLElement | null = null;
  private config: Particle3DConfig | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.camera.position.z = 10;
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mount(container: HTMLElement) {
    this.container = container;
    this.initRenderer();
    container.appendChild(this.renderer!.domElement);
    this.resize();
    this.start();
  }

  unmount() {
    this.stop();
    if (this.renderer?.domElement.parentElement === this.container) {
      this.container?.removeChild(this.renderer.domElement);
    }
    this.container = null;
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height);
    this.camera.left = -width / 100;
    this.camera.right = width / 100;
    this.camera.top = height / 100;
    this.camera.bottom = -height / 100;
    this.camera.updateProjectionMatrix();
  }

  setConfig(config: Particle3DConfig) {
    this.config = JSON.parse(JSON.stringify(config));
    this.resetSimulation();
  }

  play() { this.isPlaying = true; }
  pause() { this.isPlaying = false; }

  reset() {
    this.resetSimulation();
    this.isPlaying = true;
  }

  private resetSimulation() {
    for (const p of this.particles) {
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
    this.particles = [];
    this.elapsedTime = 0;
    this.emitTimer = 0;
  }

  private start() {
    if (!this.renderer) return;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.isPlaying && this.config) this.update(0.016);
      this.renderer!.render(this.scene, this.camera);
    };
    animate();
  }

  private stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private update(dt: number) {
    if (!this.config) return;
    const cfg = this.config;
    this.elapsedTime += dt;

    if (!cfg.mainModule.loop && this.elapsedTime > cfg.mainModule.duration && this.particles.length === 0) {
      this.isPlaying = false;
      return;
    }

    // Emit
    if (cfg.mainModule.rateOverTime > 0) {
      this.emitTimer += dt;
      const interval = 1 / cfg.mainModule.rateOverTime;
      while (this.emitTimer >= interval) {
        this.emitTimer -= interval;
        this.emitParticle(cfg);
      }
    }

    // Update particles
    const dtCapped = Math.min(dt, 0.1);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dtCapped;
      p.life = p.elapsed / p.maxLife;
      if (p.life >= 1) {
        this.scene.remove(p.sprite);
        p.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.velocity.y -= cfg.mainModule.gravityModifier * 9.8 * dtCapped;

      p.sprite.position.copy(p.position);
      const color = new THREE.Color().lerpColors(p.startColor, p.endColor, p.life);
      p.material.color = color;
      p.material.opacity = 1 - p.life;
      const size = p.startSize * (1 - p.life * 0.5);
      p.sprite.scale.setScalar(size);
    }

    while (this.particles.length > this.maxParticles) {
      const p = this.particles.shift()!;
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
  }

  private emitParticle(cfg: Particle3DConfig) {
    if (this.particles.length >= this.maxParticles) return;

    const speed = cfg.mainModule.startSpeed.mode === 'constant'
      ? (cfg.mainModule.startSpeed.constant ?? 5)
      : ((cfg.mainModule.startSpeed.min ?? 3) + Math.random() * ((cfg.mainModule.startSpeed.max ?? 8) - (cfg.mainModule.startSpeed.min ?? 3)));

    const lifetime = cfg.mainModule.startLifetime.mode === 'constant'
      ? (cfg.mainModule.startLifetime.constant ?? 2)
      : ((cfg.mainModule.startLifetime.min ?? 1) + Math.random() * ((cfg.mainModule.startLifetime.max ?? 3) - (cfg.mainModule.startLifetime.min ?? 1)));

    const size = cfg.mainModule.startSize3D.x.mode === 'constant'
      ? (cfg.mainModule.startSize3D.x.constant ?? 1)
      : ((cfg.mainModule.startSize3D.x.min ?? 0.5) + Math.random() * ((cfg.mainModule.startSize3D.x.max ?? 1.5) - (cfg.mainModule.startSize3D.x.min ?? 0.5)));

    // Position: box shape in 2D plane
    const r = cfg.shapeModule.radius || 5;
    const px = (Math.random() - 0.5) * r * 2;
    const py = -2 + Math.random() * 1;

    const velX = (Math.random() - 0.5) * 1;
    const velY = speed * (0.5 + Math.random() * 0.5);

    // Color
    const c0 = cfg.mainModule.startColor.keys[0]?.color || [1, 1, 1, 1];
    const c1 = cfg.mainModule.startColor.keys[cfg.mainModule.startColor.keys.length - 1]?.color || [1, 1, 1, 0];

    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false,
      transparent: true,
      color: new THREE.Color(c0[0], c0[1], c0[2])
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(px, py, 0);
    sprite.scale.setScalar(size);

    this.scene.add(sprite);
    this.particles.push({
      position: new THREE.Vector3(px, py, 0),
      velocity: new THREE.Vector3(velX, velY, 0),
      startColor: new THREE.Color(c0[0], c0[1], c0[2]),
      endColor: new THREE.Color(c1[0], c1[1], c1[2]),
      startSize: size,
      life: 0, maxLife: lifetime, elapsed: 0,
      sprite, material
    });
  }
}
