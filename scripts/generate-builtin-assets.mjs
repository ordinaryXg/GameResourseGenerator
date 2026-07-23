/**
 * Generate public/assets/builtin/* from builtin-assets definitions.
 * Run: npm run generate:builtin
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_BUILTIN = path.join(ROOT, 'public', 'assets', 'builtin');

const TEXTURES = [
  { name: 'particle-circle', shape: 'circle' },
  { name: 'particle-soft', shape: 'soft' },
  { name: 'particle-star', shape: 'star' },
  { name: 'particle-spark', shape: 'spark' },
  { name: 'particle-smoke', shape: 'smoke' },
  { name: 'particle-glow', shape: 'glow' },
  { name: 'particle-ring', shape: 'ring' },
  { name: 'particle-square', shape: 'square' },
  { name: 'particle-cross', shape: 'cross' },
  { name: 'particle-flare', shape: 'flare' }
];

const MATERIALS = [
  { name: 'particle-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-alpha-blend', blend: 'alpha', techIdx: 0 },
  { name: 'particle-fire-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-magic-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-spark-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-glow-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-soft-additive', blend: 'additive', techIdx: 1 },
  { name: 'particle-smoke-alpha', blend: 'alpha', techIdx: 0 },
  { name: 'particle-dust-alpha', blend: 'alpha', techIdx: 0 },
  { name: 'particle-fade-alpha', blend: 'alpha', techIdx: 0 }
];

const MESHES = [
  { name: 'quad', kind: 'quad', category: '基础', description: '四边形面片，Billboard 默认' },
  { name: 'cone', kind: 'cone', category: '基础', description: '圆锥体，喷射/冲击波' },
  { name: 'sphere', kind: 'sphere', category: '基础', description: '球体，爆炸、能量球' },
  { name: 'cube', kind: 'cube', category: '基础', description: '立方体，碎片、方块' },
  { name: 'cylinder', kind: 'cylinder', category: '基础', description: '圆柱，柱形喷射' },
  { name: 'plane', kind: 'plane', category: '基础', description: '大平面，地面扬尘/贴花' },
  { name: 'torus', kind: 'torus', category: '特效', description: '圆环，魔法阵、冲击环' },
  { name: 'capsule', kind: 'capsule', category: '基础', description: '胶囊体，轨迹、子弹' },
  { name: 'hemisphere', kind: 'hemisphere', category: '基础', description: '半球，地面爆发' },
  { name: 'octahedron', kind: 'octahedron', category: '特效', description: '八面体，水晶、能量碎片' }
];

const BUILTIN_PARTICLE_EFFECT_UUID = 'd1346436-ac96-4271-b863-1f4fdead95b0';

const DRAW_SCRIPT = `
function drawBuiltinTexture(ctx, size, shape) {
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);
  switch (shape) {
    case 'circle': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); break;
    }
    case 'soft': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half * 0.95);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); break;
    }
    case 'star': drawStar(ctx, half, half, half * 0.85, 5); break;
    case 'spark': drawSpark(ctx, half, half, half * 0.9); break;
    case 'smoke': {
      const g = ctx.createRadialGradient(half, half, half * 0.1, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); break;
    }
    case 'glow': {
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); break;
    }
    case 'ring': {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = size * 0.12;
      ctx.beginPath(); ctx.arc(half, half, half * 0.55, 0, Math.PI * 2); ctx.stroke();
      const g = ctx.createRadialGradient(half, half, half * 0.35, half, half, half * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); break;
    }
    case 'square': {
      const pad = size * 0.22;
      const g = ctx.createRadialGradient(half, half, 0, half, half, half);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2); break;
    }
    case 'cross': drawCross(ctx, half, half, half * 0.75, size * 0.14); break;
    case 'flare': drawFlare(ctx, half, half, half); break;
    default: drawBuiltinTexture(ctx, size, 'circle');
  }
}
function drawStar(ctx, cx, cy, radius, points) {
  const inner = radius * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = g; ctx.fill();
}
function drawSpark(ctx, cx, cy, len) {
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const inner = len * 0.15, outer = len * (i % 2 === 0 ? 1 : 0.55);
    ctx.lineWidth = i % 2 === 0 ? len * 0.08 : len * 0.05;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer); ctx.stroke();
  }
}
function drawCross(ctx, cx, cy, len, width) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - width / 2, cy - len, width, len * 2);
  ctx.fillRect(cx - len, cy - width / 2, len * 2, width);
}
function drawFlare(ctx, cx, cy, radius) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.08, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, radius * 2, radius * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = radius * 0.04; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius * 0.95, cy + Math.sin(a) * radius * 0.95); ctx.stroke();
  }
}
window.renderTexture = (shape, size) => {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  drawBuiltinTexture(canvas.getContext('2d'), size, shape);
  return canvas.toDataURL('image/png').split(',')[1];
};
`;

async function generateTextures() {
  const dir = path.join(PUBLIC_BUILTIN, 'textures');
  await fs.promises.mkdir(dir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body><script>${DRAW_SCRIPT}<\/script></body></html>`);

  for (const tex of TEXTURES) {
    const base64 = await page.evaluate(
      ({ shape, size }) => window.renderTexture(shape, size),
      { shape: tex.shape, size: 64 }
    );
    const out = path.join(dir, `${tex.name}.png`);
    await fs.promises.writeFile(out, Buffer.from(base64, 'base64'));
    console.log('  texture:', tex.name);
  }
  await browser.close();
}

async function generateMaterials() {
  const dir = path.join(PUBLIC_BUILTIN, 'materials');
  await fs.promises.mkdir(dir, { recursive: true });

  for (const mat of MATERIALS) {
    const content = {
      __type__: 'cc.Material',
      _name: mat.name,
      _objFlags: 0,
      _native: '',
      _effectAsset: { __uuid__: BUILTIN_PARTICLE_EFFECT_UUID },
      _techIdx: mat.techIdx,
      _defines: [{}],
      _states: [{ rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } }],
      _props: [{ tintColor: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 } }],
      _fxStudioMeta: { blend: mat.blend }
    };
    await fs.promises.writeFile(
      path.join(dir, `${mat.name}.mtl`),
      JSON.stringify(content, null, 2)
    );
    console.log('  material:', mat.name);
  }
}

async function generateMeshes() {
  const dir = path.join(PUBLIC_BUILTIN, 'meshes');
  await fs.promises.mkdir(dir, { recursive: true });

  for (const mesh of MESHES) {
    const content = {
      format: 'fx-studio-builtin-mesh',
      version: 1,
      kind: mesh.kind,
      name: mesh.name,
      category: mesh.category,
      description: mesh.description
    };
    await fs.promises.writeFile(
      path.join(dir, `${mesh.name}.mesh`),
      JSON.stringify(content, null, 2)
    );
    console.log('  mesh:', mesh.name);
  }
}

async function main() {
  console.log('Generating builtin assets...');
  await generateTextures();
  await generateMaterials();
  await generateMeshes();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
