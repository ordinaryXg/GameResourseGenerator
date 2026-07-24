import type { AssetEntry } from '@/types/asset';
import type {
  EffectMacroDef,
  EffectPropertyDef,
  EffectPropEditorType,
  EffectSchema,
  EffectTechniqueDef
} from '@/types/effect-schema';
import { EMPTY_EFFECT_SCHEMA } from '@/types/effect-schema';
import {
  BUILTIN_PARTICLE_EFFECT_SCHEMA,
  isBuiltinParticleEffectUuid
} from '@/data/builtin-particle-effect-schema';
import type { MaterialDocument } from '@/types/material';
import { getEffectUuid } from '@/utils/material-document';
import { generateBuiltinShaderSource } from '@/utils/builtin-asset-content';

/** Extract raw CCEffect YAML body between `CCEffect %{` and matching `}%`. */
export function extractCCEffectBody(source: string): string | null {
  const start = source.search(/CCEffect\s*%\{/i);
  if (start < 0) return null;
  const open = source.indexOf('%{', start);
  if (open < 0) return null;
  let i = open + 2;
  let depth = 1;
  while (i < source.length) {
    if (source[i] === '%' && source[i + 1] === '{') {
      depth += 1;
      i += 2;
      continue;
    }
    if (source[i] === '}' && source[i + 1] === '%') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 2, i);
      i += 2;
      continue;
    }
    i += 1;
  }
  return null;
}

function mapEditorType(raw: string | undefined, propName: string): EffectPropEditorType {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('color')) return 'color';
  if (t.includes('texture') || t.includes('sprite')) return 'texture';
  if (t === 'float' || t === 'number') return 'float';
  if (t === 'vec2' || t === 'vector2') return 'vec2';
  if (t === 'vec3' || t === 'vector3') return 'vec3';
  if (t === 'vec4' || t === 'vector4') return 'vec4';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  const n = propName.toLowerCase();
  if (n.includes('color') || n.includes('tint')) return 'color';
  if (n.includes('texture') || n.includes('map') || n.includes('tex')) return 'texture';
  return 'unknown';
}

/**
 * Pragmatic CCEffect subset parser — no full YAML dependency.
 * Extracts technique names, properties (with editor.type hints), and macros.
 */
export function parseCCEffectSchema(source: string, name = 'parsed-effect'): EffectSchema {
  const body = extractCCEffectBody(source);
  if (!body) {
    return { ...EMPTY_EFFECT_SCHEMA, name, partial: true };
  }

  const techniques = parseTechniques(body);
  const properties = parseProperties(body);
  const macros = parseMacros(body);

  const partial = techniques.length === 0 && properties.length === 0 && macros.length === 0;
  return {
    name,
    builtin: false,
    partial,
    techniques: techniques.length > 0 ? techniques : EMPTY_EFFECT_SCHEMA.techniques,
    properties,
    macros
  };
}

function parseTechniques(body: string): EffectTechniqueDef[] {
  const techniques: EffectTechniqueDef[] = [];
  const techBlock = sliceBlock(body, /^[ \t]*techniques\s*:/m);
  if (!techBlock) {
    const re = /^\s*-\s*name\s*:\s*([^\s#]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      techniques.push({ name: m[1], passes: [{}] });
    }
    return techniques;
  }

  const re = /^\s*-\s*name\s*:\s*([^\s#]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(techBlock)) !== null) {
    techniques.push({ name: m[1], passes: [{ name: 'default' }] });
  }
  return techniques;
}

function parseProperties(body: string): EffectPropertyDef[] {
  const idx = body.search(/^[ \t]*properties\s*:/m);
  if (idx < 0) return [];

  const after = body.slice(idx);
  const headerLine = after.split(/\r?\n/)[0] ?? '';
  const headerIndent = /^(\s*)/.exec(headerLine)?.[1].length ?? 0;
  const lines = after.split(/\r?\n/).slice(1);
  const blockLines: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      blockLines.push(line);
      continue;
    }
    const indent = /^(\s*)/.exec(line)?.[1].length ?? 0;
    if (indent <= headerIndent && /^[A-Za-z_]/.test(line.trim())) break;
    blockLines.push(line);
  }

  const props: EffectPropertyDef[] = [];
  let current: EffectPropertyDef | null = null;
  // First property key indent (typically headerIndent + 2)
  let propKeyIndent: number | null = null;

  for (const line of blockLines) {
    const propStart = /^(\s*)([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
    if (propStart) {
      const indent = propStart[1].length;
      if (propKeyIndent === null && indent > headerIndent) {
        propKeyIndent = indent;
      }
      if (propKeyIndent !== null && indent === propKeyIndent) {
        if (current) props.push(current);
        const name = propStart[2];
        current = {
          name,
          type: mapEditorType(undefined, name),
          displayName: name
        };
        const rest = propStart[3].trim();
        if (rest && !rest.startsWith('{')) {
          current.defaultValue = coerceScalar(rest);
        }
        const inlineType = /type\s*:\s*([A-Za-z_]+)/.exec(rest);
        if (inlineType) current.type = mapEditorType(inlineType[1], name);
        continue;
      }
    }
    if (!current) continue;
    const typeHint = /type\s*:\s*([A-Za-z_]+)/.exec(line);
    if (typeHint) {
      current.type = mapEditorType(typeHint[1], current.name);
    }
    const valueHint = /^\s*value\s*:\s*(.+)$/.exec(line);
    if (valueHint) {
      current.defaultValue = coerceScalar(valueHint[1].trim());
    }
  }
  if (current) props.push(current);
  return props;
}

function parseMacros(body: string): EffectMacroDef[] {
  const macros: EffectMacroDef[] = [];
  const seen = new Set<string>();

  // `macros:` map style
  const block = sliceBlock(body, /^[ \t]*macros\s*:/m);
  if (block) {
    const re = /^\s*([A-Za-z_][\w]*)\s*:\s*(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      if (m[1] === 'macros') continue;
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      macros.push({
        name: m[1],
        defaultValue: coerceScalar(m[2].trim()) as boolean | number | string
      });
    }
  }

  // `#define` style comments sometimes appear — skip
  return macros;
}

/** Slice indented block starting at a header line match. */
function sliceBlock(text: string, headerRe: RegExp): string | null {
  const m = headerRe.exec(text);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length;
  const headerIndent = /^(\s*)/.exec(text.slice(text.lastIndexOf('\n', m.index) + 1, m.index + m[0].length))?.[1].length
    ?? 0;
  const lines = text.slice(start).split(/\r?\n/);
  const collected: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      collected.push(line);
      continue;
    }
    const indent = /^(\s*)/.exec(line)?.[1].length ?? 0;
    // Next sibling/parent header at same or less indent ends block
    if (indent <= headerIndent && /^[A-Za-z_]/.test(line.trim())) break;
    collected.push(line);
  }
  return collected.join('\n');
}

function coerceScalar(raw: string): unknown {
  const s = raw.replace(/,#.*$/, '').trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
    try {
      return JSON.parse(s.replace(/'/g, '"'));
    } catch {
      return s;
    }
  }
  return s.replace(/^['"]|['"]$/g, '');
}

export function resolveEffectSchema(
  doc: MaterialDocument,
  getAsset: (id: string) => AssetEntry | null
): EffectSchema {
  const uuid = getEffectUuid(doc);

  if (doc.effect.kind === 'builtin-uuid' || isBuiltinParticleEffectUuid(uuid)) {
    if (doc.effect.kind !== 'shader-asset') {
      return BUILTIN_PARTICLE_EFFECT_SCHEMA;
    }
  }

  if (doc.effect.kind === 'shader-asset') {
    const asset = getAsset(doc.effect.assetId);
    if (!asset) {
      return { ...EMPTY_EFFECT_SCHEMA, name: 'missing-shader', partial: true };
    }
    const source = asset.meta?.shaderSource || generateBuiltinShaderSource(asset);
    return parseCCEffectSchema(source, asset.name);
  }

  if (isBuiltinParticleEffectUuid(uuid)) {
    return BUILTIN_PARTICLE_EFFECT_SCHEMA;
  }

  return {
    ...EMPTY_EFFECT_SCHEMA,
    name: `uuid:${uuid.slice(0, 8)}`,
    partial: true
  };
}

/** Merge schema macros with existing define keys for UI. */
export function mergeDefineEntries(
  schema: EffectSchema,
  defines0: Record<string, boolean | number | string>
): Array<{ name: string; value: boolean | number | string; fromSchema: boolean }> {
  const out: Array<{ name: string; value: boolean | number | string; fromSchema: boolean }> = [];
  const seen = new Set<string>();
  for (const m of schema.macros) {
    seen.add(m.name);
    const v = defines0[m.name];
    out.push({
      name: m.name,
      value: (v !== undefined ? v : (m.defaultValue ?? false)) as boolean | number | string,
      fromSchema: true
    });
  }
  for (const [k, v] of Object.entries(defines0)) {
    if (seen.has(k)) continue;
    out.push({ name: k, value: v, fromSchema: false });
  }
  return out;
}
