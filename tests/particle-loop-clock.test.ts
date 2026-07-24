import { describe, it, expect } from 'vitest';
import { wrapEmissionClock } from '../src/utils/particle-loop';

describe('particle loop emission clock', () => {
  it('wraps elapsed without clearing particles (clock-only)', () => {
    const r = wrapEmissionClock(5.2, 5, true);
    expect(r.wrapped).toBe(true);
    expect(r.elapsed).toBeCloseTo(0.2);
  });

  it('does not wrap when loop is off', () => {
    const r = wrapEmissionClock(5.2, 5, false);
    expect(r.wrapped).toBe(false);
    expect(r.elapsed).toBe(5.2);
  });

  it('handles multi-duration jump via modulo', () => {
    const r = wrapEmissionClock(12.5, 5, true);
    expect(r.wrapped).toBe(true);
    expect(r.elapsed).toBeCloseTo(2.5);
  });
});
