import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { adminOrdersMessages } from '@sdkwork/order-pc-admin-orders/i18n';
import { adminTradeMessages } from '@sdkwork/order-pc-admin-trade/i18n';

import { consoleOrderSubjectMessages } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/order-subjects.ts';
import { mergeI18nBundles, withoutMessagePrefixes } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/merge.ts';
import { consoleRechargeMessages } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/recharge.ts';

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

/** Reads a file from a sibling workspace repository (for example `sdkwork-order`). */
function readSiblingRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');
}

function readRepoTreeFiles(relativePath: string, extension: string): { path: string; source: string }[] {
  const root = new URL(`../../${relativePath}/`, import.meta.url);
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith(extension))
    .map((entry) => entry.replaceAll('\\', '/'))
    .map((entry) => ({
      path: `${relativePath}/${entry}`,
      source: readFileSync(new URL(entry, root), 'utf8'),
    }));
}

/**
 * Semantic-integrity guards for the account value taxonomy
 * (`sdkwork-order/specs/ACCOUNT_VALUE_ORDER_SPEC.md` §2, `docs/domains/payments/account-asset-taxonomy.md`).
 *
 * These fail when a surface renders a raw wire code, renames the points asset
 * as Token Bank (or the reverse), or drops a subject/asset from a catalog.
 */

const SUBJECT_CODES = [
  'product',
  'virtual_goods',
  'membership',
  'points_recharge',
  'token_bank_recharge',
  'token_bank_plan_purchase',
  'token_bank_plan_renewal',
  'account_recharge_package',
  'coupon_recharge',
  'refund_request',
  'cash_withdrawal',
] as const;

const TARGET_ASSET_CODES = ['cash', 'points', 'subscription', 'token_bank'] as const;

test('console order list localizes the order subject instead of rendering the wire code', () => {
  const source = readPortalFile('./src/console-business/ConsoleSettlementsView.tsx');

  assert.match(source, /formatSubject\(order\.subject\)/);
  assert.doesNotMatch(source, /\{order\.subject\}/);
});

test('every PC surface resolves order subjects through the shared catalog', () => {
  const cashierSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-cashier/src/CloudRouterCashierPage.tsx',
  );

  // One catalog, not a per-surface alias table (the old map only covered 3 of 11 subjects).
  assert.match(cashierSource, /localizeSdkworkOrderSubject/);
  assert.doesNotMatch(cashierSource, /SUBJECT_KEYS/);
  for (const code of SUBJECT_CODES) {
    assert.doesNotMatch(
      cashierSource,
      new RegExp(`'${code}'\\s*:`),
      `cashier must not hand-map the ${code} subject`,
    );
  }
});

test('PC i18n defines every subject and asset label in both locales', () => {
  for (const locale of ['en', 'zh'] as const) {
    const bundle = consoleOrderSubjectMessages[locale] as Record<string, string>;
    for (const code of SUBJECT_CODES) {
      assert.ok(bundle[`orders.subject_${code}`], `${locale} is missing orders.subject_${code}`);
    }
    for (const code of TARGET_ASSET_CODES) {
      assert.ok(bundle[`orders.target_asset_${code}`], `${locale} is missing orders.target_asset_${code}`);
    }
    assert.doesNotMatch(bundle['orders.subject_points_recharge'], /token bank/i);
    assert.doesNotMatch(bundle['orders.subject_token_bank_recharge'], /membership points|会员积分/i);
  }
});

test('the flat host catalog owns orders.* copy exactly once', () => {
  // Both order admin modules ship the same `orders.*` labels for their own
  // providers; composing them raw in one flat catalog is the boot crash
  // (`Duplicate i18n key orders.subject_product in en bundle ...`).
  assert.throws(
    () => mergeI18nBundles([adminOrdersMessages, adminTradeMessages]),
    /Duplicate i18n key orders\.subject_product/,
  );

  const orderAdminCopies = [adminOrdersMessages, adminTradeMessages];
  const resources = mergeI18nBundles([
    ...orderAdminCopies.map((bundle) => withoutMessagePrefixes(bundle, ['orders.'])),
    consoleOrderSubjectMessages,
  ]);

  const en = resources.en.translation;
  const zh = resources.zh.translation;
  assert.equal(en['orders.subject_product'], 'Product order');
  assert.equal(zh['orders.subject_product'], '商品订单');
  assert.equal(en['orders.target_asset_cash'], 'Cash balance');
  assert.equal(zh['orders.target_asset_cash'], '现金余额');
  // The declaration only drops `orders.*`; module copy stays composed.
  assert.equal(en['admin.trade.workbench.title'], 'Trading Center Workbench');
  assert.equal(en['admin.orders.title'], 'Order supervision');

  // Dropping the module copy must not lose a label: the host bundle owns every
  // `orders.*` key the order modules ship, so a new module key fails here until
  // the host copy learns it.
  for (const bundle of orderAdminCopies) {
    for (const key of Object.keys(bundle.en).filter((entry) => entry.startsWith('orders.'))) {
      assert.ok(
        (consoleOrderSubjectMessages.en as Record<string, string>)[key],
        `host order-subject copy must own ${key}`,
      );
      assert.ok(
        (consoleOrderSubjectMessages.zh as Record<string, string>)[key],
        `host order-subject copy must own the zh value for ${key}`,
      );
    }
  }

  // `withoutMessagePrefixes` is a copy, never a mutation of the module bundle.
  assert.equal((adminOrdersMessages.en as Record<string, string>)['orders.subject_product'], 'Product order');
  assert.ok((adminTradeMessages.zh as Record<string, string>)['orders.target_asset_cash']);
});

test('withoutMessagePrefixes keeps required and optional locales aligned', () => {
  const bundle = {
    en: { 'orders.subject_product': 'Product order', 'admin.trade.list.reset': 'Reset' },
    zh: { 'orders.subject_product': '商品订单', 'admin.trade.list.reset': '重置' },
    ja: { 'admin.trade.list.reset': 'リセット' },
  };
  const filtered = withoutMessagePrefixes(bundle, ['orders.']);
  assert.deepEqual(Object.keys(filtered.en).sort(), ['admin.trade.list.reset']);
  assert.deepEqual(Object.keys(filtered.zh).sort(), ['admin.trade.list.reset']);
  assert.deepEqual(filtered.ja, { 'admin.trade.list.reset': 'リセット' });
  assert.deepEqual(Object.keys(bundle.en).sort(), ['admin.trade.list.reset', 'orders.subject_product']);
});

test('web orders bundle labels every canonical order subject', () => {
  for (const relativePath of [
    'apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-i18n/src/i18n/zh-CN/cloudrouter/commerce/orders.ts',
    'apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-i18n/src/i18n/en-US/cloudrouter/commerce/orders.ts',
  ]) {
    const source = readRepoFile(relativePath);
    for (const code of SUBJECT_CODES) {
      assert.match(
        source,
        new RegExp(`'orders\\.subject_${code}'`),
        `${relativePath} must localize the ${code} subject`,
      );
    }
  }
});

test('compute credit purchase surface no longer reuses the membership-points copy', () => {
  const tokenPlanSource = readPortalFile('./src/token-plan/CloudRouterTokenPlanCommerceModal.tsx');

  assert.doesNotMatch(tokenPlanSource, /t\(["']points_recharge\./);
  assert.match(tokenPlanSource, /t\(["']token_bank_recharge\.title["']/);

  const en = consoleRechargeMessages.en as Record<string, string>;
  const zh = consoleRechargeMessages.zh as Record<string, string>;

  for (const locale of [en, zh]) {
    for (const key of Object.keys(locale)) {
      if (!key.startsWith('token_bank_recharge.')) {
        continue;
      }
      assert.doesNotMatch(
        locale[key],
        /membership points|会员积分/iu,
        `${key} must describe Token Bank credits, not membership points`,
      );
    }
  }

  assert.equal(en['token_bank_recharge.title'], 'Top up Token Bank');
  assert.equal(zh['token_bank_recharge.title'], '购买 Token Bank 额度');
});

test('membership-points recharge copy stays available for the points wallet tab', () => {
  const en = consoleRechargeMessages.en as Record<string, string>;
  const zh = consoleRechargeMessages.zh as Record<string, string>;

  assert.equal(en['points_recharge.title'], 'Buy Membership Points');
  assert.equal(zh['points_recharge.title'], '会员积分购买');
});

test('ledger business types are labelled by their real asset', () => {
  const coreSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts',
  );

  // `points_recharge` is a membership-points ledger type, never a Token Bank top-up.
  for (const match of coreSource.matchAll(/["']console\.tokenBank\.businessTypes\.points_recharge["']:\s*["']([^"']+)["']/g)) {
    assert.doesNotMatch(match[1], /token bank/i);
  }
  for (const type of [
    'token_bank_purchase_credit',
    'token_bank_grant',
    'token_bank_reversal',
    'token_bank_debit',
    'points_recharge',
    'points_earn',
    'cash_adjustment',
  ]) {
    assert.match(
      coreSource,
      new RegExp(`console\\.tokenBank\\.businessTypes\\.${type}`),
      `ledger type ${type} must have a display label`,
    );
  }
});

test('Token Bank purchases are wired to the token_bank asset, never points', () => {
  const providersSource = readPortalFile(
    './packages/sdkwork-cloudroutes-pc-commons/src/domain-service-providers.ts',
  );
  const tokenPlanSource = readPortalFile('./src/token-plan/CloudRouterTokenPlanCommerceModal.tsx');
  const playgroundSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx',
  );

  assert.match(providersSource, /createSdkworkTokenBankRechargeService\(/);
  assert.match(providersSource, /export function getCloudRouterTokenBankRechargeService\(\)/);
  assert.match(tokenPlanSource, /getCloudRouterTokenBankRechargeService\(\)/);
  assert.match(playgroundSource, /pointsRechargeService:\s*getCloudRouterTokenBankRechargeService\(\)/);

  // The compute-credit surfaces must not fall back to the membership-points service.
  assert.doesNotMatch(tokenPlanSource, /getCloudRouterPointsRechargeService/);
  assert.doesNotMatch(playgroundSource, /getCloudRouterPointsRechargeService/);

  // The H5 Token Bank top-up books the Token Bank subject + asset server-priced.
  const h5PurchaseSource = readSiblingRepoFile(
    'sdkwork-order/apps/sdkwork-order-h5/packages/sdkwork-order-h5-core/src/sdk/SubscriptionPurchaseService.ts',
  );
  assert.match(h5PurchaseSource, /subject:\s*"token_bank_recharge"/);
  assert.match(h5PurchaseSource, /targetAsset:\s*"token_bank"/);
  assert.doesNotMatch(h5PurchaseSource, /subject:\s*"points_recharge"/);
});

test('no app copy names Token Bank as a points product', () => {
  const roots = [
    { path: 'apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-i18n/src', extension: '.ts' },
    { path: 'apps/sdkwork-cloudrouter-mini-program/src', extension: '.js' },
    { path: 'apps/sdkwork-cloudrouter-mini-program/src', extension: '.wxml' },
    { path: 'apps/sdkwork-cloudrouter-flutter-mobile/lib', extension: '.dart' },
    {
      path: 'apps/sdkwork-cloudrouter-flutter-mobile/packages/sdkwork_cloudrouter_flutter_mobile_console_dashboard/lib',
      extension: '.dart',
    },
    {
      path: 'apps/sdkwork-cloudrouter-flutter-mobile/packages/sdkwork_cloudrouter_flutter_mobile_console_profile/lib',
      extension: '.dart',
    },
  ];

  for (const root of roots) {
    for (const file of readRepoTreeFiles(root.path, root.extension)) {
      // 算力积分 is the retired conflation; the canonical zh names are
      // 算力额度 (Token Bank) and 会员积分 (Points).
      assert.doesNotMatch(file.source, /算力积分/, `${file.path} must not use the retired 算力积分 name`);
      const withoutPointsAsset = file.source.replaceAll('会员积分', '');
      assert.doesNotMatch(
        withoutPointsAsset,
        /积分/,
        `${file.path} must use 算力额度 for Token Bank or 会员积分 for Points`,
      );
    }
  }
});

test('admin finance queries treat Token Bank recharges as recharge orders', () => {
  const marketingStore = readRepoFile(
    'services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/admin_marketing_store.rs',
  );
  const financeStore = readRepoFile(
    'services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/admin_finance_store.rs',
  );

  assert.doesNotMatch(marketingStore, /o\.subject\s*=\s*'points_recharge'/);
  assert.match(marketingStore, /o\.subject IN \('points_recharge', 'token_bank_recharge'\)/);
  assert.match(financeStore, /token_bank_purchase_credit/);
});
