import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_ROUTE_PERMISSION_HINTS,
  getActiveModuleFromPath,
  getActiveSidebarItemPaths,
  getAdminModuleMenu,
  isSidebarItemActive,
  resolveAdminRoutePermissionHint,
} from "@sdkwork/cloudrouter-pc-admin-shell";

test("trade center routes resolve to the tradeCenter module", () => {
  assert.equal(getActiveModuleFromPath("/admin/trade/overview"), "tradeCenter");
  assert.equal(getActiveModuleFromPath("/admin/trade/orders"), "tradeCenter");
  assert.equal(getActiveModuleFromPath("/admin/trade/after-sales"), "tradeCenter");
  assert.equal(getActiveModuleFromPath("/admin/trade/shipments"), "tradeCenter");
  assert.equal(getActiveModuleFromPath("/admin/trade/refunds"), "tradeCenter");
  assert.equal(getActiveModuleFromPath("/admin/trade/withdrawals"), "tradeCenter");
});

test("trade center sidebar menu covers orders, fulfillment, and funds", () => {
  const menu = getAdminModuleMenu("tradeCenter");

  assert.ok(menu, "trade center menu must exist");
  assert.deepEqual(menu.items?.map((item) => item.path), ["/admin/trade/overview"]);

  const orderGroup = menu.groups.find((group) => group.groupKey === "admin.menu.trade.orderManagement");
  const fulfillmentGroup = menu.groups.find((group) => group.groupKey === "admin.menu.trade.fulfillment");
  const fundsGroup = menu.groups.find((group) => group.groupKey === "admin.menu.trade.funds");

  assert.ok(orderGroup, "order management group must exist");
  assert.deepEqual(orderGroup.items.map((item) => item.path), [
    "/admin/trade/orders",
    "/admin/trade/after-sales",
  ]);

  assert.ok(fulfillmentGroup, "fulfillment group must exist");
  assert.deepEqual(fulfillmentGroup.items.map((item) => item.path), ["/admin/trade/shipments"]);

  assert.ok(fundsGroup, "funds group must exist");
  assert.deepEqual(fundsGroup.items.map((item) => item.path), [
    "/admin/trade/refunds",
    "/admin/trade/withdrawals",
  ]);
});

test("trade center routes require cloudrouter.admin.access", () => {
  assert.equal(resolveAdminRoutePermissionHint("/admin/trade/overview"), "cloudrouter.admin.access");
  assert.equal(resolveAdminRoutePermissionHint("/admin/trade/refunds"), "cloudrouter.admin.access");
  assert.ok(
    ADMIN_ROUTE_PERMISSION_HINTS.some((hint) => hint.pathPrefix === "/admin/trade"),
    "/admin/trade permission hint must be declared",
  );
});

test("trade center sidebar highlights exactly one entry per path", () => {
  const menu = getAdminModuleMenu("tradeCenter");
  const allItems = [
    ...(menu.items ?? []),
    ...menu.groups.flatMap((group) => group.items),
  ];

  for (const path of [
    "/admin/trade/overview",
    "/admin/trade/orders",
    "/admin/trade/after-sales",
    "/admin/trade/shipments",
    "/admin/trade/refunds",
    "/admin/trade/withdrawals",
  ]) {
    const activeItems = allItems.filter((item) => isSidebarItemActive(path, item, menu));
    assert.equal(activeItems.length, 1, `exactly one active entry for ${path}`);
    assert.deepEqual(getActiveSidebarItemPaths(path, menu), [activeItems[0]!.path]);
  }

  const workbenchItem = menu.items?.find((item) => item.path === "/admin/trade/overview");
  const ordersItem = menu.groups
    .flatMap((group) => group.items)
    .find((item) => item.path === "/admin/trade/orders");
  assert.ok(workbenchItem && ordersItem, "workbench and orders entries must exist");
  assert.equal(isSidebarItemActive("/admin/trade/overview", ordersItem, menu), false);
  assert.equal(isSidebarItemActive("/admin/trade/orders", workbenchItem, menu), false);
});
