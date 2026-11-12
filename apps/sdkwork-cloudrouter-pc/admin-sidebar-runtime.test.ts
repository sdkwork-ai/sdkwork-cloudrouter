import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_MODULES,
  getActiveSidebarItemPaths,
  getAdminModuleMenu,
  getFilteredAdminModuleMenu,
  hasActiveSidebarGroupItem,
  isSidebarItemActive,
} from "@sdkwork/cloudrouter-pc-admin-shell";
import { ADMIN_MODULE_CATALOG, ADMIN_MODULE_IDS } from "./packages/sdkwork-cloudroutes-pc-commons/src/admin-modules.ts";

test("admin module manager catalog mirrors the header registry order", () => {
  assert.deepEqual(
    ADMIN_MODULES.map((module) => module.id),
    [...ADMIN_MODULE_IDS],
    "the site-settings module manager and the header must list the same modules in the same default order",
  );
  assert.deepEqual(
    ADMIN_MODULE_CATALOG.map((entry) => entry.id),
    [...ADMIN_MODULE_IDS],
  );
});

test("admin sidebar exposes independent upstream supplier, account, and group entries", () => {
  const homeMenu = getAdminModuleMenu("home");
  const upstreamGroup = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.upstreamManagement");

  assert.ok(upstreamGroup, "upstream management group must exist");
  assert.deepEqual(upstreamGroup.items.map((item) => item.path), [
    "/admin/upstream/suppliers",
    "/admin/upstream/accounts",
    "/admin/upstream/account-groups",
  ]);

  const suppliersItem = upstreamGroup.items.find((item) => item.path === "/admin/upstream/suppliers");
  const accountsItem = upstreamGroup.items.find((item) => item.path === "/admin/upstream/accounts");
  const accountGroupsItem = upstreamGroup.items.find((item) => item.path === "/admin/upstream/account-groups");

  assert.ok(suppliersItem, "upstream suppliers menu item must exist");
  assert.ok(accountsItem, "upstream accounts menu item must exist");
  assert.ok(accountGroupsItem, "upstream account groups menu item must exist");

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/suppliers", homeMenu), ["/admin/upstream/suppliers"]);
  assert.equal(isSidebarItemActive("/admin/upstream/suppliers", suppliersItem, homeMenu), true);
  assert.equal(isSidebarItemActive("/admin/upstream/suppliers", accountsItem, homeMenu), false);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/accounts", homeMenu), ["/admin/upstream/accounts"]);
  assert.equal(isSidebarItemActive("/admin/upstream/accounts", accountsItem, homeMenu), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/account-groups", homeMenu), ["/admin/upstream/account-groups"]);
  assert.equal(isSidebarItemActive("/admin/upstream/account-groups", accountGroupsItem, homeMenu), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/accounts/details", homeMenu), ["/admin/upstream/accounts"]);
  assert.equal(isSidebarItemActive("/admin/upstream/accounts/details", accountsItem, homeMenu), true);
});

test("selecting partner stats highlights only stats, not the partner workbench", () => {
  const partnerMenu = getAdminModuleMenu("partnerCenter");
  const manageGroup = partnerMenu.groups.find((group) => group.groupKey === "admin.menu.partner.manage");
  const financeGroup = partnerMenu.groups.find((group) => group.groupKey === "admin.menu.partner.finance");

  assert.ok(manageGroup, "partner manage group must exist");
  assert.ok(financeGroup, "partner finance group must exist");

  const workbenchItem = manageGroup.items.find((item) => item.path === "/admin/partner");
  const statsItem = financeGroup.items.find((item) => item.path === "/admin/partner/stats");

  assert.ok(workbenchItem, "partner workbench menu item must exist");
  assert.ok(statsItem, "partner stats menu item must exist");

  assert.equal(isSidebarItemActive("/admin/partner/stats", statsItem, partnerMenu), true);
  assert.equal(isSidebarItemActive("/admin/partner/stats", workbenchItem, partnerMenu), false);
  assert.deepEqual(getActiveSidebarItemPaths("/admin/partner/stats", partnerMenu), ["/admin/partner/stats"]);

  assert.equal(isSidebarItemActive("/admin/partner", workbenchItem, partnerMenu), true);
  assert.equal(isSidebarItemActive("/admin/partner", statsItem, partnerMenu), false);
  assert.deepEqual(getActiveSidebarItemPaths("/admin/partner", partnerMenu), ["/admin/partner"]);
});

test("admin sidebar exposes only product price settings", () => {
  const homeMenu = getAdminModuleMenu("home");
  const pricingGroup = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.pricingManagement");

  assert.ok(pricingGroup, "pricing management group must exist");
  assert.deepEqual(pricingGroup.items.map((item) => item.path), [
    "/admin/pricing/settings",
  ]);

  const settingsItem = pricingGroup.items.find((item) => item.path === "/admin/pricing/settings");

  assert.ok(settingsItem, "price settings menu item must exist");

  assert.deepEqual(getActiveSidebarItemPaths("/admin/pricing/settings", homeMenu), ["/admin/pricing/settings"]);
  assert.equal(isSidebarItemActive("/admin/pricing/settings", settingsItem, homeMenu), true);
});

test("admin sidebar nests skills, connectors, plugins, and agents under the AI foundation group", () => {
  const homeMenu = getAdminModuleMenu("home");

  const foundationGroup = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.aiFoundation");
  assert.ok(foundationGroup, "AI foundation management group must exist");
  assert.deepEqual(foundationGroup.items, []);
  const nestedGroups = foundationGroup.groups ?? [];
  assert.deepEqual(nestedGroups.map((group) => group.groupKey), [
    "admin.menu.home.skillManagement",
    "admin.menu.home.connectorManagement",
    "admin.menu.home.pluginManagement",
    "admin.menu.home.agentManagement",
  ]);

  const skillGroup = nestedGroups.find((group) => group.groupKey === "admin.menu.home.skillManagement");
  assert.ok(skillGroup, "skill management group must exist");
  assert.deepEqual(skillGroup.items.map((item) => item.path), [
    "/admin/skill/categories",
    "/admin/skill",
  ]);

  const connectorGroup = nestedGroups.find((group) => group.groupKey === "admin.menu.home.connectorManagement");
  assert.ok(connectorGroup, "connector management group must exist");
  assert.deepEqual(connectorGroup.items.map((item) => item.path), [
    "/admin/connector/categories",
    "/admin/connector",
  ]);

  const pluginGroup = nestedGroups.find((group) => group.groupKey === "admin.menu.home.pluginManagement");
  assert.ok(pluginGroup, "plugin management group must exist");
  assert.deepEqual(pluginGroup.items.map((item) => item.path), [
    "/admin/plugin/categories",
    "/admin/plugin",
  ]);

  const agentGroup = nestedGroups.find((group) => group.groupKey === "admin.menu.home.agentManagement");
  assert.ok(agentGroup, "agent management group must exist");
  assert.deepEqual(agentGroup.items.map((item) => item.path), [
    "/admin/agent/categories",
    "/admin/agent",
  ]);

  // Three navigation levels: foundation group -> capability group -> page.
  // The active page must highlight only its most specific leaf, while every
  // ancestor group still reports an active descendant.
  assert.deepEqual(getActiveSidebarItemPaths("/admin/agent/categories", homeMenu), ["/admin/agent/categories"]);
  const agentCategoriesItem = agentGroup.items.find((item) => item.path === "/admin/agent/categories");
  const agentsItem = agentGroup.items.find((item) => item.path === "/admin/agent");
  assert.ok(agentCategoriesItem, "agent categories menu item must exist");
  assert.ok(agentsItem, "agent management menu item must exist");
  assert.equal(isSidebarItemActive("/admin/agent/categories", agentCategoriesItem, homeMenu), true);
  assert.equal(isSidebarItemActive("/admin/agent/categories", agentsItem, homeMenu), false);
  assert.equal(hasActiveSidebarGroupItem("/admin/agent/categories", agentGroup, homeMenu), true);
  assert.equal(hasActiveSidebarGroupItem("/admin/agent/categories", foundationGroup, homeMenu), true);
  assert.equal(hasActiveSidebarGroupItem("/admin/agent/categories", skillGroup, homeMenu), false);

  // Permission filtering keeps the nested chain intact and drops the whole
  // parent group only when no descendant entry survives.
  const filtered = getFilteredAdminModuleMenu("home", ["cloudrouter.admin.access"]);
  const filteredFoundation = filtered.groups.find((group) => group.groupKey === "admin.menu.home.aiFoundation");
  assert.ok(filteredFoundation, "permitted AI foundation group must survive filtering");
  assert.deepEqual(filteredFoundation.groups?.map((group) => group.groupKey), [
    "admin.menu.home.skillManagement",
    "admin.menu.home.connectorManagement",
    "admin.menu.home.pluginManagement",
    "admin.menu.home.agentManagement",
  ]);
  const filteredOut = getFilteredAdminModuleMenu("home", []);
  assert.equal(
    filteredOut.groups.some((group) => group.groupKey === "admin.menu.home.aiFoundation"),
    false,
    "an unpermitted nested group must not leave an empty parent group behind",
  );

  // The home module must claim every new top-level path prefix so the header
  // module switcher keeps the four groups inside the same admin module.
  const homeModule = ADMIN_MODULES.find((module) => module.id === "home");
  assert.ok(homeModule, "home module must exist");
  for (const prefix of ["/admin/skill", "/admin/connector", "/admin/plugin", "/admin/agent"]) {
    assert.ok(
      homeModule.pathPrefixes.includes(prefix),
      `home module must claim ${prefix}`,
    );
  }
});

test("payment center exposes 支付设置 → 域名设置 as a sidebar entry", () => {
  const paymentMenu = getAdminModuleMenu("paymentCenter");
  const settingsGroup = paymentMenu.groups.find(
    (group) => group.groupKey === "admin.menu.payments.settings",
  );

  assert.ok(settingsGroup, "payment settings group must exist");
  assert.deepEqual(
    settingsGroup.items.map((item) => item.path),
    ["/admin/payments/domainSettings"],
  );
  assert.equal(
    settingsGroup.items[0]?.labelKey,
    "admin.menu.payments.domainSettings",
    "the domain settings item must resolve its label through i18n",
  );

  assert.deepEqual(
    getActiveSidebarItemPaths("/admin/payments/domainSettings", paymentMenu),
    ["/admin/payments/domainSettings"],
  );
});
