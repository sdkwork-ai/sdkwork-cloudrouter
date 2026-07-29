import assert from "node:assert/strict";
import test from "node:test";

import { getAdminModuleMenu } from "./src/adminModuleRegistry.ts";
import { getActiveSidebarItemPaths, isSidebarItemActive } from "./src/adminSidebarActive.ts";

test("admin sidebar exposes one canonical upstream management route", () => {
  const homeMenu = getAdminModuleMenu("home");
  const upstreamGroup = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.upstreamManagement");

  assert.ok(upstreamGroup, "upstream management group must exist");

  const upstreamItem = upstreamGroup.items.find((item) => item.path === "/admin/upstream");

  assert.ok(upstreamItem, "upstream menu item must exist");
  assert.deepEqual(upstreamGroup.items.map((item) => item.path), ["/admin/upstream"]);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream", homeMenu), ["/admin/upstream"]);
  assert.equal(isSidebarItemActive("/admin/upstream", upstreamItem, upstreamGroup.items), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/upstream/details", homeMenu), ["/admin/upstream"]);
  assert.equal(isSidebarItemActive("/admin/upstream/details", upstreamItem, upstreamGroup.items), true);
});
