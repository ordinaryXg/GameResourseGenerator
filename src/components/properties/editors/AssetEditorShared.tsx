import React from 'react';
import type { AssetEntry } from '@/types/asset';
import { assetTypeLabel } from '@/utils/asset-dnd';
import { assetSourceLabel, isProjectEditableAsset } from '@/utils/asset-editable';

export const AssetEditorSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      marginBottom: 6,
      color: 'var(--text-primary)',
      borderBottom: '1px solid var(--border-color)',
      paddingBottom: 4
    }}>
      {title}
    </div>
    {children}
  </div>
);

export const AssetReadonlyBanner: React.FC = () => (
  <div style={{
    fontSize: 10,
    color: 'var(--text-secondary)',
    background: 'rgba(88,166,255,0.08)',
    border: '1px solid rgba(88,166,255,0.25)',
    borderRadius: 4,
    padding: '6px 8px',
    marginBottom: 10,
    lineHeight: 1.5
  }}>
    内置资产为只读。使用顶栏「复制到项目」后可编辑副本。
  </div>
);

export const AssetEditorHeader: React.FC<{ asset: AssetEntry }> = ({ asset }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 2 }}>
      {assetTypeLabel(asset.type)} · {assetSourceLabel(asset.source)}
      {!isProjectEditableAsset(asset) && ' · 只读'}
    </div>
  </div>
);

export const FieldLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</span>
    {children}
  </label>
);

export const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: 12,
  boxSizing: 'border-box'
};

export const monoBlockStyle: React.CSSProperties = {
  margin: 0,
  padding: 8,
  fontSize: 9,
  lineHeight: 1.45,
  fontFamily: 'monospace',
  background: '#0d1117',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  maxHeight: 160,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  color: 'var(--text-secondary)'
};
