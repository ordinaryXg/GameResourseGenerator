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
import { buildPresetProject } from '@/data/preset-projects';
import {
  findNodeById,
  getFirstEmitter,
  updateNodeInTree,
  removeNodeFromTree,
  insertNodeInGroup,
  cloneProject,
  cloneEffectNode,
  touchProjectMetadata,
  findParentOfNode,
  containsNodeId,
  getStrictSelectedEmitter,
  mergeImportedProjectInto
} from '@/utils/project-tree';
import {
  serializeProject,
  parseProjectJson,
  emitterToEffectConfig,
  applyEffectConfigToEmitter,
  prepareProjectForSave,
  getProjectDirFromFilePath
} from '@/utils/project-io';
import { resolveProjectLocation } from '@/utils/project-paths';
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
import { syncAssetStoreFromProject, useAssetStore } from '@/stores/asset-store';
import { useAppStore } from '@/stores/app-store';
import { patchAssetInRegistry, duplicateAssetEntry } from '@/utils/asset-registry';
import { generateBuiltinShaderSource } from '@/utils/builtin-asset-content';
import { getEmitterNodes } from '@/utils/preview-sources';
import {
  flattenHierarchyNodes,
  pruneNodeSelection,
  resolveNextNodeSelection,
  type NodeSelectionModifier
} from '@/utils/hierarchy-selection';

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

function removeRecentFromStorage(path: string) {
  const list = loadRecentProjects().filter(p => p !== path);
  saveRecentProjects(list);
  return list;
}

function pickSelection(state: Pick<ProjectState, 'selectedNodeId' | 'selectedNodeIds' | 'selectionAnchorId'>) {
  return {
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: state.selectedNodeIds,
    selectionAnchorId: state.selectionAnchorId
  };
}

function selectionForNode(nodeId: string | null) {
  return {
    selectedNodeId: nodeId,
    selectedNodeIds: nodeId ? [nodeId] : [],
    selectionAnchorId: nodeId
  };
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

function getFirstEmitterInSubtree(node: EffectNode): ParticleEmitterNode | null {
  if (isEmitterNode(node)) return node;
  if (isGroupNode(node)) {
    for (const child of node.children) {
      const found = getFirstEmitterInSubtree(child);
      if (found) return found;
    }
  }
  return null;
}

interface ProjectState {
  project: EffectProject | null;
  projectPath: string | null;
  projectDir: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectionAnchorId: string | null;
  soloNodeId: string | null;
  isDirty: boolean;
  isLoaded: boolean;
  recentProjects: string[];

  /** Backward-compatible bridge for v1 editor components */
  currentEffect: EffectConfig | null;
  messages: ChatMessage[];

  newProject: (name?: string) => void;
  createNewProjectInFolder: () => Promise<
    | { ok: true }
    | { ok: false; reason: 'cancelled' | 'exists' | 'error'; message?: string }
  >;
  newProjectFromPreset: (presetId: string) => void;
  loadProjectData: (project: EffectProject, path?: string | null, options?: { assetRootDir?: string | null }) => void;
  openProjectFromJson: (json: string, path?: string | null) => void;
  openProjectFolder: () => Promise<
    | { ok: true }
    | { ok: false; reason: 'cancelled' | 'no-fxproj' | 'error'; message?: string }
  >;
  openRecentProject: (path: string) => Promise<{ ok: true } | { ok: false; reason: 'missing' | 'error'; message?: string }>;
  removeRecentProject: (path: string) => void;
  pruneRecentProjects: () => Promise<void>;
  saveProject: (path?: string) => Promise<boolean>;
  saveProjectAs: () => Promise<boolean>;
  importPrefabRoot: (
    imported: EffectProject,
    options?: { assetRootDir?: string | null }
  ) => { addedRootId: string; emitterCount: number } | null;
  closeProject: () => void;
  markDirty: () => void;

  selectNode: (nodeId: string, modifier?: NodeSelectionModifier) => void;
  removeSelectedNodes: () => void;
  addEmitter: (groupId?: string) => string;
  addGroup: (parentGroupId?: string) => string;
  removeNode: (nodeId: string) => void;
  renameNode: (nodeId: string, name: string) => void;
  setNodeEnabled: (nodeId: string, enabled: boolean) => void;
  setSoloNode: (nodeId: string | null) => void;
  updateNodeTransform: (nodeId: string, patch: Partial<import('@/types/project').Transform3D>) => void;
  updateNodeAnimation: (nodeId: string, updater: (prev: import('@/types/project').NodeAnimationClip) => import('@/types/project').NodeAnimationClip) => void;
  reparentNode: (nodeId: string, newParentGroupId: string) => void;
  duplicateNode: (nodeId: string) => string;
  removeProjectAsset: (assetId: string) => void;
  updateProjectAsset: (
    assetId: string,
    patch: Partial<AssetEntry> | ((asset: AssetEntry) => AssetEntry)
  ) => void;
  duplicateAssetToProject: (sourceAssetId: string) => string;

  applyAiEffectToSelectedEmitter: (effect: EffectConfig) => boolean;
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
  selection: Pick<ProjectState, 'selectedNodeId' | 'selectedNodeIds' | 'selectionAnchorId'>,
  soloNodeId: string | null
): HistoryStacks {
  return pushUndoSnapshot(
    stacks,
    createSnapshot(
      project,
      selection.selectedNodeId,
      soloNodeId,
      selection.selectedNodeIds,
      selection.selectionAnchorId
    )
  );
}

function applySnapshot(snapshot: EditorSnapshot) {
  const project = cloneProject(snapshot.project);
  const pruned = pruneNodeSelection(
    project.root,
    snapshot.selectedNodeIds ?? (snapshot.selectedNodeId ? [snapshot.selectedNodeId] : []),
    snapshot.selectedNodeId
  );
  return {
    project,
    ...pruned,
    soloNodeId: snapshot.soloNodeId,
    isDirty: true,
    ...refreshBridge({ project, selectedNodeId: pruned.selectedNodeId })
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  projectPath: null,
  projectDir: null,
  selectedNodeId: null,
  selectedNodeIds: [],
  selectionAnchorId: null,
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
      ...selectionForNode(first?.id ?? null),
      soloNodeId: null,
      isDirty: true,
      isLoaded: true,
      messages: [],
      ...emptyHistoryStacks(),
      ...refreshBridge({ project, selectedNodeId: first?.id ?? null })
    });
    syncAssetStoreFromProject(project.assetRegistry);
  },

  createNewProjectInFolder: async () => {
    const api = window.electronAPI;
    if (!api?.pickProjectFolder || !api.mkdir || !api.writeFile || !api.exists) {
      return { ok: false, reason: 'error', message: '需要 Electron 环境才能新建项目' };
    }

    const picked = await api.pickProjectFolder({
      title: '新建项目 — 选择或创建项目文件夹',
      buttonLabel: '创建'
    });
    if (!picked) return { ok: false, reason: 'cancelled' };

    const { projectDir, projectPath, projectName } = resolveProjectLocation(picked);
    if (await api.exists(projectPath)) {
      return {
        ok: false,
        reason: 'exists',
        message: `该文件夹已存在 ${projectName}.fxproj，请换文件夹或打开已有项目`
      };
    }

    const project = createDefaultProject(projectName);
    const first = getFirstEmitter(project.root);
    const selectedNodeId = first?.id ?? null;
    const content = serializeProject(prepareProjectForSave(project));

    try {
      await api.mkdir(projectDir);
      await api.writeFile(projectPath, content);
      pushRecent(projectPath);
      set({
        project,
        projectPath,
        projectDir,
        ...selectionForNode(selectedNodeId),
        soloNodeId: null,
        isDirty: false,
        isLoaded: true,
        messages: [],
        recentProjects: loadRecentProjects(),
        ...emptyHistoryStacks(),
        ...refreshBridge({ project, selectedNodeId })
      });
      syncAssetStoreFromProject(project.assetRegistry);
      if (selectedNodeId) {
        useAppStore.getState().selectNodeForInspector(selectedNodeId);
      } else {
        useAppStore.getState().clearInspectorTarget();
      }
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建失败';
      return { ok: false, reason: 'error', message };
    }
  },

  newProjectFromPreset: (presetId) => {
    const project = buildPresetProject(presetId);
    const first = getFirstEmitter(project.root);
    set({
      project,
      projectPath: null,
      projectDir: null,
      ...selectionForNode(first?.id ?? null),
      soloNodeId: null,
      isDirty: true,
      isLoaded: true,
      messages: [],
      ...emptyHistoryStacks(),
      ...refreshBridge({ project, selectedNodeId: first?.id ?? null })
    });
    syncAssetStoreFromProject(project.assetRegistry);
    if (first?.id) {
      useAppStore.getState().selectNodeForInspector(first.id);
    }
  },

  loadProjectData: (project, path = null, options) => {
    const first = getFirstEmitter(project.root);
    const projectDir = options?.assetRootDir ?? (path ? getProjectDirFromFilePath(path) : null);
    const selectedNodeId = first?.id ?? null;
    if (path) pushRecent(path);
    const cloned = cloneProject(project);
    syncAssetStoreFromProject(cloned.assetRegistry);
    set({
      project: cloned,
      projectPath: path,
      projectDir,
      ...selectionForNode(selectedNodeId),
      soloNodeId: null,
      isDirty: false,
      isLoaded: true,
      recentProjects: loadRecentProjects(),
      messages: [],
      ...emptyHistoryStacks(),
      ...refreshBridge({ project, selectedNodeId })
    });
    if (selectedNodeId) {
      useAppStore.getState().selectNodeForInspector(selectedNodeId);
    } else {
      useAppStore.getState().clearInspectorTarget();
    }
  },

  openProjectFromJson: (json, path = null) => {
    const project = parseProjectJson(json);
    get().loadProjectData(project, path);
  },

  openProjectFolder: async () => {
    const api = window.electronAPI;
    if (!api?.openProjectFolder || !api.readFile) {
      return { ok: false, reason: 'error', message: '需要 Electron 环境' };
    }
    try {
      const result = await api.openProjectFolder();
      if (!result?.ok) {
        if (result?.error === 'NO_FXPROJ') {
          return { ok: false, reason: 'no-fxproj', message: '所选文件夹内没有 .fxproj 文件' };
        }
        return { ok: false, reason: 'cancelled' };
      }
      const json = await api.readFile(result.projectPath);
      get().openProjectFromJson(json, result.projectPath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '打开失败';
      return { ok: false, reason: 'error', message };
    }
  },

  openRecentProject: async (path) => {
    const api = window.electronAPI;
    if (!api?.readFile) {
      return { ok: false, reason: 'error', message: '当前环境不支持打开本地项目' };
    }
    try {
      if (api.exists) {
        const exists = await api.exists(path);
        if (!exists) {
          get().removeRecentProject(path);
          return { ok: false, reason: 'missing' };
        }
      }
      const json = await api.readFile(path);
      get().openProjectFromJson(json, path);
      return { ok: true };
    } catch (err) {
      get().removeRecentProject(path);
      const message = err instanceof Error ? err.message : '打开失败';
      return { ok: false, reason: 'error', message };
    }
  },

  removeRecentProject: (path) => {
    set({ recentProjects: removeRecentFromStorage(path) });
  },

  pruneRecentProjects: async () => {
    const api = window.electronAPI;
    if (!api?.exists) return;
    const list = loadRecentProjects();
    if (list.length === 0) return;
    const valid: string[] = [];
    for (const p of list) {
      if (await api.exists(p)) valid.push(p);
    }
    if (valid.length !== list.length) {
      saveRecentProjects(valid);
      set({ recentProjects: valid });
    }
  },

  saveProject: async (path) => {
    const { project, projectPath } = get();
    if (!project) return false;
    const target = path ?? projectPath;
    const content = serializeProject(prepareProjectForSave(project));

    if (window.electronAPI?.writeFile && target) {
      const dir = getProjectDirFromFilePath(target);
      await window.electronAPI.mkdir(dir);
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
    const { project, selectedNodeId } = get();
    if (!project) return false;

    if (window.electronAPI?.pickProjectFolder && window.electronAPI.mkdir) {
      const picked = await window.electronAPI.pickProjectFolder({
        title: '另存为 — 选择项目文件夹',
        buttonLabel: '保存'
      });
      if (!picked) return false;
      const { projectDir, projectPath, projectName } = resolveProjectLocation(picked);
      await window.electronAPI.mkdir(projectDir);
      const nextProject =
        project.name !== projectName
          ? touchProjectMetadata({ ...project, name: projectName })
          : project;
      if (nextProject !== project) {
        set({
          project: nextProject,
          ...refreshBridge({ project: nextProject, selectedNodeId })
        });
      }
      return get().saveProject(projectPath);
    }

    return get().saveProject(`${project.name}.fxproj`);
  },

  importPrefabRoot: (imported, options) => {
    const {
      project,
      selectedNodeId,
      selectedNodeIds,
      selectionAnchorId,
      soloNodeId,
      undoStack,
      redoStack,
      projectDir
    } = get();
    if (!project) return null;

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const { project: merged, addedRootId } = mergeImportedProjectInto(project, imported);
    const addedNode = findNodeById(merged.root, addedRootId);
    const selectId = addedNode
      ? getFirstEmitterInSubtree(addedNode)?.id ?? addedRootId
      : getFirstEmitter(merged.root)?.id ?? null;

    const nextProjectDir = options?.assetRootDir ?? projectDir;

    set({
      ...history,
      project: merged,
      projectDir: nextProjectDir,
      ...selectionForNode(selectId),
      isDirty: true,
      ...refreshBridge({ project: merged, selectedNodeId: selectId })
    });
    syncAssetStoreFromProject(merged.assetRegistry);
    if (selectId) {
      useAppStore.getState().selectNodeForInspector(selectId);
    }
    return {
      addedRootId,
      emitterCount: getEmitterNodes(merged.root).length
    };
  },

  closeProject: () => {
    useAppStore.getState().clearInspectorTarget();
    set({
      project: null,
      projectPath: null,
      projectDir: null,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectionAnchorId: null,
      soloNodeId: null,
      isDirty: false,
      currentEffect: null,
      messages: [],
      ...emptyHistoryStacks()
    });
  },

  markDirty: () => set({ isDirty: true }),

  selectNode: (nodeId, modifier = 'replace') => {
    const { project, selectedNodeIds, selectionAnchorId } = get();
    if (!project) return;
    const node = findNodeById(project.root, nodeId);
    if (!node) return;
    const flat = flattenHierarchyNodes(project.root);
    const resolved = resolveNextNodeSelection(
      flat,
      selectedNodeIds,
      nodeId,
      modifier,
      selectionAnchorId
    );
    set({
      selectedNodeIds: resolved.selectedNodeIds,
      selectedNodeId: resolved.selectedNodeId,
      selectionAnchorId: resolved.selectionAnchorId,
      ...refreshBridge({ project, selectedNodeId: resolved.selectedNodeId })
    });
    useAppStore.getState().selectNodeForInspector(resolved.selectedNodeId);
  },

  removeSelectedNodes: () => {
    const { project, selectedNodeIds, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const ids = [...new Set(selectedNodeIds)].filter(id => id !== project.root.id);
    if (ids.length === 0) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection(get()),
      soloNodeId
    );
    let root = project.root;
    for (const id of ids) {
      root = removeNodeFromTree(root, id);
    }
    const nextProject = touchProjectMetadata({ ...project, root });
    const nextSolo = soloNodeId && ids.includes(soloNodeId) ? null : soloNodeId;
    const pruned = pruneNodeSelection(nextProject.root, [], null);
    set({
      ...history,
      project: nextProject,
      ...pruned,
      soloNodeId: nextSolo,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: pruned.selectedNodeId })
    });
  },

  addEmitter: (groupId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const targetGroupId = groupId ?? project.root.id;
    const name = getNextEmitterName(project.root);
    const emitter = createDefaultEmitter(name);
    const root = insertNodeInGroup(project.root, targetGroupId, emitter);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      ...selectionForNode(emitter.id),
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: emitter.id })
    });
    return emitter.id;
  },

  addGroup: (parentGroupId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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
      ...selectionForNode(group.id),
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: group.id })
    });
    return group.id;
  },

  removeNode: (nodeId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project || nodeId === project.root.id) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const root = removeNodeFromTree(project.root, nodeId);
    const nextProject = touchProjectMetadata({ ...project, root });
    const remainingIds = selectedNodeIds.filter(id => id !== nodeId);
    let nextSelected = selectedNodeId;
    if (selectedNodeId === nodeId) {
      nextSelected = remainingIds[0] ?? getFirstEmitter(nextProject.root)?.id ?? null;
    }
    const pruned = pruneNodeSelection(nextProject.root, remainingIds, nextSelected);
    const nextSolo = soloNodeId === nodeId ? null : soloNodeId;
    set({
      ...history,
      project: nextProject,
      ...pruned,
      soloNodeId: nextSolo,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: pruned.selectedNodeId })
    });
  },

  renameNode: (nodeId, name) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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

  updateNodeAnimation: (nodeId, updater) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const root = updateNodeInTree(project.root, nodeId, (n) => {
      if (!n.animation) return n;
      return { ...n, animation: updater(n.animation) };
    });
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  reparentNode: (nodeId, newParentGroupId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project || nodeId === project.root.id) return;
    const node = findNodeById(project.root, nodeId);
    if (!node) return;
    const target = findNodeById(project.root, newParentGroupId);
    if (!target || !isGroupNode(target)) return;
    if (containsNodeId(project.root, nodeId, newParentGroupId)) return;
    const parentInfo = findParentOfNode(project.root, nodeId);
    if (!parentInfo) return;
    if (parentInfo.parent.id === newParentGroupId) return;

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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

  duplicateNode: (nodeId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project || nodeId === project.root.id) return '';
    const node = findNodeById(project.root, nodeId);
    if (!node) return '';
    const parentInfo = findParentOfNode(project.root, nodeId);
    if (!parentInfo) return '';

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const clone = cloneEffectNode(node);
    const root = insertNodeInGroup(project.root, parentInfo.parent.id, clone, parentInfo.index + 1);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      ...selectionForNode(clone.id),
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: clone.id })
    });
    return clone.id;
  },

  setCurrentEffect: (effect) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project || !effect) return;
    const emitter = getSelectedEmitter(project, selectedNodeId);
    if (!emitter) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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

  applyAiEffectToSelectedEmitter: (effect) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project || !effect) return false;
    const emitter = getStrictSelectedEmitter(project.root, selectedNodeId);
    if (!emitter) return false;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const updated = applyEffectConfigToEmitter(emitter, effect);
    const root = updateNodeInTree(project.root, updated.id, () => updated);
    const nextProject = touchProjectMetadata({ ...project, root });
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId: updated.id })
    });
    return true;
  },

  updateEffectConfig: (updater) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack, currentEffect } = get();
    if (!project || !currentEffect) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const node = findNodeById(project.root, nodeId);
    if (!node || !isEmitterNode(node)) return;
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
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

  removeProjectAsset: (assetId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const entry = project.assetRegistry.find(a => a.id === assetId);
    if (!entry || entry.source === 'builtin') return;

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const registry = project.assetRegistry.filter(a => a.id !== assetId);

    const clearRefs = (nodes: EffectNode[]): EffectNode[] =>
      nodes.map(n => {
        let next = n;
        if (isEmitterNode(n)) {
          const refs = { ...n.assetRefs };
          let changed = false;
          if (refs.mainTexture === assetId) { delete refs.mainTexture; changed = true; }
          if (refs.material === assetId) { delete refs.material; changed = true; }
          if (refs.mesh === assetId) { delete refs.mesh; changed = true; }
          if (changed) next = { ...n, assetRefs: refs };
        }
        if (isGroupNode(next)) {
          return { ...next, children: clearRefs(next.children) };
        }
        return next;
      });

    const root = { ...project.root, children: clearRefs(project.root.children) };
    const nextProject = touchProjectMetadata({ ...project, root, assetRegistry: registry });
    syncAssetStoreFromProject(registry);
    const insp = useAppStore.getState().inspectorTarget;
    if (insp?.kind === 'asset' && insp.assetId === assetId) {
      useAppStore.getState().clearInspectorTarget();
    }
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  updateProjectAsset: (assetId, patch) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const entry = project.assetRegistry.find(a => a.id === assetId);
    if (!entry || entry.source === 'builtin') return;

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const registry = patchAssetInRegistry(project.assetRegistry, assetId, patch);
    const nextProject = touchProjectMetadata({ ...project, assetRegistry: registry });
    syncAssetStoreFromProject(registry);
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
  },

  duplicateAssetToProject: (sourceAssetId) => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return '';
    const source = useAssetStore.getState().getAssetById(sourceAssetId);
    if (!source) return '';

    const history = nextHistoryStacks(
      { undoStack, redoStack },
      project,
      pickSelection({ selectedNodeId, selectedNodeIds, selectionAnchorId }),
      soloNodeId
    );
    const clone = duplicateAssetEntry(source);
    if (clone.type === 'shader' && !clone.meta?.shaderSource) {
      clone.meta = { ...clone.meta, shaderSource: generateBuiltinShaderSource(source) };
    }
    const registry = [...project.assetRegistry.filter(a => a.id !== clone.id), clone];
    const nextProject = touchProjectMetadata({ ...project, assetRegistry: registry });
    syncAssetStoreFromProject(registry);
    useAppStore.getState().selectAssetForInspector(clone.id);
    set({
      ...history,
      project: nextProject,
      isDirty: true,
      ...refreshBridge({ project: nextProject, selectedNodeId })
    });
    return clone.id;
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
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const current = createSnapshot(
      project,
      selectedNodeId,
      soloNodeId,
      selectedNodeIds,
      selectionAnchorId
    );
    const { stacks, snapshot } = popUndo({ undoStack, redoStack }, current);
    if (!snapshot) return;
    set({ ...stacks, ...applySnapshot(snapshot) });
  },

  redo: () => {
    const { project, selectedNodeId, selectedNodeIds, selectionAnchorId, soloNodeId, undoStack, redoStack } = get();
    if (!project) return;
    const current = createSnapshot(
      project,
      selectedNodeId,
      soloNodeId,
      selectedNodeIds,
      selectionAnchorId
    );
    const { stacks, snapshot } = popRedo({ undoStack, redoStack }, current);
    if (!snapshot) return;
    set({ ...stacks, ...applySnapshot(snapshot) });
  }
}));

/** Re-export for components still importing session-store patterns */
export type { EffectNode, ParticleEmitterNode, EffectGroupNode };
