import type { EffectConfig, ChatMessage } from '@/types/effect';
import type { EffectProject, ParticleEmitterNode } from '@/types/project';
import { FX_PROJECT_VERSION } from '@/types/project';
import { cloneProject, touchProjectMetadata } from './project-tree';

export function serializeProject(project: EffectProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(json: string): EffectProject {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('无效的项目文件：JSON 解析失败');
  }
  return normalizeProject(raw);
}

function normalizeProject(raw: unknown): EffectProject {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的项目文件：根对象缺失');
  }
  const r = raw as Record<string, unknown>;
  if (r.version !== FX_PROJECT_VERSION) {
    throw new Error(`不支持的项目版本：${String(r.version)}，需要 ${FX_PROJECT_VERSION}`);
  }
  if (!r.root || typeof r.root !== 'object') {
    throw new Error('无效的项目文件：缺少 root 节点');
  }
  const project = r as unknown as EffectProject;
  project.assetRegistry = Array.isArray(project.assetRegistry) ? project.assetRegistry : [];
  project.settings = project.settings ?? { targetEngine: 'cocos-creator-3.8' };
  project.metadata = project.metadata ?? {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return project;
}

export function getProjectFileName(project: EffectProject): string {
  const safe = project.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'untitled';
  return `${safe}.fxproj`;
}

export function getProjectDirFromFilePath(filePath: string): string {
  const sep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return sep >= 0 ? filePath.slice(0, sep) : filePath;
}

export function getAssetsDir(projectDir: string): string {
  return `${projectDir}/assets`;
}

/** Bridge: ParticleEmitterNode → legacy EffectConfig for v1 editor components. */
export function emitterToEffectConfig(
  emitter: ParticleEmitterNode,
  project: EffectProject
): EffectConfig {
  return {
    id: emitter.id,
    name: emitter.name,
    type: 'particle3d',
    version: project.version,
    targetEngineVersion: project.settings.targetEngine,
    source: 'manual',
    tags: [],
    metadata: {
      createdAt: project.metadata.createdAt,
      updatedAt: project.metadata.updatedAt,
      nodeLayout: emitter.nodeLayout
    },
    config: JSON.parse(JSON.stringify(emitter.config))
  };
}

export function applyEffectConfigToEmitter(
  emitter: ParticleEmitterNode,
  effect: EffectConfig
): ParticleEmitterNode {
  return {
    ...emitter,
    name: effect.name,
    config: JSON.parse(JSON.stringify(effect.config)),
    nodeLayout: effect.metadata.nodeLayout
  };
}

export function prepareProjectForSave(project: EffectProject): EffectProject {
  return touchProjectMetadata(cloneProject(project));
}

export type { ChatMessage };
