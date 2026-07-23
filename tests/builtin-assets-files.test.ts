import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BUILTIN_TEXTURE_DEFS } from '../src/data/builtin-assets';

const BUILTIN_ROOT = path.join(process.cwd(), 'public', 'assets', 'builtin');

describe('builtin asset files', () => {
  it('has 10 texture PNG files on disk', () => {
    for (const def of BUILTIN_TEXTURE_DEFS) {
      const file = path.join(BUILTIN_ROOT, 'textures', `${def.name}.png`);
      expect(fs.existsSync(file), file).toBe(true);
    }
  });

  it('has material and mesh directories with expected files', () => {
    expect(fs.existsSync(path.join(BUILTIN_ROOT, 'materials', 'particle-additive.mtl'))).toBe(true);
    expect(fs.existsSync(path.join(BUILTIN_ROOT, 'meshes', 'quad.mesh'))).toBe(true);
    expect(fs.existsSync(path.join(BUILTIN_ROOT, 'meshes', 'cone.mesh'))).toBe(true);
  });
});
