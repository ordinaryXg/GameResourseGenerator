export type InspectorTarget =
  | { kind: 'asset'; assetId: string }
  | { kind: 'node'; nodeId: string };
