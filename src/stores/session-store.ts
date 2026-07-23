import { create } from 'zustand';
import type { EffectConfig, ChatMessage } from '@/types/effect';
import { getDefaultEffectConfig, generateUUID } from '@/utils/effect-defaults';

const STORAGE_KEY = 'cocos-effect-generator-sessions';
const MAX_SESSIONS = 20;

export interface Session {
  id: string;
  name: string;
  effect: EffectConfig;
  messages: ChatMessage[];
  /** @deprecated v1 session field, kept for migration only */
  versionHistory?: EffectConfig[];
  createdAt: number;
  updatedAt: number;
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions: Session[]) {
  try {
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore quota errors */ }
}

function syncSessionsWithCurrent(
  sessions: Session[],
  activeSessionId: string | null,
  currentEffect: EffectConfig | null,
  messages: ChatMessage[]
): Session[] {
  if (!activeSessionId || !currentEffect) return sessions;
  const updated = sessions.map(sess =>
    sess.id === activeSessionId
      ? { ...sess, effect: currentEffect, messages, updatedAt: Date.now() }
      : sess
  );
  saveSessions(updated);
  return updated;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  currentEffect: EffectConfig | null;
  messages: ChatMessage[];
  isLoaded: boolean;

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

export function getNextEffectName(sessions: Session[]): string {
  const base = '新建特效';
  const names = new Set(sessions.map(s => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: loadSessions(),
  activeSessionId: null,
  currentEffect: null,
  messages: [],
  isLoaded: false,

  createSession: (name) => {
    const session = createDefaultSession(name);
    set(s => {
      const sessions = [...s.sessions, session];
      saveSessions(sessions);
      return { sessions, activeSessionId: session.id, currentEffect: session.effect, messages: [] };
    });
    return session.id;
  },

  switchSession: (id) => {
    const { sessions, activeSessionId, currentEffect, messages } = get();
    const synced = syncSessionsWithCurrent(sessions, activeSessionId, currentEffect, messages);
    const target = synced.find(s => s.id === id);
    if (target) {
      set({ sessions: synced, activeSessionId: id, currentEffect: target.effect, messages: target.messages });
    }
  },

  renameSession: (id, name) => set(s => {
    const sessions = s.sessions.map(sess => sess.id === id ? { ...sess, name, updatedAt: Date.now() } : sess);
    saveSessions(sessions);
    return { sessions, currentEffect: s.activeSessionId === id && s.currentEffect ? { ...s.currentEffect, name } : s.currentEffect };
  }),

  duplicateSession: (id) => {
    const src = get().sessions.find(s => s.id === id);
    if (!src) return;
    const ns: Session = { ...src, id: generateUUID(), name: `${src.name}(1)`, effect: { ...src.effect, id: generateUUID(), name: `${src.name}(1)` }, createdAt: Date.now(), updatedAt: Date.now() };
    set(s => { const sessions = [...s.sessions, ns]; saveSessions(sessions); return { sessions, activeSessionId: ns.id, currentEffect: ns.effect, messages: ns.messages }; });
  },

  deleteSession: (id) => {
    const { sessions } = get();
    if (sessions.length <= 1) return;
    const idx = sessions.findIndex(s => s.id === id);
    const next = sessions.filter(s => s.id !== id);
    saveSessions(next);
    const nextId = next[Math.min(idx, next.length - 1)]?.id || next[0]?.id;
    const target = next.find(s => s.id === nextId);
    set({ sessions: next, activeSessionId: nextId, currentEffect: target?.effect || null, messages: target?.messages || [] });
  },

  setCurrentEffect: (effect) => set(s => {
    const sessions = syncSessionsWithCurrent(s.sessions, s.activeSessionId, effect, s.messages);
    return { currentEffect: effect, sessions };
  }),
  updateEffectConfig: (updater) => set(s => {
    if (!s.currentEffect) return {};
    const currentEffect = updater(s.currentEffect);
    const sessions = syncSessionsWithCurrent(s.sessions, s.activeSessionId, currentEffect, s.messages);
    return { currentEffect, sessions };
  }),
  addMessage: (msg) => set(s => {
    const messages = [...s.messages, msg];
    const sessions = syncSessionsWithCurrent(s.sessions, s.activeSessionId, s.currentEffect, messages);
    return { messages, sessions };
  }),
  syncEffectToSession: () => {
    const { activeSessionId, currentEffect, messages, sessions } = get();
    if (!activeSessionId || !currentEffect) return;
    const updated = syncSessionsWithCurrent(sessions, activeSessionId, currentEffect, messages);
    set({ sessions: updated });
  },

  reset: () => { const s = createDefaultSession(); set({ sessions: [s], activeSessionId: s.id, currentEffect: s.effect, messages: [] }); }
}));
