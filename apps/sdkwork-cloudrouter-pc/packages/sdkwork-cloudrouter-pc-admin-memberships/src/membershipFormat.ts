/**
 * Format a date-time string (typically ISO 8601 from the API) into the
 * effective display locale.
 *
 * Admin tables are scanned vertically, so the time is always rendered on a
 * 24-hour clock: mixing `AM/PM` into a column of timestamps makes the values
 * harder to compare across rows. Returns the raw value when it cannot be
 * parsed, and a placeholder dash for empty values.
 */
export function formatMembershipDateTime(
  value: string | null | undefined,
  locale?: string,
): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
