import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const RECENT_KEY = 'fx-studio-recent-projects';

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); }
    },
    configurable: true
  });
}

function loadRecentProjects(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(paths: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(paths.slice(0, 8)));
}

function removeRecentFromStorage(path: string) {
  const list = loadRecentProjects().filter(p => p !== path);
  saveRecentProjects(list);
  return list;
}

describe('recent projects', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('removes missing path from recent list', () => {
    saveRecentProjects(['D:\\a.fxproj', 'D:\\b.fxproj']);
    const next = removeRecentFromStorage('D:\\a.fxproj');
    expect(next).toEqual(['D:\\b.fxproj']);
    expect(loadRecentProjects()).toEqual(['D:\\b.fxproj']);
  });
});
