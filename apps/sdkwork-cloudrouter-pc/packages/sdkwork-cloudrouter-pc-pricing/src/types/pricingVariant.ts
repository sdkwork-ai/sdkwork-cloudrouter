import type { TFunction } from 'i18next';
import type { OfficialPricingRate } from './pricing';

export type PricingRateVariantKey = 'standard' | 'peak' | 'off_peak' | 'batch' | 'time_window';

export type PricingSchedule = NonNullable<OfficialPricingRate['schedule']>;

/**
 * Classify a published official rate as the standard fallback, a peak window,
 * an off-peak window, or an unclassified time window. The window code prefix is
 * the catalog's stable convention (`peak_*` / `off_peak_*`).
 */
export function pricingRateVariantKey(rate: Pick<OfficialPricingRate, 'rateVariant' | 'schedule'>): PricingRateVariantKey {
  if (rate.rateVariant === 'batch') {
    return 'batch';
  }
  if (rate.rateVariant !== 'time_window') {
    return 'standard';
  }
  const codes = rate.schedule?.weeklyWindows.map((window) => window.windowCode) ?? [];
  if (codes.length > 0 && codes.every((code) => code.startsWith('peak'))) {
    return 'peak';
  }
  if (codes.length > 0 && codes.every((code) => code.startsWith('off_peak'))) {
    return 'off_peak';
  }
  return 'time_window';
}

export function pricingRateVariantLabelKey(variant: PricingRateVariantKey): string {
  switch (variant) {
    case 'peak':
      return 'pricing.variant.peak';
    case 'off_peak':
      return 'pricing.variant.offPeak';
    case 'batch':
      return 'pricing.variant.batch';
    case 'time_window':
      return 'pricing.variant.timeWindow';
    case 'standard':
    default:
      return 'pricing.variant.standard';
  }
}

export function pricingRateVariantLabel(
  rate: Pick<OfficialPricingRate, 'rateVariant' | 'schedule'>,
  t: TFunction,
): string {
  const variant = pricingRateVariantKey(rate);
  return t(pricingRateVariantLabelKey(variant));
}

/** Mirrors the server's `PricingSchedule::matched_window_code` evaluation. */
export function pricingScheduleMatchesAt(schedule: PricingSchedule, now = Date.now()): boolean {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(now)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  } catch {
    return false;
  }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  if (schedule.excludeDates.includes(date)) return false;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  const weekday = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[parts.weekday];
  if (!weekday) return false;
  if (schedule.holidayDates.includes(date)) {
    return schedule.weeklyWindows.some((window) => window.holidayOnly);
  }
  return schedule.weeklyWindows.some((window) => {
    if (window.holidayOnly) return false;
    const crossesMidnight = window.endDayOffset === 1;
    const beforeEnd = time < normalizeClock(window.endTime);
    const startDate = crossesMidnight && beforeEnd ? shiftIsoDate(date, -1) : date;
    if (schedule.excludeDates.includes(startDate) || schedule.holidayDates.includes(startDate)) return false;
    const scheduledDay = window.daysOfWeek.includes(weekdayForIsoDate(startDate));
    if (!scheduledDay && !schedule.includeDates.includes(startDate)) return false;
    const start = normalizeClock(window.startTime);
    const end = normalizeClock(window.endTime);
    return crossesMidnight ? time >= start || time < end : time >= start && time < end;
  });
}

export function pricingRateIsActiveAt(rate: OfficialPricingRate, now = Date.now()): boolean {
  return rate.rateVariant === 'time_window' && rate.schedule !== null && rate.schedule !== undefined
    ? pricingScheduleMatchesAt(rate.schedule, now)
    : false;
}

/** Short human-readable schedule summary used in table tooltips. */
export function formatPricingScheduleLines(
  schedule: PricingSchedule | null | undefined,
  t: TFunction,
): string[] {
  if (!schedule?.weeklyWindows.length) return [];
  const lines = [t('pricing.variant.timezone', { timeZone: schedule.timeZone })];
  for (const window of schedule.weeklyWindows) {
    const days = [...window.daysOfWeek]
      .sort((left, right) => left - right)
      .map((day) => t(`pricing.weekday.${day}`))
      .join(t('pricing.variant.daySeparator', { defaultValue: ', ' }));
    const start = window.startTime.slice(0, 5);
    const end = window.endTime.slice(0, 5);
    const crosses = window.endDayOffset === 1 ? t('pricing.variant.crossMidnight', { defaultValue: ' (+1 day)' }) : '';
    const holidayOnly = window.holidayOnly ? `${t('pricing.variant.holidayOnly')} · ` : '';
    lines.push(`${holidayOnly}${days} ${start}–${end}${crosses}`);
  }
  if (schedule.holidayDates.length > 0) {
    lines.push(t('pricing.variant.holidayCount', { count: schedule.holidayDates.length }));
  }
  return lines;
}

function normalizeClock(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayForIsoDate(value: string): number {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
