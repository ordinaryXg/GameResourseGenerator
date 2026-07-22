import { describe, it, expect } from 'vitest';
import { generateEffect, buildSystemPrompt } from '../src/utils/ai-engine';

describe('ai-engine', () => {
  it('buildSystemPrompt returns non-empty string with key terms', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('Cocos Creator');
    expect(prompt).toContain('startSpeed');
    expect(prompt).toContain('startColor');
  });

  it('generateEffect in demo mode matches fire keyword', async () => {
    const result = await generateEffect('火焰特效', null, 'demo');
    expect(result.effectConfig).toBeDefined();
    expect(result.effectConfig.name).toBe('火焰');
    expect(result.matchedTemplate).toBeDefined();
    expect(result.responseText).toContain('火焰');
  });

  it('generateEffect in demo mode matches snow keyword', async () => {
    const result = await generateEffect('雪花飘落', null, 'demo');
    expect(result.effectConfig.name).toBe('飘雪');
    expect(result.matchedTemplate).toBeDefined();
  });

  it('generateEffect returns fallback for unknown input', async () => {
    const result = await generateEffect('xyzabc123', null, 'demo');
    expect(result.matchedTemplate).toBeNull();
    expect(result.responseText).toContain('暂不支持');
  });

  it('generateEffect applies micro-adjustment on existing effect', async () => {
    const { effectConfig: base } = await generateEffect('火焰特效', null, 'demo');
    const result = await generateEffect('更快', base, 'demo');
    expect(result.appliedAdjustments.length).toBeGreaterThan(0);
    expect(result.effectConfig).toBeDefined();
  });
});
