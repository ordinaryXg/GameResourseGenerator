import { describe, it, expect } from 'vitest';
import { parseGradientFromPrefab } from '../src/utils/cocos-serializers';

describe('cocos gradient import', () => {
  it('resolves cc.Gradient color/alpha keys stored as pool references', () => {
    const pool: unknown[] = [
      {},
      {
        __type__: 'cc.GradientRange',
        _mode: 1,
        gradient: { __id__: 2 }
      },
      {
        __type__: 'cc.Gradient',
        colorKeys: [{ __id__: 3 }],
        alphaKeys: [{ __id__: 4 }, { __id__: 5 }],
        mode: 0
      },
      {
        __type__: 'cc.ColorKey',
        color: { __type__: 'cc.Color', r: 255, g: 240, b: 220, a: 1 },
        time: 0.01
      },
      { __type__: 'cc.AlphaKey', alpha: 160, time: 0.53 },
      { __type__: 'cc.AlphaKey', alpha: 0, time: 0.99 }
    ];

    const gradient = parseGradientFromPrefab(pool, { __id__: 1 });
    expect(gradient.keys).toHaveLength(1);
    expect(gradient.keys[0]?.color[0]).toBeCloseTo(1, 2);
    expect(gradient.keys[0]?.color[1]).toBeCloseTo(240 / 255, 2);
    expect(gradient.keys[0]?.color[3]).toBeCloseTo(160 / 255, 2);
  });

  it('builds alpha-only gradients when colorKeys are empty', () => {
    const pool: unknown[] = [
      {},
      {
        __type__: 'cc.Gradient',
        colorKeys: [],
        alphaKeys: [
          { __type__: 'cc.AlphaKey', alpha: 0, time: 0 },
          { __type__: 'cc.AlphaKey', alpha: 199, time: 0.65 },
          { __type__: 'cc.AlphaKey', alpha: 0, time: 1 }
        ],
        mode: 0
      }
    ];

    const gradient = parseGradientFromPrefab(pool, { __id__: 1 });
    expect(gradient.keys).toHaveLength(3);
    expect(gradient.keys[1]?.color[3]).toBeCloseTo(199 / 255, 2);
  });
});
