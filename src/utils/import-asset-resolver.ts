import type { AssetEntry } from '@/types/asset';
import { createBuiltinAssetEntries } from '@/data/builtin-assets';
import { TEXTURE_SUB_META_ID } from '@/utils/default-particle-texture';

function shortUuid(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8);
}

export class ImportAssetCollector {
  private byCocosUuid = new Map<string, AssetEntry>();
  private imported: AssetEntry[] = [];

  constructor(private readonly builtins = createBuiltinAssetEntries()) {}

  getImportedAssets(): AssetEntry[] {
    return [...this.imported];
  }

  private findBuiltinByCocosUuid(uuid: string): AssetEntry | undefined {
    return this.builtins.find(a => a.meta?.uuid === uuid || a.id === uuid);
  }

  private findImportedByCocosUuid(uuid: string): AssetEntry | undefined {
    return this.byCocosUuid.get(uuid);
  }

  resolveTextureRef(spriteFrameUuid: string | undefined): string | undefined {
    if (!spriteFrameUuid) return undefined;

    const builtin = this.findBuiltinByCocosUuid(spriteFrameUuid);
    if (builtin) return builtin.id;

    const existing = this.findImportedByCocosUuid(spriteFrameUuid);
    if (existing) return existing.id;

    const baseUuid = spriteFrameUuid.includes('@')
      ? spriteFrameUuid.split('@')[0]
      : spriteFrameUuid;
    const normalizedSf = spriteFrameUuid.includes('@')
      ? spriteFrameUuid
      : `${baseUuid}@${TEXTURE_SUB_META_ID}`;

    const baseBuiltin = this.findBuiltinByCocosUuid(baseUuid);
    if (baseBuiltin) return baseBuiltin.id;

    if (this.byCocosUuid.has(baseUuid)) {
      return this.byCocosUuid.get(baseUuid)!.id;
    }

    const entry: AssetEntry = {
      id: `imported-tex-${shortUuid(baseUuid)}`,
      name: `imported-texture-${shortUuid(baseUuid)}`,
      type: 'texture',
      source: 'imported',
      uri: `cocos://imported/textures/${baseUuid}.png`,
      meta: {
        uuid: baseUuid,
        spriteFrameUuid: normalizedSf
      }
    };
    this.register(entry, baseUuid, normalizedSf);
    return entry.id;
  }

  resolveMaterialRef(materialUuid: string | undefined, blendHint: 'alpha' | 'additive' = 'additive'): string | undefined {
    if (!materialUuid) return undefined;

    const builtin = this.findBuiltinByCocosUuid(materialUuid);
    if (builtin) return builtin.id;

    const existing = this.findImportedByCocosUuid(materialUuid);
    if (existing) return existing.id;

    const entry: AssetEntry = {
      id: `imported-mat-${shortUuid(materialUuid)}`,
      name: `imported-material-${shortUuid(materialUuid)}`,
      type: 'material',
      source: 'imported',
      uri: `cocos://imported/materials/${materialUuid}.mtl`,
      meta: {
        uuid: materialUuid,
        blend: blendHint
      }
    };
    this.register(entry, materialUuid);
    return entry.id;
  }

  private register(entry: AssetEntry, ...uuids: string[]) {
    this.imported.push(entry);
    for (const uuid of uuids) {
      this.byCocosUuid.set(uuid, entry);
    }
  }
}

export function extractParticleAssetUuids(
  pool: unknown[],
  ps: Record<string, unknown>
): { materialUuid?: string; spriteFrameUuid?: string } {
  const materials = ps._materials as Array<{ __uuid__?: string }> | undefined;
  const materialUuid = materials?.[0]?.__uuid__;

  let spriteFrameUuid: string | undefined;

  const rendererRef = ps.renderer ?? ps._N$renderer;
  if (rendererRef) {
    const renderer = pool[(rendererRef as { __id__?: number }).__id__ ?? -1] as Record<string, unknown> | undefined;
    const mainTexture = renderer?._mainTexture as { __uuid__?: string } | undefined;
    spriteFrameUuid = mainTexture?.__uuid__;
  }

  // Cocos 3.x：ParticleSystemRenderer 也可能挂在同一节点组件列表
  if (!spriteFrameUuid) {
    const nodeRef = ps.node as { __id__?: number } | undefined;
    const node = nodeRef ? pool[nodeRef.__id__ ?? -1] as Record<string, unknown> | undefined : undefined;
    const components = node?._components as Array<{ __id__?: number }> | undefined;
    if (components) {
      for (const compRef of components) {
        const comp = pool[(compRef as { __id__?: number }).__id__ ?? -1] as Record<string, unknown> | undefined;
        if (comp?.__type__ === 'cc.ParticleSystemRenderer') {
          const mainTexture = comp._mainTexture as { __uuid__?: string } | undefined;
          spriteFrameUuid = mainTexture?.__uuid__;
          break;
        }
      }
    }
  }

  return { materialUuid, spriteFrameUuid };
}
