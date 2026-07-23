import React from 'react';
import type { AssetEntry } from '@/types/asset';
import { getAssetThumbnailUrl } from '@/utils/asset-thumbnail';
import { buildAssetInfoView } from '@/utils/asset-info';
import { assetCategoryIcon } from '@/data/builtin-assets';

interface AssetDetailPanelProps {
  asset: AssetEntry | null;
  projectDir?: string | null;
  linkedTextureName?: string;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  projectDir,
  linkedTextureName
}) => {
  if (!asset) {
    return (
      <div style={{
        width: 220,
        flexShrink: 0,
        borderLeft: '1px solid var(--border-color)',
        padding: 12,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.5
      }}>
        单击资产查看属性说明
      </div>
    );
  }

  const thumb = getAssetThumbnailUrl(asset, projectDir, 80);
  const info = buildAssetInfoView(asset, linkedTextureName);

  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      borderLeft: '1px solid var(--border-color)',
      padding: 10,
      overflow: 'auto',
      fontSize: 12
    }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 6,
          border: '1px solid var(--border-color)',
          background: '#1a1a22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          backgroundImage: thumb ? `url(${thumb})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}>
          {!(asset.type === 'texture' || asset.type === 'spriteFrame') && assetCategoryIcon(asset.type)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all' }}>{info.title}</div>
          <div style={{ color: 'var(--accent)', fontSize: 11, marginTop: 2 }}>{info.typeLabel}</div>
        </div>
      </div>

      <Section title="说明">
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55, fontSize: 11 }}>
          {info.summary}
        </p>
      </Section>

      <Section title="用法">
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55, fontSize: 11 }}>
          {info.usage}
        </p>
      </Section>

      <Section title="属性">
        {info.fields.map(f => (
          <div key={f.label} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{f.label}</div>
            <div style={{
              fontSize: 11,
              wordBreak: 'break-all',
              fontFamily: f.label === 'ID' || f.label === '路径' ? 'monospace' : 'inherit'
            }}>
              {f.value}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
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
