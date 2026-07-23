import * as THREE from 'three';
import { ParticlePreview } from './particle-preview';
import type { Particle3DConfig, RangeValue } from '@/types/effect';
import { composeParticleColor, sampleStartColor } from '@/utils/gradient-utils';
import { applyTransformToDirection, applyTransformToPoint } from '@/utils/transform-utils';
import type { EmitterPreviewSource } from '@/utils/preview-sources';
import type { Transform3D } from '@/types/project';

interface TaggedParticle {
  emitterId: string;
  config: Particle3DConfig;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColorSample: [number, number, number, number];
  life: number;
  maxLife: number;
  elapsed: number;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
}

interface EmitterRuntime {
  source: EmitterPreviewSource;
  emitTimer: number;
  elapsedTime: number;
  burstsTriggered: Set<string>;
}

/** Multi-emitter particle preview with world transforms. */
export class CompositeParticlePreview extends ParticlePreview {
  private sources: EmitterPreviewSource[] = [];
  private taggedParticles: TaggedParticle[] = [];
  private runtimes = new Map<string, EmitterRuntime>();
  private maxTotalParticles = 800;

  setEmitters(sources: EmitterPreviewSource[]) {
    this.sources = sources.map(s => ({
      id: s.id,
      enabled: s.enabled,
      config: JSON.parse(JSON.stringify(s.config)),
      transform: {
        position: [...s.transform.position] as [number, number, number],
        rotation: [...s.transform.rotation] as [number, number, number],
        scale: [...s.transform.scale] as [number, number, number]
      }
    }));
    this.resetSimulation();
    this.play();
  }

  setConfig(_config: Particle3DConfig) {
    // Composite mode uses setEmitters instead
  }

  reset() {
    this.resetSimulation();
    this.play();
  }

  protected resetSimulation() {
    for (const p of this.taggedParticles) {
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
    this.taggedParticles = [];
    this.runtimes.clear();
    for (const source of this.sources) {
      this.runtimes.set(source.id, {
        source,
        emitTimer: 0,
        elapsedTime: 0,
        burstsTriggered: new Set()
      });
    }
  }

  protected update(dt: number) {
    if (this.sources.length === 0) return;

    const dtCapped = Math.min(dt, 0.1);
    let globalPastDuration = true;

    for (const runtime of this.runtimes.values()) {
      const cfg = runtime.source.config;
      runtime.elapsedTime += dt;
      const duration = cfg.mainModule.duration;
      const shouldLoop = cfg.mainModule.loop;

      if (shouldLoop && duration > 0 && runtime.elapsedTime >= duration) {
        const overflow = runtime.elapsedTime - duration;
        runtime.elapsedTime = overflow;
        runtime.emitTimer = 0;
        runtime.burstsTriggered.clear();
        this.removeParticlesForEmitter(runtime.source.id);
      }

      const pastDuration = !shouldLoop && duration > 0 && runtime.elapsedTime > duration;
      if (!pastDuration) globalPastDuration = false;

      if (!pastDuration) {
        if (cfg.mainModule.rateOverTime > 0) {
          runtime.emitTimer += dt;
          const interval = 1 / cfg.mainModule.rateOverTime;
          while (runtime.emitTimer >= interval) {
            runtime.emitTimer -= interval;
            this.emitForSource(runtime.source);
          }
        }

        for (const burst of cfg.mainModule.bursts) {
          const burstKey = `${burst.time}-${burst.count}`;
          const cycles = burst.cycles ?? 1;
          const interval = burst.interval ?? 1;
          for (let c = 0; c < cycles; c++) {
            const triggerTime = burst.time + c * interval;
            const key = `${runtime.source.id}-${burstKey}-${c}`;
            if (!runtime.burstsTriggered.has(key) && runtime.elapsedTime >= triggerTime) {
              runtime.burstsTriggered.add(key);
              for (let i = 0; i < burst.count; i++) this.emitForSource(runtime.source);
            }
          }
        }
      }
    }

    if (globalPastDuration && this.taggedParticles.length === 0) {
      this.pause();
      return;
    }

    for (let i = this.taggedParticles.length - 1; i >= 0; i--) {
      const p = this.taggedParticles[i];
      const cfg = p.config;
      p.elapsed += dtCapped;
      p.life = p.elapsed / p.maxLife;
      if (p.life >= 1) {
        this.scene.remove(p.sprite);
        p.material.dispose();
        this.taggedParticles.splice(i, 1);
        continue;
      }

      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.position.z += p.velocity.z * dtCapped;
      this.applyForces(p as unknown as Parameters<ParticlePreview['applyForces']>[0], cfg, dtCapped);

      p.sprite.position.copy(p.position);
      const rgba = composeParticleColor(
        p.startColorSample,
        cfg.colorOverLifetime.color,
        p.life,
        cfg.colorOverLifetime.enabled
      );
      p.material.color.setRGB(rgba[0], rgba[1], rgba[2]);
      p.material.opacity = rgba[3];
      this.updateSpriteScale(p as unknown as Parameters<ParticlePreview['updateSpriteScale']>[0], cfg);
    }

    while (this.taggedParticles.length > this.maxTotalParticles) {
      const p = this.taggedParticles.shift()!;
      this.scene.remove(p.sprite);
      p.material.dispose();
    }
  }

  private removeParticlesForEmitter(emitterId: string) {
    for (let i = this.taggedParticles.length - 1; i >= 0; i--) {
      const p = this.taggedParticles[i];
      if (p.emitterId === emitterId) {
        this.scene.remove(p.sprite);
        p.material.dispose();
        this.taggedParticles.splice(i, 1);
      }
    }
  }

  private emitForSource(source: EmitterPreviewSource) {
    if (this.taggedParticles.length >= this.maxTotalParticles) return;
    const cfg = source.config;
    const transform = source.transform;

    const localPos = this.getEmitPosition(cfg);
    const localVel = this.getEmitVelocity(cfg);
    const pos = applyTransformToPoint(transform, localPos);
    const vel = applyTransformToDirection(transform, localVel);

    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);
    const size = this.getValueFromRange(cfg.mainModule.startSize3D.x);
    const startSample = sampleStartColor(cfg.mainModule.startColor);
    const initialRgba = composeParticleColor(
      startSample,
      cfg.colorOverLifetime.color,
      0,
      cfg.colorOverLifetime.enabled
    );

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
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

    this.taggedParticles.push({
      emitterId: source.id,
      config: cfg,
      position: pos.clone(),
      velocity: vel,
      startColorSample: startSample,
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
}

// Expose scene access for tests if needed
export type { Transform3D };
