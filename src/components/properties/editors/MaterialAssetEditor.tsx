import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { blendModeLabel } from '@/utils/material-blend';
import { formatMaterialSourcePreview } from '@/utils/mtl-io';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import {
  getParticleMaterialConfig,
  particleMaterialMetaPatch,
  techniqueLabel,
  tintFromCssHex,
  tintToCssHex
} from '@/utils/particle-material';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle,
  monoBlockStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';
import { AssetSlot } from '@/components/inspector/AssetSlot';
import { BUILTIN_PARTICLE_EFFECT_UUID } from '@/types/material';

interface MaterialAssetEditorProps {
  asset: AssetEntry;
}

export const MaterialAssetEditor: React.FC<MaterialAssetEditorProps> = ({ asset }) => {
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const { showToastMessage } = useAppStore();
  const editable = isProjectEditableAsset(asset);
  const config = useMemo(() => getParticleMaterialConfig(asset), [asset]);

  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.meta?.description ?? '');
  const [alpha, setAlpha] = useState(config.tintColor.a);

  useEffect(() => {
    setName(asset.name);
    setDescription(asset.meta?.description ?? '');
    setAlpha(config.tintColor.a);
  }, [asset.id, asset.name, asset.meta?.description, config.tintColor.a]);

  const sourcePreview = useMemo(() => formatMaterialSourcePreview(asset), [asset]);

  const patchMaterial = useCallback((
    patch: Parameters<typeof particleMaterialMetaPatch>[0],
    toast?: string
  ) => {
    if (!editable) return;
    updateProjectAsset(asset.id, { meta: particleMaterialMetaPatch(patch) });
    if (toast) showToastMessage(toast);
  }, [asset.id, editable, updateProjectAsset, showToastMessage]);

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

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="Effect">
        <FieldLabel label="Effect Asset">
          <input
            style={{ ...textInputStyle, opacity: 0.75 }}
            value="builtin-particle (Cocos)"
            readOnly
            title={config.effectUuid || BUILTIN_PARTICLE_EFFECT_UUID}
          />
        </FieldLabel>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
          {config.effectUuid || BUILTIN_PARTICLE_EFFECT_UUID}
        </div>
      </AssetEditorSection>

      <AssetEditorSection title="Technique">
        <FieldLabel label="Technique">
          <select
            className="select-sm"
            style={{ width: '100%' }}
            disabled={!editable}
            value={config.techIdx}
            onChange={(e) => {
              const techIdx = parseInt(e.target.value, 10) === 0 ? 0 : 1;
              patchMaterial({ techIdx }, `Technique：${techniqueLabel(techIdx)}`);
            }}
          >
            <option value={0}>0 — transparent (Alpha Blend)</option>
            <option value={1}>1 — additive</option>
          </select>
        </FieldLabel>
        <div style={{ fontSize: 11, color: 'var(--accent)' }}>
          {blendModeLabel(config.blend)}
        </div>
      </AssetEditorSection>

      <AssetEditorSection title="Props">
        <FieldLabel label="tintColor">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              disabled={!editable}
              value={tintToCssHex(config.tintColor)}
              onChange={(e) => {
                patchMaterial({ tintColor: tintFromCssHex(e.target.value, alpha) });
              }}
              style={{ width: 42, height: 28, padding: 0, border: '1px solid var(--border-color)', background: 'transparent' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>
              RGB {config.tintColor.r}, {config.tintColor.g}, {config.tintColor.b}
            </span>
          </div>
        </FieldLabel>
        <FieldLabel label="tintColor.a (0–255)">
          <input
            type="number"
            min={0}
            max={255}
            disabled={!editable}
            style={textInputStyle}
            value={alpha}
            onChange={(e) => setAlpha(Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)))}
            onBlur={() => {
              if (!editable) return;
              patchMaterial({
                tintColor: { ...config.tintColor, a: alpha }
              });
            }}
          />
        </FieldLabel>
        <div style={{ marginBottom: 4 }}>
          <AssetSlot
            slot="mainTexture"
            label="mainTexture（可选，覆盖发射器贴图）"
            assetId={config.mainTextureAssetId}
            onChange={(id) => {
              if (!editable) return;
              patchMaterial({ mainTextureAssetId: id }, id ? '已设置材质贴图' : '已清除材质贴图');
            }}
          />
          {!editable && config.mainTextureAssetId && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              当前：{config.mainTextureAssetId}
            </div>
          )}
          {config.mainTextureUuid && !config.mainTextureAssetId && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              导入 UUID：{config.mainTextureUuid}
            </div>
          )}
        </div>
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
