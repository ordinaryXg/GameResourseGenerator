import * as THREE from 'three';
import type { AssetEntry } from '@/types/asset';
import type { RenderMode } from '@/types/effect';

export type ParticleBlendMode = 'additive' | 'alpha';

export function getBlendModeFromMaterialAsset(asset: AssetEntry | null): ParticleBlendMode | null {
  if (!asset || asset.type !== 'material') return null;
  const blend = asset.meta?.blend;
  if (blend === 'alpha') return 'alpha';
  if (blend === 'additive') return 'additive';
  return null;
}

/** Preview blending: material asset overrides render-mode heuristic when set. */
export function resolveParticleBlending(
  materialAssetId: string | undefined,
  getAsset: (id: string) => AssetEntry | null,
  renderMode: RenderMode
): THREE.Blending {
  if (materialAssetId) {
    const mode = getBlendModeFromMaterialAsset(getAsset(materialAssetId));
    if (mode === 'alpha') return THREE.NormalBlending;
    if (mode === 'additive') return THREE.AdditiveBlending;
  }
  return renderMode !== 'billboard' ? THREE.AdditiveBlending : THREE.NormalBlending;
}

export function blendModeLabel(mode: ParticleBlendMode): string {
  return mode === 'additive' ? '加法混合 (Additive)' : '透明混合 (Alpha Blend)';
}
