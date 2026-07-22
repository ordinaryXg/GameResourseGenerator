import React, { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { generateAnimationClip } from '@/utils/export-formats';

interface Keyframe {
  time: number;
  x?: number; y?: number;
  scaleX?: number; scaleY?: number;
  rotation?: number;
  opacity?: number;
  color?: string;
}

interface AnimationTrack {
  property: string;
  label: string;
  keyframes: Keyframe[];
}

const EASING_PRESETS = [
  { name: 'linear', label: '线性' },
  { name: 'ease', label: '缓入缓出' },
  { name: 'ease-in', label: '缓入' },
  { name: 'ease-out', label: '缓出' },
  { name: 'bounce', label: '弹跳' },
  { name: 'elastic', label: '弹性' },
];

const ANIMATION_TEMPLATES: { name: string; desc: string; tracks: AnimationTrack[]; duration: number }[] = [
  {
    name: '弹入', desc: '从上方弹入', duration: 0.5,
    tracks: [{ property: 'y', label: 'Y 位移', keyframes: [{ time: 0, y: -50 }, { time: 0.6, y: 5 }, { time: 0.8, y: -2 }, { time: 1, y: 0 }] }]
  },
  {
    name: '淡入', desc: '透明度从 0 到 1', duration: 0.5,
    tracks: [{ property: 'opacity', label: '透明度', keyframes: [{ time: 0, opacity: 0 }, { time: 1, opacity: 1 }] }]
  },
  {
    name: '弹出', desc: '缩小并弹出', duration: 0.4,
    tracks: [
      { property: 'scaleX', label: '缩放X', keyframes: [{ time: 0, scaleX: 1 }, { time: 0.3, scaleX: 0.5 }, { time: 0.6, scaleX: 1.1 }, { time: 1, scaleX: 1 }] },
      { property: 'scaleY', label: '缩放Y', keyframes: [{ time: 0, scaleY: 1 }, { time: 0.3, scaleY: 0.5 }, { time: 0.6, scaleY: 1.1 }, { time: 1, scaleY: 1 }] },
      { property: 'opacity', label: '透明度', keyframes: [{ time: 0, opacity: 1 }, { time: 0.3, opacity: 0 }, { time: 0.6, opacity: 1 }, { time: 1, opacity: 0 }] }
    ]
  },
  {
    name: '左滑入', desc: '从左侧滑入', duration: 0.5,
    tracks: [{ property: 'x', label: 'X 位移', keyframes: [{ time: 0, x: -100 }, { time: 1, x: 0 }] }]
  },
  {
    name: '抖动', desc: '水平快速抖动', duration: 0.4,
    tracks: [{ property: 'x', label: 'X 位移', keyframes: [{ time: 0, x: 0 }, { time: 0.15, x: -8 }, { time: 0.3, x: 8 }, { time: 0.45, x: -6 }, { time: 0.6, x: 6 }, { time: 0.75, x: -3 }, { time: 0.9, x: 3 }, { time: 1, x: 0 }] }]
  },
  {
    name: '脉冲', desc: '周期性缩放脉冲', duration: 1,
    tracks: [
      { property: 'scaleX', label: '缩放X', keyframes: [{ time: 0, scaleX: 1 }, { time: 0.3, scaleX: 1.2 }, { time: 0.6, scaleX: 1 }, { time: 0.8, scaleX: 1.1 }, { time: 1, scaleX: 1 }] },
      { property: 'scaleY', label: '缩放Y', keyframes: [{ time: 0, scaleY: 1 }, { time: 0.3, scaleY: 1.2 }, { time: 0.6, scaleY: 1 }, { time: 0.8, scaleY: 1.1 }, { time: 1, scaleY: 1 }] }
    ]
  }
];

function applySingle(style: any, prop: string, kf: Keyframe) {
  switch (prop) {
    case 'x': style.translateX = (kf.x ?? 0) + 'px'; break;
    case 'y': style.translateY = (kf.y ?? 0) + 'px'; break;
    case 'scaleX': style.scaleX = kf.scaleX ?? 1; break;
    case 'scaleY': style.scaleY = kf.scaleY ?? 1; break;
    case 'rotation': style.rotate = (kf.rotation ?? 0) + 'deg'; break;
    case 'opacity': style.opacity = kf.opacity ?? 1; break;
  }
}

function interpolate(style: any, prop: string, k1: Keyframe, k2: Keyframe, p: number) {
  switch (prop) {
    case 'x': style.translateX = ((k1.x ?? 0) + ((k2.x ?? 0) - (k1.x ?? 0)) * p) + 'px'; break;
    case 'y': style.translateY = ((k1.y ?? 0) + ((k2.y ?? 0) - (k1.y ?? 0)) * p) + 'px'; break;
    case 'scaleX': style.scaleX = (k1.scaleX ?? 1) + ((k2.scaleX ?? 1) - (k1.scaleX ?? 1)) * p; break;
    case 'scaleY': style.scaleY = (k1.scaleY ?? 1) + ((k2.scaleY ?? 1) - (k1.scaleY ?? 1)) * p; break;
    case 'rotation': style.rotate = ((k1.rotation ?? 0) + ((k2.rotation ?? 0) - (k1.rotation ?? 0)) * p) + 'deg'; break;
    case 'opacity': style.opacity = (k1.opacity ?? 1) + ((k2.opacity ?? 1) - (k1.opacity ?? 1)) * p; break;
  }
}

export const AnimationEditor: React.FC = () => {
  const [tracks, setTracks] = useState<AnimationTrack[]>([
    { property: 'x', label: 'X 位移', keyframes: [{ time: 0, x: -100 }, { time: 1, x: 0 }] },
    { property: 'opacity', label: '透明度', keyframes: [{ time: 0, opacity: 0 }, { time: 1, opacity: 1 }] }
  ]);
  const [duration, setDuration] = useState(1);
  const [easing, setEasing] = useState('ease-out');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});

  const applyKeyframes = useCallback((t: number) => {
    const style: any = { transform: '', opacity: 1 };
    for (const track of tracks) {
      const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
      if (kfs.length === 0) continue;
      if (t <= kfs[0].time) {
        applySingle(style, track.property, kfs[0]);
      } else if (t >= kfs[kfs.length - 1].time) {
        applySingle(style, track.property, kfs[kfs.length - 1]);
      } else {
        let i = 0;
        while (i < kfs.length - 1 && kfs[i + 1].time <= t) i++;
        const k1 = kfs[i], k2 = kfs[i + 1];
        const p = (t - k1.time) / (k2.time - k1.time);
        interpolate(style, track.property, k1, k2, p);
      }
    }
    setPreviewStyle(style);
  }, [tracks]);

  const togglePlay = useCallback(() => {
    if (playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    startTimeRef.current = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const t = Math.min(elapsed / duration, 1);
      setCurrentTime(t);
      applyKeyframes(t);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setPlaying(false);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [playing, duration, applyKeyframes]);

  const reset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaying(false);
    setCurrentTime(0);
    applyKeyframes(0);
  }, [applyKeyframes]);

  const handleTemplate = useCallback((tpl: typeof ANIMATION_TEMPLATES[0]) => {
    setTracks(JSON.parse(JSON.stringify(tpl.tracks)));
    setDuration(tpl.duration);
    setEasing('ease-out');
    reset();
  }, [reset]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--animation-color)' }}>🎯 动画编辑器</span>
        <select onChange={(e) => {
          const t = ANIMATION_TEMPLATES.find(t => t.name === e.target.value);
          if (t) handleTemplate(t);
        }} style={{ fontSize: 12, padding: '4px 8px', marginLeft: 8 }}>
          <option value="">模板...</option>
          {ANIMATION_TEMPLATES.map(t => (
            <option key={t.name} value={t.name}>{t.name} - {t.desc}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            const clip = generateAnimationClip('动画', tracks, duration);
            const blob = new Blob([clip], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `动画_${Date.now()}.anim.json`;
            a.click(); URL.revokeObjectURL(url);
          }}
          style={{ fontSize: 12 }}
        >📤 导出</button>
        <select value={easing} onChange={(e) => setEasing(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
          {EASING_PRESETS.map(e => <option key={e.name} value={e.name}>{e.label}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>时长:</span>
        <input type="number" value={duration} onChange={(e) => setDuration(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
          min={0.1} max={10} step={0.1} style={{ width: 60, padding: '4px 8px', fontSize: 12 }} />
      </div>

      {/* Preview */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-tertiary)', margin: 12, borderRadius: 'var(--radius-lg)',
        minHeight: 200
      }}>
        <div style={{
          width: 80, height: 80, background: 'var(--accent)', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#fff', fontWeight: 700,
          transform: [
            previewStyle.transform,
            `translateX(${(previewStyle as any).translateX || 0}px)`,
            `translateY(${(previewStyle as any).translateY || 0}px)`,
            `scaleX(${(previewStyle as any).scaleX || 1})`,
            `scaleY(${(previewStyle as any).scaleY || 1})`,
            `rotate(${(previewStyle as any).rotate || 0}deg)`
          ].join(' '),
          opacity: previewStyle.opacity ?? 1,
          transition: playing ? 'none' : `all ${duration}s ${easing}`
        }}>
          AN
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={togglePlay} style={{ fontSize: 12 }}>{playing ? '⏸ 暂停' : '▶ 播放'}</button>
          <button onClick={reset} style={{ fontSize: 12 }}>↺ 重置</button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(currentTime * duration).toFixed(2)}s / {duration}s</span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${(currentTime * 100)}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.05s linear' }} />
        </div>
        {/* Tracks */}
        {tracks.map((track, ti) => (
          <div key={ti} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{track.label}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {track.keyframes.map((kf, ki) => (
                <div key={ki} style={{
                  fontSize: 10, padding: '2px 6px', background: 'var(--bg-tertiary)',
                  borderRadius: 4, color: 'var(--text-secondary)'
                }}>
                  t={(kf.time * duration).toFixed(1)}s
                </div>
              ))}
              <button onClick={() => {
                const newKfs = [...track.keyframes, { time: 0.5 }];
                const newTracks = [...tracks];
                newTracks[ti] = { ...track, keyframes: newKfs };
                setTracks(newTracks);
              }} style={{ fontSize: 10, padding: '1px 6px' }}>+ 关键帧</button>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        padding: '4px 12px', borderTop: '1px solid var(--border-color)',
        fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)'
      }}>
        动画 · {tracks.length} 条轨道 · {tracks.reduce((s, t) => s + t.keyframes.length, 0)} 个关键帧 · 缓动: {easing}
      </div>
    </div>
  );
};
