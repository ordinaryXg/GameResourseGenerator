import type { AssetEntry } from '@/types/asset';
import type {
  EffectRef,
  MaterialDocument,
  PassState,
  ParticleBlendMode,
  ParticleMaterialConfig
} from '@/types/material';
import {
  BUILTIN_PARTICLE_EFFECT_UUID,
  DEFAULT_TINT_COLOR
} from '@/types/material';
import {
  blendFromTechIdx,
  normalizeTintColor,
  techIdxFromBlend
} from '@/utils/particle-material';

export function defaultPassState(blend: ParticleBlendMode = 'additive'): PassState {
  const additive = blend === 'additive';
  return {
    rasterizerState: { cullMode: 'none' },
    depthStencilState: { depthTest: true, depthWrite: false, stencilTest: false },
    blendState: {
      targets: [{
        blend: true,
        blendSrc: additive ? 770 : 1,
        blendDst: additive ? 1 : 771
      }]
    }
  };
}

export function defaultMaterialDocument(
  blend: ParticleBlendMode = 'additive'
): MaterialDocument {
  const techIdx = techIdxFromBlend(blend);
  return {
    effect: { kind: 'builtin-uuid', uuid: BUILTIN_PARTICLE_EFFECT_UUID },
    techIdx,
    defines: [{}],
    states: [defaultPassState(blend)],
    props: [{
      tintColor: {
        __type__: 'cc.Color',
        ...DEFAULT_TINT_COLOR
      }
    }]
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function normalizeDefines(raw: unknown): Record<string, boolean | number | string>[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{}];
  return raw.map((item) => {
    if (!isRecord(item)) return {};
    const out: Record<string, boolean | number | string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') {
        out[k] = v;
      }
    }
    return out;
  });
}

function normalizePassState(raw: unknown, fallbackBlend: ParticleBlendMode): PassState {
  const base = defaultPassState(fallbackBlend);
  if (!isRecord(raw)) return base;
  const raster = isRecord(raw.rasterizerState) ? raw.rasterizerState : {};
  const depth = isRecord(raw.depthStencilState) ? raw.depthStencilState : {};
  const blendState = isRecord(raw.blendState) ? raw.blendState : {};
  const targetsRaw = Array.isArray(blendState.targets) ? blendState.targets : [];
  const targets = targetsRaw.length > 0
    ? targetsRaw.map((t) => {
      if (!isRecord(t)) return { ...base.blendState.targets[0] };
      return {
        blend: typeof t.blend === 'boolean' ? t.blend : true,
        blendSrc: t.blendSrc as number | string | undefined,
        blendDst: t.blendDst as number | string | undefined,
        blendSrcAlpha: t.blendSrcAlpha as number | string | undefined,
        blendDstAlpha: t.blendDstAlpha as number | string | undefined,
        blendEq: t.blendEq as number | string | undefined
      };
    })
    : base.blendState.targets;

  const cull = raster.cullMode;
  return {
    rasterizerState: {
      cullMode: cull === 'front' || cull === 'back' || cull === 'none' ? cull : 'none'
    },
    depthStencilState: {
      depthTest: typeof depth.depthTest === 'boolean' ? depth.depthTest : true,
      depthWrite: typeof depth.depthWrite === 'boolean' ? depth.depthWrite : false,
      stencilTest: typeof depth.stencilTest === 'boolean' ? depth.stencilTest : false
    },
    blendState: { targets }
  };
}

function normalizeProps(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ tintColor: { __type__: 'cc.Color', ...DEFAULT_TINT_COLOR } }];
  }
  return raw.map((p) => (isRecord(p) ? { ...p } : {}));
}

function resolveEffectRef(meta: NonNullable<AssetEntry['meta']>, docEffect?: EffectRef): EffectRef {
  if (docEffect) return docEffect;
  if (typeof meta.effectShaderAssetId === 'string' && meta.effectShaderAssetId) {
    return {
      kind: 'shader-asset',
      assetId: meta.effectShaderAssetId,
      uuid: typeof meta.effectUuid === 'string' ? meta.effectUuid : undefined
    };
  }
  const uuid = typeof meta.effectUuid === 'string' && meta.effectUuid
    ? meta.effectUuid
    : BUILTIN_PARTICLE_EFFECT_UUID;
  if (uuid === BUILTIN_PARTICLE_EFFECT_UUID) {
    return { kind: 'builtin-uuid', uuid };
  }
  return { kind: 'external-uuid', uuid };
}

function effectUuidOf(effect: EffectRef): string {
  if (effect.kind === 'shader-asset') {
    return effect.uuid || BUILTIN_PARTICLE_EFFECT_UUID;
  }
  return effect.uuid || BUILTIN_PARTICLE_EFFECT_UUID;
}

function readTintFromProps(props: Record<string, unknown>[]): ReturnType<typeof normalizeTintColor> {
  const first = props[0];
  return normalizeTintColor(first?.tintColor);
}

function readMainTextureUuidFromProps(props: Record<string, unknown>[]): string | undefined {
  const first = props[0];
  const mt = first?.mainTexture;
  if (isRecord(mt) && typeof mt.__uuid__ === 'string') return mt.__uuid__;
  return undefined;
}

/** Build MaterialDocument from asset meta (migrates Plan A fields). */
export function getMaterialDocument(asset: AssetEntry | null | undefined): MaterialDocument {
  const meta = asset?.meta ?? {};
  const stored = meta.materialDoc as MaterialDocument | undefined;

  const blendRaw = meta.blend === 'alpha' || meta.blend === 'additive' ? meta.blend : null;
  const techFromMeta = typeof meta.techIdx === 'number' ? meta.techIdx : null;
  const techIdx = stored?.techIdx
    ?? techFromMeta
    ?? (blendRaw ? techIdxFromBlend(blendRaw) : 1);
  const blend = blendRaw ?? blendFromTechIdx(techIdx === 0 ? 0 : 1);

  if (stored && typeof stored === 'object') {
    const doc: MaterialDocument = {
      effect: resolveEffectRef(meta, stored.effect),
      techIdx: typeof stored.techIdx === 'number' ? stored.techIdx : techIdx,
      defines: normalizeDefines(stored.defines),
      states: Array.isArray(stored.states) && stored.states.length > 0
        ? stored.states.map((s) => normalizePassState(s, blend))
        : [defaultPassState(blend)],
      props: normalizeProps(stored.props),
      mainTextureAssetId: stored.mainTextureAssetId
        ?? (typeof meta.mainTextureAssetId === 'string' ? meta.mainTextureAssetId : undefined)
    };
    // Ensure tint exists in props[0] when only legacy tintColor mirror is set
    if (meta.tintColor && !doc.props[0]?.tintColor) {
      doc.props[0] = {
        ...doc.props[0],
        tintColor: { __type__: 'cc.Color', ...normalizeTintColor(meta.tintColor) }
      };
    }
    return doc;
  }

  const props: Record<string, unknown> = {
    tintColor: { __type__: 'cc.Color', ...normalizeTintColor(meta.tintColor) }
  };
  if (typeof meta.mainTextureUuid === 'string' && meta.mainTextureUuid) {
    props.mainTexture = { __uuid__: meta.mainTextureUuid };
  }

  return {
    effect: resolveEffectRef(meta),
    techIdx: techIdx === 0 ? 0 : Math.max(0, techIdx),
    defines: [{}],
    states: [defaultPassState(blend)],
    props: [props],
    mainTextureAssetId: typeof meta.mainTextureAssetId === 'string'
      ? meta.mainTextureAssetId
      : undefined
  };
}

/** Compat mirrors written alongside materialDoc. */
export function syncCompatMirrors(doc: MaterialDocument): NonNullable<AssetEntry['meta']> {
  const tint = readTintFromProps(doc.props);
  const mainTextureUuid = readMainTextureUuidFromProps(doc.props);
  const effectUuid = effectUuidOf(doc.effect);
  const techIdx = doc.techIdx;
  const blend = blendFromTechIdx(techIdx === 0 ? 0 : (techIdx === 1 ? 1 : 1));
  // For non-particle effects, still derive blend from techIdx 0/1 heuristic when possible
  const blendMode: ParticleBlendMode = techIdx === 0 ? 'alpha' : 'additive';

  const patch: NonNullable<AssetEntry['meta']> = {
    materialDoc: doc,
    effectUuid,
    techIdx,
    blend: blendMode,
    tintColor: tint,
    mainTextureAssetId: doc.mainTextureAssetId,
    mainTextureUuid
  };

  if (doc.effect.kind === 'shader-asset') {
    patch.effectShaderAssetId = doc.effect.assetId;
  } else {
    patch.effectShaderAssetId = undefined;
  }

  return patch;
}

export function materialDocumentMetaPatch(
  updater: MaterialDocument | ((prev: MaterialDocument) => MaterialDocument),
  currentAsset?: AssetEntry | null
): NonNullable<AssetEntry['meta']> {
  const prev = getMaterialDocument(currentAsset ?? null);
  const next = typeof updater === 'function' ? updater(prev) : updater;
  return syncCompatMirrors(next);
}

export function getEffectUuid(doc: MaterialDocument): string {
  return effectUuidOf(doc.effect);
}

export function particleConfigFromDocument(doc: MaterialDocument): ParticleMaterialConfig {
  return {
    effectUuid: effectUuidOf(doc.effect),
    techIdx: doc.techIdx === 0 ? 0 : doc.techIdx,
    blend: doc.techIdx === 0 ? 'alpha' : 'additive',
    tintColor: readTintFromProps(doc.props),
    mainTextureAssetId: doc.mainTextureAssetId,
    mainTextureUuid: readMainTextureUuidFromProps(doc.props)
  };
}

export function setTintOnDocument(doc: MaterialDocument, tint: ReturnType<typeof normalizeTintColor>): MaterialDocument {
  const props = [...doc.props];
  const first = { ...(props[0] ?? {}) };
  first.tintColor = { __type__: 'cc.Color', ...tint };
  props[0] = first;
  return { ...doc, props };
}

export function setPass0(doc: MaterialDocument, pass: PassState): MaterialDocument {
  const states = [...doc.states];
  states[0] = pass;
  return { ...doc, states };
}

export function setDefines0(
  doc: MaterialDocument,
  defines0: Record<string, boolean | number | string>
): MaterialDocument {
  const defines = [...doc.defines];
  defines[0] = defines0;
  return { ...doc, defines };
}
