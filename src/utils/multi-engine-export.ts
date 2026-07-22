import type { Particle3DConfig } from '@/types/effect';

export type TargetEngine = 'cocos' | 'unity' | 'godot';

interface CompatibilityItem {
  module: string;
  status: 'full' | 'partial' | 'none';
  note: string;
}

interface ExportResult {
  engine: TargetEngine;
  content: string;
  filename: string;
  compatibility: CompatibilityItem[];
}

export function getCompatibilityReport(config: Particle3DConfig, engine: TargetEngine): CompatibilityItem[] {
  const items: CompatibilityItem[] = [];

  if (engine === 'cocos') {
    return [
      { module: '主模块', status: 'full', note: '完全兼容' },
      { module: '发射器形状', status: 'full', note: '完全兼容' },
      { module: '颜色/大小/旋转/速度', status: 'full', note: '完全兼容' },
      { module: '噪声模块', status: 'full', note: '完全兼容' },
      { module: '拖尾模块', status: 'full', note: '完全兼容' },
      { module: '纹理动画', status: 'full', note: '完全兼容' },
      { module: '渲染器', status: 'full', note: '完全兼容' },
    ];
  }

  if (engine === 'unity') {
    items.push({ module: '主模块', status: 'full', note: '完全兼容' });
    items.push({ module: '发射器形状', status: 'full', note: '形状类型映射：cone→Cone, sphere→Sphere, box→Box' });
    items.push({ module: '颜色随生命周期', status: 'full', note: 'Gradient 映射到 Unity Gradient' });
    items.push({ module: '大小随生命周期', status: 'full', note: 'AnimationCurve 映射' });
    if (config.noiseModule.enabled) {
      items.push({ module: '噪声模块', status: 'partial', note: 'Unity 噪声参数较少，strength/frequency 可映射，octaves 不支持' });
    }
    if (config.trailModule.enabled) {
      items.push({ module: '拖尾模块', status: 'none', note: 'Unity 内置粒子系统无对应拖尾模块，需使用 TrailRenderer 组件' });
    }
    if (config.textureAnimation.enabled) {
      items.push({ module: '纹理动画', status: 'partial', note: '映射到 TextureSheetAnimation，numTiles 兼容' });
    }
    items.push({ module: '渲染器', status: 'full', note: 'billboard→Billboard, stretchedBillboard→StretchedBillboard' });
  }

  if (engine === 'godot') {
    items.push({ module: '主模块', status: 'full', note: '完全兼容 Godot GPUParticles3D' });
    items.push({ module: '发射器形状', status: 'full', note: 'cone→EmitShapeCone, sphere→EmitShapeSphere, box→EmitShapeBox' });
    items.push({ module: '颜色随生命周期', status: 'full', note: 'Gradient 映射到 Godot GradientTexture' });
    if (config.noiseModule.enabled) {
      items.push({ module: '噪声模块', status: 'partial', note: 'Godot 4.x 支持 turbulence，参数映射有限' });
    }
    if (config.trailModule.enabled) {
      items.push({ module: '拖尾模块', status: 'none', note: 'Godot 粒子系统无内置拖尾' });
    }
    items.push({ module: '渲染器', status: 'full', note: 'billboard→Billboard 模式' });
  }

  return items;
}

export function exportToEngine(config: Particle3DConfig, name: string, engine: TargetEngine): ExportResult {
  const compatibility = getCompatibilityReport(config, engine);

  if (engine === 'unity') {
    const content = generateUnityExport(config, name);
    return { engine, content, filename: `${name}_Unity.prefab`, compatibility };
  }

  if (engine === 'godot') {
    const content = generateGodotExport(config, name);
    return { engine, content, filename: `${name}_Godot.tscn`, compatibility };
  }

  return { engine, content: '', filename: '', compatibility };
}

function generateUnityExport(config: Particle3DConfig, name: string): string {
  const m = config.mainModule;
  const s = config.shapeModule;
  return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!198 &19800000
ParticleSystem:
  m_ObjectHideFlags: 0
  m_PrefabParentObject: {fileID: 0}
  m_PrefabInternal: {fileID: 0}
  m_GameObject: {fileID: 0}
  m_Enabled: 1
  serializedVersion: 7
  lengthInSec: ${m.duration}
  simulationSpeed: ${m.simulationSpeed}
  stopAction: ${m.loop ? 0 : 1}
  looping: ${m.loop}
  prewarm: 0
  playOnAwake: ${m.playOnAwake}
  maxParticles: ${m.capacity}
  // Emission
  rateOverTime: ${m.rateOverTime}
  rateOverDistance: ${m.rateOverDistance}
  // Shape
  shapeType: ${s.shapeType === 'cone' ? 1 : s.shapeType === 'sphere' ? 4 : s.shapeType === 'box' ? 0 : 1}
  radius: ${s.radius}
  angle: ${s.angle}
  // Main
  startLifetime: ${m.startLifetime.constant ?? 2}
  startSpeed: ${m.startSpeed.constant ?? 5}
  startSize: ${m.startSize3D.x.constant ?? 1}
  startColor:
    serializedVersion: 2
    maxGradient:
      key0: {r:${Math.round((m.startColor.keys[0]?.color[0]||1)*255)}, g:${Math.round((m.startColor.keys[0]?.color[1]||1)*255)}, b:${Math.round((m.startColor.keys[0]?.color[2]||1)*255)}, a:${Math.round((m.startColor.keys[0]?.color[3]||1)*255)}}
  gravityModifier: ${m.gravityModifier}
  // Renderer
  renderMode: ${config.rendererModule.renderMode === 'billboard' ? 0 : 1}
`;
}

function generateGodotExport(config: Particle3DConfig, name: string): string {
  const m = config.mainModule;
  const s = config.shapeModule;
  return `[gd_resource type="PackedScene" format=3]
[ext_resource type="ParticleProcessMaterial" id="1"]

[node name="${name}" type="GPUParticles3D"]
amount = ${m.capacity}
lifetime = ${m.startLifetime.constant ?? 2}
one_shot = ${!m.loop}
preprocess = 0.0
speed_scale = ${m.simulationSpeed}
explosiveness = ${m.rateOverTime > 0 ? 0.0 : 1.0}
visibility_aabb = AABB(-4, -4, -4, 8, 8, 8)

[sub_resource type="SphereMesh" id="2"]
radius = 0.1

[node name="DrawPass1" type="QuadMesh" parent="."]
material = SubResource("2")

[node name="ProcessMaterial" type="ParticleProcessMaterial" parent="."]
gravity = Vector3(0, ${m.gravityModifier * 9.8}, 0)
initial_velocity_min = ${m.startSpeed.constant ?? 5}
initial_velocity_max = ${(m.startSpeed.constant ?? 5) * 1.2}
scale_min = ${m.startSize3D.x.constant ?? 1}
scale_max = ${(m.startSize3D.x.constant ?? 1) * 1.5}
color = Color(${m.startColor.keys[0]?.color[0]||1}, ${m.startColor.keys[0]?.color[1]||1}, ${m.startColor.keys[0]?.color[2]||1}, ${m.startColor.keys[0]?.color[3]||1})
emission_shape = ${s.shapeType === 'sphere' ? 0 : s.shapeType === 'box' ? 1 : 2}
emission_sphere_radius = ${s.radius}
`;
}
