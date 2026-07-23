import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { ALL_TEMPLATES, type PresetTemplate } from '@/data/template-data';
import type { EffectConfig } from '@/types/effect';
import { generateId, generateUUID } from '@/utils/effect-defaults';

const CATEGORIES = ['全部', '自然现象', '战斗特效', '魔法技能', '环境氛围'];

export const EmitterTemplatesModal: React.FC = () => {
  const { emitterTemplatesOpen, setEmitterTemplatesOpen, showToastMessage } = useAppStore();
  const { applyAiEffectToSelectedEmitter, addMessage } = useProjectStore();
  const [activeCategory, setActiveCategory] = useState('全部');

  const filteredTemplates = useMemo(() => {
    if (activeCategory === '全部') return ALL_TEMPLATES;
    return ALL_TEMPLATES.filter((t: PresetTemplate) => t.category === activeCategory);
  }, [activeCategory]);

  if (!emitterTemplatesOpen) return null;

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

    const ok = applyAiEffectToSelectedEmitter(effectConfig);
    if (!ok) {
      showToastMessage('请先在层级树选中一个发射器');
      return;
    }

    setEmitterTemplatesOpen(false);
    showToastMessage(`已应用模板：${template.name}`);
    addMessage({
      id: generateId(),
      role: 'system',
      content: `已应用模板：**${template.name}**`,
      timestamp: Date.now()
    });
  };

  return (
    <div className="modal-overlay" onClick={() => setEmitterTemplatesOpen(false)}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 560, maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <h2>✨ 单发射器模板</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0 }}>
          将内置粒子参数应用到<strong>当前选中的发射器</strong>（15 个模板，4 个分类）。
        </p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn-sm${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10
        }}>
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              type="button"
              className="btn-sm"
              style={{
                textAlign: 'left',
                padding: 12,
                height: 'auto',
                display: 'block',
                width: '100%'
              }}
              onClick={() => handleApply(template)}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{template.description}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {template.tags.join(' · ')}
              </div>
            </button>
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button onClick={() => setEmitterTemplatesOpen(false)}>关闭</button>
        </div>
      </div>
    </div>
  );
};
