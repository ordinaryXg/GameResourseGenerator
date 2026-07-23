/** Dispose sprite material without destroying shared cached textures. */
export function disposeSpriteMaterial(material: { map: unknown; dispose: () => void }) {
  material.map = null;
  material.dispose();
}

export const ASSET_DND_MIME = 'application/x-fx-studio-asset';

export interface AssetDragPayload {
  id: string;
  type: string;
  name: string;
}

export function writeAssetDragData(dataTransfer: DataTransfer, payload: AssetDragPayload) {
  dataTransfer.setData(ASSET_DND_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'copy';
}

export function readAssetDragData(dataTransfer: DataTransfer): AssetDragPayload | null {
  const raw = dataTransfer.getData(ASSET_DND_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssetDragPayload;
  } catch {
    return null;
  }
}

export function assetTypeAcceptsSlot(
  assetType: string,
  slot: 'mainTexture' | 'material' | 'mesh' | 'shader'
): boolean {
  switch (slot) {
    case 'mainTexture':
      return assetType === 'texture' || assetType === 'spriteFrame';
    case 'material':
      return assetType === 'material';
    case 'mesh':
      return assetType === 'mesh';
    case 'shader':
      return assetType === 'shader';
    default:
      return false;
  }
}

export function assetTypeLabel(type: string): string {
  switch (type) {
    case 'texture': return '贴图';
    case 'spriteFrame': return '精灵帧';
    case 'material': return '材质';
    case 'shader': return 'Shader';
    case 'mesh': return '模型';
    default: return type;
  }
}
