import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AssetEntry } from '@/types/asset';
import { getBuiltinMeshKind, type BuiltinMeshKind } from '@/utils/builtin-asset-content';

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

interface MeshPreviewViewProps {
  asset: AssetEntry;
}

export const MeshPreviewView: React.FC<MeshPreviewViewProps> = ({ asset }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const width = host.clientWidth || 180;
    const height = host.clientHeight || 140;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12121a);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 20);
    camera.position.set(1.4, 1.0, 1.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const kind = getBuiltinMeshKind(asset);
    const geometry = createMeshGeometry(kind);
    const material = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      metalness: 0.15,
      roughness: 0.55,
      wireframe: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x9ecbff, transparent: true, opacity: 0.35 })
    );
    scene.add(edges);

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
      mesh.rotation.y = frame;
      mesh.rotation.x = 0.25 + Math.sin(frame * 0.6) * 0.08;
      edges.rotation.copy(mesh.rotation);
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
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [asset.id, asset.name]);

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        height: 140,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        background: '#12121a'
      }}
      title="3D 网格预览（拖拽旋转示意）"
    />
  );
};
