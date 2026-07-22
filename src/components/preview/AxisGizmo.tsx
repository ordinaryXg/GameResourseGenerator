import React, { useEffect, useState } from 'react';
import type { BaseParticlePreview } from '@/utils/base-particle-preview';

const COLORS = { x: '#ff5f6d', y: '#5fd48a', z: '#5f9cff' };
const LABELS = { x: 'X', y: 'Y', z: 'Z' };

interface AxisGizmoProps {
  preview: BaseParticlePreview;
}

export const AxisGizmo: React.FC<AxisGizmoProps> = ({ preview }) => {
  const [, frame] = useState(0);

  useEffect(() => {
    let id = 0;
    const tick = () => { frame(f => f + 1); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [preview]);

  const axes = preview.getAxisScreenVectors();
  const cx = 36;
  const cy = 36;
  const sorted = [...axes].sort((a, b) => a.depth - b.depth);

  return (
    <div className="axis-gizmo" aria-hidden="true">
      <svg viewBox="0 0 72 72" width="68" height="68">
        <circle cx={cx} cy={cy} r="2.5" fill="#8b949e" opacity="0.8" />
        {sorted.map(({ id, dx, dy }) => {
          const x2 = cx + dx;
          const y2 = cy + dy;
          const color = COLORS[id];
          const lx = x2 + (dx > 0 ? 6 : dx < 0 ? -10 : 0);
          const ly = y2 + (dy > 0 ? 10 : dy < 0 ? -4 : 0);
          return (
            <g key={id}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={x2} cy={y2} r="2" fill={color} />
              <text x={lx} y={ly} fill={color} fontSize="10" fontWeight="700" fontFamily="Segoe UI, sans-serif">
                {LABELS[id]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
