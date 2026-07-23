import type { CurveConfig } from '@/types/effect';

/** Sample an animation curve at normalized time t (0-1). */
export function sampleCurveConfig(curve: CurveConfig, t: number): number {
  const keys = curve.keys?.length
    ? [...curve.keys].sort((a, b) => a.time - b.time)
    : [{ time: 0, value: 0 }, { time: 1, value: 1 }];
  const clamped = Math.min(1, Math.max(0, t));

  if (keys.length === 1) return (keys[0].value ?? 0) * (curve.multiplier ?? 1);

  if (clamped <= keys[0].time) return (keys[0].value ?? 0) * (curve.multiplier ?? 1);
  if (clamped >= keys[keys.length - 1].time) {
    return (keys[keys.length - 1].value ?? 0) * (curve.multiplier ?? 1);
  }

  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (clamped >= a.time && clamped <= b.time) {
      const span = b.time - a.time;
      const u = span > 0 ? (clamped - a.time) / span : 0;
      const value = (a.value ?? 0) + ((b.value ?? 0) - (a.value ?? 0)) * u;
      return value * (curve.multiplier ?? 1);
    }
  }

  return (keys[keys.length - 1].value ?? 0) * (curve.multiplier ?? 1);
}
