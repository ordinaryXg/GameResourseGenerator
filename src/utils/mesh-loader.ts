import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AssetEntry } from '@/types/asset';
import { resolveAssetUrl } from '@/utils/asset-resolver';

const geometryCache = new Map<string, THREE.BufferGeometry>();
const loadingPromises = new Map<string, Promise<THREE.BufferGeometry | null>>();

function extractMergedGeometry(object: THREE.Object3D): THREE.BufferGeometry | null {
  object.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    parts.push(geo);
  });

  if (parts.length === 0) return null;
  if (parts.length === 1) return normalizeParticleMeshGeometry(parts[0]!);

  const merged = mergeGeometries(parts, true);
  for (const part of parts) part.dispose();
  return merged ? normalizeParticleMeshGeometry(merged) : null;
}

/** Cocos fbx→gltf-mesh uses a different basis than Three FBXLoader; +90° X aligns before startRotation3D. */
export function applyCocosParticleMeshBasis(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Match Cocos imported mesh: basis fix, center, scale max axis to 1. */
export function normalizeParticleMeshGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  applyCocosParticleMeshBasis(geometry);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return geometry;

  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);

  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox!.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  geometry.scale(1 / maxDim, 1 / maxDim, 1 / maxDim);
  return geometry;
}

export async function loadMeshGeometry(
  asset: AssetEntry,
  projectDir?: string | null
): Promise<THREE.BufferGeometry | null> {
  const cacheKey = asset.id;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached.clone();

  const pending = loadingPromises.get(cacheKey);
  if (pending) {
    const geometry = await pending;
    return geometry?.clone() ?? null;
  }

  const promise = (async () => {
    try {
      const url = resolveAssetUrl(asset, projectDir ?? null);
      const loader = new FBXLoader();
      const root = await loader.loadAsync(url);
      const geometry = extractMergedGeometry(root);
      if (geometry) geometryCache.set(cacheKey, geometry);
      return geometry;
    } catch {
      return null;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, promise);
  return promise;
}

export function preloadMeshGeometry(
  asset: AssetEntry,
  projectDir?: string | null
): void {
  void loadMeshGeometry(asset, projectDir);
}

export function getCachedMeshGeometry(assetId: string): THREE.BufferGeometry | null {
  const cached = geometryCache.get(assetId);
  return cached ? cached.clone() : null;
}

export function disposeMeshGeometryCache(): void {
  for (const geometry of geometryCache.values()) {
    geometry.dispose();
  }
  geometryCache.clear();
  loadingPromises.clear();
}
