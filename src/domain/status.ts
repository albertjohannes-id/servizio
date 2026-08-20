import {
  Asset,
  DUE_SOON_DAYS,
  ServiceStatus,
  USAGE_DUE_SOON_RATIO,
} from './types';
import { Lang, Dictionary } from '../i18n/strings';
import { formatInt } from './format';

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

export function addMonthsIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return todayIso(new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/** Schedule status from date + optional km. Location is separate. */
export function computeScheduleStatus(asset: Asset, now = new Date()): ServiceStatus {
  const byDate = asset.scheduleByDate !== false;
  let dateStatus: ServiceStatus | null = null;
  if (byDate) {
    const dayDelta = daysUntil(asset.nextServiceAt, now);
    dateStatus = 'on_schedule';
    if (dayDelta < 0) dateStatus = 'overdue';
    else if (dayDelta <= DUE_SOON_DAYS) dateStatus = 'due_soon';
  }

  let usageStatus: ServiceStatus | null = null;
  if (
    asset.usageEnabled &&
    asset.usageCurrent != null &&
    asset.usageNextDue != null &&
    asset.usageInterval != null &&
    asset.usageInterval > 0
  ) {
    const remaining = asset.usageNextDue - asset.usageCurrent;
    usageStatus = 'on_schedule';
    if (remaining <= 0) usageStatus = 'overdue';
    else if (remaining <= asset.usageInterval * USAGE_DUE_SOON_RATIO) usageStatus = 'due_soon';
  }

  if (dateStatus && usageStatus) {
    const rank = { overdue: 2, due_soon: 1, on_schedule: 0 } as const;
    return rank[usageStatus] >= rank[dateStatus] ? usageStatus : dateStatus;
  }
  return dateStatus ?? usageStatus ?? 'on_schedule';
}

export function resolveServiceStatus(asset: Asset, now = new Date()): ServiceStatus {
  return computeScheduleStatus(asset, now);
}

export function sortAssetsForHome(assets: Asset[], now = new Date()): Asset[] {
  const rank = (a: Asset) => {
    const s = resolveServiceStatus(a, now);
    if (s === 'overdue') return 0;
    if (s === 'due_soon') return 1;
    return 2;
  };
  return [...assets]
    .filter((a) => !a.archived)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.location === 'service_center' ? 0 : 1) - (b.location === 'service_center' ? 0 : 1) ||
        a.name.localeCompare(b.name)
    );
}

export type MaintenanceLine = { text: string; short: string; status: ServiceStatus };

function dateMaintenanceLine(asset: Asset, t: Dictionary, lang: Lang, now: Date): MaintenanceLine | null {
  if (asset.scheduleByDate === false) return null;
  const days = daysUntil(asset.nextServiceAt, now);
  const status: ServiceStatus =
    days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'due_soon' : 'on_schedule';
  const n = formatInt(Math.abs(days), lang);
  let text: string;
  let short: string;
  if (status === 'overdue') {
    text = t.maintOverdueDays.replace('{n}', n);
    short = t.maintShortOverdueDays.replace('{n}', n);
  } else if (days === 0) {
    text = t.maintDueToday;
    short = t.maintShortDueToday;
  } else {
    text = t.maintInDays.replace('{n}', formatInt(Math.max(days, 0), lang));
    short = t.maintShortDays.replace('{n}', formatInt(Math.max(days, 0), lang));
  }
  return { text, short, status };
}

function kmMaintenanceLine(asset: Asset, t: Dictionary, lang: Lang): MaintenanceLine | null {
  if (
    !asset.usageEnabled ||
    asset.usageCurrent == null ||
    asset.usageNextDue == null ||
    asset.usageInterval == null ||
    asset.usageInterval <= 0
  ) {
    return null;
  }
  const remaining = asset.usageNextDue - asset.usageCurrent;
  let status: ServiceStatus = 'on_schedule';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= asset.usageInterval * USAGE_DUE_SOON_RATIO) status = 'due_soon';

  const n = formatInt(Math.abs(remaining), lang);
  let text: string;
  let short: string;
  if (status === 'overdue') {
    text = t.maintOverdueKm.replace('{n}', n);
    short = t.maintShortOverdueKm.replace('{n}', n);
  } else if (remaining === 0) {
    text = t.maintDueNowKm;
    short = t.maintShortOverdueKm.replace('{n}', '0');
  } else {
    text = t.maintInKm.replace('{n}', formatInt(remaining, lang));
    short = t.maintShortKm.replace('{n}', formatInt(remaining, lang));
  }
  return { text, short, status };
}

export function maintenanceLines(
  asset: Asset,
  t: Dictionary,
  lang: Lang,
  now = new Date()
): MaintenanceLine[] {
  const lines: MaintenanceLine[] = [];
  const dateLine = dateMaintenanceLine(asset, t, lang, now);
  const kmLine = kmMaintenanceLine(asset, t, lang);
  if (dateLine) lines.push(dateLine);
  if (kmLine) lines.push(kmLine);
  return lines;
}

export function maintenanceSummary(
  asset: Asset,
  t: Dictionary,
  lang: Lang,
  now = new Date()
): { primary: string; secondary?: string } {
  const lines = maintenanceLines(asset, t, lang, now);
  if (lines.length === 0) return { primary: t.noSchedule };
  if (lines.length === 1) return { primary: lines[0].text };
  return { primary: lines.map((l) => l.text).join(' · ') };
}

/** Lines for home tiles — full phrases, or one compact line when both date and km apply. */
export function maintenanceTileDisplay(
  asset: Asset,
  t: Dictionary,
  lang: Lang,
  compact: boolean,
  now = new Date()
): string[] {
  const lines = maintenanceLines(asset, t, lang, now);
  if (lines.length === 0) return [t.noSchedule];
  if (compact && lines.length > 1) {
    return [
      t.maintCompactDual
        .replace('{days}', lines[0].short)
        .replace('{km}', lines[1].short),
    ];
  }
  return lines.map((l) => l.text);
}
