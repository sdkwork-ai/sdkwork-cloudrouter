/**
 * Package-local i18n resource helpers.
 *
 * Authority: `I18N_SPEC.md`. Platform monolithic resources must be assembled
 * from fragments and must not be hand-authored whole-root catalogs.
 */
export type CloudRouterHarmonyLocale = 'en-US' | 'zh-CN';

export function normalizeCloudRouterHarmonyLocale(value: string): CloudRouterHarmonyLocale {
  return value.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function resolveCloudRouterHarmonyMessage(
  fragment: Record<string, string>,
  key: string,
  fallback: string,
): string {
  const resolved: string | undefined = fragment[key];
  return resolved === undefined ? fallback : resolved;
}
