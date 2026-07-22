import React, { useCallback } from 'react';
import type { GradientConfig, GradientKey } from '@/types/effect';

function rgbaToHex([r, g, b]: [number, number, number, number]): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b, alpha];
}

interface GradientEditorProps {
  value: GradientConfig;
  onChange: (v: GradientConfig) => void;
}

export const GradientEditor: React.FC<GradientEditorProps> = ({ value, onChange }) => {
  const keys = value.keys.length > 0 ? value.keys : [{ time: 0, color: [1, 1, 1, 1] as [number, number, number, number] }];

  const updateKey = useCallback((index: number, patch: Partial<GradientKey>) => {
    const next = keys.map((k, i) => i === index ? { ...k, ...patch } : k);
    onChange({ keys: next });
  }, [keys, onChange]);

  const addKey = useCallback(() => {
    onChange({ keys: [...keys, { time: 1, color: [1, 1, 1, 0] }] });
  }, [keys, onChange]);

  const removeKey = useCallback((index: number) => {
    if (keys.length <= 1) return;
    onChange({ keys: keys.filter((_, i) => i !== index) });
  }, [keys, onChange]);

  return (
    <div>
      {keys.map((key, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input
            type="color"
            value={rgbaToHex(key.color)}
            onChange={(e) => updateKey(i, { color: hexToRgba(e.target.value, key.color[3]) })}
            style={{ width: 32, height: 28, padding: 2, cursor: 'pointer' }}
            title="颜色"
          />
          <input
            type="number"
            value={key.time}
            min={0}
            max={1}
            step={0.01}
            onChange={(e) => updateKey(i, { time: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
            style={{ width: 52, padding: '4px 6px', fontSize: 12 }}
            title="时间点 (0-1)"
          />
          <input
            type="number"
            value={key.color[3]}
            min={0}
            max={1}
            step={0.01}
            onChange={(e) => {
              const a = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0));
              updateKey(i, { color: [key.color[0], key.color[1], key.color[2], a] });
            }}
            style={{ width: 52, padding: '4px 6px', fontSize: 12 }}
            title="透明度"
          />
          {keys.length > 1 && (
            <button onClick={() => removeKey(i)} style={{ fontSize: 11, padding: '2px 6px' }} title="删除">×</button>
          )}
        </div>
      ))}
      <button onClick={addKey} style={{ fontSize: 11, marginTop: 2 }}>+ 添加关键帧</button>
    </div>
  );
};
