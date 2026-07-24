import type { EffectGroupNode, EffectNode, Transform3D, NodeAnimationClip } from '@/types/project';
import { isEmitterNode, isGroupNode } from '@/types/project';
import { combineTransforms, identityTransform } from '@/utils/transform-utils';
import { sampleAnimationPosition } from '@/utils/cocos-animation-import';
import type { EmitterPreviewSource } from '@/utils/preview-sources';

function animatedLocalTransform(node: EffectNode, previewTime: number): Transform3D {
  const base = node.transform;
  if (!node.animation) return base;
  const [ox, oy, oz] = sampleAnimationPosition(node.animation, previewTime);
  return {
    ...base,
    position: [base.position[0] + ox, base.position[1] + oy, base.position[2] + oz]
  };
}

export function collectAnimatedEmitterSources(
  root: EffectGroupNode,
  options?: { previewTime?: number; soloId?: string | null; includeDisabled?: boolean }
): EmitterPreviewSource[] {
  const previewTime = options?.previewTime ?? 0;
  const soloId = options?.soloId ?? null;
  const includeDisabled = options?.includeDisabled ?? false;
  const result: EmitterPreviewSource[] = [];

  const walk = (nodes: EffectNode[], parentTransform: Transform3D) => {
    for (const node of nodes) {
      if (!includeDisabled && !node.enabled) continue;
      const local = animatedLocalTransform(node, previewTime);
      const world = combineTransforms(parentTransform, local);
      if (isEmitterNode(node)) {
        if (soloId && node.id !== soloId) continue;
        result.push({
          id: node.id,
          name: node.name,
          config: node.config,
          transform: world,
          enabled: node.enabled,
          mainTextureAssetId: node.assetRefs.mainTexture,
          materialAssetId: node.assetRefs.material,
          meshAssetId: node.assetRefs.mesh,
          localTransform: local
        });
      } else if (isGroupNode(node)) {
        walk(node.children, world);
      }
    }
  };

  walk(root.children, identityTransform());
  return result;
}

export function bindAnimationClipToTree(
  root: EffectGroupNode,
  clipUuid: string,
  clip: NodeAnimationClip
): EffectGroupNode {
  const bindNode = (node: EffectNode): EffectNode => {
    if (isGroupNode(node)) {
      const nextAnimation =
        node.animation?.clipUuid === clipUuid ? { ...clip, clipUuid } : node.animation;
      return {
        ...node,
        animation: nextAnimation,
        children: node.children.map(bindNode)
      };
    }
    return node.animation?.clipUuid === clipUuid
      ? { ...node, animation: { ...clip, clipUuid } }
      : node;
  };

  return {
    ...root,
    children: root.children.map(bindNode)
  };
}
