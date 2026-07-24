import type { Particle3DConfig } from '@/types/effect';
import { getDefaultParticle3DConfig } from '@/utils/effect-defaults';
import { normalizeShapeModule } from '@/utils/particle-shape';
import { coerceRangeValue, normalizeTextureAnimation } from '@/utils/particle-size';

/** Merge legacy / partial emitter configs with defaults (saved .fxproj compatibility). */
export function normalizeParticle3DConfig(raw: Particle3DConfig): Particle3DConfig {
  const defaults = getDefaultParticle3DConfig();
  const config = raw ?? defaults;

  return {
    ...defaults,
    ...config,
    mainModule: {
      ...defaults.mainModule,
      ...config.mainModule,
      startLifetime: coerceRangeValue(
        config.mainModule?.startLifetime,
        defaults.mainModule.startLifetime.constant ?? 2
      ),
      startSpeed: coerceRangeValue(
        config.mainModule?.startSpeed,
        defaults.mainModule.startSpeed.constant ?? 5
      ),
      startSize3D: {
        x: coerceRangeValue(config.mainModule?.startSize3D?.x, defaults.mainModule.startSize3D.x.constant ?? 1),
        y: coerceRangeValue(config.mainModule?.startSize3D?.y, defaults.mainModule.startSize3D.y.constant ?? 1),
        z: coerceRangeValue(config.mainModule?.startSize3D?.z, defaults.mainModule.startSize3D.z.constant ?? 1)
      },
      startRotation3D: config.mainModule?.startRotation3D ?? defaults.mainModule.startRotation3D,
      startColor: config.mainModule?.startColor ?? defaults.mainModule.startColor,
      bursts: config.mainModule?.bursts ?? []
    },
    shapeModule: normalizeShapeModule(config.shapeModule),
    colorOverLifetime: {
      ...defaults.colorOverLifetime,
      ...config.colorOverLifetime,
      color: config.colorOverLifetime?.color ?? defaults.colorOverLifetime.color
    },
    sizeOverLifetime: {
      ...defaults.sizeOverLifetime,
      ...config.sizeOverLifetime,
      size: config.sizeOverLifetime?.size ?? defaults.sizeOverLifetime.size
    },
    rotationOverLifetime: {
      ...defaults.rotationOverLifetime,
      ...config.rotationOverLifetime,
      rotation: config.rotationOverLifetime?.rotation ?? defaults.rotationOverLifetime.rotation
    },
    velocityOverLifetime: {
      ...defaults.velocityOverLifetime,
      ...config.velocityOverLifetime,
      velocityX: config.velocityOverLifetime?.velocityX ?? defaults.velocityOverLifetime.velocityX,
      velocityY: config.velocityOverLifetime?.velocityY ?? defaults.velocityOverLifetime.velocityY,
      velocityZ: config.velocityOverLifetime?.velocityZ ?? defaults.velocityOverLifetime.velocityZ
    },
    noiseModule: { ...defaults.noiseModule, ...config.noiseModule },
    trailModule: {
      ...defaults.trailModule,
      ...config.trailModule,
      lifetime: coerceRangeValue(config.trailModule?.lifetime, defaults.trailModule.lifetime.constant ?? 0.5),
      colorOverTrail: config.trailModule?.colorOverTrail ?? defaults.trailModule.colorOverTrail
    },
    textureAnimation: normalizeTextureAnimation(config.textureAnimation),
    rendererModule: { ...defaults.rendererModule, ...config.rendererModule }
  };
}
