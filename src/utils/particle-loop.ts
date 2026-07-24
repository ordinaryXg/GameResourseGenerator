/** Cocos-like loop: wrap emission clock only; living particles are not cleared. */
export function wrapEmissionClock(elapsed: number, duration: number, loop: boolean): {
  elapsed: number;
  wrapped: boolean;
} {
  if (!loop || duration <= 0 || elapsed < duration) {
    return { elapsed, wrapped: false };
  }
  return { elapsed: elapsed % duration, wrapped: true };
}
