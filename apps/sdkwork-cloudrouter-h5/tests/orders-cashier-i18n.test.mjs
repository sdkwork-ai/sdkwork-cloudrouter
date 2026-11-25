/**
 * Cashier business copy and the order-subject display contract for the H5 host.
 *
 * The reported defect: a scanned membership cashier rendered the raw order
 * subject wire code (`membership`) instead of localized copy, and the H5
 * `commerce/orders` fragment was never registered, so every order/cashier
 * string silently fell back to an inline Chinese default in both locales.
 *
 * These tests pin the three facts a fix has to keep true:
 * 1. the H5 console registry merges the order fragment for every locale;
 * 2. every `orders.*` key the order and cashier surfaces ask for exists in
 *    both locales (no silent Chinese fallback in en-US);
 * 3. every canonical order subject (`sdkwork-order`
 *    `ACCOUNT_VALUE_ORDER_SPEC.md` §2.1/§2.2) renders a localized business
 *    label, never the wire code.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const H5_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(H5_ROOT, './../../..');

const ORDER_MOBILE_SRC = path.join(
  WORKSPACE_ROOT,
  'sdkwork-order/apps/sdkwork-order-common/packages/sdkwork-order-mobile-react-orders/src',
);

function readH5(relativePath) {
  return readFileSync(path.join(H5_ROOT, relativePath), 'utf8');
}

/** Reads a file from the sibling `sdkwork-order` checkout. */
function readOrderMobile(relativePath) {
  return readFileSync(path.join(ORDER_MOBILE_SRC, relativePath), 'utf8');
}

function walkOrderMobile(dir = ORDER_MOBILE_SRC) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkOrderMobile(absolute));
    } else if (/\.(ts|tsx)$/u.test(entry.name) && !/\.test\./u.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

const zhOrders = (
  await import(
    '../packages/sdkwork-cloudrouter-h5-i18n/src/i18n/zh-CN/cloudrouter/commerce/orders.ts'
  )
).ordersMessages;
const enOrders = (
  await import(
    '../packages/sdkwork-cloudrouter-h5-i18n/src/i18n/en-US/cloudrouter/commerce/orders.ts'
  )
).ordersMessages;
const { localizeOrderTitle } = await import(
  pathToFileURL(path.join(ORDER_MOBILE_SRC, 'services/orderTitle.ts')).href
);

/** Minimal `t` over one flat catalog: key, else default, else key. */
function translatorFor(messages) {
  return (key, defaultValue) => messages[key] ?? defaultValue ?? key;
}

/** Every canonical order subject with its authored en-US/zh-CN label. */
const SUBJECTS = [
  ['product', 'Product Order', '商品订单'],
  ['virtual_goods', 'Virtual Goods Order', '虚拟商品订单'],
  ['membership', 'Membership Subscription', '会员订阅'],
  ['points_recharge', 'Membership Points Recharge', '会员积分充值'],
  ['token_bank_recharge', 'Token Bank Recharge', 'Token Bank 充值'],
  ['token_bank_plan_purchase', 'Token Bank Plan Purchase', 'Token Bank 套餐购买'],
  ['token_bank_plan_renewal', 'Token Bank Plan Renewal', 'Token Bank 套餐续订'],
  ['account_recharge_package', 'Account Value Package Recharge', '账户价值包充值'],
  ['coupon_recharge', 'Coupon Recharge', '兑换码充值'],
  ['refund_request', 'Refund Request', '退款申请'],
  ['cash_withdrawal', 'Cash Withdrawal', '提现申请'],
];

/** `orders.*` keys the source references through `t(...)`. */
function referencedOrderKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\(\s*["'](orders\.[A-Za-z0-9_.]+)["']/gu)) {
    keys.add(match[1]);
  }
  return keys;
}

/** True when the catalog owns the key or its plural family. */
function catalogOwns(messages, key) {
  return typeof messages[key] === 'string' || typeof messages[`${key}_other`] === 'string';
}

test('the H5 console registry merges the order/cashier fragment for every locale', () => {
  const registry = readH5('packages/sdkwork-cloudrouter-h5-i18n/src/i18n/index.ts');

  assert.match(registry, /from '\.\/zh-CN\/cloudrouter\/commerce\/orders\.js'/u);
  assert.match(registry, /from '\.\/en-US\/cloudrouter\/commerce\/orders\.js'/u);
  assert.match(registry, /\.\.\.ZhCnOrders/u);
  assert.match(registry, /\.\.\.EnUsOrders/u);
  // The fragment is the only owner of `orders.*`; a duplicate spread would make
  // one locale silently win over the other.
  assert.equal(registry.match(/\.\.\.ZhCnOrders/gu)?.length, 1);
  assert.equal(registry.match(/\.\.\.EnUsOrders/gu)?.length, 1);
});

test('the host-owned cashier pages resolve every string from the order catalog', () => {
  for (const page of [
    'packages/sdkwork-cloudrouter-h5-orders/src/AnonymousCashierPage.tsx',
    'packages/sdkwork-cloudrouter-h5-orders/src/CashierEntryErrorPage.tsx',
  ]) {
    for (const key of referencedOrderKeys(readH5(page))) {
      assert.ok(
        catalogOwns(zhOrders, key),
        `${page} renders ${key} without zh-CN copy`,
      );
      assert.ok(
        catalogOwns(enOrders, key),
        `${page} renders ${key} without en-US copy`,
      );
    }
  }
});

test('the order UI shipped by the order capability is fully covered by both locales', () => {
  const missingZh = [];
  const missingEn = [];
  for (const file of walkOrderMobile()) {
    for (const key of referencedOrderKeys(readFileSync(file, 'utf8'))) {
      if (!catalogOwns(zhOrders, key)) missingZh.push(`${path.basename(file)}:${key}`);
      if (!catalogOwns(enOrders, key)) missingEn.push(`${path.basename(file)}:${key}`);
    }
  }
  assert.deepEqual(missingZh, [], 'zh-CN catalog is missing keys used by the order UI');
  assert.deepEqual(missingEn, [], 'en-US catalog is missing keys used by the order UI');
});

test('both locales expose the same order keys (no locale-only drift)', () => {
  const zhOnly = Object.keys(zhOrders).filter((key) => !(key in enOrders));
  const enOnly = Object.keys(enOrders).filter((key) => !(key in zhOrders));
  assert.deepEqual(zhOnly, [], 'zh-CN keys with no en-US translation');
  assert.deepEqual(enOnly, [], 'en-US keys with no zh-CN translation');
});

/**
 * Key families the order UI composes at runtime (`orders.status_${status}`,
 * `orders.payment_method_${method}`, …). A missing member silently falls back
 * to inline Chinese copy or to the raw wire code.
 */
const DYNAMIC_KEY_FAMILIES = [
  ['orders.payment_method_', ['wechat_pay', 'wechat_h5', 'wechat_jsapi', 'alipay', 'alipay_wap', 'balance', 'paypal', 'stripe_card']],
  ['orders.status_', ['pending_payment', 'paid', 'fulfilled', 'completed', 'cancelled', 'expired', 'refunding', 'refunded']],
  ['orders.refund_asset_', ['points', 'token_bank', 'cash']],
  ['orders.refund_status_', ['requested', 'processing', 'approved', 'rejected', 'refunded', 'paid_out', 'completed']],
  ['orders.refund_reason_', ['none', 'quality', 'not_received', 'not_as_described', 'damaged', 'other']],
  ['orders.shipment_carrier_', ['sf', 'yt', 'zto', 'yunda', 'ems', 'jd', 'unknown']],
  ['orders.shipment_status_', ['created', 'in_transit', 'delivered']],
];

test('every dynamically composed order key resolves in both locales', () => {
  for (const [prefix, codes] of DYNAMIC_KEY_FAMILIES) {
    for (const code of codes) {
      const key = `${prefix}${code}`;
      assert.equal(typeof zhOrders[key], 'string', `zh-CN catalog is missing ${key}`);
      assert.equal(typeof enOrders[key], 'string', `en-US catalog is missing ${key}`);
      assert.ok(zhOrders[key].length > 0, `zh-CN ${key} is empty`);
      assert.ok(enOrders[key].length > 0, `en-US ${key} is empty`);
    }
  }

  // Account-asset labels keep the canonical taxonomy: `points` is Membership
  // Points / 会员积分 and `token_bank` is Token Bank — never the reverse.
  assert.equal(zhOrders['orders.refund_asset_points'], '会员积分');
  assert.equal(enOrders['orders.refund_asset_points'], 'Membership Points');
  assert.equal(zhOrders['orders.refund_asset_token_bank'], 'Token Bank');
  assert.equal(enOrders['orders.refund_asset_token_bank'], 'Token Bank');
});

test('every canonical order subject renders a localized business label', () => {
  const en = translatorFor(enOrders);
  const zh = translatorFor(zhOrders);

  for (const [code, enLabel, zhLabel] of SUBJECTS) {
    assert.equal(
      localizeOrderTitle(code, en),
      enLabel,
      `en-US must render ${code} as its business label, not the wire code`,
    );
    assert.equal(
      localizeOrderTitle(code, zh),
      zhLabel,
      `zh-CN must render ${code} as its business label, not the wire code`,
    );
    // The defect: the payer saw the wire code itself.
    assert.notEqual(localizeOrderTitle(code, en), code);
    assert.notEqual(localizeOrderTitle(code, zh), code);
  }

  // Display-label aliases (backends that store a label instead of a code) and
  // free-form merchandising titles round-trip through the same contract.
  assert.equal(localizeOrderTitle('Membership', zh), '会员订阅');
  assert.equal(localizeOrderTitle('membership subscription', en), 'Membership Subscription');
  assert.equal(localizeOrderTitle('VIP', en), 'Membership Subscription');
  assert.equal(localizeOrderTitle('Points Recharge', en), 'Membership Points Recharge');
  assert.equal(localizeOrderTitle('黄金会员月卡', zh), '黄金会员月卡');
  assert.equal(localizeOrderTitle('Token Bank 100', en), 'Token Bank 100');
  assert.equal(localizeOrderTitle('', zh), '');
});

test('the no-login cashier never renders the raw order subject code', () => {
  const page = readH5('packages/sdkwork-cloudrouter-h5-orders/src/AnonymousCashierPage.tsx');

  assert.match(page, /localizeOrderTitle\(subject, t\)/u);
  assert.match(page, /\{localizedSubject \?/u);
  // The reported regression: `view.subject` piped straight into the summary line.
  assert.doesNotMatch(page, /\{subject\}/u);
});
