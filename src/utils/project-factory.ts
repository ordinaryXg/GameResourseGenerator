import type { EffectGroupNode, EffectProject, ParticleEmitterNode, Transform3D } from '@/types/project';
import { FX_PROJECT_VERSION } from '@/types/project';
import { getDefaultParticle3DConfig, generateUUID } from './effect-defaults';

import { createBuiltinAssetEntries, DEFAULT_TEXTURE_ASSET_ID } from '@/data/builtin-assets';
export { DEFAULT_TEXTURE_ASSET_ID };

export function createDefaultTransform(): Transform3D {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export function createBuiltinAssetRegistry() {
  return createBuiltinAssetEntries();
}

export function createDefaultEmitter(name = 'Particle System'): ParticleEmitterNode {
  return {
    type: 'emitter',
    id: generateUUID(),
    name,
    enabled: true,
    transform: createDefaultTransform(),
    config: getDefaultParticle3DConfig(),
    assetRefs: { mainTexture: DEFAULT_TEXTURE_ASSET_ID }
  };
}

export function createDefaultRootGroup(name = 'Root'): EffectGroupNode {
  return {
    type: 'group',
    id: generateUUID(),
    name,
    enabled: true,
    transform: createDefaultTransform(),
    children: [createDefaultEmitter('Particle System')]
  };
}

export function createDefaultProject(name = '新建特效项目'): EffectProject {
  const now = new Date().toISOString();
  return {
    version: FX_PROJECT_VERSION,
    id: generateUUID(),
    name,
    settings: { targetEngine: 'cocos-creator-3.8' },
    assetRegistry: createBuiltinAssetRegistry(),
    root: createDefaultRootGroup('Root'),
    metadata: { createdAt: now, updatedAt: now }
  };
}

export function getNextEmitterName(root: EffectGroupNode): string {
  const base = 'Particle System';
  const names = new Set<string>();
  const walk = (nodes: EffectGroupNode['children']) => {
    for (const n of nodes) {
      names.add(n.name);
      if (n.type === 'group') walk(n.children);
    }
  };
  walk(root.children);
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
