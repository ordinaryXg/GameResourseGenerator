import type { CurveConfig } from '@/types/effect';
import type { NodeAnimationClip } from '@/types/project';
import { sampleCurveConfig } from '@/utils/curve-utils';

function parseRealCurve(raw: unknown): CurveConfig {
  if (!raw || typeof raw !== 'object') {
    return { keys: [{ time: 0, value: 0 }], multiplier: 1 };
  }
  const curve = raw as Record<string, unknown>;
  const times = Array.isArray(curve._times) ? (curve._times as number[]) : [];
  const values = Array.isArray(curve._values) ? (curve._values as Array<{ value?: number }>) : [];
  if (times.length === 0) {
    return { keys: [{ time: 0, value: 0 }], multiplier: 1 };
  }
  return {
    keys: times.map((time, index) => ({
      time,
      value: values[index]?.value ?? 0
    })),
    multiplier: 1
  };
}

function emptyCurve(): CurveConfig {
  return { keys: [{ time: 0, value: 0 }], multiplier: 1 };
}

/** Parse Cocos `.anim` / embedded AnimationClip JSON into preview-friendly clip data. */
export function parseCocosAnimationClip(jsonString: string, clipUuid?: string): NodeAnimationClip {
  const pool = JSON.parse(jsonString) as unknown[];
  const clip = pool.find(
    (item) => (item as Record<string, unknown>)?.__type__ === 'cc.AnimationClip'
  ) as Record<string, unknown> | undefined;

  const duration = Number(clip?._duration ?? 1) || 1;
  const speed = Number(clip?.speed ?? 1) || 1;
  const wrapMode = Number(clip?.wrapMode ?? 1);
  const loop = wrapMode === 2 || wrapMode === 1;

  let position = { x: emptyCurve(), y: emptyCurve(), z: emptyCurve() };

  for (const item of pool) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (obj.__type__ !== 'cc.animation.VectorTrack') continue;

    const binding = obj._binding as { path?: { __id__?: number } } | undefined;
    const pathId = binding?.path?.__id__;
    if (pathId == null) continue;
    const pathObj = pool[pathId] as Record<string, unknown> | undefined;
    const paths = pathObj?._paths as string[] | undefined;
    if (!paths?.includes('position')) continue;

    const channels = obj._channels as Array<{ __id__?: number }> | undefined;
    if (!channels || channels.length < 3) continue;

    const resolveChannel = (index: number) => {
      const channelId = channels[index]?.__id__;
      if (channelId == null) return emptyCurve();
      const channel = pool[channelId] as { _curve?: { __id__?: number } } | undefined;
      const curveId = channel?._curve?.__id__;
      if (curveId == null) return emptyCurve();
      return parseRealCurve(pool[curveId]);
    };

    position = {
      x: resolveChannel(0),
      y: resolveChannel(1),
      z: resolveChannel(2)
    };
    break;
  }

  return {
    clipUuid,
    duration,
    speed,
    loop,
    position
  };
}

export function sampleAnimationClipTime(clip: NodeAnimationClip, elapsedSeconds: number): number {
  const scaled = elapsedSeconds * clip.speed;
  if (clip.duration <= 0) return 0;
  if (clip.loop) return (scaled % clip.duration) / clip.duration;
  return Math.min(1, Math.max(0, scaled / clip.duration));
}

export function sampleAnimationPosition(
  clip: NodeAnimationClip,
  elapsedSeconds: number
): [number, number, number] {
  const t = sampleAnimationClipTime(clip, elapsedSeconds);
  return [
    sampleCurveConfig(clip.position.x, t),
    sampleCurveConfig(clip.position.y, t),
    sampleCurveConfig(clip.position.z, t)
  ];
}
