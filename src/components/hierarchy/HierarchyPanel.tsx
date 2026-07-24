import React, { useCallback, useMemo, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { ContextMenu } from '@/components/layout/ContextMenu';
import { RenameModal } from '@/components/layout/RenameModal';
import { MODULE_DEFS } from '@/constants/modules';
import type { EffectNode } from '@/types/project';
import type { Particle3DConfig } from '@/types/effect';
import { isGroupNode, isEmitterNode } from '@/types/project';
import { findNodeById, findParentOfNode } from '@/utils/project-tree';

type HierarchyMenu =
  | { kind: 'node'; nodeId: string; x: number; y: number }
  | { kind: 'module'; nodeId: string; moduleKey: string; x: number; y: number }
  | { kind: 'blank'; groupId: string; x: number; y: number };

interface TreeRowProps {
  node: EffectNode;
  depth: number;
  sceneRootId: string;
  selectedId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onSelectModule: (key: string) => void;
  selectedModuleKey: string | null;
  showModules: boolean;
  soloId?: string | null;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onContextMenuNode: (nodeId: string, e: React.MouseEvent) => void;
  onContextMenuModule: (nodeId: string, moduleKey: string, e: React.MouseEvent) => void;
  dropTargetId: string | null;
  onDragStartNode: (nodeId: string) => void;
  onDragEndNode: () => void;
  onDragOverGroup: (groupId: string) => void;
  onDragLeaveGroup: () => void;
  onDropOnGroup: (groupId: string, dragNodeId: string) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node, depth, sceneRootId, selectedId, expanded, onToggleExpand, onSelect, onSelectModule,
  selectedModuleKey, showModules, onToggleEnabled,
  onContextMenuNode, onContextMenuModule,
  dropTargetId, onDragStartNode, onDragEndNode, onDragOverGroup, onDragLeaveGroup, onDropOnGroup
}) => {
  const isGroup = isGroupNode(node);
  const isEmitter = isEmitterNode(node);
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const canExpand = isGroup || isEmitter;
  const isDropTarget = isGroup && dropTargetId === node.id;
  const canDrag = node.id !== sceneRootId;

  return (
    <>
      <div
        className={`tree-row${isSelected ? ' selected' : ''}${isDropTarget ? ' drop-target' : ''}`}
        style={{
          paddingLeft: 8 + depth * 14,
          fontSize: 12,
          minHeight: 26,
          cursor: 'pointer',
          opacity: node.enabled ? 1 : 0.55,
          outline: isDropTarget ? '1px dashed var(--accent)' : undefined,
          background: isDropTarget ? 'rgba(56, 139, 253, 0.12)' : undefined
        }}
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) return;
          e.dataTransfer.setData('text/fx-node-id', node.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStartNode(node.id);
        }}
        onDragEnd={() => onDragEndNode()}
        onDragOver={(e) => {
          if (!isGroup) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverGroup(node.id);
        }}
        onDragLeave={() => {
          if (isGroup) onDragLeaveGroup();
        }}
        onDrop={(e) => {
          if (!isGroup) return;
          e.preventDefault();
          e.stopPropagation();
          const dragId = e.dataTransfer.getData('text/fx-node-id');
          if (dragId) onDropOnGroup(node.id, dragId);
          onDragLeaveGroup();
        }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenuNode(node.id, e);
        }}
      >
        <span className="tree-row-label">
          {isGroup ? '📁' : '✨'} {node.name}
        </span>
        <span className="tree-row-actions">
          {canExpand && (
            <button
              type="button"
              className="tree-icon-btn"
              title={isOpen ? '收起' : '展开'}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          )}
          <button
            type="button"
            className={`tree-icon-btn${node.enabled ? '' : ' is-off'}`}
            title={node.enabled ? '隐藏' : '显示'}
            onClick={(e) => { e.stopPropagation(); onToggleEnabled(node.id, !node.enabled); }}
          >
            {node.enabled ? '👁' : '○'}
          </button>
        </span>
      </div>
      {isGroup && isOpen && node.children.map(child => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          sceneRootId={sceneRootId}
          selectedId={selectedId}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          onSelectModule={onSelectModule}
          selectedModuleKey={selectedModuleKey}
          showModules={showModules}
          onToggleEnabled={onToggleEnabled}
          onContextMenuNode={onContextMenuNode}
          onContextMenuModule={onContextMenuModule}
          dropTargetId={dropTargetId}
          onDragStartNode={onDragStartNode}
          onDragEndNode={onDragEndNode}
          onDragOverGroup={onDragOverGroup}
          onDragLeaveGroup={onDragLeaveGroup}
          onDropOnGroup={onDropOnGroup}
        />
      ))}
      {showModules && isEmitter && isOpen && MODULE_DEFS.map(mod => (
        <div
          key={mod.key}
          className={`tree-row${selectedModuleKey === mod.key && isSelected ? ' selected' : ''}`}
          style={{ paddingLeft: 8 + (depth + 1) * 14, fontSize: 11, opacity: 0.85, cursor: 'pointer', minHeight: 22 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
            onSelectModule(mod.key);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenuModule(node.id, mod.key, e);
          }}
        >
          <span className="tree-row-label" style={{ marginLeft: 14 }}>▸ {mod.label}</span>
        </div>
      ))}
    </>
  );
};

export const HierarchyPanel: React.FC = () => {
  const {
    project, selectedNodeId, selectNode, addEmitter, addGroup, removeNode, renameNode,
    projectPath, isDirty, soloNodeId, setSoloNode, setNodeEnabled, reparentNode,
    duplicateNode, updateEffectConfig
  } = useProjectStore();
  const { selectedModuleKey, setSelectedModuleKey, showToastMessage } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<HierarchyMenu | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const onDragStartNode = useCallback((_nodeId: string) => {
    /* drag id carried in dataTransfer */
  }, []);

  const onDragEndNode = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const onDragOverGroup = useCallback((groupId: string) => {
    setDropTargetId(groupId);
  }, []);

  const onDragLeaveGroup = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const onDropOnGroup = useCallback((groupId: string, dragNodeId: string) => {
    if (!project) return;
    if (dragNodeId === groupId || dragNodeId === project.root.id) return;
    reparentNode(dragNodeId, groupId);
    showToastMessage('已移动节点');
    setDropTargetId(null);
  }, [project, reparentNode, showToastMessage]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    selectNode(id);
  }, [selectNode]);

  const handleContextMenuNode = useCallback((nodeId: string, e: React.MouseEvent) => {
    setMenu({ kind: 'node', nodeId, x: e.clientX, y: e.clientY });
  }, []);

  const handleContextMenuModule = useCallback((nodeId: string, moduleKey: string, e: React.MouseEvent) => {
    setMenu({ kind: 'module', nodeId, moduleKey, x: e.clientX, y: e.clientY });
  }, []);

  const toggleModule = useCallback((nodeId: string, moduleKey: string) => {
    if (selectedNodeId !== nodeId) selectNode(nodeId);
    setSelectedModuleKey(moduleKey);
    updateEffectConfig((prev) => {
      const cfg = { ...prev.config } as Particle3DConfig;
      const mod = cfg[moduleKey as keyof Particle3DConfig] as { enabled?: boolean };
      (cfg as unknown as Record<string, unknown>)[moduleKey] = { ...mod, enabled: !mod?.enabled };
      return { ...prev, config: cfg };
    });
  }, [selectedNodeId, selectNode, setSelectedModuleKey, updateEffectConfig]);

  const filterTopLevelNodes = useCallback((nodes: EffectNode[]): EffectNode[] => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    const filterNodes = (list: EffectNode[]): EffectNode[] =>
      list.flatMap((n) => {
        if (n.name.toLowerCase().includes(q)) return [n];
        if (isGroupNode(n)) {
          const kids = filterNodes(n.children);
          if (kids.length) return [{ ...n, children: kids }];
        }
        return [];
      });
    return filterNodes(nodes);
  }, [search]);

  const topLevelNodes = useMemo(
    () => (project ? filterTopLevelNodes(project.root.children) : []),
    [project, filterTopLevelNodes]
  );

  const sceneRootId = project?.root.id ?? '';

  const selectedNode = selectedNodeId && project ? findNodeById(project.root, selectedNodeId) : null;
  const renameTarget = renameTargetId && project ? findNodeById(project.root, renameTargetId) : null;

  const menuItems = useMemo(() => {
    if (!menu || !project) return [];

    if (menu.kind === 'blank') {
      return [
        { label: '添加发射器', onClick: () => addEmitter(menu.groupId) },
        { label: '添加组', onClick: () => addGroup(menu.groupId) }
      ];
    }

    if (menu.kind === 'module') {
      const node = findNodeById(project.root, menu.nodeId);
      if (!node || !isEmitterNode(node)) return [];
      const cfg = node.config as Particle3DConfig;
      const mod = cfg[menu.moduleKey as keyof Particle3DConfig] as { enabled?: boolean } | undefined;
      const enabled = mod?.enabled !== false;
      return [
        {
          label: enabled ? '禁用模块' : '启用模块',
          onClick: () => toggleModule(menu.nodeId, menu.moduleKey)
        }
      ];
    }

    const node = findNodeById(project.root, menu.nodeId);
    if (!node) return [];
    const isRoot = menu.nodeId === project.root.id;
    const isGroup = isGroupNode(node);
    const parentInfo = isRoot ? null : findParentOfNode(project.root, menu.nodeId);
    const atRoot = !parentInfo || parentInfo.parent.id === project.root.id;

    const items: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void }[] = [];

    if (isGroup) {
      items.push(
        { label: '添加发射器', onClick: () => addEmitter(node.id) },
        { label: '添加组', onClick: () => addGroup(node.id) }
      );
    }

    if (!isRoot) {
      items.push(
        { label: '重命名', onClick: () => setRenameTargetId(menu.nodeId) },
        { label: '复制', onClick: () => { duplicateNode(menu.nodeId); showToastMessage('已复制节点'); } },
        {
          label: node.enabled ? '隐藏' : '显示',
          onClick: () => setNodeEnabled(menu.nodeId, !node.enabled)
        }
      );
      if (isEmitterNode(node)) {
        items.push({
          label: soloNodeId === menu.nodeId ? '取消 Solo' : 'Solo 预览',
          onClick: () => setSoloNode(soloNodeId === menu.nodeId ? null : menu.nodeId)
        });
      }
      if (!atRoot) {
        items.push({
          label: '移动到根',
          onClick: () => {
            reparentNode(menu.nodeId, project.root.id);
            showToastMessage('已移动到根节点');
          }
        });
      }
      items.push({
        label: '删除',
        danger: true,
        onClick: () => {
          removeNode(menu.nodeId);
          showToastMessage('已删除节点');
        }
      });
    }

    return items;
  }, [
    menu, project, addEmitter, addGroup, duplicateNode, showToastMessage,
    setNodeEnabled, soloNodeId, setSoloNode, reparentNode, removeNode, toggleModule
  ]);

  if (!project) {
    return (
      <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
        未打开项目
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{project.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {projectPath ? projectPath.split(/[/\\]/).pop() : '未保存'}{isDirty ? ' *' : ''}
        </div>
        <input
          placeholder="搜索节点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', fontSize: 11 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
        <button className="btn-sm" onClick={() => addEmitter()} title="添加粒子系统">+ 发射器</button>
        <button className="btn-sm" onClick={() => addGroup()} title="添加组">+ 组</button>
        {selectedNodeId && selectedNodeId !== project.root.id && (
          <>
            <button
              className="btn-sm"
              onClick={() => {
                removeNode(selectedNodeId);
                showToastMessage('已删除节点');
              }}
            >
              删除
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                reparentNode(selectedNodeId, project.root.id);
                showToastMessage('已移动到根节点');
              }}
              title="移动到根"
            >
              ↑根
            </button>
          </>
        )}
        {soloNodeId && (
          <button className="btn-sm" onClick={() => setSoloNode(null)} title="取消 Solo">
            取消 Solo
          </button>
        )}
      </div>

      <div
        style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('.tree-row')) return;
          e.preventDefault();
          setMenu({ kind: 'blank', groupId: project.root.id, x: e.clientX, y: e.clientY });
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dragId = e.dataTransfer.getData('text/fx-node-id');
          if (dragId && dragId !== sceneRootId) {
            reparentNode(dragId, sceneRootId);
            showToastMessage('已移动到根层级');
          }
          setDropTargetId(null);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('text/fx-node-id')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
      >
        {topLevelNodes.length === 0 && (
          <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--text-secondary)' }}>
            暂无根节点。可添加发射器/组，或导入 Prefab。
          </div>
        )}
        {topLevelNodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            sceneRootId={sceneRootId}
            selectedId={selectedNodeId}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onSelect={handleSelect}
            onSelectModule={setSelectedModuleKey}
            selectedModuleKey={selectedModuleKey}
            showModules={true}
            onToggleEnabled={(id, enabled) => setNodeEnabled(id, enabled)}
            onContextMenuNode={handleContextMenuNode}
            onContextMenuModule={handleContextMenuModule}
            dropTargetId={dropTargetId}
            onDragStartNode={onDragStartNode}
            onDragEndNode={onDragEndNode}
            onDragOverGroup={onDragOverGroup}
            onDragLeaveGroup={onDragLeaveGroup}
            onDropOnGroup={onDropOnGroup}
          />
        ))}
      </div>

      {selectedNode && (
        <div style={{ padding: 8, borderTop: '1px solid var(--border-color)' }}>
          <input
            defaultValue={selectedNode.name}
            key={selectedNodeId!}
            placeholder="重命名"
            style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && selectedNodeId) renameNode(selectedNodeId, v);
            }}
          />
        </div>
      )}

      {menu && menuItems.length > 0 && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      <RenameModal
        open={!!renameTarget}
        initialName={renameTarget?.name ?? ''}
        title="重命名节点"
        onConfirm={(name) => {
          if (renameTargetId) renameNode(renameTargetId, name);
          setRenameTargetId(null);
        }}
        onClose={() => setRenameTargetId(null)}
      />
    </div>
  );
};
