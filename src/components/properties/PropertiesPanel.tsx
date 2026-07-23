import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import { NodeInspectorPanel } from '@/components/properties/NodeInspectorPanel';
import { AssetInspectorPanel } from '@/components/properties/AssetInspectorPanel';
import { PropertiesEmptyState } from '@/components/properties/PropertiesEmptyState';
import { findNodeById } from '@/utils/project-tree';
import { isEmitterNode, isGroupNode } from '@/types/project';
import { assetTypeLabel } from '@/utils/asset-dnd';
import {
  resolveInspectorTarget,
  SHADER_INSPECTOR_MIN_WIDTH
} from '@/utils/inspector-target';
import type { AssetEntry } from '@/types/asset';

export const PropertiesPanel: React.FC<{ onApplyAsset?: (asset: AssetEntry) => void }> = ({ onApplyAsset }) => {
  const inspectorTarget = useAppStore(s => s.inspectorTarget);
  const inspectorSuppressFallback = useAppStore(s => s.inspectorSuppressFallback);
  const panelSizes = useAppStore(s => s.panelSizes);
  const setPanelSize = useAppStore(s => s.setPanelSize);
  const selectedNodeId = useProjectStore(s => s.selectedNodeId);
  const project = useProjectStore(s => s.project);
  const getAssetById = useAssetStore(s => s.getAssetById);

  const activeTarget = resolveInspectorTarget(
    inspectorTarget,
    selectedNodeId,
    inspectorSuppressFallback
  );

  const header = useMemo(() => {
    if (!activeTarget) return '属性';
    if (activeTarget.kind === 'asset') {
      const asset = getAssetById(activeTarget.assetId);
      if (!asset) return '属性 · 资产';
      return `属性 · ${asset.name}（${assetTypeLabel(asset.type)}）`;
    }
    if (!project) return '属性 · 节点';
    const node = findNodeById(project.root, activeTarget.nodeId);
    if (!node) return '属性 · 节点';
    const kind = isEmitterNode(node) ? '发射器' : isGroupNode(node) ? '组' : '节点';
    return `属性 · ${node.name}（${kind}）`;
  }, [activeTarget, getAssetById, project]);

  useEffect(() => {
    if (activeTarget?.kind !== 'asset') return;
    const asset = getAssetById(activeTarget.assetId);
    if (asset?.type !== 'shader') return;
    if (panelSizes.right < SHADER_INSPECTOR_MIN_WIDTH) {
      setPanelSize('right', SHADER_INSPECTOR_MIN_WIDTH);
    }
  }, [activeTarget, getAssetById, panelSizes.right, setPanelSize]);

  if (!activeTarget) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header">{header}</div>
        <PropertiesEmptyState />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="panel-header" style={{ fontSize: 12 }}>{header}</div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTarget.kind === 'asset' ? (
          <AssetInspectorPanel assetId={activeTarget.assetId} onApplyAsset={onApplyAsset} />
        ) : (
          <NodeInspectorPanel />
        )}
      </div>
    </div>
  );
};
