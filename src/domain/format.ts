import { Lang } from '../i18n/strings';

export function parseDigits(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function parseNumber(raw: string): number | null {
  const digits = parseDigits(raw);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function formatInt(n: number, lang: Lang): string {
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatIntInput(digits: string, lang: Lang): string {
  const n = parseNumber(digits);
  return n == null ? '' : formatInt(n, lang);
}

export function formatKm(n: number, lang: Lang): string {
  return `${formatInt(n, lang)} km`;
}

export function yearLine(asset: {
  manufactureYear?: number | null;
  purchaseYear?: number | null;
}): string {
  const made = asset.manufactureYear;
  const bought = asset.purchaseYear;
  if (made && bought && made !== bought) return `${made} · ${bought}`;
  if (made) return String(made);
  if (bought) return String(bought);
  return '';
}

export function brandModelLine(asset: { brand?: string | null; model?: string | null }): string {
  return [asset.brand, asset.model]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}
