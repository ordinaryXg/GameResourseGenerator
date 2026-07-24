import React from 'react';
import type { NodeAnimationClip } from '@/types/project';
import type { CurveConfig } from '@/types/effect';
import { CurveEditor } from '@/components/inspector/CurveEditor';
import { sampleAnimationPosition } from '@/utils/cocos-animation-import';

interface AnimationSectionProps {
  animation: NodeAnimationClip;
  onChange: (next: NodeAnimationClip) => void;
}

function countCurveKeys(curve: CurveConfig): number {
  return curve.keys?.length ?? 0;
}

export const AnimationSection: React.FC<AnimationSectionProps> = ({ animation, onChange }) => {
  const updatePositionAxis = (axis: 'x' | 'y' | 'z', curve: CurveConfig) => {
    onChange({
      ...animation,
      position: {
        ...animation.position,
        [axis]: curve
      }
    });
  };

  const atStart = sampleAnimationPosition(animation, 0);
  const atMid = sampleAnimationPosition(animation, animation.duration * 0.5);
  const atEnd = sampleAnimationPosition(animation, animation.duration);

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.45 }}>
        对应 Cocos <code style={{ fontSize: 10 }}>cc.Animation</code> + <code style={{ fontSize: 10 }}>AnimationClip</code>，
        驱动节点局部 position 偏移；预览已按此轨道采样。
      </div>

      {animation.clipUuid && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
            片段 UUID
          </label>
          <input
            type="text"
            value={animation.clipUuid}
            readOnly
            style={{ width: '100%', padding: '4px 8px', fontSize: 11, opacity: 0.85 }}
          />
        </div>
      )}

      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
          时长 (Duration, s)
        </label>
        <input
          type="number"
          value={animation.duration}
          min={0.01}
          max={120}
          step={0.01}
          onChange={(e) => onChange({ ...animation, duration: parseFloat(e.target.value) || 1 })}
          style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
          速度 (Speed)
        </label>
        <input
          type="number"
          value={animation.speed}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(e) => onChange({ ...animation, speed: parseFloat(e.target.value) || 1 })}
          style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
        />
      </div>

      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={animation.loop}
          onChange={(e) => onChange({ ...animation, loop: e.target.checked })}
        />
        循环 (Loop / WrapMode)
      </label>

      <div
        style={{
          marginBottom: 10,
          padding: '6px 8px',
          borderRadius: 4,
          background: 'var(--bg-secondary)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          lineHeight: 1.5
        }}
      >
        <div>位置轨道关键帧：X {countCurveKeys(animation.position.x)} · Y {countCurveKeys(animation.position.y)} · Z {countCurveKeys(animation.position.z)}</div>
        <div>t=0 → ({atStart.map(v => v.toFixed(2)).join(', ')})</div>
        <div>t={ (animation.duration * 0.5).toFixed(2) }s → ({atMid.map(v => v.toFixed(2)).join(', ')})</div>
        <div>t={animation.duration.toFixed(2)}s → ({atEnd.map(v => v.toFixed(2)).join(', ')})</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>位置偏移 (Position Track)</div>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <div key={axis} style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {axis.toUpperCase()} 轴
          </label>
          <CurveEditor
            value={animation.position[axis]}
            onChange={(curve) => updatePositionAxis(axis, curve)}
            min={-100}
            max={100}
          />
        </div>
      ))}
    </div>
  );
};
