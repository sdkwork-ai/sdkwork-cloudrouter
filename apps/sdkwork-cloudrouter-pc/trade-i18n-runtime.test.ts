import assert from "node:assert/strict";
import { test } from "vitest";

import { resources } from "./packages/sdkwork-cloudrouter-pc-i18n/src/resources";

const en = resources.en.translation;
const zh = resources.zh.translation;

const TRADE_KEYS = [
  "admin.header.tradeCenter",
  "admin.menu.trade.workbench",
  "admin.menu.trade.orderManagement",
  "admin.menu.trade.orders",
  "admin.menu.trade.afterSales",
  "admin.menu.trade.fulfillment",
  "admin.menu.trade.shipments",
  "admin.menu.trade.funds",
  "admin.menu.trade.refunds",
  "admin.menu.trade.withdrawals",
  "admin.trade.workbench.title",
  "admin.trade.afterSales.title",
  "admin.trade.shipments.title",
  "admin.trade.refunds.title",
  "admin.trade.withdrawals.title",
  "admin.orders.title",
  "admin.orders.detail.items",
  "admin.orders.detail.events",
];

test("merged i18n resources carry every trading center key in en and zh", () => {
  for (const key of TRADE_KEYS) {
    assert.ok(en[key], `missing en key: ${key}`);
    assert.ok(zh[key], `missing zh key: ${key}`);
  }
  assert.equal(en["admin.header.tradeCenter"], "Trade Center");
  assert.equal(zh["admin.header.tradeCenter"], "交易中心");
  assert.equal(zh["admin.menu.trade.orders"], "全部订单");
  assert.equal(en["admin.menu.trade.orders"], "All Orders");
});
