import React, { useMemo, useState } from 'react';
import type { MaterialDocument } from '@/types/material';
import type { EffectPropertyDef, EffectSchema } from '@/types/effect-schema';
import { normalizeTintColor, tintFromCssHex, tintToCssHex } from '@/utils/particle-material';
import { setDefines0, setTintOnDocument } from '@/utils/material-document';
import { mergeDefineEntries } from '@/utils/effect-schema';
import { AssetSlot } from '@/components/inspector/AssetSlot';
import {
  FieldLabel,
  textInputStyle
} from '@/components/properties/editors/AssetEditorShared';

interface MaterialSchemaFieldsProps {
  doc: MaterialDocument;
  schema: EffectSchema;
  editable: boolean;
  commitDoc: (updater: (prev: MaterialDocument) => MaterialDocument, toast?: string) => void;
}

function readProp(doc: MaterialDocument, name: string): unknown {
  return doc.props[0]?.[name];
}

function writeProp(doc: MaterialDocument, name: string, value: unknown): MaterialDocument {
  const props = [...doc.props];
  const first = { ...(props[0] ?? {}) };
  if (value === undefined) delete first[name];
  else first[name] = value;
  props[0] = first;
  return { ...doc, props };
}

export const MaterialSchemaFields: React.FC<MaterialSchemaFieldsProps> = ({
  doc,
  schema,
  editable,
  commitDoc
}) => {
  const defines0 = doc.defines[0] ?? {};
  const defineRows = useMemo(() => mergeDefineEntries(schema, defines0), [schema, defines0]);
  const [defineKey, setDefineKey] = useState('');
  const [defineValue, setDefineValue] = useState('true');
  const [extraPropKey, setExtraPropKey] = useState('');
  const [extraPropValue, setExtraPropValue] = useState('');

  const schemaPropNames = useMemo(() => new Set(schema.properties.map(p => p.name)), [schema]);
  const unknownProps = useMemo(() => {
    const first = doc.props[0] ?? {};
    return Object.keys(first).filter(k => !schemaPropNames.has(k));
  }, [doc.props, schemaPropNames]);

  return (
    <>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Schema: {schema.name}
        {schema.builtin ? ' · builtin' : ''}
        {schema.partial ? ' · partial（KV 兜底）' : ''}
      </div>

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        marginBottom: 6,
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 4
      }}>
        Defines
      </div>
      {defineRows.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>（无宏）</div>
      )}
      {defineRows.map((row) => (
        <div key={row.name} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
          <code style={{ fontSize: 10, flex: 1 }} title={row.fromSchema ? 'schema' : 'extra'}>
            {row.name}
          </code>
          {typeof row.value === 'boolean' ? (
            <input
              type="checkbox"
              disabled={!editable}
              checked={!!row.value}
              onChange={(e) => {
                commitDoc((prev) => setDefines0(prev, {
                  ...(prev.defines[0] ?? {}),
                  [row.name]: e.target.checked
                }));
              }}
            />
          ) : (
            <input
              style={{ ...textInputStyle, width: 90 }}
              disabled={!editable}
              value={String(row.value)}
              onChange={(e) => {
                const raw = e.target.value;
                let parsed: boolean | number | string = raw;
                if (raw === 'true') parsed = true;
                else if (raw === 'false') parsed = false;
                else if (/^-?\d+(\.\d+)?$/.test(raw)) parsed = Number(raw);
                commitDoc((prev) => setDefines0(prev, {
                  ...(prev.defines[0] ?? {}),
                  [row.name]: parsed
                }));
              }}
            />
          )}
          {editable && !row.fromSchema && (
            <button
              type="button"
              className="btn-sm"
              onClick={() => {
                commitDoc((prev) => {
                  const next = { ...(prev.defines[0] ?? {}) };
                  delete next[row.name];
                  return setDefines0(prev, next);
                });
              }}
            >
              删
            </button>
          )}
        </div>
      ))}
      {editable && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 12 }}>
          <input
            style={{ ...textInputStyle, flex: 1 }}
            placeholder="宏名"
            value={defineKey}
            onChange={(e) => setDefineKey(e.target.value)}
          />
          <input
            style={{ ...textInputStyle, width: 72 }}
            placeholder="值"
            value={defineValue}
            onChange={(e) => setDefineValue(e.target.value)}
          />
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              const key = defineKey.trim();
              if (!key) return;
              let parsed: boolean | number | string = defineValue;
              if (defineValue === 'true') parsed = true;
              else if (defineValue === 'false') parsed = false;
              else if (/^-?\d+(\.\d+)?$/.test(defineValue)) parsed = Number(defineValue);
              commitDoc((prev) => setDefines0(prev, { ...(prev.defines[0] ?? {}), [key]: parsed }));
              setDefineKey('');
              setDefineValue('true');
            }}
          >
            添加
          </button>
        </div>
      )}

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        marginBottom: 6,
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 4
      }}>
        Props
      </div>

      {schema.properties.map((prop) => (
        <SchemaPropEditor
          key={prop.name}
          prop={prop}
          doc={doc}
          editable={editable}
          commitDoc={commitDoc}
        />
      ))}

      {unknownProps.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
            未知 / 透传 props
          </div>
          {unknownProps.map((k) => (
            <div key={k} style={{ fontSize: 10, marginBottom: 2, wordBreak: 'break-all' }}>
              <code>{k}</code>: {JSON.stringify(readProp(doc, k))}
            </div>
          ))}
        </div>
      )}

      {editable && schema.partial && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            style={{ ...textInputStyle, flex: 1 }}
            placeholder="prop 名"
            value={extraPropKey}
            onChange={(e) => setExtraPropKey(e.target.value)}
          />
          <input
            style={{ ...textInputStyle, flex: 1 }}
            placeholder="JSON 值"
            value={extraPropValue}
            onChange={(e) => setExtraPropValue(e.target.value)}
          />
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              const key = extraPropKey.trim();
              if (!key) return;
              let value: unknown = extraPropValue;
              try { value = JSON.parse(extraPropValue); } catch { /* string */ }
              commitDoc((prev) => writeProp(prev, key, value));
              setExtraPropKey('');
              setExtraPropValue('');
            }}
          >
            添加
          </button>
        </div>
      )}
    </>
  );
};

const SchemaPropEditor: React.FC<{
  prop: EffectPropertyDef;
  doc: MaterialDocument;
  editable: boolean;
  commitDoc: (updater: (prev: MaterialDocument) => MaterialDocument, toast?: string) => void;
}> = ({ prop, doc, editable, commitDoc }) => {
  if (prop.type === 'color' || prop.name === 'tintColor') {
    const tint = normalizeTintColor(readProp(doc, 'tintColor') ?? prop.defaultValue);
    return (
      <FieldLabel label={prop.displayName ?? prop.name}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            disabled={!editable}
            value={tintToCssHex(tint)}
            onChange={(e) => {
              const next = tintFromCssHex(e.target.value, tint.a);
              commitDoc((prev) => setTintOnDocument(prev, next));
            }}
            style={{ width: 42, height: 28, padding: 0, border: '1px solid var(--border-color)', background: 'transparent' }}
          />
          <input
            type="number"
            min={0}
            max={255}
            disabled={!editable}
            style={{ ...textInputStyle, width: 64 }}
            value={tint.a}
            title="alpha"
            onChange={(e) => {
              const a = Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0));
              commitDoc((prev) => setTintOnDocument(prev, { ...tint, a }));
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {tint.r},{tint.g},{tint.b},{tint.a}
          </span>
        </div>
      </FieldLabel>
    );
  }

  if (prop.type === 'texture' || prop.name === 'mainTexture') {
    return (
      <div style={{ marginBottom: 8 }}>
        <AssetSlot
          slot="mainTexture"
          label={prop.displayName ?? prop.name}
          assetId={doc.mainTextureAssetId}
          onChange={(id) => {
            if (!editable) return;
            commitDoc(
              (prev) => ({ ...prev, mainTextureAssetId: id }),
              id ? '已设置材质贴图' : '已清除材质贴图'
            );
          }}
        />
      </div>
    );
  }

  if (prop.type === 'boolean') {
    const v = readProp(doc, prop.name);
    const checked = typeof v === 'boolean' ? v : !!prop.defaultValue;
    return (
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 8 }}>
        <input
          type="checkbox"
          disabled={!editable}
          checked={checked}
          onChange={(e) => {
            commitDoc((prev) => writeProp(prev, prop.name, e.target.checked));
          }}
        />
        {prop.displayName ?? prop.name}
      </label>
    );
  }

  if (prop.type === 'float' || prop.type === 'number') {
    const v = readProp(doc, prop.name);
    const num = typeof v === 'number' ? v : Number(prop.defaultValue ?? 0);
    return (
      <FieldLabel label={prop.displayName ?? prop.name}>
        <input
          type="number"
          step="any"
          disabled={!editable}
          style={textInputStyle}
          value={Number.isFinite(num) ? num : 0}
          onChange={(e) => {
            commitDoc((prev) => writeProp(prev, prop.name, parseFloat(e.target.value) || 0));
          }}
        />
      </FieldLabel>
    );
  }

  // unknown / vec — JSON text
  const raw = readProp(doc, prop.name);
  return (
    <FieldLabel label={`${prop.displayName ?? prop.name} (${prop.type})`}>
      <input
        style={textInputStyle}
        disabled={!editable}
        value={raw === undefined ? '' : (typeof raw === 'string' ? raw : JSON.stringify(raw))}
        onChange={(e) => {
          const text = e.target.value;
          let value: unknown = text;
          try { value = JSON.parse(text); } catch { /* keep string */ }
          commitDoc((prev) => writeProp(prev, prop.name, value));
        }}
      />
    </FieldLabel>
  );
};
