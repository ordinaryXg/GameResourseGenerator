import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { buildEmitterGizmo, syncEmitterGizmoGroup } from '../src/utils/emitter-gizmo';
import { getDefaultParticle3DConfig } from '../src/utils/effect-defaults';
import { identityTransform } from '../src/utils/transform-utils';

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

function makeSource(shapeType: 'box' | 'sphere' | 'cone' | 'circle' | 'hemisphere') {
  const config = getDefaultParticle3DConfig();
  config.shapeModule.enabled = true;
  config.shapeModule.shapeType = shapeType;
  config.shapeModule.radius = 1;
  config.shapeModule.angle = 30;
  return {
    id: `emitter-${shapeType}`,
    name: `Test ${shapeType}`,
    config,
    transform: identityTransform(),
    enabled: true
  };
}

describe('emitter-gizmo', () => {
  it('builds gizmo with pivot, label, and shape outline', () => {
    const gizmo = buildEmitterGizmo(makeSource('sphere'));
    expect(gizmo.name).toBe('gizmo-emitter-sphere');
    expect(gizmo.children.length).toBeGreaterThanOrEqual(3);
  });

  it('highlights selected emitter with more pivot axes size', () => {
    const source = makeSource('box');
    const normal = buildEmitterGizmo(source);
    const selected = buildEmitterGizmo(source, { selectedId: source.id });
    expect(selected.children.length).toBeGreaterThanOrEqual(normal.children.length);
  });

  it('syncs gizmo group to match emitter count', () => {
    const root = new THREE.Group();
    syncEmitterGizmoGroup(root, [
      makeSource('cone'),
      makeSource('circle')
    ]);
    expect(root.children).toHaveLength(2);
    expect(root.children[0].name).toBe('gizmo-emitter-cone');
    expect(root.children[1].name).toBe('gizmo-emitter-circle');
  });

  it('includes name in preview sources', async () => {
    const { createDefaultProject, createDefaultEmitter } = await import('../src/utils/project-factory');
    const { collectEmitterPreviewSources } = await import('../src/utils/preview-sources');
    const project = createDefaultProject('Named');
    const smoke = createDefaultEmitter('Smoke Trail');
    project.root.children.push(smoke);
    const sources = collectEmitterPreviewSources(project.root);
    expect(sources.some(s => s.name === 'Smoke Trail')).toBe(true);
  });
});
