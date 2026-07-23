import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useProjectStore } from '@/stores/project-store';
import { CompositeParticlePreview } from '@/utils/composite-particle-preview';
import { Particle2DPreview } from '@/utils/particle2d-preview';
import { collectEmitterPreviewSources } from '@/utils/preview-sources';
import { AxisGizmo } from '@/components/preview/AxisGizmo';
import type { BaseParticlePreview } from '@/utils/base-particle-preview';
import type { EffectType } from '@/types/effect';
/** Viewport-style muted backgrounds (Unity/Unreal inspired). */
const PREVIEW_BG_OPTIONS: Record<string, string> = {
  dark: '#252530',
  light: '#3a3a42',
  studio: '#2d3142',
  transparent: 'transparent'
};

const previewCache = new Map<string, BaseParticlePreview>();

function getPreview(type: EffectType): BaseParticlePreview {
  const cached = previewCache.get(type);
  if (cached) return cached;

  const instance = type === 'particle2d' ? new Particle2DPreview() : new CompositeParticlePreview();
  previewCache.set(type, instance);
  return instance;
}

export const PreviewPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<BaseParticlePreview>(getPreview('particle3d'));
  const {
    effectType, previewPlaying, setPreviewPlaying,
    previewBackground, setPreviewBackground, showAxes, setShowAxes
  } = useAppStore();
  const { project, soloNodeId } = useProjectStore();
  const preview = previewRef.current;

  const previewSources = useMemo(() => {
    if (!project || effectType !== 'particle3d') return [];
    return collectEmitterPreviewSources(project.root, { soloId: soloNodeId });
  }, [project, soloNodeId, effectType, project?.metadata.updatedAt]);
  useEffect(() => {
    previewRef.current = getPreview(effectType);
  }, [effectType]);

  useEffect(() => {
    const container = containerRef.current;
    const inst = previewRef.current;
    if (!container) return;

    let fallbackDiv: HTMLDivElement | null = null;

    try {
      inst.mount(container);
      inst.setBackground(previewBackground);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('WebGL not available:', message);
      fallbackDiv = document.createElement('div');
      fallbackDiv.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8b949e;font-size:14px;background:#252530';
      fallbackDiv.innerHTML = '<div>⚠ WebGL 预览在此环境不可用</div><div style="font-size:12px;margin-top:8px">请在支持 WebGL 的桌面环境中运行</div>';
      container.appendChild(fallbackDiv);
    }

    return () => {
      if (fallbackDiv) {
        container.removeChild(fallbackDiv);
      } else {
        inst.unmount();
      }
    };
  }, [effectType]);

  useEffect(() => {
    previewRef.current.setBackground(previewBackground);
  }, [previewBackground, effectType]);

  useEffect(() => {
    if (effectType !== 'particle3d') return;
    const inst = previewRef.current as CompositeParticlePreview;
    inst.setEmitters(previewSources);
  }, [previewSources, effectType]);
  useEffect(() => {
    if (previewPlaying) previewRef.current.play();
    else previewRef.current.pause();
  }, [previewPlaying, effectType]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => { previewRef.current.onMouseDown(e.clientX, e.clientY); }, [effectType]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => { previewRef.current.onMouseMove(e.clientX, e.clientY); }, [effectType]);
  const handleMouseUp = useCallback(() => { previewRef.current.onMouseUp(); }, [effectType]);
  const handleWheel = useCallback((e: React.WheelEvent) => { previewRef.current.onWheel(e.deltaY); }, [effectType]);

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

  const bgKey = Object.entries(PREVIEW_BG_OPTIONS).find(([, v]) => v === previewBackground)?.[0] || 'dark';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ gap: 8 }}>
        <button className="btn-sm" onClick={() => setPreviewPlaying(!previewPlaying)} title={previewPlaying ? '暂停' : '播放'}>
          {previewPlaying ? '暂停' : '播放'}
        </button>
        <button className="btn-sm" onClick={() => { previewRef.current.reset(); setPreviewPlaying(true); }} title="重置">
          重置
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          {effectType === 'particle2d' ? '2D 粒子预览' : `3D 合成预览 (${previewSources.length} 发射器)`}
        </span>        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showAxes}
            onChange={(e) => setShowAxes(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
          坐标轴
        </label>
        <select
          value={bgKey}
          onChange={(e) => setPreviewBackground(PREVIEW_BG_OPTIONS[e.target.value] || '#252530')}
          className="select-sm"
          style={{ width: 90 }}
        >
          <option value="dark">深灰</option>
          <option value="light">中灰</option>
          <option value="studio">蓝灰</option>
          <option value="transparent">透明</option>
        </select>
      </div>
      <div
        ref={containerRef}
        className="preview-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <AxisGizmo preview={previewRef.current} visible={showAxes} />
      </div>
    </div>
  );
};
