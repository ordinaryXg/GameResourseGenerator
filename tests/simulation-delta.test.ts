import { describe, it, expect } from 'vitest';
import { measureFrameDelta, scaleSimulationDelta } from '../src/utils/simulation-delta';

describe('simulation-delta', () => {
  it('uses real elapsed time between frames', () => {
    expect(measureFrameDelta(1000, 0)).toBeCloseTo(1 / 60, 4);
    expect(measureFrameDelta(1016.67, 1000)).toBeCloseTo(0.01667, 3);
  });

  it('caps large frame gaps', () => {
    expect(measureFrameDelta(5000, 1000)).toBe(0.1);
  });

  it('applies simulationSpeed multiplier', () => {
    expect(scaleSimulationDelta(0.016, 2)).toBeCloseTo(0.032);
    expect(scaleSimulationDelta(0.016, 0.5)).toBeCloseTo(0.008);
  });
});
