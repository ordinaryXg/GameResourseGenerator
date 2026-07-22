import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';

type ShortcutHandler = () => void;

export function useKeyboardShortcuts(handlers: Record<string, ShortcutHandler>) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = `${mod ? 'Cmd+' : ''}${e.key.toUpperCase()}`;

      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlers]);
}

// Pre-built shortcut map for the app
export function useAppShortcuts() {
  const { setSettingsOpen, setExportOpen, setTemplateLibraryOpen, setPreviewPlaying, previewPlaying } = useAppStore();

  useKeyboardShortcuts({
    'Cmd+N': () => {}, // handled by App
    'Cmd+E': () => setExportOpen(true),
    'Cmd+,': () => setSettingsOpen(true),
    'Cmd+T': () => setTemplateLibraryOpen(true),
    'SPACE': () => setPreviewPlaying(!previewPlaying),
    'ESCAPE': () => { setSettingsOpen(false); setExportOpen(false); setTemplateLibraryOpen(false); }
  });
}
