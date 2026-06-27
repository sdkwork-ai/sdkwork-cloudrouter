import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");

const requiredCommerceRustCrates = [
  "crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml",
  "crates/sdkwork-commerce-api-server/Cargo.toml",
  "crates/sdkwork-commerce-service-host/Cargo.toml",
  "crates/sdkwork-commerce-contract-service/Cargo.toml",
];

const forbiddenLocalCapabilityCrates = [
  "crates/sdkwork-commerce-catalog-service",
  "crates/sdkwork-commerce-shop-service",
  "crates/sdkwork-commerce-inventory-service",
  "crates/sdkwork-commerce-order-service",
  "crates/sdkwork-commerce-payment-service",
  "crates/sdkwork-commerce-account-service",
  "crates/sdkwork-commerce-membership-service",
  "crates/sdkwork-commerce-membership-repository-sqlx",
  "crates/sdkwork-commerce-promotion-service",
  "crates/sdkwork-commerce-invoice-service",
];

const requiredSiblingCapabilityRepos = [
  { repo: "../sdkwork-shop", serviceCrate: "crates/sdkwork-commerce-shop-service/Cargo.toml" },
  { repo: "../sdkwork-merchandise", serviceCrate: "crates/sdkwork-commerce-merchandise-service/Cargo.toml" },
  { repo: "../sdkwork-inventory", serviceCrate: "crates/sdkwork-commerce-inventory-service/Cargo.toml" },
  { repo: "../sdkwork-order", serviceCrate: "crates/sdkwork-commerce-order-service/Cargo.toml" },
  { repo: "../sdkwork-payment", serviceCrate: "crates/sdkwork-commerce-payment-service/Cargo.toml" },
  { repo: "../sdkwork-account", serviceCrate: "crates/sdkwork-commerce-account-service/Cargo.toml" },
  { repo: "../sdkwork-membership", serviceCrate: "crates/sdkwork-commerce-membership-service/Cargo.toml" },
  { repo: "../sdkwork-promotion", serviceCrate: "crates/sdkwork-commerce-promotion-service/Cargo.toml" },
  { repo: "../sdkwork-invoice", serviceCrate: "crates/sdkwork-commerce-invoice-service/Cargo.toml" },
  { repo: "../sdkwork-catalog", serviceCrate: "crates/sdkwork-catalog-api-server/Cargo.toml", routerCrate: "crates/sdkwork-routes-catalog-app-api/Cargo.toml" },
];

const requiredCommerceDatabaseTables = [
  "commerce_shop",
  "commerce_shop_application",
  "commerce_shop_verification",
  "commerce_shop_status_event",
  "commerce_shop_channel",
  "commerce_shop_fulfillment_profile",
  "commerce_shop_settlement_profile",
  "commerce_shop_metric_snapshot",
  "commerce_shop_readiness",
  "commerce_product_category",
  "commerce_product_spu",
  "commerce_product_sku",
  "commerce_inventory_stock",
  "commerce_inventory_reservation",
  "commerce_cart",
  "commerce_cart_item",
  "commerce_checkout_session",
  "commerce_checkout_line",
  "commerce_checkout_quote",
  "commerce_order_address_snapshot",
  "commerce_order",
  "commerce_order_item",
  "commerce_order_amount_breakdown",
  "commerce_order_event",
  "commerce_order_cancellation",
  "commerce_fulfillment_order",
  "commerce_fulfillment_item",
  "commerce_shipment",
  "commerce_shipment_package",
  "commerce_shipment_tracking_event",
  "commerce_digital_delivery",
  "commerce_payment_intent",
  "commerce_payment_attempt",
  "commerce_payment_method",
  "commerce_payment_provider",
  "commerce_payment_channel",
  "commerce_payment_webhook_event",
  "commerce_refund",
  "commerce_after_sales_request",
  "commerce_after_sales_item",
  "commerce_after_sales_return_shipment",
  "commerce_after_sales_event",
];

const requiredAppCommerceOperations = [
  "shops.list",
  "shops.retrieve",
  "shops.current.retrieve",
  "shops.current.applications.list",
  "shops.current.applications.create",
  "shops.current.verifications.list",
  "shops.current.statusEvents.list",
  "shops.current.channels.list",
  "shops.current.channels.update",
  "shops.current.fulfillmentProfile.retrieve",
  "shops.current.fulfillmentProfile.update",
  "shops.current.settlementProfile.retrieve",
  "shops.current.settlementProfile.update",
  "shops.current.products.create",
  "shops.current.inventory.stocks.adjustments.create",
  "shops.current.orders.fulfillments.create",
  "catalog.categories.list",
  "catalog.products.list",
  "catalog.products.retrieve",
  "catalog.skus.retrieve",
  "checkout.sessions.create",
  "orders.create",
  "orders.list",
  "orders.retrieve",
  "orders.pay",
  "payments.create",
  "payments.intents.create",
  "payments.methods.list",
  "shipments.packages.list",
  "shipments.trackingEvents.list",
  "refunds.create",
  "afterSales.requests.create",
  "afterSales.returnShipments.create",
];

const requiredBackendCommerceOperations = [
  "shops.management.list",
  "shops.create",
  "shops.management.retrieve",
  "shops.update",
  "shops.submitReview",
  "shops.approve",
  "shops.reject",
  "shops.suspend",
  "shops.resume",
  "shops.close",
  "shops.verifications.list",
  "shops.verifications.update",
  "shops.statusEvents.list",
  "shops.channels.list",
  "shops.channels.create",
  "shops.channels.update",
  "shops.fulfillmentProfile.retrieve",
  "shops.fulfillmentProfile.update",
  "shops.settlementProfile.retrieve",
  "shops.settlementProfile.update",
  "shops.settlementProfile.approve",
  "shops.settlementProfile.reject",
  "catalog.products.management.list",
  "catalog.products.create",
  "catalog.skus.list",
  "catalog.skus.create",
  "catalog.spus.publish",
  "inventory.stocks.list",
  "inventory.reservations.list",
  "orders.management.list",
  "orders.management.retrieve",
  "payments.providerAccounts.list",
  "payments.providerAccounts.create",
  "payments.channels.list",
  "payments.routeRules.list",
  "payments.reconciliationRuns.list",
  "payments.webhookEvents.replays.create",
  "refunds.management.list",
  "afterSales.management.list",
  "afterSales.reviews.create",
  "shipments.packages.management.list",
  "shipments.packages.create",
  "shipments.packages.update",
  "shipments.trackingEvents.list",
  "commerceReports.paymentReconciliation.retrieve",
];

function readWorkspaceFile(relativePath) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function collectFiles(root, predicate) {
  const files = [];
  for (const entry of readdirSync(root)) {
    if ([".git", "node_modules", "target"].includes(entry)) {
      continue;
    }
    const fullPath = path.join(root, entry);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function openApiOperationIds(relativePath) {
  const document = JSON.parse(readWorkspaceFile(relativePath));
  const operationIds = [];
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method)) {
        continue;
      }
      operationIds.push(String(operation.operationId));
    }
  }
  return new Set(operationIds);
}

test("commerce OpenAPI and SDK tools no longer expose appbase extraction mode", () => {
  const toolFiles = [
    "tools/commerce_openapi_export.mjs",
    "tools/commerce_sdk_generate.mjs",
  ];
  const forbiddenMarkers = [
    "--from-appbase",
    "fromAppbase",
    "DEFAULT_APPBASE_ROOT",
    "defaultAppbase",
    "extractCommerceOnlyDocument",
    "sdkwork-iam-app-api.openapi.yaml",
    "sdkwork-iam-backend-api.openapi.yaml",
  ];

  for (const relativePath of toolFiles) {
    const source = readWorkspaceFile(relativePath);
    for (const marker of forbiddenMarkers) {
      assert.equal(
        source.includes(marker),
        false,
        `${relativePath} must not keep migration-only appbase extraction marker ${marker}`,
      );
    }
  }
});

test("commerce Rust HTTP source exposes commerce-owned store type names", () => {
  const rustFiles = collectFiles(
    path.join(workspaceRoot, "crates", "sdkwork-commerce-api-server", "src"),
    (filePath) => filePath.endsWith(".rs"),
  );

  for (const filePath of rustFiles) {
    const source = readFileSync(filePath, "utf8");
    const matches = source.match(/\bAppbase[A-Za-z0-9_]*\b/g) ?? [];
    assert.deepEqual(
      [...new Set(matches)].sort(),
      [],
      `${path.relative(workspaceRoot, filePath)} must not expose Appbase-prefixed commerce Rust identifiers`,
    );
  }
});

test("commerce app catalog routes delegate to sdkwork-catalog while backend admin stays on merchandise", () => {
  const catalogRouterSource = readWorkspaceFile("crates/sdkwork-commerce-api-server/src/catalog_router.rs");
  const merchandiseLibSource = readFileSync(
    path.join(workspaceRoot, "..", "sdkwork-merchandise", "crates", "sdkwork-routes-merchandise-app-api", "src", "lib.rs"),
    "utf8",
  );
  const catalogAppRouterSource = readFileSync(
    path.join(workspaceRoot, "..", "sdkwork-catalog", "crates", "sdkwork-routes-catalog-app-api", "src", "app_catalog_router.rs"),
    "utf8",
  );

  assert.match(catalogRouterSource, /sdkwork_routes_catalog_app_api/);
  assert.match(catalogRouterSource, /sdkwork_routes_merchandise_app_api/);
  assert.match(catalogRouterSource, /build_app_catalog_router/);
  assert.match(catalogRouterSource, /build_backend_catalog_router/);
  assert.doesNotMatch(merchandiseLibSource, /build_app_catalog_router/);
  assert.match(catalogAppRouterSource, /\/app\/v3\/api\/catalog\/categories/);
  assert.match(catalogAppRouterSource, /\/app\/v3\/api\/cart\/current/);
  assert.doesNotMatch(catalogAppRouterSource, /\/backend\/v3\/api\/catalog/);
});

test("account capability repository tests do not depend on commerce T0 storage bootstrap", () => {
  const accountRepoCargo = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-account",
      "crates",
      "sdkwork-commerce-account-repository-sqlx",
      "Cargo.toml",
    ),
    "utf8",
  );
  const accountSqliteSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-account",
      "crates",
      "sdkwork-commerce-account-repository-sqlx",
      "src",
      "sqlite_account.rs",
    ),
    "utf8",
  );
  const accountTestMigration = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-account",
      "crates",
      "sdkwork-commerce-account-repository-sqlx",
      "test_migrations",
      "0001_account_repository_test.sql",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    accountRepoCargo,
    /sdkwork-commerce-storage-repository-sqlx/,
    "account repository crate must not dev-depend on commerce T0 storage bootstrap",
  );
  assert.doesNotMatch(
    accountSqliteSource,
    /commerce_migrated_sqlite_memory_pool/,
    "account repository tests must use account-local sqlite test pool",
  );
  assert.match(accountSqliteSource, /test_sqlite_pool::account_migrated_sqlite_memory_pool/);
  assert.match(accountTestMigration, /CREATE TABLE IF NOT EXISTS commerce_account/);
  assert.match(accountTestMigration, /CREATE TABLE IF NOT EXISTS commerce_account_ledger_entry/);
  assert.match(accountTestMigration, /CREATE TABLE IF NOT EXISTS commerce_idempotency_key/);
});

test("order repository does not write payment_intent SQL; payment repository owns owner order payments", () => {
  const orderSqliteSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-order",
      "crates",
      "sdkwork-commerce-order-repository-sqlx",
      "src",
      "sqlite_order.rs",
    ),
    "utf8",
  );
  const paymentOwnerSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-payment",
      "crates",
      "sdkwork-commerce-payment-repository-sqlx",
      "src",
      "sqlite_owner_order_payment.rs",
    ),
    "utf8",
  );

  assert.doesNotMatch(orderSqliteSource, /INSERT INTO commerce_payment_intent/);
  assert.doesNotMatch(orderSqliteSource, /pub async fn pay_owner_order/);
  assert.match(paymentOwnerSource, /INSERT INTO commerce_payment_intent/);
  assert.match(paymentOwnerSource, /pub async fn pay_owner_order/);
});

test("exchange and payment-attempt app routes are owned by T1 promotion and payment routers", () => {
  const promotionExchangeSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-promotion",
      "crates",
      "sdkwork-routes-promotion-app-api",
      "src",
      "exchange_router.rs",
    ),
    "utf8",
  );
  const paymentRouterSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-payment",
      "crates",
      "sdkwork-routes-payment-app-api",
      "src",
      "payment_router.rs",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    readWorkspaceFile("crates/sdkwork-commerce-api-server/src/lib.rs"),
    /mod foundation_router/,
    "commerce api-server must not keep deprecated foundation_router module",
  );
  assert.match(promotionExchangeSource, /\/app\/v3\/api\/wallet\/exchange_rate/);
  assert.match(promotionExchangeSource, /\/app\/v3\/api\/wallet\/points\/exchanges\/rules/);
  assert.match(paymentRouterSource, /\/app\/v3\/api\/payments\/attempts\/\{paymentAttemptId\}/);
});

test("catalog browse read stores use explicit merchandise read adapter", () => {
  const adapterSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-catalog",
      "crates",
      "sdkwork-commerce-catalog-repository-sqlx",
      "src",
      "read_adapter.rs",
    ),
    "utf8",
  );
  const libSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-catalog",
      "crates",
      "sdkwork-commerce-catalog-repository-sqlx",
      "src",
      "lib.rs",
    ),
    "utf8",
  );

  assert.match(adapterSource, /sdkwork_commerce_merchandise_repository_sqlx/);
  assert.match(libSource, /mod read_adapter/);
  assert.doesNotMatch(
    libSource,
    /pub use sdkwork_commerce_merchandise_repository_sqlx/,
    "catalog repository lib must route through read_adapter module",
  );
});

test("invoice app router validates write command headers on mutating routes", () => {
  const invoiceRouterSource = readFileSync(
    path.join(
      workspaceRoot,
      "..",
      "sdkwork-invoice",
      "crates",
      "sdkwork-routes-invoice-app-api",
      "src",
      "invoice_router.rs",
    ),
    "utf8",
  );

  assert.match(invoiceRouterSource, /validate_app_write_payload/);
  assert.match(invoiceRouterSource, /"invoices\.create"/);
  assert.match(invoiceRouterSource, /"invoices\.submit"/);
  assert.match(invoiceRouterSource, /"invoices\.cancel"/);
  assert.match(invoiceRouterSource, /"invoices\.update"/);
});

test("commerce source text does not describe migrated commerce capabilities as appbase-owned", () => {
  const textRoots = [
    "packages/common/commerce",
    "apps/sdkwork-commerce-pc/packages",
    "crates",
    "README.md",
  ];
  const forbiddenPatterns = [
    /\bappbase app services\b/i,
    /\bappbase admin services\b/i,
    /\bappbase output\b/i,
    /\bshared appbase contract\b/i,
    /\bLower-level appbase packages only\b/i,
    /\bfrom_appbase_tables\b/i,
    /\bappbase_membership\b/i,
  ];
  const allowedPathFragments = [
    "target",
    "node_modules",
    "generated",
    "sdks/test/verify-commerce-migration-cleanup.test.mjs",
  ];

  const files = textRoots.flatMap((relativePath) => {
    const absolutePath = path.join(workspaceRoot, relativePath);
    if (statSync(absolutePath).isFile()) {
      return [absolutePath];
    }
    return collectFiles(absolutePath, (filePath) => /\.(md|rs|ts|tsx|mjs|json)$/.test(filePath));
  });

  const violations = [];
  for (const filePath of files) {
    const relativePath = path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
    if (allowedPathFragments.some((fragment) => relativePath.includes(fragment))) {
      continue;
    }
    const source = readFileSync(filePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      const match = source.match(pattern);
      if (match) {
        violations.push(`${relativePath}: ${match[0]}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("commerce owns the migrated product, order, and payment Rust persistence surface", () => {
  const missingCrates = requiredCommerceRustCrates.filter(
    (relativePath) => !existsSync(path.join(workspaceRoot, relativePath)),
  );
  assert.deepEqual(missingCrates, [], "commerce must keep platform HTTP, runtime, contract, and storage Rust crates");

  for (const relativePath of forbiddenLocalCapabilityCrates) {
    assert.equal(
      existsSync(path.join(workspaceRoot, relativePath)),
      false,
      `commerce must not keep local capability crate ${relativePath}`,
    );
  }

  for (const { repo, serviceCrate, routerCrate } of requiredSiblingCapabilityRepos) {
    const siblingPath = path.resolve(workspaceRoot, repo, serviceCrate);
    assert.equal(
      existsSync(siblingPath),
      true,
      `sibling capability repo must exist at ${repo}/${serviceCrate}`,
    );
    if (routerCrate) {
      const routerPath = path.resolve(workspaceRoot, repo, routerCrate);
      assert.equal(
        existsSync(routerPath),
        true,
        `sibling capability router crate must exist at ${repo}/${routerCrate}`,
      );
    }
  }

  const workspaceCargo = readWorkspaceFile("Cargo.toml");
  for (const relativePath of requiredCommerceRustCrates) {
    const memberPath = relativePath.replace(/\/Cargo\.toml$/u, "");
    assert.match(
      workspaceCargo,
      new RegExp(memberPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")),
      `workspace Cargo.toml must include ${memberPath}`,
    );
  }

  const migrationSource = readWorkspaceFile(
    "crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql",
  );
  const missingTables = requiredCommerceDatabaseTables.filter(
    (tableName) => !migrationSource.includes(tableName),
  );
  assert.deepEqual(missingTables, [], "commerce SQL migration must own product, order, and payment tables");
  assert.match(
    migrationSource,
    /CREATE TABLE IF NOT EXISTS commerce_shop\s*\([\s\S]*organization_id TEXT NOT NULL[\s\S]*UNIQUE \(tenant_id, shop_no\)/,
    "commerce SQL migration must keep commerce_shop linked to appbase IAM organization_id",
  );
  assert.equal(
    /CREATE TABLE IF NOT EXISTS commerce_shop_(staff|member|role|permission|department|position)\b/.test(
      migrationSource,
    ),
    false,
    "commerce SQL migration must not duplicate appbase IAM staff, member, role, permission, department, or position tables",
  );

  for (const [tableName, requiredColumns] of Object.entries({
    commerce_shop: [
      "version INTEGER NOT NULL DEFAULT 0",
      "review_status TEXT NOT NULL",
      "data_scope TEXT NOT NULL",
      "submitted_at TEXT",
      "approved_at TEXT",
      "rejected_at TEXT",
      "suspended_at TEXT",
      "closed_at TEXT",
      "deleted_at TEXT",
    ],
    commerce_shop_application: [
      "application_no TEXT NOT NULL",
      "application_type TEXT NOT NULL",
      "review_status TEXT NOT NULL",
      "submitted_by TEXT NOT NULL",
      "submitted_at TEXT NOT NULL",
      "reviewed_by TEXT",
      "reviewed_at TEXT",
    ],
    commerce_shop_verification: [
      "verification_type TEXT NOT NULL",
      "verification_status TEXT NOT NULL",
      "legal_entity_name TEXT",
      "credential_no_hash TEXT",
      "expires_at TEXT",
    ],
    commerce_shop_status_event: [
      "event_type TEXT NOT NULL",
      "from_status TEXT",
      "to_status TEXT NOT NULL",
      "actor_id TEXT",
      "idempotency_key TEXT NOT NULL",
    ],
    commerce_shop_channel: [
      "channel_code TEXT NOT NULL",
      "storefront_status TEXT NOT NULL",
      "domain_name TEXT",
      "path_prefix TEXT",
      "theme_code TEXT",
    ],
    commerce_shop_fulfillment_profile: [
      "fulfillment_mode TEXT NOT NULL",
      "shipping_origin_region_code TEXT",
      "service_level_code TEXT",
      "after_sales_policy_json TEXT",
    ],
    commerce_shop_settlement_profile: [
      "settlement_status TEXT NOT NULL",
      "settlement_cycle TEXT NOT NULL",
      "settlement_currency_code TEXT NOT NULL",
      "account_ref TEXT",
      "risk_hold_days INTEGER NOT NULL DEFAULT 0",
    ],
    commerce_shop_metric_snapshot: [
      "snapshot_date TEXT NOT NULL",
      "gross_sales_amount TEXT NOT NULL DEFAULT '0'",
      "paid_order_count INTEGER NOT NULL DEFAULT 0",
      "fulfillment_pending_count INTEGER NOT NULL DEFAULT 0",
    ],
    commerce_shop_readiness: [
      "readiness_scope TEXT NOT NULL",
      "readiness_status TEXT NOT NULL",
      "blocking_count INTEGER NOT NULL DEFAULT 0",
      "warning_count INTEGER NOT NULL DEFAULT 0",
      "checklist_json TEXT NOT NULL DEFAULT '[]'",
      "evaluated_at TEXT NOT NULL",
      "version INTEGER NOT NULL DEFAULT 0",
    ],
    commerce_checkout_session: [
      "checkout_session_no TEXT NOT NULL",
      "owner_user_id TEXT NOT NULL",
      "request_hash TEXT NOT NULL",
      "idempotency_key TEXT NOT NULL",
      "expires_at TEXT NOT NULL",
    ],
    commerce_checkout_line: [
      "checkout_session_id TEXT NOT NULL",
      "sku_id TEXT NOT NULL",
      "purchase_type TEXT NOT NULL",
      "fulfillment_type TEXT NOT NULL",
      "price_amount_snapshot TEXT NOT NULL",
    ],
    commerce_checkout_quote: [
      "checkout_session_id TEXT NOT NULL",
      "quote_no TEXT NOT NULL",
      "shipping_amount TEXT NOT NULL DEFAULT '0'",
      "tax_amount TEXT NOT NULL DEFAULT '0'",
      "payable_amount TEXT NOT NULL",
    ],
    commerce_order_address_snapshot: [
      "order_id TEXT NOT NULL",
      "address_type TEXT NOT NULL",
      "snapshot_version INTEGER NOT NULL DEFAULT 1",
      "phone_hash TEXT",
      "address_snapshot_json TEXT NOT NULL",
    ],
    commerce_order_event: [
      "event_no TEXT NOT NULL",
      "order_id TEXT NOT NULL",
      "event_type TEXT NOT NULL",
      "from_status TEXT",
      "to_status TEXT NOT NULL",
      "idempotency_key TEXT NOT NULL",
    ],
    commerce_order_cancellation: [
      "cancellation_no TEXT NOT NULL",
      "order_id TEXT NOT NULL",
      "status TEXT NOT NULL",
      "reason_code TEXT NOT NULL",
      "idempotency_key TEXT NOT NULL",
    ],
    commerce_fulfillment_order: [
      "fulfillment_no TEXT NOT NULL",
      "order_id TEXT NOT NULL",
      "fulfillment_type TEXT NOT NULL",
      "delivery_method TEXT",
      "idempotency_key TEXT NOT NULL",
    ],
    commerce_fulfillment_item: [
      "fulfillment_id TEXT NOT NULL",
      "order_item_id TEXT NOT NULL",
      "quantity INTEGER NOT NULL",
      "fulfilled_quantity INTEGER NOT NULL DEFAULT 0",
      "status TEXT NOT NULL",
    ],
    commerce_shipment: [
      "shipment_no TEXT NOT NULL",
      "fulfillment_id TEXT NOT NULL",
      "carrier_code TEXT NOT NULL",
      "tracking_no TEXT",
      "label_ref TEXT",
    ],
    commerce_shipment_package: [
      "shipment_id TEXT NOT NULL",
      "package_no TEXT NOT NULL",
      "package_type TEXT NOT NULL",
      "weight_gram INTEGER",
      "label_ref TEXT",
    ],
    commerce_shipment_tracking_event: [
      "shipment_id TEXT NOT NULL",
      "carrier_code TEXT NOT NULL",
      "event_type TEXT NOT NULL",
      "event_time TEXT NOT NULL",
      "payload_json TEXT",
    ],
    commerce_digital_delivery: [
      "delivery_no TEXT NOT NULL",
      "fulfillment_id TEXT NOT NULL",
      "asset_ref TEXT NOT NULL",
      "access_grant_ref TEXT",
      "status TEXT NOT NULL",
    ],
  })) {
    assert.ok(
      migrationSource.includes(`CREATE TABLE IF NOT EXISTS ${tableName}`),
      `commerce SQL migration must create ${tableName}`,
    );
    for (const column of requiredColumns) {
      assert.ok(
        migrationSource.includes(column),
        `commerce SQL migration ${tableName} must include ${column}`,
      );
    }
  }

  for (const indexName of [
    "idx_commerce_shop_review_status",
    "idx_commerce_shop_application_review",
    "idx_commerce_shop_verification_status",
    "idx_commerce_shop_status_event_shop_created",
    "idx_commerce_shop_channel_shop_code",
    "idx_commerce_shop_fulfillment_profile_shop",
    "idx_commerce_shop_settlement_profile_status",
    "idx_commerce_shop_metric_snapshot_shop_date",
    "idx_commerce_shop_readiness_status",
    "idx_commerce_checkout_session_owner_status",
    "idx_commerce_checkout_line_session_sku",
    "idx_commerce_checkout_quote_session_status",
    "idx_commerce_order_address_snapshot_order_type",
    "idx_commerce_order_event_order_created",
    "idx_commerce_order_cancellation_order_status",
    "idx_commerce_fulfillment_order_order_status",
    "idx_commerce_fulfillment_item_fulfillment_status",
    "idx_commerce_shipment_fulfillment_status",
    "idx_commerce_shipment_tracking_no",
    "idx_commerce_shipment_package_shipment",
    "idx_commerce_shipment_tracking_event_shipment_time",
    "idx_commerce_digital_delivery_fulfillment_status",
  ]) {
    assert.ok(
      migrationSource.includes(`CREATE INDEX IF NOT EXISTS ${indexName}`),
      `commerce SQL migration must expose shop index ${indexName}`,
    );
  }
});

test("commerce app and backend OpenAPI keep migrated product, order, and payment operations", () => {
  const appOperationIds = openApiOperationIds("apis/app-api/commerce/commerce-app-api.openapi.json");
  const backendOperationIds = openApiOperationIds(
    "apis/backend-api/commerce/commerce-backend-api.openapi.json",
  );

  assert.deepEqual(
    requiredAppCommerceOperations.filter((operationId) => !appOperationIds.has(operationId)),
    [],
    "commerce app OpenAPI must keep product, checkout, order, payment, and refund operations",
  );
  assert.deepEqual(
    requiredBackendCommerceOperations.filter((operationId) => !backendOperationIds.has(operationId)),
    [],
    "commerce backend OpenAPI must keep product, inventory, order, payment, refund, and reporting operations",
  );
  for (const operationId of [...appOperationIds, ...backendOperationIds]) {
    assert.equal(
      /(^|\.)shops\.(staff|members|roles|permissions)\./.test(operationId),
      false,
      `commerce OpenAPI must not expose shop IAM duplicate operation ${operationId}`,
    );
  }
});
