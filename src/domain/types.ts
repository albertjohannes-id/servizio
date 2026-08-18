export type AssetType =
  | 'car'
  | 'motorcycle'
  | 'bike'
  | 'ac'
  | 'water_heater'
  | 'other';

export type ConditionStatus = 'working' | 'needs_attention' | 'not_working';

export type ServiceStatus =
  | 'on_schedule'
  | 'due_soon'
  | 'overdue'
  | 'in_service';

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
  condition: ConditionStatus;
  /** When set to in_service, overrides computed schedule status */
  serviceOverride: 'in_service' | null;
  nextServiceAt: string; // YYYY-MM-DD
  usageEnabled: boolean;
  usageCurrent: number | null;
  usageInterval: number | null;
  usageNextDue: number | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLog {
  id: string;
  assetId: string;
  servicedAt: string;
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
}

export const DUE_SOON_DAYS = 14;
export const USAGE_DUE_SOON_RATIO = 0.1;
