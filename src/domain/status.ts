import {
  Asset,
  DUE_SOON_DAYS,
  ServiceStatus,
  USAGE_DUE_SOON_RATIO,
} from './types';

function parseDay(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseDay(isoDate);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = formatDate(todayIso(d));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return todayIso(new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/** Pure schedule status from date + optional km (ignores in_service override). */
export function computeScheduleStatus(asset: Asset, now = new Date()): Exclude<ServiceStatus, 'in_service'> {
  const dayDelta = daysUntil(asset.nextServiceAt, now);
  let dateStatus: Exclude<ServiceStatus, 'in_service'> = 'on_schedule';
  if (dayDelta < 0) dateStatus = 'overdue';
  else if (dayDelta <= DUE_SOON_DAYS) dateStatus = 'due_soon';

  if (
    asset.usageEnabled &&
    asset.usageCurrent != null &&
    asset.usageNextDue != null &&
    asset.usageInterval != null &&
    asset.usageInterval > 0
  ) {
    const remaining = asset.usageNextDue - asset.usageCurrent;
    let usageStatus: Exclude<ServiceStatus, 'in_service'> = 'on_schedule';
    if (remaining <= 0) usageStatus = 'overdue';
    else if (remaining <= asset.usageInterval * USAGE_DUE_SOON_RATIO) usageStatus = 'due_soon';

    const rank = { overdue: 2, due_soon: 1, on_schedule: 0 } as const;
    return rank[usageStatus] >= rank[dateStatus] ? usageStatus : dateStatus;
  }

  return dateStatus;
}

export function resolveServiceStatus(asset: Asset, now = new Date()): ServiceStatus {
  if (asset.serviceOverride === 'in_service') return 'in_service';
  return computeScheduleStatus(asset, now);
}

export function sortAssetsForHome(assets: Asset[], now = new Date()): Asset[] {
  const rank = (a: Asset) => {
    const s = resolveServiceStatus(a, now);
    if (s === 'overdue') return 0;
    if (s === 'due_soon') return 1;
    if (s === 'in_service') return 2;
    return 3;
  };
  return [...assets]
    .filter((a) => !a.archived)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
