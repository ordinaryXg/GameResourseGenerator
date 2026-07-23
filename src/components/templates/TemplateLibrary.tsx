import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { ALL_TEMPLATES, type PresetTemplate } from '@/data/template-data';
import type { EffectConfig } from '@/types/effect';
import { generateUUID } from '@/utils/effect-defaults';

const CATEGORIES = ['全部', '自然现象', '战斗特效', '魔法技能', '环境氛围'];

import { generateId } from '@/utils/effect-defaults';

export const TemplateLibrary: React.FC = () => {
  const { setTemplateLibraryOpen } = useAppStore();
  const { setCurrentEffect, addMessage } = useProjectStore();
  const [activeCategory, setActiveCategory] = useState('全部');

  const filteredTemplates = useMemo(() => {
    if (activeCategory === '全部') return ALL_TEMPLATES;
    return ALL_TEMPLATES.filter((t: PresetTemplate) => t.category === activeCategory);
  }, [activeCategory]);

  const handleApply = (template: PresetTemplate) => {
    const config = template.buildConfig();
    const effectConfig: EffectConfig = {
      id: generateUUID(),
      name: template.name,
      type: 'particle3d',
      version: '1.0.0',
      targetEngineVersion: '3.8.x',
      source: 'template',
      tags: template.tags,
      metadata: {
        description: template.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      config
    };

    setCurrentEffect(effectConfig);
    setTemplateLibraryOpen(false);

    addMessage({
      id: generateId(),
      role: 'system',
      content: `已应用模板：**${template.name}**`,
      timestamp: Date.now()
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <button onClick={() => setTemplateLibraryOpen(false)}>← 返回编辑器</button>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Cocos AI 特效生成器 - 模板库</h2>
      </div>

      {/* Category Filters */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-tertiary)',
              borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--border-color)',
              color: activeCategory === cat ? '#fff' : 'var(--text-primary)'
            }}
          >
            {cat === '全部' ? '全部' :
             cat === '自然现象' ? '🔥 自然现象' :
             cat === '战斗特效' ? '⚔ 战斗特效' :
             cat === '魔法技能' ? '✨ 魔法技能' :
             '🌿 环境氛围'}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
        alignContent: 'start'
      }}>
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            onClick={() => handleApply(template)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{
              width: '100%',
              height: 80,
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              marginBottom: 12
            }}>
              {template.category === '自然现象' ? '🔥' :
               template.category === '战斗特效' ? '💥' :
               template.category === '魔法技能' ? '✨' : '🌿'}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {template.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {template.description}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {template.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
