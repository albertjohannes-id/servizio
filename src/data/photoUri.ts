/** Cloud photo keys use the `r2:` prefix so they never collide with local file/blob URIs. */
export const R2_URI_PREFIX = 'r2:';

export type MediaKind = 'receipt' | 'service_tag';

export function isR2Uri(uri: string | null | undefined): boolean {
  return !!uri && uri.startsWith(R2_URI_PREFIX);
}

export function isLocalPhotoUri(uri: string | null | undefined): boolean {
  if (!uri || isR2Uri(uri)) return false;
  return (
    uri.startsWith('file:') ||
    uri.startsWith('blob:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph://') ||
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  );
}

export function toR2Uri(key: string): string {
  return `${R2_URI_PREFIX}${key}`;
}

export function r2KeyFromUri(uri: string): string | null {
  if (!isR2Uri(uri)) return null;
  return uri.slice(R2_URI_PREFIX.length);
}
