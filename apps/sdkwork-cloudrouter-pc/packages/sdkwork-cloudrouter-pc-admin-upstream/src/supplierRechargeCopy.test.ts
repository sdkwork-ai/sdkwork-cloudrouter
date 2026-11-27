import { describe, expect, it } from 'vitest';
import {
  formatRechargeMoney,
  formatRechargePoints,
  rechargeOrderIsOpen,
  rechargeOrderStatusKey,
  rechargePointsUnitLabelKey,
} from './supplierRechargeCopy';

/**
 * Guards the relay recharge dialog's presentation rules.
 *
 * The dialog renders relay-owned values, so the failure modes worth pinning are
 * the ones that would show an operator a wrong amount or a raw enum value: a
 * non-numeric amount must stay reviewable, terminal statuses must stop polling,
 * and unknown status vocabulary must degrade to "pending" instead of leaking.
 */
describe('relay recharge copy', () => {
  it('renders a major-unit amount with two fraction digits', () => {
    const formatted = formatRechargeMoney('10.00', 'CNY');
    expect(formatted).toMatch(/10[.,]00/);
    expect(formatted).toMatch(/¥|CNY|元/);
  });

  it('falls back to the raw amount when the relay sends a non-numeric value', () => {
    expect(formatRechargeMoney('not-a-number', 'CNY')).toBe('not-a-number CNY');
  });

  it('appends the resolved points unit only when one is available', () => {
    const formatted = formatRechargePoints(1000, 'points');
    expect(formatted.endsWith(' points')).toBe(true);
    expect(formatted.replace(/[^0-9]/g, '')).toBe('1000');
    expect(formatRechargePoints(0, '')).toBe('0');
  });

  it('stops polling for terminal relay statuses only', () => {
    for (const status of ['paid', 'failed', 'cancelled', 'CANCELED']) {
      expect(rechargeOrderIsOpen(status)).toBe(false);
    }
    for (const status of ['pending', 'pending_payment', 'processing', '']) {
      expect(rechargeOrderIsOpen(status)).toBe(true);
    }
  });

  it('maps order statuses onto dialog copy keys and never leaks vendor vocabulary', () => {
    expect(rechargeOrderStatusKey('paid')).toBe(
      'admin.upstream.supplier.recharge.order.status.paid',
    );
    expect(rechargeOrderStatusKey('cancelled')).toBe(
      'admin.upstream.supplier.recharge.order.status.cancelled',
    );
    expect(rechargeOrderStatusKey('unknown-vendor-status')).toBe(
      'admin.upstream.supplier.recharge.order.status.pending',
    );
  });

  it('translates the language-neutral POINTS unit through the console copy', () => {
    expect(rechargePointsUnitLabelKey('POINTS')).toBe(
      'admin.upstream.supplier.recharge.unit.points',
    );
    expect(rechargePointsUnitLabelKey('积分')).toBeNull();
  });
});
