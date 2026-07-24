import type { EffectProject, EffectGroupNode, ParticleEmitterNode } from '@/types/project';
import {
  createDefaultProject,
  createDefaultEmitter,
  createDefaultTransform
} from '@/utils/project-factory';
import { generateUUID } from '@/utils/effect-defaults';
import { PRESET_TEMPLATES } from '@/data/template-data';
import type { Particle3DConfig } from '@/types/effect';

export interface PresetProjectDef {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  build: () => EffectProject;
}

function templateConfig(templateId: string): Particle3DConfig {
  const tpl = PRESET_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) throw new Error(`Unknown template: ${templateId}`);
  return JSON.parse(JSON.stringify(tpl.buildConfig()));
}

function makeEmitter(
  name: string,
  config: Particle3DConfig,
  assetRefs: ParticleEmitterNode['assetRefs'],
  transform?: Partial<ParticleEmitterNode['transform']>
): ParticleEmitterNode {
  const emitter = createDefaultEmitter(name);
  emitter.config = config;
  emitter.assetRefs = assetRefs;
  if (transform) {
    emitter.transform = {
      position: transform.position ?? emitter.transform.position,
      rotation: transform.rotation ?? emitter.transform.rotation,
      scale: transform.scale ?? emitter.transform.scale
    };
  }
  return emitter;
}

function makeRootGroup(name: string, children: ParticleEmitterNode[]): EffectGroupNode {
  return {
    type: 'group',
    id: generateUUID(),
    name,
    enabled: true,
    transform: createDefaultTransform(),
    children
  };
}

export function buildExplosionPresetProject(): EffectProject {
  const project = createDefaultProject('爆炸组合');
  project.metadata.description = '爆炸 + 烟雾 + 光晕三发射器战斗特效预设';

  const glow = makeEmitter(
    'Glow',
    templateConfig('t-magic'),
    { mainTexture: 'builtin-particle-glow', material: 'builtin-mat-glow-additive' },
    { position: [0, 0.5, 0], rotation: [0, 45, 0], scale: [1.5, 1.5, 1.5] }
  );
  glow.config.mainModule.duration = 2;
  glow.config.mainModule.rateOverTime = 40;
  glow.config.mainModule.capacity = 60;

  project.root.children = [
    makeRootGroup('Explosion', [
      makeEmitter(
        'Explosion',
        templateConfig('t-explosion'),
        { mainTexture: 'builtin-particle-star', material: 'builtin-mat-fire-additive' },
        { scale: [1.2, 1.2, 1.2] }
      ),
      makeEmitter(
        'Smoke',
        templateConfig('t-smoke'),
        { mainTexture: 'builtin-particle-smoke', material: 'builtin-mat-smoke-alpha' },
        { position: [0, 1.5, 0], scale: [2, 2, 2] }
      ),
      glow
    ])
  ];
  return project;
}

export function buildMagicPresetProject(): EffectProject {
  const project = createDefaultProject('魔法组合');
  project.metadata.description = '星光 + 光环 + 火花三发射器魔法特效预设';

  const ring = makeEmitter(
    'MagicRing',
    templateConfig('t-magic'),
    { mainTexture: 'builtin-particle-ring', material: 'builtin-mat-glow-additive' },
    { position: [0, 0.3, 0], scale: [2.5, 2.5, 2.5] }
  );
  ring.config.shapeModule.shapeType = 'circle';
  ring.config.shapeModule.radius = 2;
  ring.config.mainModule.rateOverTime = 8;

  const sparks = makeEmitter(
    'Sparks',
    templateConfig('t-fire'),
    { mainTexture: 'builtin-particle-spark', material: 'builtin-mat-spark-additive' },
    { position: [0, -0.2, 0] }
  );
  sparks.config.mainModule.duration = 4;
  sparks.config.shapeModule.shapeType = 'sphere';
  sparks.config.shapeModule.radius = 1.5;

  project.root.children = [
    makeRootGroup('Magic', [
      makeEmitter(
        'Sparkle',
        templateConfig('t-magic'),
        { mainTexture: 'builtin-particle-star', material: 'builtin-mat-magic-additive' }
      ),
      ring,
      sparks
    ])
  ];
  return project;
}

export function buildEnvironmentPresetProject(): EffectProject {
  const project = createDefaultProject('环境组合');
  project.metadata.description = '雪花 + 雨滴 + 氛围尘三发射器环境特效预设';

  const dust = makeEmitter(
    'AmbientDust',
    templateConfig('t-smoke'),
    { mainTexture: 'builtin-particle-flare', material: 'builtin-mat-dust-alpha' },
    { position: [0, 0.5, 0], scale: [3, 3, 3] }
  );
  dust.config.mainModule.rateOverTime = 5;
  dust.config.mainModule.startSpeed = { mode: 'randomBetween', min: 0.1, max: 0.5 };

  project.root.children = [
    makeRootGroup('Environment', [
      makeEmitter(
        'Snow',
        templateConfig('t-snow'),
        { mainTexture: 'builtin-particle-soft', material: 'builtin-mat-soft-additive' },
        { position: [0, 3, 0] }
      ),
      makeEmitter(
        'Rain',
        templateConfig('t-rain'),
        { mainTexture: 'builtin-particle-cross', material: 'builtin-mat-fade-alpha' },
        { position: [0, 4, 0] }
      ),
      dust
    ])
  ];
  return project;
}

export const PRESET_PROJECTS: PresetProjectDef[] = [
  {
    id: 'preset-explosion',
    name: '爆炸组合',
    description: '爆炸 + 烟雾 + 光晕，适合战斗命中特效',
    category: '战斗',
    tags: ['爆炸', '烟雾', '光晕'],
    build: buildExplosionPresetProject
  },
  {
    id: 'preset-magic',
    name: '魔法组合',
    description: '星光 + 魔法环 + 火花，适合技能释放',
    category: '魔法',
    tags: ['魔法', '星光', '技能'],
    build: buildMagicPresetProject
  },
  {
    id: 'preset-environment',
    name: '环境组合',
    description: '雪花 + 下雨 + 氛围尘，适合场景天气',
    category: '环境',
    tags: ['雪', '雨', '环境'],
    build: buildEnvironmentPresetProject
  }
];

export function getPresetProjectById(id: string): PresetProjectDef | undefined {
  return PRESET_PROJECTS.find(p => p.id === id);
}

export function buildPresetProject(id: string): EffectProject {
  const preset = getPresetProjectById(id);
  if (!preset) throw new Error(`未知预设项目: ${id}`);
  const project = preset.build();
  project.id = generateUUID();
  return project;
}
