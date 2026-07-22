import { create } from 'zustand';
import type {
  EffectConfig,
  AISettings,
  AIProvider,
  AIModel,
  EffectType,
  ChatMessage
} from '@/types/effect';
import { getDefaultEffectConfig, generateUUID } from '@/utils/effect-defaults';

export type AppMode = 'demo' | 'llm';
export type Lang = 'zh' | 'en';

export interface Session {
  id: string;
  name: string;
  effect: EffectConfig;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  // AI Settings
  aiSettings: AISettings;
  appMode: AppMode;

  // Sessions
  sessions: Session[];
  activeSessionId: string | null;

  // Current Effect (derived from active session)
  currentEffect: EffectConfig | null;
  effectType: EffectType;

  // Conversation
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;

  // Export
  cocosProjectPath: string;

  // UI State
  previewVisible: boolean;
  previewPlaying: boolean;
  activePanel: 'chat' | 'sessions' | 'history';
  settingsOpen: boolean;
  exportOpen: boolean;
  templateLibraryOpen: boolean;
  showToast: string | null;
  lang: Lang;

  // Actions
  setAISettings: (settings: Partial<AISettings>) => void;
  setAppMode: (mode: AppMode) => void;
  setCurrentEffect: (effect: EffectConfig | null) => void;
  updateEffectConfig: (updater: (prev: EffectConfig) => EffectConfig) => void;
  setEffectType: (type: EffectType) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (v: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setCocosProjectPath: (path: string) => void;
  setPreviewVisible: (v: boolean) => void;
  setPreviewPlaying: (v: boolean) => void;
  setActivePanel: (panel: 'chat' | 'sessions' | 'history') => void;
  setSettingsOpen: (v: boolean) => void;
  setExportOpen: (v: boolean) => void;
  setTemplateLibraryOpen: (v: boolean) => void;
  showToastMessage: (msg: string) => void;
  resetEffect: () => void;
  setLang: (lang: Lang) => void;

  // Session actions
  createSession: (name?: string) => string;
  switchSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
  duplicateSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  syncCurrentEffectToSession: () => void;
}

function createDefaultSession(name: string = '新建特效'): Session {
  const now = Date.now();
  return {
    id: generateUUID(),
    name,
    effect: getDefaultEffectConfig('particle3d', name),
    messages: [],
    createdAt: now,
    updatedAt: now
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  aiSettings: {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048
  },
  appMode: 'demo',

  currentEffect: null,
  effectType: 'particle3d',

  messages: [],
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

  setLang: (lang) => set({ lang }),

  setAISettings: (settings) =>
    set((s) => ({
      aiSettings: { ...s.aiSettings, ...settings },
      appMode: settings.apiKey !== undefined
        ? (settings.apiKey ? 'llm' : 'demo')
        : s.appMode
    })),

  setAppMode: (mode) => set({ appMode: mode }),

  setCurrentEffect: (effect) => set({ currentEffect: effect }),

  updateEffectConfig: (updater) =>
    set((s) => ({
      currentEffect: s.currentEffect ? updater(s.currentEffect) : null
    })),

  setEffectType: (type) => set({ effectType: type }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      }
      return { messages: msgs };
    }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  setStreamingContent: (v) => set({ streamingContent: v }),

  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),

  setCocosProjectPath: (path) => set({ cocosProjectPath: path }),

  setPreviewVisible: (v) => set({ previewVisible: v }),
  setPreviewPlaying: (v) => set({ previewPlaying: v }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setExportOpen: (v) => set({ exportOpen: v }),
  setTemplateLibraryOpen: (v) => set({ templateLibraryOpen: v }),

  showToastMessage: (msg) => {
    set({ showToast: msg });
    setTimeout(() => set({ showToast: null }), 3000);
  },

  resetEffect: () => {
    const session = createDefaultSession();
    set({
      sessions: [session],
      activeSessionId: session.id,
      currentEffect: session.effect,
      messages: [],
      streamingContent: ''
    });
  },

  // Session management
  createSession: (name?: string) => {
    const session = createDefaultSession(name);
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
      currentEffect: session.effect,
      messages: session.messages,
      streamingContent: ''
    }));
    return session.id;
  },

  switchSession: (sessionId: string) => {
    const { sessions } = get();
    // Sync current state back to active session
    const current = get();
    if (current.activeSessionId) {
      set((s) => ({
        sessions: s.sessions.map(sess =>
          sess.id === current.activeSessionId
            ? { ...sess, effect: current.currentEffect!, messages: current.messages, updatedAt: Date.now() }
            : sess
        )
      }));
    }
    // Switch to target
    const target = sessions.find(s => s.id === sessionId);
    if (target) {
      set({
        activeSessionId: sessionId,
        currentEffect: target.effect,
        messages: target.messages,
        streamingContent: ''
      });
    }
  },

  renameSession: (sessionId: string, name: string) => {
    set((s) => ({
      sessions: s.sessions.map(sess =>
        sess.id === sessionId ? { ...sess, name, updatedAt: Date.now() } : sess
      ),
      currentEffect: s.activeSessionId === sessionId && s.currentEffect
        ? { ...s.currentEffect, name }
        : s.currentEffect
    }));
  },

  duplicateSession: (sessionId: string) => {
    const { sessions } = get();
    const source = sessions.find(s => s.id === sessionId);
    if (!source) return;
    const newSession: Session = {
      ...source,
      id: generateUUID(),
      name: `${source.name}(1)`,
      effect: { ...source.effect, id: generateUUID(), name: `${source.name}(1)` },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    set((s) => ({
      sessions: [...s.sessions, newSession],
      activeSessionId: newSession.id,
      currentEffect: newSession.effect,
      messages: newSession.messages,
      streamingContent: ''
    }));
  },

  deleteSession: (sessionId: string) => {
    const { sessions } = get();
    if (sessions.length <= 1) return;
    const idx = sessions.findIndex(s => s.id === sessionId);
    const newSessions = sessions.filter(s => s.id !== sessionId);
    const nextId = newSessions[Math.min(idx, newSessions.length - 1)]?.id || newSessions[0]?.id;
    const next = newSessions.find(s => s.id === nextId);
    set({
      sessions: newSessions,
      activeSessionId: nextId,
      currentEffect: next?.effect || null,
      messages: next?.messages || [],
      streamingContent: ''
    });
  },

  syncCurrentEffectToSession: () => {
    const { activeSessionId, currentEffect, messages } = get();
    if (!activeSessionId || !currentEffect) return;
    set((s) => ({
      sessions: s.sessions.map(sess =>
        sess.id === activeSessionId
          ? { ...sess, effect: currentEffect, messages, updatedAt: Date.now() }
          : sess
      )
    }));
  }
}));
