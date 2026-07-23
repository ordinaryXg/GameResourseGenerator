import React, { useCallback, useMemo, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import { MODULE_DEFS } from '@/constants/modules';
import type { EffectNode } from '@/types/project';
import { isGroupNode, isEmitterNode } from '@/types/project';
import { findNodeById } from '@/utils/project-tree';

interface TreeRowProps {
  node: EffectNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onSelectModule: (key: string) => void;
  selectedModuleKey: string | null;
  showModules: boolean;
  soloId?: string | null;
  onSolo: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node, depth, selectedId, expanded, onToggle, onSelect, onSelectModule, selectedModuleKey, showModules,
  soloId, onSolo, onToggleEnabled
}) => {
  const isGroup = isGroupNode(node);
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <>
      <div
        className={`tree-row${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 14, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, minHeight: 26 }}
        onClick={() => onSelect(node.id)}
      >
        {isGroup ? (
          <span
            style={{ width: 14, textAlign: 'center', opacity: 0.7 }}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          >
            {isOpen ? '▾' : '▸'}
          </span>
        ) : <span style={{ width: 14 }} />}
        <span style={{ opacity: node.enabled ? 1 : 0.4, flex: 1 }}>
          {isGroup ? '📁' : '✨'} {node.name}
        </span>
        {!isGroup && (
          <button
            className="btn-sm"
            style={{ padding: '0 4px', fontSize: 10, opacity: soloId === node.id ? 1 : 0.5 }}
            title="Solo 单独预览"
            onClick={(e) => { e.stopPropagation(); onSolo(node.id); }}
          >
            S
          </button>
        )}
        <button
          className="btn-sm"
          style={{ padding: '0 4px', fontSize: 10 }}
          title={node.enabled ? '隐藏' : '显示'}
          onClick={(e) => { e.stopPropagation(); onToggleEnabled(node.id, !node.enabled); }}
        >
          {node.enabled ? '👁' : '🚫'}
        </button>
      </div>
      {isGroup && isOpen && node.children.map(child => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          onSelectModule={onSelectModule}
          selectedModuleKey={selectedModuleKey}
          showModules={showModules}
          soloId={soloId}
          onSolo={onSolo}
          onToggleEnabled={onToggleEnabled}
        />
      ))}
      {showModules && isEmitterNode(node) && isSelected && MODULE_DEFS.map(mod => (
        <div
          key={mod.key}
          className={`tree-row${selectedModuleKey === mod.key ? ' selected' : ''}`}
          style={{ paddingLeft: 8 + (depth + 1) * 14, fontSize: 11, opacity: 0.85, cursor: 'pointer', minHeight: 22 }}
          onClick={(e) => { e.stopPropagation(); onSelectModule(mod.key); }}
        >
          <span style={{ marginLeft: 14 }}>▸ {mod.label}</span>
        </div>
      ))}
    </>
  );
};

export const HierarchyPanel: React.FC = () => {
  const {
    project, selectedNodeId, selectNode, addEmitter, addGroup, removeNode, renameNode,
    projectPath, isDirty, soloNodeId, setSoloNode, setNodeEnabled, reparentNode
  } = useProjectStore();
  const { selectedModuleKey, setSelectedModuleKey, showToastMessage } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [search, setSearch] = useState('');

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
    setExpanded(prev => new Set(prev).add(id));
  }, [selectNode]);

  const filteredRoot = useMemo(() => {
    if (!project || !search.trim()) return project?.root;
    const q = search.toLowerCase();
    const filterNodes = (nodes: EffectNode[]): EffectNode[] =>
      nodes.flatMap(n => {
        if (n.name.toLowerCase().includes(q)) return [n];
        if (isGroupNode(n)) {
          const kids = filterNodes(n.children);
          if (kids.length) return [{ ...n, children: kids }];
        }
        return [];
      });
    return { ...project.root, children: filterNodes(project.root.children) };
  }, [project, search]);

  const selectedNode = selectedNodeId && project ? findNodeById(project.root, selectedNodeId) : null;

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

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {filteredRoot && (
          <TreeRow
            node={filteredRoot}
            depth={0}
            selectedId={selectedNodeId}
            expanded={expanded}
            onToggle={toggleExpand}
            onSelect={handleSelect}
            onSelectModule={setSelectedModuleKey}
            selectedModuleKey={selectedModuleKey}
            showModules={true}
            soloId={soloNodeId}
            onSolo={(id) => setSoloNode(soloNodeId === id ? null : id)}
            onToggleEnabled={(id, enabled) => setNodeEnabled(id, enabled)}
          />
        )}
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
    </div>
  );
};
