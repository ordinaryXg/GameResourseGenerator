import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssetEntry } from '@/types/asset';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { generateBuiltinShaderSource } from '@/utils/builtin-asset-content';
import { isProjectEditableAsset } from '@/utils/asset-editable';
import { EffectCodeEditor } from '@/components/properties/editors/EffectCodeEditor';
import {
  AssetEditorHeader,
  AssetEditorSection,
  AssetReadonlyBanner,
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';
import { AssetMetaFields } from '@/components/properties/editors/AssetMetaFields';

interface ShaderAssetEditorProps {
  asset: AssetEntry;
}

export const ShaderAssetEditor: React.FC<ShaderAssetEditorProps> = ({ asset }) => {
  const updateProjectAsset = useProjectStore(s => s.updateProjectAsset);
  const { showToastMessage, setEffectType, setShaderDraft } = useAppStore();
  const editable = isProjectEditableAsset(asset);

  const initialSource = useMemo(() => generateBuiltinShaderSource(asset), [asset]);
  const [source, setSource] = useState(initialSource);
  const [name, setName] = useState(asset.name);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSource(generateBuiltinShaderSource(asset));
    setName(asset.name);
    setDirty(false);
  }, [asset.id, asset.name, asset.meta?.shaderSource]);

  const commitSource = useCallback(() => {
    if (!editable || !dirty) return;
    updateProjectAsset(asset.id, { meta: { ...asset.meta, shaderSource: source } });
    setDirty(false);
    showToastMessage('已保存 Shader 源码');
  }, [asset, dirty, editable, source, updateProjectAsset, showToastMessage]);

  const commitName = useCallback(() => {
    const v = name.trim();
    if (!v || v === asset.name || !editable) return;
    updateProjectAsset(asset.id, { name: v });
    showToastMessage('已更新名称');
  }, [name, asset.id, asset.name, editable, updateProjectAsset, showToastMessage]);

  const openInWorkspace = useCallback(() => {
    setShaderDraft(source);
    setEffectType('shader');
    showToastMessage('已在 Shader 工作区打开');
  }, [source, setShaderDraft, setEffectType, showToastMessage]);

  const copySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
      showToastMessage('已复制 Shader 代码');
    } catch {
      showToastMessage('复制失败');
    }
  }, [source, showToastMessage]);

  return (
    <div style={{ padding: 10 }}>
      <AssetEditorHeader asset={asset} />
      {!editable && <AssetReadonlyBanner />}

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
        </AssetEditorSection>
      )}

      <AssetEditorSection title="Effect 源码">
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn-sm" style={{ fontSize: 10 }} onClick={() => { void copySource(); }}>
            复制
          </button>
          <button type="button" className="btn-sm" style={{ fontSize: 10 }} onClick={openInWorkspace}>
            在 Shader 工作区打开
          </button>
          {editable && dirty && (
            <button type="button" className="btn-sm" style={{ fontSize: 10 }} onClick={commitSource}>
              保存源码
            </button>
          )}
        </div>
        <EffectCodeEditor
          value={source}
          readOnly={!editable}
          minHeight={220}
          onChange={editable ? (v) => { setSource(v); setDirty(true); } : undefined}
        />
      </AssetEditorSection>

      <AssetMetaFields asset={asset} />
    </div>
  );
};
