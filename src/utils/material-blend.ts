import * as THREE from 'three';
import type { AssetEntry } from '@/types/asset';
import type { RenderMode } from '@/types/effect';
import type { ParticleBlendMode } from '@/types/material';
import { getParticleMaterialConfig } from '@/utils/particle-material';

export type { ParticleBlendMode };

export function getBlendModeFromMaterialAsset(asset: AssetEntry | null): ParticleBlendMode | null {
  if (!asset || asset.type !== 'material') return null;
  return getParticleMaterialConfig(asset).blend;
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

/** Tint as linear 0–1 rgba for Three.js SpriteMaterial. */
export function resolveMaterialTintRgba(
  materialAssetId: string | undefined,
  getAsset: (id: string) => AssetEntry | null
): [number, number, number, number] {
  if (!materialAssetId) return [1, 1, 1, 1];
  const asset = getAsset(materialAssetId);
  if (!asset || asset.type !== 'material') return [1, 1, 1, 1];
  const { tintColor } = getParticleMaterialConfig(asset);
  return [tintColor.r / 255, tintColor.g / 255, tintColor.b / 255, tintColor.a / 255];
}

/** Material prop mainTexture overrides emitter texture when set. */
export function resolvePreviewTextureAssetId(
  emitterTextureId: string | undefined,
  materialAssetId: string | undefined,
  getAsset: (id: string) => AssetEntry | null
): string | undefined {
  if (materialAssetId) {
    const asset = getAsset(materialAssetId);
    const matTex = asset ? getParticleMaterialConfig(asset).mainTextureAssetId : undefined;
    if (matTex) return matTex;
  }
  return emitterTextureId;
}

export function applyTintToRgba(
  rgba: [number, number, number, number],
  tint: [number, number, number, number]
): [number, number, number, number] {
  return [
    rgba[0] * tint[0],
    rgba[1] * tint[1],
    rgba[2] * tint[2],
    rgba[3] * tint[3]
  ];
}
