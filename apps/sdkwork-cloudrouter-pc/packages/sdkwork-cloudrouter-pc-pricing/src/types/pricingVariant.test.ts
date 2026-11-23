import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { OfficialPricingRate } from './pricing';
import {
  formatPricingScheduleLines,
  pricingRateIsActiveAt,
  pricingRateVariantKey,
  type PricingSchedule,
} from './pricingVariant';

const translate = ((key: string, options?: Record<string, unknown>) => {
  const timeZone = typeof options?.timeZone === 'string' ? options.timeZone : '';
  return timeZone ? `${key}:${timeZone}` : key;
}) as TFunction;

const holidayDates = ['2026-10-01'];
const peakSchedule: PricingSchedule = {
  timeZone: 'Asia/Shanghai',
  weeklyWindows: [
    { windowCode: 'peak_weekday_morning', daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '12:00:00', endDayOffset: 0, holidayOnly: false },
    { windowCode: 'peak_weekday_afternoon', daysOfWeek: [1, 2, 3, 4, 5], startTime: '14:00:00', endTime: '18:00:00', endDayOffset: 0, holidayOnly: false },
  ],
  includeDates: [],
  excludeDates: holidayDates,
  holidayDates: [],
};
const offPeakSchedule: PricingSchedule = {
  timeZone: 'Asia/Shanghai',
  weeklyWindows: [
    { windowCode: 'off_peak_weekday_night', daysOfWeek: [1, 2, 3, 4, 5], startTime: '18:00:00', endTime: '00:00:00', endDayOffset: 1, holidayOnly: false },
    { windowCode: 'off_peak_weekend', daysOfWeek: [6, 7], startTime: '00:00:00', endTime: '23:59:59', endDayOffset: 0, holidayOnly: false },
    { windowCode: 'off_peak_holiday', daysOfWeek: [1, 2, 3, 4, 5, 6, 7], startTime: '00:00:00', endTime: '23:59:59', endDayOffset: 0, holidayOnly: true },
  ],
  includeDates: [],
  excludeDates: [],
  holidayDates,
};

function rate(schedule: PricingSchedule | null, overrides: Partial<OfficialPricingRate> = {}): OfficialPricingRate {
  return {
    rateVariant: schedule ? 'time_window' : 'standard',
    schedule,
    ...overrides,
  } as OfficialPricingRate;
}

describe('official time-window pricing variant', () => {
  it('classifies peak, off-peak, batch, and standard rows', () => {
    expect(pricingRateVariantKey(rate(peakSchedule))).toBe('peak');
    expect(pricingRateVariantKey(rate(offPeakSchedule))).toBe('off_peak');
    expect(pricingRateVariantKey(rate(null, { rateVariant: 'batch' }))).toBe('batch');
    expect(pricingRateVariantKey(rate(null))).toBe('standard');  });

  it('matches the weekday peak windows in Asia/Shanghai', () => {
    // 2026-10-19 is a Monday. 02:00Z = 10:00 Beijing.
    expect(pricingRateIsActiveAt(rate(peakSchedule), Date.parse('2026-10-19T02:00:00Z'))).toBe(true);
    // 05:00Z = 13:00 Beijing, between the two peak windows.
    expect(pricingRateIsActiveAt(rate(peakSchedule), Date.parse('2026-10-19T05:00:00Z'))).toBe(false);
  });

  it('treats weekends and declared statutory holidays as off-peak', () => {
    const saturday = Date.parse('2026-10-24T02:00:00Z');
    const holiday = Date.parse('2026-10-01T02:00:00Z');
    expect(pricingRateIsActiveAt(rate(offPeakSchedule), saturday)).toBe(true);
    expect(pricingRateIsActiveAt(rate(offPeakSchedule), holiday)).toBe(true);
    expect(pricingRateIsActiveAt(rate(peakSchedule), holiday)).toBe(false);
  });

  it('summarizes the schedule and holiday calendar for display', () => {
    const lines = formatPricingScheduleLines(offPeakSchedule, translate);
    expect(lines[0]).toContain('Asia/Shanghai');
    expect(lines.some((line) => line.includes('pricing.variant.holidayOnly'))).toBe(true);
    expect(lines.some((line) => line.includes('pricing.variant.holidayCount'))).toBe(true);
  });
});
