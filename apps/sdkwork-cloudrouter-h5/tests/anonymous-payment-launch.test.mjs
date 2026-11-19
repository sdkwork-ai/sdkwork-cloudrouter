/**
 * No-login cashier device matrix.
 *
 * The cashier must offer the method the *device* can actually complete: JSAPI in
 * WeChat, Alipay WAP in the Alipay webview, H5 trades in a plain mobile browser,
 * and native QR trades on desktop. These tests pin that contract and the launch
 * projection (jsapi / qr / redirect), because a wrong projection silently turns
 * a payable link into a dead end.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const {
  resolveAnonymousMethodOptions,
  resolveCashierLaunch,
} = await import(
  '../packages/sdkwork-cloudrouter-h5-orders/src/anonymousPaymentLaunch.ts'
);

const ALL = ['wechat_pay', 'wechat_h5', 'wechat_jsapi', 'alipay', 'alipay_wap'];

test('WeChat webview launches JSAPI and falls back to WeChat H5', () => {
  assert.deepEqual(
    resolveAnonymousMethodOptions('wechat', ALL, true).map((option) => option.method),
    ['wechat_jsapi'],
  );
  assert.deepEqual(
    resolveAnonymousMethodOptions('wechat', ['wechat_h5'], true).map((option) => option.method),
    ['wechat_h5'],
  );
  assert.deepEqual(resolveAnonymousMethodOptions('wechat', ['alipay_wap'], true), []);
});

test('Alipay webview launches the in-app WAP cashier only', () => {
  assert.deepEqual(
    resolveAnonymousMethodOptions('alipay', ALL, true).map((option) => option.method),
    ['alipay_wap'],
  );
});

test('a plain mobile browser launches provider H5 trades', () => {
  assert.deepEqual(
    resolveAnonymousMethodOptions('web', ALL, true).map((option) => option.method),
    ['wechat_h5', 'alipay_wap'],
  );
});

test('a desktop browser gets native QR trades, never a mobile H5 redirect', () => {
  assert.deepEqual(
    resolveAnonymousMethodOptions('web', ALL, false).map((option) => option.method),
    ['wechat_pay', 'alipay'],
  );
  assert.deepEqual(resolveAnonymousMethodOptions('web', ['wechat_h5', 'alipay_wap'], false), []);
});

test('launch projection keeps JSAPI, native QR and WAP redirects distinct', () => {
  assert.deepEqual(
    resolveCashierLaunch({
      paymentMethod: 'wechat_jsapi',
      paymentParams: { jsapiPayload: '{"appId":"wx","paySign":"s"}' },
    }),
    { kind: 'jsapi', payload: { appId: 'wx', paySign: 's' } },
  );
  assert.deepEqual(
    resolveCashierLaunch({
      paymentMethod: 'wechat_pay',
      paymentParams: { qrCodePayload: 'weixin://wxpay/bizpayurl?pr=abc' },
    }),
    { kind: 'qr', payload: 'weixin://wxpay/bizpayurl?pr=abc' },
  );
  assert.deepEqual(
    resolveCashierLaunch({
      paymentMethod: 'alipay',
      paymentParams: { qrCodeUrl: 'https://qr.alipay.com/abc' },
    }),
    { kind: 'qr', payload: 'https://qr.alipay.com/abc' },
  );
  assert.deepEqual(
    resolveCashierLaunch({
      paymentMethod: 'alipay_wap',
      paymentParams: { payUrl: 'https://openapi.alipay.com/gateway.do?...' },
    }),
    { kind: 'redirect', url: 'https://openapi.alipay.com/gateway.do?...' },
  );
  // The cashier's own capability URL must never become QR content: scanning it
  // would reopen the cashier instead of paying.
  assert.deepEqual(
    resolveCashierLaunch({
      paymentMethod: 'wechat_pay',
      paymentParams: { cashierUrl: 'https://h5.example.com/cashier/v1.token' },
    }),
    { kind: 'unavailable' },
  );
});
