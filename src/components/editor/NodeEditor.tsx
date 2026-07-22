import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSessionStore } from '@/stores/session-store';
import { useAppStore } from '@/stores/app-store';
import { MODULE_DEFS } from '@/constants/modules';
import type { Particle3DConfig } from '@/types/effect';

function getNodeStyle(def: typeof MODULE_DEFS[number], enabled: boolean, selected: boolean) {
  return {
    background: enabled ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    border: `2px solid ${selected ? '#fff' : enabled ? def.color : 'var(--border-color)'}`,
    color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    opacity: enabled ? 1 : 0.5,
    width: 160,
    cursor: 'pointer',
    boxShadow: selected ? `0 0 0 2px ${def.color}` : undefined
  };
}

function getInitialNodes(
  config: Particle3DConfig | null,
  layout?: Record<string, { x: number; y: number }>,
  selectedKey?: string | null
): Node[] {
  if (!config) return [];
  return MODULE_DEFS.map((def, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const enabled = (config[def.key as keyof Particle3DConfig] as { enabled?: boolean })?.enabled !== false;
    const saved = layout?.[def.key];
    return {
      id: def.key,
      type: 'default',
      position: saved || { x: col * 200 + 20, y: row * 70 + 20 },
      data: { label: def.label, moduleKey: def.key, enabled },
      style: getNodeStyle(def, enabled, selectedKey === def.key)
    };
  });
}

function getInitialEdges(): Edge[] {
  return MODULE_DEFS.slice(1).map(def => ({
    id: `e-main-${def.key}`,
    source: 'mainModule',
    target: def.key,
    animated: true,
    style: { stroke: 'var(--border-color)', strokeWidth: 1 }
  }));
}

export const NodeEditor: React.FC = () => {
  const { currentEffect, updateEffectConfig } = useSessionStore();
  const { selectedModuleKey, setSelectedModuleKey } = useAppStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;
  const effectIdRef = useRef<string | null>(null);

  const initialNodes = useMemo(
    () => getInitialNodes(config || null, currentEffect?.metadata?.nodeLayout, selectedModuleKey),
    [config, currentEffect?.metadata?.nodeLayout, selectedModuleKey]
  );
  const initialEdges = useMemo(() => getInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Reset layout only when switching to a different effect
  useEffect(() => {
    if (!currentEffect) return;
    if (effectIdRef.current !== currentEffect.id) {
      effectIdRef.current = currentEffect.id;
      setNodes(getInitialNodes(config || null, currentEffect.metadata?.nodeLayout, selectedModuleKey));
    }
  }, [currentEffect, config, selectedModuleKey, setNodes]);

  // Update node styles when config or selection changes, preserve positions
  useEffect(() => {
    if (!config) return;
    setNodes(prev => prev.map(node => {
      const def = MODULE_DEFS.find(d => d.key === node.id);
      if (!def) return node;
      const enabled = (config[def.key as keyof Particle3DConfig] as { enabled?: boolean })?.enabled !== false;
      return {
        ...node,
        data: { ...node.data, enabled },
        style: getNodeStyle(def, enabled, selectedModuleKey === def.key)
      };
    }));
  }, [config, selectedModuleKey, setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedModuleKey(node.data.moduleKey as string);
  }, [setSelectedModuleKey]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const moduleKey = node.data.moduleKey as string;
    if (!moduleKey || !config) return;
    const module = (config as unknown as Record<string, { enabled?: boolean }>)[moduleKey];
    updateEffectConfig((prev) => {
      const cfg = { ...(prev.config as Particle3DConfig) };
      (cfg as Record<string, unknown>)[moduleKey] = { ...module, enabled: !module?.enabled };
      return { ...prev, config: cfg };
    });
  }, [config, updateEffectConfig]);

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    updateEffectConfig((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        nodeLayout: {
          ...(prev.metadata.nodeLayout || {}),
          [node.id]: { x: node.position.x, y: node.position.y }
        }
      }
    }));
  }, [updateEffectConfig]);

  if (!currentEffect) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: 14 }}>
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
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        nodesDraggable
        nodesConnectable
      >
        <Background color="var(--border-color)" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          style={{ background: 'var(--bg-secondary)' }}
          maskColor="rgba(0,0,0,0.7)"
          nodeColor={(n) => n.style?.border?.toString().includes('var(--border-color)') ? '#666' : '#58a6ff'}
        />
      </ReactFlow>
    </div>
  );
};
