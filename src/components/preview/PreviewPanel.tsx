import React, { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { ParticlePreview } from '@/utils/particle-preview';
import type { Particle3DConfig } from '@/types/effect';

let previewInstance: ParticlePreview | null = null;

function getPreview(): ParticlePreview {
  if (!previewInstance) {
    previewInstance = new ParticlePreview();
  }
  return previewInstance;
}

export const PreviewPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentEffect, previewPlaying, setPreviewPlaying } = useAppStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let fallbackDiv: HTMLDivElement | null = null;

    try {
      const preview = getPreview();
      preview.mount(container);
    } catch (err: any) {
      console.warn('WebGL not available:', err.message);
      const fallbackDiv = document.createElement('div');
      fallbackDiv.style.width = '100%';
      fallbackDiv.style.height = '100%';
      fallbackDiv.style.display = 'flex';
      fallbackDiv.style.flexDirection = 'column';
      fallbackDiv.style.alignItems = 'center';
      fallbackDiv.style.justifyContent = 'center';
      fallbackDiv.style.color = '#8b949e';
      fallbackDiv.style.fontSize = '14px';
      fallbackDiv.style.background = '#0d1117';
      fallbackDiv.innerHTML = '<div>⚠ WebGL 预览在此环境不可用</div><div style="font-size:12px;margin-top:8px">请在支持 WebGL 的桌面环境中运行</div>';
      container.appendChild(fallbackDiv);
    }

    return () => {
      if (fallbackDiv) {
        container.removeChild(fallbackDiv);
      } else {
        const preview = getPreview();
        preview.unmount();
      }
    };
  }, []);

  // Update config when effect changes
  useEffect(() => {
    if (config) {
      const preview = getPreview();
      preview.setConfig(config);
    }
  }, [config]);

  // Sync play/pause
  useEffect(() => {
    const preview = getPreview();
    if (previewPlaying) {
      preview.play();
    } else {
      preview.pause();
    }
  }, [previewPlaying]);

  // Mouse events for camera
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    getPreview().onMouseDown(e.clientX, e.clientY);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    getPreview().onMouseMove(e.clientX, e.clientY);
  }, []);

  const handleMouseUp = useCallback(() => {
    getPreview().onMouseUp();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    getPreview().onWheel(e.deltaY);
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setPreviewPlaying(!previewPlaying);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewPlaying, setPreviewPlaying]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <button
          onClick={() => setPreviewPlaying(!previewPlaying)}
          title={previewPlaying ? '暂停' : '播放'}
        >
          {previewPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          onClick={() => {
            const preview = getPreview();
            preview.reset();
            setPreviewPlaying(true);
          }}
          title="重置"
        >
          ↺ 重置
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          🎬 {useAppStore.getState().effectType === 'particle2d' ? '2D 粒子预览' : '3D 粒子预览'} {previewPlaying ? '🟢' : '⏸'}
        </span>
        <select
          onChange={(e) => {
            const bg = e.target.value;
            const preview = getPreview();
            // Access scene background - use a simpler approach
            const colors: Record<string, string> = {
              dark: '#0d1117', light: '#e6edf3', custom: '#1a1a2e', transparent: 'transparent'
            };
            document.querySelector('canvas')?.parentElement?.style.setProperty('background', colors[bg] || '#0d1117');
          }}
          style={{ fontSize: 11, padding: '2px 6px', width: 90 }}
        >
          <option value="dark">深色背景</option>
          <option value="light">浅色背景</option>
          <option value="custom">深蓝背景</option>
          <option value="transparent">透明背景</option>
        </select>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1,
          cursor: 'grab',
          minHeight: 0
        }}
      />
    </div>
  );
};
