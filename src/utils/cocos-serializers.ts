import type {
  Particle3DConfig,
  RangeValue,
  GradientConfig,
  CurveConfig,
  BurstConfig,
  ShapeType,
  EmitFrom,
  RenderMode
} from '@/types/effect';
import type { EffectGroupNode, EffectNode, ParticleEmitterNode } from '@/types/project';
import { isEmitterNode } from '@/types/project';
import { transformToCocosLocal } from '@/utils/transform-utils';

/** Cocos Creator 3.8.6 builtin particle effect UUID (from real project export). */
export const BUILTIN_PARTICLE_EFFECT_UUID = 'd1346436-ac96-4271-b863-1f4fdead95b0';

export const SHAPE_TYPE: Record<ShapeType, number> = {
  box: 0, circle: 1, cone: 2, sphere: 3, hemisphere: 4
};

export const EMIT_FROM: Record<EmitFrom, number> = {
  base: 0, edge: 1, shell: 2, volume: 3
};

export const RENDER_MODE: Record<RenderMode, number> = {
  billboard: 0,
  stretchedBillboard: 1,
  horizontalBillboard: 2,
  verticalBillboard: 3,
  mesh: 4
};

export const ALIGN_SPACE: Record<import('@/types/effect').AlignmentSpace, number> = {
  world: 0,
  local: 1,
  view: 2
};

export const SHAPE_TYPE_REV = Object.fromEntries(
  Object.entries(SHAPE_TYPE).map(([k, v]) => [v, k])
) as Record<number, ShapeType>;

export const EMIT_FROM_REV = Object.fromEntries(
  Object.entries(EMIT_FROM).map(([k, v]) => [v, k])
) as Record<number, EmitFrom>;

export const RENDER_MODE_REV = Object.fromEntries(
  Object.entries(RENDER_MODE).map(([k, v]) => [v, k])
) as Record<number, RenderMode>;

export const ALIGN_SPACE_REV = Object.fromEntries(
  Object.entries(ALIGN_SPACE).map(([k, v]) => [v, k])
) as Record<number, import('@/types/effect').AlignmentSpace>;

const DEG2RAD = Math.PI / 180;

function coneLengthFromAngle(radius: number, angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  return angleRad > 0.001 ? radius / Math.tan(angleRad) : radius * 2;
}

export function toCocosColor(r: number, g: number, b: number, a: number) {
  return {
    __type__: 'cc.Color',
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: Math.round(a * 255)
  };
}

function buildRealCurve(curve: CurveConfig): Record<string, unknown> {
  const keys = curve.keys.length >= 2 ? curve.keys : [{ time: 0, value: 1 }, { time: 1, value: 0 }];
  return {
    __type__: 'cc.RealCurve',
    _times: keys.map(k => k.time),
    _values: keys.map(k => ({
      __type__: 'cc.RealKeyframeValue',
      interpolationMode: 2,
      tangentWeightMode: 0,
      value: k.value,
      leftTangent: k.inTangent ?? 0,
      rightTangent: k.outTangent ?? 0,
      rightTangentWeight: 0,
      leftTangentWeight: 0,
      easingMethod: 0
    })),
    preExtrapolation: 2,
    postExtrapolation: 1
  };
}

export interface BuildParticleMaterialOptions {
  spriteFrameUuid?: string;
  techIdx?: number;
  name?: string;
  tintColor?: { r: number; g: number; b: number; a: number };
  effectUuid?: string;
  blend?: 'additive' | 'alpha';
}

/** Build a single cc.Material JSON object (NOT an array). */
export function buildParticleMaterial(
  spriteFrameUuidOrOptions?: string | BuildParticleMaterialOptions,
  techIdxArg = 1
): Record<string, unknown> {
  const opts: BuildParticleMaterialOptions =
    typeof spriteFrameUuidOrOptions === 'object' && spriteFrameUuidOrOptions !== null
      ? spriteFrameUuidOrOptions
      : {
          spriteFrameUuid: spriteFrameUuidOrOptions,
          techIdx: techIdxArg
        };
  const techIdx = opts.techIdx === 0 ? 0 : 1;
  const tint = opts.tintColor ?? { r: 255, g: 255, b: 255, a: 255 };
  const props: Record<string, unknown> = {
    tintColor: {
      __type__: 'cc.Color',
      r: tint.r,
      g: tint.g,
      b: tint.b,
      a: tint.a
    }
  };
  if (opts.spriteFrameUuid) {
    props.mainTexture = { __uuid__: opts.spriteFrameUuid };
  }
  const blend = opts.blend ?? (techIdx === 0 ? 'alpha' : 'additive');
  return {
    __type__: 'cc.Material',
    _name: opts.name ?? '',
    _objFlags: 0,
    _native: '',
    _effectAsset: { __uuid__: opts.effectUuid ?? BUILTIN_PARTICLE_EFFECT_UUID },
    _techIdx: techIdx,
    _defines: [{}],
    _states: [{
      rasterizerState: {},
      depthStencilState: {},
      blendState: { targets: [{}] }
    }],
    _props: [props],
    _fxStudioMeta: { blend }
  };
}

export function buildMaterialMeta(uuid: string) {
  return {
    ver: '1.0.21',
    importer: 'material',
    imported: true,
    uuid,
    files: ['.json'],
    subMetas: {},
    userData: {}
  };
}

export function buildPrefabMeta(uuid: string, name: string) {
  return {
    ver: '1.1.50',
    importer: 'prefab',
    imported: true,
    uuid,
    files: ['.json'],
    subMetas: {},
    userData: { syncNodeName: name }
  };
}

export interface EmitterExportBinding {
  materialUuid: string;
  spriteFrameUuid?: string;
}

/** Reference-based prefab serializer matching Cocos Creator 3.8 format. */
export class CocosPrefabBuilder {
  private pool: Record<string, unknown>[] = [];
  private prefabRootIdx = -1;

  private push(obj: Record<string, unknown>): number {
    this.pool.push(obj);
    return this.pool.length - 1;
  }

  private ref(index: number) {
    return { __id__: index };
  }

  private addConstantCurve(value: RangeValue | number): number {
    if (typeof value === 'number') {
      return this.push({ __type__: 'cc.CurveRange', mode: 0, constant: value, multiplier: 1 });
    }
    if (value.mode === 'constant') {
      return this.push({ __type__: 'cc.CurveRange', mode: 0, constant: value.constant ?? 0, multiplier: 1 });
    }
    return this.push({
      __type__: 'cc.CurveRange',
      mode: 3,
      constantMin: value.min ?? 0,
      constantMax: value.max ?? 1,
      multiplier: 1
    });
  }

  private addAnimCurve(curve: CurveConfig): number {
    const splineIdx = this.push(buildRealCurve(curve));
    return this.push({
      __type__: 'cc.CurveRange',
      mode: 1,
      multiplier: curve.multiplier ?? 1,
      spline: this.ref(splineIdx)
    });
  }

  private addGradient(gradient: GradientConfig): number {
    const keys = gradient.keys.length >= 1
      ? gradient.keys
      : [{ time: 0, color: [1, 1, 1, 1] as [number, number, number, number] }];
    if (keys.length === 1) {
      const c = keys[0].color;
      return this.push({
        __type__: 'cc.GradientRange',
        _mode: 0,
        color: toCocosColor(c[0], c[1], c[2], c[3])
      });
    }
    // Always use Gradient mode (1) for 2+ keys — matches Cocos export & avoids TwoColors random bias
    const gradIdx = this.push({
      __type__: 'cc.Gradient',
      colorKeys: keys.map(k => ({
        __type__: 'cc.ColorKey',
        time: k.time,
        color: toCocosColor(k.color[0], k.color[1], k.color[2], k.color[3])
      })),
      alphaKeys: keys.map(k => ({
        __type__: 'cc.AlphaKey',
        alpha: Math.round(k.color[3] * 255),
        time: k.time
      })),
      mode: 0
    });
    return this.push({ __type__: 'cc.GradientRange', _mode: 1, gradient: this.ref(gradIdx) });
  }

  /** Trail module in Cocos 3.8 typically uses TwoColors (mode 2) for simple fade trails. */
  private addTrailColorRange(gradient: GradientConfig): number {
    const keys = gradient.keys.length >= 1
      ? gradient.keys
      : [{ time: 0, color: [1, 1, 1, 1] as [number, number, number, number] }];
    if (keys.length === 1) {
      const c = keys[0].color;
      return this.push({
        __type__: 'cc.GradientRange',
        _mode: 0,
        color: toCocosColor(c[0], c[1], c[2], c[3])
      });
    }
    if (keys.length === 2) {
      const c0 = keys[0].color;
      const c1 = keys[1].color;
      return this.push({
        __type__: 'cc.GradientRange',
        _mode: 2,
        colorMin: toCocosColor(c0[0], c0[1], c0[2], c0[3]),
        colorMax: toCocosColor(c1[0], c1[1], c1[2], c1[3])
      });
    }
    return this.addGradient(gradient);
  }

  private addBurst(burst: BurstConfig): number {
    const countIdx = this.addConstantCurve({ mode: 'constant', constant: burst.count });
    return this.push({
      __type__: 'cc.Burst',
      _time: burst.time,
      _repeatCount: burst.cycles ?? 1,
      repeatInterval: burst.interval ?? 1,
      count: this.ref(countIdx)
    });
  }

  /** Build a multi-emitter prefab from an effect node tree. */
  buildFromTree(
    root: EffectGroupNode,
    prefabName: string,
    resolveEmitter: (emitter: ParticleEmitterNode) => EmitterExportBinding
  ): string {
    this.pool = [{}];
    this.prefabRootIdx = -1;
    const rootNodeIdx = this.buildNodeRecursive(root, null, resolveEmitter);
    this.pool[0] = {
      __type__: 'cc.Prefab',
      _name: prefabName,
      _objFlags: 0,
      _native: '',
      data: this.ref(rootNodeIdx),
      optimizationPolicy: 0,
      asyncLoadAssets: false,
      persistent: false
    };
    return JSON.stringify(this.pool, null, 2);
  }

  private buildNodeRecursive(
    node: EffectNode,
    parentIdx: number | null,
    resolveEmitter: (emitter: ParticleEmitterNode) => EmitterExportBinding
  ): number {
    const local = transformToCocosLocal(node.transform);
    const nodeIdx = this.push({
      __type__: 'cc.Node',
      _name: node.name,
      _objFlags: 0,
      _parent: parentIdx !== null ? this.ref(parentIdx) : null,
      _children: [],
      _active: node.enabled,
      _components: [],
      _lpos: local._lpos,
      _lrot: local._lrot,
      _lscale: local._lscale,
      _layer: 1073741824,
      _euler: local._euler,
      _id: ''
    });

    if (parentIdx === null) this.prefabRootIdx = nodeIdx;
    if (parentIdx !== null) {
      (this.pool[parentIdx] as { _children: Array<{ __id__: number }> })._children.push(this.ref(nodeIdx));
    }

    if (isEmitterNode(node)) {
      const binding = resolveEmitter(node);
      const psIdx = this.appendParticleSystem(
        nodeIdx, node.config, binding.materialUuid, binding.spriteFrameUuid
      );
      (this.pool[nodeIdx] as { _components: Array<{ __id__: number }> })._components = [this.ref(psIdx)];
    } else {
      for (const child of node.children) {
        this.buildNodeRecursive(child, nodeIdx, resolveEmitter);
      }
    }

    const nodePrefabIdx = this.push({
      __type__: 'cc.PrefabInfo',
      root: this.ref(this.prefabRootIdx),
      asset: this.ref(0),
      fileId: generateFileId(),
      targetOverrides: null
    });
    (this.pool[nodeIdx] as { _prefab: { __id__: number } })._prefab = this.ref(nodePrefabIdx);
    return nodeIdx;
  }

  build(config: Particle3DConfig, name: string, materialUuid: string, spriteFrameUuid?: string): string {
    this.pool = [];
    this.pool.push({});
    this.pool.push({});
    this.prefabRootIdx = 1;

    const psComponentIdx = this.appendParticleSystem(1, config, materialUuid, spriteFrameUuid);

    const nodePrefabIdx = this.push({
      __type__: 'cc.PrefabInfo',
      root: this.ref(1),
      asset: this.ref(0),
      fileId: generateFileId()
    });

    const local = transformToCocosLocal({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    });

    this.pool[1] = {
      __type__: 'cc.Node',
      _name: name,
      _objFlags: 0,
      _parent: null,
      _children: [],
      _active: true,
      _components: [this.ref(psComponentIdx)],
      _prefab: this.ref(nodePrefabIdx),
      _lpos: local._lpos,
      _lrot: local._lrot,
      _lscale: local._lscale,
      _layer: 1073741824,
      _euler: local._euler,
      _id: ''
    };

    this.pool[0] = {
      __type__: 'cc.Prefab',
      _name: name,
      _objFlags: 0,
      _native: '',
      data: this.ref(1),
      optimizationPolicy: 0,
      asyncLoadAssets: false,
      persistent: false
    };

    return JSON.stringify(this.pool, null, 2);
  }

  private appendParticleSystem(
    nodeIdx: number,
    config: Particle3DConfig,
    materialUuid: string,
    spriteFrameUuid?: string
  ): number {
    const main = config.mainModule;
    const shape = config.shapeModule;

    const startColorIdx = this.addGradient(main.startColor);
    const startSizeXIdx = this.addConstantCurve(main.startSize3D.x);
    const startSizeYIdx = this.addConstantCurve(main.startSize3D.y);
    const startSizeZIdx = this.addConstantCurve(main.startSize3D.z);
    const startSpeedIdx = this.addConstantCurve(main.startSpeed);
    const startRotXIdx = this.addConstantCurve(main.startRotation3D.x);
    const startRotYIdx = this.addConstantCurve(main.startRotation3D.y);
    const startRotZIdx = this.addConstantCurve(main.startRotation3D.z);
    const startDelayIdx = this.addConstantCurve(main.startDelay);
    const startLifetimeIdx = this.addConstantCurve(main.startLifetime);
    const gravityIdx = this.addConstantCurve(main.gravityModifier);
    const rateTimeIdx = this.addConstantCurve(main.rateOverTime);
    const rateDistIdx = this.addConstantCurve(main.rateOverDistance);

    const burstIndices = main.bursts.map(b => this.addBurst(b));

    const colorOLColorIdx = this.addGradient(config.colorOverLifetime.color);
    const colorOLIdx = this.push({
      __type__: 'cc.ColorOvertimeModule',
      _enable: config.colorOverLifetime.enabled,
      color: this.ref(colorOLColorIdx)
    });

    const arcSpeedIdx = this.addConstantCurve(shape.arcSpeed);
    const shapeIdx = this.push({
      __type__: 'cc.ShapeModule',
      _enable: shape.enabled,
      _shapeType: SHAPE_TYPE[shape.shapeType] ?? 2,
      shapeType: SHAPE_TYPE[shape.shapeType] ?? 2,
      emitFrom: EMIT_FROM[shape.emitFrom] ?? 3,
      alignToDirection: shape.alignToDirection,
      randomDirectionAmount: shape.randomDirectionAmount,
      sphericalDirectionAmount: shape.sphericalDirectionAmount,
      randomPositionAmount: shape.randomPositionAmount,
      radius: shape.radius,
      radiusThickness: shape.radiusThickness,
      arcMode: shape.arcMode,
      arcSpread: shape.arcSpread,
      arcSpeed: this.ref(arcSpeedIdx),
      length: shape.length > 0 ? shape.length : coneLengthFromAngle(shape.radius, shape.angle),
      boxThickness: {
        __type__: 'cc.Vec3',
        x: shape.boxThickness[0],
        y: shape.boxThickness[1],
        z: shape.boxThickness[2]
      },
      _position: {
        __type__: 'cc.Vec3',
        x: shape.position[0],
        y: shape.position[1],
        z: shape.position[2]
      },
      _rotation: {
        __type__: 'cc.Vec3',
        x: shape.rotation[0],
        y: shape.rotation[1],
        z: shape.rotation[2]
      },
      _scale: {
        __type__: 'cc.Vec3',
        x: shape.scale[0],
        y: shape.scale[1],
        z: shape.scale[2]
      },
      _arc: (shape.arc ?? 360) * DEG2RAD,
      _angle: (shape.angle ?? 25) * DEG2RAD
    });

    const sizeCurveIdx = config.sizeOverLifetime.enabled
      ? this.addAnimCurve(config.sizeOverLifetime.size)
      : this.addConstantCurve(1);
    const sizeXIdx = this.addConstantCurve(0);
    const sizeYIdx = this.addConstantCurve(0);
    const sizeZIdx = this.addConstantCurve(0);
    const sizeOLIdx = this.push({
      __type__: 'cc.SizeOvertimeModule',
      _enable: config.sizeOverLifetime.enabled,
      separateAxes: false,
      size: this.ref(sizeCurveIdx),
      x: this.ref(sizeXIdx),
      y: this.ref(sizeYIdx),
      z: this.ref(sizeZIdx)
    });

    const velXIdx = config.velocityOverLifetime.enabled
      ? this.addAnimCurve(config.velocityOverLifetime.velocityX)
      : this.addConstantCurve(0);
    const velYIdx = config.velocityOverLifetime.enabled
      ? this.addAnimCurve(config.velocityOverLifetime.velocityY)
      : this.addConstantCurve(0);
    const velZIdx = config.velocityOverLifetime.enabled
      ? this.addAnimCurve(config.velocityOverLifetime.velocityZ)
      : this.addConstantCurve(0);
    const velSpeedModIdx = this.addConstantCurve(1);
    const velOLIdx = this.push({
      __type__: 'cc.VelocityOvertimeModule',
      _enable: config.velocityOverLifetime.enabled,
      x: this.ref(velXIdx),
      y: this.ref(velYIdx),
      z: this.ref(velZIdx),
      speedModifier: this.ref(velSpeedModIdx),
      space: 1
    });

    const forceXIdx = this.addConstantCurve(0);
    const forceYIdx = this.addConstantCurve(0);
    const forceZIdx = this.addConstantCurve(0);
    const forceOLIdx = this.push({
      __type__: 'cc.ForceOvertimeModule',
      _enable: false,
      x: this.ref(forceXIdx),
      y: this.ref(forceYIdx),
      z: this.ref(forceZIdx),
      space: 1
    });

    const limitXIdx = this.addConstantCurve(0);
    const limitYIdx = this.addConstantCurve(0);
    const limitZIdx = this.addConstantCurve(0);
    const limitIdx = this.addConstantCurve(0);
    const limitVelIdx = this.push({
      __type__: 'cc.LimitVelocityOvertimeModule',
      _enable: false,
      limitX: this.ref(limitXIdx),
      limitY: this.ref(limitYIdx),
      limitZ: this.ref(limitZIdx),
      limit: this.ref(limitIdx),
      dampen: 3,
      separateAxes: false,
      space: 1
    });

    const rotXIdx = this.addConstantCurve(0);
    const rotYIdx = this.addConstantCurve(0);
    const rotZIdx = config.rotationOverLifetime.enabled
      ? this.addAnimCurve(config.rotationOverLifetime.rotation)
      : this.addConstantCurve(0);
    const rotOLIdx = this.push({
      __type__: 'cc.RotationOvertimeModule',
      _enable: config.rotationOverLifetime.enabled,
      _separateAxes: false,
      x: this.ref(rotXIdx),
      y: this.ref(rotYIdx),
      z: this.ref(rotZIdx)
    });

    const texFrameIdx = config.textureAnimation.enabled
      ? this.addAnimCurve(config.textureAnimation.frameOverTime)
      : this.addConstantCurve(0);
    const texStartIdx = this.addConstantCurve(config.textureAnimation.startFrame);
    const texAnimIdx = this.push({
      __type__: 'cc.TextureAnimationModule',
      _enable: config.textureAnimation.enabled,
      _numTilesX: config.textureAnimation.numTilesX,
      numTilesX: config.textureAnimation.numTilesX,
      _numTilesY: config.textureAnimation.numTilesY,
      numTilesY: config.textureAnimation.numTilesY,
      _mode: config.textureAnimation.animation,
      animation: config.textureAnimation.animation,
      frameOverTime: this.ref(texFrameIdx),
      startFrame: this.ref(texStartIdx),
      cycleCount: config.textureAnimation.cycleCount,
      _flipU: config.textureAnimation.flipU ? 1 : 0,
      _flipV: config.textureAnimation.flipV ? 1 : 0,
      _uvChannelMask: -1,
      randomRow: config.textureAnimation.randomRow,
      rowIndex: config.textureAnimation.rowIndex
    });

    const trailLifeIdx = this.addConstantCurve(config.trailModule.lifetime);
    const trailWidthIdx = this.addConstantCurve(0);
    const trailColorTrailIdx = this.addTrailColorRange(config.trailModule.colorOverTrail);
    const trailColorOTIdx = this.addTrailColorRange(config.trailModule.colorOverTrail);

    const renderer = config.rendererModule;
    const textureRef = spriteFrameUuid ? { __uuid__: spriteFrameUuid } : null;
    const rendererObj: Record<string, unknown> = {
      __type__: 'cc.ParticleSystemRenderer',
      _renderMode: RENDER_MODE[renderer.renderMode] ?? 0,
      _velocityScale: renderer.velocityScale ?? 1,
      _lengthScale: renderer.lengthScale ?? 1,
      _mesh: null,
      _mainTexture: textureRef,
      _useGPU: false
    };
    const rendererIdx = this.push(rendererObj);

    const compPrefabIdx = this.push({
      __type__: 'cc.CompPrefabInfo',
      fileId: generateFileId()
    });

    const psComponentIdx = this.push({
      __type__: 'cc.ParticleSystem',
      _name: '',
      _objFlags: 0,
      node: this.ref(nodeIdx),
      _enabled: true,
      __prefab: this.ref(compPrefabIdx),
      _materials: [{ __uuid__: materialUuid }],
      _visFlags: 0,
      startColor: this.ref(startColorIdx),
      scaleSpace: 0,
      startSize3D: false,
      startSizeX: this.ref(startSizeXIdx),
      startSize: this.ref(startSizeXIdx),
      startSizeY: this.ref(startSizeYIdx),
      startSizeZ: this.ref(startSizeZIdx),
      startSpeed: this.ref(startSpeedIdx),
      startRotation3D: false,
      startRotationX: this.ref(startRotXIdx),
      startRotationY: this.ref(startRotYIdx),
      startRotationZ: this.ref(startRotZIdx),
      startRotation: this.ref(startRotZIdx),
      startDelay: this.ref(startDelayIdx),
      startLifetime: this.ref(startLifetimeIdx),
      duration: main.duration,
      loop: main.loop,
      simulationSpeed: main.simulationSpeed,
      playOnAwake: main.playOnAwake,
      gravityModifier: this.ref(gravityIdx),
      rateOverTime: this.ref(rateTimeIdx),
      rateOverDistance: this.ref(rateDistIdx),
      bursts: burstIndices.map(i => this.ref(i)),
      _colorOverLifetimeModule: this.ref(colorOLIdx),
      _shapeModule: this.ref(shapeIdx),
      _sizeOvertimeModule: this.ref(sizeOLIdx),
      _velocityOvertimeModule: this.ref(velOLIdx),
      _forceOvertimeModule: this.ref(forceOLIdx),
      _limitVelocityOvertimeModule: this.ref(limitVelIdx),
      _rotationOvertimeModule: this.ref(rotOLIdx),
      _textureAnimationModule: this.ref(texAnimIdx),
      renderer: this.ref(rendererIdx),
      enableCulling: false,
      _prewarm: false,
      _capacity: main.capacity,
      _simulationSpace: 0,
      _id: ''
    });

    const trailIdx = this.push({
      __type__: 'cc.TrailModule',
      _enable: config.trailModule.enabled,
      mode: config.trailModule.mode,
      lifeTime: this.ref(trailLifeIdx),
      _minParticleDistance: 0.1,
      existWithParticles: true,
      textureMode: 0,
      widthFromParticle: true,
      widthRatio: this.ref(trailWidthIdx),
      colorFromParticle: false,
      colorOverTrail: this.ref(trailColorTrailIdx),
      colorOvertime: this.ref(trailColorOTIdx),
      _space: 0,
      _particleSystem: this.ref(psComponentIdx)
    });

    (this.pool[psComponentIdx] as Record<string, unknown>)._trailModule = this.ref(trailIdx);

    return psComponentIdx;
  }
}

function generateFileId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let id = '';
  for (let i = 0; i < 22; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ---- Import helpers (unchanged API) ----

function normalizeCurveRangeInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  if (r.spline && typeof r.spline === 'object') {
    return { ...r, spline: r.spline };
  }
  if ((raw as { __type__?: string }).__type__ === 'cc.RealCurve') {
    return { spline: raw };
  }
  return raw;
}

export function parseCurveRange(raw: unknown): RangeValue {
  const input = normalizeCurveRangeInput(raw);
  if (!input || typeof input !== 'object') return { mode: 'constant', constant: 0 };
  const r = input as Record<string, unknown>;
  const mode = r.mode as number;
  if (mode === 3 || r.constantMin !== undefined) {
    return { mode: 'randomBetween', min: r.constantMin as number ?? 0, max: r.constantMax as number ?? 1 };
  }
  if (mode === 1 && r.spline) {
    const spline = r.spline as { _values?: Array<{ value?: number } | number> };
    const first = spline._values?.[0];
    const v = typeof first === 'object' && first ? (first as { value?: number }).value ?? 0 : (first as number) ?? 0;
    return { mode: 'constant', constant: v };
  }
  return { mode: 'constant', constant: (r.constant as number) ?? 0 };
}

/** Resolve Cocos prefab `{ __id__ }` refs before parsing CurveRange. */
export function parseCurveRangeFromPool(pool: unknown[], raw: unknown): RangeValue {
  const resolved = resolvePrefabRef(pool, raw);
  if (resolved && typeof resolved === 'object') {
    const r = resolved as Record<string, unknown>;
    if (r.spline) {
      return parseCurveRange({ ...r, spline: resolvePrefabRef(pool, r.spline) });
    }
  }
  return parseCurveRange(resolved);
}

export function resolvePrefabRef(pool: unknown[], raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  if (typeof r.__id__ === 'number' && pool[r.__id__]) return pool[r.__id__];
  return raw;
}

function lerpAlphaKeys(alphaKeys: Array<{ time: number; alpha: number }>, time: number): number {
  if (alphaKeys.length === 0) return 1;
  const sorted = [...alphaKeys].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].alpha / 255;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].alpha / 255;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time;
      const u = span > 0 ? (time - a.time) / span : 0;
      return (a.alpha + (b.alpha - a.alpha) * u) / 255;
    }
  }
  return sorted[sorted.length - 1].alpha / 255;
}

function parseCocosGradientObject(g: Record<string, unknown>): GradientConfig {
  const colorKeys = g.colorKeys as Array<{ time: number; color: { r: number; g: number; b: number; a: number } }> | undefined;
  const alphaKeys = g.alphaKeys as Array<{ time: number; alpha: number }> | undefined;
  if (!colorKeys?.length) return { keys: [{ time: 0, color: [1, 1, 1, 1] }] };
  return {
    keys: colorKeys.map(k => {
      const t = k.time ?? 0;
      const alpha = alphaKeys?.length
        ? lerpAlphaKeys(alphaKeys, t)
        : (k.color.a ?? 255) / 255;
      return {
        time: t,
        color: [k.color.r / 255, k.color.g / 255, k.color.b / 255, alpha] as [number, number, number, number]
      };
    })
  };
}

export function parseGradientFromPrefab(pool: unknown[], raw: unknown): GradientConfig {
  let obj = resolvePrefabRef(pool, raw);
  if (obj && typeof obj === 'object') {
    const gr = obj as Record<string, unknown>;
    if (gr.__type__ === 'cc.GradientRange') {
      if (gr._mode === 1 && gr.gradient) obj = resolvePrefabRef(pool, gr.gradient);
      else return parseGradient(gr);
    }
    if ((obj as Record<string, unknown>).__type__ === 'cc.Gradient') {
      return parseCocosGradientObject(obj as Record<string, unknown>);
    }
  }
  return parseGradient(obj);
}

export function parseGradient(raw: unknown): GradientConfig {
  if (!raw || typeof raw !== 'object') {
    return { keys: [{ time: 0, color: [1, 1, 1, 1] }, { time: 1, color: [1, 1, 1, 0] }] };
  }
  const r = raw as Record<string, unknown>;
  if (r.colorMin && r.colorMax) {
    const c0 = r.colorMin as { r: number; g: number; b: number; a: number };
    const c1 = r.colorMax as { r: number; g: number; b: number; a: number };
    return {
      keys: [
        { time: 0, color: [c0.r / 255, c0.g / 255, c0.b / 255, c0.a / 255] },
        { time: 1, color: [c1.r / 255, c1.g / 255, c1.b / 255, c1.a / 255] }
      ]
    };
  }
  if (r.gradient) {
    const g = r.gradient as { colorKeys?: Array<{ time: number; color: { r: number; g: number; b: number; a: number } }> };
    if (g.colorKeys?.length) {
      return {
        keys: g.colorKeys.map(k => ({
          time: k.time ?? 0,
          color: [k.color.r / 255, k.color.g / 255, k.color.b / 255, k.color.a / 255] as [number, number, number, number]
        }))
      };
    }
  }
  if (r.color) {
    const c = r.color as { r: number; g: number; b: number; a: number };
    return { keys: [{ time: 0, color: [c.r / 255, c.g / 255, c.b / 255, c.a / 255] }] };
  }
  if ((r as { colorKeys?: unknown[] }).colorKeys) {
    return parseCocosGradientObject(r);
  }
  return { keys: [{ time: 0, color: [1, 1, 1, 1] }] };
}

export function parseCurve(raw: unknown): CurveConfig {
  const input = normalizeCurveRangeInput(raw);
  if (!input || typeof input !== 'object') {
    return { keys: [{ time: 0, value: 1 }, { time: 1, value: 0 }], multiplier: 1 };
  }
  const r = input as Record<string, unknown>;
  if (r.spline) {
    const s = r.spline as { _times?: number[]; _values?: Array<{ value?: number }> };
    const times = s._times ?? [0, 1];
    const values = s._values ?? [{ value: 1 }, { value: 0 }];
    return {
      keys: times.map((t, i) => ({
        time: t,
        value: typeof values[i] === 'object' && values[i]
          ? (values[i] as { value?: number }).value ?? 0
          : (values[i] as number) ?? 0
      })),
      multiplier: (r.multiplier as number) ?? 1
    };
  }
  if (r.curve) {
    const c = r.curve as Array<{ time: number; value: number }>;
    return { keys: c.map(k => ({ time: k.time, value: k.value })), multiplier: (r.multiplier as number) ?? 1 };
  }
  return { keys: [{ time: 0, value: (r.constant as number) ?? 1 }, { time: 1, value: 0 }], multiplier: 1 };
}

/** Resolve Cocos prefab `{ __id__ }` refs before parsing animation curves. */
export function parseCurveFromPool(pool: unknown[], raw: unknown): CurveConfig {
  const resolved = resolvePrefabRef(pool, raw);
  if (resolved && typeof resolved === 'object') {
    const r = resolved as Record<string, unknown>;
    if (r.spline) {
      return parseCurve({ ...r, spline: resolvePrefabRef(pool, r.spline) });
    }
    if ((resolved as { __type__?: string }).__type__ === 'cc.RealCurve') {
      return parseCurve(resolved);
    }
  }
  return parseCurve(resolved);
}

export function parseBursts(raw: unknown): BurstConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: Record<string, unknown>) => {
    const countRaw = b.count;
    let count = 50;
    if (typeof countRaw === 'number') count = countRaw;
    else if (countRaw && typeof countRaw === 'object') {
      count = (countRaw as { constant?: number }).constant ?? 50;
    }
    return {
      time: (b._time ?? b.time ?? 0) as number,
      count,
      cycles: (b._repeatCount ?? b.cycles ?? 1) as number,
      interval: (b.repeatInterval ?? b.interval ?? 1) as number
    };
  });
}

export function parseShapeType(raw: unknown): ShapeType {
  if (typeof raw === 'number') return SHAPE_TYPE_REV[raw] ?? 'cone';
  if (typeof raw === 'string' && raw in SHAPE_TYPE) return raw as ShapeType;
  return 'cone';
}

export function parseEmitFrom(raw: unknown): EmitFrom {
  if (typeof raw === 'number') return EMIT_FROM_REV[raw] ?? 'volume';
  if (typeof raw === 'string' && raw in EMIT_FROM) return raw as EmitFrom;
  return 'volume';
}

export function parseRenderMode(raw: unknown): RenderMode {
  if (typeof raw === 'number') return RENDER_MODE_REV[raw] ?? 'billboard';
  if (typeof raw === 'string' && raw in RENDER_MODE) return raw as RenderMode;
  return 'billboard';
}

export function parseAlignSpace(raw: unknown): import('@/types/effect').AlignmentSpace {
  if (typeof raw === 'number') return ALIGN_SPACE_REV[raw] ?? 'view';
  if (raw === 'view' || raw === 'world' || raw === 'local') return raw;
  return 'view';
}
