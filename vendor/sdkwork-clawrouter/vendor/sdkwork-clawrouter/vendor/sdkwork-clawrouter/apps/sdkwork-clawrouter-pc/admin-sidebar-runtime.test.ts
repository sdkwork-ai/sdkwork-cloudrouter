import assert from "node:assert/strict";
import test from "node:test";

import { getAdminModuleMenu } from "./src/adminModuleRegistry.ts";
import { getActiveSidebarItemPaths, isSidebarItemActive } from "./src/adminSidebarActive.ts";

test("admin sidebar exposes the canonical channel owner route without stale child menu items", () => {
  const homeMenu = getAdminModuleMenu("home");
  const accountPoolGroup = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.accountPoolManagement");

  assert.ok(accountPoolGroup, "account pool group must exist");

  const channelItem = accountPoolGroup.items.find((item) => item.path === "/admin/channel");

  assert.ok(channelItem, "channel menu item must exist");
  assert.equal(
    accountPoolGroup.items.some((item) => item.path === "/admin/channel/resources"),
    false,
    "channel resources drawer tab must not be exposed as a stale menu route",
  );
  assert.equal(
    accountPoolGroup.items.some((item) => item.path === "/admin/channel/endpoints"),
    false,
    "channel endpoints menu item must not exist",
  );

  assert.deepEqual(getActiveSidebarItemPaths("/admin/channel", homeMenu), ["/admin/channel"]);
  assert.equal(isSidebarItemActive("/admin/channel", channelItem, accountPoolGroup.items), true);

  assert.deepEqual(getActiveSidebarItemPaths("/admin/channel/resources", homeMenu), ["/admin/channel"]);
  assert.equal(isSidebarItemActive("/admin/channel/resources", channelItem, accountPoolGroup.items), true);
});
