import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import type { EffectGroupNode, EffectNode, EffectProject, ParticleEmitterNode } from '@/types/project';
import { FX_PROJECT_VERSION } from '@/types/project';
import { generateUUID } from './effect-defaults';
import {
  parseCurveRangeFromPool, parseGradientFromPrefab, parseCurveFromPool, parseBursts,
  parseShapeType, parseEmitFrom, parseRenderMode, parseAlignSpace,
  resolvePrefabRef
} from './cocos-serializers';
import { cocosLocalToTransform, identityTransform } from './transform-utils';
import {
  createBuiltinAssetRegistry,
  DEFAULT_TEXTURE_ASSET_ID,
  DEFAULT_MATERIAL_ASSET_ID
} from './project-factory';
import { ImportAssetCollector, extractParticleAssetUuids } from './import-asset-resolver';
import { normalizeShapeModule, readShapeVec3 } from './particle-shape';
import type { ShapeModuleConfig } from '@/types/effect';

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

function resolveModule(pool: unknown[], raw: unknown): Record<string, unknown> | undefined {
  const resolved = resolvePrefabRef(pool, raw);
  if (resolved && typeof resolved === 'object') return resolved as Record<string, unknown>;
  return undefined;
}

function readShape(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._shapeModule ?? ps._N$shapeModule ?? ps.shapeModule);
}

function readColorOL(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._colorOverLifetimeModule ?? ps._N$colorOverLifetimeModule ?? ps.colorOverLifetimeModule);
}

function readSizeOL(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._sizeOvertimeModule ?? ps._N$sizeOverLifetimeModule ?? ps.sizeOvertimeModule);
}

function readRotationOL(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._rotationOvertimeModule ?? ps._N$rotationOverLifetimeModule ?? ps.rotationOvertimeModule);
}

function readVelocityOL(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._velocityOvertimeModule ?? ps._N$velocityOverLifetimeModule ?? ps.velocityOvertimeModule);
}

function readNoise(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._noiseModule ?? ps._N$noiseModule ?? ps.noiseModule);
}

function readTrail(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._trailModule ?? ps._N$trailModule ?? ps.trailModule);
}

function readTexAnim(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps._textureAnimationModule ?? ps._N$textureAnimationModule ?? ps.textureAnimationModule);
}

function readRenderer(pool: unknown[], ps: RawPrefabData) {
  return resolveModule(pool, ps.renderer ?? ps._N$renderer);
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
  const shape = readShape(prefabArray, psData);
  const colorOL = readColorOL(prefabArray, psData);
  const sizeOL = readSizeOL(prefabArray, psData);
  const rotationOL = readRotationOL(prefabArray, psData);
  const velocityOL = readVelocityOL(prefabArray, psData);
  const noise = readNoise(prefabArray, psData);
  const trail = readTrail(prefabArray, psData);
  const texAnim = readTexAnim(prefabArray, psData);
  const renderer = readRenderer(prefabArray, psData);
  const curve = (raw: unknown) => parseCurveRangeFromPool(prefabArray, raw);

  return {
    mainModule: {
      duration: (main.duration as number) ?? 5,
      capacity: (main._capacity ?? main.capacity ?? 100) as number,
      loop: (main.loop as boolean) ?? true,
      playOnAwake: (main.playOnAwake as boolean) ?? true,
      simulationSpeed: (main.simulationSpeed as number) ?? 1,
      startDelay: curve(main.startDelay).constant ?? 0,
      startLifetime: curve(main.startLifetime),
      startSpeed: curve(main.startSpeed),
      startSize3D: {
        x: curve((main.startSize3D as { x?: unknown })?.x ?? main.startSizeX ?? main.startSize),
        y: curve((main.startSize3D as { y?: unknown })?.y ?? main.startSizeY),
        z: curve((main.startSize3D as { z?: unknown })?.z ?? main.startSizeZ)
      },
      startRotation3D: {
        x: curve(main.startRotationX),
        y: curve(main.startRotationY),
        z: curve(main.startRotationZ ?? main.startRotation)
      },
      startColor: parseGradientFromPrefab(prefabArray, main.startColor),
      gravityModifier: curve(main.gravityModifier).constant ?? 0,
      rateOverTime: curve(main.rateOverTime).constant ?? 0,
      rateOverDistance: curve(main.rateOverDistance).constant ?? 0,
      bursts: parseBursts(main.bursts)
    },
    shapeModule: normalizeShapeModule({
      enabled: (shape?._enable ?? shape?.enable ?? true) as boolean,
      shapeType: parseShapeType(shape?._shapeType ?? shape?.shapeType),
      emitFrom: parseEmitFrom(shape?.emitFrom),
      radius: (shape?.radius as number) ?? 1,
      radiusThickness: (shape?.radiusThickness as number) ?? 1,
      angle: shape?._angle != null ? (shape._angle as number) * (180 / Math.PI) : (shape?.angle as number) ?? 25,
      length: (shape?.length as number) ?? 0,
      arc: shape?._arc != null ? (shape._arc as number) * (180 / Math.PI) : (shape?.arc as number) ?? 360,
      arcMode: ((shape?.arcMode as number) ?? 0) as ShapeModuleConfig['arcMode'],
      arcSpread: (shape?.arcSpread as number) ?? 0,
      arcSpeed: curve(shape?.arcSpeed),
      alignToDirection: Boolean(shape?.alignToDirection ?? false),
      randomDirectionAmount: (shape?.randomDirectionAmount as number) ?? 0,
      sphericalDirectionAmount: (shape?.sphericalDirectionAmount as number) ?? 0,
      randomPositionAmount: (shape?.randomPositionAmount as number) ?? 0,
      boxThickness: readShapeVec3(shape?.boxThickness, [0, 0, 0]),
      position: readShapeVec3(shape?._position ?? shape?.position, [0, 0, 0]),
      rotation: readShapeVec3(shape?._rotation ?? shape?.rotation, [0, 0, 0]),
      scale: readShapeVec3(shape?._scale ?? shape?.scale, [1, 1, 1])
    }),
    colorOverLifetime: {
      enabled: (colorOL?._enable ?? colorOL?.enable ?? false) as boolean,
      color: parseGradientFromPrefab(prefabArray, colorOL?.color)
    },
    sizeOverLifetime: {
      enabled: (sizeOL?._enable ?? sizeOL?.enable ?? false) as boolean,
      size: parseCurveFromPool(prefabArray, sizeOL?.size)
    },
    rotationOverLifetime: {
      enabled: (rotationOL?._enable ?? rotationOL?.enable ?? false) as boolean,
      rotation: parseCurveFromPool(prefabArray, rotationOL?.z ?? rotationOL?.rotation)
    },
    velocityOverLifetime: {
      enabled: (velocityOL?._enable ?? velocityOL?.enable ?? false) as boolean,
      velocityX: parseCurveFromPool(prefabArray, velocityOL?.x ?? velocityOL?.velocityX),
      velocityY: parseCurveFromPool(prefabArray, velocityOL?.y ?? velocityOL?.velocityY),
      velocityZ: parseCurveFromPool(prefabArray, velocityOL?.z ?? velocityOL?.velocityZ)
    },
    noiseModule: {
      enabled: (noise?._enable ?? noise?.enable ?? false) as boolean,
      strength: curve(noise?.strength).constant ?? 10,
      frequency: (noise?.frequency as number) ?? 1,
      scrollSpeed: (noise?.scrollSpeed as number) ?? 1,
      octaves: (noise?.octaves as number) ?? 1
    },
    trailModule: {
      enabled: (trail?._enable ?? trail?.enable ?? false) as boolean,
      mode: (trail?.mode as number) ?? 0,
      ratio: curve(trail?.ratio).constant ?? 1,
      lifetime: curve(trail?.lifetime),
      colorOverTrail: parseGradientFromPrefab(prefabArray, trail?.colorOverTrail)
    },
    textureAnimation: {
      enabled: (texAnim?._enable ?? texAnim?.enable ?? false) as boolean,
      numTilesX: Number(texAnim?.numTilesX ?? texAnim?._numTilesX ?? 1),
      numTilesY: Number(texAnim?.numTilesY ?? texAnim?._numTilesY ?? 1),
      animation: Number(texAnim?.animation ?? texAnim?._mode ?? 0),
      frameOverTime: parseCurveFromPool(prefabArray, texAnim?.frameOverTime),
      startFrame: curve(texAnim?.startFrame),
      cycleCount: Number(texAnim?.cycleCount ?? 1),
      flipU: Boolean(Number(texAnim?._flipU ?? texAnim?.flipU ?? 0)),
      flipV: Boolean(Number(texAnim?._flipV ?? texAnim?.flipV ?? 0)),
      randomRow: Boolean(texAnim?.randomRow ?? false),
      rowIndex: Number(texAnim?.rowIndex ?? 0)
    },
    rendererModule: {
      renderMode: parseRenderMode(renderer?._renderMode ?? renderer?.renderMode),
      velocityScale: (renderer?._velocityScale as number) ?? 1,
      lengthScale: (renderer?._lengthScale as number) ?? 1,
      alignSpace: parseAlignSpace(renderer?._alignSpace ?? renderer?.alignSpace)
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

function parseNodeTree(pool: unknown[], nodeIdx: number, assets: ImportAssetCollector): EffectNode {
  const node = pool[nodeIdx] as Record<string, unknown>;
  if (!node || node.__type__ !== 'cc.Node') {
    throw new Error('无效的节点结构');
  }

  const transform = cocosLocalToTransform(node);
  const name = (node._name as string) || 'Node';
  const enabled = node._active !== false;
  const ps = findParticleSystemOnNode(pool, node);

  if (ps) {
    const { materialUuid, spriteFrameUuid } = extractParticleAssetUuids(pool, ps);
    const mainTexture = assets.resolveTextureRef(spriteFrameUuid) ?? DEFAULT_TEXTURE_ASSET_ID;
    const material = assets.resolveMaterialRef(materialUuid) ?? DEFAULT_MATERIAL_ASSET_ID;
    const emitter: ParticleEmitterNode = {
      type: 'emitter',
      id: generateUUID(),
      name,
      enabled,
      transform,
      config: parseParticleSystemConfig(pool, ps),
      assetRefs: { mainTexture, material }
    };
    return emitter;
  }

  const children: EffectNode[] = [];
  const childRefs = node._children as Array<{ __id__?: number }> | undefined;
  if (childRefs) {
    for (const childRef of childRefs) {
      const childIdx = (childRef as { __id__?: number }).__id__;
      if (typeof childIdx === 'number') {
        children.push(parseNodeTree(pool, childIdx, assets));
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

  const assetCollector = new ImportAssetCollector();
  const parsedRoot = parseNodeTree(prefabArray, rootIdx, assetCollector);
  const name = projectName ?? prefab?._name ?? '导入特效';
  const now = new Date().toISOString();
  const importedAssets = assetCollector.getImportedAssets();

  const project: EffectProject = {
    version: FX_PROJECT_VERSION,
    id: generateUUID(),
    name,
    settings: { targetEngine: 'cocos-creator-3.8' },
    assetRegistry: [...createBuiltinAssetRegistry(), ...importedAssets],
    root: normalizeProjectRoot(parsedRoot),
    metadata: {
      createdAt: now,
      updatedAt: now,
      description: `从 ${name}.prefab 导入`
    }
  };

  return { project, unsupportedModules: [], warnings: importedAssets.length > 0 ? [`已导入 ${importedAssets.length} 个外部资产引用`] : [] };
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
