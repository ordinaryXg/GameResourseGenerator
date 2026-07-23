import type { AssetEntry } from '@/types/asset';
import type { EmitterAssetRefs } from '@/types/asset';
import type { ParticleEmitterNode } from '@/types/project';

/** Map browser asset to emitter assetRefs patch. SpriteFrame → underlying texture id. */
export function assetToEmitterRefsPatch(asset: AssetEntry): Partial<EmitterAssetRefs> | null {
  switch (asset.type) {
    case 'texture':
      return { mainTexture: asset.id };
    case 'spriteFrame': {
      const texId = (asset.meta?.textureId as string | undefined) ?? asset.id.replace(/-sf$/, '');
      return { mainTexture: texId };
    }
    case 'material':
      return { material: asset.id };
    case 'mesh':
      return { mesh: asset.id };
    default:
      return null;
  }
}

export function applyAssetToEmitterNode(
  node: ParticleEmitterNode,
  asset: AssetEntry
): ParticleEmitterNode | null {
  const patch = assetToEmitterRefsPatch(asset);
  if (!patch) return null;
  return {
    ...node,
    assetRefs: { ...node.assetRefs, ...patch }
  };
}

export function resolveMainTextureId(assetRefs: EmitterAssetRefs): string | undefined {
  return assetRefs.mainTexture;
}
