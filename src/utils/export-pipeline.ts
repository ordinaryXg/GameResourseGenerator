import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import { generateUUID } from './effect-defaults';

// ============================================================
// .prefab + .meta 导出管线
// ============================================================

interface PrefabNode {
  __type__: string;
  _name: string;
  _objFlags: number;
  [key: string]: any;
}

function buildParticleSystemComponent(config: Particle3DConfig, effectName: string): any {
  const comp: any = {
    __type__: 'cc.ParticleSystem',
    _objFlags: 0,
    node: { __id__: 1 },
    _enabled: true,
    _N$mainModule: {
      duration: config.mainModule.duration,
      capacity: config.mainModule.capacity,
      loop: config.mainModule.loop,
      playOnAwake: config.mainModule.playOnAwake,
      simulationSpeed: config.mainModule.simulationSpeed,
      startDelay: config.mainModule.startDelay,
      startLifetime: convertRangeValue(config.mainModule.startLifetime),
      startSpeed: convertRangeValue(config.mainModule.startSpeed),
      startSize3D: convertVector3Range(config.mainModule.startSize3D),
      startRotation3D: convertVector3Range(config.mainModule.startRotation3D),
      startColor: convertGradient(config.mainModule.startColor),
      gravityModifier: config.mainModule.gravityModifier,
      rateOverTime: config.mainModule.rateOverTime,
      rateOverDistance: config.mainModule.rateOverDistance,
      bursts: config.mainModule.bursts.map(b => ({
        time: b.time,
        count: b.count,
        cycles: b.cycles ?? 1,
        interval: b.interval ?? 0
      }))
    }
  };

  if (config.shapeModule.enabled) {
    comp._N$shapeModule = {
      enable: true,
      shapeType: config.shapeModule.shapeType,
      radius: config.shapeModule.radius,
      angle: config.shapeModule.angle,
      arc: config.shapeModule.arc,
      emitFrom: config.shapeModule.emitFrom
    };
  }

  if (config.colorOverLifetime.enabled) {
    comp._N$colorOverLifetimeModule = {
      enable: true,
      color: convertGradient(config.colorOverLifetime.color)
    };
  }

  if (config.sizeOverLifetime.enabled) {
    comp._N$sizeOverLifetimeModule = {
      enable: true,
      size: convertCurve(config.sizeOverLifetime.size)
    };
  }

  if (config.rotationOverLifetime.enabled) {
    comp._N$rotationOverLifetimeModule = {
      enable: true,
      rotation: convertCurve(config.rotationOverLifetime.rotation)
    };
  }

  if (config.velocityOverLifetime.enabled) {
    comp._N$velocityOverLifetimeModule = {
      enable: true,
      x: convertCurve(config.velocityOverLifetime.velocityX),
      y: convertCurve(config.velocityOverLifetime.velocityY),
      z: convertCurve(config.velocityOverLifetime.velocityZ)
    };
  }

  if (config.noiseModule.enabled) {
    comp._N$noiseModule = {
      enable: true,
      strength: config.noiseModule.strength,
      frequency: config.noiseModule.frequency,
      scrollSpeed: config.noiseModule.scrollSpeed,
      octaves: config.noiseModule.octaves
    };
  }

  if (config.trailModule.enabled) {
    comp._N$trailModule = {
      enable: true,
      mode: config.trailModule.mode,
      ratio: config.trailModule.ratio,
      lifetime: convertRangeValue(config.trailModule.lifetime),
      colorOverTrail: convertGradient(config.trailModule.colorOverTrail)
    };
  }

  comp._N$renderer = {
    renderMode: config.rendererModule.renderMode
  };

  return comp;
}

function convertRangeValue(rv: any): any {
  if (rv.mode === 'constant') {
    return { mode: 0, constant: rv.constant };
  }
  return { mode: 1, constantMin: rv.min, constantMax: rv.max };
}

function convertVector3Range(v3r: any): any {
  return {
    x: convertRangeValue(v3r.x),
    y: convertRangeValue(v3r.y),
    z: convertRangeValue(v3r.z)
  };
}

function convertGradient(g: any): any {
  return {
    alphaKeys: [],
    colorKeys: g.keys.map((k: any) => ({
      color: { r: Math.round(k.color[0] * 255), g: Math.round(k.color[1] * 255), b: Math.round(k.color[2] * 255), a: Math.round(k.color[3] * 255) },
      time: k.time
    })),
    colorMode: 0
  };
}

function convertCurve(c: any): any {
  return {
    curve: c.keys.map((k: any) => ({
      time: k.time,
      value: k.value,
      inTangent: k.inTangent ?? 0,
      outTangent: k.outTangent ?? 0,
      tangentMode: 0
    })),
    multiplier: c.multiplier ?? 1
  };
}

export function generatePrefab(effectConfig: EffectConfig): { prefabContent: string; metaContent: string } {
  const config = effectConfig.config as Particle3DConfig;
  const name = effectConfig.name;
  const uuid = effectConfig.id;
  const fileId = generateUUID();

  const node: PrefabNode = {
    __type__: 'cc.Node',
    _name: name,
    _objFlags: 0,
    _parent: null,
    _children: [],
    _components: [{ __id__: 2 }],
    _prefab: { __id__: 3 },
    _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
    _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
    _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 }
  };

  const particleSystem = buildParticleSystemComponent(config, name);

  const prefabInfo = {
    __type__: 'cc.PrefabInfo',
    root: { __id__: 1 },
    asset: { __id__: 0 },
    fileId: fileId,
    targetOverrides: null
  };

  const compPrefabInfo = {
    __type__: 'cc.CompPrefabInfo',
    fileId: generateUUID()
  };

  const prefab: PrefabNode = {
    __type__: 'cc.Prefab',
    _name: name,
    _objFlags: 0,
    _native: '',
    data: { __id__: 1 }
  };

  const prefabContent = JSON.stringify([prefab, node, particleSystem, prefabInfo, compPrefabInfo], null, 2);

  const metaContent = JSON.stringify({
    ver: '1.1.0',
    uuid: uuid,
    importer: 'prefab',
    imported: true,
    files: [`${name}.prefab`],
    subMetas: {},
    userData: {}
  }, null, 2);

  return { prefabContent, metaContent };
}

export async function exportToCocosProject(
  effectConfig: EffectConfig,
  projectPath: string
): Promise<{ success: boolean; paths: string[]; error?: string }> {
  const { prefabContent, metaContent } = generatePrefab(effectConfig);
  const uuid = effectConfig.id;
  const name = effectConfig.name;
  const targetDir = `${projectPath}/assets/effects/${uuid}`;
  const prefabPath = `${targetDir}/${name}.prefab`;
  const metaPath = `${targetDir}/${name}.prefab.meta`;

  try {
    // Use IPC to write files
    if (window.electronAPI) {
      const results = await window.electronAPI.writeExportFiles([
        { path: prefabPath, content: prefabContent },
        { path: metaPath, content: metaContent }
      ]);

      const paths: string[] = [];
      let hasError = false;
      let errorMsg = '';

      for (const r of results) {
        if (r.success) {
          paths.push(r.path);
        } else {
          hasError = true;
          errorMsg = r.error || 'Unknown error';
        }
      }

      return { success: !hasError, paths, error: hasError ? errorMsg : undefined };
    }

    // Fallback: download files
    downloadFile(`${name}.prefab`, prefabContent);
    downloadFile(`${name}.prefab.meta`, metaContent);
    return { success: true, paths: [`${name}.prefab`, `${name}.prefab.meta`] };
  } catch (err: any) {
    return { success: false, paths: [], error: err.message };
  }
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
