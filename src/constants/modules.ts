export const MODULE_DEFS = [
  { key: 'mainModule', label: '主模块', color: '#58a6ff' },
  { key: 'burstModule', label: '爆发喷射', color: '#f97316' },
  { key: 'shapeModule', label: '发射器形状', color: '#7c3aed' },
  { key: 'colorOverLifetime', label: '颜色', color: '#f85149' },
  { key: 'sizeOverLifetime', label: '大小', color: '#3fb950' },
  { key: 'rotationOverLifetime', label: '旋转', color: '#d29922' },
  { key: 'velocityOverLifetime', label: '速度', color: '#059669' },
  { key: 'noiseModule', label: '噪声', color: '#d97706' },
  { key: 'trailModule', label: '拖尾', color: '#0891b2' },
  { key: 'textureAnimation', label: '纹理动画', color: '#e879f9' },
  { key: 'rendererModule', label: '渲染器', color: '#6b7280' }
] as const;

export type ModuleKey = typeof MODULE_DEFS[number]['key'];
