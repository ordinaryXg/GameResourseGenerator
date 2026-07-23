import { describe, it, expect } from 'vitest';
import {
  PRESET_PROJECTS,
  buildPresetProject,
  buildExplosionPresetProject
} from '../src/data/preset-projects';
import { getEmitterNodes } from '../src/utils/preview-sources';

describe('preset-projects', () => {
  it('defines three preset projects', () => {
    expect(PRESET_PROJECTS).toHaveLength(3);
    expect(PRESET_PROJECTS.map(p => p.id)).toEqual([
      'preset-explosion',
      'preset-magic',
      'preset-environment'
    ]);
  });

  it('builds explosion preset with 3 emitters', () => {
    const project = buildExplosionPresetProject();
    expect(project.name).toBe('爆炸组合');
    expect(project.root.name).toBe('Explosion');
    const emitters = getEmitterNodes(project.root);
    expect(emitters).toHaveLength(3);
    expect(emitters.map(e => e.name).sort()).toEqual(['Explosion', 'Glow', 'Smoke']);
  });

  it('assigns distinct asset refs per emitter in explosion preset', () => {
    const project = buildExplosionPresetProject();
    const emitters = getEmitterNodes(project.root);
    const textures = new Set(emitters.map(e => e.assetRefs.mainTexture));
    expect(textures.size).toBe(3);
  });

  it('buildPresetProject generates fresh project id', () => {
    const a = buildPresetProject('preset-magic');
    const b = buildPresetProject('preset-magic');
    expect(a.id).not.toBe(b.id);
    expect(getEmitterNodes(a.root)).toHaveLength(3);
  });
});
