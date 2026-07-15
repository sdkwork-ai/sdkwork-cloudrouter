import { isBlank, trim } from './sdkwork-utils.ts';
export { resolveBrowserReachableBaseUrl } from './browser-base-url.ts';

function normalizePrefix(prefix: string): string {
  const normalized = trim(prefix).replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '');
}

export function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const trimmedBaseUrl = trim(baseUrl);
  const normalizedPrefix = normalizePrefix(apiPrefix);
  if (isBlank(trimmedBaseUrl) || isBlank(normalizedPrefix)) {
    return trimmedBaseUrl;
  }

  const withoutTrailingSlash = stripTrailingSlash(trimmedBaseUrl);
  if (withoutTrailingSlash === normalizedPrefix) {
    return '';
  }
  if (withoutTrailingSlash.endsWith(normalizedPrefix)) {
    return stripTrailingSlash(withoutTrailingSlash.slice(0, -normalizedPrefix.length));
  }
  return withoutTrailingSlash;
}
