import React from 'react';

export const PropertiesEmptyState: React.FC = () => (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    textAlign: 'center',
    color: 'var(--text-secondary)',
    gap: 12
  }}>
    <div style={{
      width: 56,
      height: 56,
      borderRadius: 12,
      border: '1px dashed var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      opacity: 0.7
    }}>
      ⚙
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        全局属性
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.65, maxWidth: 220 }}>
        在层级树或资产浏览器中选择一个对象，此处将显示对应属性。
      </div>
    </div>
    <div style={{
      fontSize: 10,
      lineHeight: 1.7,
      textAlign: 'left',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: 6,
      padding: '10px 12px',
      maxWidth: 240
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>快捷提示</div>
      <div>· 单击资产 → 右侧查看/编辑属性</div>
      <div>· 双击资产 → 应用到当前发射器</div>
      <div>· 单击层级节点 → 编辑发射器模块</div>
      <div>· <kbd style={{ fontFamily: 'monospace', fontSize: 9 }}>Esc</kbd> 清空属性面板选中</div>
    </div>
  </div>
);
