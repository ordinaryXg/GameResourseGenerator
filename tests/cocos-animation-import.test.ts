import { describe, it, expect } from 'vitest';
import {
  parseCocosAnimationClip,
  sampleAnimationPosition,
  sampleAnimationClipTime
} from '../src/utils/cocos-animation-import';

describe('cocos-animation-import', () => {
  it('parses position vector track from animation clip pool', () => {
    const json = JSON.stringify([
      {
        __type__: 'cc.AnimationClip',
        _duration: 2,
        speed: 1,
        wrapMode: 2
      },
      {
        __type__: 'cc.animation.VectorTrack',
        _binding: { path: { __id__: 2 } },
        _channels: [{ __id__: 3 }, { __id__: 4 }, { __id__: 5 }]
      },
      { _paths: ['position'] },
      { _curve: { __id__: 6 } },
      { _curve: { __id__: 7 } },
      { _curve: { __id__: 8 } },
      { __type__: 'cc.RealCurve', _times: [0, 1], _values: [{ value: 0 }, { value: 10 }] },
      { __type__: 'cc.RealCurve', _times: [0, 1], _values: [{ value: 1 }, { value: 2 }] },
      { __type__: 'cc.RealCurve', _times: [0, 1], _values: [{ value: -1 }, { value: 1 }] }
    ]);

    const clip = parseCocosAnimationClip(json, 'clip-uuid');
    expect(clip.clipUuid).toBe('clip-uuid');
    expect(clip.duration).toBe(2);
    expect(clip.loop).toBe(true);
    expect(sampleAnimationPosition(clip, 1)).toEqual([5, 1.5, 0]);
    expect(sampleAnimationClipTime(clip, 3)).toBeCloseTo(0.5, 4);
  });
});
