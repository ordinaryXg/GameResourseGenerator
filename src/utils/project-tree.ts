import type { EffectNode, EffectGroupNode, EffectProject, ParticleEmitterNode } from '@/types/project';
import { isGroupNode, isEmitterNode } from '@/types/project';

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

export function cloneProject(project: EffectProject): EffectProject {
  return JSON.parse(JSON.stringify(project));
}

export function touchProjectMetadata(project: EffectProject): EffectProject {
  return {
    ...project,
    metadata: { ...project.metadata, updatedAt: new Date().toISOString() }
  };
}
