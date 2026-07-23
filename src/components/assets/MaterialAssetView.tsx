import React, { useCallback } from 'react';
import type { AssetEntry } from '@/types/asset';
import { blendModeLabel, getBlendModeFromMaterialAsset } from '@/utils/material-blend';
import { generateBuiltinMaterialSource } from '@/utils/builtin-asset-content';

interface MaterialAssetViewProps {
  asset: AssetEntry;
}

export const MaterialAssetView: React.FC<MaterialAssetViewProps> = ({ asset }) => {
  const blend = getBlendModeFromMaterialAsset(asset);
  const source = generateBuiltinMaterialSource(asset);

  const copySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch { /* ignore */ }
  }, [source]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <BlendSwatch
          label="加法 (Additive)"
          active={blend === 'additive'}
          mode="additive"
        />
        <BlendSwatch
          label="透明 (Alpha)"
          active={blend === 'alpha'}
          mode="alpha"
        />
      </div>

      {blend && (
        <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>
          当前混合：{blendModeLabel(blend)}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>
        材质属性为只读（内置）。拖到 Inspector 材质槽或在预览中查看混合效果；导出时写入 .mtl。
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>材质配置预览</span>
        <button type="button" className="btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => { void copySource(); }}>
          复制
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
        maxHeight: 120,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        color: 'var(--text-secondary)'
      }}>
        {source}
      </pre>
    </div>
  );
};

const BlendSwatch: React.FC<{
  label: string;
  active: boolean;
  mode: 'additive' | 'alpha';
}> = ({ label, active, mode }) => (
  <div style={{
    flex: 1,
    textAlign: 'center',
    padding: 6,
    borderRadius: 6,
    border: active ? '2px solid var(--accent)' : '1px solid var(--border-color)',
    background: active ? 'rgba(88,166,255,0.1)' : 'var(--bg-tertiary)'
  }}>
    <div style={{
      width: 36,
      height: 36,
      margin: '0 auto 4px',
      borderRadius: '50%',
      background: mode === 'additive'
        ? 'radial-gradient(circle, #ffaa44 0%, #ff4400 45%, transparent 70%)'
        : 'radial-gradient(circle, rgba(180,200,220,0.9) 0%, rgba(80,100,120,0.5) 55%, transparent 72%)',
      mixBlendMode: mode === 'additive' ? 'screen' : 'normal',
      boxShadow: mode === 'additive' ? '0 0 16px rgba(255,120,40,0.6)' : 'none'
    }} />
    <div style={{ fontSize: 9, color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>{label}</div>
  </div>
);
