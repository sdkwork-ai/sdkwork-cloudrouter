import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");
const siblingClawRouterRoot = path.resolve(workspaceRoot, "..", "sdkwork-clawrouter");
const commercePcRoot = path.join(workspaceRoot, "apps", "sdkwork-commerce-pc");
const productAdminRoot = path.join(commercePcRoot, "packages", "sdkwork-commerce-pc-admin-product");
const clawRouterCatalogRoot = path.join(
  siblingClawRouterRoot,
  "apps",
  "sdkwork-clawrouter-pc",
  "packages",
  "sdkwork-clawrouter-pc-admin-catalog",
);
const migratedBackendCatalogOperations = [
  {
    method: "delete",
    operationId: "catalog.products.delete",
    path: "/backend/v3/api/catalog/products/{productId}",
  },
  {
    method: "delete",
    operationId: "catalog.skus.delete",
    path: "/backend/v3/api/catalog/skus/{skuId}",
  },
  {
    method: "post",
    operationId: "catalog.categorySeeds.create",
    path: "/backend/v3/api/catalog/category_seeds/initialize",
  },
  {
    method: "get",
    operationId: "catalog.categoryAttributes.list",
    path: "/backend/v3/api/catalog/category_attributes",
  },
  {
    method: "post",
    operationId: "catalog.categoryAttributes.create",
    path: "/backend/v3/api/catalog/category_attributes",
  },
  {
    method: "patch",
    operationId: "catalog.categoryAttributes.update",
    path: "/backend/v3/api/catalog/category_attributes/{bindingId}",
  },
  {
    method: "delete",
    operationId: "catalog.categoryAttributes.delete",
    path: "/backend/v3/api/catalog/category_attributes/{bindingId}",
  },
];

function read(relativePath) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function readSiblingMerchandiseService(relativePath) {
  return readFileSync(
    path.join(workspaceRoot, "..", "sdkwork-merchandise", "crates", "sdkwork-commerce-merchandise-service", relativePath),
    "utf8",
  );
}

function readProductAdmin(relativePath) {
  return readFileSync(path.join(productAdminRoot, relativePath), "utf8");
}

function readClawRouterCatalog(relativePath) {
  return readFileSync(path.join(clawRouterCatalogRoot, relativePath), "utf8");
}

test("commerce pc app and product admin package own the migrated product center module", () => {
  assert.equal(
    existsSync(path.join(commercePcRoot, "sdkwork.app.config.json")),
    true,
    "apps/sdkwork-commerce-pc must declare its SDKWork app manifest before owning PC admin modules",
  );
  assert.equal(
    existsSync(path.join(productAdminRoot, "package.json")),
    true,
    "Commerce must expose apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product",
  );
  assert.equal(
    existsSync(path.join(productAdminRoot, "specs", "component.spec.json")),
    true,
    "Commerce product admin package must have a component spec",
  );

  const packageJson = JSON.parse(readProductAdmin("package.json"));
  assert.equal(packageJson.name, "@sdkwork/commerce-pc-admin-product");
  assert.equal(packageJson.sdkwork?.workspace, "sdkwork-commerce");
  assert.equal(packageJson.sdkwork?.capability, "product-admin");

  const componentSpec = JSON.parse(readProductAdmin(path.join("specs", "component.spec.json")));
  const canonicalSpecs = (componentSpec.canonicalSpecs ?? []).map((entry) => entry.file);
  assert.ok(canonicalSpecs.includes("APP_PC_ARCHITECTURE_SPEC.md"));
  assert.ok(canonicalSpecs.includes("BACKEND_UI_SPEC.md"));
  assert.equal(componentSpec.component?.domain, "commerce");
  assert.equal(componentSpec.component?.capability, "product-admin");
});

test("commerce product admin package exports reusable admin components and service factory", () => {
  const source = readProductAdmin(path.join("src", "index.tsx"));

  for (const expectedExport of [
    "CatalogAdmin",
    "CommerceProductAdmin",
    "createCommerceProductAdminService",
    "createCommerceProductAdminWorkspaceManifest",
    "ProductListPage",
    "ProductCreatePage",
    "CategoryManagementPage",
    "SkuManagementPage",
    "AttributeManagementPage",
  ]) {
    assert.match(source, new RegExp(`\\b${expectedExport}\\b`), `${expectedExport} must be exported`);
  }
});

test("migrated product admin UI preserves the current visual markers", () => {
  const source = [
    readProductAdmin(path.join("src", "index.tsx")),
    readProductAdmin(path.join("src", "ProductListPage.tsx")),
    readProductAdmin(path.join("src", "CategoryManagementPage.tsx")),
    readProductAdmin(path.join("src", "AttributeManagementPage.tsx")),
  ].join("\n");

  for (const visualMarker of [
    "data-admin-product-list-page",
    "data-admin-category-management-page",
    "data-admin-catalog-attribute-management-page",
    "admin-catalog-table-viewport",
    "bg-slate-50",
    "dark:bg-[#0a0a0a]",
    "bg-lobster-600",
  ]) {
    assert.ok(source.includes(visualMarker), `migrated UI must preserve ${visualMarker}`);
  }

  for (const forbidden of [
    "sdkwork-clawroutes-pc-commons",
    "getClawRouterBackendSdkClient",
    "createIdempotencyParams",
  ]) {
    assert.ok(!source.includes(forbidden), `Commerce product admin source must not import ${forbidden}`);
  }
});

test("commerce backend service method tree exposes the complete catalog admin flow", () => {
  const portsSource = read("packages/common/commerce/sdkwork-commerce-sdk-ports/src/index.ts");

  for (const expected of [
    "categorySeeds",
    "categoryAttributes",
    "delete: true",
  ]) {
    assert.ok(portsSource.includes(expected), `Commerce backend method tree must include ${expected}`);
  }

  const requiredMethodMarkers = [
    "catalog.products.delete",
    "catalog.skus.delete",
    "catalog.categorySeeds.create",
    "catalog.categoryAttributes.list",
    "catalog.categoryAttributes.create",
    "catalog.categoryAttributes.update",
    "catalog.categoryAttributes.delete",
  ];
  for (const method of requiredMethodMarkers) {
    const segments = method.split(".");
    let cursor = portsSource;
    for (const segment of segments) {
      const index = cursor.indexOf(segment);
      assert.notEqual(index, -1, `Commerce backend method tree must expose ${method}`);
      cursor = cursor.slice(index + segment.length);
    }
  }
});

test("commerce owns the migrated backend catalog operations across contracts, routes, and OpenAPI", () => {
  const contractsSource = read("packages/common/commerce/sdkwork-commerce-contracts/src/index.ts");
  const routeTablesSource = read("crates/sdkwork-commerce-api-server/src/route_tables.rs");
  const backendRouteManifest = JSON.parse(
    read("sdks/_route-manifests/backend-api/sdkwork-commerce-api-server.route-manifest.json"),
  );
  const backendRouteManifestSource = JSON.stringify(backendRouteManifest);
  const catalogServiceSource = readSiblingMerchandiseService("src/service/mod.rs");
  const qualityGateSource = read("tools/commerce_schema_quality_gate.mjs");
  const backendOpenapi = JSON.parse(read("apis/backend-api/commerce/commerce-backend-api.openapi.json"));

  for (const { method, operationId, path: apiPath } of migratedBackendCatalogOperations) {
    assert.ok(
      contractsSource.includes(`operation("${method.toUpperCase()}", \`${"${backend}"}${apiPath.slice("/backend/v3/api".length)}\``) ||
        contractsSource.includes(`operation("${method.toUpperCase()}", \`${apiPath}\``),
      `Commerce TypeScript contracts must define ${method.toUpperCase()} ${apiPath}`,
    );
    assert.ok(contractsSource.includes(`"${operationId}"`), `Commerce TypeScript contracts must define ${operationId}`);
    assert.ok(
      routeTablesSource.includes("COMMERCE_BACKEND_HTTP_ROUTES") ||
        backendRouteManifestSource.includes(`"${apiPath}"`),
      `Commerce Rust backend routes must expose ${apiPath}`,
    );
    assert.ok(
      routeTablesSource.includes("COMMERCE_BACKEND_HTTP_ROUTES") ||
        backendRouteManifestSource.includes(`"${operationId}"`),
      `Commerce Rust backend routes must expose ${operationId}`,
    );
    assert.ok(qualityGateSource.includes(`"${operationId}"`), `Commerce SDK quality gate must require ${operationId}`);

    const operation = backendOpenapi.paths?.[apiPath]?.[method];
    assert.ok(operation, `Commerce backend OpenAPI must expose ${method.toUpperCase()} ${apiPath}`);
    assert.equal(operation.operationId, operationId);
    assert.equal(operation["x-sdkwork-owner"], "sdkwork-commerce");
    assert.equal(operation["x-sdkwork-api-authority"], "sdkwork-commerce-backend-api");
    assert.equal(operation["x-sdkwork-domain"], "commerce");
  }

  for (const command of [
    "catalog.products.delete",
    "catalog.skus.delete",
    "catalog.categorySeeds.create",
    "catalog.categoryAttributes.create",
    "catalog.categoryAttributes.update",
    "catalog.categoryAttributes.delete",
  ]) {
    assert.ok(catalogServiceSource.includes(`"${command}"`), `Merchandise catalog service must expose write command ${command}`);
  }

  assert.ok(
    catalogServiceSource.includes('"catalog.categoryAttributes.list"'),
    "Commerce catalog service must expose category attribute read query",
  );
});

test("claw-router catalog admin package delegates to commerce product admin package", () => {
  const packageJson = JSON.parse(readClawRouterCatalog("package.json"));
  assert.equal(
    packageJson.dependencies?.["@sdkwork/commerce-pc-admin-product"],
    "workspace:*",
    "Claw Router adapter package must depend on the Commerce product admin package",
  );

  const adapterSource = readClawRouterCatalog(path.join("src", "index.tsx"));
  const adapterServiceSource = readClawRouterCatalog(path.join("src", "catalogService.ts"));

  assert.match(adapterSource, /@sdkwork\/commerce-pc-admin-product/);
  assert.match(adapterServiceSource, /@sdkwork\/commerce-pc-admin-product/);

  for (const forbidden of [
    "getClawRouterBackendSdkClient().commerce.catalog",
    "sdkwork-clawroutes-pc-commons/runtime",
    "createIdempotencyParams",
  ]) {
    assert.ok(!adapterSource.includes(forbidden), `adapter component must not contain ${forbidden}`);
    assert.ok(!adapterServiceSource.includes(forbidden), `adapter service must not contain ${forbidden}`);
  }
});
