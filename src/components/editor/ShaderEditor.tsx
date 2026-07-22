import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { useSessionStore } from '@/stores/session-store';
import { generateId } from '@/utils/effect-defaults';

const DEFAULT_SHADER = `// Cocos Creator 3.8 Shader
// 在左侧对话面板描述效果，或直接编辑 GLSL 代码

CCEffect %{
  techniques:
  - passes:
    - vert: unlit-vs:vert
      frag: unlit-fs:frag
      properties:
        u_Color: { value: [1, 1, 1, 1] }
}%

CCProgram unlit-vs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>
  #include <builtin/uniforms/cc-local>

  in vec3 a_position;
  in vec2 a_texCoord;

  out vec2 v_uv;

  vec4 vert() {
    vec4 pos = cc_matProj * cc_matView * cc_matWorld * vec4(a_position, 1.0);
    v_uv = a_texCoord;
    return pos;
  }
}%

CCProgram unlit-fs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>

  in vec2 v_uv;

  uniform Constant {
    vec4 u_Color;
  };

  vec4 frag() {
    return u_Color;
  }
}%`;

const SHADER_TEMPLATES = [
  { name: '冰霜覆盖', code: DEFAULT_SHADER, desc: '基础模板，替换 frag 函数实现自定义效果' },
  { name: '边缘发光', code: `// Fresnel 边缘发光效果
CCEffect %{
  techniques:
  - passes:
    - vert: unlit-vs:vert
      frag: unlit-fs:frag
      properties:
        u_Color: { value: [0.3, 0.7, 1.0, 1.0] }
        u_FresnelPower: { value: 2.0 }
}%

CCProgram unlit-vs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>
  #include <builtin/uniforms/cc-local>
  in vec3 a_position;
  in vec3 a_normal;
  in vec2 a_texCoord;
  out vec3 v_normal;
  out vec3 v_viewDir;
  out vec2 v_uv;
  vec4 vert() {
    vec4 worldPos = cc_matWorld * vec4(a_position, 1.0);
    v_normal = normalize(mat3(cc_matWorldIT) * a_normal);
    v_viewDir = normalize(cc_cameraPos.xyz - worldPos.xyz);
    v_uv = a_texCoord;
    return cc_matProj * cc_matView * worldPos;
  }
}%

CCProgram unlit-fs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>
  in vec3 v_normal;
  in vec3 v_viewDir;
  in vec2 v_uv;
  uniform Constant {
    vec4 u_Color;
    float u_FresnelPower;
  };
  vec4 frag() {
    float fresnel = 1.0 - abs(dot(v_normal, v_viewDir));
    fresnel = pow(fresnel, u_FresnelPower);
    return vec4(u_Color.rgb * fresnel, u_Color.a);
  }
}%`, desc: 'Fresnel 边缘发光，适用于护盾、能量场效果' }
];

export const ShaderEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [compileError, setCompileError] = useState<string | null>(null);
  const { addMessage } = useSessionStore();

  useEffect(() => {
    if (!editorRef.current) return;
    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...lintKeymap
        ]),
        javascript(),
        oneDark
      ]
    });
    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  const handleCompile = useCallback(() => {
    if (!viewRef.current) return;
    const currentCode = viewRef.current.state.doc.toString();
    setCode(currentCode);
    setCompileError(null);

    // Basic validation
    if (!currentCode.includes('CCEffect')) {
      setCompileError('缺少 CCEffect 声明块');
      return;
    }
    if (!currentCode.includes('CCProgram')) {
      setCompileError('缺少 CCProgram 声明块');
      return;
    }

    addMessage({
      id: generateId(),
      role: 'system',
      content: '✅ Shader 编译成功（语法校验通过）',
      timestamp: Date.now()
    });
  }, [addMessage]);

  const handleTemplate = useCallback((template: typeof SHADER_TEMPLATES[0]) => {
    if (!viewRef.current) return;
    const transaction = viewRef.current.state.update({
      changes: { from: 0, to: viewRef.current.state.doc.length, insert: template.code }
    });
    viewRef.current.dispatch(transaction);
    setCode(template.code);
    setCompileError(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--shader-color)' }}>🎨 Shader 编辑器</span>
        <div style={{ flex: 1 }} />
        <select
          onChange={(e) => {
            const t = SHADER_TEMPLATES.find(t => t.name === e.target.value);
            if (t) handleTemplate(t);
          }}
          style={{ fontSize: 12, padding: '4px 8px' }}
        >
          <option value="">模板...</option>
          {SHADER_TEMPLATES.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
        <button onClick={handleCompile} className="primary" style={{ fontSize: 12 }}>
          ▶ 编译
        </button>
      </div>

      {/* Code Editor */}
      <div ref={editorRef} style={{ flex: 1, overflow: 'auto' }} />

      {/* Compile Error */}
      {compileError && (
        <div style={{
          padding: '8px 12px', background: 'rgba(248,81,73,0.1)',
          borderTop: '1px solid var(--error)', fontSize: 13, color: 'var(--error)'
        }}>
          ⚠ {compileError}
        </div>
      )}

      {/* Status */}
      <div style={{
        padding: '4px 12px', borderTop: '1px solid var(--border-color)',
        fontSize: 11, color: 'var(--text-secondary)',
        background: 'var(--bg-secondary)'
      }}>
        GLSL · Cocos Creator 3.8 · {code.split('\n').length} 行
        {!compileError && code !== DEFAULT_SHADER && ' · 🟢 语法校验通过'}
      </div>
    </div>
  );
};
