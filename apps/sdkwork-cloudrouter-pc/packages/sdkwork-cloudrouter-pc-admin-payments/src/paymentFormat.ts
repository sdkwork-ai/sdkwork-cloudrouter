import type { AdminResourceRecord } from '@sdkwork/cloudroutes-pc-commons';
import type { useTranslation } from 'react-i18next';

/** Translator signature shared by the payment admin surfaces. */
export type PaymentTranslate = ReturnType<typeof useTranslation>['t'];

/** i18n instance slice the reference-data resolvers need. */
export type PaymentI18nInstance = { language?: string };

/**
 * Resolves a localized reference-data name from the backend-provided
 * `*I18n` locale map (`{"zh-CN": "...", "en-US": "..."}`) using the current
 * i18n language, falling back to the base display name when the locale key
 * is absent. Locale candidates try the full tag first, then the language
 * part (`zh-CN` -> `zh`).
 */
export function formatLocalizedName(
  i18n: PaymentI18nInstance,
  record: AdminResourceRecord,
  i18nKey: string,
  fallback: unknown,
): string {
  const fallbackText = fallback === null || fallback === undefined ? '-' : String(fallback);
  const map = record[i18nKey];
  if (!map || typeof map !== 'object') {
    return fallbackText;
  }
  const language = i18n.language ?? '';
  const candidates = [language, language.split('-')[0]];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const localized = (map as Record<string, unknown>)[candidate];
    if (typeof localized === 'string' && localized.trim()) {
      return localized;
    }
  }
  return fallbackText;
}

/** Resolves a localized enum label (`value.status.active`), falling back to the raw code. */
export function formatPaymentEnumValue(t: PaymentTranslate, keyPrefix: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const raw = String(value);
  return t(`${keyPrefix}.${raw}`, { defaultValue: raw });
}

/** 时间字符串格式化为本地日期时间；无法解析时原样回退。 */
export function formatPaymentDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
