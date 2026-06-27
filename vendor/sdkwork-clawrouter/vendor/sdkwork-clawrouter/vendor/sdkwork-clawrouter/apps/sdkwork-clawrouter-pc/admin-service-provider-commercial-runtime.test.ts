import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function readWorkspaceFile(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("admin service provider center is a commercial provider management surface", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const adminRegistrySource = readPortalFile("./src/adminModuleRegistry.ts");
  const i18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts");
  const serviceProviderI18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/service-provider.ts");
  const serviceProviderSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/src/index.tsx");
  const serviceProviderFormsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/src/serviceProviderForms.ts");
  const serviceProviderServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/src/serviceProviderService.ts");

  assert.match(
    adminRegistrySource,
    /id:\s*'serviceProviderCenter',\s*nameKey:\s*'admin\.header\.serviceProviderCenter'[\s\S]*defaultPath:\s*'\/admin\/service-providers\/dashboard'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/service-providers'[^\]]*\]/,
  );
  assert.match(appSource, /type AdminSectionRouteProps = \{[\s\S]*sectionId\?: string;/);
  assert.match(appSource, /const ServiceProviderAdmin = lazyRoute<AdminSectionRouteProps>\(\(\) => import\('sdkwork-clawrouter-pc-admin-service-provider'\), 'ServiceProviderAdmin'\);/);
  assert.match(appSource, /<Route path="service-providers" element=\{<Navigate to="\/admin\/service-providers\/dashboard" replace \/>} \/>/);

  for (const [path, sectionId] of [
    ["dashboard", "dashboard"],
    ["providers", "providers"],
    ["relations", "relations"],
    ["downstreams", "downstreams"],
    ["members", "members"],
    ["bindings", "bindings"],
    ["contracts", "contracts"],
    ["pricing", "pricing"],
    ["usage", "usage"],
    ["wallet", "wallet"],
    ["statements", "statements"],
    ["reconciliation", "reconciliation"],
    ["adjustments", "adjustments"],
    ["risk", "risk"],
    ["audit", "audit"],
  ] as const) {
    assert.match(
      appSource,
      new RegExp(`<Route path="service-providers/${path}" element=\\{<ServiceProviderAdmin sectionId="${sectionId}" />\\} />`),
      `missing service provider route ${path}`,
    );
    assert.match(
      adminRegistrySource,
      new RegExp(`path:\\s*'/admin/service-providers/${path}',\\s*labelKey:\\s*'admin\\.menu\\.serviceProvider\\.${sectionId}'`),
      `missing service provider menu item ${sectionId}`,
    );
    assert.match(i18nSource, new RegExp(`"admin\\.menu\\.serviceProvider\\.${sectionId}"`), `missing i18n menu key ${sectionId}`);
  }

  assert.match(serviceProviderSource, /export type ServiceProviderAdminSectionId/);
  assert.match(serviceProviderSource, /function resolveServiceProviderSectionId/);
  assert.match(serviceProviderSource, /buildServiceProviderSections/);
  assert.match(serviceProviderSource, /AdminResourceCenter/);
  assert.match(serviceProviderSource, /activeSectionId=\{activeSectionId\}/);
  assert.match(serviceProviderSource, /showSectionNavigation=\{false\}/);
  assert.match(serviceProviderSource, /data-admin-service-provider="commercial-center"/);
  assert.match(serviceProviderSource, /data-admin-service-provider-chain-filters/);
  assert.match(serviceProviderSource, /type ServiceProviderChainFilters/);
  assert.match(serviceProviderSource, /providerId/);
  assert.match(serviceProviderSource, /sellerProviderId/);
  assert.match(serviceProviderSource, /buyerProviderId/);
  assert.match(serviceProviderSource, /edgeId/);
  assert.match(serviceProviderSource, /buildServiceProviderSections\([\s\S]*serviceProviderListParams/);
  assert.match(serviceProviderSource, /backendServiceProviderDownstreamCreate/);
  assert.match(serviceProviderSource, /backendServiceProviderPricingRuleCreate/);
  assert.match(serviceProviderSource, /backendServiceProviderPricingRuleUpdate/);
  assert.match(serviceProviderSource, /toServiceProviderDownstreamCreateRequest/);
  assert.match(serviceProviderSource, /toServiceProviderPricingRuleCreateRequest/);
  assert.match(serviceProviderSource, /toServiceProviderPricingRuleUpdateCommand/);
  assert.match(serviceProviderSource, /action:\s*\{\s*label:\s*t\('admin\.serviceProvider\.downstreams\.addAction'/);
  assert.match(serviceProviderSource, /action:\s*\{\s*label:\s*t\('admin\.serviceProvider\.pricing\.maintainAction'/);
  assert.match(serviceProviderSource, /data-admin-service-provider-form="downstream"/);
  assert.match(serviceProviderSource, /data-admin-service-provider-form="pricing-rule"/);
  assert.match(serviceProviderSource, /SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES/);
  assert.doesNotMatch(serviceProviderSource, /SERVICE_PROVIDER_PRICING_METHODS/);
  assert.match(serviceProviderSource, /data-admin-service-provider-pricing-resource-category/);
  assert.doesNotMatch(serviceProviderSource, /data-admin-service-provider-pricing-method/);
  assert.match(serviceProviderSource, /admin\.serviceProvider\.form\.defaultMultiplier', 'Official price multiplier'/);
  assert.match(serviceProviderI18nSource, /admin\.serviceProvider\.form\.defaultMultiplier/);
  assert.match(serviceProviderI18nSource, /admin\.serviceProvider\.pricing\.resourceCategory\.api_resource/);
  assert.match(serviceProviderI18nSource, /admin\.serviceProvider\.pricing\.methodHint\.specifiedUnitPrice/);
  assert.doesNotMatch(serviceProviderI18nSource, /admin\.serviceProvider\.pricing\.method\.official_multiplier/);
  assert.match(serviceProviderFormsSource, /api_request/);
  assert.match(serviceProviderFormsSource, /sfx_result/);
  assert.doesNotMatch(serviceProviderSource, /ServiceProviderAccountService/);
  assert.doesNotMatch(serviceProviderSource, /provider\.account/);

  assert.match(serviceProviderServiceSource, /getClawRouterBackendSdkClient\(\)\.serviceProviders/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.dashboard\.retrieve\(params\)/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.providerRegistry\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.relations\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.downstreams\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.downstreams\.create/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.members\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.bindings\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.contracts\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.pricingRules\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.pricingRules\.create/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.pricingRules\.update/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.priceSimulation\.create/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.usage\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.providerWalletAccounts\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.statements\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.reconciliationRuns\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.adjustments\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.riskEvents\.list/);
  assert.match(serviceProviderServiceSource, /serviceProviders\.auditEvents\.list/);
  assert.doesNotMatch(serviceProviderServiceSource, /openPlatform/);
  assert.doesNotMatch(serviceProviderServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(serviceProviderServiceSource, /\baxios\b/);
});

test("service provider commercial schema, contract, OpenAPI, and SDK are registered", () => {
  const schemaSource = readWorkspaceFile("generated/schema/registry/sdkwork-clawrouter.tables.effective.yaml");
  const manifest = JSON.parse(readWorkspaceFile("generated/api/api-contract-manifest.json")) as {
    operations: Array<{
      api_surface: string;
      operation_id: string;
      tag: string;
      api_path: string;
    }>;
  };
  const openapi = JSON.parse(readWorkspaceFile("generated/openapi/clawrouter-backend-openapi.json")) as {
    paths: Record<string, unknown>;
  };
  const sdkSource = readWorkspaceFile("sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const sdkApiSource = readWorkspaceFile("sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/api/service-providers.ts");

  for (const table of [
    "integration_service_provider",
    "integration_service_provider_edge",
    "integration_service_provider_closure",
    "integration_service_provider_member",
    "integration_service_provider_subject_binding",
    "integration_service_provider_contract",
    "integration_service_provider_finance_profile",
    "integration_service_provider_price_plan",
    "integration_service_provider_price_rule",
    "ai_usage_service_provider_edge",
    "commerce_usage_service_provider_statement",
    "commerce_usage_service_provider_adjustment",
    "commerce_usage_service_provider_reconciliation_run",
    "commerce_usage_service_provider_reconciliation_item",
    "commerce_service_provider_exposure_snapshot",
    "analytics_service_provider_daily",
    "analytics_service_provider_edge_daily",
  ]) {
    assert.match(schemaSource, new RegExp(`- table: ${table}\\r?\\n`), `missing schema table ${table}`);
  }
  assert.doesNotMatch(schemaSource, /- table: ai_usage_service_provider_chain\r?\n/);
  assert.doesNotMatch(schemaSource, /\bchain_id:\s*int64\b/);
  for (const removedTable of [
    "integration_provider_invoice_import",
    "integration_provider_invoice_item",
    "commerce_usage_service_provider_settlement",
    "commerce_usage_service_provider_statement_item",
    "integration_service_provider_account_binding",
    "integration_service_provider_contract_version",
    "integration_service_provider_price_change_request",
  ]) {
    assert.doesNotMatch(schemaSource, new RegExp(`- table: ${removedTable}\\r?\\n`), `${removedTable} must stay out of the active schema`);
  }

  const serviceProviderOperationIds = new Set(
    manifest.operations
      .filter((operation) => operation.api_surface === "backend" && operation.tag === "serviceProviders")
      .map((operation) => operation.operation_id),
  );

  for (const operationId of [
    "dashboard.retrieve",
    "providerRegistry.list",
    "relations.list",
    "downstreams.list",
    "downstreams.create",
    "members.list",
    "bindings.list",
    "contracts.list",
    "pricingRules.list",
    "pricingRules.create",
    "pricingRules.update",
    "priceSimulation.create",
    "usage.list",
    "providerWalletAccounts.list",
    "statements.list",
    "reconciliationRuns.list",
    "adjustments.list",
    "riskEvents.list",
    "auditEvents.list",
  ]) {
    assert.ok(serviceProviderOperationIds.has(operationId), `missing service provider operation ${operationId}`);
  }

  for (const path of [
    "/backend/v3/api/service_providers/dashboard",
    "/backend/v3/api/service_providers/providers",
    "/backend/v3/api/service_providers/relations",
    "/backend/v3/api/service_providers/downstreams",
    "/backend/v3/api/service_providers/pricing/rules",
    "/backend/v3/api/service_providers/pricing/simulations",
    "/backend/v3/api/service_providers/usage",
    "/backend/v3/api/service_providers/statements",
    "/backend/v3/api/service_providers/reconciliation_runs",
  ]) {
    assert.ok(openapi.paths[path], `backend OpenAPI must expose ${path}`);
  }

  assert.match(sdkSource, /import \{ ServiceProvidersApi, createServiceProvidersApi \} from '\.\/api\/service-providers';/);
  assert.match(sdkSource, /public readonly serviceProviders: ServiceProvidersApi;/);
  assert.match(sdkSource, /this\.serviceProviders = createServiceProvidersApi\(this\.httpClient\);/);
  assert.match(sdkApiSource, /class ServiceProvidersApi/);
  assert.match(sdkApiSource, /providerId\?: string;/);
  assert.match(sdkApiSource, /sellerProviderId\?: string;/);
  assert.match(sdkApiSource, /buyerProviderId\?: string;/);
  assert.match(sdkApiSource, /edgeId\?: string;/);
  assert.match(sdkApiSource, /public readonly dashboard: ServiceProvidersDashboardApi;/);
  assert.match(sdkApiSource, /public readonly priceSimulation: ServiceProvidersPriceSimulationApi;/);
  assert.match(sdkApiSource, /class ServiceProvidersPriceSimulationApi[\s\S]*async create\(/);
  assert.match(sdkApiSource, /class ServiceProvidersDownstreamsApi[\s\S]*async create\(/);
  assert.match(sdkApiSource, /class ServiceProvidersPricingRulesApi[\s\S]*async create\(/);
  assert.match(sdkApiSource, /class ServiceProvidersPricingRulesApi[\s\S]*async update\(/);
});
