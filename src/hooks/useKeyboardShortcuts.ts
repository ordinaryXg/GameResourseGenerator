import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';

type ShortcutHandler = () => void;

export function useKeyboardShortcuts(handlers: Record<string, ShortcutHandler>) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
    setSettingsOpen, setExportOpen, setTemplateLibraryOpen,
    setPreviewPlaying, previewPlaying, showToastMessage
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
    'Cmd+T': () => setTemplateLibraryOpen(true),
    'SPACE': () => setPreviewPlaying(!previewPlaying),
    'ESCAPE': () => {
      setSettingsOpen(false);
      setExportOpen(false);
      setTemplateLibraryOpen(false);
    }
  }), [
    canUndoNow, canRedoNow, undo, redo, showToastMessage,
    setExportOpen, setSettingsOpen, setTemplateLibraryOpen,
    setPreviewPlaying, previewPlaying
  ]);

  useKeyboardShortcuts(handlers);
}
