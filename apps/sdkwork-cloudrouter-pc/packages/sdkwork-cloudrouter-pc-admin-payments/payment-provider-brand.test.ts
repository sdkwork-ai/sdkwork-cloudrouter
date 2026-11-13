/**
 * Brand-resolution guard for the admin payment provider inventory.
 *
 * The tile column is the operator's main recognition cue, so the fallback rules
 * must not regress silently: a missing mark has to degrade to a stable monogram,
 * a sandbox code must never borrow a real provider's mark, and every embedded
 * mark has to stay a single, valid 24x24 path instead of a partially generated
 * icon.
 *
 * Run: node --import tsx --test payment-provider-brand.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  paymentProviderBrandCodes,
  paymentProviderBrandInk,
  providerMonogram,
  resolvePaymentProviderBrand,
} from './src/payment-provider-brand';
import { PAYMENT_PROVIDER_BRAND_ICONS } from './src/components/payment-provider-brand-icons.generated';

const PROVIDER_CODES_ON_SCREEN = ['stripe', 'alipay', 'wechat_pay', 'paypal', 'apple_pay', 'google_pay'];

test('every provider shown in the default inventory resolves to a brand mark', () => {
  for (const code of PROVIDER_CODES_ON_SCREEN) {
    const brand = resolvePaymentProviderBrand(code);
    assert.equal(brand.kind, 'brand', `${code} must resolve to a brand mark`);
    if (brand.kind === 'brand') {
      assert.ok(brand.icon.path.length > 40, `${code} path must be real path data`);
      assert.match(brand.icon.hex, /^[0-9A-F]{6}$/, `${code} must carry a brand colour`);
    }
  }
});

test('sandbox codes never borrow a real provider mark', () => {
  for (const code of ['sandbox', 'sandbox_test', 'SANDBOX']) {
    assert.equal(resolvePaymentProviderBrand(code).kind, 'sandbox', `${code} must render the sandbox glyph`);
  }
});

test('unknown providers degrade to a deterministic monogram', () => {
  const first = resolvePaymentProviderBrand('yeepay');
  const second = resolvePaymentProviderBrand('yeepay');
  assert.deepEqual(first, second);
  assert.equal(first.kind, 'monogram');
  assert.equal(providerMonogram('yeepay'), 'YE');
  assert.equal(providerMonogram('jd_pay'), 'JP');
  assert.equal(providerMonogram('china_ums'), 'CU');
  assert.equal(providerMonogram('lianlian_pay'), 'LP');
  assert.equal(providerMonogram(''), '?');
  assert.equal(providerMonogram('---'), '?');
});

test('full-bleed app-icon squares are flagged so the tile can draw them edge to edge', () => {
  for (const code of ['alipay', 'square', 'phonepe', 'afterpay', 'meituan_pay', 'mi_pay']) {
    const brand = resolvePaymentProviderBrand(code);
    assert.equal(brand.kind, 'brand');
    if (brand.kind === 'brand') {
      assert.equal(brand.icon.bleed, true, `${code} fills its 24x24 box and must bleed`);
    }
  }
  // A floating mark must not be clipped by the tile.
  const stripe = resolvePaymentProviderBrand('stripe');
  assert.equal(stripe.kind, 'brand');
  if (stripe.kind === 'brand') {
    assert.equal(stripe.icon.bleed, undefined);
  }
});

test('light brand colours carry a legible ink override', () => {
  const klarna = PAYMENT_PROVIDER_BRAND_ICONS.klarna;
  assert.equal(paymentProviderBrandInk(klarna), '#17120F');
  assert.equal(paymentProviderBrandInk(PAYMENT_PROVIDER_BRAND_ICONS.stripe), '#635BFF');
});

test('brand colours match the published official value', () => {
  // Regression guard for the "official icon" requirement: these are the values
  // published by simple-icons (cdn.simpleicons.org/<slug>), not hand-picked
  // approximations. A drifting colour is a brand-guideline bug, not a nit.
  const expected: Record<string, string> = {
    stripe: '635BFF',
    alipay: '1677FF',
    wechat_pay: '07C160',
    paypal: '002991',
    apple_pay: '000000',
    google_pay: '4285F4',
    square: '3E4348',
    huawei_pay: 'FF0000',
    paytm: '20336B',
    naver_pay: '03C75A',
    zalo_pay: '0068FF',
    line_pay: '00C300',
    rakuten_pay: 'BF0000',
  };
  for (const [code, hex] of Object.entries(expected)) {
    const brand = resolvePaymentProviderBrand(code);
    assert.equal(brand.kind, 'brand', `${code} must resolve to a brand mark`);
    if (brand.kind === 'brand') {
      assert.equal(brand.icon.hex, hex, `${code} must use its official brand colour`);
    }
  }
});

test('every embedded mark is a single usable 24x24 path', () => {
  const codes = paymentProviderBrandCodes();
  assert.ok(codes.length >= PROVIDER_CODES_ON_SCREEN.length);
  for (const code of codes) {
    const icon = PAYMENT_PROVIDER_BRAND_ICONS[code as keyof typeof PAYMENT_PROVIDER_BRAND_ICONS];
    assert.match(icon.path, /^[Mm]/, `${code} path must start with a moveto command`);
    assert.ok(!icon.path.includes('<'), `${code} path must be bare path data`);
    assert.match(icon.hex, /^[0-9A-F]{6}$/, `${code} hex must be a bare 6-digit colour`);
    if (icon.ink !== undefined) {
      assert.match(icon.ink, /^[0-9A-F]{6}$/, `${code} ink must be a bare 6-digit colour`);
    }
  }
});
