import React, { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { AIProvider, AIModel } from '@/types/effect';

const MODELS: Record<AIProvider, { value: AIModel; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ]
};

export const SettingsModal: React.FC = () => {
  const { aiSettings, setAISettings, setSettingsOpen } = useAppStore();
  const [localSettings, setLocalSettings] = useState({ ...aiSettings });

  const handleSave = () => {
    setAISettings(localSettings);
    setSettingsOpen(false);
  };

  const models = MODELS[localSettings.provider] || MODELS.openai;

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙ 设置</h2>

        {/* Provider */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>AI 服务商</label>
          <select
            value={localSettings.provider}
            onChange={(e) => {
              const provider = e.target.value as AIProvider;
              const defaultModel = MODELS[provider][0].value;
              setLocalSettings({ ...localSettings, provider, model: defaultModel });
            }}
            style={{ width: '100%' }}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            API Key
            {localSettings.apiKey && <span style={{ color: 'var(--success)', marginLeft: 8, fontSize: 12 }}>🟢 已配置</span>}
          </label>
          <input
            type="password"
            value={localSettings.apiKey}
            onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
            placeholder="输入 API Key..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Model */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>AI 模型</label>
          <select
            value={localSettings.model}
            onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value as AIModel })}
            style={{ width: '100%' }}
          >
            {models.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Temperature: {localSettings.temperature}
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={localSettings.temperature}
            onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>0 - 精确</span>
            <span>2 - 创意</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Max Tokens</label>
          <input
            type="number"
            value={localSettings.maxTokens}
            onChange={(e) => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value) || 2048 })}
            min={256}
            max={8192}
            style={{ width: '100%' }}
          />
        </div>

        {/* Language */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>语言 / Language</label>
          <select
            value={useAppStore.getState().lang}
            onChange={(e) => useAppStore.getState().setLang(e.target.value as 'zh' | 'en')}
            style={{ width: '100%' }}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="modal-actions">
          <button onClick={() => setSettingsOpen(false)}>取消</button>
          <button className="primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};
