import React, { useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSessionStore } from '@/stores/session-store';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NodeEditor } from '@/components/editor/NodeEditor';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { SessionsPanel } from '@/components/layout/SessionsPanel';
import { ShaderEditor } from '@/components/editor/ShaderEditor';
import { AnimationEditor } from '@/components/editor/AnimationEditor';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { ExportModal } from '@/components/layout/ExportModal';
import { usePrefabImport } from '@/hooks/usePrefabImport';

const App: React.FC = () => {
  const {
    effectType, appMode, previewVisible, templateLibraryOpen,
    settingsOpen, exportOpen, showToast, isStreaming, activePanel,
    setEffectType, setPreviewVisible, setTemplateLibraryOpen,
    setSettingsOpen, setExportOpen, setActivePanel, showToastMessage
  } = useAppStore();

  const {
    sessions, currentEffect, createSession, syncEffectToSession
  } = useSessionStore();

  const {
    isDragOver, fileInputRef,
    handleImportClick, handleFileChange,
    handleDragOver, handleDragLeave, handleDrop
  } = usePrefabImport();

  // Initialize default session on first load
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  const handleNewEffect = useCallback(() => {
    createSession();
  }, [createSession]);

  const handleExport = useCallback(() => {
    if (currentEffect) setExportOpen(true);
  }, [currentEffect, setExportOpen]);

  if (templateLibraryOpen) {
    return <TemplateLibrary />;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={handleNewEffect} title="新建特效">+ 新建</button>
        <button onClick={handleImportClick} title="导入 .prefab">📥 导入</button>
        <button onClick={() => {
          if (currentEffect) {
            syncEffectToSession();
            showToastMessage('模板保存功能将在后续版本中提供');
          }
        }} title="保存为模板">💾 保存</button>
        <button onClick={() => setTemplateLibraryOpen(true)} title="模板库">
          📁 模板库
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".prefab"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <select
          value={effectType}
          onChange={(e) => setEffectType(e.target.value as any)}
          style={{ width: 120 }}
        >
          <option value="particle3d">3D 粒子</option>
          <option value="particle2d">2D 粒子</option>
          <option value="shader">Shader</option>
          <option value="animation">动画</option>
        </select>
        <button
          onClick={() => setPreviewVisible(!previewVisible)}
          title={previewVisible ? '隐藏预览' : '显示预览'}
        >
          {previewVisible ? '👁 预览' : '👁‍🗨 预览'}
        </button>
        <div className="spacer" />
        <button
          onClick={handleExport}
          disabled={!currentEffect || isStreaming}
          title="导出"
        >
          📤 导出
        </button>
        <button onClick={() => setSettingsOpen(true)} title="设置">⚙</button>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(88, 166, 255, 0.15)',
            border: '2px dashed var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none',
            fontSize: 18,
            color: 'var(--accent)',
            fontWeight: 600
          }}>
            📥 释放以导入 .prefab 文件
          </div>
        )}
        {/* Left: Chat / Sessions Panel */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            {(['chat', 'sessions', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: 12,
                  fontWeight: activePanel === tab ? 600 : 400,
                  background: activePanel === tab ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  borderBottom: activePanel === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRadius: 0,
                  color: activePanel === tab ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                {tab === 'chat' ? '💬 对话' : tab === 'sessions' ? '📁 会话' : '📜 历史'}
              </button>
            ))}
          </div>
          {activePanel === 'chat' && <ChatPanel />}
          {activePanel === 'sessions' && <SessionsPanel />}
          {activePanel === 'history' && (
            <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
              版本历史将在后续版本中提供
            </div>
          )}
        </div>

        {/* Center: Node Editor + Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {effectType === 'shader' ? <ShaderEditor /> : effectType === 'animation' ? <AnimationEditor /> : <NodeEditor />}
          </div>
          {previewVisible && (
            <div style={{ height: 280, borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
              <PreviewPanel />
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border-color)' }}>
          <InspectorPanel />
        </div>
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <span>特效：{currentEffect?.name || '无'}</span>
        <span>|</span>
        <span>类型：{effectType === 'particle3d' ? '3D 粒子' : effectType}</span>
        <span>|</span>
        {appMode === 'demo' ? (
          <span className="badge badge-demo">Demo 模式</span>
        ) : (
          <span className="badge badge-llm">LLM 模式</span>
        )}
        <span>|</span>
        <span className={`status-dot ${isStreaming ? 'generating' : 'ready'}`} />
        <span>{isStreaming ? '生成中...' : '就绪'}</span>
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal />}
      {exportOpen && <ExportModal />}

      {/* Toast */}
      {showToast && <div className="toast">{showToast}</div>}
    </>
  );
};

export default App;
