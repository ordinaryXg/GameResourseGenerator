import { describe, it, expect } from 'vitest';
import { collectPrefabImportFiles } from '../src/utils/prefab-import-scan';
import { bindPrefabImportAssets } from '../src/utils/prefab-import-bundle';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import type { Dirent } from 'fs';
import fs from 'fs';
import path from 'path';

function mockDirent(name: string, type: 'file' | 'dir'): Dirent {
  return {
    name,
    isDirectory: () => type === 'dir',
    isFile: () => type === 'file',
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false
  } as Dirent;
}

describe('prefab-import-scan', () => {
  it('scans prefab folder recursively but not entire parent tree', async () => {
    const files = new Map<string, string>([
      ['D:/smok/effect.prefab', '{}'],
      ['D:/smok/textures/a.png', 'png'],
      ['D:/smok/textures/a.png.meta', '{"uuid":"u1"}'],
      ['D:/Desktop/other.prefab', '{}'],
      ['D:/Desktop/huge/other.png', 'x']
    ]);

    const dirs: Record<string, Dirent[]> = {
      'D:/smok': [mockDirent('effect.prefab', 'file'), mockDirent('textures', 'dir')],
      'D:/smok/textures': [mockDirent('a.png', 'file'), mockDirent('a.png.meta', 'file')],
      'D:/Desktop': [mockDirent('smok', 'dir'), mockDirent('other.prefab', 'file'), mockDirent('huge', 'dir')],
      'D:/Desktop/huge': [mockDirent('other.png', 'file')]
    };

    const exists = new Set(['D:/smok/textures']);

    const collected = await collectPrefabImportFiles('D:/smok/effect.prefab', {
      readdir: async (dir) => dirs[dir] ?? [],
      readText: async (p) => files.get(p) ?? '',
      readBase64: async (p) => Buffer.from(files.get(p) ?? '', 'utf-8').toString('base64'),
      exists: (p) => exists.has(p),
      join: (...parts) => parts.join('/').replace(/\/+/g, '/'),
      dirname: (p) => p.replace(/[/\\][^/\\]+$/, ''),
      basename: (p) => p.split(/[/\\]/).pop()!,
      relative: (from, to) => {
        const f = from.replace(/\\/g, '/');
        const t = to.replace(/\\/g, '/');
        if (t.startsWith(f + '/')) return t.slice(f.length + 1);
        return to;
      }
    });

    expect(collected.some(f => f.relativePath === 'textures/a.png')).toBe(true);
    expect(collected.some(f => f.name === 'other.prefab')).toBe(false);
    expect(collected.some(f => f.name === 'other.png')).toBe(false);
  });

  it('finds textures in sibling Cocos effect folders (smok layout)', async () => {
    const root = 'D:/smok/resources/effect';
    const bossDir = `${root}/Ext_bossAttackSmoke`;
    const lightDir = `${root}/Ex_smokeLight`;

    const files = new Map<string, string>([
      [`${bossDir}/Ext_attckSmoke.prefab`, '{}'],
      [`${bossDir}/attckSmoke.mtl`, '{}'],
      [`${lightDir}/loseSmoke01.png`, 'png-bytes'],
      [`${lightDir}/loseSmoke01.png.meta`, '{"uuid":"tex-1","subMetas":{"6c48a":{"uuid":"tex-1@6c48a"}}}']
    ]);

    const dirs: Record<string, Dirent[]> = {
      [bossDir]: [
        mockDirent('Ext_attckSmoke.prefab', 'file'),
        mockDirent('attckSmoke.mtl', 'file')
      ],
      [root]: [
        mockDirent('Ext_bossAttackSmoke', 'dir'),
        mockDirent('Ex_smokeLight', 'dir')
      ],
      [lightDir]: [
        mockDirent('loseSmoke01.png', 'file'),
        mockDirent('loseSmoke01.png.meta', 'file')
      ]
    };

    const collected = await collectPrefabImportFiles(`${bossDir}/Ext_attckSmoke.prefab`, {
      readdir: async (dir) => dirs[dir] ?? [],
      readText: async (p) => files.get(p) ?? '',
      readBase64: async (p) => Buffer.from(files.get(p) ?? '', 'utf-8').toString('base64'),
      exists: () => false,
      join: (...parts) => parts.join('/').replace(/\/+/g, '/'),
      dirname: (p) => p.replace(/[/\\][^/\\]+$/, ''),
      basename: (p) => p.split(/[/\\]/).pop()!,
      relative: (from, to) => {
        const f = from.replace(/\\/g, '/');
        const t = to.replace(/\\/g, '/');
        if (t.toLowerCase().startsWith(f.toLowerCase() + '/')) return t.slice(f.length + 1);
        const up = '../Ex_smokeLight/loseSmoke01.png';
        if (t.endsWith('loseSmoke01.png')) return up;
        return t;
      }
    });

    expect(collected.some(f => f.name === 'loseSmoke01.png')).toBe(true);
  });
});

describe('smok fixture integration', () => {
  const smokRoot = 'D:/Desktop/smok';
  const prefabPath = path.join(
    smokRoot,
    'resources/effect/Ext_bossAttackSmoke/Ext_attckSmoke.prefab'
  );

  it('binds loseSmoke01.png for real smok export when fixture exists', async () => {
    if (!fs.existsSync(prefabPath)) return;

    const prefabContent = fs.readFileSync(prefabPath, 'utf-8');
    const { readdir, readFile } = await import('fs/promises');
    const { dirname, join, basename, relative } = await import('path');
    const { existsSync } = await import('fs');

    const collected = await collectPrefabImportFiles(prefabPath, {
      readdir: (dir) => readdir(dir, { withFileTypes: true }),
      readText: (p) => readFile(p, 'utf-8'),
      readBase64: async (p) => (await readFile(p)).toString('base64'),
      exists: (p) => existsSync(p),
      join,
      dirname,
      basename,
      relative
    });

    expect(collected.some(f => f.name === 'loseSmoke01.png')).toBe(true);

    const parsed = parsePrefabToProject(prefabContent, 'Ext_attckSmoke');
    const bound = bindPrefabImportAssets(parsed.project, collected);
    expect(bound.boundAssetCount).toBeGreaterThan(0);

    const tex = bound.project.assetRegistry.find(
      a => a.meta?.uuid === '8f03f6bb-7e12-4465-b966-09ee9a9f6121'
    );
    expect(tex?.uri.startsWith('data:image')).toBe(true);
    expect(tex?.name).toBe('loseSmoke01');

    const emitters = bound.project.root.children.filter(n => n.type === 'emitter');
    expect(emitters.length).toBeGreaterThan(0);
    const cfg = (emitters[0] as import('../src/types/project').ParticleEmitterNode).config;
    expect(cfg.mainModule.rateOverTime).toBe(100);
    expect(cfg.mainModule.startLifetime.constant).toBe(0.4);
    expect(cfg.mainModule.startSpeed.constant).toBe(0.8);
    expect(cfg.colorOverLifetime.enabled).toBe(true);
    expect(cfg.textureAnimation.enabled).toBe(true);
    expect(cfg.textureAnimation.numTilesX).toBe(4);
    expect(cfg.textureAnimation.numTilesY).toBe(4);
  });
});
