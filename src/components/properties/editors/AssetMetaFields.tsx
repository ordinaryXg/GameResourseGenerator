import React from 'react';
import type { AssetEntry } from '@/types/asset';
import { buildAssetInfoView } from '@/utils/asset-info';
import { AssetEditorSection } from '@/components/properties/editors/AssetEditorShared';

interface AssetMetaFieldsProps {
  asset: AssetEntry;
  fullUrl?: string;
  linkedTextureName?: string;
}

export const AssetMetaFields: React.FC<AssetMetaFieldsProps> = ({
  asset,
  fullUrl,
  linkedTextureName
}) => {
  const info = buildAssetInfoView(asset, linkedTextureName);
  const fields = info.fields.filter(f => f.label !== '路径' || !fullUrl);

  return (
    <>
      <AssetEditorSection title="说明">
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {info.summary}
        </p>
      </AssetEditorSection>

      <AssetEditorSection title="系统属性">
        {fields.map(f => (
          <div key={f.label} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{f.label}</div>
            <div style={{
              fontSize: 11,
              wordBreak: 'break-all',
              fontFamily: f.label === 'ID' || f.label === '路径' ? 'monospace' : 'inherit'
            }}>
              {f.label === '路径' && fullUrl ? fullUrl : f.value}
            </div>
          </div>
        ))}
        {fullUrl && !fields.some(f => f.label === '路径') && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>路径</div>
            <div style={{ fontSize: 10, wordBreak: 'break-all', fontFamily: 'monospace' }}>{fullUrl}</div>
          </div>
        )}
      </AssetEditorSection>
    </>
  );
};
