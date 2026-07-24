import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parsePrefabToProject } from '../src/utils/prefab-importer';
import { collectEmitterPreviewSources } from '../src/utils/preview-sources';
import { sampleEmitMotion } from '../src/utils/particle-shape';
import { buildEmitterGizmo } from '../src/utils/emitter-gizmo';

const SMOK_PREFAB = join(
  'D:/Desktop/smok/resources/effect/Ext_bossAttackSmoke/Ext_attckSmoke.prefab'
);

function hasNaNInObject3D(obj: import('three').Object3D): boolean {
  let bad = false;
  obj.traverse((node) => {
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) || !Number.isFinite(node.position.z)) {
      bad = true;
    }
    const line = node as import('three').Line;
    if (line.geometry?.attributes?.position) {
      const arr = line.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) bad = true;
      }
    }
  });
  return bad;
}

describe('smok preview runtime', () => {
  beforeAll(() => {
    if (typeof document === 'undefined') {
      (globalThis as typeof globalThis & { document: Document }).document = {
        createElement: () => {
          const ctx = {
            font: '',
            measureText: () => ({ width: 80 }),
            fillText: () => undefined
          };
          return { getContext: () => ctx, width: 96, height: 24 } as unknown as HTMLCanvasElement;
        }
      } as unknown as Document;
    }
  });

  it('does not produce NaN gizmo geometry or throw on emit for smok prefab', () => {
    if (!existsSync(SMOK_PREFAB)) return;

    const parsed = parsePrefabToProject(readFileSync(SMOK_PREFAB, 'utf8'), 'Ext_attckSmoke');
    const sources = collectEmitterPreviewSources(parsed.project.root);
    expect(sources.length).toBeGreaterThan(0);

    for (const source of sources) {
      for (let i = 0; i < 20; i++) {
        const speed = 5;
        const motion = sampleEmitMotion(source.config, speed);
        expect(Number.isFinite(motion.position.x)).toBe(true);
        expect(Number.isFinite(motion.velocity.z)).toBe(true);
      }

      const gizmo = buildEmitterGizmo({
        id: source.id,
        name: source.name,
        config: source.config,
        transform: source.transform,
        enabled: source.enabled
      });
      expect(hasNaNInObject3D(gizmo)).toBe(false);
    }
  });
});
