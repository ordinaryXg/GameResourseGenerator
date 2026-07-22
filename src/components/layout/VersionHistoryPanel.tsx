import React from 'react';
import { useSessionStore } from '@/stores/session-store';

export const VersionHistoryPanel: React.FC = () => {
  const { sessions, activeSessionId, restoreVersion } = useSessionStore();
  const session = sessions.find(s => s.id === activeSessionId);
  const versions = session?.versionHistory || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 14 }}>
        📜 版本历史
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {versions.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
            生成特效后自动保存版本
          </div>
        ) : (
          [...versions].reverse().map((_v, i) => {
            const idx = versions.length - 1 - i;
            return (
              <div key={idx} onClick={() => restoreVersion(idx)} style={{
                padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-md)',
                marginBottom: 4, background: 'var(--bg-tertiary)', fontSize: 13,
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>v{idx + 1}</span>
                <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                  {versions[idx].name}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
