function normalizePortalPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }
  const withoutHash = trimmed.split('#', 1)[0] ?? '';
  const withoutQuery = withoutHash.split('?', 1)[0] ?? '';
  const normalized = withoutQuery.replace(/^\/+/, '');
  return `/${normalized}`;
}

function readOrigin(baseHref: string | undefined): string {
  const href = baseHref?.trim() || globalThis.location?.href || '';
  if (!href) {
    return '';
  }

  try {
    return new URL(href).origin;
  } catch {
    return '';
  }
}

export function buildPortalShareUrl(path: string, baseHref?: string): string {
  const normalizedPath = normalizePortalPath(path);
  const origin = readOrigin(baseHref);
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}
