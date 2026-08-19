export type RootStackParamList = {
  Setup: undefined;
  Unlock: undefined;
  Home: undefined;
  Account: undefined;
  AddEditAsset: { assetId?: string } | undefined;
  AssetDetail: { assetId: string };
  LogService: { assetId: string; fromTag?: boolean };
  DebugMetrics: undefined;
};
