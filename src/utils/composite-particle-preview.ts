import * as THREE from 'three';
import { ParticlePreview } from './particle-preview';
import type { Particle3DConfig, RangeValue, SimulationSpace } from '@/types/effect';
import { composeParticleColor, sampleStartColor } from '@/utils/gradient-utils';
import { applyTransformToDirection, applyTransformToPoint, applyInverseTransformToDirection } from '@/utils/transform-utils';
import type { EmitterPreviewSource } from '@/utils/preview-sources';
import type { EffectGroupNode, Transform3D } from '@/types/project';
import type { AssetEntry } from '@/types/asset';
import {
  createFallbackParticleTexture,
  getCachedParticleTexture,
  loadParticleTexture,
} from '@/utils/texture-loader';
import { resolveParticleBlending, resolveMaterialTintRgba, resolvePreviewTextureAssetId, applyTintToRgba } from '@/utils/material-blend';
import { wrapEmissionClock } from '@/utils/particle-loop';
import { scaleSimulationDelta } from '@/utils/simulation-delta';
import {
  cloneTextureForSheet,
  sampleTextureSheetContext,
  updateParticleTextureSheet,
  usesTextureSheet,
  type TextureSheetFrameContext
} from '@/utils/texture-sheet';
import {
  computeParticleScale3D,
  sampleStartParticleSize,
  sampleStartParticleSize3D,
  type ParticleScaleContext
} from '@/utils/particle-size';
import { sampleEmitMotion } from '@/utils/particle-shape';
import { normalizeParticle3DConfig } from '@/utils/particle-config-normalize';
import { syncEmitterGizmoGroup, type EmitterGizmoInput } from '@/utils/emitter-gizmo';
import { sampleCurveConfig } from '@/utils/curve-utils';
import {
  createParticleVisual,
  disposeParticleVisual,
  setParticleVisualSize,
  setParticleVisualSize3D,
  applyParticleVisualRotation,
  type ParticleVisual
} from '@/utils/particle-visual';
import {
  sampleStartRotation3D,
  sampleAngularVelocity3D,
  computeMeshParticleQuaternion,
  applyMeshParticleOrientation
} from '@/utils/particle-mesh';
import { collectAnimatedEmitterSources } from '@/utils/preview-transform-tree';
import { getCachedMeshGeometry, preloadMeshGeometry } from '@/utils/mesh-loader';

interface TaggedParticle {
  emitterId: string;
  config: Particle3DConfig;
  transform: Transform3D;
  simulationSpace: SimulationSpace;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startColorSample: [number, number, number, number];
  materialTint: [number, number, number, number];
  startSize: number;
  startSize3D: [number, number, number];
  startRotation3D: [number, number, number];
  angularVelocity3D: [number, number, number];
  emitterLocalTransform: Transform3D;
  life: number;
  maxLife: number;
  elapsed: number;
  visual: ParticleVisual;
  ownedTexture: THREE.Texture | null;
  sheetContext: TextureSheetFrameContext | null;
}

function disposeTaggedParticle(p: TaggedParticle) {
  if (p.ownedTexture) {
    p.ownedTexture.dispose();
    p.ownedTexture = null;
  }
  disposeParticleVisual(p.visual);
}

function particleScaleContext(
  worldTransform: Transform3D,
  localTransform: Transform3D
): ParticleScaleContext {
  return { worldTransform, localTransform };
}

function applyTaggedParticleScale(p: TaggedParticle, cfg: Particle3DConfig) {
  const scale3D = computeParticleScale3D(
    cfg,
    p.startSize3D,
    p.life,
    particleScaleContext(p.transform, p.emitterLocalTransform)
  );
  if (p.visual.kind === 'mesh') {
    setParticleVisualSize3D(p.visual, scale3D);
    return;
  }
  const uniform = cfg.mainModule.useStartSize3D
    ? Math.max(scale3D[0], scale3D[1], scale3D[2])
    : Math.max(scale3D[0], scale3D[1]);
  setParticleVisualSize(p.visual, uniform);
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
  private animateRoot: EffectGroupNode | null = null;
  private soloId: string | null = null;
  private previewClock = 0;
  private taggedParticles: TaggedParticle[] = [];
  private runtimes = new Map<string, EmitterRuntime>();
  private maxTotalParticles = 2400;
  private assetContext: {
    getAsset: (id: string) => AssetEntry | null;
    getAllAssets?: () => AssetEntry[];
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

  setPreviewContext(options: {
    root: EffectGroupNode;
    soloId?: string | null;
    getAsset: (id: string) => AssetEntry | null;
    getAllAssets?: () => AssetEntry[];
    projectDir?: string | null;
  }) {
    this.animateRoot = options.root;
    this.soloId = options.soloId ?? null;
    this.assetContext = {
      getAsset: options.getAsset,
      getAllAssets: options.getAllAssets,
      projectDir: options.projectDir ?? null
    };
    const sources = this.normalizeSources(this.buildSourcesFromTree(this.previewClock));
    this.applyEmitterSources(sources);
  }

  setEmitters(
    sources: EmitterPreviewSource[],
    assetContext?: {
      getAsset: (id: string) => AssetEntry | null;
      getAllAssets?: () => AssetEntry[];
      projectDir?: string | null;
    }
  ) {
    this.assetContext = assetContext ?? null;
    this.animateRoot = null;
    this.soloId = null;
    const normalized = this.normalizeSources(sources);
    this.applyEmitterSources(normalized);
  }

  private buildSourcesFromTree(previewTime: number): EmitterPreviewSource[] {
    if (!this.animateRoot) return this.sources;
    return collectAnimatedEmitterSources(this.animateRoot, {
      previewTime,
      soloId: this.soloId
    });
  }

  private normalizeSources(sources: EmitterPreviewSource[]): EmitterPreviewSource[] {
    return sources.map(s => ({
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
      materialAssetId: s.materialAssetId,
      meshAssetId: s.meshAssetId
    }));
  }

  private sameEmitterIdSet(a: EmitterPreviewSource[], b: EmitterPreviewSource[]): boolean {
    if (a.length !== b.length) return false;
    const ids = new Set(a.map(s => s.id));
    if (ids.size !== a.length) return false;
    return b.every(s => ids.has(s.id));
  }

  private removeParticlesForEmitter(emitterId: string) {
    for (let i = this.taggedParticles.length - 1; i >= 0; i--) {
      const p = this.taggedParticles[i];
      if (p.emitterId === emitterId) {
        disposeTaggedParticle(p);
        this.taggedParticles.splice(i, 1);
      }
    }
  }

  private applyEmitterSources(normalized: EmitterPreviewSource[]) {
    this.preloadAssets(normalized);

    const prevIds = new Set(this.sources.map(s => s.id));
    const nextIds = new Set(normalized.map(s => s.id));

    if (this.sameEmitterIdSet(normalized, this.sources) && normalized.length > 0) {
      this.sources = normalized;
      for (const s of normalized) {
        const rt = this.runtimes.get(s.id);
        if (rt) rt.source = s;
      }
      this.refreshGizmos();
      return;
    }

    if (this.sources.length > 0 && normalized.length > 0) {
      const removedIds = [...prevIds].filter(id => !nextIds.has(id));
      const added = normalized.filter(s => !prevIds.has(s.id));
      if (removedIds.length > 0 || added.length > 0) {
        for (const id of removedIds) {
          this.runtimes.delete(id);
          this.removeParticlesForEmitter(id);
        }
        this.sources = normalized;
        for (const s of added) {
          this.runtimes.set(s.id, {
            source: s,
            emitTimer: 0,
            elapsedTime: 0,
            burstsTriggered: new Set()
          });
        }
        for (const s of normalized) {
          const rt = this.runtimes.get(s.id);
          if (rt) rt.source = s;
        }
        this.refreshGizmos();
        return;
      }
    }

    this.sources = normalized;
    this.resetSimulation();
    this.play();
    this.refreshGizmos();
  }

  private syncAnimatedTransforms() {
    if (!this.animateRoot) return;
    const animated = this.buildSourcesFromTree(this.previewClock);
    if (animated.length !== this.sources.length) return;
    for (let i = 0; i < animated.length; i++) {
      const next = animated[i];
      if (next.id !== this.sources[i]?.id) return;
      this.sources[i] = next;
      const rt = this.runtimes.get(next.id);
      if (rt) rt.source = next;
    }
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
    this.previewClock = 0;
    this.resetSimulation();
    this.play();
  }

  protected resetSimulation() {
    for (const p of this.taggedParticles) {
      disposeTaggedParticle(p);
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

    this.previewClock += dt;
    this.syncAnimatedTransforms();

    const dtCapped = Math.min(dt, 0.1);
    let globalPastDuration = true;

    for (const runtime of this.runtimes.values()) {
      const cfg = runtime.source.config;
      const simDt = scaleSimulationDelta(dtCapped, cfg.mainModule.simulationSpeed ?? 1);
      runtime.elapsedTime += simDt;
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
          runtime.emitTimer += simDt;
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
      const simDt = scaleSimulationDelta(dtCapped, cfg.mainModule.simulationSpeed ?? 1);
      p.elapsed += simDt;
      p.life = p.elapsed / p.maxLife;
      if (p.life >= 1) {
        disposeTaggedParticle(p);
        this.taggedParticles.splice(i, 1);
        continue;
      }

      const runtime = this.runtimes.get(p.emitterId);
      const transform = runtime?.source.transform ?? p.transform;
      p.transform = transform;

      p.position.x += p.velocity.x * simDt;
      p.position.y += p.velocity.y * simDt;
      p.position.z += p.velocity.z * simDt;
      if (p.simulationSpace === 'local') {
        this.applyLocalForces(p, cfg, transform, simDt);
      } else {
        this.applyForces(p as unknown as Parameters<ParticlePreview['applyForces']>[0], cfg, simDt);
      }

      const worldPos = p.simulationSpace === 'local'
        ? applyTransformToPoint(transform, p.position)
        : p.position;
      p.visual.object.position.copy(worldPos);
      const rgba = applyTintToRgba(
        composeParticleColor(
          p.startColorSample,
          cfg.colorOverLifetime.color,
          p.life,
          cfg.colorOverLifetime.enabled
        ),
        p.materialTint
      );
      p.visual.material.color.setRGB(rgba[0], rgba[1], rgba[2]);
      p.visual.material.opacity = rgba[3];
      if (p.ownedTexture && usesTextureSheet(cfg.textureAnimation)) {
        updateParticleTextureSheet(
          p.ownedTexture,
          cfg.textureAnimation,
          p.life,
          p.sheetContext ?? undefined
        );
      }
      const scale3D = computeParticleScale3D(
        cfg,
        p.startSize3D,
        p.life,
        particleScaleContext(p.transform, p.emitterLocalTransform)
      );
      if (cfg.rendererModule.renderMode === 'mesh' && p.visual.kind === 'mesh') {
        setParticleVisualSize3D(p.visual, scale3D);
        const particleQuat = computeMeshParticleQuaternion(
          cfg,
          p.startRotation3D,
          p.angularVelocity3D,
          p.elapsed,
          p.life
        );
        applyMeshParticleOrientation(p.visual, particleQuat, {
          alignSpace: cfg.rendererModule.alignSpace,
          simulationSpace: p.simulationSpace,
          emitterTransform: p.transform,
          emitterLocalTransform: p.emitterLocalTransform
        });
      } else {
        applyTaggedParticleScale(p, cfg);
        if (cfg.rotationOverLifetime.enabled) {
          applyParticleVisualRotation(
            p.visual,
            sampleCurveConfig(cfg.rotationOverLifetime.rotation, p.life)
          );
        }
      }
    }

    while (this.taggedParticles.length > this.maxTotalParticles) {
      const p = this.taggedParticles.shift()!;
      disposeTaggedParticle(p);
    }
  }

  private resolveTextureAssetId(source: Pick<EmitterPreviewSource, 'mainTextureAssetId' | 'materialAssetId'>): string | undefined {
    if (!this.assetContext) return source.mainTextureAssetId;
    const { getAsset, getAllAssets } = this.assetContext;
    return resolvePreviewTextureAssetId(
      source.mainTextureAssetId,
      source.materialAssetId,
      getAsset,
      getAllAssets?.()
    );
  }

  private preloadAssets(sources: EmitterPreviewSource[]) {
    if (!this.assetContext) return;
    const { getAsset, projectDir } = this.assetContext;
    for (const source of sources) {
      const assetId = this.resolveTextureAssetId(source);
      if (assetId) {
        const entry = getAsset(assetId);
        if (entry) loadParticleTexture(assetId, entry, projectDir).catch(() => { /* fallback */ });
      }
      if (source.meshAssetId) {
        const meshEntry = getAsset(source.meshAssetId);
        if (meshEntry) preloadMeshGeometry(meshEntry, projectDir);
      }
    }
  }

  private getMeshGeometry(meshAssetId?: string): THREE.BufferGeometry | null {
    if (!meshAssetId) return null;
    return getCachedMeshGeometry(meshAssetId);
  }

  private applyLocalForces(p: TaggedParticle, cfg: Particle3DConfig, transform: Transform3D, dt: number) {
    const worldGravity = new THREE.Vector3(0, -cfg.mainModule.gravityModifier * 9.8, 0);
    const localGravity = applyInverseTransformToDirection(transform, worldGravity);
    p.velocity.add(localGravity.multiplyScalar(dt));
    if (cfg.noiseModule.enabled) {
      const ns = cfg.noiseModule.strength * 0.01;
      p.velocity.x += (Math.random() - 0.5) * ns;
      p.velocity.y += (Math.random() - 0.5) * ns;
      p.velocity.z += (Math.random() - 0.5) * ns;
    }
  }

  private preloadTextures(sources: EmitterPreviewSource[]) {
    this.preloadAssets(sources);
  }

  private getParticleTexture(source: EmitterPreviewSource): THREE.Texture {
    const assetId = this.assetContext
      ? this.resolveTextureAssetId(source)
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
    const simulationSpace = cfg.mainModule.simulationSpace;

    const speed = this.getValueFromRange(cfg.mainModule.startSpeed);
    const { position: localPos, velocity: localVel } = sampleEmitMotion(cfg, speed);
    let pos: THREE.Vector3;
    let vel: THREE.Vector3;
    if (simulationSpace === 'local') {
      pos = localPos.clone();
      vel = localVel.clone();
    } else {
      pos = applyTransformToPoint(transform, localPos);
      vel = applyTransformToDirection(transform, localVel);
    }

    const lifetime = this.getValueFromRange(cfg.mainModule.startLifetime);
    const startSize = sampleStartParticleSize(cfg);
    const startSize3D = sampleStartParticleSize3D(cfg);
    const startRotation3D = sampleStartRotation3D(cfg);
    const angularVelocity3D = sampleAngularVelocity3D(cfg);
    const localTransform = source.localTransform ?? {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
    const scaleCtx = particleScaleContext(transform, localTransform);
    const initialScale3D = computeParticleScale3D(cfg, startSize3D, 0, scaleCtx);
    const initialUniform = cfg.mainModule.useStartSize3D
      ? Math.max(...initialScale3D)
      : Math.max(initialScale3D[0], initialScale3D[1]);
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
    const visual = createParticleVisual({
      texture: mapTexture,
      blending,
      color: new THREE.Color(initialRgba[0], initialRgba[1], initialRgba[2]),
      opacity: initialRgba[3],
      renderMode: cfg.rendererModule.renderMode,
      size: cfg.rendererModule.renderMode === 'mesh' ? Math.max(...initialScale3D) : initialUniform,
      meshGeometry: this.getMeshGeometry(source.meshAssetId)
    });
    if (cfg.rendererModule.renderMode === 'mesh' && visual.kind === 'mesh') {
      setParticleVisualSize3D(visual, initialScale3D);
      const particleQuat = computeMeshParticleQuaternion(
        cfg,
        startRotation3D,
        angularVelocity3D,
        0,
        0
      );
      applyMeshParticleOrientation(visual, particleQuat, {
        alignSpace: cfg.rendererModule.alignSpace,
        simulationSpace,
        emitterTransform: transform,
        emitterLocalTransform: localTransform
      });
    } else if (visual.kind === 'mesh') {
      setParticleVisualSize3D(visual, initialScale3D);
    } else {
      setParticleVisualSize(visual, initialUniform);
    }
    const worldPos = simulationSpace === 'local'
      ? applyTransformToPoint(transform, pos)
      : pos;
    visual.object.position.copy(worldPos);
    this.scene.add(visual.object);

    this.taggedParticles.push({
      emitterId: source.id,
      config: cfg,
      transform,
      simulationSpace,
      position: pos.clone(),
      velocity: vel,
      startColorSample: startSample,
      materialTint: tint,
      startSize,
      startSize3D,
      startRotation3D,
      angularVelocity3D,
      emitterLocalTransform: localTransform,
      life: 0,
      maxLife: lifetime,
      elapsed: 0,
      visual,
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
