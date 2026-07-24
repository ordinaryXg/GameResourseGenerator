import type { AssetEntry } from '@/types/asset';
import type { MaterialDocument, ParticleMaterialConfig } from '@/types/material';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '@/types/material';
import {
  getMaterialDocument,
  getEffectUuid,
  particleConfigFromDocument,
  syncCompatMirrors
} from '@/utils/material-document';
import { getParticleMaterialConfig } from '@/utils/particle-material';

function readUuid(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const u = (raw as { __uuid__?: unknown }).__uuid__;
  return typeof u === 'string' && u ? u : undefined;
}

/** Parse Cocos `.mtl` JSON into material meta fields (+ materialDoc). */
export function parseMtlContent(json: string): Partial<NonNullable<AssetEntry['meta']>> | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    return parseMtlObject(raw);
  } catch {
    return null;
  }
}

export function parseMtlObject(raw: Record<string, unknown>): Partial<NonNullable<AssetEntry['meta']>> {
  const effectUuid = readUuid(raw._effectAsset) ?? BUILTIN_PARTICLE_EFFECT_UUID;
  const techIdx = typeof raw._techIdx === 'number' ? raw._techIdx : 1;
  const fxMeta = raw._fxStudioMeta as { blend?: string; effectShaderAssetId?: string } | undefined;

  const defines = Array.isArray(raw._defines) ? raw._defines as MaterialDocument['defines'] : [{}];
  const states = Array.isArray(raw._states) ? raw._states as MaterialDocument['states'] : [];
  const props = Array.isArray(raw._props) ? raw._props as MaterialDocument['props'] : [{}];

  const effect: MaterialDocument['effect'] =
    effectUuid === BUILTIN_PARTICLE_EFFECT_UUID
      ? { kind: 'builtin-uuid', uuid: effectUuid }
      : { kind: 'external-uuid', uuid: effectUuid };

  const doc: MaterialDocument = {
    effect: fxMeta?.effectShaderAssetId
      ? { kind: 'shader-asset', assetId: fxMeta.effectShaderAssetId, uuid: effectUuid }
      : effect,
    techIdx,
    defines: defines.length ? defines as MaterialDocument['defines'] : [{}],
    states: states.length ? states as MaterialDocument['states'] : [],
    props: props.length ? props as MaterialDocument['props'] : [{}]
  };

  return syncCompatMirrors(getMaterialDocument({
    id: 'tmp',
    name: typeof raw._name === 'string' ? raw._name : 'material',
    type: 'material',
    source: 'imported',
    uri: '',
    meta: { materialDoc: doc, effectUuid, techIdx }
  }));
}

export interface SerializeMaterialOptions {
  name?: string;
  /** Cocos sprite-frame / texture UUID written to `_props.mainTexture`. */
  mainTextureUuid?: string;
}

function ensureMainTexture(
  props: Record<string, unknown>[],
  mainTextureUuid?: string
): Record<string, unknown>[] {
  if (!mainTextureUuid) return props;
  const next = props.map((p) => ({ ...p }));
  const first = { ...(next[0] ?? {}) };
  first.mainTexture = { __uuid__: mainTextureUuid };
  next[0] = first;
  return next;
}

/** Serialize MaterialDocument to `cc.Material` JSON. */
export function serializeMaterialDocument(
  doc: MaterialDocument,
  options: SerializeMaterialOptions = {}
): Record<string, unknown> {
  const props = ensureMainTexture(doc.props, options.mainTextureUuid);
  const effectUuid = getEffectUuid(doc);
  const fxMeta: Record<string, unknown> = {
    blend: doc.techIdx === 0 ? 'alpha' : 'additive'
  };
  if (doc.effect.kind === 'shader-asset') {
    fxMeta.effectShaderAssetId = doc.effect.assetId;
  }

  return {
    __type__: 'cc.Material',
    _name: options.name ?? '',
    _objFlags: 0,
    _native: '',
    _effectAsset: { __uuid__: effectUuid },
    _techIdx: doc.techIdx,
    _defines: doc.defines.length ? doc.defines : [{}],
    _states: doc.states.length
      ? doc.states
      : [{
          rasterizerState: {},
          depthStencilState: {},
          blendState: { targets: [{}] }
        }],
    _props: props.length ? props : [{}],
    _fxStudioMeta: fxMeta
  };
}

/** Build a `cc.Material` object for export / preview (Plan A compat wrapper). */
export function serializeParticleMaterial(
  config: ParticleMaterialConfig,
  options: SerializeMaterialOptions = {}
): Record<string, unknown> {
  const doc = getMaterialDocument({
    id: 'tmp',
    name: options.name ?? '',
    type: 'material',
    source: 'project',
    uri: '',
    meta: {
      effectUuid: config.effectUuid,
      techIdx: config.techIdx,
      blend: config.blend,
      tintColor: config.tintColor,
      mainTextureAssetId: config.mainTextureAssetId,
      mainTextureUuid: config.mainTextureUuid
    }
  });
  return serializeMaterialDocument(doc, {
    name: options.name,
    mainTextureUuid: options.mainTextureUuid ?? config.mainTextureUuid
  });
}

export function serializeMaterialAsset(
  asset: AssetEntry,
  options: SerializeMaterialOptions = {}
): Record<string, unknown> {
  const doc = getMaterialDocument(asset);
  const cfg = particleConfigFromDocument(doc);
  return serializeMaterialDocument(doc, {
    name: options.name ?? asset.name,
    mainTextureUuid: options.mainTextureUuid ?? cfg.mainTextureUuid
  });
}

/** Pretty JSON for inspector preview. */
export function formatMaterialSourcePreview(asset: AssetEntry): string {
  return JSON.stringify(serializeMaterialAsset(asset), null, 2);
}

/** @deprecated use getMaterialDocument — kept for older call sites */
export function parseMtlToParticleConfig(asset: AssetEntry): ParticleMaterialConfig {
  return getParticleMaterialConfig(asset);
}
