import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';

export const SessionsPanel: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    renameSession,
    duplicateSession,
    deleteSession
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredSessions = search
    ? sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const handleRename = useCallback((id: string, name: string) => {
    renameSession(id, name);
    setEditingId(null);
  }, [renameSession]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>📁 特效会话</span>
        <button
          onClick={() => createSession()}
          style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
          title="新建会话"
        >
          + 新建
        </button>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜索会话..."
          style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredSessions.map(session => (
          <div
            key={session.id}
            onClick={() => switchSession(session.id)}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderLeft: session.id === activeSessionId ? '3px solid var(--accent)' : '3px solid transparent',
              background: session.id === activeSessionId ? 'var(--bg-tertiary)' : 'transparent',
              transition: 'background 0.1s'
            }}
            onMouseEnter={(e) => {
              if (session.id !== activeSessionId) {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (session.id !== activeSessionId) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {editingId === session.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(session.id, editName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(session.id, editName);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  style={{ width: '100%', padding: '2px 6px', fontSize: 12 }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: session.id === activeSessionId ? 600 : 400,
                    color: session.id === activeSessionId ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(session.id);
                    setEditName(session.name);
                  }}
                >
                  {session.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {session.messages.length} 条消息 · {new Date(session.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingId(session.id); setEditName(session.name); }}
                style={{ fontSize: 10, padding: '1px 6px' }}
              >重命名</button>
              <button
                onClick={(e) => { e.stopPropagation(); duplicateSession(session.id); }}
                style={{ fontSize: 10, padding: '1px 6px' }}
              >复制</button>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  style={{ fontSize: 10, padding: '1px 6px', color: 'var(--error)' }}
                >删除</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
