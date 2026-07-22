import { describe, it, expect } from 'vitest';
import { parsePrefab } from '../src/utils/prefab-importer';

const validPrefab = JSON.stringify([
  { __type__: 'cc.Prefab', _name: 'Fire', _objFlags: 0, _native: '', data: { __id__: 1 } },
  { __type__: 'cc.Node', _name: 'Fire', _objFlags: 0, _parent: null, _children: [], _components: [{ __id__: 2 }], _prefab: { __id__: 3 }, _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 } },
  {
    __type__: 'cc.ParticleSystem', _objFlags: 0, node: { __id__: 1 }, _enabled: true,
    _N$mainModule: { duration: 3, capacity: 80, loop: true, playOnAwake: true, simulationSpeed: 1, startDelay: 0, startLifetime: { mode: 1, constantMin: 0.5, constantMax: 1.5 }, startSpeed: { mode: 1, constantMin: 3, constantMax: 8 }, startSize3D: { x: { mode: 1, constantMin: 0.5, constantMax: 1.5 }, y: { mode: 1, constantMin: 0.5, constantMax: 1.5 }, z: { mode: 1, constantMin: 0.5, constantMax: 1.5 } }, startColor: { colorKeys: [{ color: { r: 255, g: 255, b: 77, a: 255 }, time: 0 }, { color: { r: 255, g: 26, b: 5, a: 0 }, time: 1 }], colorMode: 0 }, gravityModifier: -0.3, rateOverTime: 30, rateOverDistance: 0, bursts: [] },
    _N$shapeModule: { enable: true, shapeType: 'cone', radius: 0.5, angle: 15, arc: 360, emitFrom: 'volume' },
    _N$colorOverLifetimeModule: { enable: true, color: { colorKeys: [{ color: { r: 255, g: 255, b: 77, a: 255 }, time: 0 }], colorMode: 0 } },
    _N$renderer: { renderMode: 'billboard' }
  },
  { __type__: 'cc.PrefabInfo', root: { __id__: 1 }, asset: { __id__: 0 }, fileId: 'xxx', targetOverrides: null },
  { __type__: 'cc.CompPrefabInfo', fileId: 'yyy' }
]);

const noPS = JSON.stringify([
  { __type__: 'cc.Prefab', _name: 'Empty', _objFlags: 0, _native: '', data: { __id__: 1 } },
  { __type__: 'cc.Node', _name: 'Empty' }
]);

describe('prefab-importer', () => {
  it('parses valid .prefab with ParticleSystem', () => {
    const result = parsePrefab(validPrefab);
    expect(result.effectConfig).toBeDefined();
    expect(result.effectConfig.name).toBe('Fire');
    expect(result.effectConfig.type).toBe('particle3d');
    expect(result.effectConfig.source).toBe('imported');
    const cfg = result.effectConfig.config as any;
    expect(cfg.mainModule.capacity).toBe(80);
    expect(cfg.mainModule.loop).toBe(true);
    expect(cfg.shapeModule.shapeType).toBe('cone');
    expect(cfg.shapeModule.radius).toBe(0.5);
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePrefab('not json')).toThrow('文件格式无效');
  });

  it('throws on missing ParticleSystem', () => {
    expect(() => parsePrefab(noPS)).toThrow('不包含粒子系统组件');
    // Note: parser detects missing cc.ParticleSystem type, error may vary
  });

  it('throws on non-array prefab', () => {
    expect(() => parsePrefab('{}')).toThrow('无效的 .prefab 文件格式');
  });
});
