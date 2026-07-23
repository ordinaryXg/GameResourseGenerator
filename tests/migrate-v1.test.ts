import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasV1Sessions,
  loadV1Sessions,
  migrateSessionToProject,
  migrateAllV1Sessions,
  createCombinedMigrationProject,
  archiveV1Sessions
} from '../src/utils/migrate-v1';
import { getDefaultEffectConfig } from '../src/utils/effect-defaults';
import type { Session } from '../src/stores/session-store';
import { getEmitterNodes } from '../src/utils/preview-sources';

const V1_KEY = 'cocos-effect-generator-sessions';

function makeSession(name: string): Session {
  const effect = getDefaultEffectConfig('particle3d', name);
  const now = Date.now();
  return {
    id: effect.id,
    name,
    effect,
    createdAt: now,
    updatedAt: now
  };
}

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true });
  return store;
}

describe('migrate-v1', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('detects v1 sessions in localStorage', () => {
    expect(hasV1Sessions()).toBe(false);
    localStorage.setItem(V1_KEY, JSON.stringify([makeSession('Fire')]));
    expect(hasV1Sessions()).toBe(true);
    expect(loadV1Sessions()).toHaveLength(1);
  });

  it('migrates single session to project with one emitter', () => {
    const session = makeSession('Fire');
    const project = migrateSessionToProject(session);
    expect(project.name).toBe('Fire');
    expect(getEmitterNodes(project.root)).toHaveLength(1);
    expect(getEmitterNodes(project.root)[0].config.mainModule.capacity).toBe(100);
  });

  it('combines multiple sessions into spaced emitters', () => {
    const sessions = [makeSession('A'), makeSession('B')];
    const project = createCombinedMigrationProject(sessions);
    const emitters = getEmitterNodes(project.root);
    expect(emitters).toHaveLength(2);
    expect(emitters[0].transform.position[0]).toBe(0);
    expect(emitters[1].transform.position[0]).toBe(2);
  });

  it('archives v1 sessions after migration', () => {
    localStorage.setItem(V1_KEY, JSON.stringify([makeSession('X')]));
    expect(migrateAllV1Sessions()).toHaveLength(1);
    archiveV1Sessions();
    expect(hasV1Sessions()).toBe(false);
    expect(localStorage.getItem(`${V1_KEY}-archived`)).toBeTruthy();
  });
});
