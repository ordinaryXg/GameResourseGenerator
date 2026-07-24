import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { PRESET_PROJECTS } from '@/data/preset-projects';
import {
  hasV1Sessions,
  loadV1Sessions,
  migrateSessionToProject,
  createCombinedMigrationProject,
  archiveV1Sessions
} from '@/utils/migrate-v1';

interface ProjectWelcomeProps {
  onProjectReady: () => void;
}

export const ProjectWelcome: React.FC<ProjectWelcomeProps> = ({ onProjectReady }) => {
  const {
    createNewProjectInFolder, newProjectFromPreset, openProjectFromJson, openProjectFolder, loadProjectData,
    openRecentProject, pruneRecentProjects,
    recentProjects, restoreAutosave
  } = useProjectStore();
  const [v1Count, setV1Count] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setV1Count(hasV1Sessions() ? loadV1Sessions().length : 0);
    void pruneRecentProjects();
  }, [pruneRecentProjects]);

  const handleNew = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await createNewProjectInFolder();
      if (result.ok) {
        onProjectReady();
        return;
      }
      if (result.reason === 'exists' || result.reason === 'error') {
        setError(result.message ?? '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (presetId: string) => {
    newProjectFromPreset(presetId);
    onProjectReady();
  };

  const handleOpen = async () => {
    setError(null);
    setLoading(true);
    try {
      if (window.electronAPI?.openProjectFolder) {
        const result = await openProjectFolder();
        if (result.ok) {
          onProjectReady();
          return;
        }
        if (result.reason === 'no-fxproj') {
          setError(result.message ?? '所选文件夹内没有 .fxproj 文件');
        }
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.fxproj';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const json = await file.text();
        openProjectFromJson(json, file.name);
        onProjectReady();
      };
      input.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreAutosave = () => {
    if (restoreAutosave()) onProjectReady();
    else setError('没有可用的自动保存');
  };

  const handleMigrateAll = () => {
    const sessions = loadV1Sessions();
    if (sessions.length === 0) return;
    const project = sessions.length === 1
      ? migrateSessionToProject(sessions[0])
      : createCombinedMigrationProject(sessions);
    loadProjectData(project);
    archiveV1Sessions();
    setV1Count(0);
    onProjectReady();
  };

  const handleOpenRecent = async (path: string) => {
    if (!window.electronAPI?.readFile) return;
    setLoading(true);
    setError(null);
    try {
      const result = await openRecentProject(path);
      if (result.ok) {
        onProjectReady();
        return;
      }
      const fileName = path.split(/[/\\]/).pop() ?? path;
      if (result.reason === 'missing') {
        setError(`项目文件不存在，已从最近列表移除：${fileName}`);
      } else {
        setError(result.message ?? `无法打开：${fileName}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 24
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 32
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img src="/icon.png" alt="" width={40} height={40} style={{ borderRadius: 8 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>FX Studio</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              最好用的特效制作软件 · 导出至 Cocos / Unity / Unreal
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '20px 0' }}>
          新建项目需先选择目标文件夹；也可从预设开始，或打开已有项目文件夹。
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>预设组合项目</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {PRESET_PROJECTS.map(preset => (
              <button
                key={preset.id}
                className="btn-sm"
                onClick={() => handlePreset(preset.id)}
                disabled={loading}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {preset.name}
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    fontWeight: 400
                  }}>
                    {preset.category} · 3 发射器
                  </span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-primary" onClick={handleNew} disabled={loading} style={{ padding: '10px 16px' }}>
            新建项目…
          </button>
          <button className="btn-sm" onClick={handleOpen} disabled={loading} style={{ padding: '10px 16px' }}>
            打开项目…
          </button>
          <button className="btn-sm" onClick={handleRestoreAutosave} style={{ padding: '8px 16px' }}>
            恢复自动保存
          </button>
        </div>

        {v1Count > 0 && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(88, 166, 255, 0.08)',
            border: '1px solid rgba(88, 166, 255, 0.25)',
            borderRadius: 8
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>发现 v1 旧数据</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              检测到 {v1Count} 个旧版会话，可一键迁移为 v2 项目（{v1Count === 1 ? '单发射器' : '合并为多发射器项目'}）。
            </div>
            <button className="btn-sm" onClick={handleMigrateAll}>迁移全部会话</button>
          </div>
        )}

        {recentProjects.length > 0 && window.electronAPI && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>最近项目</div>
            {recentProjects.map(path => (
              <button
                key={path}
                className="btn-sm"
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 4, fontSize: 11 }}
                onClick={() => handleOpenRecent(path)}
              >
                {path}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 12 }}>{error}</div>
        )}
      </div>
    </div>
  );
};
