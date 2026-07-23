import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';
import { serializeProject, parseProjectJson, emitterToEffectConfig } from '../src/utils/project-io';
import { findNodeById } from '../src/utils/project-tree';
import { isEmitterNode } from '../src/types/project';
import { migrateSessionToProject } from '../src/utils/migrate-v1';
import type { Session } from '../src/stores/session-store';

describe('project-io', () => {
  it('serializes and parses a default project', () => {
    const project = createDefaultProject('TestExplosion');
    const json = serializeProject(project);
    const parsed = parseProjectJson(json);
    expect(parsed.name).toBe('TestExplosion');
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.root.children.length).toBeGreaterThan(0);
  });

  it('converts emitter to legacy EffectConfig', () => {
    const project = createDefaultProject('BridgeTest');
    const emitter = project.root.children[0];
    expect(isEmitterNode(emitter)).toBe(true);
    if (!isEmitterNode(emitter)) return;
    const effect = emitterToEffectConfig(emitter, project);
    expect(effect.name).toBe(emitter.name);
    expect(effect.type).toBe('particle3d');
    expect(effect.config).toBeDefined();
  });

  it('rejects invalid project version', () => {
    expect(() => parseProjectJson(JSON.stringify({ version: '1.0.0' }))).toThrow(/不支持的项目版本/);
  });

  it('migrates v1 session to v2 project', () => {
    const session: Session = {
      id: 's1',
      name: 'Fire',
      effect: {
        id: 'e1',
        name: 'Fire',
        type: 'particle3d',
        version: '1.0.0',
        targetEngineVersion: '3.8.x',
        source: 'manual',
        tags: [],
        metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        config: getDefaultParticle3DConfig()
      },
      messages: [],
      versionHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const project = migrateSessionToProject(session);
    expect(project.name).toBe('Fire');
    expect(project.root.children).toHaveLength(1);
    const node = findNodeById(project.root, session.effect.id);
    expect(node).toBeTruthy();
  });
});
