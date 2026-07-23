import React, { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import { exportToCocosProject, generatePrefab } from '@/utils/export-pipeline';
import { buildExportAssetSummary } from '@/utils/asset-texture-export';
import { getCompatibilityReport, exportToEngine } from '@/utils/multi-engine-export';
import type { TargetEngine } from '@/utils/multi-engine-export';
import type { Particle3DConfig } from '@/types/effect';
import { findNodeById, getFirstEmitter } from '@/utils/project-tree';
import { isEmitterNode } from '@/types/project';

const ENGINE_OPTIONS: { value: TargetEngine; label: string }[] = [
  { value: 'cocos', label: 'Cocos Creator 3.8' },
  { value: 'unity', label: 'Unity 2022+' },
  { value: 'godot', label: 'Godot 4.x' },
];

export const ExportModal: React.FC = () => {
  const { cocosProjectPath, setCocosProjectPath, setExportOpen, showToastMessage } = useAppStore();
  const { currentEffect, project, selectedNodeId } = useProjectStore();
  const getAssetById = useAssetStore(s => s.getAssetById);
  const [projectPath, setProjectPath] = useState(cocosProjectPath);
  const [exporting, setExporting] = useState(false);
  const [targetEngine, setTargetEngine] = useState<TargetEngine>('cocos');
  const [result, setResult] = useState<{ success: boolean; paths: string[]; error?: string } | null>(null);

  const compatibility = currentEffect && targetEngine !== 'cocos'
    ? getCompatibilityReport(currentEffect.config as Particle3DConfig, targetEngine)
    : [];

  const exportContext = useMemo(() => {
    if (!project) return undefined;
    const node = selectedNodeId
      ? findNodeById(project.root, selectedNodeId)
      : getFirstEmitter(project.root);
    if (!node || !isEmitterNode(node)) return undefined;
    return {
      assetRefs: node.assetRefs,
      projectAssets: project.assetRegistry,
      getAsset: getAssetById
    };
  }, [project, selectedNodeId, getAssetById]);

  const assetSummary = useMemo(() => {
    if (!project || !exportContext) return null;
    return buildExportAssetSummary(
      exportContext.assetRefs,
      project.assetRegistry,
      getAssetById
    );
  }, [project, exportContext, getAssetById]);

  const prefabPreview = useMemo(() => {
    if (!currentEffect || targetEngine !== 'cocos') return null;
    return generatePrefab(currentEffect, exportContext);
  }, [currentEffect, exportContext, targetEngine]);

  const handleExport = useCallback(async () => {
    if (!currentEffect) return;
    setExporting(true);
    setResult(null);

    if (targetEngine === 'cocos') {
      const res = await exportToCocosProject(currentEffect, projectPath || '', exportContext);
      setResult(res);
      if (res.success) showToastMessage(`导出成功！${res.paths.length} 个文件`);
    } else {
      const exp = exportToEngine(currentEffect.config as Particle3DConfig, currentEffect.name, targetEngine);
      const blob = new Blob([exp.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exp.filename;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ success: true, paths: [exp.filename] });
      showToastMessage(`${exp.filename} 导出成功`);
    }

    setExporting(false);
  }, [currentEffect, targetEngine, projectPath, showToastMessage, exportContext]);

  const handleSelectPath = useCallback(async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.openDirectory();
      if (dir) {
        setProjectPath(dir);
        setCocosProjectPath(dir);
      }
    } else {
      // Web fallback
      const input = prompt('请输入 Cocos Creator 项目路径：');
      if (input) {
        setProjectPath(input);
        setCocosProjectPath(input);
      }
    }
  }, [setCocosProjectPath]);

  if (!currentEffect) return null;

  return (
    <div className="modal-overlay" onClick={() => setExportOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 480 }}>
        <h2>📤 导出到 Cocos Creator</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>特效名称</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{currentEffect.name}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>特效类型</div>
          <div>{currentEffect.type === 'particle3d' ? '3D 粒子' : currentEffect.type}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>目标引擎</div>
          <select
            value={targetEngine}
            onChange={(e) => setTargetEngine(e.target.value as TargetEngine)}
            style={{ width: '100%' }}
          >
            {ENGINE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {compatibility.length > 0 && (
          <div style={{
            marginBottom: 16, padding: 12, background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)', fontSize: 12
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>兼容性报告</div>
            {compatibility.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                <span>{item.status === 'full' ? '✅' : item.status === 'partial' ? '⚠️' : '❌'}</span>
                <span style={{ flex: 1 }}>{item.module}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{item.note}</span>
              </div>
            ))}
          </div>
        )}

        {targetEngine === 'cocos' && (<>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Cocos Creator 项目路径</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/MyCocosGame"
              style={{ flex: 1 }}
            />
            <button onClick={handleSelectPath}>📁 选择</button>
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div>导出文件：</div>
          <div>• {currentEffect.name}.prefab</div>
          <div>• {currentEffect.name}.prefab.meta</div>
          <div>• {currentEffect.name}-particle.mtl</div>
          <div>• {currentEffect.name}-particle.mtl.meta</div>
          <div>• {prefabPreview?.textureFileName ?? 'particle-circle.png'}</div>
          <div>• {(prefabPreview?.textureFileName ?? 'particle-circle.png')}.meta</div>
          {assetSummary && (
            <div style={{
              marginTop: 8,
              padding: 8,
              background: 'var(--bg-tertiary)',
              borderRadius: 6,
              fontSize: 12
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>资产引用（与预览一致）</div>
              <div>贴图：{assetSummary.textureAssetName}</div>
              <div>材质：{assetSummary.materialName}（{assetSummary.materialBlend}）</div>
            </div>
          )}
          {projectPath && (
            <div style={{ marginTop: 4 }}>
              目标路径：assets/effects/{currentEffect.id.substring(0, 8)}-/
            </div>
          )}
        </div>
        </>)}

        <div style={{ marginBottom: 16 }}>
          <button
            className="primary"
            onClick={handleExport}
            disabled={exporting || !projectPath}
            style={{ width: '100%', padding: '10px' }}
          >
            {exporting ? '导出中...' : '导出到 Cocos Creator'}
          </button>
        </div>

        {result && (
          <div style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: result.success ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${result.success ? 'var(--success)' : 'var(--error)'}`,
            fontSize: 13
          }}>
            {result.success ? (
              <>
                <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>✅ 导出成功！</div>
                {result.paths.map((p, i) => (
                  <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 12, wordBreak: 'break-all' }}>
                    {p}
                  </div>
                ))}
              </>
            ) : (
              <div style={{ color: 'var(--error)' }}>❌ {result.error}</div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={() => setExportOpen(false)}>关闭</button>
        </div>
      </div>
    </div>
  );
};
