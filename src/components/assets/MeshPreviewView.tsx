import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AssetEntry } from '@/types/asset';
import { getBuiltinMeshKind, type BuiltinMeshKind } from '@/utils/builtin-asset-content';
import { loadMeshGeometry } from '@/utils/mesh-loader';
import { useProjectStore } from '@/stores/project-store';

const CAMERA_FOV = 42;
const CAMERA_DIR = new THREE.Vector3(1.4, 1.0, 1.6).normalize();
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_WHEEL_FACTOR = 1.12;

function createMeshGeometry(kind: BuiltinMeshKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cone': return new THREE.ConeGeometry(0.45, 0.9, 24);
    case 'sphere': return new THREE.SphereGeometry(0.45, 24, 18);
    case 'cube': return new THREE.BoxGeometry(0.7, 0.7, 0.7);
    case 'cylinder': return new THREE.CylinderGeometry(0.35, 0.35, 0.8, 24);
    case 'plane': return new THREE.PlaneGeometry(1.1, 1.1);
    case 'torus': return new THREE.TorusGeometry(0.38, 0.14, 16, 32);
    case 'capsule': return new THREE.CapsuleGeometry(0.28, 0.5, 8, 16);
    case 'hemisphere': return new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    case 'octahedron': return new THREE.OctahedronGeometry(0.5, 0);
    case 'quad':
    default: return new THREE.PlaneGeometry(0.8, 0.8);
  }
}

function centerGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return geometry;
  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  return geometry;
}

function fitDistanceForGeometry(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return 2.2;
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fovRad = (CAMERA_FOV * Math.PI) / 180;
  return (maxDim / 2) / Math.tan(fovRad / 2) * 1.35;
}

interface MeshPreviewViewProps {
  asset: AssetEntry;
}

export const MeshPreviewView: React.FC<MeshPreviewViewProps> = ({ asset }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const projectDir = useProjectStore(s => s.projectDir);
  const [zoomPercent, setZoomPercent] = useState(100);
  const zoomRef = useRef(1);
  const baseDistanceRef = useRef(2.2);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const applyZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    zoomRef.current = clamped;
    setZoomPercent(Math.round(clamped * 100));
    const camera = cameraRef.current;
    if (!camera) return;
    const distance = baseDistanceRef.current / clamped;
    camera.position.copy(CAMERA_DIR.clone().multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
  }, []);

  const resetZoom = useCallback(() => {
    applyZoom(1);
  }, [applyZoom]);

  useEffect(() => {
    zoomRef.current = 1;
    setZoomPercent(100);
  }, [asset.id]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const width = host.clientWidth || 180;
    const height = host.clientHeight || 140;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12121a);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.01, 200);
    cameraRef.current = camera;
    applyZoom(zoomRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    let geometry: THREE.BufferGeometry = createMeshGeometry(getBuiltinMeshKind(asset));
    let mesh: THREE.Mesh | null = null;
    let edges: THREE.LineSegments | null = null;

    const fitCameraToGeometry = (geo: THREE.BufferGeometry) => {
      baseDistanceRef.current = fitDistanceForGeometry(geo);
      applyZoom(zoomRef.current);
    };

    const mountMesh = (geo: THREE.BufferGeometry) => {
      if (disposed) {
        geo.dispose();
        return;
      }
      geometry = centerGeometry(geo);
      fitCameraToGeometry(geometry);

      const material = new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        metalness: 0.15,
        roughness: 0.55,
        wireframe: false,
        side: THREE.DoubleSide
      });
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x9ecbff, transparent: true, opacity: 0.35 })
      );
      scene.add(edges);
    };

    if (asset.source === 'imported' && asset.type === 'mesh') {
      void loadMeshGeometry(asset, projectDir).then((loaded) => {
        if (loaded) mountMesh(loaded);
        else mountMesh(createMeshGeometry(getBuiltinMeshKind(asset)));
      });
    } else {
      mountMesh(geometry);
    }

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(2, 3, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const grid = new THREE.GridHelper(2, 10, 0x333344, 0x222230);
    grid.position.y = -0.55;
    scene.add(grid);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.01;
      if (mesh) {
        mesh.rotation.y = frame;
        mesh.rotation.x = 0.25 + Math.sin(frame * 0.6) * 0.08;
        edges?.rotation.copy(mesh.rotation);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth || 180;
      const h = host.clientHeight || 140;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(host);

    return () => {
      disposed = true;
      cameraRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      if (mesh) {
        (mesh.material as THREE.Material).dispose();
      }
      edges?.geometry.dispose();
      if (edges) (edges.material as THREE.Material).dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [asset.id, asset.name, asset.source, asset.type, asset.uri, projectDir, applyZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 1 / ZOOM_WHEEL_FACTOR : ZOOM_WHEEL_FACTOR;
    applyZoom(zoomRef.current * factor);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    applyZoom(zoomRef.current / ZOOM_WHEEL_FACTOR);
  }, [applyZoom]);

  const zoomIn = useCallback(() => {
    applyZoom(zoomRef.current * ZOOM_WHEEL_FACTOR);
  }, [applyZoom]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 140,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        background: '#12121a'
      }}
      title="滚轮或按钮缩放；模型自动居中"
      onWheel={handleWheel}
    >
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          right: 6,
          bottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 4px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          userSelect: 'none'
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn-sm"
          style={{ minWidth: 24, padding: '0 6px', lineHeight: '20px' }}
          onClick={zoomOut}
          title="缩小"
        >
          −
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'center' }}>
          {zoomPercent}%
        </span>
        <button
          type="button"
          className="btn-sm"
          style={{ minWidth: 24, padding: '0 6px', lineHeight: '20px' }}
          onClick={zoomIn}
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          className="btn-sm"
          style={{ padding: '0 6px', lineHeight: '20px', fontSize: 10 }}
          onClick={resetZoom}
          title="重置缩放"
        >
          重置
        </button>
      </div>
    </div>
  );
};
