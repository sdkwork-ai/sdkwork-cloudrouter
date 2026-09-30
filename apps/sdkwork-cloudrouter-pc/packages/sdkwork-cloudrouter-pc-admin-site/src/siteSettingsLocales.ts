/**
 * The locales the site copy can be translated into.
 *
 * Kept in its own dependency-free module so the gates can read the list directly: the admin form,
 * the i18n resource bundle and the app's i18n runtime all have to agree on this set, and importing
 * the form's service module to get it would drag the whole SDK client graph into a source check.
 *
 * These are exactly the tags the backend accepts — `canonical_site_settings_locale` folds anything
 * else to `None` and the write path rejects it — so offering a tag outside this list would fail the
 * save instead of storing a translation nobody can reach.
 */
export const SITE_SETTINGS_LOCALES = [
  'en-US',
  'zh-CN',
  'de-DE',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
] as const;

export type SiteSettingsLocale = (typeof SITE_SETTINGS_LOCALES)[number];

/** Narrows a locale tag to one the backend accepts, so the editor cannot offer a rejected tag. */
export function isSiteSettingsLocale(tag: string): tag is SiteSettingsLocale {
  return (SITE_SETTINGS_LOCALES as readonly string[]).includes(tag);
}
