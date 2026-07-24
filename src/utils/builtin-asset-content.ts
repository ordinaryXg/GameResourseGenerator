import type { AssetEntry } from '@/types/asset';
import { blendModeLabel, getBlendModeFromMaterialAsset } from '@/utils/material-blend';
import { formatMaterialSourcePreview } from '@/utils/mtl-io';
import { getParticleMaterialConfig, techniqueLabel } from '@/utils/particle-material';

export function generateBuiltinMaterialSource(asset: AssetEntry): string {
  const config = getParticleMaterialConfig(asset);
  const blend = getBlendModeFromMaterialAsset(asset) ?? config.blend;
  const header = `# FX Studio / Cocos Creator 3.8 粒子材质
# 名称: ${asset.name}
# Technique: ${techniqueLabel(config.techIdx)}
# 混合: ${blendModeLabel(blend)}
`;
  return `${header}\n${formatMaterialSourcePreview(asset)}\n`;
}

export function generateBuiltinShaderSource(asset: AssetEntry): string {
  if (asset.meta?.shaderSource) return asset.meta.shaderSource;
  const category = asset.meta?.category ?? '通用';
  return `// Cocos Creator 3.8 Effect — ${asset.name}
// 分类: ${category}
// ${asset.meta?.description ?? '内置粒子着色器变体'}

CCEffect %{
  techniques:
  - name: transparent
    passes:
    - vert: particle-vs:vert
      frag: particle-fs:frag
      macros:
        USE_ALPHA_TEST: false
      blendState:
        targets:
        - blend: true
          blendSrc: src_alpha
          blendDst: one_minus_src_alpha
      rasterizerState:
        cullMode: none
      depthStencilState:
        depthTest: false
        depthWrite: false
  - name: additive
    passes:
    - vert: particle-vs:vert
      frag: particle-fs:frag
      blendState:
        targets:
        - blend: true
          blendSrc: src_alpha
          blendDst: one
  properties:
    mainTexture:
      value: white
      editor: { type: texture }
    tintColor:
      value: [1.0, 1.0, 1.0, 1.0]
      editor: { type: color }
}%

CCProgram particle-vs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>
  #include <legacy/particle-vs>

  in vec3 a_position;
  in vec2 a_texCoord;
  in vec4 a_color;

  out vec2 v_uv;
  out vec4 v_color;

  vec4 vert() {
    vec4 pos = cc_matViewProj * cc_matWorld * vec4(a_position, 1.0);
    v_uv = a_texCoord;
    v_color = a_color;
    return pos;
  }
}%

CCProgram particle-fs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>

  in vec2 v_uv;
  in vec4 v_color;

  uniform sampler2D mainTexture;

  vec4 frag() {
    vec4 tex = texture(mainTexture, v_uv);
    return tex * v_color;
  }
}%

// 完整 GLSL 编辑请使用中心面板 → Shader 工作区
`;
}

export type BuiltinMeshKind =
  | 'quad'
  | 'cone'
  | 'sphere'
  | 'cube'
  | 'cylinder'
  | 'plane'
  | 'torus'
  | 'capsule'
  | 'hemisphere'
  | 'octahedron';

export function getBuiltinMeshKind(asset: AssetEntry): BuiltinMeshKind {
  const fromName = asset.name.replace(/^builtin-/, '').replace(/^mesh-/, '');
  const known: BuiltinMeshKind[] = [
    'quad', 'cone', 'sphere', 'cube', 'cylinder',
    'plane', 'torus', 'capsule', 'hemisphere', 'octahedron'
  ];
  if (known.includes(fromName as BuiltinMeshKind)) return fromName as BuiltinMeshKind;
  const base = asset.uri.split('/').pop()?.replace('.mesh', '') ?? 'quad';
  return known.includes(base as BuiltinMeshKind) ? (base as BuiltinMeshKind) : 'quad';
}
