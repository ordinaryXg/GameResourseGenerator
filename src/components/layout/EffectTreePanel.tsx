import React, { useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAppStore } from '@/stores/app-store';
import { MODULE_DEFS } from '@/constants/modules';
import type { Particle3DConfig } from '@/types/effect';

export const EffectTreePanel: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    currentEffect,
    createSession,
    switchSession
  } = useSessionStore();
  const { selectedModuleKey, setSelectedModuleKey } = useAppStore();

  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(activeSessionId ? [activeSessionId] : []));

  const filtered = search
    ? sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectEffect = useCallback((id: string) => {
    switchSession(id);
    setExpandedIds(prev => new Set(prev).add(id));
  }, [switchSession]);

  const handleSelectModule = useCallback((sessionId: string, moduleKey: string) => {
    if (sessionId !== activeSessionId) switchSession(sessionId);
    setSelectedModuleKey(moduleKey);
  }, [activeSessionId, switchSession, setSelectedModuleKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span>特效总览</span>
        <button
          onClick={() => createSession()}
          className="btn-sm"
          style={{ marginLeft: 'auto' }}
          title="新建特效"
        >
          + 新建
        </button>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索特效..."
          style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 8px' }}>
        {filtered.map(session => {
          const isActive = session.id === activeSessionId;
          const expanded = expandedIds.has(session.id);
          const config = (isActive ? currentEffect?.config : session.effect.config) as Particle3DConfig | undefined;

          return (
            <div key={session.id}>
              <div
                onClick={() => handleSelectEffect(session.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <span
                  onClick={(e) => toggleExpand(session.id, e)}
                  style={{ width: 14, fontSize: 10, color: 'var(--text-secondary)', userSelect: 'none' }}
                >
                  {expanded ? '▼' : '▶'}
                </span>
                <span style={{ flex: 1 }}>{session.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  {session.effect.type === 'particle3d' ? '3D' : session.effect.type}
                </span>
              </div>

              {expanded && config && (
                <div style={{ paddingLeft: 24 }}>
                  {MODULE_DEFS.map(def => {
                    const mod = config[def.key as keyof Particle3DConfig] as { enabled?: boolean } | undefined;
                    const enabled = mod?.enabled !== false;
                    const selected = isActive && selectedModuleKey === def.key;

                    return (
                      <div
                        key={def.key}
                        onClick={() => handleSelectModule(session.id, def.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)',
                          opacity: enabled ? 1 : 0.55,
                          background: selected ? 'rgba(88,166,255,0.12)' : 'transparent',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: enabled ? def.color : 'var(--border-color)',
                          flexShrink: 0
                        }} />
                        {def.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
