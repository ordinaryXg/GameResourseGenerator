import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import type { CullMode, MaterialDocument, PassState } from '@/types/material';
import {
  BLEND_FACTOR_OPTIONS,
  BUILTIN_PARTICLE_EFFECT_UUID
} from '@/types/material';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import { useAppStore } from '@/stores/app-store';
import { blendModeLabel } from '@/utils/material-blend';
import { formatMaterialSourcePreview } from '@/utils/mtl-io';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import {
  getMaterialDocument,
  materialDocumentMetaPatch,
  particleConfigFromDocument,
  setPass0
} from '@/utils/material-document';
import { resolveEffectSchema } from '@/utils/effect-schema';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle,
  monoBlockStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';
import { MaterialSchemaFields } from '@/components/properties/editors/MaterialSchemaFields';

interface MaterialAssetEditorProps {
  asset: AssetEntry;
}

type EffectMode = 'builtin' | 'shader' | 'external';

function effectModeOf(doc: MaterialDocument): EffectMode {
  if (doc.effect.kind === 'shader-asset') return 'shader';
  if (doc.effect.kind === 'external-uuid') return 'external';
  return 'builtin';
}

export const MaterialAssetEditor: React.FC<MaterialAssetEditorProps> = ({ asset }) => {
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const getMergedAssets = useAssetStore(s => s.getMergedAssets);
  const getAssetById = useAssetStore(s => s.getAssetById);
  const { showToastMessage } = useAppStore();
  const editable = isProjectEditableAsset(asset);
  const doc = useMemo(() => getMaterialDocument(asset), [asset]);
  const config = useMemo(() => particleConfigFromDocument(doc), [doc]);
  const schema = useMemo(
    () => resolveEffectSchema(doc, getAssetById),
    [doc, getAssetById]
  );
  const shaders = useMemo(
    () => getMergedAssets().filter(a => a.type === 'shader'),
    [getMergedAssets, asset]
  );

  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.meta?.description ?? '');
  const [externalUuid, setExternalUuid] = useState(
    doc.effect.kind === 'external-uuid' ? doc.effect.uuid : ''
  );

  useEffect(() => {
    setName(asset.name);
    setDescription(asset.meta?.description ?? '');
    setExternalUuid(doc.effect.kind === 'external-uuid' ? doc.effect.uuid : '');
  }, [asset.id, asset.name, asset.meta?.description, doc.effect]);

  const sourcePreview = useMemo(() => formatMaterialSourcePreview(asset), [asset]);
  const pass0: PassState = doc.states[0] ?? {
    rasterizerState: { cullMode: 'none' },
    depthStencilState: { depthTest: true, depthWrite: false },
    blendState: { targets: [{ blend: true, blendSrc: 770, blendDst: 1 }] }
  };
  const mode = effectModeOf(doc);

  const commitDoc = useCallback((
    updater: (prev: MaterialDocument) => MaterialDocument,
    toast?: string
  ) => {
    if (!editable) return;
    updateProjectAsset(asset.id, {
      meta: materialDocumentMetaPatch(updater, asset)
    });
    if (toast) showToastMessage(toast);
  }, [asset, editable, updateProjectAsset, showToastMessage]);

  const commitName = useCallback(() => {
    const v = name.trim();
    if (!v || v === asset.name || !editable) return;
    updateProjectAsset(asset.id, { name: v });
    showToastMessage('已更新材质名称');
  }, [name, asset.id, asset.name, editable, updateProjectAsset, showToastMessage]);

  const commitDescription = useCallback(() => {
    if (!editable) return;
    updateProjectAsset(asset.id, { meta: { ...asset.meta, description: description.trim() } });
  }, [asset, description, editable, updateProjectAsset]);

  const updatePass0 = useCallback((patch: Partial<{
    cullMode: CullMode;
    depthTest: boolean;
    depthWrite: boolean;
    blend: boolean;
    blendSrc: number;
    blendDst: number;
  }>) => {
    commitDoc((prev) => {
      const cur = prev.states[0] ?? pass0;
      const target = { ...(cur.blendState.targets[0] ?? {}) };
      if (patch.blend !== undefined) target.blend = patch.blend;
      if (patch.blendSrc !== undefined) target.blendSrc = patch.blendSrc;
      if (patch.blendDst !== undefined) target.blendDst = patch.blendDst;
      return setPass0(prev, {
        rasterizerState: {
          cullMode: patch.cullMode ?? cur.rasterizerState.cullMode ?? 'none'
        },
        depthStencilState: {
          depthTest: patch.depthTest ?? cur.depthStencilState.depthTest ?? true,
          depthWrite: patch.depthWrite ?? cur.depthStencilState.depthWrite ?? false,
          stencilTest: cur.depthStencilState.stencilTest
        },
        blendState: { targets: [target] }
      });
    });
  }, [commitDoc, pass0]);

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="Effect">
        <FieldLabel label="Effect 来源">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={mode}
            onChange={(e) => {
              const next = e.target.value as EffectMode;
              commitDoc((prev) => {
                if (next === 'builtin') {
                  return {
                    ...prev,
                    effect: { kind: 'builtin-uuid', uuid: BUILTIN_PARTICLE_EFFECT_UUID }
                  };
                }
                if (next === 'shader') {
                  const first = shaders[0];
                  return {
                    ...prev,
                    effect: first
                      ? { kind: 'shader-asset', assetId: first.id, uuid: first.meta?.uuid }
                      : { kind: 'shader-asset', assetId: '', uuid: undefined }
                  };
                }
                return {
                  ...prev,
                  effect: {
                    kind: 'external-uuid',
                    uuid: externalUuid || BUILTIN_PARTICLE_EFFECT_UUID
                  }
                };
              }, '已更新 Effect 来源');
            }}
          >
            <option value="builtin">Builtin Particle Effect</option>
            <option value="shader">项目 Shader 资产</option>
            <option value="external">外部 UUID</option>
          </select>
        </FieldLabel>

        {mode === 'shader' && (
          <FieldLabel label="Shader 资产">
            <select
              className="select-sm"
              style={{ width: '100%' }}
              disabled={!editable}
              value={doc.effect.kind === 'shader-asset' ? doc.effect.assetId : ''}
              onChange={(e) => {
                const id = e.target.value;
                const sh = shaders.find(s => s.id === id);
                commitDoc((prev) => ({
                  ...prev,
                  effect: { kind: 'shader-asset', assetId: id, uuid: sh?.meta?.uuid }
                }));
              }}
            >
              <option value="">（未选择）</option>
              {shaders.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FieldLabel>
        )}

        {mode === 'external' && (
          <FieldLabel label="Effect UUID">
            <input
              style={textInputStyle}
              disabled={!editable}
              value={externalUuid}
              onChange={(e) => setExternalUuid(e.target.value)}
              onBlur={() => {
                const uuid = externalUuid.trim();
                if (!uuid) return;
                commitDoc((prev) => ({
                  ...prev,
                  effect: { kind: 'external-uuid', uuid }
                }), '已更新 Effect UUID');
              }}
            />
          </FieldLabel>
        )}

        <div style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
          UUID: {doc.effect.kind === 'shader-asset'
            ? (doc.effect.uuid || `${BUILTIN_PARTICLE_EFFECT_UUID}（导出将回退，B4 写 .effect）`)
            : (doc.effect.uuid || BUILTIN_PARTICLE_EFFECT_UUID)}
        </div>
      </AssetEditorSection>

      <AssetEditorSection title="Technique">
        <FieldLabel label="Technique">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={Math.min(doc.techIdx, Math.max(0, schema.techniques.length - 1))}
            onChange={(e) => {
              const techIdx = parseInt(e.target.value, 10) || 0;
              const techName = schema.techniques[techIdx]?.name ?? String(techIdx);
              commitDoc((prev) => ({ ...prev, techIdx }), `Technique：${techName}`);
            }}
          >
            {schema.techniques.map((t, i) => (
              <option key={`${t.name}-${i}`} value={i}>
                {i} — {t.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        {schema.techniques.length <= 2 && (
          <div style={{ fontSize: 11, color: 'var(--accent)' }}>
            {blendModeLabel(config.blend)}
          </div>
        )}
      </AssetEditorSection>

      <AssetEditorSection title="Pass States (Pass 0)">
        <FieldLabel label="Cull Mode">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={pass0.rasterizerState.cullMode ?? 'none'}
            onChange={(e) => updatePass0({ cullMode: e.target.value as CullMode })}
          >
            <option value="none">none</option>
            <option value="front">front</option>
            <option value="back">back</option>
          </select>
        </FieldLabel>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
          <input
            type="checkbox"
            disabled={!editable}
            checked={pass0.depthStencilState.depthTest !== false}
            onChange={(e) => updatePass0({ depthTest: e.target.checked })}
          />
          Depth Test
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
          <input
            type="checkbox"
            disabled={!editable}
            checked={!!pass0.depthStencilState.depthWrite}
            onChange={(e) => updatePass0({ depthWrite: e.target.checked })}
          />
          Depth Write
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
          <input
            type="checkbox"
            disabled={!editable}
            checked={pass0.blendState.targets[0]?.blend !== false}
            onChange={(e) => updatePass0({ blend: e.target.checked })}
          />
          Blend
        </label>
        <FieldLabel label="blendSrc">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={Number(pass0.blendState.targets[0]?.blendSrc ?? 770)}
            onChange={(e) => updatePass0({ blendSrc: parseInt(e.target.value, 10) })}
          >
            {BLEND_FACTOR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="blendDst">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={Number(pass0.blendState.targets[0]?.blendDst ?? 1)}
            onChange={(e) => updatePass0({ blendDst: parseInt(e.target.value, 10) })}
          >
            {BLEND_FACTOR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldLabel>
      </AssetEditorSection>

      <AssetEditorSection title="Defines & Props">
        <MaterialSchemaFields
          doc={doc}
          schema={schema}
          editable={editable}
          commitDoc={commitDoc}
        />
      </AssetEditorSection>

      {editable && (
        <AssetEditorSection title="编辑">
          <FieldLabel label="名称">
            <input
              style={textInputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
            />
          </FieldLabel>
          <FieldLabel label="说明">
            <textarea
              style={{ ...textInputStyle, minHeight: 56, resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
            />
          </FieldLabel>
        </AssetEditorSection>
      )}

      <AssetEditorSection title=".mtl 预览">
        <pre style={monoBlockStyle}>{sourcePreview}</pre>
      </AssetEditorSection>

      <AssetMetaFields asset={asset} />
    </div>
  );
};
