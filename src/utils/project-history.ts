import type { EffectProject } from '@/types/project';
import { cloneProject } from '@/utils/project-tree';

export interface EditorSnapshot {
  project: EffectProject;
  selectedNodeId: string | null;
  soloNodeId: string | null;
}

export interface HistoryStacks {
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
}

export const MAX_HISTORY = 50;

export function createSnapshot(
  project: EffectProject,
  selectedNodeId: string | null,
  soloNodeId: string | null
): EditorSnapshot {
  return {
    project: cloneProject(project),
    selectedNodeId,
    soloNodeId
  };
}

export function pushUndoSnapshot(
  stacks: HistoryStacks,
  snapshot: EditorSnapshot
): HistoryStacks {
  return {
    undoStack: [...stacks.undoStack, snapshot].slice(-MAX_HISTORY),
    redoStack: []
  };
}

export function popUndo(
  stacks: HistoryStacks,
  current: EditorSnapshot
): { stacks: HistoryStacks; snapshot: EditorSnapshot | null } {
  if (stacks.undoStack.length === 0) {
    return { stacks, snapshot: null };
  }
  const undoStack = stacks.undoStack.slice(0, -1);
  const snapshot = stacks.undoStack[stacks.undoStack.length - 1];
  return {
    stacks: {
      undoStack,
      redoStack: [...stacks.redoStack, createSnapshot(current.project, current.selectedNodeId, current.soloNodeId)]
    },
    snapshot
  };
}

export function popRedo(
  stacks: HistoryStacks,
  current: EditorSnapshot
): { stacks: HistoryStacks; snapshot: EditorSnapshot | null } {
  if (stacks.redoStack.length === 0) {
    return { stacks, snapshot: null };
  }
  const redoStack = stacks.redoStack.slice(0, -1);
  const snapshot = stacks.redoStack[stacks.redoStack.length - 1];
  return {
    stacks: {
      undoStack: [...stacks.undoStack, createSnapshot(current.project, current.selectedNodeId, current.soloNodeId)],
      redoStack
    },
    snapshot
  };
}

export function emptyHistoryStacks(): HistoryStacks {
  return { undoStack: [], redoStack: [] };
}
