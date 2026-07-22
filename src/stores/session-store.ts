import { create } from 'zustand';
import type { EffectConfig, ChatMessage, EffectType } from '@/types/effect';
import { getDefaultEffectConfig, generateUUID } from '@/utils/effect-defaults';

export interface Session {
  id: string;
  name: string;
  effect: EffectConfig;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  currentEffect: EffectConfig | null;
  messages: ChatMessage[];

  createSession: (name?: string) => string;
  switchSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
  duplicateSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setCurrentEffect: (effect: EffectConfig | null) => void;
  updateEffectConfig: (updater: (prev: EffectConfig) => EffectConfig) => void;
  addMessage: (msg: ChatMessage) => void;
  syncEffectToSession: () => void;
  reset: () => void;
}

function createDefaultSession(name = '新建特效'): Session {
  const now = Date.now();
  return {
    id: generateUUID(), name,
    effect: getDefaultEffectConfig('particle3d', name),
    messages: [], createdAt: now, updatedAt: now
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  currentEffect: null,
  messages: [],

  createSession: (name) => {
    const session = createDefaultSession(name);
    set(s => ({ sessions: [...s.sessions, session], activeSessionId: session.id, currentEffect: session.effect, messages: [] }));
    return session.id;
  },

  switchSession: (id) => {
    const { sessions, activeSessionId, currentEffect, messages } = get();
    if (activeSessionId && currentEffect) {
      set(s => ({ sessions: s.sessions.map(sess => sess.id === activeSessionId ? { ...sess, effect: currentEffect, messages, updatedAt: Date.now() } : sess) }));
    }
    const target = sessions.find(s => s.id === id);
    if (target) set({ activeSessionId: id, currentEffect: target.effect, messages: target.messages });
  },

  renameSession: (id, name) => set(s => ({
    sessions: s.sessions.map(sess => sess.id === id ? { ...sess, name, updatedAt: Date.now() } : sess),
    currentEffect: s.activeSessionId === id && s.currentEffect ? { ...s.currentEffect, name } : s.currentEffect
  })),

  duplicateSession: (id) => {
    const src = get().sessions.find(s => s.id === id);
    if (!src) return;
    const ns: Session = { ...src, id: generateUUID(), name: `${src.name}(1)`, effect: { ...src.effect, id: generateUUID(), name: `${src.name}(1)` }, createdAt: Date.now(), updatedAt: Date.now() };
    set(s => ({ sessions: [...s.sessions, ns], activeSessionId: ns.id, currentEffect: ns.effect, messages: ns.messages }));
  },

  deleteSession: (id) => {
    const { sessions } = get();
    if (sessions.length <= 1) return;
    const idx = sessions.findIndex(s => s.id === id);
    const next = sessions.filter(s => s.id !== id);
    const nextId = next[Math.min(idx, next.length - 1)]?.id || next[0]?.id;
    const target = next.find(s => s.id === nextId);
    set({ sessions: next, activeSessionId: nextId, currentEffect: target?.effect || null, messages: target?.messages || [] });
  },

  setCurrentEffect: (effect) => set({ currentEffect: effect }),
  updateEffectConfig: (updater) => set(s => ({ currentEffect: s.currentEffect ? updater(s.currentEffect) : null })),
  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  syncEffectToSession: () => {
    const { activeSessionId, currentEffect, messages } = get();
    if (!activeSessionId || !currentEffect) return;
    set(s => ({ sessions: s.sessions.map(sess => sess.id === activeSessionId ? { ...sess, effect: currentEffect, messages, updatedAt: Date.now() } : sess) }));
  },
  reset: () => { const s = createDefaultSession(); set({ sessions: [s], activeSessionId: s.id, currentEffect: s.effect, messages: [] }); }
}));
