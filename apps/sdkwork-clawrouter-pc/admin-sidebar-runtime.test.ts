import assert from "node:assert/strict";
import test from "node:test";

import { getAdminModuleMenu } from "./src/adminModuleRegistry.ts";
import { getActiveSidebarItemPaths, isSidebarItemActive } from "./src/adminSidebarActive.ts";

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
  assert.equal(isSidebarItemActive("/admin/upstream/suppliers", suppliersItem, upstreamGroup.items), true);
  assert.equal(isSidebarItemActive("/admin/upstream/suppliers", accountsItem, upstreamGroup.items), false);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/accounts", homeMenu), ["/admin/upstream/accounts"]);
  assert.equal(isSidebarItemActive("/admin/upstream/accounts", accountsItem, upstreamGroup.items), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/account-groups", homeMenu), ["/admin/upstream/account-groups"]);
  assert.equal(isSidebarItemActive("/admin/upstream/account-groups", accountGroupsItem, upstreamGroup.items), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/accounts/details", homeMenu), ["/admin/upstream/accounts"]);
  assert.equal(isSidebarItemActive("/admin/upstream/accounts/details", accountsItem, upstreamGroup.items), true);
});
