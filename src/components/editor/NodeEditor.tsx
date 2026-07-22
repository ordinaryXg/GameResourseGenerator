import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSessionStore } from '@/stores/session-store';
import type { Particle3DConfig } from '@/types/effect';

const MODULE_DEFS = [
  { key: 'mainModule', label: '主模块', color: '#58a6ff' },
  { key: 'shapeModule', label: '发射器形状', color: '#7c3aed' },
  { key: 'colorOverLifetime', label: '颜色', color: '#f85149' },
  { key: 'sizeOverLifetime', label: '大小', color: '#3fb950' },
  { key: 'rotationOverLifetime', label: '旋转', color: '#d29922' },
  { key: 'velocityOverLifetime', label: '速度', color: '#059669' },
  { key: 'noiseModule', label: '噪声', color: '#d97706' },
  { key: 'trailModule', label: '拖尾', color: '#0891b2' },
  { key: 'textureAnimation', label: '纹理动画', color: '#e879f9' },
  { key: 'rendererModule', label: '渲染器', color: '#6b7280' }
];

function getInitialNodes(config: Particle3DConfig | null): Node[] {
  if (!config) return [];

  return MODULE_DEFS.map((def, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const enabled = (config[def.key as keyof Particle3DConfig] as any)?.enabled !== false;

    return {
      id: def.key,
      type: 'default',
      position: { x: col * 200 + 20, y: row * 70 + 20 },
      data: { label: def.label },
      style: {
        background: enabled ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `2px solid ${enabled ? def.color : 'var(--border-color)'}`,
        color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 16px',
        fontSize: 13,
        opacity: enabled ? 1 : 0.5,
        width: 160
      }
    };
  });
}

function getInitialEdges(): Edge[] {
  return MODULE_DEFS.slice(1).map((def) => ({
    id: `e-main-${def.key}`,
    source: 'mainModule',
    target: def.key,
    animated: true,
    style: { stroke: 'var(--border-color)', strokeWidth: 1 }
  }));
}

export const NodeEditor: React.FC = () => {
  const { currentEffect } = useSessionStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;

  const initialNodes = useMemo(() => getInitialNodes(config || null), [config]);
  const initialEdges = useMemo(() => getInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when config changes
  React.useEffect(() => {
    setNodes(getInitialNodes(config || null));
  }, [config, setNodes]);

  if (!currentEffect) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
        fontSize: 14
      }}>
        在左侧对话面板输入特效描述以开始
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="var(--border-color)" gap={20} />
        <Controls />
        <MiniMap
          style={{ background: 'var(--bg-secondary)' }}
          maskColor="rgba(0,0,0,0.7)"
          nodeColor={(n) => n.style?.border?.toString().includes('var(--border-color)') ? '#666' : '#58a6ff'}
        />
      </ReactFlow>
    </div>
  );
};
