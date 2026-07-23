import { generateUUID } from './effect-defaults';

/** Cocos image sub-meta id for sprite-frame / texture redirect (standard pattern). */
export const TEXTURE_SUB_META_ID = '6c48a';

export interface DefaultTextureExport {
  textureUuid: string;
  spriteFrameUuid: string;
  pngBase64: string;
  metaContent: string;
  fileName: string;
}

/** Generate a soft radial circle PNG (base64) for particle rendering in Cocos. */
export function generateDefaultParticlePngBase64(size = 64): string {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas.toDataURL('image/png').split(',')[1];
  }
  // Node/test fallback: minimal valid 1x1 white PNG
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

export function buildDefaultTextureExport(name = 'particle-circle'): DefaultTextureExport {
  const textureUuid = generateUUID();
  const spriteFrameUuid = `${textureUuid}@${TEXTURE_SUB_META_ID}`;
  const fileName = `${name}.png`;

  const metaContent = JSON.stringify({
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid: textureUuid,
    files: ['.json', '.png'],
    subMetas: {
      [TEXTURE_SUB_META_ID]: {
        importer: 'texture',
        uuid: spriteFrameUuid,
        displayName: name,
        id: TEXTURE_SUB_META_ID,
        name: 'texture',
        userData: {
          wrapModeS: 'clamp-to-edge',
          wrapModeT: 'clamp-to-edge',
          minfilter: 'linear',
          magfilter: 'linear',
          mipfilter: 'none',
          anisotropy: 0,
          isUuid: true,
          imageUuidOrDatabaseUri: textureUuid,
          visible: false
        },
        ver: '1.0.22',
        imported: true,
        files: ['.json'],
        subMetas: {}
      }
    },
    userData: {
      hasAlpha: true,
      type: 'texture',
      redirect: spriteFrameUuid,
      fixAlphaTransparencyArtifacts: false
    }
  }, null, 2);

  return {
    textureUuid,
    spriteFrameUuid,
    pngBase64: generateDefaultParticlePngBase64(),
    metaContent,
    fileName
  };
}
