// ============================================================
// Cocos AI 特效生成器 — 核心类型定义
// 统一中间表示 (IR): EffectConfig
// ============================================================

export type EffectType = 'particle3d' | 'particle2d' | 'shader' | 'animation';

export type ShapeType = 'box' | 'sphere' | 'hemisphere' | 'cone' | 'circle';
export type EmitFrom = 'volume' | 'shell' | 'edge';
export type RenderMode = 'billboard' | 'stretchedBillboard' | 'horizontalBillboard' | 'verticalBillboard' | 'mesh';
export type AlignmentSpace = 'view' | 'world' | 'local';


export interface RangeValue {
  mode: 'constant' | 'randomBetween';
  constant?: number;
  min?: number;
  max?: number;
}

export interface Vector3Range {
  x: RangeValue;
  y: RangeValue;
  z: RangeValue;
}

export interface GradientKey {
  time: number; // 0-1
  color: [number, number, number, number]; // RGBA
}

export interface GradientConfig {
  keys: GradientKey[];
}

export interface CurveKey {
  time: number; // 0-1
  value: number;
  inTangent?: number;
  outTangent?: number;
}

export interface CurveConfig {
  keys: CurveKey[];
  multiplier?: number;
}

export interface BurstConfig {
  time: number;
  count: number;
  cycles?: number;
  interval?: number;
}

export interface EffectMetadata {
  author?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodeLayout?: Record<string, { x: number; y: number }>;
}

// ============================================================
// 3D 粒子配置
// ============================================================

export interface MainModuleConfig {
  duration: number;
  capacity: number;
  loop: boolean;
  playOnAwake: boolean;
  simulationSpeed: number;
  startDelay: number;
  startLifetime: RangeValue;
  startSpeed: RangeValue;
  startSize3D: Vector3Range;
  startRotation3D: Vector3Range;
  startColor: GradientConfig;
  gravityModifier: number;
  rateOverTime: number;
  rateOverDistance: number;
  bursts: BurstConfig[];
}

export interface ShapeModuleConfig {
  enabled: boolean;
  shapeType: ShapeType;
  radius: number;
  angle: number;
  arc: number;
  emitFrom: EmitFrom;
}

export interface ColorOverLifetimeConfig {
  enabled: boolean;
  color: GradientConfig;
}

export interface SizeOverLifetimeConfig {
  enabled: boolean;
  size: CurveConfig;
}

export interface RotationOverLifetimeConfig {
  enabled: boolean;
  rotation: CurveConfig;
}

export interface VelocityOverLifetimeConfig {
  enabled: boolean;
  velocityX: CurveConfig;
  velocityY: CurveConfig;
  velocityZ: CurveConfig;
}

export interface NoiseModuleConfig {
  enabled: boolean;
  strength: number;
  frequency: number;
  scrollSpeed: number;
  octaves: number;
}

export interface TrailModuleConfig {
  enabled: boolean;
  mode: number;
  ratio: number;
  lifetime: RangeValue;
  colorOverTrail: GradientConfig;
}

export interface TextureAnimationConfig {
  enabled: boolean;
  numTilesX: number;
  numTilesY: number;
  animation: number;
  frameOverTime: CurveConfig;
}

export interface RendererConfig {
  renderMode: RenderMode;
  /** Stretched Billboard: stretch by speed */
  velocityScale: number;
  /** Stretched Billboard: stretch by particle size */
  lengthScale: number;
  /** Billboard alignment space */
  alignSpace: AlignmentSpace;
}

export interface Particle3DConfig {
  mainModule: MainModuleConfig;
  shapeModule: ShapeModuleConfig;
  colorOverLifetime: ColorOverLifetimeConfig;
  sizeOverLifetime: SizeOverLifetimeConfig;
  rotationOverLifetime: RotationOverLifetimeConfig;
  velocityOverLifetime: VelocityOverLifetimeConfig;
  noiseModule: NoiseModuleConfig;
  trailModule: TrailModuleConfig;
  textureAnimation: TextureAnimationConfig;
  rendererModule: RendererConfig;
}

// ============================================================
// 统一中间表示
// ============================================================

export interface EffectConfig {
  id: string;
  name: string;
  type: EffectType;
  version: string;
  targetEngineVersion: string;
  source: 'ai-generated' | 'template' | 'manual' | 'imported';
  tags: string[];
  metadata: EffectMetadata;
  config: Particle3DConfig | Particle2DConfig;
}

// ============================================================
// 2D 粒子配置
// ============================================================

export interface Particle2DConfig {
  mainModule: {
    duration: number;
    capacity: number;
    loop: boolean;
    playOnAwake: boolean;
    startLifetime: RangeValue;
    startSpeed: RangeValue;
    startSize: RangeValue;
    startColor: GradientConfig;
    gravityModifier: number;
    rateOverTime: number;
  };
  shapeModule: {
    enabled: boolean;
    shapeType: 'box' | 'circle';
    radius: number;
  };
  colorOverLifetime: { enabled: boolean; color: GradientConfig };
  sizeOverLifetime: { enabled: boolean; size: CurveConfig };
  rendererModule: {
    spriteFrame?: string;
    blendMode: 'additive' | 'alpha';
  };
}

// ============================================================
// 对话类型
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// AI 设置类型
// ============================================================

export type AIProvider = 'openai' | 'anthropic';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet-20241022';

export interface AISettings {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================
// 模板类型
// ============================================================

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  effectConfig: EffectConfig;
  isBuiltin: boolean;
  icon?: string;
}

// ============================================================
// 导出类型
// ============================================================

export interface ExportResult {
  path: string;
  success: boolean;
  error?: string;
}
