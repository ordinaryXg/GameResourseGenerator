import React, { useCallback } from 'react';
import type { AssetEntry } from '@/types/asset';
import { generateBuiltinShaderSource } from '@/utils/builtin-asset-content';

interface ShaderAssetViewProps {
  asset: AssetEntry;
}

export const ShaderAssetView: React.FC<ShaderAssetViewProps> = ({ asset }) => {
  const source = generateBuiltinShaderSource(asset);

  const copySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch { /* ignore */ }
  }, [source]);

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
        内置 Shader 为 Cocos Effect 模板，可在下方查看/复制。完整 GLSL 编辑请切换中心面板 → <strong>Shader</strong> 工作区。
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Effect 源码预览</span>
        <button type="button" className="btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => { void copySource(); }}>
          复制代码
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: 8,
        fontSize: 9,
        lineHeight: 1.45,
        fontFamily: 'monospace',
        background: '#0d1117',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        maxHeight: 200,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        color: '#c9d1d9'
      }}>
        {source}
      </pre>
    </div>
  );
};
