import type { EffectGroupNode, EffectNode, ParticleEmitterNode, Transform3D } from '@/types/project';
import { isEmitterNode, isGroupNode } from '@/types/project';
import type { Particle3DConfig } from '@/types/effect';
import { combineTransforms, identityTransform } from './transform-utils';

export interface EmitterPreviewSource {
  id: string;
  config: Particle3DConfig;
  transform: Transform3D;
  enabled: boolean;
  mainTextureAssetId?: string;
  materialAssetId?: string;
}

export function collectEmitterPreviewSources(
  root: EffectGroupNode,
  options?: { soloId?: string | null; includeDisabled?: boolean }
): EmitterPreviewSource[] {
  const soloId = options?.soloId ?? null;
  const includeDisabled = options?.includeDisabled ?? false;
  const result: EmitterPreviewSource[] = [];

  const walk = (nodes: EffectNode[], parentTransform: Transform3D) => {
    for (const node of nodes) {
      if (!includeDisabled && !node.enabled) continue;
      const world = combineTransforms(parentTransform, node.transform);
      if (isEmitterNode(node)) {
        if (soloId && node.id !== soloId) continue;
        result.push({
          id: node.id,
          config: node.config,
          transform: world,
          enabled: node.enabled,
          mainTextureAssetId: node.assetRefs.mainTexture,
          materialAssetId: node.assetRefs.material
        });
      } else if (isGroupNode(node)) {
        if (!node.enabled && !includeDisabled) continue;
        walk(node.children, world);
      }
    }
  };

  walk(root.children, identityTransform());
  return result;
}

export function getEmitterNodes(root: EffectGroupNode): ParticleEmitterNode[] {
  const nodes: ParticleEmitterNode[] = [];
  const walk = (list: EffectNode[]) => {
    for (const n of list) {
      if (isEmitterNode(n)) nodes.push(n);
      else if (isGroupNode(n)) walk(n.children);
    }
  };
  walk(root.children);
  return nodes;
}
