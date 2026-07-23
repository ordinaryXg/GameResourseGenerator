import { describe, it, expect } from 'vitest';
import { resolveInspectorTarget, migratePanelSizes, DEFAULT_PROPERTIES_PANEL_WIDTH } from '@/utils/inspector-target';

describe('inspector-target', () => {
  it('returns explicit asset target', () => {
    const t = resolveInspectorTarget({ kind: 'asset', assetId: 'a1' }, 'n1', false);
    expect(t).toEqual({ kind: 'asset', assetId: 'a1' });
  });

  it('falls back to selected node when not suppressed', () => {
    const t = resolveInspectorTarget(null, 'n1', false);
    expect(t).toEqual({ kind: 'node', nodeId: 'n1' });
  });

  it('returns null when suppressed and no explicit target', () => {
    const t = resolveInspectorTarget(null, 'n1', true);
    expect(t).toBeNull();
  });

  it('migratePanelSizes upgrades legacy 280px right panel', () => {
    const sizes = migratePanelSizes({ right: 280, left: 300 });
    expect(sizes.right).toBe(DEFAULT_PROPERTIES_PANEL_WIDTH);
  });
});
