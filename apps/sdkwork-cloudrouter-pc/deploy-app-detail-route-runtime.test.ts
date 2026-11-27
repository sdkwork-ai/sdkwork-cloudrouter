import assert from "node:assert/strict";
import test from "node:test";

import { CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS } from "./src/admin/cloudRouterAdminHostMount";
import {
  getActiveSidebarItemPaths,
  getAdminModuleMenu,
  getActiveModuleFromPath,
} from "@sdkwork/cloudrouter-pc-admin-shell";

/**
 * The deployment application detail page is its own route
 * (`/admin/applications/deploy/:appId`).
 *
 * Two host contracts have to hold for the row action's "详情" command to land
 * somewhere useful instead of falling into the App Center catalog switch:
 *
 * 1. the route is registered explicitly (before the `/admin/applications/*`
 *    fallback) and loads the admin-application detail entry;
 * 2. the path still belongs to the App Center module and highlights the
 *    deployment applications sidebar entry.
 */
test("the deployment application detail route is registered", () => {
  const routes = new Map(
    CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS.map((contribution) => [contribution.path, contribution]),
  );
  const detail = routes.get("applications/deploy/:appId");
  assert.ok(detail, "applications/deploy/:appId must be a registered admin route");
  assert.equal(detail.owner, "sdkwork-cloudrouter");

  const detailIndex = CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS
    .findIndex((contribution) => contribution.path === "applications/deploy/:appId");
  const wildcardIndex = CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS
    .findIndex((contribution) => contribution.path === "applications/*");
  assert.ok(wildcardIndex >= 0, "the App Center wildcard route must exist");
  assert.ok(
    detailIndex >= 0 && detailIndex < wildcardIndex,
    "the detail route must be registered before the App Center wildcard",
  );
});

test("the detail path stays inside the App Center module navigation", () => {
  const path = "/admin/applications/deploy/6c4c0b8e-8d5e-4d5c-9b39-1c1c3c9f8a11";
  assert.equal(getActiveModuleFromPath(path), "appCenter");
  assert.deepEqual(
    getActiveSidebarItemPaths(path, getAdminModuleMenu("appCenter")),
    ["/admin/applications/deploy"],
  );
});
