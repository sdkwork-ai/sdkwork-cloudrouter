import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('cloud router i18n resources compose the canonical upstream administration catalog', async () => {
  const { mergeI18nBundles } = await import('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/merge.ts');
  const { adminCoreNavigationMessages } = await import('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/admin/core-navigation.ts');
  const { sharedCommonMessages } = await import('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/common.ts');
  const {
    upstreamAccountGroupMessages,
    upstreamAccountMessages,
    upstreamSharedMessages,
    upstreamSupplierMessages,
  } = await import('./packages/sdkwork-cloudrouter-pc-admin-upstream/src/i18n/index.ts');
  const resources = mergeI18nBundles([
    adminCoreNavigationMessages,
    sharedCommonMessages,
    upstreamSharedMessages,
    upstreamSupplierMessages,
    upstreamAccountMessages,
    upstreamAccountGroupMessages,
  ]);

  assert.equal(resources.en.translation['admin.menu.upstream.suppliers'], 'Suppliers');
  assert.equal(resources.zh.translation['admin.menu.upstream.suppliers'], '供应商');
  assert.equal(resources.en.translation['admin.menu.upstream.accounts'], 'Supplier Accounts');
  assert.equal(resources.zh.translation['admin.menu.upstream.accounts'], '供应商账号');
  assert.equal(resources.en.translation['admin.menu.upstream.accountGroups'], 'Supplier Account Groups');
  assert.equal(resources.zh.translation['admin.menu.upstream.accountGroups'], '供应商账号分组');
  assert.equal(resources.en.translation['admin.menu.home.upstreamManagement'], 'Supplier Management');
  assert.equal(resources.zh.translation['admin.menu.home.upstreamManagement'], '供应商管理');
  assert.equal(resources.en.translation['admin.upstream.supplier.type.relay'], 'Relay supplier');
  assert.equal(resources.zh.translation['admin.upstream.supplier.type.relay'], '中转站供应商');
  assert.equal(
    resources.en.translation['admin.upstream.account.credentials.secretHint'],
    'Encrypted at rest. The plaintext is never returned after submission.',
  );
  assert.equal(
    resources.zh.translation['admin.upstream.account.credentials.secretHint'],
    '密文存储，提交后不会再次返回凭证原文。',
  );
  assert.equal(resources.en.translation['admin.upstream.accountGroup.form.saleMultiplier'], 'Sale multiplier');
  assert.equal(resources.zh.translation['admin.upstream.accountGroup.form.saleMultiplier'], '销售倍率');
  assert.equal(resources.en.translation['common.status.active'], 'Active');
  assert.equal(resources.zh.translation['common.status.active'], '启用');
  assert.equal(resources.en.translation['common.pagination.page'], 'Page {{page}}');
  assert.equal(resources.zh.translation['common.pagination.page'], '第 {{page}} 页');
});

test('cloud router i18n resources compose the pricing administration catalog', async () => {
  const { mergeI18nBundles } = await import('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/merge.ts');
  const { adminCoreNavigationMessages } = await import('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/admin/core-navigation.ts');
  const { pricingAdminMessages } = await import('./packages/sdkwork-cloudrouter-pc-admin-pricing/src/i18n/index.ts');
  const resources = mergeI18nBundles([
    adminCoreNavigationMessages,
    pricingAdminMessages,
  ]);

  assert.equal(resources.en.translation['admin.menu.home.pricingManagement'], 'Price Management');
  assert.equal(resources.zh.translation['admin.menu.home.pricingManagement'], '价格管理');
  assert.equal(resources.en.translation['admin.menu.pricing.plans'], 'Pricing Plans');
  assert.equal(resources.zh.translation['admin.menu.pricing.plans'], '价格计划');
  assert.equal(resources.en.translation['admin.menu.pricing.rateCards'], 'Rate Cards');
  assert.equal(resources.zh.translation['admin.menu.pricing.rateCards'], '费率卡');
  assert.equal(resources.en.translation['admin.menu.pricing.rules'], 'Pricing Rules');
  assert.equal(resources.zh.translation['admin.menu.pricing.rules'], '定价规则');
  assert.equal(resources.en.translation['admin.pricing.plans.actions.new'], 'New plan');
  assert.equal(resources.zh.translation['admin.pricing.plans.actions.new'], '新建计划');
  assert.equal(resources.en.translation['admin.pricing.rules.form.unitPriceOverride'], 'Unit price override');
  assert.equal(resources.zh.translation['admin.pricing.rules.form.unitPriceOverride'], '覆盖单价');
});

test('portal bootstrap composes Cloud Router and Agents catalogs through the SDKWork provider', () => {
  const mainSource = readFileSync(new URL('./src/main.tsx', import.meta.url), 'utf8');
  const i18nSource = readFileSync(
    new URL('./packages/sdkwork-cloudrouter-pc-i18n/src/index.ts', import.meta.url),
    'utf8',
  );
  const resourcesSource = readFileSync(
    new URL('./packages/sdkwork-cloudrouter-pc-i18n/src/resources/index.ts', import.meta.url),
    'utf8',
  );
  const agentsI18nSource = readFileSync(
    new URL(
      '../../../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/i18n/index.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(resourcesSource, /@sdkwork\/cloudrouter-pc-admin-upstream\/i18n/);
  assert.match(resourcesSource, /@sdkwork\/cloudrouter-pc-admin-pricing\/i18n/);
  assert.match(resourcesSource, /pricingAdminMessages/);
  assert.match(i18nSource, /defineSdkworkI18nRuntimeConfig/);
  assert.match(i18nSource, /defaultLocale: 'en-US'/);
  assert.match(i18nSource, /fallbackLocale: 'en-US'/);
  for (const locale of ['en-US', 'zh-CN', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU']) {
    assert.match(i18nSource, new RegExp(`['"]${locale}['"]`));
  }
  assert.match(i18nSource, /'zh-CN': resources\.zh\.translation/);
  assert.match(mainSource, /catalogs=\{\[cloudRouterI18nCatalog, \.\.\.agentsWorkbenchI18nCatalogs\]\}/);
  assert.doesNotMatch(agentsI18nSource, /initReactI18next|createInstance|I18nextProvider/);
});
