/**
 * Contract tests for the payment record / refund record query translation and
 * the payment money formatter.
 *
 * These are the two places where a small mistake is expensive: a dropped filter
 * silently returns other tenants'/other currencies' rows, and an amount that is
 * not scaled by its currency exponent misstates money in a finance console.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentRecordListQuery,
  buildRefundListQuery,
  isRefundReasonCode,
  isRefundStatus,
  toRfc3339OrUndefined,
} from './src/services/paymentRecordsQuery';
import {
  buildCsvContent,
  buildCsvFileName,
  escapeCsvCell,
} from './src/services/paymentRecordsExport';
import {
  currencyMinorUnitExponent,
  formatPaymentAmount,
  minorUnitsToDecimalString,
} from './src/paymentMoney';

test('payment record query forwards every structured filter', () => {
  const query = buildPaymentRecordListQuery({
    page: 2,
    pageSize: 50,
    search: '  PI-1001  ',
    filters: {
      status: 'succeeded',
      providerCode: 'stripe',
      currencyCode: ' USD ',
      orderId: 'order-1',
      ownerUserId: '42',
      createdAfter: '2026-03-01T08:00',
      createdBefore: '2026-03-02T08:00',
    },
  });
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 50);
  assert.equal(query.q, 'PI-1001');
  assert.equal(query.status, 'succeeded');
  assert.equal(query.providerCode, 'stripe');
  assert.equal(query.currencyCode, 'USD');
  assert.equal(query.orderId, 'order-1');
  assert.equal(query.ownerUserId, '42');
  // datetime-local values are interpreted in the caller's zone, then sent as UTC.
  assert.match(String(query.createdAfter), /^2026-03-0[12]T.*Z$/);
  assert.ok(String(query.createdBefore).endsWith('Z'));
});

test('blank and malformed filter values never narrow the query', () => {
  const query = buildPaymentRecordListQuery({
    filters: {
      status: '   ',
      providerCode: '',
      currencyCode: '',
      orderId: '',
      ownerUserId: '',
      createdAfter: 'not-a-date',
      createdBefore: '',
    },
  });
  assert.deepEqual(query, {});
  assert.equal(toRfc3339OrUndefined('   '), undefined);
  assert.equal(toRfc3339OrUndefined('2026-13-45'), undefined);
});

test('refund query only forwards enum values the backend accepts', () => {
  const query = buildRefundListQuery({
    search: 'RF-9',
    filters: {
      status: 'succeeded',
      reasonCode: 'fraud',
      providerCode: 'alipay',
      currencyCode: 'cny',
      paymentIntentId: 'intent-1',
    },
  });
  assert.equal(query.q, 'RF-9');
  assert.equal(query.status, 'succeeded');
  assert.equal(query.reasonCode, 'fraud');
  assert.equal(query.providerCode, 'alipay');
  assert.equal(query.currencyCode, 'cny');
  assert.equal(query.paymentIntentId, 'intent-1');

  const rejected = buildRefundListQuery({
    filters: { status: 'refunded', reasonCode: 'because' },
  });
  assert.equal(rejected.status, undefined);
  assert.equal(rejected.reasonCode, undefined);
  assert.equal(isRefundStatus('refunded'), false);
  assert.equal(isRefundReasonCode('because'), false);
});

test('minor-unit amounts are scaled by their currency exponent', () => {
  assert.equal(currencyMinorUnitExponent('CNY'), 2);
  assert.equal(currencyMinorUnitExponent('jpy'), 0);
  assert.equal(currencyMinorUnitExponent('KWD'), 3);
  assert.equal(currencyMinorUnitExponent(''), 2);

  assert.equal(minorUnitsToDecimalString('1250', 2), '12.50');
  assert.equal(minorUnitsToDecimalString('5', 2), '0.05');
  assert.equal(minorUnitsToDecimalString('-1250', 2), '-12.50');
  assert.equal(minorUnitsToDecimalString('1250', 0), '1250');
  assert.equal(minorUnitsToDecimalString('1250', 3), '1.250');
  assert.equal(minorUnitsToDecimalString('12.50', 2), null);
  assert.equal(minorUnitsToDecimalString(null, 2), null);
});

test('payment amounts render currency-aware and never silently rescale odd input', () => {
  assert.equal(formatPaymentAmount('1250', 'CNY', 'en-US'), '¥12.50');
  assert.equal(formatPaymentAmount('1250', 'JPY', 'en-US'), '¥1,250');
  assert.equal(formatPaymentAmount('5', 'USD', 'en-US'), '$0.05');
  assert.equal(formatPaymentAmount('1250', '', 'en-US'), '12.50');
  assert.equal(formatPaymentAmount('', 'CNY'), '-');
  assert.equal(formatPaymentAmount(null, 'CNY'), '-');
  // 历史/异常形态（带小数）原样回显并标注币种，而不是再乘/除 100。
  assert.equal(formatPaymentAmount('12.50', 'CNY'), '12.50 CNY');
  assert.equal(formatPaymentAmount('1250', 'XYZ'), '12.50 XYZ');
});

test('csv cells are quoted per RFC 4180 and rows are CRLF separated', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('a,b'), '"a,b"');
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvCell('line\nbreak'), '"line\nbreak"');
  assert.equal(escapeCsvCell(null), '');

  const content = buildCsvContent(['a', 'b'], [['1', 'x,y']]);
  assert.equal(content, 'a,b\r\n1,"x,y"');
});

test('csv file names are sortable and extension-stable', () => {
  const name = buildCsvFileName('payment-records', new Date(2026, 2, 1, 9, 5));
  assert.equal(name, 'payment-records-20260301-0905.csv');
});
