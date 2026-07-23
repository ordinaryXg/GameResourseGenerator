import type { GradientConfig, GradientKey } from '@/types/effect';

function sortKeys(keys: GradientKey[]): GradientKey[] {
  return [...keys].sort((a, b) => a.time - b.time);
}

/** Sample RGBA from gradient at normalized time t (0-1), matching Cocos separate RGB + alpha key evaluation. */
export function sampleGradient(gradient: GradientConfig, t: number): [number, number, number, number] {
  const keys = sortKeys(gradient.keys.length > 0 ? gradient.keys : [{ time: 0, color: [1, 1, 1, 1] }]);
  const clamped = Math.min(1, Math.max(0, t));

  if (keys.length === 1) return [...keys[0].color];

  if (clamped <= keys[0].time) return [...keys[0].color];
  if (clamped >= keys[keys.length - 1].time) return [...keys[keys.length - 1].color];

  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (clamped >= a.time && clamped <= b.time) {
      const span = b.time - a.time;
      const u = span > 0 ? (clamped - a.time) / span : 0;
      return [
        a.color[0] + (b.color[0] - a.color[0]) * u,
        a.color[1] + (b.color[1] - a.color[1]) * u,
        a.color[2] + (b.color[2] - a.color[2]) * u,
        a.color[3] + (b.color[3] - a.color[3]) * u
      ];
    }
  }

  return [...keys[keys.length - 1].color];
}

/** Cocos composes start color with color-over-lifetime via component-wise multiply. */
export function multiplyRgba(
  a: [number, number, number, number],
  b: [number, number, number, number]
): [number, number, number, number] {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
}

/** Random sample along start-color gradient (Cocos gradient start color behavior). */
export function sampleStartColor(gradient: GradientConfig): [number, number, number, number] {
  return sampleGradient(gradient, Math.random());
}

export function composeParticleColor(
  startSample: [number, number, number, number],
  colorOverLifetime: GradientConfig | null,
  life: number,
  colorOLEnabled: boolean
): [number, number, number, number] {
  if (!colorOLEnabled || !colorOverLifetime) return startSample;
  return multiplyRgba(startSample, sampleGradient(colorOverLifetime, life));
}
