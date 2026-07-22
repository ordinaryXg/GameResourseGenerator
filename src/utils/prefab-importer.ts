import type { EffectConfig, Particle3DConfig, RangeValue, Vector3Range, GradientConfig, CurveConfig, BurstConfig } from '@/types/effect';
import { generateUUID } from './effect-defaults';

// ============================================================
// Cocos Creator 3.8 .prefab JSON → EffectConfig 解析��
// ============================================================

interface RawPrefabData {
  __type__: string;
  _name?: string;
  _objFlags?: number;
  _enabled?: boolean;
  node?: { __id__: number };
  _N$mainModule?: any;
  _N$shapeModule?: any;
  _N$colorOverLifetimeModule?: any;
  _N$sizeOverLifetimeModule?: any;
  _N$rotationOverLifetimeModule?: any;
  _N$velocityOverLifetimeModule?: any;
  _N$noiseModule?: any;
  _N$trailModule?: any;
  _N$textureAnimationModule?: any;
  _N$renderer?: any;
  [key: string]: any;
}

function parseRangeValue(raw: any): RangeValue {
  if (!raw) return { mode: 'constant', constant: 0 };
  if (raw.mode === 0 || raw.constant !== undefined) {
    return { mode: 'constant', constant: raw.constant ?? 0 };
  }
  return { mode: 'randomBetween', min: raw.constantMin ?? 0, max: raw.constantMax ?? 1 };
}

function parseVector3Range(raw: any): Vector3Range {
  return {
    x: parseRangeValue(raw?.x),
    y: parseRangeValue(raw?.y),
    z: parseRangeValue(raw?.z)
  };
}

function parseGradient(raw: any): GradientConfig {
  if (!raw?.colorKeys) return { keys: [{ time: 0, color: [1, 1, 1, 1] }, { time: 1, color: [1, 1, 1, 0] }] };
  return {
    keys: raw.colorKeys.map((k: any) => ({
      time: k.time ?? 0,
      color: [
        (k.color?.r ?? 255) / 255,
        (k.color?.g ?? 255) / 255,
        (k.color?.b ?? 255) / 255,
        (k.color?.a ?? 255) / 255
      ] as [number, number, number, number]
    }))
  };
}

function parseCurve(raw: any): CurveConfig {
  if (!raw?.curve) return { keys: [{ time: 0, value: 0 }, { time: 1, value: 1 }], multiplier: 1 };
  return {
    keys: raw.curve.map((k: any) => ({
      time: k.time ?? 0,
      value: k.value ?? 0,
      inTangent: k.inTangent,
      outTangent: k.outTangent
    })),
    multiplier: raw.multiplier ?? 1
  };
}

function parseBursts(raw: any[]): BurstConfig[] {
  if (!raw) return [];
  return raw.map((b: any) => ({
    time: b.time ?? 0,
    count: b.count ?? 0,
    cycles: b.cycles ?? 1,
    interval: b.interval ?? 0
  }));
}

export interface ImportResult {
  effectConfig: EffectConfig;
  unsupportedModules: string[];
  warnings: string[];
}

export function parsePrefab(jsonString: string): ImportResult {
  let prefabArray: any[];
  try {
    prefabArray = JSON.parse(jsonString);
  } catch {
    throw new Error('文件格式无效，无法解析');
  }

  if (!Array.isArray(prefabArray) || prefabArray.length < 2) {
    throw new Error('无效的 .prefab 文件格式');
  }

  // Find cc.ParticleSystem component
  let psData: RawPrefabData | null = null;
  let nodeData: any = null;
  const unsupportedModules: string[] = [];
  const warnings: string[] = [];

  for (const item of prefabArray) {
    if (item?.__type__ === 'cc.ParticleSystem') {
      psData = item;
    }
    if (item?.__type__ === 'cc.Node') {
      nodeData = item;
    }
  }

  if (!psData) {
    throw new Error('该预制体不包含粒子系统组件（cc.ParticleSystem）');
  }

  const name = nodeData?._name || psData._name || '导入特效';
  const main = psData._N$mainModule || {};

  // Check for unsupported modules
  const knownModules = [
    'colorOverLifetimeModule', 'sizeOverLifetimeModule', 'rotationOverLifetimeModule',
    'velocityOverLifetimeModule', 'noiseModule', 'trailModule', 'textureAnimationModule'
  ];

  const config: Particle3DConfig = {
    mainModule: {
      duration: main.duration ?? 5,
      capacity: main.capacity ?? 100,
      loop: main.loop ?? true,
      playOnAwake: main.playOnAwake ?? true,
      simulationSpeed: main.simulationSpeed ?? 1,
      startDelay: main.startDelay ?? 0,
      startLifetime: parseRangeValue(main.startLifetime),
      startSpeed: parseRangeValue(main.startSpeed),
      startSize3D: parseVector3Range(main.startSize3D),
      startRotation3D: parseVector3Range(main.startRotation3D),
      startColor: parseGradient(main.startColor),
      gravityModifier: main.gravityModifier ?? 0,
      rateOverTime: main.rateOverTime ?? 0,
      rateOverDistance: main.rateOverDistance ?? 0,
      bursts: parseBursts(main.bursts)
    },
    shapeModule: {
      enabled: psData._N$shapeModule?.enable ?? true,
      shapeType: psData._N$shapeModule?.shapeType ?? 'cone',
      radius: psData._N$shapeModule?.radius ?? 1,
      angle: psData._N$shapeModule?.angle ?? 25,
      arc: psData._N$shapeModule?.arc ?? 360,
      emitFrom: psData._N$shapeModule?.emitFrom ?? 'volume'
    },
    colorOverLifetime: {
      enabled: psData._N$colorOverLifetimeModule?.enable ?? false,
      color: parseGradient(psData._N$colorOverLifetimeModule?.color)
    },
    sizeOverLifetime: {
      enabled: psData._N$sizeOverLifetimeModule?.enable ?? false,
      size: parseCurve(psData._N$sizeOverLifetimeModule?.size)
    },
    rotationOverLifetime: {
      enabled: psData._N$rotationOverLifetimeModule?.enable ?? false,
      rotation: parseCurve(psData._N$rotationOverLifetimeModule?.rotation)
    },
    velocityOverLifetime: {
      enabled: psData._N$velocityOverLifetimeModule?.enable ?? false,
      velocityX: parseCurve(psData._N$velocityOverLifetimeModule?.x),
      velocityY: parseCurve(psData._N$velocityOverLifetimeModule?.y),
      velocityZ: parseCurve(psData._N$velocityOverLifetimeModule?.z)
    },
    noiseModule: {
      enabled: psData._N$noiseModule?.enable ?? false,
      strength: psData._N$noiseModule?.strength ?? 10,
      frequency: psData._N$noiseModule?.frequency ?? 1,
      scrollSpeed: psData._N$noiseModule?.scrollSpeed ?? 1,
      octaves: psData._N$noiseModule?.octaves ?? 1
    },
    trailModule: {
      enabled: psData._N$trailModule?.enable ?? false,
      mode: psData._N$trailModule?.mode ?? 0,
      ratio: psData._N$trailModule?.ratio ?? 1,
      lifetime: parseRangeValue(psData._N$trailModule?.lifetime),
      colorOverTrail: parseGradient(psData._N$trailModule?.colorOverTrail)
    },
    textureAnimation: {
      enabled: psData._N$textureAnimationModule?.enable ?? false,
      numTilesX: psData._N$textureAnimationModule?.numTilesX ?? 1,
      numTilesY: psData._N$textureAnimationModule?.numTilesY ?? 1,
      animation: psData._N$textureAnimationModule?.animation ?? 0,
      frameOverTime: parseCurve(psData._N$textureAnimationModule?.frameOverTime)
    },
    rendererModule: {
      renderMode: psData._N$renderer?.renderMode ?? 'billboard'
    }
  };

  const effectConfig: EffectConfig = {
    id: generateUUID(),
    name,
    type: 'particle3d',
    version: '1.0.0',
    targetEngineVersion: '3.8.x',
    source: 'imported',
    tags: [],
    metadata: {
      description: `从 ${name}.prefab 导入`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    config
  };

  return { effectConfig, unsupportedModules, warnings };
}
