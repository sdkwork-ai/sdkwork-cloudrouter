import assert from "node:assert/strict";
import test from "node:test";

import { CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS } from "./src/admin/cloudRouterAdminHostMount";

test("templates URL renders the scaffold library directly", () => {
  const routes = new Map(
    CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS.map((contribution) => [contribution.path, contribution]),
  );
  const templates = routes.get("applications/templates");
  const scaffolds = routes.get("applications/scaffolds");
  assert.ok(templates);
  assert.ok(scaffolds);
  const templatesType = (templates.element.type as { name?: string }).name;
  assert.notEqual(templatesType, "Navigate");
  assert.equal(templatesType, (scaffolds.element.type as { name?: string }).name);
});
