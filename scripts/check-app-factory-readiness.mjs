#!/usr/bin/env node
/**
 * Cross-repository readiness gate for the SDKWork app factory.
 *
 * This is intentionally a source-contract check, not a runtime probe: every
 * assertion below corresponds to a capability that previously drifted silently
 * (order reading the legacy catalog, missing route mounts, paid install without
 * entitlement verification, refund cleanup without a worker).
 *
 * Run from the sdkwork-cloudrouter repository root:
 *   node scripts/check-app-factory-readiness.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const deploy = path.resolve(root, "..", "sdkwork-deployments");
const order = path.resolve(root, "..", "sdkwork-order");

function read(relative, base = deploy) {
  const file = path.join(base, relative);
  assert.ok(existsSync(file), `missing ${file}`);
  return readFileSync(file, "utf8");
}

function contains(relative, needle, base = deploy) {
  const source = read(relative, base);
  assert.ok(source.includes(needle), `${relative} must contain ${needle}`);
}

// 1. Create surface: every creatable app kind has a create option.
const publishing = read(
  "apps/sdkwork-deployments-pc/packages/sdkwork-deployments-pc-console-publishing/src/service/deploy-app-publishing.ts",
);
for (const kind of [
  "STATIC_WEB",
  "H5_WEB",
  "PC_WEB",
  "API_SERVICE",
  "WECHAT_MINIPROGRAM",
  "DOUYIN_MINIPROGRAM",
  "IOS_APP",
  "ANDROID_APP",
  "HARMONYOS_APP",
  "FLUTTER_APP",
  "DESKTOP_APP",
]) {
  assert.ok(publishing.includes(`"${kind}"`), `create-app surface misses ${kind}`);
}

// 2. Template install: paid order verification + idempotent order key.
contains(
  "crates/sdkwork-intelligence-deploy-service/src/template_install.rs",
  "verify_paid_app_template_order",
);
contains(
  "crates/sdkwork-intelligence-deploy-service/src/template_install.rs",
  "paid_order_id.as_deref().unwrap_or(idempotency_key)",
);
contains("crates/sdkwork-intelligence-deploy-service/src/template_install.rs", "clone_marketplace_artifact_for_app");
contains("crates/sdkwork-intelligence-deploy-service/src/template_install.rs", "retrieve_app_template_version_source_snapshot");

// 3. Order center reads the current marketplace catalog first, with legacy fallback.
contains(
  "crates/sdkwork-order-repository-sqlx/src/postgres_app_template_order.rs",
  "LOAD_SCAFFOLD_TEMPLATE",
  order,
);
contains(
  "crates/sdkwork-order-repository-sqlx/src/postgres_app_template_order.rs",
  "FROM deploy_application_scaffold t",
  order,
);

// 4. Identity tooling.
contains("services/sdkwork-cloudrouter-installer/src/main.rs", "\"audit-identities\"", root);
contains("services/sdkwork-cloudrouter-installer/src/main.rs", "\"reconcile-identities\"", root);
contains("services/sdkwork-cloudrouter-installer/src/main.rs", "\"revoke-refunded-apps\"", root);
contains(
  "services/sdkwork-cloudrouter-installer/src/iam_installation.rs",
  "reconcile_legacy_identity_links",
  root,
);

// 5. Refund sweep is buildable and scheduled.
contains("Cargo.toml", "sdkwork-deploy-refund-revocation-worker");
contains("deployments/docker/Dockerfile", "sdkwork-deploy-refund-revocation-worker");
contains("deployments/docker/docker-compose.yml", "sdkwork-deploy-refund-revocation-worker");
assert.ok(
  existsSync(path.join(deploy, "deployments/kubernetes/refund-revocation-worker.yaml")),
  "missing refund revocation Kubernetes manifest",
);
assert.ok(
  existsSync(
    path.join(
      deploy,
      "crates/sdkwork-deploy-refund-revocation-worker/tests/refund_revocation_postgres.rs",
    ),
  ),
  "missing refund revocation real-SQL test",
);
assert.ok(
  existsSync(
    path.join(
      deploy,
      "crates/sdkwork-deploy-app-token/tests/refund_revocation_postgres.rs",
    ),
  ),
  "missing app-token refund real-SQL test",
);

// 6. Docs still name the remaining external blockers.
contains("docs/architecture/tech/TECH-app-factory-blockers.md", "IAM runtime", root);
contains("docs/architecture/tech/TECH-app-factory-blockers.md", "Real end-to-end", root);

console.log("app factory readiness gate passed");
