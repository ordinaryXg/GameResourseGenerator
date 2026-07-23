import type { AssetEntry } from '@/types/asset';
import { blendModeLabel, getBlendModeFromMaterialAsset } from '@/utils/material-blend';

export function generateBuiltinMaterialSource(asset: AssetEntry): string {
  const blend = getBlendModeFromMaterialAsset(asset) ?? 'additive';
  const technique = blend === 'additive' ? 'additive' : 'transparent';
  return `# FX Studio / Cocos Creator 3.8 粒子材质
# 名称: ${asset.name}
# 混合: ${blendModeLabel(blend)}

{
  "__type__": "cc.Material",
  "_name": "${asset.name}",
  "_techIdx": 0,
  "_defines": [],
  "_states": [
    {
      "rasterizerState": {},
      "depthStencilState": {},
      "blendState": {
        "targets": [{ "blend": true, "blendSrc": ${blend === 'additive' ? '770' : '1'}, "blendDst": ${blend === 'additive' ? '1' : '771'} }]
      }
    }
  ],
  "_props": []
}

# 预览说明:
# - additive: 颜色叠加变亮，适合火焰/光效
# - alpha: 标准透明，适合烟雾/灰尘
# 导出时会写入 .mtl 并引用对应 Effect
`;
}

export function generateBuiltinShaderSource(asset: AssetEntry): string {
  const category = asset.meta?.category ?? '通用';
  return `// Cocos Creator 3.8 Effect — ${asset.name}
// 分类: ${category}
// ${asset.meta?.description ?? '内置粒子着色器变体'}

CCEffect %{
  techniques:
  - name: particle
    passes:
    - vert: particle-vs:vert
      frag: particle-fs:frag
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
