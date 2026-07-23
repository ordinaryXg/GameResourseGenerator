import {
  createDefaultProject,
  createDefaultEmitter
} from '../../src/utils/project-factory';

export function createExplosionProject() {
  const project = createDefaultProject('ExplosionCombo');
  const group = project.root;
  group.name = 'Explosion';
  group.children = [];

  const explosion = createDefaultEmitter('Explosion');
  explosion.transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1.2, 1.2, 1.2] };
  explosion.assetRefs = {
    mainTexture: 'builtin-particle-star',
    material: 'builtin-mat-fire-additive'
  };

  const smoke = createDefaultEmitter('Smoke');
  smoke.transform = { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [2, 2, 2] };
  smoke.assetRefs = {
    mainTexture: 'builtin-particle-smoke',
    material: 'builtin-mat-smoke-alpha'
  };

  const glow = createDefaultEmitter('Glow');
  glow.transform = { position: [0, 0.5, 0], rotation: [0, 45, 0], scale: [1.5, 1.5, 1.5] };
  glow.assetRefs = {
    mainTexture: 'builtin-particle-glow',
    material: 'builtin-mat-glow-additive'
  };

  group.children.push(explosion, smoke, glow);
  return project;
}
