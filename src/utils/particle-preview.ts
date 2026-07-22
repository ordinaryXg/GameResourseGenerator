import * as THREE from 'three';
import type { Particle3DConfig, GradientConfig, RangeValue, BurstConfig } from '@/types/effect';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColor: THREE.Color;
  endColor: THREE.Color;
  startSize: THREE.Vector3;
  endSize: THREE.Vector3;
  life: number;
  maxLife: number;
  elapsed: number;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
}

export class ParticlePreview {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private particles: Particle[] = [];
  private maxParticles = 500;
  private isPlaying = true;
  private elapsedTime = 0;
  private emitTimer = 0;
  private burstsTriggered: Set<number> = new Set();
  private animationId: number | null = null;
  private container: HTMLElement | null = null;
  private config: Particle3DConfig | null = null;

  // Camera control
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private spherical = { radius: 8, theta: Math.PI / 4, phi: Math.PI / 4 };

  private onFrameCallback: (() => void) | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(5, 3, 8);
    this.camera.lookAt(0, 1, 0);

    // Grid helper for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x30363d, 0x21262d);
    this.scene.add(gridHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
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
    if (this.container && this.renderer && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.container = null;
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setConfig(config: Particle3DConfig) {
    this.config = JSON.parse(JSON.stringify(config));
    this.resetSimulation();
  }

  setMaxParticles(max: number) {
    this.maxParticles = Math.min(max, 500);
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.resetSimulation();
    this.isPlaying = true;
  }

  onFrame(callback: () => void) {
    this.onFrameCallback = callback;
  }

  private resetSimulation() {
    this.clearParticles();
    this.elapsedTime = 0;
    this.emitTimer = 0;
    this.burstsTriggered.clear();
  }

  private clearParticles() {
    for (const p of this.particles) {
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
    this.particles = [];
  }

  private start() {
    if (!this.renderer) return;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.isPlaying && this.config) {
        this.update(0.016);
      }
      this.updateCamera();
      this.renderer!.render(this.scene, this.camera);
      if (this.onFrameCallback) this.onFrameCallback();
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

    // Check duration
    if (!cfg.mainModule.loop && this.elapsedTime > cfg.mainModule.duration) {
      if (this.particles.length === 0) {
        this.isPlaying = false;
        return;
      }
      // Let remaining particles die
    } else if (cfg.mainModule.loop && this.elapsedTime > cfg.mainModule.duration) {
      this.elapsedTime -= cfg.mainModule.duration;
      this.burstsTriggered.clear();
    }

    // Emit particles
    if (cfg.mainModule.rateOverTime > 0) {
      this.emitTimer += dt;
      const emitInterval = 1 / cfg.mainModule.rateOverTime;
      while (this.emitTimer >= emitInterval) {
        this.emitTimer -= emitInterval;
        this.emitParticle(cfg);
      }
    }

    // Bursts
    for (const burst of cfg.mainModule.bursts) {
      if (!this.burstsTriggered.has(burst.time) && this.elapsedTime >= burst.time) {
        this.burstsTriggered.add(burst.time);
        for (let i = 0; i < burst.count; i++) {
          this.emitParticle(cfg);
        }
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

      // Update position
      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.position.z += p.velocity.z * dtCapped;

      // Apply gravity
      p.velocity.y -= cfg.mainModule.gravityModifier * 9.8 * dtCapped;

      // Apply noise if enabled
      if (cfg.noiseModule.enabled) {
        const ns = cfg.noiseModule.strength * 0.01;
        p.velocity.x += (Math.random() - 0.5) * ns;
        p.velocity.y += (Math.random() - 0.5) * ns;
        p.velocity.z += (Math.random() - 0.5) * ns;
      }

      // Update sprite
      p.sprite.position.copy(p.position);

      // Interpolate color
      const color = new THREE.Color();
      color.lerpColors(p.startColor, p.endColor, p.life);
      p.material.color = color;

      // Interpolate size (use x component for simplicity)
      const size = p.startSize.x + (p.endSize.x - p.startSize.x) * p.life;
      p.material.opacity = 1 - p.life;
      p.sprite.scale.setScalar(size);
    }

    // Cap particles
    while (this.particles.length > this.maxParticles) {
      const p = this.particles.shift()!;
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
  }

  private emitParticle(cfg: Particle3DConfig) {
    if (this.particles.length >= this.maxParticles) return;

    // Calculate emission position based on shape
    const pos = this.getEmissionPosition(cfg);
    const vel = this.getEmissionVelocity(cfg);

    // Lifetime
    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);

    // Color
    const startColor = this.getColorFromGradient(cfg.mainModule.startColor, 0);
    const endColor = this.getColorFromGradient(cfg.mainModule.startColor, 1);

    // Size
    const sizeX = this.getValueFromRange(cfg.mainModule.startSize3D.x);
    const sizeY = this.getValueFromRange(cfg.mainModule.startSize3D.y);
    const sizeZ = this.getValueFromRange(cfg.mainModule.startSize3D.z);

    // Create sprite
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: cfg.rendererModule.renderMode === 'billboard' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      color: startColor
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(sizeX);

    const particle: Particle = {
      position: pos.clone(),
      velocity: vel,
      startColor: startColor.clone(),
      endColor: endColor.clone(),
      startSize: new THREE.Vector3(sizeX, sizeY, sizeZ),
      endSize: new THREE.Vector3(sizeX * 0.1, sizeY * 0.1, sizeZ * 0.1),
      life: 0,
      maxLife: lifetime,
      elapsed: 0,
      sprite,
      material
    };

    this.scene.add(sprite);
    this.particles.push(particle);
  }

  private getEmissionPosition(cfg: Particle3DConfig): THREE.Vector3 {
    const shape = cfg.shapeModule;
    if (!shape.enabled) return new THREE.Vector3(0, 0, 0);

    switch (shape.shapeType) {
      case 'sphere':
        return this.randomOnSphere(shape.radius);
      case 'hemisphere':
        const p = this.randomOnSphere(shape.radius);
        p.y = Math.abs(p.y);
        return p;
      case 'cone': {
        const angle = (shape.angle * Math.PI) / 180;
        const h = shape.radius;
        const r = h * Math.tan(angle) * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      }
      case 'box': {
        const s = shape.radius;
        return new THREE.Vector3(
          (Math.random() - 0.5) * s * 2,
          (Math.random() - 0.5) * s * 2,
          (Math.random() - 0.5) * s * 2
        );
      }
      case 'circle': {
        const r = shape.radius * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      }
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }

  private randomOnSphere(radius: number): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * Math.cbrt(Math.random());
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private getEmissionVelocity(cfg: Particle3DConfig): THREE.Vector3 {
    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    const shape = cfg.shapeModule;

    if (!shape.enabled) {
      return new THREE.Vector3(0, speed, 0);
    }

    switch (shape.shapeType) {
      case 'cone': {
        const angle = (shape.angle * Math.PI) / 180;
        const spreadAngle = (Math.random() - 0.5) * angle;
        const dirAngle = Math.random() * Math.PI * 2;
        const spreadX = Math.sin(spreadAngle) * Math.cos(dirAngle);
        const spreadZ = Math.sin(spreadAngle) * Math.sin(dirAngle);
        const spreadY = Math.cos(spreadAngle);
        return new THREE.Vector3(spreadX, spreadY, spreadZ).normalize().multiplyScalar(speed);
      }
      case 'sphere':
      case 'hemisphere': {
        const dir = this.randomOnSphere(1);
        return dir.normalize().multiplyScalar(speed);
      }
      case 'box': {
        return new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.8 + 0.2,
          (Math.random() - 0.5) * 0.3
        ).normalize().multiplyScalar(speed);
      }
      default:
        return new THREE.Vector3(0, speed, 0);
    }
  }

  private getValueFromRange(range: RangeValue): number {
    if (range.mode === 'constant') return range.constant ?? 1;
    const min = range.min ?? 0;
    const max = range.max ?? 1;
    return min + Math.random() * (max - min);
  }

  private getColorFromGradient(gradient: GradientConfig, time: number): THREE.Color {
    if (!gradient.keys.length) return new THREE.Color(1, 1, 1);
    if (gradient.keys.length === 1) {
      const c = gradient.keys[0].color;
      return new THREE.Color(c[0], c[1], c[2]);
    }

    // Find surrounding keys
    let i = 0;
    while (i < gradient.keys.length - 1 && gradient.keys[i + 1].time <= time) i++;
    if (i >= gradient.keys.length - 1) {
      const c = gradient.keys[gradient.keys.length - 1].color;
      return new THREE.Color(c[0], c[1], c[2]);
    }

    const k1 = gradient.keys[i];
    const k2 = gradient.keys[i + 1];
    const t = (time - k1.time) / (k2.time - k1.time);

    return new THREE.Color(
      k1.color[0] + (k2.color[0] - k1.color[0]) * t,
      k1.color[1] + (k2.color[1] - k1.color[1]) * t,
      k1.color[2] + (k2.color[2] - k1.color[2]) * t
    );
  }

  private updateCamera() {
    const radius = this.spherical.radius;
    const theta = this.spherical.theta;
    const phi = this.spherical.phi;

    this.camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.lookAt(0, 1, 0);
  }

  // Mouse interaction
  onMouseDown(x: number, y: number) {
    this.isDragging = true;
    this.previousMouse = { x, y };
  }

  onMouseMove(x: number, y: number) {
    if (!this.isDragging) return;
    const dx = x - this.previousMouse.x;
    const dy = y - this.previousMouse.y;
    this.spherical.theta -= dx * 0.005;
    this.spherical.phi -= dy * 0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    this.previousMouse = { x, y };
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(deltaY: number) {
    this.spherical.radius += deltaY * 0.01;
    this.spherical.radius = Math.max(2, Math.min(20, this.spherical.radius));
  }
}
