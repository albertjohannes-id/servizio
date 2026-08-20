export type RootStackParamList = {
  Setup: undefined;
  Unlock: undefined;
  Home: undefined;
  Account: undefined;
  ArchivedAssets: undefined;
  AddEditAsset: { assetId?: string } | undefined;
  AssetDetail: { assetId: string; showSaved?: boolean };
  LogService: { assetId: string };
  LogKm: { assetId: string };
  DebugMetrics: undefined;
};
