import { describe, it, expect } from 'vitest';
import { collectAnimatedEmitterSources } from '../src/utils/preview-transform-tree';
import type { EffectGroupNode } from '../src/types/project';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';

describe('preview-transform-tree', () => {
  it('applies animated parent offset to emitter world transform', () => {
    const root: EffectGroupNode = {
      id: 'root',
      name: 'Root',
      type: 'group',
      enabled: true,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      children: [
        {
          id: 'mover',
          name: 'Mover',
          type: 'group',
          enabled: true,
          transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          animation: {
            clipUuid: 'anim',
            duration: 1,
            speed: 1,
            loop: false,
            position: {
              x: { keys: [{ time: 0, value: 0 }, { time: 1, value: 1 }], multiplier: 1 },
              y: { keys: [{ time: 0, value: 0 }], multiplier: 1 },
              z: { keys: [{ time: 0, value: 0 }], multiplier: 1 }
            }
          },
          children: [
            {
              id: 'emitter',
              name: 'Emitter',
              type: 'emitter',
              enabled: true,
              transform: { position: [0, 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
              config: getDefaultParticle3DConfig(),
              assetRefs: {}
            }
          ]
        }
      ]
    };

    const atStart = collectAnimatedEmitterSources(root, { previewTime: 0 });
    expect(atStart[0].transform.position).toEqual([1, 2, 0]);

    const atHalf = collectAnimatedEmitterSources(root, { previewTime: 0.5 });
    expect(atHalf[0].transform.position[0]).toBeCloseTo(1.5, 4);
    expect(atHalf[0].transform.position[1]).toBeCloseTo(2, 4);
  });
});
