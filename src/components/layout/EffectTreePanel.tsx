import React, { useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAppStore } from '@/stores/app-store';
import { MODULE_DEFS } from '@/constants/modules';
import { ContextMenu } from '@/components/layout/ContextMenu';
import type { Particle3DConfig } from '@/types/effect';

type MenuTarget =
  | { type: 'effect'; sessionId: string; x: number; y: number }
  | { type: 'module'; sessionId: string; moduleKey: string; x: number; y: number };

export const EffectTreePanel: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    currentEffect,
    switchSession,
    renameSession,
    duplicateSession,
    deleteSession,
    updateEffectConfig
  } = useSessionStore();
  const { selectedModuleKey, setSelectedModuleKey, setNewEffectModalOpen, showToastMessage } = useAppStore();

  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(activeSessionId ? [activeSessionId] : []));
  const [menu, setMenu] = useState<MenuTarget | null>(null);

  const filtered = search
    ? sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const toggleExpand = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const toggleModule = useCallback((moduleKey: string) => {
    if (!activeSessionId) return;
    updateEffectConfig((prev) => {
      const cfg = { ...(prev.config as Particle3DConfig) };
      const mod = cfg[moduleKey as keyof Particle3DConfig] as { enabled?: boolean };
      (cfg as Record<string, unknown>)[moduleKey] = { ...mod, enabled: !mod?.enabled };
      return { ...prev, config: cfg };
    });
  }, [activeSessionId, updateEffectConfig]);

  const getModuleEnabled = (sessionId: string, moduleKey: string): boolean => {
    const session = sessions.find(s => s.id === sessionId);
    const cfg = (sessionId === activeSessionId ? currentEffect?.config : session?.effect.config) as Particle3DConfig | undefined;
    if (!cfg) return true;
    const mod = cfg[moduleKey as keyof Particle3DConfig] as { enabled?: boolean } | undefined;
    return mod?.enabled !== false;
  };

  const menuItems = menu ? (
    menu.type === 'effect' ? [
      { label: '打开特效', onClick: () => handleSelectEffect(menu.sessionId) },
      { label: '重命名', onClick: () => {
        const session = sessions.find(s => s.id === menu.sessionId);
        const name = window.prompt('输入新名称', session?.name || '');
        if (name?.trim()) renameSession(menu.sessionId, name.trim());
      }},
      { label: '复制', onClick: () => duplicateSession(menu.sessionId) },
      { label: expandedIds.has(menu.sessionId) ? '折叠' : '展开', onClick: () => toggleExpand(menu.sessionId) },
      { label: '删除', danger: true, disabled: sessions.length <= 1, onClick: () => {
        deleteSession(menu.sessionId);
        showToastMessage('特效已删除');
      }}
    ] : [
      { label: '选中模块', onClick: () => handleSelectModule(menu.sessionId, menu.moduleKey) },
      { label: getModuleEnabled(menu.sessionId, menu.moduleKey) ? '禁用模块' : '启用模块',
        disabled: menu.sessionId !== activeSessionId,
        onClick: () => toggleModule(menu.moduleKey) },
      { label: '复制模块名', onClick: () => {
        const def = MODULE_DEFS.find(d => d.key === menu.moduleKey);
        if (def) navigator.clipboard?.writeText(def.label);
      }}
    ]
  ) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索特效..."
          style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}
        />
        <button
          onClick={() => setNewEffectModalOpen(true)}
          className="btn-sm"
          title="新建特效"
        >
          + 新建
        </button>
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ type: 'effect', sessionId: session.id, x: e.clientX, y: e.clientY });
                }}
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
                    const enabled = getModuleEnabled(session.id, def.key);
                    const selected = isActive && selectedModuleKey === def.key;

                    return (
                      <div
                        key={def.key}
                        onClick={() => handleSelectModule(session.id, def.key)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenu({ type: 'module', sessionId: session.id, moduleKey: def.key, x: e.clientX, y: e.clientY });
                        }}
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

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
};
