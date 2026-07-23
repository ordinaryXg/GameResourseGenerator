import { create } from 'zustand';
import type { EffectConfig, ChatMessage, Particle3DConfig } from '@/types/effect';
import type { EffectProject, EffectNode, ParticleEmitterNode, EffectGroupNode } from '@/types/project';
import { isEmitterNode, isGroupNode } from '@/types/project';
import {
  createDefaultProject,
  createDefaultEmitter,
  getNextEmitterName,
  createDefaultRootGroup
} from '@/utils/project-factory';
import {
  findNodeById,
  getFirstEmitter,
  updateNodeInTree,
  removeNodeFromTree,
  insertNodeInGroup,
  cloneProject,
  touchProjectMetadata,
  findParentOfNode
} from '@/utils/project-tree';
import {
  serializeProject,
  parseProjectJson,
  emitterToEffectConfig,
  applyEffectConfigToEmitter,
  prepareProjectForSave,
  getProjectDirFromFilePath
} from '@/utils/project-io';
import { generateUUID } from '@/utils/effect-defaults';
import type { AssetEntry } from '@/types/asset';
import type { EmitterAssetRefs } from '@/types/asset';
import {
  createSnapshot,
  pushUndoSnapshot,
  popUndo,
  popRedo,
  emptyHistoryStacks,
  type EditorSnapshot,
  type HistoryStacks
} from '@/utils/project-history';
import { syncAssetStoreFromProject } from '@/stores/asset-store';

const RECENT_KEY = 'fx-studio-recent-projects';
const AUTOSAVE_KEY = 'fx-studio-autosave';
const MAX_RECENT = 8;

function loadRecentProjects(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(paths: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(paths.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function pushRecent(path: string) {
  const list = loadRecentProjects().filter(p => p !== path);
  list.unshift(path);
  saveRecentProjects(list);
  return list;
}

function computeCurrentEffect(project: EffectProject | null, selectedNodeId: string | null): EffectConfig | null {
  if (!project) return null;
  const node = selectedNodeId
    ? findNodeById(project.root, selectedNodeId)
    : getFirstEmitter(project.root);
  if (!node || !isEmitterNode(node)) {
    const first = getFirstEmitter(project.root);
    return first ? emitterToEffectConfig(first, project) : null;
  }
  return emitterToEffectConfig(node, project);
}

function getSelectedEmitter(project: EffectProject, selectedNodeId: string | null): ParticleEmitterNode | null {
  const node = selectedNodeId ? findNodeById(project.root, selectedNodeId) : getFirstEmitter(project.root);
  if (node && isEmitterNode(node)) return node;
  return getFirstEmitter(project.root);
}

interface ProjectState {
  project: EffectProject | null;
  projectPath: string | null;
  projectDir: string | null;
  selectedNodeId: string | null;
  soloNodeId: string | null;
  isDirty: boolean;
  isLoaded: boolean;
  recentProjects: string[];

  /** Backward-compatible bridge for v1 editor components */
  currentEffect: EffectConfig | null;
  messages: ChatMessage[];

  newProject: (name?: string) => void;
  loadProjectData: (project: EffectProject, path?: string | null) => void;
  openProjectFromJson: (json: string, path?: string | null) => void;
  saveProject: (path?: string) => Promise<boolean>;
  saveProjectAs: () => Promise<boolean>;
  closeProject: () => void;
  markDirty: () => void;

  selectNode: (nodeId: string) => void;
  addEmitter: (groupId?: string) => string;
  addGroup: (parentGroupId?: string) => string;
  removeNode: (nodeId: string) => void;
  renameNode: (nodeId: string, name: string) => void;
  setNodeEnabled: (nodeId: string, enabled: boolean) => void;
  setSoloNode: (nodeId: string | null) => void;
  updateNodeTransform: (nodeId: string, patch: Partial<import('@/types/project').Transform3D>) => void;
  reparentNode: (nodeId: string, newParentGroupId: string) => void;

  setCurrentEffect: (effect: EffectConfig | null) => void;
  updateEffectConfig: (updater: (prev: EffectConfig) => EffectConfig) => void;
  updateSelectedEmitterConfig: (updater: (cfg: Particle3DConfig) => Particle3DConfig) => void;
  updateEmitterAssetRefs: (nodeId: string, patch: Partial<EmitterAssetRefs>) => void;
  importProjectAsset: (entry: AssetEntry) => string;
  addMessage: (msg: ChatMessage) => void;

  syncAutosave: () => void;
  restoreAutosave: () => boolean;

  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

function refreshBridge(state: Pick<ProjectState, 'project' | 'selectedNodeId'>) {
  return { currentEffect: computeCurrentEffect(state.project, state.selectedNodeId) };
}

function nextHistoryStacks(
  stacks: HistoryStacks,
  project: EffectProject,
  selectedNodeId: string | null,
  soloNodeId: string | null
): HistoryStacks {
  return pushUndoSnapshot(stacks, createSnapshot(project, selectedNodeId, soloNodeId));
}

function applySnapshot(snapshot: EditorSnapshot) {
  const project = cloneProject(snapshot.project);
  return {
    project,
    selectedNodeId: snapshot.selectedNodeId,
    soloNodeId: snapshot.soloNodeId,
    isDirty: true,
    ...refreshBridge({ project, selectedNodeId: snapshot.selectedNodeId })
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  projectPath: null,
  projectDir: null,
  selectedNodeId: null,
  soloNodeId: null,
  isDirty: false,
  isLoaded: false,
  recentProjects: loadRecentProjects(),
  currentEffect: null,
  messages: [],
  undoStack: [],
  redoStack: [],

  newProject: (name) => {
    const project = createDefaultProject(name);
    const first = getFirstEmitter(project.root);
    set({
      project,
      projectPath: null,
      projectDir: null,
      selectedNodeId: first?.id ?? null,
      soloNodeId: null,
      isDirty: true,
      isLoaded: true,
      messages: [],
      ...emptyHistoryStacks(),
      ...refreshBridge({ project, selectedNodeId: first?.id ?? null })
    });
    syncAssetStoreFromProject(project.assetRegistry);
  },

  loadProjectData: (project, path = null) => {
    const first = getFirstEmitter(project.root);
    const projectDir = path ? getProjectDirFromFilePath(path) : null;
    const selectedNodeId = first?.id ?? null;
    if (path) pushRecent(path);
    const cloned = cloneProject(project);
    syncAssetStoreFromProject(cloned.assetRegistry);
    set({
      project: cloned,
      projectPath: path,
      projectDir,
      selectedNodeId,
      soloNodeId: null,
      isDirty: false,
      isLoaded: true,
      recentProjects: loadRecentProjects(),
      messages: [],
      ...emptyHistoryStacks(),
      ...refreshBridge({ project, selectedNodeId })
    });
  },

  openProjectFromJson: (json, path = null) => {
    const project = parseProjectJson(json);
    get().loadProjectData(project, path);
  },

  saveProject: async (path) => {
    const { project, projectPath } = get();
    if (!project) return false;
    const target = path ?? projectPath;
    const content = serializeProject(prepareProjectForSave(project));

    if (window.electronAPI?.writeFile && target) {
      const dir = getProjectDirFromFilePath(target);
      await window.electronAPI.mkdir(`${dir}/assets`);
      await window.electronAPI.writeFile(target, content);
      pushRecent(target);
      set({
        projectPath: target,
        projectDir: dir,
        isDirty: false,
        recentProjects: loadRecentProjects()
      });
      return true;
    }

    if (!target) return false;

    // Web fallback: download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = target.endsWith('.fxproj') ? target.split(/[/\\]/).pop()! : `${project.name}.fxproj`;
    a.click();
    URL.revokeObjectURL(url);
    set({ projectPath: target, isDirty: false });
    return true;
  },

  saveProjectAs: async () => {
    if (window.electronAPI?.saveProjectFile) {
      const { project } = get();
      if (!project) return false;
      const path = await window.electronAPI.saveProjectFile(project.name);
      if (!path) return false;
      return get().saveProject(path);
    }
    return get().saveProject(`${get().project?.name ?? 'project'}.fxproj`);
  },

  closeProject: () => {
    set({
      project: null,
      projectPath: null,
      projectDir: null,
      selectedNodeId: null,
      soloNodeId: null,
      isDirty: false,
      currentEffect: null,
      messages: [],
      ...emptyHistoryStacks()
    });
  },

  markDirty: () => set({ isDirty: true }),

  selectNode: (nodeId) => {
    const { project } = get();
    if (!project) return;
    const node = findNodeById(project.root, nodeId);
    if (!node) return;
    const selectedNodeId = nodeId;
    set({
      selectedNodeId,
      ...refreshBridge({ project, selectedNodeId })
    });
  },

  addEmitter: (groupId) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const targetGroupId = groupId ?? project.root.id;
    const name = getNextEmitterName(project.root);
    const emitter = createDefaultEmitter(name);
    const root = insertNodeInGroup(project.root, targetGroupId, emitter);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      selectedNodeId: emitter.id,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: emitter.id })
    });
    return emitter.id;
  },

  addGroup: (parentGroupId) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const targetGroupId = parentGroupId ?? project.root.id;
    const group: EffectGroupNode = {
      ...createDefaultRootGroup('Group'),
      name: 'Group',
      children: []
    };
    const root = insertNodeInGroup(project.root, targetGroupId, group);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      selectedNodeId: group.id,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: group.id })
    });
    return group.id;
  },

  removeNode: (nodeId) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project || nodeId === project.root.id) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const root = removeNodeFromTree(project.root, nodeId);
    const nextProject = touchProjectMetadata({ ...project, root });
    let nextSelected = selectedNodeId;
    if (selectedNodeId === nodeId) {
      nextSelected = getFirstEmitter(nextProject.root)?.id ?? null;
    }
    const nextSolo = soloNodeId === nodeId ? null : soloNodeId;
    set({
      ...history,
      project: nextProject,
      selectedNodeId: nextSelected,
      soloNodeId: nextSolo,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: nextSelected })
    });
  },

  renameNode: (nodeId, name) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const root = updateNodeInTree(project.root, nodeId, n => ({ ...n, name }));
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  setNodeEnabled: (nodeId, enabled) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const root = updateNodeInTree(project.root, nodeId, n => ({ ...n, enabled }));
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  setSoloNode: (nodeId) => set({ soloNodeId: nodeId }),

  updateNodeTransform: (nodeId, patch) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const root = updateNodeInTree(project.root, nodeId, n => ({
      ...n,
      transform: {
        position: patch.position ?? n.transform.position,
        rotation: patch.rotation ?? n.transform.rotation,
        scale: patch.scale ?? n.transform.scale
      }
    }));
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  reparentNode: (nodeId, newParentGroupId) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project || nodeId === project.root.id) return;
    const node = findNodeById(project.root, nodeId);
    if (!node) return;
    const parentInfo = findParentOfNode(project.root, nodeId);
    if (!parentInfo) return;
    if (parentInfo.parent.id === newParentGroupId) return;

    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    let root = removeNodeFromTree(project.root, nodeId);
    root = insertNodeInGroup(root, newParentGroupId, node);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  setCurrentEffect: (effect) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project || !effect) return;
    const emitter = getSelectedEmitter(project, selectedNodeId);
    if (!emitter) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const updated = applyEffectConfigToEmitter(emitter, effect);
    const root = updateNodeInTree(project.root, updated.id, () => updated);
    const nextProject = touchProjectMetadata({ ...project, root, name: effect.name });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: updated.id })
    });
  },

  updateEffectConfig: (updater) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack, currentEffect } = get();
    if (!project || !currentEffect) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const nextEffect = updater(currentEffect);
    const emitter = getSelectedEmitter(project, selectedNodeId);
    if (!emitter) return;
    const updated = applyEffectConfigToEmitter(emitter, nextEffect);
    const root = updateNodeInTree(project.root, updated.id, () => updated);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: updated.id })
    });
  },

  updateSelectedEmitterConfig: (updater) => {
    get().updateEffectConfig(prev => ({
      ...prev,
      config: updater(prev.config as Particle3DConfig)
    }));
  },

  updateEmitterAssetRefs: (nodeId, patch) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const node = findNodeById(project.root, nodeId);
    if (!node || !isEmitterNode(node)) return;
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const root = updateNodeInTree(project.root, nodeId, n => {
      if (!isEmitterNode(n)) return n;
      return {
        ...n,
        assetRefs: {
          ...n.assetRefs,
          ...patch
        }
      };
    });
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  importProjectAsset: (entry) => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks({ undoStack, redoStack }, project, selectedNodeId, soloNodeId);
    const registry = [...project.assetRegistry.filter(a => a.id !== entry.id), entry];
    const nextProject = touchProjectMetadata({ ...project, assetRegistry: registry });
    syncAssetStoreFromProject(registry);
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
    return entry.id;
  },

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),

  syncAutosave: () => {
    const { project, projectPath } = get();
    if (!project) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        project: prepareProjectForSave(project),
        projectPath,
        savedAt: Date.now()
      }));
    } catch { /* ignore */ }
  },

  restoreAutosave: () => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as { project: EffectProject; projectPath: string | null };
      if (!data.project) return false;
      get().loadProjectData(data.project, data.projectPath);
      set({ isDirty: true });
      return true;
    } catch {
      return false;
    }
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => set(emptyHistoryStacks()),

  undo: () => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const current = createSnapshot(project, selectedNodeId, soloNodeId);
    const { stacks, snapshot } = popUndo({ undoStack, redoStack }, current);
    if (!snapshot) return;
    set({ ...stacks, ...applySnapshot(snapshot) });
  },

  redo: () => {
    const { project, selectedNodeId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const current = createSnapshot(project, selectedNodeId, soloNodeId);
    const { stacks, snapshot } = popRedo({ undoStack, redoStack }, current);
    if (!snapshot) return;
    set({ ...stacks, ...applySnapshot(snapshot) });
  }
}));

/** Re-export for components still importing session-store patterns */
export type { EffectNode, ParticleEmitterNode, EffectGroupNode };
