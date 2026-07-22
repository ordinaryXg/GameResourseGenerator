import type { EffectConfig, Particle3DConfig } from '@/types/effect';
import { getDefaultEffectConfig, generateUUID, generateId } from './effect-defaults';
import { ALL_TEMPLATES, matchTemplate, applyMicroAdjustments } from '@/data/template-data';
import type { PresetTemplate } from '@/data/template-data';

export type { PresetTemplate };

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
  return new Promise((_resolve, reject) => {
    reject(new Error('LLM mode should be handled via IPC'));
  });
}

function generateDemoEffect(
  input: string,
  currentEffect: EffectConfig | null
): AIEngineResult {
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

    const { config: adjustedConfig, applied } = applyMicroAdjustments(config, input);
    return {
      effectConfig: { ...effectConfig, config: adjustedConfig },
      responseText: `已为您生成 **${matchedTemplate.name}** 效果。${applied.length > 0 ? `\n\n已应用微调：${applied.join('、')}` : ''}\n\n您可以在右侧面板调整参数，或继续对话微调效果。`,
      matchedTemplate,
      appliedAdjustments: applied
    };
  }

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

  return {
    effectConfig: currentEffect || getDefaultEffectConfig('particle3d'),
    responseText: `抱歉，Demo 模式暂不支持该描述。请尝试以下关键词：\n- **火焰特效** / **雪花飘落** / **下雨效果** / **魔法星光** / **爆炸效果**\n\n或配置 API Key 切换到 AI 生成模式。`,
    matchedTemplate: null,
    appliedAdjustments: []
  };
}

// ============================================================
// System Prompt 构建
// ============================================================

export function buildSystemPrompt(): string {
  return `你是一个 Cocos Creator 3.8 粒子特效专家助手。你的任务是根据用户的自然语言描述，生成结构化的粒子特效配置。

## 可用参数

\`\`\`typescript
{
  "name": "特效名称",
  "mainModule": {
    "duration": 5, "capacity": 100, "loop": true,
    "startLifetime": { "mode": "constant", "constant": 2 },
    "startSpeed": { "mode": "constant", "constant": 5 },
    "startSize3D": { "x": { "mode": "constant", "constant": 1 } },
    "startColor": { "keys": [{ "time": 0, "color": [R,G,B,A] }] },
    "gravityModifier": 0, "rateOverTime": 20, "bursts": []
  },
  "shapeModule": { "enabled": true, "shapeType": "cone", "radius": 1, "angle": 25 },
  "colorOverLifetime": { "enabled": true, "color": {...} },
  "sizeOverLifetime": { "enabled": false },
  "noiseModule": { "enabled": false, "strength": 10, "frequency": 1 }
}
\`\`\`

## 规则
1. 只返回 JSON，不要任何额外文本
2. 火焰用 cone，雪花用 box，爆炸用 sphere，魔法用 sphere
3. 颜色 RGBA 各通道 0-1
4. 合理设置粒子数量

## 语义微调
- 更快 → startSpeed × 1.5 | 更慢 → × 0.6
- 更多 → rateOverTime × 1.8 | 更大 → startSize × 1.5
- 更亮 → RGB × 1.2 | 更暗 → RGB × 0.7`;
}
