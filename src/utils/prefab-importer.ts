import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import type { EffectGroupNode, EffectNode, EffectProject, ParticleEmitterNode } from '@/types/project';
import { FX_PROJECT_VERSION } from '@/types/project';
import { generateUUID } from './effect-defaults';
import {
  parseCurveRange, parseGradientFromPrefab, parseCurve, parseBursts,
  parseShapeType, parseEmitFrom, parseRenderMode, parseAlignSpace,
  resolvePrefabRef
} from './cocos-serializers';
import { cocosLocalToTransform, identityTransform } from './transform-utils';
import {
  createBuiltinAssetRegistry,
  DEFAULT_TEXTURE_ASSET_ID,
  DEFAULT_MATERIAL_ASSET_ID
} from './project-factory';

export interface ImportResult {
  effectConfig: EffectConfig;
  unsupportedModules: string[];
  warnings: string[];
}

export interface ImportProjectResult {
  project: EffectProject;
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
  duration?: number;
  _capacity?: number;
  capacity?: number;
  loop?: boolean;
  playOnAwake?: boolean;
  simulationSpeed?: number;
  startDelay?: unknown;
  startLifetime?: unknown;
  startSpeed?: unknown;
  startSize3D?: Record<string, unknown>;
  startSizeX?: unknown;
  startSizeY?: unknown;
  startSizeZ?: unknown;
  startRotationX?: unknown;
  startRotationY?: unknown;
  startRotationZ?: unknown;
  startColor?: unknown;
  gravityModifier?: unknown;
  rateOverTime?: unknown;
  rateOverDistance?: unknown;
  bursts?: unknown;
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

function parsePool(jsonString: string): unknown[] {
  let prefabArray: unknown[];
  try {
    prefabArray = JSON.parse(jsonString);
  } catch {
    throw new Error('文件格式无效，无法解析');
  }
  if (!Array.isArray(prefabArray) || prefabArray.length < 2) {
    throw new Error('无效的 .prefab 文件格式');
  }
  return prefabArray;
}

export function parseParticleSystemConfig(
  prefabArray: unknown[],
  psData: RawPrefabData
): Particle3DConfig {
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

  return {
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
}

function findParticleSystemOnNode(
  pool: unknown[],
  node: Record<string, unknown>
): RawPrefabData | null {
  const components = node._components as Array<{ __id__?: number }> | undefined;
  if (!components) return null;
  for (const compRef of components) {
    const comp = resolvePrefabRef(pool, compRef) as RawPrefabData | null;
    if (comp?.__type__ === 'cc.ParticleSystem') return comp;
  }
  return null;
}

function parseNodeTree(pool: unknown[], nodeIdx: number): EffectNode {
  const node = pool[nodeIdx] as Record<string, unknown>;
  if (!node || node.__type__ !== 'cc.Node') {
    throw new Error('无效的节点结构');
  }

  const transform = cocosLocalToTransform(node);
  const name = (node._name as string) || 'Node';
  const enabled = node._active !== false;
  const ps = findParticleSystemOnNode(pool, node);

  if (ps) {
    const emitter: ParticleEmitterNode = {
      type: 'emitter',
      id: generateUUID(),
      name,
      enabled,
      transform,
      config: parseParticleSystemConfig(pool, ps),
      assetRefs: {
        mainTexture: DEFAULT_TEXTURE_ASSET_ID,
        material: DEFAULT_MATERIAL_ASSET_ID
      }
    };
    return emitter;
  }

  const children: EffectNode[] = [];
  const childRefs = node._children as Array<{ __id__?: number }> | undefined;
  if (childRefs) {
    for (const childRef of childRefs) {
      const childIdx = (childRef as { __id__?: number }).__id__;
      if (typeof childIdx === 'number') {
        children.push(parseNodeTree(pool, childIdx));
      }
    }
  }

  return {
    type: 'group',
    id: generateUUID(),
    name,
    enabled,
    transform,
    children
  };
}

function normalizeProjectRoot(rootNode: EffectNode): EffectGroupNode {
  if (rootNode.type === 'group') return rootNode;
  return {
    type: 'group',
    id: generateUUID(),
    name: 'Root',
    enabled: true,
    transform: identityTransform(),
    children: [rootNode]
  };
}

export function parsePrefabToProject(jsonString: string, projectName?: string): ImportProjectResult {
  const prefabArray = parsePool(jsonString);
  const prefab = prefabArray.find(
    item => (item as RawPrefabData)?.__type__ === 'cc.Prefab'
  ) as { _name?: string; data?: { __id__?: number } } | undefined;

  if (!prefab?.data || typeof prefab.data.__id__ !== 'number') {
    throw new Error('无效的 .prefab 文件格式');
  }

  const rootIdx = prefab.data.__id__;
  const hasParticleSystem = prefabArray.some(
    item => (item as RawPrefabData)?.__type__ === 'cc.ParticleSystem'
  );
  if (!hasParticleSystem) {
    throw new Error('该预制体不包含粒子系统组件（cc.ParticleSystem）');
  }

  const parsedRoot = parseNodeTree(prefabArray, rootIdx);
  const name = projectName ?? prefab?._name ?? '导入特效';
  const now = new Date().toISOString();

  const project: EffectProject = {
    version: FX_PROJECT_VERSION,
    id: generateUUID(),
    name,
    settings: { targetEngine: 'cocos-creator-3.8' },
    assetRegistry: createBuiltinAssetRegistry(),
    root: normalizeProjectRoot(parsedRoot),
    metadata: {
      createdAt: now,
      updatedAt: now,
      description: `从 ${name}.prefab 导入`
    }
  };

  return { project, unsupportedModules: [], warnings: [] };
}

export function parsePrefab(jsonString: string): ImportResult {
  const prefabArray = parsePool(jsonString);

  let psData: RawPrefabData | null = null;
  let nodeData: { _name?: string } | null = null;

  for (const item of prefabArray) {
    if ((item as RawPrefabData)?.__type__ === 'cc.ParticleSystem') psData = item as RawPrefabData;
    if ((item as RawPrefabData)?.__type__ === 'cc.Node') nodeData = item as { _name?: string };
  }

  if (!psData) throw new Error('该预制体不包含粒子系统组件（cc.ParticleSystem）');

  const name = nodeData?._name || psData._name || '导入特效';
  const config = parseParticleSystemConfig(prefabArray, psData);

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
