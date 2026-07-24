import * as THREE from 'three';
import { ParticlePreview } from './particle-preview';
import type { Particle3DConfig, RangeValue } from '@/types/effect';
import { composeParticleColor, sampleStartColor } from '@/utils/gradient-utils';
import { applyTransformToDirection, applyTransformToPoint } from '@/utils/transform-utils';
import type { EmitterPreviewSource } from '@/utils/preview-sources';
import type { Transform3D } from '@/types/project';
import type { AssetEntry } from '@/types/asset';
import {
  createFallbackParticleTexture,
  getCachedParticleTexture,
  loadParticleTexture,
  disposeSpriteMaterial
} from '@/utils/texture-loader';
import { resolveParticleBlending, resolveMaterialTintRgba, resolvePreviewTextureAssetId, applyTintToRgba } from '@/utils/material-blend';
import { wrapEmissionClock } from '@/utils/particle-loop';
import {
  cloneTextureForSheet,
  sampleTextureSheetContext,
  updateParticleTextureSheet,
  usesTextureSheet,
  type TextureSheetFrameContext
} from '@/utils/texture-sheet';
import { computeParticleScale, sampleStartParticleSize } from '@/utils/particle-size';
import { sampleEmitMotion } from '@/utils/particle-shape';
import { normalizeParticle3DConfig } from '@/utils/particle-config-normalize';
import { syncEmitterGizmoGroup, type EmitterGizmoInput } from '@/utils/emitter-gizmo';

interface TaggedParticle {
  emitterId: string;
  config: Particle3DConfig;
  transform: Transform3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColorSample: [number, number, number, number];
  materialTint: [number, number, number, number];
  startSize: number;
  life: number;
  maxLife: number;
  elapsed: number;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  ownedTexture: THREE.Texture | null;
  sheetContext: TextureSheetFrameContext | null;
}

function disposeTaggedParticleMaterial(p: TaggedParticle) {
  if (p.ownedTexture) {
    p.ownedTexture.dispose();
    p.ownedTexture = null;
  }
  disposeSpriteMaterial(p.material);
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
  private assetContext: {
    getAsset: (id: string) => AssetEntry | null;
    projectDir?: string | null;
  } | null = null;
  private fallbackTexture: THREE.Texture | null = null;
  private gizmoRoot = new THREE.Group();
  private gizmoVisible = true;
  private gizmoSelectedId: string | null = null;

  constructor() {
    super();
    this.gizmoRoot.name = 'emitter-gizmos';
    this.scene.add(this.gizmoRoot);
  }

  setEmitterGizmosVisible(visible: boolean) {
    this.gizmoVisible = visible;
    this.refreshGizmos();
  }

  setEmitterGizmoSelection(selectedId: string | null) {
    this.gizmoSelectedId = selectedId;
    this.refreshGizmos();
  }

  setEmitters(
    sources: EmitterPreviewSource[],
    assetContext?: {
      getAsset: (id: string) => AssetEntry | null;
      projectDir?: string | null;
    }
  ) {
    this.assetContext = assetContext ?? null;
    const normalized = sources.map(s => ({
      id: s.id,
      name: s.name,
      enabled: s.enabled,
      config: normalizeParticle3DConfig(JSON.parse(JSON.stringify(s.config))),
      transform: {
        position: [...s.transform.position] as [number, number, number],
        rotation: [...s.transform.rotation] as [number, number, number],
        scale: [...s.transform.scale] as [number, number, number],
      },
      mainTextureAssetId: s.mainTextureAssetId,
      materialAssetId: s.materialAssetId
    }));

    this.preloadTextures(normalized);

    const sameStructure = normalized.length === this.sources.length
      && normalized.every((s, i) => s.id === this.sources[i]?.id);

    if (sameStructure && normalized.length > 0) {
      this.sources = normalized;
      for (const s of normalized) {
        const rt = this.runtimes.get(s.id);
        if (rt) rt.source = s;
      }
      this.refreshGizmos();
      return;
    }

    this.sources = normalized;
    this.resetSimulation();
    this.play();
    this.refreshGizmos();
  }

  private refreshGizmos() {
    if (!this.gizmoVisible) {
      this.gizmoRoot.visible = false;
      return;
    }
    this.gizmoRoot.visible = true;
    const inputs: EmitterGizmoInput[] = this.sources.map(s => ({
      id: s.id,
      name: s.name,
      config: s.config,
      transform: s.transform,
      enabled: s.enabled
    }));
    syncEmitterGizmoGroup(this.gizmoRoot, inputs, { selectedId: this.gizmoSelectedId });
  }

  protected canSimulate(): boolean {
    return this.sources.length > 0;
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
      disposeTaggedParticleMaterial(p);
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

      const clock = wrapEmissionClock(runtime.elapsedTime, duration, shouldLoop);
      runtime.elapsedTime = clock.elapsed;
      if (clock.wrapped) {
        runtime.burstsTriggered.clear();
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
        disposeTaggedParticleMaterial(p);
        this.taggedParticles.splice(i, 1);
        continue;
      }

      p.position.x += p.velocity.x * dtCapped;
      p.position.y += p.velocity.y * dtCapped;
      p.position.z += p.velocity.z * dtCapped;
      this.applyForces(p as unknown as Parameters<ParticlePreview['applyForces']>[0], cfg, dtCapped);

      p.sprite.position.copy(p.position);
      const rgba = applyTintToRgba(
        composeParticleColor(
          p.startColorSample,
          cfg.colorOverLifetime.color,
          p.life,
          cfg.colorOverLifetime.enabled
        ),
        p.materialTint
      );
      p.material.color.setRGB(rgba[0], rgba[1], rgba[2]);
      p.material.opacity = rgba[3];
      if (p.ownedTexture && usesTextureSheet(cfg.textureAnimation)) {
        updateParticleTextureSheet(
          p.ownedTexture,
          cfg.textureAnimation,
          p.life,
          p.sheetContext ?? undefined
        );
      }
      const size = computeParticleScale(cfg, p.startSize, p.life, p.transform);
      p.sprite.scale.setScalar(size);
    }

    while (this.taggedParticles.length > this.maxTotalParticles) {
      const p = this.taggedParticles.shift()!;
      this.scene.remove(p.sprite);
      disposeTaggedParticleMaterial(p);
    }
  }

  private preloadTextures(sources: EmitterPreviewSource[]) {
    if (!this.assetContext) return;
    const { getAsset, projectDir } = this.assetContext;
    for (const source of sources) {
      const assetId = resolvePreviewTextureAssetId(
        source.mainTextureAssetId,
        source.materialAssetId,
        getAsset
      );
      if (!assetId) continue;
      const entry = getAsset(assetId);
      if (!entry) continue;
      loadParticleTexture(assetId, entry, projectDir).catch(() => { /* fallback used */ });
    }
  }

  private getParticleTexture(source: EmitterPreviewSource): THREE.Texture {
    const assetId = this.assetContext
      ? resolvePreviewTextureAssetId(
        source.mainTextureAssetId,
        source.materialAssetId,
        this.assetContext.getAsset
      )
      : source.mainTextureAssetId;
    if (assetId) {
      const cached = getCachedParticleTexture(assetId);
      if (cached) return cached;
    }
    if (!this.fallbackTexture) {
      this.fallbackTexture = createFallbackParticleTexture();
    }
    return this.fallbackTexture;
  }

  private emitForSource(source: EmitterPreviewSource) {
    if (this.taggedParticles.length >= this.maxTotalParticles) return;
    const cfg = source.config;
    const transform = source.transform;

    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    const { position: localPos, velocity: localVel } = sampleEmitMotion(cfg, speed);
    const pos = applyTransformToPoint(transform, localPos);
    const vel = applyTransformToDirection(transform, localVel);

    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);
    const startSize = sampleStartParticleSize(cfg);
    const size = computeParticleScale(cfg, startSize, 0, transform);
    const startSample = sampleStartColor(cfg.mainModule.startColor);
    let initialRgba = composeParticleColor(
      startSample,
      cfg.colorOverLifetime.color,
      0,
      cfg.colorOverLifetime.enabled
    );
    const tint = this.assetContext
      ? resolveMaterialTintRgba(source.materialAssetId, this.assetContext.getAsset)
      : ([1, 1, 1, 1] as [number, number, number, number]);
    initialRgba = applyTintToRgba(initialRgba, tint);

    const texture = this.getParticleTexture(source);
    let ownedTexture: THREE.Texture | null = null;
    let sheetContext: TextureSheetFrameContext | null = null;
    let mapTexture = texture;
    if (usesTextureSheet(cfg.textureAnimation)) {
      ownedTexture = cloneTextureForSheet(texture);
      mapTexture = ownedTexture;
      sheetContext = sampleTextureSheetContext(cfg.textureAnimation);
      updateParticleTextureSheet(
        ownedTexture,
        cfg.textureAnimation,
        0,
        sheetContext
      );
    }
    const blending = this.assetContext
      ? resolveParticleBlending(
        source.materialAssetId,
        this.assetContext.getAsset,
        cfg.rendererModule.renderMode
      )
      : (cfg.rendererModule.renderMode !== 'billboard' ? THREE.AdditiveBlending : THREE.NormalBlending);
    const material = new THREE.SpriteMaterial({
      map: mapTexture,
      blending,
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
      transform,
      position: pos.clone(),
      velocity: vel,
      startColorSample: startSample,
      materialTint: tint,
      startSize,
      life: 0,
      maxLife: lifetime,
      elapsed: 0,
      sprite,
      material,
      ownedTexture,
      sheetContext
    });
  }

  protected getValueFromRange(range: RangeValue): number {
    if (range.mode === 'constant') return range.constant ?? 1;
    return (range.min ?? 0) + Math.random() * ((range.max ?? 1) - (range.min ?? 0));
  }
}

// Expose scene access for tests if needed
export type { Transform3D };
