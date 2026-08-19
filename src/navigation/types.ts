export type RootStackParamList = {
  Setup: undefined;
  Unlock: undefined;
  Home: undefined;
  Account: undefined;
  ArchivedAssets: undefined;
  AddEditAsset: { assetId?: string } | undefined;
  AssetDetail: { assetId: string };
  LogService: { assetId: string; fromTag?: boolean };
  DebugMetrics: undefined;
};
