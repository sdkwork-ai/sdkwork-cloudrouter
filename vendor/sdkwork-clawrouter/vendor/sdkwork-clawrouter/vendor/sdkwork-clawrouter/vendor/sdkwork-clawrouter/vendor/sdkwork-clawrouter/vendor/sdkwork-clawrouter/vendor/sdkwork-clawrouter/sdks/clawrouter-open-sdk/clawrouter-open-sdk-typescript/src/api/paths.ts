export const AI_API_PREFIX = '/v1';

export function aiApiPath(path: string): string {
  if (!path) {
    return AI_API_PREFIX;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPrefixRaw = (AI_API_PREFIX || '').trim();
  const normalizedPrefix = normalizedPrefixRaw
    ? `/${normalizedPrefixRaw.replace(/^\/+|\/+$/g, '')}`
    : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedPrefix || normalizedPrefix === '/') {
    return normalizedPath;
  }
  if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath;
  }
  return `${normalizedPrefix}${normalizedPath}`;
}
