import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("claw router i18n resources merge at runtime with aligned admin site navigation keys", async () => {
  const { mergeI18nBundles } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/merge.ts");
  const { adminCoreNavigationMessages } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts");
  const { adminGroupUserMessages } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/group-user.ts");
  const { adminModelMessages } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts");
  const { sharedCommonMessages } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/shared/common.ts");
  const resources = mergeI18nBundles([
    adminCoreNavigationMessages,
    adminGroupUserMessages,
    adminModelMessages,
    sharedCommonMessages,
  ]);

  assert.equal(resources.en.translation["admin.menu.modelSites"], "Upstream Providers");
  assert.equal(resources.zh.translation["admin.menu.modelSites"], "上游服务商");
  assert.equal(resources.en.translation["common.status.active"], "Active");
  assert.equal(resources.zh.translation["common.status.active"], "启用");
  assert.equal(resources.en.translation["common.status.disabled"], "Disabled");
  assert.equal(resources.zh.translation["common.status.disabled"], "停用");
  assert.equal(resources.en.translation["admin.group.priceReferenceMode.multiplier"], "Rate multiplier");
  assert.equal(resources.zh.translation["admin.group.priceReferenceMode.multiplier"], "倍率计费");
  assert.equal(resources.en.translation["admin.group.priceReferenceMode.officialPrice"], "Official price reference");
  assert.equal(resources.zh.translation["admin.group.priceReferenceMode.officialPrice"], "官方价格参考");
  assert.equal(resources.en.translation["admin.group.fields.officialPriceMultiplier"], "Official price multiplier");
  assert.equal(resources.zh.translation["admin.group.fields.officialPriceMultiplier"], "官方价格倍率");
  assert.equal(resources.en.translation["common.actions.done"], "Done");
  assert.equal(resources.zh.translation["common.actions.done"], "完成");
  assert.equal(resources.en.translation["admin.group.resourceAccess.search.resourceGroupsPlaceholder"], "Search resource groups...");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.search.resourceGroupsPlaceholder"], "搜索资源组...");
  assert.equal(resources.en.translation["admin.group.resourceAccess.search.resourcesPlaceholder"], "Search resources...");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.search.resourcesPlaceholder"], "搜索资源...");
  assert.equal(resources.en.translation["admin.group.resourceAccess.emptyResourceGroupsSearch"], "No matching resource groups.");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.emptyResourceGroupsSearch"], "没有匹配的资源组。");
  assert.equal(resources.en.translation["admin.group.resourceAccess.emptyResourcesSearch"], "No matching resources.");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.emptyResourcesSearch"], "没有匹配的资源。");
  assert.equal(resources.en.translation["admin.group.resourceAccess.actions.details"], "Details");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.actions.details"], "详情");
  assert.equal(resources.en.translation["admin.group.resourceAccess.actions.remove"], "Remove");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.actions.remove"], "删除");
  assert.equal(resources.en.translation["admin.group.resourceAccess.detail.resourceGroupTitle"], "Resource group details");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.detail.resourceGroupTitle"], "资源组详情");
  assert.equal(resources.en.translation["admin.group.resourceAccess.detail.resourceTitle"], "Resource details");
  assert.equal(resources.zh.translation["admin.group.resourceAccess.detail.resourceTitle"], "资源详情");
  assert.equal(resources.en.translation["admin.model.site.form.supportedVendorsHint"], "Choose which model vendors this upstream provider can serve.");
  assert.equal(resources.zh.translation["admin.model.site.form.supportedVendorsHint"], "选择该上游服务商可接入的模型 Vendor。");
  assert.equal(resources.en.translation["admin.model.site.form.vendorColumns.vendor"], "Vendor");
  assert.equal(resources.zh.translation["admin.model.site.form.vendorColumns.vendor"], "Vendor");
  assert.equal(resources.en.translation["admin.model.site.form.vendorColumns.code"], "Code");
  assert.equal(resources.zh.translation["admin.model.site.form.vendorColumns.code"], "编码");
  assert.equal(resources.en.translation["admin.model.site.form.removeVendor"], "Remove vendor");
  assert.equal(resources.zh.translation["admin.model.site.form.removeVendor"], "删除 Vendor");
  assert.equal(resources.en.translation["admin.group.groupType.public"], "Public");
  assert.equal(resources.zh.translation["admin.group.groupType.public"], "公开");
  assert.equal(resources.en.translation["admin.group.groupType.dedicated"], "Dedicated");
  assert.equal(resources.zh.translation["admin.group.groupType.dedicated"], "专属");
});

test("admin organization i18n bundle keeps aligned en and zh keys", async () => {
  const { mergeI18nBundles } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/merge.ts");
  const { adminOrganizationMessages } = await import("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");
  const resources = mergeI18nBundles([adminOrganizationMessages]);

  assert.equal(resources.en.translation["admin.organization.assignmentRoles.owner"], "Owner");
  assert.equal(resources.zh.translation["admin.organization.assignmentRoles.owner"], "所有者");
  assert.equal(resources.en.translation["admin.organization.confirm.blockedDescription"], "Cannot delete {{label}} while active dependencies exist. {{dependencies}}");
  assert.equal(resources.zh.translation["admin.organization.confirm.blockedDescription"], "存在活动依赖时无法删除 {{label}}。{{dependencies}}");
  assert.equal(resources.en.translation["admin.organization.metrics.roleBindings"], "Role bindings");
  assert.equal(resources.zh.translation["admin.organization.metrics.roleBindings"], "角色绑定");
  assert.equal(resources.en.translation["admin.organization.organizationKinds.businessUnit"], "Business unit");
  assert.equal(resources.zh.translation["admin.organization.organizationKinds.businessUnit"], "业务单元");
});

test("portal bootstrap composes Claw Router and Agents catalogs through the SDKWork provider", () => {
  const mainSource = readFileSync(new URL("./src/main.tsx", import.meta.url), "utf8");
  const i18nSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts", import.meta.url),
    "utf8",
  );
  const agentsI18nSource = readFileSync(
    new URL(
      "../../../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/i18n/index.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(i18nSource, /defineSdkworkI18nRuntimeConfig/);
  assert.match(i18nSource, /defaultLocale: 'en-US'/);
  assert.match(i18nSource, /fallbackLocale: 'en-US'/);
  for (const locale of ["en-US", "zh-CN", "de-DE", "fr-FR", "ja-JP", "ko-KR", "ru-RU"]) {
    assert.match(i18nSource, new RegExp(`['"]${locale}['"]`));
  }
  assert.match(i18nSource, /'zh-CN': resources\.zh\.translation/);
  assert.match(mainSource, /catalogs=\{\[clawRouterI18nCatalog, \.\.\.agentsWorkbenchI18nCatalogs\]\}/);
  assert.doesNotMatch(agentsI18nSource, /initReactI18next|createInstance|I18nextProvider/);
});
