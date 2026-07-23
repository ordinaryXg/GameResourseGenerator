import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { generateId } from '@/utils/effect-defaults';
import { generateEffect, buildSystemPrompt } from '@/utils/ai-engine';
import { emitterToEffectConfig } from '@/utils/project-io';
import { getStrictSelectedEmitter } from '@/utils/project-tree';
import type { ChatMessage } from '@/types/effect';
import type { EffectConfig } from '@/types/effect';

export const ChatPanel: React.FC = () => {
  const {
    isStreaming, streamingContent, appMode, aiSettings,
    setIsStreaming, setStreamingContent, appendStreamingContent, showToastMessage
  } = useAppStore();

  const {
    messages, currentEffect, addMessage, project, selectedNodeId,
    applyAiEffectToSelectedEmitter
  } = useProjectStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedEmitter = useMemo(() => {
    if (!project) return null;
    return getStrictSelectedEmitter(project.root, selectedNodeId);
  }, [project, selectedNodeId]);

  const aiTargetEffect = useMemo((): EffectConfig | null => {
    if (!project || !selectedEmitter) return null;
    return emitterToEffectConfig(selectedEmitter, project);
  }, [project, selectedEmitter]);

  const resolveAiTarget = useCallback(() => {
    if (!project) {
      showToastMessage('请先打开或新建项目');
      return null;
    }
    const emitter = getStrictSelectedEmitter(project.root, selectedNodeId);
    if (!emitter) {
      showToastMessage('请先在层级树选中一个粒子发射器');
      return null;
    }
    return emitter;
  }, [project, selectedNodeId, showToastMessage]);

  useEffect(() => {
    if (messages.length === 0 && project) {
      const scopeHint = selectedEmitter
        ? `\n\n当前作用对象：**${selectedEmitter.name}**`
        : '\n\n请先在**层级树**选中一个粒子发射器，再描述要生成的效果。';
      const welcomeMsg = appMode === 'demo'
        ? `👋 欢迎使用 **FX Studio 特效工坊**！${scopeHint}\n\nDemo 模式关键词：火焰特效、雪花飘落、下雨效果、魔法星光、爆炸效果。`
        : `👋 欢迎使用 **FX Studio 特效工坊**！${scopeHint}\n\n用自然语言描述特效，AI 将更新**当前选中的发射器**。`;
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: welcomeMsg,
        timestamp: Date.now()
      });
    }
  }, [project?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const applyAiResult = useCallback((effectConfig: EffectConfig) => {
    if (!applyAiEffectToSelectedEmitter(effectConfig)) {
      showToastMessage('请先在层级树选中一个粒子发射器');
      return false;
    }
    return true;
  }, [applyAiEffectToSelectedEmitter, showToastMessage]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!resolveAiTarget()) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    addMessage(userMsg);

    const baseEffect = aiTargetEffect ?? currentEffect;

    if (appMode === 'demo') {
      setIsStreaming(true);
      setStreamingContent('');

      const result = await generateEffect(text, baseEffect, 'demo');
      const responseText = result.responseText;

      let streamedIdx = 0;
      const streamInterval = setInterval(() => {
        if (streamedIdx < responseText.length) {
          const chunk = responseText.slice(streamedIdx, streamedIdx + 3);
          streamedIdx += 3;
          appendStreamingContent(chunk);
        } else {
          clearInterval(streamInterval);
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: responseText,
            timestamp: Date.now()
          };
          addMessage(assistantMsg);
          setStreamingContent('');
          setIsStreaming(false);
          applyAiResult(result.effectConfig);
        }
      }, 20);
    } else {
      setIsStreaming(true);
      setStreamingContent('');

      const systemPrompt = buildSystemPrompt();
      const llmMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      try {
        window.electronAPI.onStreamChunk((chunk: string) => {
          appendStreamingContent(chunk);
        });

        window.electronAPI.onStreamDone(() => {
          const content = useAppStore.getState().streamingContent;
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content,
            timestamp: Date.now()
          };
          addMessage(assistantMsg);
          setStreamingContent('');
          setIsStreaming(false);

          try {
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch && baseEffect) {
              const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              const nextEffect: EffectConfig = {
                ...baseEffect,
                name: parsed.name || baseEffect.name,
                config: { ...baseEffect.config, ...parsed }
              };
              if (!applyAiResult(nextEffect)) return;
            }
          } catch {
            showToastMessage('AI 返回格式异常，请重试');
          }
        });

        window.electronAPI.onStreamError((error: string) => {
          showToastMessage(`AI 服务错误：${error}`);
          setIsStreaming(false);
          setStreamingContent('');
        });

        await window.electronAPI.chatStream({
          provider: aiSettings.provider,
          model: aiSettings.model,
          messages: llmMessages,
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showToastMessage(`请求失败：${message}`);
        setIsStreaming(false);
        setStreamingContent('');
      }
    }
  }, [
    input, isStreaming, appMode, aiTargetEffect, currentEffect, aiSettings, messages,
    addMessage, resolveAiTarget, applyAiResult, showToastMessage,
    setIsStreaming, setStreamingContent, appendStreamingContent
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!selectedEmitter && !isStreaming && !!input.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 11,
        color: selectedEmitter ? 'var(--text-secondary)' : 'var(--warning, #d29922)'
      }}>
        {selectedEmitter
          ? `🎯 作用对象：${selectedEmitter.name}`
          : '⚠ 未选中发射器 — 请在层级树选中粒子系统后再生成'}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 16,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: msg.role === 'user' ? 'var(--bg-tertiary)' : 'transparent',
              fontSize: 14,
              lineHeight: 1.6
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {msg.role === 'user' ? '👤 你' : '🤖 AI'}
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div style={{
            marginBottom: 16,
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.6
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              🤖 AI
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {streamingContent}
            </ReactMarkdown>
            <span style={{ animation: 'pulse 1s infinite', color: 'var(--accent)' }}>▊</span>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>▊</span> 正在生成...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)'
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedEmitter
              ? (appMode === 'demo'
                ? `为「${selectedEmitter.name}」描述效果，如火焰、爆炸…`
                : `为「${selectedEmitter.name}」描述粒子特效…`)
              : '请先在层级树选中一个发射器…'
          }
          disabled={isStreaming || !selectedEmitter}
          rows={2}
          style={{
            width: '100%',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.5
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            className="primary"
            onClick={handleSend}
            disabled={!canSend}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
