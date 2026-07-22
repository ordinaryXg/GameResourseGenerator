import React, { useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSessionStore } from '@/stores/session-store';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NodeEditor } from '@/components/editor/NodeEditor';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { EffectTreePanel } from '@/components/layout/EffectTreePanel';
import { VersionHistoryPanel } from '@/components/layout/VersionHistoryPanel';
import { ShaderEditor } from '@/components/editor/ShaderEditor';
import { AnimationEditor } from '@/components/editor/AnimationEditor';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { ExportModal } from '@/components/layout/ExportModal';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { usePrefabImport } from '@/hooks/usePrefabImport';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  const {
    effectType, appMode, previewVisible, templateLibraryOpen,
    settingsOpen, exportOpen, showToast, isStreaming, activePanel,
    panelSizes, setEffectType, setPreviewVisible, setTemplateLibraryOpen,
    setSettingsOpen, setExportOpen, setActivePanel, setPanelSize, showToastMessage
  } = useAppStore();

  const {
    sessions, currentEffect, createSession, syncEffectToSession
  } = useSessionStore();

  const {
    isDragOver, fileInputRef,
    handleImportClick, handleFileChange,
    handleDragOver, handleDragLeave, handleDrop
  } = usePrefabImport();

  useAppShortcuts();

  useEffect(() => {
    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      useSessionStore.setState({ activeSessionId: last.id, currentEffect: last.effect, messages: last.messages, isLoaded: true });
    } else {
      createSession();
      useSessionStore.setState({ isLoaded: true });
    }
  }, []);

  useEffect(() => {
    const onUnload = () => syncEffectToSession();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [syncEffectToSession]);

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
      <div className="toolbar">
        <button className="btn-sm" onClick={handleNewEffect} title="新建特效">+ 新建</button>
        <button className="btn-sm" onClick={handleImportClick} title="导入 .prefab">导入</button>
        <button className="btn-sm" onClick={() => {
          if (currentEffect) {
            syncEffectToSession();
            const template = {
              id: currentEffect.id, name: currentEffect.name,
              description: `自定义模板 - ${currentEffect.name}`,
              category: '自定义', tags: [],
              effectConfig: JSON.parse(JSON.stringify(currentEffect))
            };
            const existing = JSON.parse(localStorage.getItem('cocos-custom-templates') || '[]');
            existing.push(template);
            localStorage.setItem('cocos-custom-templates', JSON.stringify(existing));
            showToastMessage(`模板「${currentEffect.name}」已保存`);
          }
        }} title="保存为模板">保存</button>
        <button className="btn-sm" onClick={() => setTemplateLibraryOpen(true)} title="模板库">
          模板库
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
          className="select-sm"
          value={effectType}
          onChange={(e) => setEffectType(e.target.value as typeof effectType)}
          style={{ width: 120 }}
        >
          <option value="particle3d">3D 粒子</option>
          <option value="particle2d">2D 粒子</option>
          <option value="shader">Shader</option>
          <option value="animation">动画</option>
        </select>
        <button
          className="btn-sm"
          onClick={() => setPreviewVisible(!previewVisible)}
          title={previewVisible ? '隐藏预览' : '显示预览'}
        >
          {previewVisible ? '隐藏预览' : '显示预览'}
        </button>
        <div className="spacer" />
        <button
          className="btn-sm"
          onClick={handleExport}
          disabled={!currentEffect || isStreaming}
          title="导出"
        >
          导出
        </button>
        <button className="btn-sm" onClick={() => setSettingsOpen(true)} title="设置">设置</button>
      </div>

      <div
        style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(88, 166, 255, 0.15)',
            border: '2px dashed var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, pointerEvents: 'none',
            fontSize: 18, color: 'var(--accent)', fontWeight: 600
          }}>
            释放以导入 .prefab 文件
          </div>
        )}

        <div style={{ width: panelSizes.left, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-tabs">
            {(['chat', 'effects', 'history'] as const).map(tab => (
              <button
                key={tab}
                className={`panel-tab${activePanel === tab ? ' active' : ''}`}
                onClick={() => setActivePanel(tab)}
              >
                {tab === 'chat' ? '对话' : tab === 'effects' ? '特效' : '历史'}
              </button>
            ))}
          </div>
          {activePanel === 'chat' && <ChatPanel />}
          {activePanel === 'effects' && <EffectTreePanel />}
          {activePanel === 'history' && <VersionHistoryPanel />}
        </div>

        <ResizeHandle direction="horizontal" onResize={(d) => setPanelSize('left', panelSizes.left + d)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {effectType === 'shader' ? <ShaderEditor /> : effectType === 'animation' ? <AnimationEditor /> : <NodeEditor />}
          </div>
          {previewVisible && (
            <>
              <ResizeHandle direction="vertical" onResize={(d) => setPanelSize('preview', panelSizes.preview - d)} />
              <div style={{ height: panelSizes.preview, borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                <PreviewPanel />
              </div>
            </>
          )}
        </div>

        <ResizeHandle direction="horizontal" onResize={(d) => setPanelSize('right', panelSizes.right - d)} />

        <div style={{ width: panelSizes.right, flexShrink: 0, borderLeft: '1px solid var(--border-color)' }}>
          <InspectorPanel />
        </div>
      </div>

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

      {settingsOpen && <SettingsModal />}
      {exportOpen && <ExportModal />}

      {showToast && <div className="toast">{showToast}</div>}
    </>
  );
};

export default App;
