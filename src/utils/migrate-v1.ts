import type { EffectProject, ParticleEmitterNode } from '@/types/project';
import { isEmitterNode } from '@/types/project';
import type { Session } from '@/stores/session-store';
import { createDefaultProject, createDefaultEmitter, createDefaultRootGroup } from './project-factory';
import { createDefaultTransform } from './project-factory';
import { generateUUID } from './effect-defaults';

const V1_STORAGE_KEY = 'cocos-effect-generator-sessions';

export function hasV1Sessions(): boolean {
  try {
    const raw = localStorage.getItem(V1_STORAGE_KEY);
    if (!raw) return false;
    const sessions = JSON.parse(raw) as Session[];
    return Array.isArray(sessions) && sessions.length > 0;
  } catch {
    return false;
  }
}

export function loadV1Sessions(): Session[] {
  try {
    const raw = localStorage.getItem(V1_STORAGE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as Session[];
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

export function migrateSessionToProject(session: Session): EffectProject {
  const effect = session.effect;
  const emitter = createDefaultEmitter(effect.name);
  emitter.id = effect.id;
  emitter.config = JSON.parse(JSON.stringify(effect.config));
  emitter.nodeLayout = effect.metadata?.nodeLayout;

  const project = createDefaultProject(session.name || effect.name);
  project.id = generateUUID();
  project.name = session.name || effect.name;
  project.metadata = {
    createdAt: effect.metadata?.createdAt ?? new Date(session.createdAt).toISOString(),
    updatedAt: effect.metadata?.updatedAt ?? new Date(session.updatedAt).toISOString(),
    description: `从 v1 会话「${session.name}」迁移`
  };
  project.root = {
    ...createDefaultRootGroup('Root'),
    children: [emitter]
  };
  return project;
}

export function migrateAllV1Sessions(): EffectProject[] {
  return loadV1Sessions().map(migrateSessionToProject);
}

/** Mark v1 sessions as migrated (optional archive, not delete). */
export function archiveV1Sessions() {
  try {
    const sessions = loadV1Sessions();
    if (sessions.length === 0) return;
    localStorage.setItem(`${V1_STORAGE_KEY}-archived`, JSON.stringify(sessions));
    localStorage.removeItem(V1_STORAGE_KEY);
  } catch { /* ignore */ }
}

export function createCombinedMigrationProject(sessions: Session[]): EffectProject {
  const base = createDefaultProject('迁移的项目集合');
  base.root = {
    type: 'group',
    id: generateUUID(),
    name: 'Root',
    enabled: true,
    transform: createDefaultTransform(),
    children: sessions.map((sess, i) => {
      const migrated = migrateSessionToProject(sess);
      const node = migrated.root.children[0];
      if (!isEmitterNode(node)) throw new Error('迁移失败：无效发射器');
      const e: ParticleEmitterNode = { ...node, id: generateUUID() };
      e.name = sess.name || `Effect ${i + 1}`;
      e.transform.position = [i * 2, 0, 0];
      return e;
    })
  };
  base.metadata.description = `合并迁移 ${sessions.length} 个 v1 会话`;
  return base;
}
