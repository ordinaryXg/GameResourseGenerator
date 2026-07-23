import { create } from 'zustand';
import type { AISettings, EffectType } from '@/types/effect';

export type AppMode = 'demo' | 'llm';
export type Lang = 'zh' | 'en';

interface PanelSizes {
  left: number;
  right: number;
  preview: number;
  assets: number;
}

const PANEL_SIZES_KEY = 'fx-studio-panel-sizes';
const PREVIEW_BG_KEY = 'fx-studio-preview-bg';

function loadPanelSizes(): PanelSizes {
  try {
    const raw = localStorage.getItem(PANEL_SIZES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PanelSizes>;
      return {
        left: parsed.left ?? 300,
        right: parsed.right ?? 280,
        preview: parsed.preview ?? 280,
        assets: parsed.assets ?? 180
      };
    }
  } catch { /* ignore */ }
  return { left: 300, right: 280, preview: 280, assets: 180 };
}

function loadPreviewBackground(): string {
  const stored = localStorage.getItem(PREVIEW_BG_KEY);
  const legacyMap: Record<string, string> = {
    '#0d1117': '#252530',
    '#e6edf3': '#3a3a42',
    '#1a1a2e': '#2d3142'
  };
  if (stored && legacyMap[stored]) {
    localStorage.setItem(PREVIEW_BG_KEY, legacyMap[stored]);
    return legacyMap[stored];
  }
  return stored || '#252530';
}

interface AppState {
  aiSettings: AISettings;
  appMode: AppMode;
  effectType: EffectType;
  isStreaming: boolean;
  streamingContent: string;
  cocosProjectPath: string;
  previewVisible: boolean;
  previewPlaying: boolean;
  previewBackground: string;
  showAxes: boolean;
  activePanel: 'hierarchy' | 'ai';
  selectedModuleKey: string | null;
  panelSizes: PanelSizes;
  settingsOpen: boolean;
  exportOpen: boolean;
  templateLibraryOpen: boolean;
  showToast: string | null;
  lang: Lang;
  newEffectModalOpen: boolean;
  aiPanelVisible: boolean;
  assetBrowserVisible: boolean;

  setAISettings: (s: Partial<AISettings>) => void;
  setAppMode: (m: AppMode) => void;
  setEffectType: (t: EffectType) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (v: string) => void;
  appendStreamingContent: (c: string) => void;
  setCocosProjectPath: (p: string) => void;
  setPreviewVisible: (v: boolean) => void;
  setPreviewPlaying: (v: boolean) => void;
  setPreviewBackground: (color: string) => void;
  setShowAxes: (v: boolean) => void;
  setActivePanel: (p: 'hierarchy' | 'ai') => void;
  setSelectedModuleKey: (key: string | null) => void;
  adjustPanelSize: (key: keyof PanelSizes, delta: number) => void;
  setPanelSize: (key: keyof PanelSizes, value: number) => void;
  setSettingsOpen: (v: boolean) => void;
  setExportOpen: (v: boolean) => void;
  setTemplateLibraryOpen: (v: boolean) => void;
  showToastMessage: (msg: string) => void;
  setLang: (l: Lang) => void;
  setNewEffectModalOpen: (v: boolean) => void;
  setAiPanelVisible: (v: boolean) => void;
  setAssetBrowserVisible: (v: boolean) => void;
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
  previewBackground: loadPreviewBackground(),
  showAxes: true,
  activePanel: 'hierarchy',
  selectedModuleKey: null,
  panelSizes: loadPanelSizes(),
  settingsOpen: false,
  exportOpen: false,
  templateLibraryOpen: false,
  showToast: null,
  lang: 'zh',
  newEffectModalOpen: false,
  aiPanelVisible: false,
  assetBrowserVisible: true,

  setAISettings: (s) => set(state => ({ aiSettings: { ...state.aiSettings, ...s }, appMode: s.apiKey !== undefined ? (s.apiKey ? 'llm' : 'demo') : state.appMode })),
  setAppMode: (m) => set({ appMode: m }),
  setEffectType: (t) => set({ effectType: t }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (v) => set({ streamingContent: v }),
  appendStreamingContent: (c) => set(s => ({ streamingContent: s.streamingContent + c })),
  setCocosProjectPath: (p) => set({ cocosProjectPath: p }),
  setPreviewVisible: (v) => set({ previewVisible: v }),
  setPreviewPlaying: (v) => set({ previewPlaying: v }),
  setPreviewBackground: (color) => {
    localStorage.setItem(PREVIEW_BG_KEY, color);
    set({ previewBackground: color });
  },
  setShowAxes: (v) => set({ showAxes: v }),
  setActivePanel: (p) => set({ activePanel: p }),
  setSelectedModuleKey: (key) => set({ selectedModuleKey: key }),
  adjustPanelSize: (key, delta) => set(s => {
    const min = key === 'preview' ? 120 : key === 'assets' ? 100 : 200;
    const max = key === 'preview' ? 520 : key === 'assets' ? 360 : 560;
    const next = Math.min(max, Math.max(min, s.panelSizes[key] + delta));
    const panelSizes = { ...s.panelSizes, [key]: next };
    localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(panelSizes));
    return { panelSizes };
  }),
  setPanelSize: (key, value) => set(s => {
    const min = key === 'preview' ? 120 : key === 'assets' ? 100 : 200;
    const panelSizes = { ...s.panelSizes, [key]: Math.max(min, value) };
    localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(panelSizes));
    return { panelSizes };
  }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setExportOpen: (v) => set({ exportOpen: v }),
  setTemplateLibraryOpen: (v) => set({ templateLibraryOpen: v }),
  showToastMessage: (msg) => { set({ showToast: msg }); setTimeout(() => set({ showToast: null }), 3000); },
  setLang: (l) => set({ lang: l }),
  setNewEffectModalOpen: (v) => set({ newEffectModalOpen: v }),
  setAiPanelVisible: (v) => set({ aiPanelVisible: v }),
  setAssetBrowserVisible: (v) => set({ assetBrowserVisible: v })
}));
