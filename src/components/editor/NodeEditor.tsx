import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow, Node, Edge, Background, Controls, ControlButton, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSessionStore } from '@/stores/session-store';
import { useAppStore } from '@/stores/app-store';
import { MODULE_DEFS } from '@/constants/modules';
import { ModuleNode } from '@/components/editor/ModuleNode';
import type { Particle3DConfig } from '@/types/effect';

const nodeTypes = { moduleNode: ModuleNode };

function getInitialNodes(
  config: Particle3DConfig | null,
  layout?: Record<string, { x: number; y: number }>
): Node[] {
  if (!config) return [];
  return MODULE_DEFS.map((def, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const enabled = (config[def.key as keyof Particle3DConfig] as { enabled?: boolean })?.enabled !== false;
    const saved = layout?.[def.key];
    return {
      id: def.key,
      type: 'moduleNode',
      position: saved || { x: col * 220 + 30, y: row * 88 + 30 },
      data: { label: def.label, moduleKey: def.key, enabled }
    };
  });
}

function getInitialEdges(): Edge[] {
  return MODULE_DEFS.slice(1).map(def => ({
    id: `e-main-${def.key}`,
    source: 'mainModule',
    target: def.key,
    type: 'smoothstep',
    animated: true,
    style: { stroke: 'rgba(88,166,255,0.35)', strokeWidth: 1.5 }
  }));
}

export const NodeEditor: React.FC = () => {
  const { currentEffect, updateEffectConfig } = useSessionStore();
  const { selectedModuleKey, setSelectedModuleKey } = useAppStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;
  const effectIdRef = useRef<string | null>(null);
  const [interactive, setInteractive] = useState(true);

  const initialNodes = useMemo(
    () => getInitialNodes(config || null, currentEffect?.metadata?.nodeLayout),
    [config, currentEffect?.metadata?.nodeLayout]
  );
  const initialEdges = useMemo(() => getInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (!currentEffect) return;
    if (effectIdRef.current !== currentEffect.id) {
      effectIdRef.current = currentEffect.id;
      setNodes(getInitialNodes(config || null, currentEffect.metadata?.nodeLayout));
    }
  }, [currentEffect, config, setNodes]);

  useEffect(() => {
    if (!config) return;
    setNodes(prev => prev.map(node => {
      const enabled = (config[node.id as keyof Particle3DConfig] as { enabled?: boolean })?.enabled !== false;
      return {
        ...node,
        selected: selectedModuleKey === node.id,
        data: { ...node.data, enabled }
      };
    }));
  }, [config, selectedModuleKey, setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'var(--accent)', strokeWidth: 2 }
    }, eds));
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
      <div className="node-editor-empty">
        在左侧对话面板输入特效描述以开始
      </div>
    );
  }

  return (
    <div className="node-editor-root">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={interactive}
        nodesConnectable={interactive}
        elementsSelectable={interactive}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(48,54,61,0.6)" gap={24} size={1} />
        <Controls showInteractive={false} className="node-controls">
          <ControlButton
            onClick={() => setInteractive(v => !v)}
            title={interactive ? '锁定节点（禁止拖动）' : '解锁节点'}
            aria-label={interactive ? '锁定' : '解锁'}
          >
            {interactive ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-3 0H10V6a2 2 0 1 1 4 0v2z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm3 8H9V7a3 3 0 0 1 6 0v3z"/></svg>
            )}
          </ControlButton>
        </Controls>
        <MiniMap
          className="node-minimap"
          maskColor="rgba(13,17,23,0.85)"
          nodeColor={(n) => {
            const def = MODULE_DEFS.find(d => d.key === n.id);
            return def?.color ?? '#58a6ff';
          }}
        />
      </ReactFlow>
    </div>
  );
};
