import type { InspectorTarget } from '@/types/inspector';

/** 解析右侧属性面板应展示的目标（含节点 fallback 逻辑） */
export function resolveInspectorTarget(
  inspectorTarget: InspectorTarget | null,
  selectedNodeId: string | null,
  suppressNodeFallback: boolean
): InspectorTarget | null {
  if (inspectorTarget) return inspectorTarget;
  if (!suppressNodeFallback && selectedNodeId) {
    return { kind: 'node', nodeId: selectedNodeId };
  }
  return null;
}

/** Shader 属性编辑建议的最小右栏宽度 */
export const SHADER_INSPECTOR_MIN_WIDTH = 360;

/** 属性面板默认右栏宽度 */
export const DEFAULT_PROPERTIES_PANEL_WIDTH = 320;

export function migratePanelSizes(parsed: Partial<{ left: number; right: number; preview: number; assets: number }>) {
  const right = parsed.right === 280 ? DEFAULT_PROPERTIES_PANEL_WIDTH : (parsed.right ?? DEFAULT_PROPERTIES_PANEL_WIDTH);
  return {
    left: Math.max(200, parsed.left ?? 300),
    right: Math.max(200, right),
    preview: Math.max(120, parsed.preview ?? 280),
    assets: Math.max(100, parsed.assets ?? 180)
  };
}
