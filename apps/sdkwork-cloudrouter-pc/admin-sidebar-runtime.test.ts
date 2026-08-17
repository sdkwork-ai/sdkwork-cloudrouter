import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveSidebarItemPaths,
  getAdminModuleMenu,
  isSidebarItemActive,
} from "@sdkwork/cloudrouter-pc-admin-shell";

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
