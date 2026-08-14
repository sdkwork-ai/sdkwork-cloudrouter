import assert from "node:assert/strict";
import { test } from "vitest";

import { CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS } from "./src/admin/cloudRouterAdminHostMount.tsx";
import { TRADE_ADMIN_ROUTE_RECORDS } from "@sdkwork/order-pc-admin-trade/contribution";

test("host mount registers every trading center route record under sdkwork-order", () => {
  const tradeContributions = CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS.filter(
    (contribution) => contribution.owner === "sdkwork-order",
  );

  assert.equal(tradeContributions.length, TRADE_ADMIN_ROUTE_RECORDS.length);
  const recordPaths = TRADE_ADMIN_ROUTE_RECORDS.map((record) => record.path).sort();
  const contributionPaths = tradeContributions.map((contribution) => contribution.path).sort();
  assert.deepEqual(contributionPaths, recordPaths);

  for (const contribution of tradeContributions) {
    assert.equal(contribution.adminPackage, "@sdkwork/order-pc-admin-trade");
    assert.deepEqual(contribution.backendSdkFamilies, ["sdkwork-order-backend-sdk"]);
    assert.equal(contribution.requiredPermission, "cloudrouter.admin.access");
  }
});
