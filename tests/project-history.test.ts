import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import {
  createSnapshot,
  pushUndoSnapshot,
  popUndo,
  popRedo,
  emptyHistoryStacks
} from '../src/utils/project-history';
import { findNodeById } from '../src/utils/project-tree';
import { isEmitterNode } from '../src/types/project';

describe('project-history', () => {
  it('pushUndo clears redo stack', () => {
    const project = createDefaultProject('Hist');
    const stacks = pushUndoSnapshot(
      { undoStack: [], redoStack: [createSnapshot(project, null, null)] },
      createSnapshot(project, null, null)
    );
    expect(stacks.undoStack).toHaveLength(1);
    expect(stacks.redoStack).toHaveLength(0);
  });

  it('undo/redo round-trip restores project edits', () => {
    const project = createDefaultProject('Hist');
    const emitter = project.root.children[0];
    expect(isEmitterNode(emitter)).toBe(true);
    if (!isEmitterNode(emitter)) return;

    const selectedNodeId = emitter.id;
    let stacks = emptyHistoryStacks();
    stacks = pushUndoSnapshot(stacks, createSnapshot(project, selectedNodeId, null));

    const edited = structuredClone(project);
    const node = findNodeById(edited.root, emitter.id);
    expect(node).toBeTruthy();
    if (node) node.name = 'Renamed';

    const current = createSnapshot(edited, selectedNodeId, null);
    const undoResult = popUndo(stacks, current);
    expect(undoResult.snapshot?.project.root.children[0].name).toBe(emitter.name);

    stacks = undoResult.stacks;
    const redoResult = popRedo(stacks, createSnapshot(undoResult.snapshot!.project, selectedNodeId, null));
    expect(redoResult.snapshot?.project.root.children[0].name).toBe('Renamed');
  });
});
