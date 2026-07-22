import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { exportToCocosProject } from '@/utils/export-pipeline';

export const ExportModal: React.FC = () => {
  const { currentEffect, cocosProjectPath, setCocosProjectPath, setExportOpen, showToastMessage } = useAppStore();
  const [projectPath, setProjectPath] = useState(cocosProjectPath);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; paths: string[]; error?: string } | null>(null);

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

  const handleExport = useCallback(async () => {
    if (!currentEffect || !projectPath) return;

    setExporting(true);
    setResult(null);

    const res = await exportToCocosProject(currentEffect, projectPath);
    setResult(res);
    setExporting(false);

    if (res.success) {
      showToastMessage(`导出成功！${res.paths.length} 个文件`);
    }
  }, [currentEffect, projectPath, showToastMessage]);

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
          {projectPath && (
            <div style={{ marginTop: 4 }}>
              目标路径：assets/effects/{currentEffect.id.substring(0, 8)}-/
            </div>
          )}
        </div>

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
