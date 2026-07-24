import type { EffectConfig, EffectType, Particle3DConfig } from '@/types/effect';

let counter = 0;

export function generateId(): string {
  counter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}-${counter}`;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function defaultRange(constant: number) {
  return { mode: 'constant' as const, constant };
}

function defaultVector3(x: number, y: number, z: number) {
  return {
    x: defaultRange(x),
    y: defaultRange(y),
    z: defaultRange(z)
  };
}

function defaultGradient(...colorStops: [number, [number, number, number, number]][]) {
  return { keys: colorStops.map(([time, color]) => ({ time, color })) };
}

function defaultCurve(...points: [number, number][]) {
  return { keys: points.map(([time, value]) => ({ time, value })), multiplier: 1 };
}

export function getDefaultParticle3DConfig(): Particle3DConfig {
  return {
    mainModule: {
      duration: 5,
      capacity: 100,
      loop: true,
      playOnAwake: true,
      simulationSpeed: 1,
      simulationSpace: 'world',
      scaleSpace: 'local',
      useStartSize3D: false,
      startDelay: 0,
      startLifetime: defaultRange(2),
      startSpeed: defaultRange(5),
      startSize3D: defaultVector3(1, 1, 1),
      startRotation3D: defaultVector3(0, 0, 0),
      startColor: defaultGradient([0, [1, 1, 1, 1]]),
      gravityModifier: -0.5,
      rateOverTime: 20,
      rateOverDistance: 0,
      bursts: []
    },
    shapeModule: {
      enabled: true,
      shapeType: 'cone',
      emitFrom: 'volume',
      radius: 1,
      radiusThickness: 1,
      angle: 25,
      length: 0,
      arc: 360,
      arcMode: 0,
      arcSpread: 0,
      arcSpeed: defaultRange(1),
      alignToDirection: false,
      randomDirectionAmount: 0,
      sphericalDirectionAmount: 0,
      randomPositionAmount: 0,
      boxThickness: [0, 0, 0],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    colorOverLifetime: {
      enabled: true,
      color: defaultGradient(
        [0, [1, 0.5, 0.1, 1]],
        [1, [1, 0.1, 0.02, 0]]
      )
    },
    sizeOverLifetime: {
      enabled: false,
      size: defaultCurve([0, 1], [1, 0])
    },
    rotationOverLifetime: {
      enabled: false,
      rotation: defaultCurve([0, 0], [1, 360])
    },
    velocityOverLifetime: {
      enabled: false,
      velocityX: defaultCurve([0, 0], [1, 0]),
      velocityY: defaultCurve([0, 0], [1, 0]),
      velocityZ: defaultCurve([0, 0], [1, 0])
    },
    noiseModule: {
      enabled: false,
      strength: 10,
      frequency: 1,
      scrollSpeed: 1,
      octaves: 1
    },
    trailModule: {
      enabled: false,
      mode: 0,
      ratio: 1,
      lifetime: defaultRange(0.5),
      colorOverTrail: defaultGradient([0, [1, 1, 1, 1]], [1, [1, 1, 1, 0]])
    },
    textureAnimation: {
      enabled: false,
      numTilesX: 1,
      numTilesY: 1,
      animation: 0,
      frameOverTime: defaultCurve([0, 0], [1, 1]),
      startFrame: defaultRange(0),
      cycleCount: 1,
      flipU: false,
      flipV: false,
      randomRow: false,
      rowIndex: 0
    },
    rendererModule: {
      renderMode: 'billboard',
      velocityScale: 1,
      lengthScale: 1,
      alignSpace: 'view'
    }
  };
}

export function getDefaultEffectConfig(type: EffectType, name: string = '新建特效'): EffectConfig {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    name,
    type,
    version: '1.0.0',
    targetEngineVersion: '3.8.x',
    source: 'manual',
    tags: [],
    metadata: {
      createdAt: now,
      updatedAt: now
    },
    config: type === 'particle3d' ? getDefaultParticle3DConfig() : getDefaultParticle3DConfig()
  };
}
