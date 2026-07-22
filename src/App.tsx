import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NodeEditor } from '@/components/editor/NodeEditor';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { SessionsPanel } from '@/components/layout/SessionsPanel';
import { ShaderEditor } from '@/components/editor/ShaderEditor';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { ExportModal } from '@/components/layout/ExportModal';
import { getDefaultEffectConfig, generateId } from '@/utils/effect-defaults';
import { parsePrefab } from '@/utils/prefab-importer';
import { useAppStore as appStore } from '@/stores/app-store';

const App: React.FC = () => {
  const {
    currentEffect,
    effectType,
    appMode,
    previewVisible,
    templateLibraryOpen,
    settingsOpen,
    exportOpen,
    showToast,
    isStreaming,
    activePanel,
    sessions,
    activeSessionId,
    setEffectType,
    setPreviewVisible,
    setTemplateLibraryOpen,
    setSettingsOpen,
    setExportOpen,
    resetEffect,
    setCurrentEffect,
    addMessage,
    showToastMessage,
    setActivePanel,
    createSession,
    syncCurrentEffectToSession
  } = useAppStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize default session on first load
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  const handleNewEffect = useCallback(() => {
    resetEffect();
  }, [resetEffect]);

  const handleExport = useCallback(() => {
    if (currentEffect) {
      setExportOpen(true);
    }
  }, [currentEffect, setExportOpen]);

  // .prefab import
  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parsePrefab(text);
      setCurrentEffect(result.effectConfig);
      addMessage({
        id: generateId(),
        role: 'system',
        content: `已导入：**${result.effectConfig.name}**${result.warnings.length > 0 ? `\n\n⚠ ${result.warnings.join('\n')}` : ''}`,
        timestamp: Date.now()
      });
      showToastMessage(`导入成功：${result.effectConfig.name}`);
      if (result.warnings.length > 0) {
        setTimeout(() => showToastMessage(result.warnings[0]), 2000);
      }
    } catch (err: any) {
      showToastMessage(`导入失败：${err.message}`);
    }
  }, [setCurrentEffect, addMessage, showToastMessage]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleImportFile);
    }
    e.target.value = '';
  }, [handleImportFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.prefab'));
    if (files.length === 0) {
      showToastMessage('仅支持导入 .prefab 文件');
      return;
    }
    files.forEach(handleImportFile);
  }, [handleImportFile, showToastMessage]);

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
            syncCurrentEffectToSession();
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
          <option value="animation" disabled>动画</option>
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
            {effectType === 'shader' ? <ShaderEditor /> : <NodeEditor />}
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
