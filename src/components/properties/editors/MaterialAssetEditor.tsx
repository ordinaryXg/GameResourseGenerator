import React, { useCallback, useMemo, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { blendModeLabel, getBlendModeFromMaterialAsset, type ParticleBlendMode } from '@/utils/material-blend';
import { generateBuiltinMaterialSource } from '@/utils/builtin-asset-content';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle,
  monoBlockStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';

interface MaterialAssetEditorProps {
  asset: AssetEntry;
}

export const MaterialAssetEditor: React.FC<MaterialAssetEditorProps> = ({ asset }) => {
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const { showToastMessage } = useAppStore();
  const editable = isProjectEditableAsset(asset);
  const blend = getBlendModeFromMaterialAsset(asset) ?? 'additive';

  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.meta?.description ?? '');

  const sourcePreview = useMemo(() => generateBuiltinMaterialSource(asset), [asset]);

  const setBlend = useCallback((mode: ParticleBlendMode) => {
    if (!editable) return;
    updateProjectAsset(asset.id, { meta: { ...asset.meta, blend: mode } });
    showToastMessage(`混合模式：${blendModeLabel(mode)}`);
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

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

      <AssetEditorSection title="混合模式">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {(['additive', 'alpha'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              disabled={!editable}
              onClick={() => setBlend(mode)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 6,
                cursor: editable ? 'pointer' : 'not-allowed',
                border: blend === mode ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                background: blend === mode ? 'rgba(88,166,255,0.12)' : 'var(--bg-tertiary)',
                fontSize: 10,
                color: blend === mode ? 'var(--accent)' : 'var(--text-secondary)'
              }}
            >
              {mode === 'additive' ? '加法 Additive' : '透明 Alpha'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--accent)' }}>{blendModeLabel(blend)}</div>
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
