import type { AssetEntry } from '@/types/asset';
import type { EffectNode, EffectGroupNode, EffectProject, ParticleEmitterNode } from '@/types/project';
import { isGroupNode, isEmitterNode } from '@/types/project';
import { generateUUID } from './effect-defaults';
import { isSceneContainer, SCENE_ROOT_NAME } from './project-factory';
import { identityTransform } from './transform-utils';

export function findNodeById(root: EffectGroupNode, id: string): EffectNode | null {
  if (root.id === id) return root;
  return findNodeInChildren(root.children, id);
}

function findNodeInChildren(nodes: EffectNode[], id: string): EffectNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (isGroupNode(node)) {
      const found = findNodeInChildren(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParentOfNode(
  root: EffectGroupNode,
  id: string
): { parent: EffectGroupNode; index: number } | null {
  if (root.id === id) return null;
  return findParentInChildren(root, root.children, id);
}

function findParentInChildren(
  rootGroup: EffectGroupNode,
  nodes: EffectNode[],
  id: string
): { parent: EffectGroupNode; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) return { parent: rootGroup, index: i };
    if (isGroupNode(node)) {
      const found = findParentInChildren(node, node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function walkEmitters(root: EffectGroupNode, visit: (emitter: ParticleEmitterNode) => void) {
  const walk = (nodes: EffectNode[]) => {
    for (const node of nodes) {
      if (isEmitterNode(node)) visit(node);
      else if (isGroupNode(node)) walk(node.children);
    }
  };
  walk(root.children);
}

export function getFirstEmitter(root: EffectGroupNode): ParticleEmitterNode | null {
  let first: ParticleEmitterNode | null = null;
  walkEmitters(root, (e) => {
    if (!first) first = e;
  });
  return first;
}

/** 仅当层级树明确选中发射器时返回（AI 等作用域用，不回退到第一个发射器）。 */
export function getStrictSelectedEmitter(
  root: EffectGroupNode,
  selectedNodeId: string | null
): ParticleEmitterNode | null {
  if (!selectedNodeId) return null;
  const node = findNodeById(root, selectedNodeId);
  return node && isEmitterNode(node) ? node : null;
}

/** `searchId` 是否位于 `containerId` 子树内（含自身）。 */
export function containsNodeId(
  root: EffectGroupNode,
  containerId: string,
  searchId: string
): boolean {
  if (containerId === searchId) return true;
  const container = findNodeById(root, containerId);
  if (!container || !isGroupNode(container)) return false;
  return !!findNodeInChildren(container.children, searchId);
}

export function updateNodeInTree(
  root: EffectGroupNode,
  nodeId: string,
  updater: (node: EffectNode) => EffectNode
): EffectGroupNode {
  if (root.id === nodeId) return updater(root) as EffectGroupNode;
  return {
    ...root,
    children: updateChildren(root.children, nodeId, updater)
  };
}

function updateChildren(
  nodes: EffectNode[],
  nodeId: string,
  updater: (node: EffectNode) => EffectNode
): EffectNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) return updater(node);
    if (isGroupNode(node)) {
      return { ...node, children: updateChildren(node.children, nodeId, updater) };
    }
    return node;
  });
}

export function removeNodeFromTree(root: EffectGroupNode, nodeId: string): EffectGroupNode {
  if (root.id === nodeId) return root;
  return {
    ...root,
    children: removeFromChildren(root.children, nodeId)
  };
}

function removeFromChildren(nodes: EffectNode[], nodeId: string): EffectNode[] {
  return nodes
    .filter(n => n.id !== nodeId)
    .map(n => (isGroupNode(n) ? { ...n, children: removeFromChildren(n.children, nodeId) } : n));
}

export function insertNodeInGroup(
  root: EffectGroupNode,
  groupId: string,
  node: EffectNode,
  index?: number
): EffectGroupNode {
  return updateNodeInTree(root, groupId, (n) => {
    if (!isGroupNode(n)) return n;
    const children = [...n.children];
    const at = index ?? children.length;
    children.splice(at, 0, node);
    return { ...n, children };
  }) as EffectGroupNode;
}

export function cloneEffectNode(node: EffectNode, nameSuffix = ' (1)'): EffectNode {
  const raw = JSON.parse(JSON.stringify(node)) as EffectNode;
  const reid = (n: EffectNode): EffectNode => {
    if (isGroupNode(n)) {
      return {
        ...n,
        id: generateUUID(),
        name: `${n.name}${nameSuffix}`,
        children: n.children.map(reid)
      };
    }
    return { ...n, id: generateUUID(), name: `${n.name}${nameSuffix}` };
  };
  return reid(raw);
}

export function cloneProject(project: EffectProject): EffectProject {
  return JSON.parse(JSON.stringify(project));
}

export function touchProjectMetadata(project: EffectProject): EffectProject {
  return {
    ...project,
    metadata: { ...project.metadata, updatedAt: new Date().toISOString() }
  };
}

export function reIdEffectNode(node: EffectNode): EffectNode {
  const walk = (n: EffectNode): EffectNode => {
    if (isGroupNode(n)) {
      return {
        ...n,
        id: generateUUID(),
        children: n.children.map(walk)
      };
    }
    return { ...n, id: generateUUID() };
  };
  return walk(JSON.parse(JSON.stringify(node)) as EffectNode);
}

function remapAssetRefsInNode(node: EffectNode, idMap: Map<string, string>): EffectNode {
  if (isEmitterNode(node)) {
    const refs = { ...node.assetRefs };
    if (idMap.has(refs.mainTexture)) refs.mainTexture = idMap.get(refs.mainTexture)!;
    if (refs.material && idMap.has(refs.material)) refs.material = idMap.get(refs.material)!;
    return { ...node, assetRefs: refs };
  }
  if (isGroupNode(node)) {
    return { ...node, children: node.children.map((child) => remapAssetRefsInNode(child, idMap)) };
  }
  return node;
}

function mergeAssetRegistries(
  target: AssetEntry[],
  imported: AssetEntry[]
): { registry: AssetEntry[]; idMap: Map<string, string> } {
  const existingIds = new Set(target.map((asset) => asset.id));
  const idMap = new Map<string, string>();
  const registry = [...target];

  for (const asset of imported) {
    if (asset.source === 'builtin' && existingIds.has(asset.id)) continue;
    if (existingIds.has(asset.id)) {
      const newId = generateUUID();
      idMap.set(asset.id, newId);
      registry.push({ ...asset, id: newId });
      existingIds.add(newId);
      continue;
    }
    registry.push(asset);
    existingIds.add(asset.id);
  }

  return { registry, idMap };
}

function uniquifySiblingName(name: string, siblings: EffectNode[]): string {
  const existing = new Set(siblings.map((node) => node.name));
  if (!existing.has(name)) return name;
  let i = 2;
  while (existing.has(`${name} ${i}`)) i += 1;
  return `${name} ${i}`;
}

/** Append imported prefab tree as a new top-level root under the scene container. */
export function mergeImportedProjectInto(
  target: EffectProject,
  imported: EffectProject
): { project: EffectProject; addedRootId: string } {
  const { registry, idMap } = mergeAssetRegistries(target.assetRegistry, imported.assetRegistry);
  let rootNode = reIdEffectNode(imported.root);
  rootNode = remapAssetRefsInNode(rootNode, idMap);
  rootNode = { ...rootNode, name: uniquifySiblingName(rootNode.name, target.root.children) };

  const addedRootId = rootNode.id;
  const root: EffectGroupNode = {
    ...target.root,
    children: [...target.root.children, rootNode]
  };

  return {
    project: touchProjectMetadata({ ...target, root, assetRegistry: registry }),
    addedRootId
  };
}

/** Wrap a single imported prefab as a new unsaved project with one top-level root. */
export function wrapImportedAsNewProject(imported: EffectProject): EffectProject {
  const rootNode = reIdEffectNode(imported.root);
  return touchProjectMetadata({
    ...imported,
    root: {
      type: 'group',
      id: generateUUID(),
      name: SCENE_ROOT_NAME,
      enabled: true,
      transform: identityTransform(),
      children: [rootNode]
    }
  });
}

/** Resolve the node tree used for Cocos prefab export. */
export function getExportTreeRoot(project: EffectProject): EffectGroupNode {
  const { root } = project;
  if (!isSceneContainer(root)) return root;

  if (root.children.length === 1 && isGroupNode(root.children[0]!)) {
    return root.children[0]!;
  }

  return {
    type: 'group',
    id: root.id,
    name: project.name,
    enabled: true,
    transform: identityTransform(),
    children: root.children
  };
}
