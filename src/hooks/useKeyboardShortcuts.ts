import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';

type ShortcutHandler = () => void;

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest('.cm-editor')) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: Record<string, ShortcutHandler>) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      let key = '';
      if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
        key = 'Cmd+Shift+Z';
      } else if (mod) {
        key = `Cmd+${e.key.toUpperCase()}`;
      } else {
        key = e.key.toUpperCase();
      }

      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlers]);
}

export function useAppShortcuts() {
  const {
    setSettingsOpen, setExportOpen, setPresetProjectsOpen, setEmitterTemplatesOpen,
    setPreviewPlaying, previewPlaying, showToastMessage, clearInspectorTarget
  } = useAppStore();
  const undo = useProjectStore(s => s.undo);
  const redo = useProjectStore(s => s.redo);
  const canUndoNow = useProjectStore(s => s.undoStack.length > 0);
  const canRedoNow = useProjectStore(s => s.redoStack.length > 0);

  const handlers = useMemo(() => ({
    'Cmd+Z': () => {
      if (canUndoNow) {
        undo();
        showToastMessage('已撤销');
      }
    },
    'Cmd+Y': () => {
      if (canRedoNow) {
        redo();
        showToastMessage('已重做');
      }
    },
    'Cmd+Shift+Z': () => {
      if (canRedoNow) {
        redo();
        showToastMessage('已重做');
      }
    },
    'Cmd+E': () => setExportOpen(true),
    'Cmd+,': () => setSettingsOpen(true),
    'Cmd+T': () => setPresetProjectsOpen(true),
    'SPACE': () => setPreviewPlaying(!previewPlaying),
    'ESCAPE': () => {
      const state = useAppStore.getState();
      if (state.settingsOpen || state.exportOpen || state.presetProjectsOpen || state.emitterTemplatesOpen) {
        setSettingsOpen(false);
        setExportOpen(false);
        setPresetProjectsOpen(false);
        setEmitterTemplatesOpen(false);
        return;
      }
      if (state.inspectorTarget || !state.inspectorSuppressFallback) {
        clearInspectorTarget();
        showToastMessage('已清空属性选中');
      }
    }
  }), [
    canUndoNow, canRedoNow, undo, redo, showToastMessage,
    setExportOpen, setSettingsOpen, setPresetProjectsOpen, setEmitterTemplatesOpen,
    setPreviewPlaying, previewPlaying, clearInspectorTarget
  ]);

  useKeyboardShortcuts(handlers);
}
