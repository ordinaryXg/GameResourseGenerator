import React, { useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { useAssetStore } from '@/stores/asset-store';
import { NodeInspectorPanel } from '@/components/properties/NodeInspectorPanel';
import { AssetInspectorPanel } from '@/components/properties/AssetInspectorPanel';
import { findNodeById } from '@/utils/project-tree';
import { isEmitterNode, isGroupNode } from '@/types/project';
import { assetTypeLabel } from '@/utils/asset-dnd';

import type { AssetEntry } from '@/types/asset';

function resolveActiveTarget(
  inspectorTarget: ReturnType<typeof useAppStore.getState>['inspectorTarget'],
  selectedNodeId: string | null
) {
  if (inspectorTarget) return inspectorTarget;
  if (selectedNodeId) return { kind: 'node' as const, nodeId: selectedNodeId };
  return null;
}

export const PropertiesPanel: React.FC<{ onApplyAsset?: (asset: AssetEntry) => void }> = ({ onApplyAsset }) => {
  const inspectorTarget = useAppStore(s => s.inspectorTarget);
  const selectedNodeId = useProjectStore(s => s.selectedNodeId);
  const project = useProjectStore(s => s.project);
  const getAssetById = useAssetStore(s => s.getAssetById);

  const activeTarget = resolveActiveTarget(inspectorTarget, selectedNodeId);

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

  if (!activeTarget) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header">{header}</div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 13,
          padding: 16,
          textAlign: 'center',
          lineHeight: 1.6
        }}>
          在层级树或资产浏览器中<br />选择一个对象以查看属性
        </div>
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
