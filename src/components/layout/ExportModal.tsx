import React, { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import {
  exportProjectToCocos,
  exportToCocosProject,
  generateProjectPrefab,
  generatePrefab,
  buildProjectExportManifest
} from '@/utils/export-pipeline';
import { getCompatibilityReport, exportToEngine } from '@/utils/multi-engine-export';
import type { TargetEngine } from '@/utils/multi-engine-export';
import type { Particle3DConfig } from '@/types/effect';
import { getEmitterNodes } from '@/utils/preview-sources';

const ENGINE_OPTIONS: { value: TargetEngine; label: string }[] = [
  { value: 'cocos', label: 'Cocos Creator 3.8' },
  { value: 'unity', label: 'Unity 2022+' },
  { value: 'godot', label: 'Godot 4.x' },
];

export const ExportModal: React.FC = () => {
  const { cocosProjectPath, setCocosProjectPath, setExportOpen, showToastMessage } = useAppStore();
  const { currentEffect, project } = useProjectStore();
  const getAssetById = useAssetStore(s => s.getAssetById);
  const [projectPath, setProjectPath] = useState(cocosProjectPath);
  const [exporting, setExporting] = useState(false);
  const [targetEngine, setTargetEngine] = useState<TargetEngine>('cocos');
  const [result, setResult] = useState<{ success: boolean; paths: string[]; error?: string } | null>(null);

  const projectExportContext = useMemo(() => {
    if (!project) return undefined;
    return {
      projectAssets: project.assetRegistry,
      getAsset: getAssetById
    };
  }, [project, getAssetById]);

  const emitterCount = project ? getEmitterNodes(project.root).length : 0;

  const projectPreview = useMemo(() => {
    if (!project || targetEngine !== 'cocos') return null;
    return generateProjectPrefab(project, projectExportContext);
  }, [project, projectExportContext, targetEngine]);

  const exportManifest = useMemo(() => {
    if (!project || targetEngine !== 'cocos') return null;
    return buildProjectExportManifest(project, projectExportContext);
  }, [project, projectExportContext, targetEngine]);

  const compatibility = currentEffect && targetEngine !== 'cocos'
    ? getCompatibilityReport(currentEffect.config as Particle3DConfig, targetEngine)
    : [];

  const handleExport = useCallback(async () => {
    if (!project && !currentEffect) return;
    setExporting(true);
    setResult(null);

    if (targetEngine === 'cocos') {
      const res = project
        ? await exportProjectToCocos(project, projectPath || '', projectExportContext)
        : await exportToCocosProject(currentEffect!, projectPath || '');
      setResult(res);
      if (res.success) showToastMessage(`导出成功！${res.paths.length} 个文件`);
    } else if (currentEffect) {
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
  }, [project, currentEffect, targetEngine, projectPath, showToastMessage, projectExportContext]);

  const handleSelectPath = useCallback(async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.openDirectory();
      if (dir) {
        setProjectPath(dir);
        setCocosProjectPath(dir);
      }
    } else {
      const input = prompt('请输入 Cocos Creator 项目路径：');
      if (input) {
        setProjectPath(input);
        setCocosProjectPath(input);
      }
    }
  }, [setCocosProjectPath]);

  if (!project && !currentEffect) return null;

  const exportName = project?.name ?? currentEffect!.name;

  return (
    <div className="modal-overlay" onClick={() => setExportOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 480 }}>
        <h2>📤 导出到 Cocos Creator</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>项目名称</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{exportName}</div>
        </div>

        {project && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>粒子发射器</div>
            <div>{emitterCount} 个</div>
          </div>
        )}

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

        {exportManifest && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              导出资产清单
              <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                {exportManifest.emitterCount} 发射器 · {exportManifest.totalFileCount} 个文件
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>类型</th>
                  <th style={{ padding: '4px 6px' }}>文件</th>
                  <th style={{ padding: '4px 6px' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {exportManifest.items.map((item) => (
                  <tr key={item.fileName} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      {item.category === 'prefab' ? 'Prefab' : item.category === 'texture' ? '贴图' : '材质'}
                    </td>
                    <td style={{ padding: '4px 6px', wordBreak: 'break-all' }}>
                      {item.fileName}
                      <div style={{ color: 'var(--text-secondary)' }}>{item.metaFileName}</div>
                    </td>
                    <td style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>{item.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {exportManifest.emitterSummaries.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>发射器引用</div>
                {exportManifest.emitterSummaries.map((summary, i) => (
                  <div key={i} style={{ marginBottom: 2, color: 'var(--text-secondary)' }}>
                    贴图 {summary.textureAssetName} · 材质 {summary.materialName}（{summary.materialBlend}）
                  </div>
                ))}
              </div>
            )}
            {projectPath && (
              <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                目标目录：{projectPath}/{exportManifest.targetSubdir}
              </div>
            )}
          </div>
        )}

        {!exportManifest && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div>导出文件：</div>
          <div>• {exportName}.prefab</div>
          <div>• {exportName}.prefab.meta</div>
          {projectPreview?.assetFiles.map((asset) => (
            <React.Fragment key={asset.fileName}>
              <div>• {asset.fileName}</div>
              <div>• {asset.metaFileName}</div>
            </React.Fragment>
          ))}
          {!project && currentEffect && (
            <>
              <div>• {currentEffect.name}-particle.mtl</div>
              <div>• {generatePrefab(currentEffect).textureFileName}</div>
            </>
          )}
        </div>
        )}
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
