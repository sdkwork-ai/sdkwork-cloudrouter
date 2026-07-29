import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('claw router i18n resources compose the canonical upstream administration catalog', async () => {
  const { mergeI18nBundles } = await import('./packages/sdkwork-clawrouter-pc-i18n/src/resources/merge.ts');
  const { adminCoreNavigationMessages } = await import('./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts');
  const { sharedCommonMessages } = await import('./packages/sdkwork-clawrouter-pc-i18n/src/resources/shared/common.ts');
  const {
    upstreamAccountGroupMessages,
    upstreamAccountMessages,
    upstreamSharedMessages,
    upstreamSupplierMessages,
  } = await import('./packages/sdkwork-clawrouter-pc-admin-upstream/src/i18n/index.ts');
  const resources = mergeI18nBundles([
    adminCoreNavigationMessages,
    sharedCommonMessages,
    upstreamSharedMessages,
    upstreamSupplierMessages,
    upstreamAccountMessages,
    upstreamAccountGroupMessages,
  ]);

  assert.equal(resources.en.translation['admin.menu.upstream'], 'Upstream Routing');
  assert.equal(resources.zh.translation['admin.menu.upstream'], '上游路由');
  assert.equal(resources.en.translation['admin.menu.home.upstreamManagement'], 'Upstream Management');
  assert.equal(resources.zh.translation['admin.menu.home.upstreamManagement'], '上游管理');
  assert.equal(resources.en.translation['admin.upstream.views.suppliers'], 'Upstream suppliers');
  assert.equal(resources.zh.translation['admin.upstream.views.suppliers'], '上游供应商');
  assert.equal(resources.en.translation['admin.upstream.views.accountGroups'], 'Account groups');
  assert.equal(resources.zh.translation['admin.upstream.views.accountGroups'], '账号分组');
  assert.equal(resources.en.translation['admin.upstream.supplier.type.relay'], 'Relay supplier');
  assert.equal(resources.zh.translation['admin.upstream.supplier.type.relay'], '中转站供应商');
  assert.equal(resources.en.translation['admin.upstream.account.credentials.oneTimeSecret'], 'One-time secret');
  assert.equal(resources.zh.translation['admin.upstream.account.credentials.oneTimeSecret'], '一次性凭证原文');
  assert.equal(resources.en.translation['admin.upstream.accountGroup.form.saleMultiplier'], 'Sale multiplier');
  assert.equal(resources.zh.translation['admin.upstream.accountGroup.form.saleMultiplier'], '销售倍率');
  assert.equal(resources.en.translation['common.status.active'], 'Active');
  assert.equal(resources.zh.translation['common.status.active'], '启用');
  assert.equal(resources.en.translation['common.pagination.page'], 'Page {{page}}');
  assert.equal(resources.zh.translation['common.pagination.page'], '第 {{page}} 页');
});

test('portal bootstrap composes Claw Router and Agents catalogs through the SDKWork provider', () => {
  const mainSource = readFileSync(new URL('./src/main.tsx', import.meta.url), 'utf8');
  const i18nSource = readFileSync(
    new URL('./packages/sdkwork-clawrouter-pc-i18n/src/index.ts', import.meta.url),
    'utf8',
  );
  const resourcesSource = readFileSync(
    new URL('./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts', import.meta.url),
    'utf8',
  );
  const agentsI18nSource = readFileSync(
    new URL(
      '../../../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/i18n/index.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(resourcesSource, /@sdkwork\/clawrouter-pc-admin-upstream\/i18n/);
  assert.match(i18nSource, /defineSdkworkI18nRuntimeConfig/);
  assert.match(i18nSource, /defaultLocale: 'en-US'/);
  assert.match(i18nSource, /fallbackLocale: 'en-US'/);
  for (const locale of ['en-US', 'zh-CN', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU']) {
    assert.match(i18nSource, new RegExp(`['"]${locale}['"]`));
  }
  assert.match(i18nSource, /'zh-CN': resources\.zh\.translation/);
  assert.match(mainSource, /catalogs=\{\[clawRouterI18nCatalog, \.\.\.agentsWorkbenchI18nCatalogs\]\}/);
  assert.doesNotMatch(agentsI18nSource, /initReactI18next|createInstance|I18nextProvider/);
});
