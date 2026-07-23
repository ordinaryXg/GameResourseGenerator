import type { Particle3DConfig } from './effect';
import type { AssetEntry, EmitterAssetRefs } from './asset';

export const FX_PROJECT_VERSION = '2.0.0' as const;

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface EffectNodeBase {
  id: string;
  name: string;
  enabled: boolean;
  transform: Transform3D;
}

export interface EffectGroupNode extends EffectNodeBase {
  type: 'group';
  children: EffectNode[];
}

export interface ParticleEmitterNode extends EffectNodeBase {
  type: 'emitter';
  config: Particle3DConfig;
  assetRefs: EmitterAssetRefs;
  nodeLayout?: Record<string, { x: number; y: number }>;
}

export type EffectNode = EffectGroupNode | ParticleEmitterNode;

export interface ProjectSettings {
  targetEngine: string;
  exportPath?: string;
}

export interface ProjectMetadata {
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface EffectProject {
  version: typeof FX_PROJECT_VERSION;
  id: string;
  name: string;
  settings: ProjectSettings;
  assetRegistry: AssetEntry[];
  root: EffectGroupNode;
  metadata: ProjectMetadata;
}

export function isGroupNode(node: EffectNode): node is EffectGroupNode {
  return node.type === 'group';
}

export function isEmitterNode(node: EffectNode): node is ParticleEmitterNode {
  return node.type === 'emitter';
}
