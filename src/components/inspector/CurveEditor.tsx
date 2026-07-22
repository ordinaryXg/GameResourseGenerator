import React, { useCallback } from 'react';
import type { CurveConfig } from '@/types/effect';

interface CurveEditorProps {
  value: CurveConfig;
  onChange: (v: CurveConfig) => void;
  min?: number;
  max?: number;
}

export const CurveEditor: React.FC<CurveEditorProps> = ({ value, onChange, min = 0, max = 10 }) => {
  const keys = value.keys.length > 0 ? value.keys : [{ time: 0, value: 1 }, { time: 1, value: 0 }];

  const updateKey = useCallback((index: number, field: 'time' | 'value', raw: string) => {
    const num = parseFloat(raw) || 0;
    const next = keys.map((k, i) => {
      if (i !== index) return k;
      if (field === 'time') return { ...k, time: Math.min(1, Math.max(0, num)) };
      return { ...k, value: Math.min(max, Math.max(min, num)) };
    });
    onChange({ ...value, keys: next });
  }, [keys, max, min, onChange, value]);

  const addKey = useCallback(() => {
    onChange({ ...value, keys: [...keys, { time: 1, value: 0 }] });
  }, [keys, onChange, value]);

  const removeKey = useCallback((index: number) => {
    if (keys.length <= 1) return;
    onChange({ ...value, keys: keys.filter((_, i) => i !== index) });
  }, [keys, onChange, value]);

  return (
    <div>
      {keys.map((key, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', width: 14 }}>t</label>
          <input
            type="number"
            value={key.time}
            min={0}
            max={1}
            step={0.01}
            onChange={(e) => updateKey(i, 'time', e.target.value)}
            style={{ width: 52, padding: '4px 6px', fontSize: 12 }}
          />
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', width: 14 }}>v</label>
          <input
            type="number"
            value={key.value}
            min={min}
            max={max}
            step={0.01}
            onChange={(e) => updateKey(i, 'value', e.target.value)}
            style={{ width: 52, padding: '4px 6px', fontSize: 12 }}
          />
          {keys.length > 1 && (
            <button onClick={() => removeKey(i)} style={{ fontSize: 11, padding: '2px 6px' }}>×</button>
          )}
        </div>
      ))}
      <button onClick={addKey} style={{ fontSize: 11, marginTop: 2 }}>+ 添加关键帧</button>
    </div>
  );
};
