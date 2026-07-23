import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { PRESET_PROJECTS } from '@/data/preset-projects';

export const PresetProjectsModal: React.FC = () => {
  const { presetProjectsOpen, setPresetProjectsOpen, showToastMessage } = useAppStore();
  const { newProjectFromPreset } = useProjectStore();

  if (!presetProjectsOpen) return null;

  const handlePick = (presetId: string, name: string) => {
    newProjectFromPreset(presetId);
    setPresetProjectsOpen(false);
    showToastMessage(`已打开组合预设：${name}`);
  };

  return (
    <div className="modal-overlay" onClick={() => setPresetProjectsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 520, maxWidth: 640 }}>
        <h2>📦 组合预设项目</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0 }}>
          多发射器组合特效，可直接编辑、换贴图并导出到 Cocos Creator。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRESET_PROJECTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn-sm"
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                height: 'auto',
                display: 'block',
                width: '100%'
              }}
              onClick={() => handlePick(preset.id, preset.name)}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{preset.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{preset.description}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {preset.category} · {preset.tags.join(' · ')}
              </div>
            </button>
          ))}
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button onClick={() => setPresetProjectsOpen(false)}>关闭</button>
        </div>
      </div>
    </div>
  );
};
