import React from 'react';
import type { Transform3D } from '@/types/project';

interface TransformSectionProps {
  transform: Transform3D;
  onChange: (patch: Partial<Transform3D>) => void;
}

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.1
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  const axes = ['X', 'Y', 'Z'] as const;
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        {axes.map((axis, i) => (
          <div key={axis}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{axis}</span>
            <input
              type="number"
              step={step}
              value={Number.isFinite(value[i]) ? value[i] : 0}
              onChange={(e) => {
                const next: [number, number, number] = [value[0], value[1], value[2]];
                next[i] = parseFloat(e.target.value) || 0;
                onChange(next);
              }}
              style={{ width: '100%', padding: '4px 6px', fontSize: 11 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const TransformSection: React.FC<TransformSectionProps> = ({ transform, onChange }) => (
  <div>
    <Vec3Input label="位置 (Position)" value={transform.position} onChange={(position) => onChange({ position })} />
    <Vec3Input label="旋转 (Rotation °)" value={transform.rotation} onChange={(rotation) => onChange({ rotation })} step={1} />
    <Vec3Input label="缩放 (Scale)" value={transform.scale} onChange={(scale) => onChange({ scale })} step={0.01} />
  </div>
);
