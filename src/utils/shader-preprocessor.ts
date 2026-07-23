/** Preprocess Cocos Creator shader for browser WebGL validation. */

interface ExtractResult {
  glsl: string;
  programName: string;
}

export function extractFragmentProgram(source: string): ExtractResult | null {
  const regex = /CCProgram\s+(\S+)\s*%\{([\s\S]*?)\}%/g;
  const programs: ExtractResult[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    programs.push({ programName: match[1], glsl: match[2].trim() });
  }
  if (programs.length === 0) return null;

  const frag = programs.find(p => /-fs|frag/i.test(p.programName) || /\bfrag\s*\(\s*\)/.test(p.glsl));
  return frag ?? programs[programs.length - 1];
}

export function preprocessForWebGL(fragmentSource: string): string {
  let glsl = fragmentSource;

  const constantUniforms: string[] = [];
  glsl.replace(/uniform\s+Constant\s*\{([^}]*)\};?/gs, (_, body: string) => {
    for (const line of body.split(';')) {
      const m = line.trim().match(/^(?:highp|mediump|lowp)?\s*(float|int|vec2|vec3|vec4|mat\d+)\s+(\w+)/);
      if (m) constantUniforms.push(`uniform ${m[1]} ${m[2]};`);
    }
    return '';
  });

  glsl = glsl.replace(/#include\s+<[^>]+>\s*/g, '');
  glsl = glsl.replace(/uniform\s+Constant\s*\{[^}]*\};?/gs, '');
  glsl = glsl.replace(/\bin\s+/g, 'in ');
  glsl = glsl.replace(/\bout\s+/g, 'out ');

  const stubs = `
uniform mat4 cc_matView;
uniform mat4 cc_matProj;
uniform mat4 cc_matWorld;
uniform mat4 cc_matWorldIT;
uniform vec4 cc_cameraPos;
${constantUniforms.join('\n')}
`;

  if (/vec4\s+frag\s*\(\s*\)/.test(glsl)) {
    glsl = glsl.replace(/vec4\s+frag\s*\(\s*\)/, 'void main()');
    glsl = glsl.replace(/return\s+([^;]+);/g, 'fragColor = $1;');
    return `#version 300 es
precision highp float;
out vec4 fragColor;
${stubs}
${glsl}`;
  }

  if (!/void\s+main\s*\(\s*\)/.test(glsl)) {
    throw new Error('未找到 frag() 或 main() 入口函数');
  }

  return `#version 300 es
precision highp float;
out vec4 fragColor;
${stubs}
${glsl}`;
}

export function compileFragmentShader(glsl: string): string | null {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return 'WebGL2 不可用，跳过 GPU 编译校验';

  const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(shader, glsl);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || '未知编译错误';
    gl.deleteShader(shader);
    return log;
  }
  gl.deleteShader(shader);
  return null;
}
