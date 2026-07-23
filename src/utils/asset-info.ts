import type { AssetEntry } from '@/types/asset';
import { assetTypeLabel } from '@/utils/asset-dnd';
import { blendModeLabel, getBlendModeFromMaterialAsset } from '@/utils/material-blend';

export interface AssetInfoField {
  label: string;
  value: string;
}

export interface AssetInfoView {
  title: string;
  typeLabel: string;
  summary: string;
  usage: string;
  fields: AssetInfoField[];
}

const TYPE_SUMMARY: Record<string, string> = {
  texture: '原始图像资源，定义粒子形状。在编辑器中用于预览；导出到 Cocos 时写入 .png 纹理文件。',
  spriteFrame: 'Cocos 中的「精灵帧」：贴图 + 裁剪/UV 等子资源。ParticleSystem 的 _mainTexture 实际引用的是 SpriteFrame UUID，而不是裸 Texture。拖拽到主贴图槽时，会自动映射到底层贴图用于预览。',
  material: '粒子材质，控制混合模式（加法发光 / 透明叠加）与导出时的 .mtl 配置。切换材质会改变预览中的混合效果。',
  shader: 'Effect 着色器定义，供材质引用。右侧可查看/复制 Effect 模板；完整编辑请用 Shader 工作区。',
  mesh: '粒子网格模型。右侧提供 3D 预览；渲染模式为 Mesh 时使用。'
};

const TYPE_USAGE: Record<string, string> = {
  texture: '拖到 Inspector → 主贴图槽，或双击快速应用到当前发射器。',
  spriteFrame: '拖到主贴图槽（与贴图等效，导出语义更贴近 Cocos）。',
  material: '拖到 Inspector → 材质槽。右侧可查看混合模式与 .mtl 配置预览。',
  shader: '供材质引用，浏览参考；完整 Shader 编辑在 Shader 工作区。',
  mesh: '拖到网格槽（需将渲染模式设为 Mesh）。'
};

export function buildAssetInfoView(asset: AssetEntry, linkedTextureName?: string): AssetInfoView {
  const fields: AssetInfoField[] = [
    { label: 'ID', value: asset.id },
    { label: '来源', value: asset.source === 'builtin' ? '内置' : asset.source === 'imported' ? '导入' : '项目' },
    { label: '路径', value: asset.uri }
  ];

  if (asset.meta?.shape) {
    fields.push({ label: '形状', value: String(asset.meta.shape) });
  }
  if (asset.type === 'spriteFrame' && asset.meta?.textureId) {
    fields.push({ label: '关联贴图', value: linkedTextureName ?? String(asset.meta.textureId) });
  }
  if (asset.type === 'material') {
    const blend = getBlendModeFromMaterialAsset(asset);
    if (blend) fields.push({ label: '混合模式', value: blendModeLabel(blend) });
  }
  if (asset.meta?.category) {
    fields.push({ label: '分类', value: asset.meta.category });
  }
  if (asset.meta?.description) {
    fields.push({ label: '说明', value: asset.meta.description });
  }
  if (asset.meta?.width && asset.meta?.height) {
    fields.push({ label: '尺寸', value: `${asset.meta.width} × ${asset.meta.height}` });
  }

  return {
    title: asset.name,
    typeLabel: assetTypeLabel(asset.type),
    summary: TYPE_SUMMARY[asset.type] ?? '',
    usage: TYPE_USAGE[asset.type] ?? '',
    fields
  };
}
