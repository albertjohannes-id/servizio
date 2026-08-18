export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Account: undefined;
  AddEditAsset: { assetId?: string } | undefined;
  AssetDetail: { assetId: string };
  LogService: { assetId: string; fromTag?: boolean };
  DebugMetrics: undefined;
};
