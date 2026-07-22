import * as THREE from 'three';
import type { Particle3DConfig, RangeValue } from '@/types/effect';

export interface AxisScreenVector {
  id: 'x' | 'y' | 'z';
  dx: number;
  dy: number;
  depth: number;
}

interface BaseParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColor: THREE.Color;
  endColor: THREE.Color;
  life: number;
  maxLife: number;
  elapsed: number;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
}

export abstract class BaseParticlePreview {
  protected scene: THREE.Scene;
  protected renderer: THREE.WebGLRenderer | null = null;
  protected particles: BaseParticle[] = [];
  protected maxParticles = 500;
  protected isPlaying = true;
  protected elapsedTime = 0;
  protected emitTimer = 0;
  protected burstsTriggered: Set<number> = new Set();
  protected animationId: number | null = null;
  protected container: HTMLElement | null = null;
  protected config: Particle3DConfig | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x252530);
    const gridHelper = new THREE.GridHelper(10, 10, 0x404050, 0x303040);
    this.scene.add(gridHelper);
    this.scene.add(new THREE.AmbientLight(0x505060));
  }

  setBackground(color: string) {
    if (color === 'transparent') {
      this.scene.background = null;
      this.renderer?.setClearColor(0x000000, 0);
    } else {
      this.scene.background = new THREE.Color(color);
      this.renderer?.setClearColor(new THREE.Color(color), 1);
    }
  }

  protected initRenderer() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mount(container: HTMLElement) {
    this.container = container;
    this.initRenderer();
    const canvas = this.renderer!.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    this.resize();
    this.start();
    this.observeResize(container);
  }

  private resizeObserver: ResizeObserver | null = null;

  private observeResize(container: HTMLElement) {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  unmount() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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
  }

  setConfig(config: Particle3DConfig) {
    this.config = JSON.parse(JSON.stringify(config));
    this.resetSimulation();
  }

  setMaxParticles(max: number) { this.maxParticles = Math.min(max, 500); }
  play() { this.isPlaying = true; }
  pause() { this.isPlaying = false; }
  reset() { this.resetSimulation(); this.isPlaying = true; }

  // Mouse interaction (overridable)
  onMouseDown(_x: number, _y: number) {}
  onMouseMove(_x: number, _y: number) {}
  onMouseUp() {}
  onWheel(_deltaY: number) {}

  /** World axis directions projected to screen space for orientation gizmo. */
  getAxisScreenVectors(): AxisScreenVector[] {
    const cam = this.getCamera();
    const inv = cam.quaternion.clone().invert();
    const scale = 20;
    const ids = ['x', 'y', 'z'] as const;
    const vectors = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];
    return vectors.map((v, i) => {
      const w = v.clone().applyQuaternion(inv);
      return { id: ids[i], dx: w.x * scale, dy: -w.y * scale, depth: w.z };
    });
  }

  private resetSimulation() {
    for (const p of this.particles) { this.scene.remove(p.sprite); p.material.dispose(); }
    this.particles = [];
    this.elapsedTime = 0;
    this.emitTimer = 0;
    this.burstsTriggered.clear();
  }

  private start() {
    if (!this.renderer) return;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.isPlaying && this.config) this.update(0.016);
      this.renderer!.render(this.scene, this.getCamera());
    };
    animate();
  }

  private stop() {
    if (this.animationId !== null) { cancelAnimationFrame(this.animationId); this.animationId = null; }
  }

  protected update(dt: number) {
    if (!this.config) return;
    const cfg = this.config;
    this.elapsedTime += dt;

    if (!cfg.mainModule.loop && this.elapsedTime > cfg.mainModule.duration && this.particles.length === 0) {
      this.isPlaying = false; return;
    }

    if (cfg.mainModule.rateOverTime > 0) {
      this.emitTimer += dt;
      const interval = 1 / cfg.mainModule.rateOverTime;
      while (this.emitTimer >= interval) { this.emitTimer -= interval; this.emitParticle(cfg); }
    }

    for (const burst of cfg.mainModule.bursts) {
      if (!this.burstsTriggered.has(burst.time) && this.elapsedTime >= burst.time) {
        this.burstsTriggered.add(burst.time);
        for (let i = 0; i < burst.count; i++) this.emitParticle(cfg);
      }
    }

    const dtCapped = Math.min(dt, 0.1);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dtCapped;
      p.life = p.elapsed / p.maxLife;
      if (p.life >= 1) { this.scene.remove(p.sprite); p.material.dispose(); this.particles.splice(i, 1); continue; }

      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.position.z += p.velocity.z * dtCapped;
      this.applyForces(p, cfg, dtCapped);

      p.sprite.position.copy(p.position);
      const color = new THREE.Color().lerpColors(p.startColor, p.endColor, p.life);
      p.material.color = color;
      p.material.opacity = 1 - p.life;
      this.updateSpriteScale(p, cfg);
    }

    while (this.particles.length > this.maxParticles) {
      const p = this.particles.shift()!; this.scene.remove(p.sprite); p.material.dispose();
    }
  }

  protected emitParticle(cfg: Particle3DConfig) {
    if (this.particles.length >= this.maxParticles) return;
    const pos = this.getEmitPosition(cfg);
    const vel = this.getEmitVelocity(cfg);
    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);
    const size = this.getValueFromRange(cfg.mainModule.startSize3D.x);
    const startKeys = cfg.mainModule.startColor.keys;
    const colorKeys = cfg.colorOverLifetime.enabled ? cfg.colorOverLifetime.color.keys : startKeys;
    const c0 = startKeys[0]?.color || [1, 1, 1, 1];
    const c1 = colorKeys[colorKeys.length - 1]?.color || startKeys[startKeys.length - 1]?.color || [1, 1, 1, 0];

    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(255,255,255,0.8)'); g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,32,32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, blending: cfg.rendererModule.renderMode === 'billboard' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true, color: new THREE.Color(c0[0],c0[1],c0[2]) });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(size);

    this.scene.add(sprite);
    this.particles.push({ position: pos.clone(), velocity: vel, startColor: new THREE.Color(c0[0],c0[1],c0[2]), endColor: new THREE.Color(c1[0],c1[1],c1[2]), life: 0, maxLife: lifetime, elapsed: 0, sprite, material });
  }

  protected getValueFromRange(range: RangeValue): number {
    if (range.mode === 'constant') return range.constant ?? 1;
    return (range.min ?? 0) + Math.random() * ((range.max ?? 1) - (range.min ?? 0));
  }

  // Abstract / overridable
  protected abstract getCamera(): THREE.Camera;
  protected abstract getEmitPosition(cfg: Particle3DConfig): THREE.Vector3;
  protected abstract getEmitVelocity(cfg: Particle3DConfig): THREE.Vector3;
  protected applyForces(_p: BaseParticle, _cfg: Particle3DConfig, _dt: number) {}
  protected updateSpriteScale(p: BaseParticle, _cfg: Particle3DConfig) {
    const size = this.getValueFromRange(_cfg.mainModule.startSize3D.x) * (1 - p.life * 0.5);
    p.sprite.scale.setScalar(size);
  }
}
