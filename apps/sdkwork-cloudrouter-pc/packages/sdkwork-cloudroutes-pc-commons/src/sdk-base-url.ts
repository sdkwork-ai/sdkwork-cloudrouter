import { resolveBaseUrl } from '@sdkwork/sdk-common';
export { resolveBrowserReachableBaseUrl } from './browser-base-url.ts';

/**
 * Reduce a generated SDK base url to its bare origin, stripping any sdk-owned
 * path suffix (e.g. `/app/v3/api`). Delegates to @sdkwork/sdk-common's
 * resolveBaseUrl normalization, eliminating the self-implemented strip logic.
 */
export function normalizeGeneratedSdkBaseUrl(baseUrl: string, _apiPrefix: string): string {
  return resolveBaseUrl({ baseUrls: [baseUrl] }).url;
}
