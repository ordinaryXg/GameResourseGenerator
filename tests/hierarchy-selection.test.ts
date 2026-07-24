import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import {
  flattenHierarchyNodes,
  resolveNextNodeSelection,
  selectRangeInFlatList
} from '../src/utils/hierarchy-selection';

describe('hierarchy-selection', () => {
  it('flattens hierarchy in depth-first order', () => {
    const project = createDefaultProject('test');
    const ids = flattenHierarchyNodes(project.root);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('selects inclusive range between anchor and target', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(selectRangeInFlatList(ids, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(selectRangeInFlatList(ids, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('toggles nodes without empty selection', () => {
    const next = resolveNextNodeSelection(['a', 'b'], ['a'], 'a', 'toggle', 'a');
    expect(next.selectedNodeIds).toEqual(['a']);
    expect(next.selectedNodeId).toBe('a');
  });
});
