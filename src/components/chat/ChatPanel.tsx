import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/stores/app-store';
import { generateId } from '@/utils/effect-defaults';
import { generateEffect, buildSystemPrompt } from '@/utils/ai-engine';
import type { ChatMessage } from '@/types/effect';

export const ChatPanel: React.FC = () => {
  const {
    messages,
    isStreaming,
    streamingContent,
    appMode,
    currentEffect,
    aiSettings,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    setCurrentEffect,
    showToastMessage
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = appMode === 'demo'
        ? '👋 欢迎使用 **Cocos AI 特效生成器**！\n\n当前为 **Demo 模式**，支持以下关键词：\n- 🔥 **火焰特效**\n- ❄️ **雪花飘落**\n- 🌧️ **下雨效果**\n- ✨ **魔法星光**\n- 💥 **爆炸效果**\n\n描述你想要的特效，或配置 API Key 切换到 AI 生成模式。'
        : '👋 欢迎使用 **Cocos AI 特效生成器**！\n\n用自然语言描述你想要的特效，AI 将为你生成粒子效果。';
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: welcomeMsg,
        timestamp: Date.now()
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    addMessage(userMsg);

    if (appMode === 'demo') {
      // Demo mode
      setIsStreaming(true);
      setStreamingContent('');

      // Simulate streaming
      const result = await generateEffect(text, currentEffect, 'demo');
      const responseText = result.responseText;

      let streamedIdx = 0;
      const streamInterval = setInterval(() => {
        if (streamedIdx < responseText.length) {
          const chunk = responseText.slice(streamedIdx, streamedIdx + 3);
          streamedIdx += 3;
          appendStreamingContent(chunk);
        } else {
          clearInterval(streamInterval);
          // Done
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: responseText,
            timestamp: Date.now()
          };
          addMessage(assistantMsg);
          setStreamingContent('');
          setIsStreaming(false);
          setCurrentEffect(result.effectConfig);
        }
      }, 20);
    } else {
      // LLM mode - use IPC
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

          // Try to parse JSON from response
          try {
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              if (currentEffect) {
                setCurrentEffect({
                  ...currentEffect,
                  name: parsed.name || currentEffect.name,
                  config: { ...currentEffect.config, ...parsed }
                });
              }
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
      } catch (err: any) {
        showToastMessage(`请求失败：${err.message}`);
        setIsStreaming(false);
        setStreamingContent('');
      }
    }
  }, [input, isStreaming, appMode, currentEffect, aiSettings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>🤖 AI 对话</span>
        {appMode === 'demo' ? (
          <span className="badge badge-demo">Demo 模式</span>
        ) : (
          <span className="badge badge-llm">{aiSettings.model}</span>
        )}
      </div>

      {/* Messages */}
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

        {/* Streaming indicator */}
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

      {/* Input */}
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
            appMode === 'demo'
              ? '描述你想要的特效，如「火焰特效」「雪花飘落」...'
              : '用自然语言描述你想要的特效...'
          }
          disabled={isStreaming}
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
            disabled={isStreaming || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
