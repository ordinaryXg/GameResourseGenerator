export const MAX_SIMULATION_DELTA = 0.1;

/** Seconds since last frame, capped to avoid huge jumps after tab switch. */
export function measureFrameDelta(nowMs: number, lastTimeMs: number): number {
  if (lastTimeMs <= 0) return 1 / 60;
  return Math.min(Math.max(nowMs - lastTimeMs, 0) / 1000, MAX_SIMULATION_DELTA);
}

export function scaleSimulationDelta(dt: number, simulationSpeed = 1): number {
  const speed = Number.isFinite(simulationSpeed) ? simulationSpeed : 1;
  return dt * speed;
}
