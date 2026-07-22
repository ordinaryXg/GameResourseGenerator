import { create } from 'zustand';
import type { AISettings, EffectType } from '@/types/effect';

export type AppMode = 'demo' | 'llm';
export type Lang = 'zh' | 'en';

interface AppState {
  aiSettings: AISettings;
  appMode: AppMode;
  effectType: EffectType;
  isStreaming: boolean;
  streamingContent: string;
  cocosProjectPath: string;
  previewVisible: boolean;
  previewPlaying: boolean;
  activePanel: 'chat' | 'sessions' | 'history';
  settingsOpen: boolean;
  exportOpen: boolean;
  templateLibraryOpen: boolean;
  showToast: string | null;
  lang: Lang;

  setAISettings: (s: Partial<AISettings>) => void;
  setAppMode: (m: AppMode) => void;
  setEffectType: (t: EffectType) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (v: string) => void;
  appendStreamingContent: (c: string) => void;
  setCocosProjectPath: (p: string) => void;
  setPreviewVisible: (v: boolean) => void;
  setPreviewPlaying: (v: boolean) => void;
  setActivePanel: (p: 'chat' | 'sessions' | 'history') => void;
  setSettingsOpen: (v: boolean) => void;
  setExportOpen: (v: boolean) => void;
  setTemplateLibraryOpen: (v: boolean) => void;
  showToastMessage: (msg: string) => void;
  setLang: (l: Lang) => void;
}

export const useAppStore = create<AppState>((set) => ({
  aiSettings: { provider: 'openai', model: 'gpt-4o', apiKey: '', temperature: 0.7, maxTokens: 2048 },
  appMode: 'demo',
  effectType: 'particle3d',
  isStreaming: false,
  streamingContent: '',
  cocosProjectPath: '',
  previewVisible: true,
  previewPlaying: true,
  activePanel: 'chat',
  settingsOpen: false,
  exportOpen: false,
  templateLibraryOpen: false,
  showToast: null,
  lang: 'zh',

  setAISettings: (s) => set(state => ({ aiSettings: { ...state.aiSettings, ...s }, appMode: s.apiKey !== undefined ? (s.apiKey ? 'llm' : 'demo') : state.appMode })),
  setAppMode: (m) => set({ appMode: m }),
  setEffectType: (t) => set({ effectType: t }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (v) => set({ streamingContent: v }),
  appendStreamingContent: (c) => set(s => ({ streamingContent: s.streamingContent + c })),
  setCocosProjectPath: (p) => set({ cocosProjectPath: p }),
  setPreviewVisible: (v) => set({ previewVisible: v }),
  setPreviewPlaying: (v) => set({ previewPlaying: v }),
  setActivePanel: (p) => set({ activePanel: p }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setExportOpen: (v) => set({ exportOpen: v }),
  setTemplateLibraryOpen: (v) => set({ templateLibraryOpen: v }),
  showToastMessage: (msg) => { set({ showToast: msg }); setTimeout(() => set({ showToast: null }), 3000); },
  setLang: (l) => set({ lang: l })
}));
