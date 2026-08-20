export type AssetType =
  | 'car'
  | 'motorcycle'
  | 'bike'
  | 'ac'
  | 'water_heater'
  | 'other';

export type ConditionStatus = 'working' | 'needs_attention' | 'not_working';

export type AssetLocation = 'home' | 'service_center';

export type ServiceStatus = 'on_schedule' | 'due_soon' | 'overdue';

export interface Asset {
  id: string;
  name: string;
  /** Category: car, AC, etc. */
  type: AssetType;
  brand: string;
  /** Model / tipe, e.g. Avanza, Beat */
  model: string;
  manufactureYear: number | null;
  purchaseYear: number | null;
  purchaseAt: string;
  condition: ConditionStatus;
  /** Where the asset is right now */
  location: AssetLocation;
  nextServiceAt: string; // YYYY-MM-DD
  /** When false, schedule status ignores nextServiceAt (km-only assets). Default true. */
  scheduleByDate: boolean;
  usageEnabled: boolean;
  usageCurrent: number | null;
  usageInterval: number | null;
  usageNextDue: number | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ServiceLogKind = 'routine' | 'one_time';

export interface ServiceLog {
  id: string;
  assetId: string;
  servicedAt: string;
  serviceKind: ServiceLogKind;
  notes: string;
  cost: number | null;
  receiptUri: string | null;
  /** Workshop service tag / stiker servis photo (schedule source, not a receipt) */
  serviceTagUri: string | null;
  vendorId: string | null;
  vendorName: string | null;
  createdAt: string;
}

export type ChangeField =
  | 'km'
  | 'condition'
  | 'nextServiceAt'
  | 'name'
  | 'brand'
  | 'model'
  | 'manufactureYear'
  | 'purchaseYear'
  | 'usageNextDue'
  | 'usageInterval'
  | 'usageEnabled'
  | 'scheduleByDate'
  | 'location'
  | 'in_service';

export interface AssetChange {
  id: string;
  assetId: string;
  field: ChangeField;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  isSeed: boolean;
  createdAt: string;
}

export interface AppEvent {
  id: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface AppState {
  assets: Asset[];
  logs: ServiceLog[];
  changes: AssetChange[];
  vendors: Vendor[];
  events: AppEvent[];
  language: 'en' | 'id';
  homeColumns: 2 | 3;
}

export const DUE_SOON_DAYS = 14;
export const USAGE_DUE_SOON_RATIO = 0.1;
