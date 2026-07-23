import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import {
  containsNodeId,
  getStrictSelectedEmitter,
  findNodeById
} from '../src/utils/project-tree';
import { isEmitterNode } from '../src/types/project';

describe('project-tree helpers', () => {
  it('getStrictSelectedEmitter returns null for group selection', () => {
    const project = createDefaultProject();
    expect(getStrictSelectedEmitter(project.root, project.root.id)).toBeNull();
  });

  it('getStrictSelectedEmitter returns emitter when selected', () => {
    const project = createDefaultProject();
    const emitter = project.root.children.find(c => isEmitterNode(c));
    expect(emitter).toBeTruthy();
    const strict = getStrictSelectedEmitter(project.root, emitter!.id);
    expect(strict?.id).toBe(emitter!.id);
  });

  it('containsNodeId detects subtree membership', () => {
    const project = createDefaultProject();
    const emitter = project.root.children.find(c => isEmitterNode(c));
    expect(emitter).toBeTruthy();
    expect(containsNodeId(project.root, project.root.id, emitter!.id)).toBe(true);
    expect(containsNodeId(project.root, emitter!.id, project.root.id)).toBe(false);
  });
});
