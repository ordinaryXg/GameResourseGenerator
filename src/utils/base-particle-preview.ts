import * as THREE from 'three';
import type { Particle3DConfig, RangeValue } from '@/types/effect';
import { composeParticleColor, sampleStartColor } from '@/utils/gradient-utils';
import { configureParticleTexture, disposeSpriteMaterial } from '@/utils/texture-loader';
import { computeParticleScale, sampleStartParticleSize } from '@/utils/particle-size';
import { sampleEmitMotion } from '@/utils/particle-shape';
import { wrapEmissionClock } from '@/utils/particle-loop';

export interface AxisScreenVector {
  id: 'x' | 'y' | 'z';
  dx: number;
  dy: number;
  depth: number;
}

interface BaseParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColorSample: [number, number, number, number];
  startSize: number;
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
  protected burstsTriggered: Set<string> = new Set();
  protected animationId: number | null = null;
  protected container: HTMLElement | null = null;
  protected config: Particle3DConfig | null = null;
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private onFpsUpdate: ((fps: number) => void) | null = null;

  setFpsListener(listener: ((fps: number) => void) | null) {
    this.onFpsUpdate = listener;
  }

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
    if (this.renderer) {
      const gl = this.renderer.getContext();
      if (!gl.isContextLost()) return;
      this.renderer.dispose();
      this.renderer = null;
    }
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.applyRendererSize();
  }

  protected getPreviewPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  protected applyRendererSize(): void {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer.setPixelRatio(this.getPreviewPixelRatio());
    this.renderer.setSize(width, height);
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
    requestAnimationFrame(() => this.resize());
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
    if (this.renderer) {
      if (this.renderer.domElement.parentElement === this.container) {
        this.container?.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
      this.renderer = null;
    }
    this.container = null;
  }

  resize() {
    this.applyRendererSize();
  }

  setConfig(config: Particle3DConfig) {
    this.config = JSON.parse(JSON.stringify(config));
    this.resetSimulation();
    this.isPlaying = true;
  }

  setMaxParticles(max: number) { this.maxParticles = Math.min(max, 500); }
  play() { this.isPlaying = true; }
  pause() { this.isPlaying = false; }
  reset() { this.resetSimulation(); this.isPlaying = true; }

  // Mouse interaction (overridable)
  onMouseDown(_x: number, _y: number, _button = 0) {}
  onMouseMove(_x: number, _y: number) {}
  onMouseUp(_button?: number) {}
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

  protected resetSimulation() {
    for (const p of this.particles) { this.scene.remove(p.sprite); disposeSpriteMaterial(p.material); }
    this.particles = [];
    this.elapsedTime = 0;
    this.emitTimer = 0;
    this.burstsTriggered.clear();
  }

  protected canSimulate(): boolean {
    return this.config !== null;
  }

  private start() {
    if (!this.renderer) return;
    this.fpsLastTime = performance.now();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      try {
        if (this.isPlaying && this.canSimulate()) this.update(0.016);
        this.renderer!.render(this.scene, this.getCamera());
      } catch (err) {
        console.error('[Preview] render loop error:', err);
      }
      this.fpsFrameCount += 1;
      const now = performance.now();
      if (now - this.fpsLastTime >= 500) {
        const fps = Math.round(this.fpsFrameCount * 1000 / (now - this.fpsLastTime));
        this.fpsFrameCount = 0;
        this.fpsLastTime = now;
        this.onFpsUpdate?.(fps);
      }
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

    const duration = cfg.mainModule.duration;
    const shouldLoop = cfg.mainModule.loop;

    const clock = wrapEmissionClock(this.elapsedTime, duration, shouldLoop);
    if (clock.wrapped) {
      this.elapsedTime = clock.elapsed;
      this.burstsTriggered.clear();
    } else {
      this.elapsedTime = clock.elapsed;
    }

    const pastDuration = !shouldLoop && duration > 0 && this.elapsedTime > duration;

    if (pastDuration && this.particles.length === 0) {
      this.isPlaying = false;
      return;
    }

    if (!pastDuration) {
      if (cfg.mainModule.rateOverTime > 0) {
        this.emitTimer += dt;
        const interval = 1 / cfg.mainModule.rateOverTime;
        while (this.emitTimer >= interval) {
          this.emitTimer -= interval;
          this.emitParticle(cfg);
        }
      }

      for (const burst of cfg.mainModule.bursts) {
        const burstKey = `${burst.time}-${burst.count}`;
        const cycles = burst.cycles ?? 1;
        const interval = burst.interval ?? 1;
        for (let c = 0; c < cycles; c++) {
          const triggerTime = burst.time + c * interval;
          if (!this.burstsTriggered.has(`${burstKey}-${c}`) && this.elapsedTime >= triggerTime) {
            this.burstsTriggered.add(`${burstKey}-${c}`);
            for (let i = 0; i < burst.count; i++) this.emitParticle(cfg);
          }
        }
      }
    }

    const dtCapped = Math.min(dt, 0.1);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dtCapped;
      p.life = p.elapsed / p.maxLife;
      if (p.life >= 1) { this.scene.remove(p.sprite); disposeSpriteMaterial(p.material); this.particles.splice(i, 1); continue; }

      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.position.z += p.velocity.z * dtCapped;
      this.applyForces(p, cfg, dtCapped);

      p.sprite.position.copy(p.position);
      const rgba = composeParticleColor(
        p.startColorSample,
        cfg.colorOverLifetime.color,
        p.life,
        cfg.colorOverLifetime.enabled
      );
      p.material.color.setRGB(rgba[0], rgba[1], rgba[2]);
      p.material.opacity = rgba[3];
      this.updateSpriteScale(p, cfg);
    }

    while (this.particles.length > this.maxParticles) {
      const p = this.particles.shift()!; this.scene.remove(p.sprite); disposeSpriteMaterial(p.material);
    }
  }

  protected emitParticle(cfg: Particle3DConfig) {
    if (this.particles.length >= this.maxParticles) return;
    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    const { position: pos, velocity: vel } = sampleEmitMotion(cfg, speed);
    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);
    const startSize = sampleStartParticleSize(cfg);
    const size = computeParticleScale(cfg, startSize, 0);
    const startSample = sampleStartColor(cfg.mainModule.startColor);
    const initialRgba = composeParticleColor(
      startSample,
      cfg.colorOverLifetime.color,
      0,
      cfg.colorOverLifetime.enabled
    );

    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(255,255,255,0.8)'); g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,32,32);

    const texture = new THREE.CanvasTexture(canvas);
    configureParticleTexture(texture);
    const useAdditive = cfg.rendererModule.renderMode !== 'billboard';
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      color: new THREE.Color(initialRgba[0], initialRgba[1], initialRgba[2]),
      opacity: initialRgba[3]
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(size);

    this.scene.add(sprite);
    this.particles.push({
      position: pos.clone(),
      velocity: vel,
      startColorSample: startSample,
      startSize,
      life: 0,
      maxLife: lifetime,
      elapsed: 0,
      sprite,
      material
    });
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
  protected updateSpriteScale(p: BaseParticle, cfg: Particle3DConfig) {
    const size = computeParticleScale(cfg, p.startSize, p.life);
    p.sprite.scale.setScalar(size);
  }
}
