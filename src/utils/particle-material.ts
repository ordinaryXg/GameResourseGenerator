import type { AssetEntry } from '@/types/asset';
import type {
  CocosColorRGBA,
  ParticleBlendMode,
  ParticleMaterialConfig
} from '@/types/material';
import {
  BUILTIN_PARTICLE_EFFECT_UUID,
  DEFAULT_TINT_COLOR
} from '@/types/material';

export function blendFromTechIdx(techIdx: number): ParticleBlendMode {
  return techIdx === 0 ? 'alpha' : 'additive';
}

export function techIdxFromBlend(blend: ParticleBlendMode): number {
  return blend === 'alpha' ? 0 : 1;
}

export function clampChannel(n: unknown, fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function normalizeTintColor(raw: unknown): CocosColorRGBA {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TINT_COLOR };
  const c = raw as Record<string, unknown>;
  return {
    r: clampChannel(c.r, DEFAULT_TINT_COLOR.r),
    g: clampChannel(c.g, DEFAULT_TINT_COLOR.g),
    b: clampChannel(c.b, DEFAULT_TINT_COLOR.b),
    a: clampChannel(c.a, DEFAULT_TINT_COLOR.a)
  };
}

export function tintToCssHex(color: CocosColorRGBA): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(color.r)}${h(color.g)}${h(color.b)}`;
}

export function tintFromCssHex(hex: string, alpha = 255): CocosColorRGBA {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { ...DEFAULT_TINT_COLOR, a: alpha };
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: clampChannel(alpha, 255)
  };
}

/** Read particle material config from an AssetEntry (legacy `meta.blend` compatible). */
export function getParticleMaterialConfig(asset: AssetEntry | null | undefined): ParticleMaterialConfig {
  const meta = asset?.meta ?? {};
  const blendRaw = meta.blend === 'alpha' || meta.blend === 'additive' ? meta.blend : null;
  const techFromMeta = typeof meta.techIdx === 'number' ? meta.techIdx : null;
  const techIdx = techFromMeta ?? (blendRaw ? techIdxFromBlend(blendRaw) : 1);
  const blend = blendRaw ?? blendFromTechIdx(techIdx);

  return {
    effectUuid: typeof meta.effectUuid === 'string' && meta.effectUuid
      ? meta.effectUuid
      : BUILTIN_PARTICLE_EFFECT_UUID,
    techIdx: techIdx === 0 ? 0 : 1,
    blend,
    tintColor: normalizeTintColor(meta.tintColor),
    mainTextureAssetId: typeof meta.mainTextureAssetId === 'string'
      ? meta.mainTextureAssetId
      : undefined,
    mainTextureUuid: typeof meta.mainTextureUuid === 'string'
      ? meta.mainTextureUuid
      : undefined
  };
}

/** Build meta patch for material fields (merges with existing meta via updateProjectAsset). */
export function particleMaterialMetaPatch(
  config: Partial<ParticleMaterialConfig> & { blend?: ParticleBlendMode; techIdx?: number }
): NonNullable<AssetEntry['meta']> {
  const patch: NonNullable<AssetEntry['meta']> = {};
  if (config.effectUuid !== undefined) patch.effectUuid = config.effectUuid;
  if (config.tintColor !== undefined) patch.tintColor = normalizeTintColor(config.tintColor);
  if (config.mainTextureAssetId !== undefined) {
    patch.mainTextureAssetId = config.mainTextureAssetId || undefined;
  }
  if (config.mainTextureUuid !== undefined) {
    patch.mainTextureUuid = config.mainTextureUuid || undefined;
  }

  if (config.techIdx !== undefined) {
    const techIdx = config.techIdx === 0 ? 0 : 1;
    patch.techIdx = techIdx;
    patch.blend = blendFromTechIdx(techIdx);
  } else if (config.blend !== undefined) {
    patch.blend = config.blend;
    patch.techIdx = techIdxFromBlend(config.blend);
  }
  return patch;
}

export function techniqueLabel(techIdx: number): string {
  return techIdx === 0 ? 'transparent (Alpha)' : 'additive';
}
