import type { AssetEntry } from '@/types/asset';
import type { CocosColorRGBA, ParticleMaterialConfig } from '@/types/material';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '@/types/material';
import {
  blendFromTechIdx,
  getParticleMaterialConfig,
  normalizeTintColor,
  particleMaterialMetaPatch
} from '@/utils/particle-material';

function readUuid(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const u = (raw as { __uuid__?: unknown }).__uuid__;
  return typeof u === 'string' && u ? u : undefined;
}

function readTintFromProps(props: unknown): CocosColorRGBA {
  if (!Array.isArray(props) || !props[0] || typeof props[0] !== 'object') {
    return normalizeTintColor(undefined);
  }
  const tint = (props[0] as { tintColor?: unknown }).tintColor;
  return normalizeTintColor(tint);
}

function readMainTextureUuid(props: unknown): string | undefined {
  if (!Array.isArray(props) || !props[0] || typeof props[0] !== 'object') return undefined;
  return readUuid((props[0] as { mainTexture?: unknown }).mainTexture);
}

/** Parse Cocos `.mtl` JSON into material meta fields. */
export function parseMtlContent(json: string): Partial<NonNullable<AssetEntry['meta']>> | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    return parseMtlObject(raw);
  } catch {
    return null;
  }
}

export function parseMtlObject(raw: Record<string, unknown>): Partial<NonNullable<AssetEntry['meta']>> {
  const fxMeta = raw._fxStudioMeta as { blend?: string } | undefined;
  const techIdx = typeof raw._techIdx === 'number' ? (raw._techIdx === 0 ? 0 : 1) : undefined;
  const blendFromFx = fxMeta?.blend === 'alpha' || fxMeta?.blend === 'additive'
    ? fxMeta.blend
    : undefined;
  const effectUuid = readUuid(raw._effectAsset) ?? BUILTIN_PARTICLE_EFFECT_UUID;
  const tintColor = readTintFromProps(raw._props);
  const mainTextureUuid = readMainTextureUuid(raw._props);

  const resolvedTech = techIdx ?? (blendFromFx ? (blendFromFx === 'alpha' ? 0 : 1) : 1);
  return particleMaterialMetaPatch({
    effectUuid,
    techIdx: resolvedTech,
    blend: blendFromFx ?? blendFromTechIdx(resolvedTech),
    tintColor,
    mainTextureUuid
  });
}

export interface SerializeMaterialOptions {
  name?: string;
  /** Cocos sprite-frame / texture UUID written to `_props.mainTexture`. */
  mainTextureUuid?: string;
}

/** Build a `cc.Material` object for export / preview. */
export function serializeParticleMaterial(
  config: ParticleMaterialConfig,
  options: SerializeMaterialOptions = {}
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    tintColor: {
      __type__: 'cc.Color',
      r: config.tintColor.r,
      g: config.tintColor.g,
      b: config.tintColor.b,
      a: config.tintColor.a
    }
  };
  const texUuid = options.mainTextureUuid ?? config.mainTextureUuid;
  if (texUuid) {
    props.mainTexture = { __uuid__: texUuid };
  }

  return {
    __type__: 'cc.Material',
    _name: options.name ?? '',
    _objFlags: 0,
    _native: '',
    _effectAsset: { __uuid__: config.effectUuid || BUILTIN_PARTICLE_EFFECT_UUID },
    _techIdx: config.techIdx === 0 ? 0 : 1,
    _defines: [{}],
    _states: [{
      rasterizerState: {},
      depthStencilState: {},
      blendState: { targets: [{}] }
    }],
    _props: [props],
    _fxStudioMeta: {
      blend: config.blend
    }
  };
}

export function serializeMaterialAsset(
  asset: AssetEntry,
  options: SerializeMaterialOptions = {}
): Record<string, unknown> {
  const config = getParticleMaterialConfig(asset);
  return serializeParticleMaterial(config, {
    name: options.name ?? asset.name,
    mainTextureUuid: options.mainTextureUuid
  });
}

/** Pretty JSON for inspector preview. */
export function formatMaterialSourcePreview(asset: AssetEntry): string {
  return JSON.stringify(serializeMaterialAsset(asset), null, 2);
}
