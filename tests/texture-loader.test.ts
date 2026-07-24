import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { configureParticleTexture } from '../src/utils/texture-loader';

describe('configureParticleTexture', () => {
  it('matches Cocos defaults: linear filter without mipmaps', () => {
    const tex = new THREE.Texture();
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;

    configureParticleTexture(tex);

    expect(tex.generateMipmaps).toBe(false);
    expect(tex.minFilter).toBe(THREE.LinearFilter);
    expect(tex.magFilter).toBe(THREE.LinearFilter);
    expect(tex.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(tex.wrapT).toBe(THREE.ClampToEdgeWrapping);
  });
});
