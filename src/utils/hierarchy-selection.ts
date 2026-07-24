import type { EffectGroupNode, EffectNode } from '@/types/project';
import { isGroupNode } from '@/types/project';

/** Depth-first flat list of selectable nodes (excluding scene root). */
export function flattenHierarchyNodes(root: EffectGroupNode): string[] {
  const ids: string[] = [];

  const walk = (nodes: EffectNode[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (isGroupNode(node)) walk(node.children);
    }
  };

  walk(root.children);
  return ids;
}

export function selectRangeInFlatList(
  flatIds: string[],
  anchorId: string,
  targetId: string
): string[] {
  const anchorIndex = flatIds.indexOf(anchorId);
  const targetIndex = flatIds.indexOf(targetId);
  if (anchorIndex < 0 || targetIndex < 0) return [targetId];
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return flatIds.slice(start, end + 1);
}

export type NodeSelectionModifier = 'replace' | 'toggle' | 'range';

export function resolveNextNodeSelection(
  flatIds: string[],
  currentIds: string[],
  nodeId: string,
  modifier: NodeSelectionModifier,
  anchorId: string | null
): { selectedNodeIds: string[]; selectionAnchorId: string | null; selectedNodeId: string } {
  if (modifier === 'toggle') {
    const selectedNodeIds = currentIds.includes(nodeId)
      ? currentIds.filter(id => id !== nodeId)
      : [...currentIds, nodeId];
    return {
      selectedNodeIds: selectedNodeIds.length ? selectedNodeIds : [nodeId],
      selectionAnchorId: nodeId,
      selectedNodeId: nodeId
    };
  }

  if (modifier === 'range') {
    const anchor = anchorId ?? currentIds[0] ?? nodeId;
    const selectedNodeIds = selectRangeInFlatList(flatIds, anchor, nodeId);
    return {
      selectedNodeIds,
      selectionAnchorId: anchor,
      selectedNodeId: nodeId
    };
  }

  return {
    selectedNodeIds: [nodeId],
    selectionAnchorId: nodeId,
    selectedNodeId: nodeId
  };
}

export function pruneNodeSelection(
  root: EffectGroupNode,
  selectedNodeIds: string[],
  selectedNodeId: string | null
): { selectedNodeIds: string[]; selectedNodeId: string | null; selectionAnchorId: string | null } {
  const flat = new Set(flattenHierarchyNodes(root));
  const pruned = selectedNodeIds.filter(id => flat.has(id));
  let primary = selectedNodeId && flat.has(selectedNodeId) ? selectedNodeId : null;
  if (!primary && pruned.length) primary = pruned[pruned.length - 1]!;
  const selectedNodeIdsOut = pruned.length
    ? pruned
    : primary
      ? [primary]
      : [];
  return {
    selectedNodeIds: selectedNodeIdsOut,
    selectedNodeId: primary,
    selectionAnchorId: primary
  };
}
