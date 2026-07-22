import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MODULE_DEFS } from '@/constants/modules';

export interface ModuleNodeData {
  label: string;
  moduleKey: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export const ModuleNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ModuleNodeData;
  const def = MODULE_DEFS.find(d => d.key === nodeData.moduleKey);
  const enabled = nodeData.enabled !== false;
  const color = def?.color ?? '#58a6ff';
  const isMain = nodeData.moduleKey === 'mainModule';

  return (
    <div
      className={`module-node${selected ? ' is-selected' : ''}${enabled ? '' : ' is-disabled'}${isMain ? ' is-main' : ''}`}
      style={{ '--module-color': color } as React.CSSProperties}
    >
      {!isMain && <Handle type="target" position={Position.Left} className="module-handle" />}
      <div className="module-node-inner">
        <div className="module-node-icon" />
        <div className="module-node-content">
          <span className="module-node-label">{nodeData.label}</span>
          <span className={`module-node-badge${enabled ? ' on' : ''}`}>{enabled ? '启用' : '禁用'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="module-handle" />
    </div>
  );
});

ModuleNode.displayName = 'ModuleNode';
