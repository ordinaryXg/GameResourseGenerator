import { describe, it, expect } from 'vitest';
import { sampleGradient, multiplyRgba, composeParticleColor } from '../src/utils/gradient-utils';

describe('gradient-utils', () => {
  const fireGradient = {
    keys: [
      { time: 0, color: [1, 1, 0.5, 1] as [number, number, number, number] },
      { time: 1, color: [0.1, 0.02, 0, 0] as [number, number, number, number] }
    ]
  };

  it('samples gradient at key times', () => {
    expect(sampleGradient(fireGradient, 0)).toEqual([1, 1, 0.5, 1]);
    expect(sampleGradient(fireGradient, 1)[3]).toBeCloseTo(0);
  });

  it('multiplies start color with color-over-lifetime like Cocos', () => {
    const start: [number, number, number, number] = [1, 1, 0.5, 1];
    const atHalf = composeParticleColor(start, fireGradient, 0.5, true);
    const olOnly = sampleGradient(fireGradient, 0.5);
    expect(atHalf[0]).toBeCloseTo(start[0] * olOnly[0]);
    expect(atHalf[1]).toBeCloseTo(start[1] * olOnly[1]);
    expect(atHalf[2]).toBeCloseTo(start[2] * olOnly[2]);
  });

  it('skips color-over-lifetime when disabled', () => {
    const start: [number, number, number, number] = [1, 0.5, 0.1, 1];
    expect(composeParticleColor(start, fireGradient, 0.5, false)).toEqual(start);
  });

  it('multiplies rgba component-wise', () => {
    expect(multiplyRgba([1, 1, 0.5, 1], [1, 1, 0.5, 0.5])).toEqual([1, 1, 0.25, 0.5]);
  });
});
