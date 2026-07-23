import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import type { AssetEntry } from '@/types/asset';
import { assetToEmitterRefsPatch } from '@/utils/asset-apply';
import { findNodeById } from '@/utils/project-tree';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NodeEditor } from '@/components/editor/NodeEditor';
import { PropertiesPanel } from '@/components/properties/PropertiesPanel';
import { resolveInspectorTarget } from '@/utils/inspector-target';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { PresetProjectsModal } from '@/components/layout/PresetProjectsModal';
import { EmitterTemplatesModal } from '@/components/layout/EmitterTemplatesModal';
import { HierarchyPanel } from '@/components/hierarchy/HierarchyPanel';
import { AssetBrowserPanel } from '@/components/assets/AssetBrowserPanel';
import { ProjectWelcome } from '@/components/layout/ProjectWelcome';
import { ShaderEditor } from '@/components/editor/ShaderEditor';
import { AnimationEditor } from '@/components/editor/AnimationEditor';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { ExportModal } from '@/components/layout/ExportModal';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { usePrefabImport } from '@/hooks/usePrefabImport';
import { useAssetImport } from '@/hooks/useAssetImport';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  const {
    effectType, appMode, previewVisible,
    settingsOpen, exportOpen, showToast, isStreaming, activePanel,
    panelSizes, aiSettings, setEffectType, setPreviewVisible,
    setSettingsOpen, setExportOpen, setActivePanel, adjustPanelSize, showToastMessage,
    aiPanelVisible, setAiPanelVisible, assetBrowserVisible, setAssetBrowserVisible,
    inspectorTarget, inspectorSuppressFallback, setPresetProjectsOpen, previewFps
  } = useAppStore();

  const {
    project, currentEffect, isLoaded, isDirty, projectPath, selectedNodeId,
    newProject, saveProject, saveProjectAs, closeProject, syncAutosave,
    undo, redo, undoStack, redoStack, updateEmitterAssetRefs
  } = useProjectStore();

  const canUndoNow = undoStack.length > 0;
  const canRedoNow = redoStack.length > 0;

  const [showWelcome, setShowWelcome] = useState(true);

  const {
    isDragOver, fileInputRef,
    handleImportClick, handleFileChange,
    handleDragEnter, handleDragOver, handleDragLeave, handleDrop
  } = usePrefabImport();

  const {
    fileInputRef: assetInputRef,
    openImportDialog: openAssetImport,
    handleFileChange: handleAssetImport
  } = useAssetImport();

  const handleApplyAsset = useCallback((asset: AssetEntry) => {
    if (!project || !selectedNodeId) {
      showToastMessage('请先选中一个发射器');
      return;
    }
    const node = findNodeById(project.root, selectedNodeId);
    if (!node || node.type !== 'emitter') {
      showToastMessage('请先选中一个发射器');
      return;
    }
    const patch = assetToEmitterRefsPatch(asset);
    if (!patch) {
      showToastMessage(`无法应用 ${asset.type} 类型到发射器`);
      return;
    }
    updateEmitterAssetRefs(selectedNodeId, patch);
    showToastMessage(`已应用：${asset.name}`);
  }, [project, selectedNodeId, updateEmitterAssetRefs, showToastMessage]);

  useAppShortcuts();

  useEffect(() => {
    useProjectStore.setState({ isLoaded: true });
    if (useProjectStore.getState().project) {
      setShowWelcome(false);
    }
  }, []);

  useEffect(() => {
    if (!project) return;
    const timer = setInterval(() => syncAutosave(), 30000);
    return () => clearInterval(timer);
  }, [project, syncAutosave]);

  useEffect(() => {
    const onUnload = () => syncAutosave();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [syncAutosave]);

  const handleExport = useCallback(() => {
    if (currentEffect) setExportOpen(true);
  }, [currentEffect, setExportOpen]);

  const handleSave = useCallback(async () => {
    if (!project) return;
    if (projectPath) {
      const ok = await saveProject();
      if (ok) showToastMessage('项目已保存');
    } else {
      const ok = await saveProjectAs();
      if (ok) showToastMessage('项目已保存');
    }
  }, [project, projectPath, saveProject, saveProjectAs, showToastMessage]);

  const handleOpenProject = useCallback(async () => {
    closeProject();
    setShowWelcome(true);
  }, [closeProject]);

  const engineLabel = useMemo(() => {
    const engine = project?.settings?.targetEngine ?? 'cocos-creator-3.8';
    if (engine.includes('cocos')) return 'Cocos 3.8';
    if (engine.includes('unity')) return 'Unity';
    if (engine.includes('unreal')) return 'Unreal';
    return engine;
  }, [project?.settings?.targetEngine]);

  const selectedNodeName = useMemo(() => {
    if (!project || !selectedNodeId) return '无';
    const node = findNodeById(project.root, selectedNodeId);
    return node?.name ?? '无';
  }, [project, selectedNodeId]);

  const getAssetById = useAssetStore(s => s.getAssetById);

  const inspectorLabel = useMemo(() => {
    const active = resolveInspectorTarget(inspectorTarget, selectedNodeId, inspectorSuppressFallback);
    if (!active) return '无';
    if (active.kind === 'asset') {
      const asset = getAssetById(active.assetId);
      return asset?.name ?? '无';
    }
    if (!project) return '无';
    const node = findNodeById(project.root, active.nodeId);
    return node?.name ?? '无';
  }, [inspectorTarget, inspectorSuppressFallback, selectedNodeId, project, getAssetById]);

  const handleUndo = useCallback(() => {
    if (canUndoNow) {
      undo();
      showToastMessage('已撤销');
    }
  }, [canUndoNow, undo, showToastMessage]);

  const handleRedo = useCallback(() => {
    if (canRedoNow) {
      redo();
      showToastMessage('已重做');
    }
  }, [canRedoNow, redo, showToastMessage]);

  const resizeLeft = useCallback((d: number) => adjustPanelSize('left', d), [adjustPanelSize]);
  const resizeRight = useCallback((d: number) => adjustPanelSize('right', -d), [adjustPanelSize]);
  const resizePreview = useCallback((d: number) => adjustPanelSize('preview', -d), [adjustPanelSize]);
  const resizeAssets = useCallback((d: number) => adjustPanelSize('assets', -d), [adjustPanelSize]);

  if (!isLoaded || (showWelcome && !project)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectWelcome onProjectReady={() => setShowWelcome(false)} />
      </div>
    );
  }

  return (
    <>
      <div className="toolbar unified-toolbar">
        <div className="toolbar-brand">
          <img src="/icon.png" alt="" width={22} height={22} style={{ borderRadius: 5 }} />
          <span>FX Studio</span>
        </div>

        <div className="toolbar-divider" />

        <button className="btn-sm" onClick={() => { newProject(); showToastMessage('已新建项目'); }} title="新建项目">新建</button>
        <button className="btn-sm" onClick={handleOpenProject} title="打开项目">打开</button>
        <button className="btn-sm" onClick={handleSave} disabled={!project} title="保存项目">
          保存{isDirty ? '*' : ''}
        </button>

        <div className="toolbar-divider" />

        <button
          className="btn-sm"
          onClick={handleUndo}
          disabled={!canUndoNow}
          title="撤销 (Ctrl+Z)"
        >
          撤销
        </button>
        <button
          className="btn-sm"
          onClick={handleRedo}
          disabled={!canRedoNow}
          title="重做 (Ctrl+Y)"
        >
          重做
        </button>

        <div className="toolbar-divider" />

        <button className="btn-sm" onClick={handleImportClick} title="导入 .prefab 到当前发射器">导入 Prefab</button>
        <button className="btn-sm" onClick={() => setPresetProjectsOpen(true)} title="打开多发射器组合预设">组合预设</button>
        <button className="btn-sm" onClick={openAssetImport} title="导入 PNG 贴图到项目">导入贴图</button>
        <input
          ref={assetInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={handleAssetImport}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".prefab,.mtl,.png,.jpg,.jpeg,.webp,.meta"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="toolbar-divider" />

        <select
          className="select-sm"
          value={effectType}
          onChange={(e) => setEffectType(e.target.value as typeof effectType)}
          style={{ width: 120, marginLeft: 8 }}
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
          className={`btn-sm${assetBrowserVisible ? ' active' : ''}`}
          onClick={() => setAssetBrowserVisible(!assetBrowserVisible)}
          title="显示/隐藏资产浏览器"
        >
          资产
        </button>

        <button
          className="btn-sm"
          onClick={handleExport}
          disabled={!currentEffect || isStreaming}
          title="导出到 Cocos"
        >
          导出
        </button>
        <button className="btn-sm" onClick={() => setSettingsOpen(true)} title="设置">设置</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <div
        style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}
      >
        <div style={{
          width: panelSizes.left,
          flexShrink: 0,
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div className="panel-header" style={{ gap: 4, padding: '4px 6px', flexShrink: 0 }}>
            <button
              type="button"
              className={`btn-sm${activePanel === 'hierarchy' ? ' active' : ''}`}
              onClick={() => setActivePanel('hierarchy')}
            >
              层级
            </button>
            {aiPanelVisible && (
              <button
                type="button"
                className={`btn-sm${activePanel === 'ai' ? ' active' : ''}`}
                onClick={() => setActivePanel('ai')}
              >
                AI
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={`btn-sm${aiPanelVisible ? ' active' : ''}`}
              onClick={() => {
                const next = !aiPanelVisible;
                setAiPanelVisible(next);
                setActivePanel(next ? 'ai' : 'hierarchy');
              }}
              title="显示/隐藏 AI 助手"
            >
              {aiPanelVisible ? 'AI 开' : 'AI 关'}
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activePanel === 'hierarchy' && <HierarchyPanel />}
            {activePanel === 'ai' && aiPanelVisible && <ChatPanel />}
          </div>
          {assetBrowserVisible && (
            <>
              <ResizeHandle direction="vertical" onResize={resizeAssets} />
              <div style={{
                height: panelSizes.assets,
                flexShrink: 0,
                borderTop: '1px solid var(--border-color)',
                minHeight: 100,
                overflow: 'hidden'
              }}>
                <AssetBrowserPanel onApplyAsset={handleApplyAsset} onImportAsset={openAssetImport} />
              </div>
            </>
          )}
        </div>

        <ResizeHandle direction="horizontal" onResize={resizeLeft} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {effectType === 'shader' ? <ShaderEditor /> : effectType === 'animation' ? <AnimationEditor /> : <NodeEditor />}
          </div>
          {previewVisible && (
            <>
              <ResizeHandle direction="vertical" onResize={resizePreview} />
              <div style={{ height: panelSizes.preview, borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                <PreviewPanel
                  prefabDrop={{
                    isDragOver,
                    onDragEnter: handleDragEnter,
                    onDragOver: handleDragOver,
                    onDragLeave: handleDragLeave,
                    onDrop: handleDrop
                  }}
                />
              </div>
            </>
          )}
        </div>

        <ResizeHandle direction="horizontal" onResize={resizeRight} />

        <div style={{ width: panelSizes.right, flexShrink: 0, borderLeft: '1px solid var(--border-color)', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PropertiesPanel onApplyAsset={handleApplyAsset} />
        </div>
      </div>
      </div>

      <div className="statusbar">
        <span>项目：{project?.name || '无'}{isDirty ? ' *' : ''}</span>
        <span>|</span>
        <span>选中：{selectedNodeName}</span>
        <span>|</span>
        <span>属性：{inspectorLabel}</span>
        <span>|</span>
        <span>发射器：{currentEffect?.name || '无'}</span>
        <span>|</span>
        <span>引擎：{engineLabel}</span>
        <span>|</span>
        <span>类型：{effectType === 'particle3d' ? '3D 粒子' : effectType}</span>
        {previewVisible && effectType === 'particle3d' && (
          <>
            <span>|</span>
            <span>FPS：{previewFps > 0 ? previewFps : '—'}</span>
          </>
        )}
        {aiPanelVisible && activePanel === 'ai' && (
          <>
            <span>|</span>
            {appMode === 'demo'
              ? <span className="badge badge-demo">Demo</span>
              : <span className="badge badge-llm">{aiSettings.model}</span>}
          </>
        )}
        <span>|</span>
        <span className={`status-dot ${isStreaming ? 'generating' : 'ready'}`} />
        <span>{isStreaming ? '生成中...' : '就绪'}</span>
      </div>

      {settingsOpen && <SettingsModal />}
      {exportOpen && <ExportModal />}
      <PresetProjectsModal />
      <EmitterTemplatesModal />

      {showToast && <div className="toast">{showToast}</div>}
    </>
  );
};

export default App;
