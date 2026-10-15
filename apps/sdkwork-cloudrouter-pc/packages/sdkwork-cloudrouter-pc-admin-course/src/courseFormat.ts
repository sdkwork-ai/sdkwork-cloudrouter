/**
 * Formatting helpers for the course admin surfaces. Course backend payloads are
 * untyped (`Record<string, unknown>`), so every numeric/count value arrives as a
 * string or number and is normalized here before it reaches the UI.
 */

const intlLocaleByLanguage: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
};

export function resolveCourseIntlLocale(language: string | undefined): string {
  const normalized = (language ?? 'en').trim().toLowerCase();
  return intlLocaleByLanguage[normalized] ?? normalized ?? 'en-US';
}

export function formatCourseCount(value: number | string | undefined): string {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(numeric);
}

export function formatCoursePercent(value: number | string | undefined): string {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  const isFraction = numeric > 0 && numeric <= 1;
  const percent = isFraction ? numeric * 100 : numeric;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(percent)}%`;
}

export function formatCourseDateTime(value: string | undefined, language: string | undefined): string {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return '-';
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return normalized;
  }
  return new Intl.DateTimeFormat(resolveCourseIntlLocale(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function formatCourseDuration(seconds: number | undefined): string {
  const total = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function truncateCourseText(value: string | undefined, maxLength = 80): string {
  const normalized = (value ?? '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}
