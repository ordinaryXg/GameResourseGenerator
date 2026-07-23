import * as THREE from 'three';
import type { AssetEntry } from '@/types/asset';
import { resolveAssetUrl } from '@/utils/asset-resolver';

const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>;

export function getCachedParticleTexture(assetId: string): THREE.Texture | null {
  return textureCache.get(assetId) ?? null;
}

export function loadParticleTexture(
  assetId: string,
  entry: AssetEntry,
  projectDir?: string | null
): Promise<THREE.Texture> {
  const cached = textureCache.get(assetId);
  if (cached) return Promise.resolve(cached);

  const pending = loadingPromises.get(assetId);
  if (pending) return pending;

  const url = resolveAssetUrl(entry, projectDir);
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        textureCache.set(assetId, tex);
        loadingPromises.delete(assetId);
        resolve(tex);
      },
      undefined,
      (err) => {
        loadingPromises.delete(assetId);
        reject(err);
      }
    );
  });
  loadingPromises.set(assetId, promise);
  return promise;
}

export function disposeTextureCache() {
  for (const tex of textureCache.values()) tex.dispose();
  textureCache.clear();
  loadingPromises.clear();
}

export function createFallbackParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
