import React, { useState } from 'react';
import type { CullMode, MaterialDocument, PassState } from '@/types/material';
import {
  BLEND_EQ_OPTIONS,
  BLEND_FACTOR_OPTIONS,
  COMPARE_FUNC_OPTIONS,
  STENCIL_OP_OPTIONS
} from '@/types/material';
import {
  addPassState,
  defaultPassState,
  removePassState,
  setPassAt
} from '@/utils/material-document';
import {
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';

interface MaterialPassStatesEditorProps {
  doc: MaterialDocument;
  editable: boolean;
  commitDoc: (updater: (prev: MaterialDocument) => MaterialDocument, toast?: string) => void;
}

function num(v: number | string | undefined, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return fallback;
}

export const MaterialPassStatesEditor: React.FC<MaterialPassStatesEditorProps> = ({
  doc,
  editable,
  commitDoc
}) => {
  const [selected, setSelected] = useState(0);
  const states = doc.states.length > 0 ? doc.states : [defaultPassState()];
  const index = Math.min(selected, states.length - 1);
  const pass = states[index] ?? defaultPassState();
  const target = pass.blendState.targets[0] ?? {};
  const ds = pass.depthStencilState;

  const patchPass = (updater: (p: PassState) => PassState, toast?: string) => {
    commitDoc((prev) => setPassAt(prev, index, updater(prev.states[index] ?? defaultPassState())), toast);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {states.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`btn-sm${i === index ? ' active' : ''}`}
            onClick={() => setSelected(i)}
            style={{
              borderColor: i === index ? 'var(--accent)' : undefined,
              color: i === index ? 'var(--accent)' : undefined
            }}
          >
            Pass {i}{s.name ? ` · ${s.name}` : ''}
          </button>
        ))}
        {editable && (
          <>
            <button
              type="button"
              className="btn-sm"
              onClick={() => {
                commitDoc((prev) => addPassState(prev), '已添加 Pass');
                setSelected(states.length);
              }}
            >
              + Pass
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={states.length <= 1}
              onClick={() => {
                commitDoc((prev) => removePassState(prev, index), '已删除 Pass');
                setSelected(Math.max(0, index - 1));
              }}
            >
              删除
            </button>
          </>
        )}
      </div>

      <FieldLabel label="Pass 名称">
        <input
          style={textInputStyle}
          disabled={!editable}
          value={pass.name ?? ''}
          placeholder={`pass-${index}`}
          onChange={(e) => {
            const name = e.target.value;
            patchPass((p) => ({ ...p, name: name || undefined }));
          }}
        />
      </FieldLabel>

      <FieldLabel label="Cull Mode">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={pass.rasterizerState.cullMode ?? 'none'}
          onChange={(e) => {
            const cullMode = e.target.value as CullMode;
            patchPass((p) => ({
              ...p,
              rasterizerState: { ...p.rasterizerState, cullMode }
            }));
          }}
        >
          <option value="none">none</option>
          <option value="front">front</option>
          <option value="back">back</option>
        </select>
      </FieldLabel>

      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', margin: '8px 0 4px' }}>
        Depth
      </div>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
        <input
          type="checkbox"
          disabled={!editable}
          checked={ds.depthTest !== false}
          onChange={(e) => patchPass((p) => ({
            ...p,
            depthStencilState: { ...p.depthStencilState, depthTest: e.target.checked }
          }))}
        />
        Depth Test
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
        <input
          type="checkbox"
          disabled={!editable}
          checked={!!ds.depthWrite}
          onChange={(e) => patchPass((p) => ({
            ...p,
            depthStencilState: { ...p.depthStencilState, depthWrite: e.target.checked }
          }))}
        />
        Depth Write
      </label>
      <FieldLabel label="depthFunc">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(ds.depthFunc, 515)}
          onChange={(e) => patchPass((p) => ({
            ...p,
            depthStencilState: { ...p.depthStencilState, depthFunc: parseInt(e.target.value, 10) }
          }))}
        >
          {COMPARE_FUNC_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>

      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', margin: '8px 0 4px' }}>
        Stencil
      </div>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
        <input
          type="checkbox"
          disabled={!editable}
          checked={!!ds.stencilTest}
          onChange={(e) => patchPass((p) => ({
            ...p,
            depthStencilState: { ...p.depthStencilState, stencilTest: e.target.checked }
          }))}
        />
        Stencil Test
      </label>
      {!!ds.stencilTest && (
        <>
          <FieldLabel label="stencilFunc">
            <select
              className="select-sm"
              style={{ width: '100%' }}
              disabled={!editable}
              value={num(ds.stencilFunc, 519)}
              onChange={(e) => patchPass((p) => ({
                ...p,
                depthStencilState: { ...p.depthStencilState, stencilFunc: parseInt(e.target.value, 10) }
              }))}
            >
              {COMPARE_FUNC_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <FieldLabel label="Ref">
              <input
                type="number"
                disabled={!editable}
                style={textInputStyle}
                value={ds.stencilRef ?? 0}
                onChange={(e) => patchPass((p) => ({
                  ...p,
                  depthStencilState: {
                    ...p.depthStencilState,
                    stencilRef: parseInt(e.target.value, 10) || 0
                  }
                }))}
              />
            </FieldLabel>
            <FieldLabel label="ReadMask">
              <input
                type="number"
                disabled={!editable}
                style={textInputStyle}
                value={ds.stencilReadMask ?? 255}
                onChange={(e) => patchPass((p) => ({
                  ...p,
                  depthStencilState: {
                    ...p.depthStencilState,
                    stencilReadMask: parseInt(e.target.value, 10) || 0
                  }
                }))}
              />
            </FieldLabel>
            <FieldLabel label="WriteMask">
              <input
                type="number"
                disabled={!editable}
                style={textInputStyle}
                value={ds.stencilWriteMask ?? 255}
                onChange={(e) => patchPass((p) => ({
                  ...p,
                  depthStencilState: {
                    ...p.depthStencilState,
                    stencilWriteMask: parseInt(e.target.value, 10) || 0
                  }
                }))}
              />
            </FieldLabel>
          </div>
          {([
            ['stencilFailOp', 'Fail Op'],
            ['stencilZFailOp', 'ZFail Op'],
            ['stencilZPassOp', 'ZPass Op']
          ] as const).map(([key, label]) => (
            <FieldLabel key={key} label={label}>
              <select
                className="select-sm"
                style={{ width: '100%' }}
                disabled={!editable}
                value={num(ds[key], 7680)}
                onChange={(e) => patchPass((p) => ({
                  ...p,
                  depthStencilState: {
                    ...p.depthStencilState,
                    [key]: parseInt(e.target.value, 10)
                  }
                }))}
              >
                {STENCIL_OP_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldLabel>
          ))}
        </>
      )}

      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', margin: '8px 0 4px' }}>
        Blend Target 0
      </div>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 6 }}>
        <input
          type="checkbox"
          disabled={!editable}
          checked={target.blend !== false}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blend: e.target.checked }]
            }
          }))}
        />
        Blend
      </label>
      <FieldLabel label="blendSrc">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendSrc, 770)}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendSrc: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_FACTOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="blendDst">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendDst, 1)}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendDst: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_FACTOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="blendSrcAlpha">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendSrcAlpha, num(target.blendSrc, 770))}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendSrcAlpha: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_FACTOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="blendDstAlpha">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendDstAlpha, num(target.blendDst, 1))}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendDstAlpha: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_FACTOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="blendEq">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendEq, 32774)}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendEq: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_EQ_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="blendAlphaEq">
        <select
          className="select-sm"
          style={{ width: '100%' }}
          disabled={!editable}
          value={num(target.blendAlphaEq, 32774)}
          onChange={(e) => patchPass((p) => ({
            ...p,
            blendState: {
              targets: [{ ...(p.blendState.targets[0] ?? {}), blendAlphaEq: parseInt(e.target.value, 10) }]
            }
          }))}
        >
          {BLEND_EQ_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>
    </div>
  );
};
