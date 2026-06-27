import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(testDir, "..");
const backendOpenapiPath = path.join(
  sdkRoot,
  "..",
  "..",
  "apis",
  "backend-api",
  "commerce",
  "commerce-backend-api.openapi.json",
);
const backendOnlyShopRequestSchemas = [
  "CreateShopRequest",
  "UpdateShopRequest",
  "SubmitShopReviewRequest",
  "ApproveShopRequest",
  "RejectShopRequest",
  "SuspendShopRequest",
  "ResumeShopRequest",
  "CloseShopRequest",
  "UpdateShopVerificationRequest",
  "CreateShopChannelRequest",
  "ApproveShopSettlementProfileRequest",
  "RejectShopSettlementProfileRequest",
  "CreateShopPolicyRequest",
  "UpdateShopDepositAccountRequest",
  "ReviewShopDepositAccountRequest",
  "CreateShopRiskSignalRequest",
  "ResolveShopRiskSignalRequest",
];

test("sdkwork-commerce-backend-sdk uses sdkwork-v3 profile", () => {
  const source = readFileSync(path.join(sdkRoot, "bin/generate-sdk.mjs"), "utf8");
  assert.match(source, /--standard-profile/);
  assert.match(source, /sdkwork-v3/);
  assert.match(source, /runCommerceSdkGenerator/);
});

test("sdkwork-commerce-backend-sdk declares appbase as a consumer SDK dependency", () => {
  const assembly = JSON.parse(readFileSync(path.join(sdkRoot, ".sdkwork-assembly.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(path.join(sdkRoot, "sdk-manifest.json"), "utf8"));
  for (const document of [assembly, manifest]) {
    assert.equal(document.sdkOwner, "sdkwork-commerce");
    assert.equal(document.apiAuthority, "sdkwork-commerce-backend-api");
    assert.equal(document.generationInputSpec, "../../apis/backend-api/commerce/commerce-backend-api.openapi.json");
    assert.deepEqual(
      document.sdkDependencies?.map((dependency) => ({
        workspace: dependency.workspace,
        apiAuthority: dependency.apiAuthority,
        dependencyMode: dependency.dependencyMode,
        generatedTransportImportPolicy: dependency.generatedTransportImportPolicy,
      })),
      [
        {
          workspace: "sdkwork-iam-backend-sdk",
          apiAuthority: "sdkwork-iam-backend-api",
          dependencyMode: "consumer-sdk",
          generatedTransportImportPolicy: "forbidden",
        },
      ],
    );
  }
});

test("sdkwork-commerce-backend-sdk exposes complete admin payment and recharge management methods", () => {
  const openapi = readFileSync(
    backendOpenapiPath,
    "utf8",
  );
  const paymentsSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "payments.ts",
    ),
    "utf8",
  );
  const rechargesSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "recharges.ts",
    ),
    "utf8",
  );

  assert.match(openapi, /"operationId": "payments\.providerAccounts\.delete"/);
  assert.match(openapi, /"operationId": "payments\.providerAccounts\.status\.update"/);
  assert.match(openapi, /"operationId": "payments\.runtime\.snapshot\.retrieve"/);
  assert.match(openapi, /"operationId": "recharges\.packages\.management\.list"/);
  assert.doesNotMatch(openapi, /"operationId": "recharges\.packages\.list"/);
  assert.match(openapi, /"operationId": "recharges\.packages\.delete"/);
  assert.match(openapi, /"operationId": "recharges\.settings\.management\.retrieve"/);
  assert.doesNotMatch(openapi, /"operationId": "recharges\.settings\.retrieve"/);
  assert.match(openapi, /"operationId": "recharges\.settings\.update"/);
  assert.match(paymentsSource, /async delete\(providerAccountId: string/);
  assert.match(paymentsSource, /class PaymentsProviderAccountsStatusApi/);
  assert.match(paymentsSource, /class PaymentsRuntimeSnapshotApi/);
  assert.match(paymentsSource, /public readonly status: PaymentsProviderAccountsStatusApi/);
  assert.match(paymentsSource, /public readonly snapshot: PaymentsRuntimeSnapshotApi/);
  assert.match(rechargesSource, /class RechargesPackagesManagementApi[\s\S]*async list\(params\?: RechargesPackagesManagementListParams/);
  assert.match(rechargesSource, /class RechargesPackagesApi[\s\S]*public readonly management: RechargesPackagesManagementApi/);
  assert.match(rechargesSource, /async delete\(packageId: string/);
  assert.match(rechargesSource, /class RechargesSettingsManagementApi[\s\S]*async retrieve\(\): Promise<CommerceApiResult>/);
  assert.match(rechargesSource, /class RechargesSettingsApi[\s\S]*public readonly management: RechargesSettingsManagementApi/);
  assert.match(rechargesSource, /public readonly settings: RechargesSettingsApi/);
});

test("sdkwork-commerce-backend-sdk exposes complete admin promotion inspection methods", () => {
  const openapi = readFileSync(
    backendOpenapiPath,
    "utf8",
  );
  const promotionsSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "promotions.ts",
    ),
    "utf8",
  );

  for (const operationId of [
    "promotions.codes.redemptions.list",
    "promotions.couponLedgerEntries.list",
    "promotions.budgetLedgerEntries.list",
    "promotions.externalBindings.list",
    "promotions.events.list",
  ]) {
    assert.match(openapi, new RegExp(`"operationId": "${operationId.replaceAll(".", "\\.")}"`));
  }
  assert.match(promotionsSource, /class PromotionsCodesRedemptionsApi/);
  assert.match(promotionsSource, /public readonly redemptions: PromotionsCodesRedemptionsApi/);
  assert.match(promotionsSource, /class PromotionsCouponLedgerEntriesApi/);
  assert.match(promotionsSource, /class PromotionsBudgetLedgerEntriesApi/);
  assert.match(promotionsSource, /class PromotionsExternalBindingsApi/);
  assert.match(promotionsSource, /class PromotionsEventsApi/);
});

test("sdkwork-commerce-backend-sdk exposes canonical admin membership entitlement methods", () => {
  const openapi = readFileSync(
    backendOpenapiPath,
    "utf8",
  );
  const membershipsSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "memberships.ts",
    ),
    "utf8",
  );

  assert.match(openapi, /"operationId": "memberships\.entitlements\.list"/);
  assert.doesNotMatch(openapi, /"operationId": "memberships\.entitlements\.management\.list"/);
  assert.match(openapi, /"x-sdkwork-resource": "memberships\.entitlements"/);
  assert.match(membershipsSource, /class MembershipsEntitlementsApi[\s\S]*async list\(params\?: MembershipsEntitlementsListParams/);
  assert.doesNotMatch(membershipsSource, /class MembershipsEntitlementsManagementApi/);
});

test("sdkwork-commerce-backend-sdk exposes admin shop operating capability methods", () => {
  const openapi = readFileSync(
    backendOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );

  for (const operationId of [
    "shops.businessHours.retrieve",
    "shops.businessHours.update",
    "shops.serviceAreas.list",
    "shops.serviceAreas.create",
    "shops.serviceAreas.update",
    "shops.policies.list",
    "shops.policies.create",
    "shops.policies.update",
    "shops.depositAccount.retrieve",
    "shops.depositAccount.update",
    "shops.depositAccount.review",
    "shops.riskSignals.list",
    "shops.riskSignals.create",
    "shops.riskSignals.resolve",
  ]) {
    assert.match(openapi, new RegExp(`"operationId": "${operationId.replaceAll(".", "\\.")}"`));
  }

  assert.match(generatedSource, /class ShopsBusinessHoursApi[\s\S]*async retrieve\(shopId: string\): Promise<ShopBusinessHourResponse>/);
  assert.match(generatedSource, /class ShopsBusinessHoursApi[\s\S]*async update\(shopId: string, body: UpdateShopBusinessHourRequest/);
  assert.match(generatedSource, /class ShopsServiceAreasApi[\s\S]*async list\(shopId: string, params\?: ShopsServiceAreasListParams/);
  assert.match(generatedSource, /class ShopsServiceAreasApi[\s\S]*async create\(shopId: string, body: CreateShopServiceAreaRequest/);
  assert.match(generatedSource, /class ShopsServiceAreasApi[\s\S]*async update\(shopId: string, serviceAreaId: string, body: UpdateShopServiceAreaRequest/);
  assert.match(generatedSource, /class ShopsPoliciesApi[\s\S]*async list\(shopId: string, params\?: ShopsPoliciesListParams/);
  assert.match(generatedSource, /class ShopsPoliciesApi[\s\S]*async create\(shopId: string, body: CreateShopPolicyRequest/);
  assert.match(generatedSource, /class ShopsPoliciesApi[\s\S]*async update\(shopId: string, policyId: string, body: UpdateShopPolicyRequest/);
  assert.match(generatedSource, /class ShopsDepositAccountApi[\s\S]*async retrieve\(shopId: string\): Promise<ShopDepositAccountResponse>/);
  assert.match(generatedSource, /class ShopsDepositAccountApi[\s\S]*async update\(shopId: string, body: UpdateShopDepositAccountRequest/);
  assert.match(generatedSource, /class ShopsDepositAccountApi[\s\S]*async review\(shopId: string, body: ReviewShopDepositAccountRequest/);
  assert.match(generatedSource, /class ShopsRiskSignalsApi[\s\S]*async list\(shopId: string, params\?: ShopsRiskSignalsListParams/);
  assert.match(generatedSource, /class ShopsRiskSignalsApi[\s\S]*async create\(shopId: string, body: CreateShopRiskSignalRequest/);
  assert.match(generatedSource, /class ShopsRiskSignalsApi[\s\S]*async resolve\(shopId: string, riskSignalId: string, body: ResolveShopRiskSignalRequest/);
  assert.match(generatedSource, /public readonly businessHours: ShopsBusinessHoursApi/);
  assert.match(generatedSource, /public readonly serviceAreas: ShopsServiceAreasApi/);
  assert.match(generatedSource, /public readonly policies: ShopsPoliciesApi/);
  assert.match(generatedSource, /public readonly depositAccount: ShopsDepositAccountApi/);
  assert.match(generatedSource, /public readonly riskSignals: ShopsRiskSignalsApi/);
});

test("sdkwork-commerce-backend-sdk exposes WeChat-aligned shop configuration management methods", () => {
  const openapi = readFileSync(
    backendOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );

  for (const operationId of [
    "shops.categoryBindings.list",
    "shops.categoryBindings.upsert",
    "shops.brandAuthorizations.list",
    "shops.brandAuthorizations.upsert",
    "shops.qualifications.list",
    "shops.qualifications.upsert",
    "shops.customerServices.list",
    "shops.customerServices.upsert",
    "shops.returnAddresses.list",
    "shops.returnAddresses.upsert",
    "shops.shippingTemplates.list",
    "shops.shippingTemplates.upsert",
  ]) {
    assert.match(openapi, new RegExp(`"operationId": "${operationId.replaceAll(".", "\\.")}"`));
  }

  assert.match(generatedSource, /class ShopsCategoryBindingsApi[\s\S]*async list\(shopId: string, params\?: ShopsCategoryBindingsListParams/);
  assert.match(generatedSource, /class ShopsCategoryBindingsApi[\s\S]*async upsert\(shopId: string, body: UpsertShopCategoryBindingRequest/);
  assert.match(generatedSource, /class ShopsBrandAuthorizationsApi[\s\S]*async list\(shopId: string, params\?: ShopsBrandAuthorizationsListParams/);
  assert.match(generatedSource, /class ShopsBrandAuthorizationsApi[\s\S]*async upsert\(shopId: string, body: UpsertShopBrandAuthorizationRequest/);
  assert.match(generatedSource, /class ShopsQualificationsApi[\s\S]*async list\(shopId: string, params\?: ShopsQualificationsListParams/);
  assert.match(generatedSource, /class ShopsQualificationsApi[\s\S]*async upsert\(shopId: string, body: UpsertShopQualificationRequest/);
  assert.match(generatedSource, /class ShopsCustomerServicesApi[\s\S]*async list\(shopId: string, params\?: ShopsCustomerServicesListParams/);
  assert.match(generatedSource, /class ShopsCustomerServicesApi[\s\S]*async upsert\(shopId: string, body: UpsertShopCustomerServiceRequest/);
  assert.match(generatedSource, /class ShopsReturnAddressesApi[\s\S]*async list\(shopId: string, params\?: ShopsReturnAddressesListParams/);
  assert.match(generatedSource, /class ShopsReturnAddressesApi[\s\S]*async upsert\(shopId: string, body: UpsertShopReturnAddressRequest/);
  assert.match(generatedSource, /class ShopsShippingTemplatesApi[\s\S]*async list\(shopId: string, params\?: ShopsShippingTemplatesListParams/);
  assert.match(generatedSource, /class ShopsShippingTemplatesApi[\s\S]*async upsert\(shopId: string, body: UpsertShopShippingTemplateRequest/);
  assert.match(generatedSource, /public readonly categoryBindings: ShopsCategoryBindingsApi/);
  assert.match(generatedSource, /public readonly brandAuthorizations: ShopsBrandAuthorizationsApi/);
  assert.match(generatedSource, /public readonly qualifications: ShopsQualificationsApi/);
  assert.match(generatedSource, /public readonly customerServices: ShopsCustomerServicesApi/);
  assert.match(generatedSource, /public readonly returnAddresses: ShopsReturnAddressesApi/);
  assert.match(generatedSource, /public readonly shippingTemplates: ShopsShippingTemplatesApi/);
});

test("sdkwork-commerce-backend-sdk exposes default shipping template contracts", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-backend-sdk-typescript",
        "generated",
        "server-openapi",
        "source-openapi.json",
      ),
      "utf8",
    ),
  );
  const shopShippingTemplate = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "types",
      "shop-shipping-template.ts",
    ),
    "utf8",
  );
  const upsertShopShippingTemplateRequest = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "types",
      "upsert-shop-shipping-template-request.ts",
    ),
    "utf8",
  );
  const shopsApi = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );
  const schemas = generatedSourceOpenapi.components?.schemas ?? {};

  for (const schemaName of ["ShopShippingTemplate", "UpsertShopShippingTemplateRequest"]) {
    assert.equal(schemas[schemaName]?.properties?.isDefault?.type, "boolean");
    assert.ok(schemas[schemaName]?.required?.includes("isDefault"));
  }
  assert.match(shopShippingTemplate, /\bisDefault: boolean;/);
  assert.match(upsertShopShippingTemplateRequest, /\bisDefault: boolean;/);
  assert.match(shopsApi, /export interface ShopsShippingTemplatesListParams[\s\S]*isDefault\?: boolean;/);
  assert.match(shopsApi, /\{ name: 'is_default', value: params\?\.isDefault/);
});

test("sdkwork-commerce-backend-sdk exposes default customer service contracts", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-backend-sdk-typescript",
        "generated",
        "server-openapi",
        "source-openapi.json",
      ),
      "utf8",
    ),
  );
  const shopCustomerService = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "types",
      "shop-customer-service.ts",
    ),
    "utf8",
  );
  const upsertShopCustomerServiceRequest = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "types",
      "upsert-shop-customer-service-request.ts",
    ),
    "utf8",
  );
  const shopsApi = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );
  const schemas = generatedSourceOpenapi.components?.schemas ?? {};

  for (const schemaName of ["ShopCustomerService", "UpsertShopCustomerServiceRequest"]) {
    assert.equal(schemas[schemaName]?.properties?.isDefault?.type, "boolean");
    assert.ok(schemas[schemaName]?.required?.includes("isDefault"));
  }
  assert.match(shopCustomerService, /\bisDefault: boolean;/);
  assert.match(upsertShopCustomerServiceRequest, /\bisDefault: boolean;/);
  assert.match(shopsApi, /export interface ShopsCustomerServicesListParams[\s\S]*isDefault\?: boolean;/);
  assert.match(shopsApi, /\{ name: 'is_default', value: params\?\.isDefault/);
});

test("sdkwork-commerce-backend-sdk does not expose raw shop credential, trademark, or phone fields", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-backend-sdk-typescript",
        "generated",
        "server-openapi",
        "source-openapi.json",
      ),
      "utf8",
    ),
  );
  const schemas = generatedSourceOpenapi.components?.schemas ?? {};

  for (const schemaName of [
    "ShopBrandAuthorization",
    "UpsertShopBrandAuthorizationRequest",
    "ShopQualification",
    "UpsertShopQualificationRequest",
    "ShopReturnAddress",
    "UpsertShopReturnAddressRequest",
  ]) {
    const schemaText = JSON.stringify(schemas[schemaName] ?? {});
    assert.doesNotMatch(schemaText, /credentialNo|trademarkNo|phoneNumber|receiverPhone|rawPhone/);
  }
});

test("sdkwork-commerce-backend-sdk retains admin shop request schemas", () => {
  const openapi = JSON.parse(
    readFileSync(
      backendOpenapiPath,
      "utf8",
    ),
  );
  const generatedTypes = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-backend-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "types",
      "index.ts",
    ),
    "utf8",
  );
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-backend-sdk-typescript",
        "generated",
        "server-openapi",
        "source-openapi.json",
      ),
      "utf8",
    ),
  );
  const authoritySchemas = openapi.components?.schemas ?? {};
  const generatedSchemas = generatedSourceOpenapi.components?.schemas ?? {};

  for (const schemaName of backendOnlyShopRequestSchemas) {
    assert.ok(authoritySchemas[schemaName], `${schemaName} missing from backend OpenAPI`);
    assert.ok(generatedSchemas[schemaName], `${schemaName} missing from generated backend SDK source OpenAPI`);
    assert.match(
      generatedTypes,
      new RegExp(`\\b${schemaName}\\b`),
      `${schemaName} missing from generated backend SDK type exports`,
    );
  }
});

test("sdkwork-commerce-backend-sdk keeps service area storage keys internal", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-backend-sdk-typescript",
        "generated",
        "server-openapi",
        "source-openapi.json",
      ),
      "utf8",
    ),
  );
  const schemas = generatedSourceOpenapi.components?.schemas ?? {};

  for (const schemaName of [
    "ShopServiceArea",
    "CreateShopServiceAreaRequest",
    "UpdateShopServiceAreaRequest",
  ]) {
    const schemaText = JSON.stringify(schemas[schemaName] ?? {});
    assert.doesNotMatch(schemaText, /areaKey|area_key/);
    assert.deepEqual(schemas[schemaName]?.properties?.deliveryRadiusMeters, {
      type: "integer",
      minimum: 0,
    });
  }
});

