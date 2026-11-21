/**
 * Shared date + value formatting for the App Center surfaces.
 *
 * Lists, drawers, and detail inspectors print the same timestamps, so one
 * formatter keeps the absolute/relative shape and the empty placeholder
 * identical everywhere instead of each component re-implementing `toLocaleString`.
 */

/** Localized date + time, or the em-dash placeholder when absent/invalid. */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Localized date only, or the em-dash placeholder when absent/invalid. */
export function formatDate(value: string | undefined | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
