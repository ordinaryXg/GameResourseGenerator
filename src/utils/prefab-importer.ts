import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import { generateUUID } from './effect-defaults';
import {
  parseCurveRange, parseGradientFromPrefab, parseCurve, parseBursts,
  parseShapeType, parseEmitFrom, parseRenderMode, parseAlignSpace
} from './cocos-serializers';

export interface ImportResult {
  effectConfig: EffectConfig;
  unsupportedModules: string[];
  warnings: string[];
}

interface RawPrefabData {
  __type__: string;
  _name?: string;
  _N$mainModule?: Record<string, unknown>;
  _N$shapeModule?: Record<string, unknown>;
  _N$colorOverLifetimeModule?: Record<string, unknown>;
  _N$sizeOverLifetimeModule?: Record<string, unknown>;
  _N$rotationOverLifetimeModule?: Record<string, unknown>;
  _N$velocityOverLifetimeModule?: Record<string, unknown>;
  _N$noiseModule?: Record<string, unknown>;
  _N$trailModule?: Record<string, unknown>;
  _N$textureAnimationModule?: Record<string, unknown>;
  _N$renderer?: Record<string, unknown>;
  _shapeModule?: Record<string, unknown>;
  _colorOverLifetimeModule?: Record<string, unknown>;
  _sizeOvertimeModule?: Record<string, unknown>;
  _rotationOvertimeModule?: Record<string, unknown>;
  _velocityOvertimeModule?: Record<string, unknown>;
  _noiseModule?: Record<string, unknown>;
  _trailModule?: Record<string, unknown>;
  _textureAnimationModule?: Record<string, unknown>;
  renderer?: Record<string, unknown>;
  [key: string]: unknown;
}

function readMainModule(ps: RawPrefabData): Record<string, unknown> {
  if (ps._N$mainModule) return ps._N$mainModule;
  return ps as Record<string, unknown>;
}

function readShape(ps: RawPrefabData) {
  return ps._shapeModule ?? ps._N$shapeModule;
}

function readColorOL(ps: RawPrefabData) {
  return ps._colorOverLifetimeModule ?? ps._N$colorOverLifetimeModule;
}

function readSizeOL(ps: RawPrefabData) {
  return ps._sizeOvertimeModule ?? ps._N$sizeOverLifetimeModule;
}

function readRotationOL(ps: RawPrefabData) {
  return ps._rotationOvertimeModule ?? ps._N$rotationOverLifetimeModule;
}

function readVelocityOL(ps: RawPrefabData) {
  return ps._velocityOvertimeModule ?? ps._N$velocityOverLifetimeModule;
}

function readNoise(ps: RawPrefabData) {
  return ps._noiseModule ?? ps._N$noiseModule;
}

function readTrail(ps: RawPrefabData) {
  return ps._trailModule ?? ps._N$trailModule;
}

function readTexAnim(ps: RawPrefabData) {
  return ps._textureAnimationModule ?? ps._N$textureAnimationModule;
}

function readRenderer(ps: RawPrefabData) {
  return ps.renderer ?? ps._N$renderer;
}

export function parsePrefab(jsonString: string): ImportResult {
  let prefabArray: unknown[];
  try {
    prefabArray = JSON.parse(jsonString);
  } catch {
    throw new Error('文件格式无效，无法解析');
  }

  if (!Array.isArray(prefabArray) || prefabArray.length < 2) {
    throw new Error('无效的 .prefab 文件格式');
  }

  let psData: RawPrefabData | null = null;
  let nodeData: { _name?: string } | null = null;

  for (const item of prefabArray) {
    if ((item as RawPrefabData)?.__type__ === 'cc.ParticleSystem') psData = item as RawPrefabData;
    if ((item as RawPrefabData)?.__type__ === 'cc.Node') nodeData = item as { _name?: string };
  }

  if (!psData) throw new Error('该预制体不包含粒子系统组件（cc.ParticleSystem）');

  const name = nodeData?._name || psData._name || '导入特效';
  const main = readMainModule(psData);
  const shape = readShape(psData);
  const colorOL = readColorOL(psData);
  const sizeOL = readSizeOL(psData);
  const rotationOL = readRotationOL(psData);
  const velocityOL = readVelocityOL(psData);
  const noise = readNoise(psData);
  const trail = readTrail(psData);
  const texAnim = readTexAnim(psData);
  const renderer = readRenderer(psData);

  const config: Particle3DConfig = {
    mainModule: {
      duration: (main.duration as number) ?? 5,
      capacity: (main._capacity ?? main.capacity ?? 100) as number,
      loop: (main.loop as boolean) ?? true,
      playOnAwake: (main.playOnAwake as boolean) ?? true,
      simulationSpeed: (main.simulationSpeed as number) ?? 1,
      startDelay: parseCurveRange(main.startDelay).constant ?? 0,
      startLifetime: parseCurveRange(main.startLifetime),
      startSpeed: parseCurveRange(main.startSpeed),
      startSize3D: {
        x: parseCurveRange((main.startSize3D as { x?: unknown })?.x ?? main.startSizeX),
        y: parseCurveRange((main.startSize3D as { y?: unknown })?.y ?? main.startSizeY),
        z: parseCurveRange((main.startSize3D as { z?: unknown })?.z ?? main.startSizeZ)
      },
      startRotation3D: {
        x: parseCurveRange(main.startRotationX),
        y: parseCurveRange(main.startRotationY),
        z: parseCurveRange(main.startRotationZ)
      },
      startColor: parseGradientFromPrefab(prefabArray, main.startColor),
      gravityModifier: parseCurveRange(main.gravityModifier).constant ?? 0,
      rateOverTime: parseCurveRange(main.rateOverTime).constant ?? 0,
      rateOverDistance: parseCurveRange(main.rateOverDistance).constant ?? 0,
      bursts: parseBursts(main.bursts)
    },
    shapeModule: {
      enabled: (shape?._enable ?? shape?.enable ?? true) as boolean,
      shapeType: parseShapeType(shape?._shapeType ?? shape?.shapeType),
      radius: (shape?.radius as number) ?? 1,
      angle: shape?._angle != null ? (shape._angle as number) * (180 / Math.PI) : (shape?.angle as number) ?? 25,
      arc: shape?._arc != null ? (shape._arc as number) * (180 / Math.PI) : (shape?.arc as number) ?? 360,
      emitFrom: parseEmitFrom(shape?.emitFrom)
    },
    colorOverLifetime: {
      enabled: (colorOL?._enable ?? colorOL?.enable ?? false) as boolean,
      color: parseGradientFromPrefab(prefabArray, colorOL?.color)
    },
    sizeOverLifetime: {
      enabled: (sizeOL?._enable ?? sizeOL?.enable ?? false) as boolean,
      size: parseCurve(sizeOL?.size)
    },
    rotationOverLifetime: {
      enabled: (rotationOL?._enable ?? rotationOL?.enable ?? false) as boolean,
      rotation: parseCurve(rotationOL?.z ?? rotationOL?.rotation)
    },
    velocityOverLifetime: {
      enabled: (velocityOL?._enable ?? velocityOL?.enable ?? false) as boolean,
      velocityX: parseCurve(velocityOL?.x ?? velocityOL?.velocityX),
      velocityY: parseCurve(velocityOL?.y ?? velocityOL?.velocityY),
      velocityZ: parseCurve(velocityOL?.z ?? velocityOL?.velocityZ)
    },
    noiseModule: {
      enabled: (noise?._enable ?? noise?.enable ?? false) as boolean,
      strength: parseCurveRange(noise?.strength).constant ?? 10,
      frequency: (noise?.frequency as number) ?? 1,
      scrollSpeed: (noise?.scrollSpeed as number) ?? 1,
      octaves: (noise?.octaves as number) ?? 1
    },
    trailModule: {
      enabled: (trail?._enable ?? trail?.enable ?? false) as boolean,
      mode: (trail?.mode as number) ?? 0,
      ratio: parseCurveRange(trail?.ratio).constant ?? 1,
      lifetime: parseCurveRange(trail?.lifetime),
      colorOverTrail: parseGradientFromPrefab(prefabArray, trail?.colorOverTrail)
    },
    textureAnimation: {
      enabled: (texAnim?._enable ?? texAnim?.enable ?? false) as boolean,
      numTilesX: (texAnim?.numTilesX as number) ?? 1,
      numTilesY: (texAnim?.numTilesY as number) ?? 1,
      animation: (texAnim?.animation as number) ?? 0,
      frameOverTime: parseCurve(texAnim?.frameOverTime)
    },
    rendererModule: {
      renderMode: parseRenderMode(renderer?._renderMode ?? renderer?.renderMode),
      velocityScale: (renderer?._velocityScale as number) ?? 1,
      lengthScale: (renderer?._lengthScale as number) ?? 1,
      alignSpace: parseAlignSpace(renderer?._alignSpace)
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

  return { effectConfig, unsupportedModules: [], warnings: [] };
}
