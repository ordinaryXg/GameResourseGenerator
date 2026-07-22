import type { Particle3DConfig, EffectConfig } from '@/types/effect';
import { getDefaultEffectConfig, generateUUID } from '@/utils/effect-defaults';

// ============================================================
// 预设模板库（15 个模板）
// ============================================================

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  keywords: string[];
  buildConfig: () => Particle3DConfig;
}


function fireConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 3;
  base.mainModule.capacity = 80;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 0.5, max: 1.5 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 3, max: 8 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.5, max: 1.5 },
    y: { mode: 'randomBetween', min: 0.5, max: 1.5 },
    z: { mode: 'randomBetween', min: 0.5, max: 1.5 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [1, 1, 0.3, 1] },
      { time: 0.3, color: [1, 0.5, 0.1, 1] },
      { time: 0.7, color: [0.8, 0.1, 0.02, 0.8] },
      { time: 1, color: [0.3, 0.02, 0, 0] }
    ]
  };
  base.mainModule.gravityModifier = -0.3;
  base.mainModule.rateOverTime = 30;
  base.shapeModule.shapeType = 'cone';
  base.shapeModule.radius = 0.5;
  base.shapeModule.angle = 15;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.noiseModule.enabled = true;
  base.noiseModule.strength = 5;
  base.noiseModule.frequency = 0.5;
  base.noiseModule.scrollSpeed = 1;
  return base;
}

function snowConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 10;
  base.mainModule.capacity = 200;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 5, max: 12 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.5, max: 2 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.1, max: 0.4 },
    y: { mode: 'randomBetween', min: 0.1, max: 0.4 },
    z: { mode: 'randomBetween', min: 0.1, max: 0.4 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [1, 1, 1, 0.9] },
      { time: 1, color: [1, 1, 1, 0] }
    ]
  };
  base.mainModule.gravityModifier = 0.1;
  base.mainModule.rateOverTime = 20;
  base.shapeModule.shapeType = 'box';
  base.shapeModule.radius = 10;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.noiseModule.enabled = true;
  base.noiseModule.strength = 2;
  base.noiseModule.frequency = 0.3;
  base.noiseModule.scrollSpeed = 0.2;
  return base;
}

function rainConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 5;
  base.mainModule.capacity = 300;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 0.5, max: 1.5 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 15, max: 25 };
  base.mainModule.startSize3D = {
    x: { mode: 'constant', constant: 0.05 },
    y: { mode: 'constant', constant: 0.5 },
    z: { mode: 'constant', constant: 1 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.6, 0.8, 1, 0.6] },
      { time: 1, color: [0.6, 0.8, 1, 0] }
    ]
  };
  base.mainModule.gravityModifier = 1;
  base.mainModule.rateOverTime = 60;
  base.shapeModule.shapeType = 'box';
  base.shapeModule.radius = 8;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.rendererModule.renderMode = 'stretchedBillboard';
  return base;
}

function smokeConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 8;
  base.mainModule.capacity = 50;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 2, max: 5 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.5, max: 2 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 1, max: 3 },
    y: { mode: 'randomBetween', min: 1, max: 3 },
    z: { mode: 'randomBetween', min: 1, max: 3 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.5, 0.5, 0.5, 0.6] },
      { time: 0.5, color: [0.3, 0.3, 0.3, 0.3] },
      { time: 1, color: [0.1, 0.1, 0.1, 0] }
    ]
  };
  base.mainModule.gravityModifier = -0.1;
  base.mainModule.rateOverTime = 5;
  base.shapeModule.shapeType = 'cone';
  base.shapeModule.radius = 1;
  base.shapeModule.angle = 30;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.noiseModule.enabled = true;
  base.noiseModule.strength = 3;
  base.noiseModule.frequency = 0.2;
  base.sizeOverLifetime.enabled = true;
  base.sizeOverLifetime.size = { keys: [{ time: 0, value: 0.5 }, { time: 0.5, value: 1 }, { time: 1, value: 2 }], multiplier: 1 };
  return base;
}

function explosionConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 1;
  base.mainModule.capacity = 200;
  base.mainModule.loop = false;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 0.3, max: 1 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 5, max: 15 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.3, max: 1 },
    y: { mode: 'randomBetween', min: 0.3, max: 1 },
    z: { mode: 'randomBetween', min: 0.3, max: 1 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [1, 1, 0.5, 1] },
      { time: 0.2, color: [1, 0.6, 0.1, 1] },
      { time: 0.6, color: [0.5, 0.1, 0.02, 0.5] },
      { time: 1, color: [0.1, 0.02, 0, 0] }
    ]
  };
  base.mainModule.rateOverTime = 0;
  base.mainModule.bursts = [{ time: 0, count: 200 }];
  base.shapeModule.shapeType = 'sphere';
  base.shapeModule.radius = 0.5;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.sizeOverLifetime.enabled = true;
  base.sizeOverLifetime.size = { keys: [{ time: 0, value: 1 }, { time: 1, value: 0.1 }], multiplier: 1 };
  return base;
}

function magicSparkleConfig(): Particle3DConfig {
  const base = getDefaultEffectConfig('particle3d').config as Particle3DConfig;
  base.mainModule.duration = 5;
  base.mainModule.capacity = 100;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 1, max: 3 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.5, max: 2 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.05, max: 0.2 },
    y: { mode: 'randomBetween', min: 0.05, max: 0.2 },
    z: { mode: 'randomBetween', min: 0.05, max: 0.2 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.8, 0.5, 1, 1] },
      { time: 0.5, color: [0.5, 0.3, 1, 0.8] },
      { time: 1, color: [0.2, 0.1, 0.5, 0] }
    ]
  };
  base.mainModule.gravityModifier = -0.05;
  base.mainModule.rateOverTime = 20;
  base.shapeModule.shapeType = 'sphere';
  base.shapeModule.radius = 3;
  base.colorOverLifetime.enabled = true;
  base.colorOverLifetime.color = base.mainModule.startColor;
  base.noiseModule.enabled = true;
  base.noiseModule.strength = 3;
  base.noiseModule.frequency = 0.8;
  base.rendererModule.renderMode = 'billboard';
  return base;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 't-fire',
    name: '火焰',
    description: '橙红色火焰，带上升气流和闪烁效果',
    category: '自然现象',
    tags: ['火', '自然', '常用'],
    keywords: ['火', '火焰', '燃烧', 'fire', 'flame'],
    buildConfig: fireConfig
  },
  {
    id: 't-snow',
    name: '飘雪',
    description: '白色雪花从上方缓缓飘落',
    category: '自然现象',
    tags: ['雪', '自然', '氛围'],
    keywords: ['雪', '雪花', '飘落', 'snow', 'flake'],
    buildConfig: snowConfig
  },
  {
    id: 't-rain',
    name: '下雨',
    description: '密集雨滴垂直下落',
    category: '自然现象',
    tags: ['雨', '自然', '天气'],
    keywords: ['雨', '下雨', 'rain', '暴雨'],
    buildConfig: rainConfig
  },
  {
    id: 't-smoke',
    name: '烟雾',
    description: '灰色烟雾上升扩散',
    category: '自然现象',
    tags: ['烟', '自然', '常用'],
    keywords: ['烟', '烟雾', 'smoke', 'fog'],
    buildConfig: smokeConfig
  },
  {
    id: 't-explosion',
    name: '爆炸',
    description: '橙色爆炸，向外扩散并消失',
    category: '战斗特效',
    tags: ['爆炸', '战斗', '常用'],
    keywords: ['爆炸', '炸裂', 'explosion', 'burst'],
    buildConfig: explosionConfig
  },
  {
    id: 't-magic',
    name: '魔法星光',
    description: '紫金色星光粒子环绕上升',
    category: '魔法技能',
    tags: ['魔法', '星光', '梦幻'],
    keywords: ['魔法', '星光', '梦幻', 'magic', 'sparkle'],
    buildConfig: magicSparkleConfig
  }
];

// 简化的其他模板（基于已有模板微调）
function shockwaveConfig(): Particle3DConfig {
  const base = explosionConfig();
  base.mainModule.capacity = 100;
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 8, max: 20 };
  base.mainModule.startSize3D = {
    x: { mode: 'constant', constant: 0.1 },
    y: { mode: 'constant', constant: 0.1 },
    z: { mode: 'constant', constant: 0.1 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.3, 0.7, 1, 1] },
      { time: 0.5, color: [0.1, 0.4, 0.8, 0.5] },
      { time: 1, color: [0, 0.1, 0.3, 0] }
    ]
  };
  base.shapeModule.shapeType = 'circle';
  base.shapeModule.radius = 0.1;
  base.sizeOverLifetime.enabled = true;
  base.sizeOverLifetime.size = { keys: [{ time: 0, value: 1 }, { time: 1, value: 20 }], multiplier: 1 };
  base// name set in template definition: '冲击波';
  return base;
}

function sparkConfig(): Particle3DConfig {
  const base = explosionConfig();
  base.mainModule.capacity = 50;
  base.mainModule.startLifetime = { mode: 'randomBetween', min: 0.2, max: 0.8 };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 10, max: 25 };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.02, max: 0.1 },
    y: { mode: 'randomBetween', min: 0.02, max: 0.1 },
    z: { mode: 'randomBetween', min: 0.02, max: 0.1 }
  };
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [1, 0.9, 0.2, 1] },
      { time: 0.3, color: [1, 0.5, 0.1, 0.8] },
      { time: 1, color: [0.3, 0.1, 0, 0] }
    ]
  };
  base.shapeModule.shapeType = 'cone';
  base.shapeModule.angle = 45;
  base.mainModule.bursts = [{ time: 0, count: 50 }];
  base.trailModule.enabled = true;
  base.trailModule.lifetime = { mode: 'constant', constant: 0.1 };
  base// name set in template definition: '火花飞溅';
  return base;
}

function dustConfig(): Particle3DConfig {
  const base = smokeConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.6, 0.5, 0.3, 0.5] },
      { time: 0.5, color: [0.4, 0.3, 0.2, 0.2] },
      { time: 1, color: [0.2, 0.1, 0.05, 0] }
    ]
  };
  base.shapeModule.shapeType = 'hemisphere';
  base.shapeModule.radius = 2;
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.3, max: 1.5 };
  base// name set in template definition: '灰尘扬起';
  return base;
}

function healAuraConfig(): Particle3DConfig {
  const base = magicSparkleConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.2, 1, 0.5, 0.8] },
      { time: 0.5, color: [0.1, 0.8, 0.3, 0.5] },
      { time: 1, color: [0, 0.3, 0.1, 0] }
    ]
  };
  base.shapeModule.shapeType = 'circle';
  base.shapeModule.radius = 2;
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.3, max: 1 };
  base// name set in template definition: '治愈光环';
  return base;
}

function shadowEnergyConfig(): Particle3DConfig {
  const base = magicSparkleConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.3, 0, 0.5, 0.9] },
      { time: 0.5, color: [0.1, 0, 0.3, 0.5] },
      { time: 1, color: [0, 0, 0.1, 0] }
    ]
  };
  base.shapeModule.shapeType = 'hemisphere';
  base.shapeModule.radius = 2;
  base.mainModule.gravityModifier = -0.2;
  base// name set in template definition: '暗影能量';
  return base;
}

function iceBurstConfig(): Particle3DConfig {
  const base = explosionConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.6, 0.9, 1, 1] },
      { time: 0.3, color: [0.3, 0.7, 1, 0.8] },
      { time: 1, color: [0, 0.2, 0.5, 0] }
    ]
  };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.1, max: 0.4 },
    y: { mode: 'randomBetween', min: 0.1, max: 0.4 },
    z: { mode: 'randomBetween', min: 0.1, max: 0.4 }
  };
  base// name set in template definition: '冰霜爆发';
  return base;
}

function fireflyConfig(): Particle3DConfig {
  const base = magicSparkleConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.5, 1, 0.2, 0.9] },
      { time: 0.5, color: [0.3, 0.8, 0.1, 0.6] },
      { time: 1, color: [0, 0.3, 0, 0] }
    ]
  };
  base.mainModule.startSize3D = {
    x: { mode: 'randomBetween', min: 0.02, max: 0.08 },
    y: { mode: 'randomBetween', min: 0.02, max: 0.08 },
    z: { mode: 'randomBetween', min: 0.02, max: 0.08 }
  };
  base.mainModule.startSpeed = { mode: 'randomBetween', min: 0.1, max: 0.5 };
  base.mainModule.rateOverTime = 10;
  base// name set in template definition: '萤火虫';
  return base;
}

function energyFieldConfig(): Particle3DConfig {
  const base = magicSparkleConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.2, 0.5, 1, 0.8] },
      { time: 1, color: [0, 0.2, 0.5, 0] }
    ]
  };
  base.shapeModule.shapeType = 'sphere';
  base.shapeModule.radius = 3;
  base.mainModule.startSpeed = { mode: 'constant', constant: 0.2 };
  base.mainModule.rateOverTime = 30;
  base// name set in template definition: '能量场';
  return base;
}

function portalConfig(): Particle3DConfig {
  const base = magicSparkleConfig();
  base.mainModule.startColor = {
    keys: [
      { time: 0, color: [0.5, 0.2, 1, 1] },
      { time: 0.5, color: [0.3, 0.1, 0.8, 0.6] },
      { time: 1, color: [0, 0, 0.3, 0] }
    ]
  };
  base.shapeModule.shapeType = 'circle';
  base.shapeModule.radius = 2;
  base.mainModule.startSpeed = { mode: 'constant', constant: -1 };
  base.trailModule.enabled = true;
  base.trailModule.lifetime = { mode: 'constant', constant: 0.3 };
  base// name set in template definition: '传送门';
  return base;
}

// 扩展模板列表
const EXTRA_TEMPLATES: PresetTemplate[] = [
  { id: 't-shockwave', name: '冲击波', description: '环形冲击波向外扩散', category: '战斗特效', tags: ['冲击波', '战斗'], keywords: ['冲击波', 'shockwave'], buildConfig: shockwaveConfig },
  { id: 't-spark', name: '火花飞溅', description: '金属碰撞的火花四散', category: '战斗特效', tags: ['火花', '战斗', '碰撞'], keywords: ['火花', '飞溅', 'spark'], buildConfig: sparkConfig },
  { id: 't-dust', name: '灰尘扬起', description: '地面灰尘被激起并飘散', category: '战斗特效', tags: ['灰尘', '战斗', '地面'], keywords: ['灰尘', 'dust'], buildConfig: dustConfig },
  { id: 't-heal', name: '治愈光环', description: '绿色光点从中心向外螺旋', category: '魔法技能', tags: ['治愈', '光环', '魔法'], keywords: ['治愈', '光环', 'heal', 'aura'], buildConfig: healAuraConfig },
  { id: 't-shadow', name: '暗影能量', description: '暗紫色能量从地面涌出', category: '魔法技能', tags: ['暗影', '魔法', '黑暗'], keywords: ['暗影', 'shadow', 'dark'], buildConfig: shadowEnergyConfig },
  { id: 't-ice', name: '冰霜爆发', description: '冰蓝色晶体爆裂扩散', category: '魔法技能', tags: ['冰', '魔法', '爆发'], keywords: ['冰', '冰霜', 'ice', 'frost'], buildConfig: iceBurstConfig },
  { id: 't-firefly', name: '萤火虫', description: '黄绿色光点缓慢飘动', category: '环境氛围', tags: ['萤火虫', '氛围', '自然'], keywords: ['萤火虫', 'firefly'], buildConfig: fireflyConfig },
  { id: 't-energy', name: '能量场', description: '蓝色能量粒子环绕中心旋转', category: '环境氛围', tags: ['能量场', '科幻', '护盾'], keywords: ['能量场', 'energy', 'field'], buildConfig: energyFieldConfig },
  { id: 't-portal', name: '传送门', description: '紫色漩涡粒子从边缘向中心汇聚', category: '环境氛围', tags: ['传送门', '科幻', '魔法'], keywords: ['传送门', 'portal'], buildConfig: portalConfig }
];

export const ALL_TEMPLATES: PresetTemplate[] = [...PRESET_TEMPLATES, ...EXTRA_TEMPLATES];

// ============================================================
// 关键词匹配引擎
// ============================================================

export function matchTemplate(input: string): PresetTemplate | null {
  const lower = input.toLowerCase();
  let bestMatch: PresetTemplate | null = null;
  let bestScore = 0;

  for (const template of ALL_TEMPLATES) {
    for (const keyword of template.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = template;
        }
      }
    }
  }

  return bestMatch;
}

// ============================================================
// 语义微调引擎
// ============================================================

export interface MicroAdjustment {
  paramPath: string;
  multiplier: number;
}

const ADJUSTMENT_RULES: { patterns: RegExp[]; adjustments: MicroAdjustment[] }[] = [
  {
    patterns: [/快/, /高速/, /更快/, /加速/, /fast/, /faster/, /speed up/],
    adjustments: [
      { paramPath: 'mainModule.startSpeed', multiplier: 1.5 }
    ]
  },
  {
    patterns: [/慢/, /缓慢/, /更慢/, /减速/, /slow/, /slower/, /speed down/],
    adjustments: [
      { paramPath: 'mainModule.startSpeed', multiplier: 0.6 }
    ]
  },
  {
    patterns: [/多/, /密集/, /更多/, /more/, /dense/],
    adjustments: [
      { paramPath: 'mainModule.rateOverTime', multiplier: 1.8 },
      { paramPath: 'mainModule.capacity', multiplier: 1.5 }
    ]
  },
  {
    patterns: [/少/, /稀疏/, /更少/, /less/, /sparse/],
    adjustments: [
      { paramPath: 'mainModule.rateOverTime', multiplier: 0.5 }
    ]
  },
  {
    patterns: [/大/, /巨大/, /更大/, /big/, /large/, /bigger/],
    adjustments: [
      { paramPath: 'mainModule.startSize3D', multiplier: 1.5 }
    ]
  },
  {
    patterns: [/小/, /微小/, /更小/, /small/, /tiny/, /smaller/],
    adjustments: [
      { paramPath: 'mainModule.startSize3D', multiplier: 0.6 }
    ]
  },
  {
    patterns: [/亮/, /明亮/, /更亮/, /bright/, /brighter/],
    adjustments: [
      { paramPath: 'mainModule.startColor', multiplier: 1.2 }
    ]
  },
  {
    patterns: [/暗/, /暗淡/, /更暗/, /dark/, /darker/, /dim/],
    adjustments: [
      { paramPath: 'mainModule.startColor', multiplier: 0.7 }
    ]
  }
];

export function applyMicroAdjustments(config: Particle3DConfig, input: string): { config: Particle3DConfig; applied: string[] } {
  const lower = input.toLowerCase();
  const applied: string[] = [];
  const newConfig = JSON.parse(JSON.stringify(config)) as Particle3DConfig;

  for (const rule of ADJUSTMENT_RULES) {
    const matched = rule.patterns.some(p => p.test(lower));
    if (matched) {
      for (const adj of rule.adjustments) {
        applyAdjustment(newConfig, adj);
        applied.push(adj.paramPath);
      }
    }
  }

  return { config: newConfig, applied };
}

function applyAdjustment(config: any, adj: MicroAdjustment) {
  const path = adj.paramPath.split('.');
  let target = config;
  for (let i = 0; i < path.length - 1; i++) {
    target = target[path[i]];
    if (!target) return;
  }
  const lastKey = path[path.length - 1];

  if (lastKey === 'startSpeed' || lastKey === 'rateOverTime') {
    if (target[lastKey]?.constant !== undefined) {
      target[lastKey].constant = Math.round(target[lastKey].constant * adj.multiplier * 10) / 10;
    }
  } else if (lastKey === 'capacity') {
    target[lastKey] = Math.round(target[lastKey] * adj.multiplier);
  } else if (lastKey === 'startSize3D') {
    ['x', 'y', 'z'].forEach(axis => {
      if (target[lastKey][axis]?.constant !== undefined) {
        target[lastKey][axis].constant = Math.round(target[lastKey][axis].constant * adj.multiplier * 100) / 100;
      }
    });
  } else if (lastKey === 'startColor') {
    if (target[lastKey]?.keys) {
      for (const key of target[lastKey].keys) {
        for (let i = 0; i < 3; i++) {
          key.color[i] = Math.min(1, Math.round(key.color[i] * adj.multiplier * 100) / 100);
        }
      }
    }
  }
}

// ============================================================
// AI Engine 主入口
// ============================================================

export interface AIEngineResult {
  effectConfig: EffectConfig;
  responseText: string;
  matchedTemplate: PresetTemplate | null;
  appliedAdjustments: string[];
}

export async function generateEffect(
  input: string,
  currentEffect: EffectConfig | null,
  mode: 'demo' | 'llm',
  streamCallback?: (chunk: string) => void
): Promise<AIEngineResult> {
  if (mode === 'demo' || !streamCallback) {
    return generateDemoEffect(input, currentEffect);
  }

  // LLM mode - streamCallback is provided by the caller through IPC
  return new Promise((resolve, reject) => {
    // This will be handled by the ChatPanel via IPC
    reject(new Error('LLM mode should be handled via IPC'));
  });
}

function generateDemoEffect(
  input: string,
  currentEffect: EffectConfig | null
): AIEngineResult {
  // First try to match a template
  const matchedTemplate = matchTemplate(input);

  if (matchedTemplate) {
    const config = matchedTemplate.buildConfig();
    const effectConfig: EffectConfig = {
      id: generateUUID(),
      name: matchedTemplate.name,
      type: 'particle3d',
      version: '1.0.0',
      targetEngineVersion: '3.8.x',
      source: 'template',
      tags: matchedTemplate.tags,
      metadata: {
        description: matchedTemplate.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      config
    };

    // Apply micro-adjustments if input has more than just keyword
    const { config: adjustedConfig, applied } = applyMicroAdjustments(config, input);

    return {
      effectConfig: { ...effectConfig, config: adjustedConfig },
      responseText: `已为您生成 **${matchedTemplate.name}** 效果。${applied.length > 0 ? `\n\n已应用微调：${applied.join('、')}` : ''}\n\n您可以在右侧面板调整参数，或继续对话微调效果。`,
      matchedTemplate,
      appliedAdjustments: applied
    };
  }

  // Check if it's a micro-adjustment on current effect
  if (currentEffect) {
    const { config: adjustedConfig, applied } = applyMicroAdjustments(
      currentEffect.config as Particle3DConfig,
      input
    );

    if (applied.length > 0) {
      return {
        effectConfig: { ...currentEffect, config: adjustedConfig, metadata: { ...currentEffect.metadata, updatedAt: new Date().toISOString() } },
        responseText: `已微调特效参数：${applied.join('、')}`,
        matchedTemplate: null,
        appliedAdjustments: applied
      };
    }
  }

  // No match
  return {
    effectConfig: currentEffect || getDefaultEffectConfig('particle3d'),
    responseText: `抱歉，Demo 模式暂不支持该描述。请尝试以下关键词：\n- **火焰特效** / **雪花飘落** / **下雨效果** / **魔法星光** / **爆炸效果**\n\n或配置 API Key 切换到 AI 生成模式。`,
    matchedTemplate: null,
    appliedAdjustments: []
  };
}
