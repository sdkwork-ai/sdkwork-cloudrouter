import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(testDir, "..");
const appOpenapiPath = path.join(
  sdkRoot,
  "..",
  "..",
  "apis",
  "app-api",
  "commerce",
  "commerce-app-api.openapi.json",
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

test("sdkwork-commerce-app-sdk uses sdkwork-v3 profile", () => {
  const source = readFileSync(path.join(sdkRoot, "bin/generate-sdk.mjs"), "utf8");
  assert.match(source, /--standard-profile/);
  assert.match(source, /sdkwork-v3/);
  assert.match(source, /runCommerceSdkGenerator/);
});

test("sdkwork-commerce-app-sdk declares appbase as a consumer SDK dependency", () => {
  const assembly = JSON.parse(readFileSync(path.join(sdkRoot, ".sdkwork-assembly.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(path.join(sdkRoot, "sdk-manifest.json"), "utf8"));
  for (const document of [assembly, manifest]) {
    assert.equal(document.sdkOwner, "sdkwork-commerce");
    assert.equal(document.apiAuthority, "sdkwork-commerce-app-api");
    assert.equal(document.generationInputSpec, "../../apis/app-api/commerce/commerce-app-api.openapi.json");
    assert.deepEqual(
      document.sdkDependencies?.map((dependency) => ({
        workspace: dependency.workspace,
        apiAuthority: dependency.apiAuthority,
        dependencyMode: dependency.dependencyMode,
        generatedTransportImportPolicy: dependency.generatedTransportImportPolicy,
      })),
      [
        {
          workspace: "sdkwork-iam-app-sdk",
          apiAuthority: "sdkwork-iam-app-api",
          dependencyMode: "consumer-sdk",
          generatedTransportImportPolicy: "forbidden",
        },
      ],
    );
  }
});

test("sdkwork-commerce-app-sdk exposes recharge settings through the generated app SDK", () => {
  const openapi = readFileSync(
    appOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-app-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "recharges.ts",
    ),
    "utf8",
  );

  assert.match(openapi, /"\/app\/v3\/api\/recharges\/settings"/);
  assert.match(openapi, /"operationId": "recharges\.settings\.retrieve"/);
  assert.match(generatedSource, /class RechargesSettingsApi/);
  assert.match(generatedSource, /async retrieve\(\)/);
  assert.match(generatedSource, /public readonly settings: RechargesSettingsApi/);
});

test("sdkwork-commerce-app-sdk exposes complete checkout discount application lifecycle methods", () => {
  const openapi = readFileSync(
    appOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-app-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "promotions.ts",
    ),
    "utf8",
  );

  assert.match(openapi, /"\/app\/v3\/api\/promotions\/discount_applications\/\{applicationId\}\/settlements"/);
  assert.match(openapi, /"operationId": "promotions\.discountApplications\.settle"/);
  assert.match(openapi, /"\/app\/v3\/api\/promotions\/discount_applications\/\{applicationId\}\/releases"/);
  assert.match(openapi, /"operationId": "promotions\.discountApplications\.release"/);
  assert.match(generatedSource, /async settle\(applicationId: string, body: CommerceOperationCommand\)/);
  assert.match(generatedSource, /async release\(applicationId: string, body: CommerceOperationCommand\)/);
});

test("sdkwork-commerce-app-sdk exposes current shop operating capability methods", () => {
  const openapi = readFileSync(
    appOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-app-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );

  for (const operationId of [
    "shops.current.businessHours.retrieve",
    "shops.current.businessHours.update",
    "shops.current.serviceAreas.list",
    "shops.current.serviceAreas.create",
    "shops.current.serviceAreas.update",
    "shops.current.policies.list",
    "shops.current.policies.update",
    "shops.current.depositAccount.retrieve",
    "shops.current.riskSignals.list",
  ]) {
    assert.match(openapi, new RegExp(`"operationId": "${operationId.replaceAll(".", "\\.")}"`));
  }

  assert.match(generatedSource, /class ShopsCurrentBusinessHoursApi[\s\S]*async retrieve\(\): Promise<ShopBusinessHourResponse>/);
  assert.match(generatedSource, /class ShopsCurrentBusinessHoursApi[\s\S]*async update\(body: UpdateShopBusinessHourRequest/);
  assert.match(generatedSource, /class ShopsCurrentServiceAreasApi[\s\S]*async list\(params\?: ShopsCurrentServiceAreasListParams/);
  assert.match(generatedSource, /class ShopsCurrentServiceAreasApi[\s\S]*async create\(body: CreateShopServiceAreaRequest/);
  assert.match(generatedSource, /class ShopsCurrentServiceAreasApi[\s\S]*async update\(serviceAreaId: string, body: UpdateShopServiceAreaRequest/);
  assert.match(generatedSource, /class ShopsCurrentPoliciesApi[\s\S]*async list\(params\?: ShopsCurrentPoliciesListParams/);
  assert.match(generatedSource, /class ShopsCurrentPoliciesApi[\s\S]*async update\(policyId: string, body: UpdateShopPolicyRequest/);
  assert.match(generatedSource, /class ShopsCurrentDepositAccountApi[\s\S]*async retrieve\(\): Promise<ShopDepositAccountResponse>/);
  assert.match(generatedSource, /class ShopsCurrentRiskSignalsApi[\s\S]*async list\(params\?: ShopsCurrentRiskSignalsListParams/);
  assert.match(generatedSource, /public readonly businessHours: ShopsCurrentBusinessHoursApi/);
  assert.match(generatedSource, /public readonly serviceAreas: ShopsCurrentServiceAreasApi/);
  assert.match(generatedSource, /public readonly policies: ShopsCurrentPoliciesApi/);
  assert.match(generatedSource, /public readonly depositAccount: ShopsCurrentDepositAccountApi/);
  assert.match(generatedSource, /public readonly riskSignals: ShopsCurrentRiskSignalsApi/);
});

test("sdkwork-commerce-app-sdk exposes WeChat-aligned current shop configuration methods", () => {
  const openapi = readFileSync(
    appOpenapiPath,
    "utf8",
  );
  const generatedSource = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-app-sdk-typescript",
      "generated",
      "server-openapi",
      "src",
      "api",
      "shops.ts",
    ),
    "utf8",
  );

  for (const operationId of [
    "shops.current.categoryBindings.list",
    "shops.current.categoryBindings.upsert",
    "shops.current.brandAuthorizations.list",
    "shops.current.brandAuthorizations.upsert",
    "shops.current.qualifications.list",
    "shops.current.qualifications.upsert",
    "shops.current.customerServices.list",
    "shops.current.customerServices.upsert",
    "shops.current.returnAddresses.list",
    "shops.current.returnAddresses.upsert",
    "shops.current.shippingTemplates.list",
    "shops.current.shippingTemplates.upsert",
  ]) {
    assert.match(openapi, new RegExp(`"operationId": "${operationId.replaceAll(".", "\\.")}"`));
  }

  assert.match(generatedSource, /class ShopsCurrentCategoryBindingsApi[\s\S]*async list\(params\?: ShopsCurrentCategoryBindingsListParams/);
  assert.match(generatedSource, /class ShopsCurrentCategoryBindingsApi[\s\S]*async upsert\(body: UpsertShopCategoryBindingRequest/);
  assert.match(generatedSource, /class ShopsCurrentBrandAuthorizationsApi[\s\S]*async list\(params\?: ShopsCurrentBrandAuthorizationsListParams/);
  assert.match(generatedSource, /class ShopsCurrentBrandAuthorizationsApi[\s\S]*async upsert\(body: UpsertShopBrandAuthorizationRequest/);
  assert.match(generatedSource, /class ShopsCurrentQualificationsApi[\s\S]*async list\(params\?: ShopsCurrentQualificationsListParams/);
  assert.match(generatedSource, /class ShopsCurrentQualificationsApi[\s\S]*async upsert\(body: UpsertShopQualificationRequest/);
  assert.match(generatedSource, /class ShopsCurrentCustomerServicesApi[\s\S]*async list\(params\?: ShopsCurrentCustomerServicesListParams/);
  assert.match(generatedSource, /class ShopsCurrentCustomerServicesApi[\s\S]*async upsert\(body: UpsertShopCustomerServiceRequest/);
  assert.match(generatedSource, /class ShopsCurrentReturnAddressesApi[\s\S]*async list\(params\?: ShopsCurrentReturnAddressesListParams/);
  assert.match(generatedSource, /class ShopsCurrentReturnAddressesApi[\s\S]*async upsert\(body: UpsertShopReturnAddressRequest/);
  assert.match(generatedSource, /class ShopsCurrentShippingTemplatesApi[\s\S]*async list\(params\?: ShopsCurrentShippingTemplatesListParams/);
  assert.match(generatedSource, /class ShopsCurrentShippingTemplatesApi[\s\S]*async upsert\(body: UpsertShopShippingTemplateRequest/);
  assert.match(generatedSource, /public readonly categoryBindings: ShopsCurrentCategoryBindingsApi/);
  assert.match(generatedSource, /public readonly brandAuthorizations: ShopsCurrentBrandAuthorizationsApi/);
  assert.match(generatedSource, /public readonly qualifications: ShopsCurrentQualificationsApi/);
  assert.match(generatedSource, /public readonly customerServices: ShopsCurrentCustomerServicesApi/);
  assert.match(generatedSource, /public readonly returnAddresses: ShopsCurrentReturnAddressesApi/);
  assert.match(generatedSource, /public readonly shippingTemplates: ShopsCurrentShippingTemplatesApi/);
});

test("sdkwork-commerce-app-sdk exposes default shipping template contracts", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
  assert.match(shopsApi, /export interface ShopsCurrentShippingTemplatesListParams[\s\S]*isDefault\?: boolean;/);
  assert.match(shopsApi, /\{ name: 'is_default', value: params\?\.isDefault/);
});

test("sdkwork-commerce-app-sdk exposes default customer service contracts", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
      "sdkwork-commerce-app-sdk-typescript",
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
  assert.match(shopsApi, /export interface ShopsCurrentCustomerServicesListParams[\s\S]*isDefault\?: boolean;/);
  assert.match(shopsApi, /\{ name: 'is_default', value: params\?\.isDefault/);
});

test("sdkwork-commerce-app-sdk does not expose raw shop credential, trademark, or phone fields", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-app-sdk-typescript",
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

test("sdkwork-commerce-app-sdk keeps backend-only shop request schemas out of app surface", () => {
  const openapi = JSON.parse(
    readFileSync(
      appOpenapiPath,
      "utf8",
    ),
  );
  const generatedTypes = readFileSync(
    path.join(
      sdkRoot,
      "sdkwork-commerce-app-sdk-typescript",
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
        "sdkwork-commerce-app-sdk-typescript",
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
    assert.equal(authoritySchemas[schemaName], undefined, `${schemaName} leaked into app OpenAPI`);
    assert.equal(
      generatedSchemas[schemaName],
      undefined,
      `${schemaName} leaked into generated app SDK source OpenAPI`,
    );
    assert.doesNotMatch(
      generatedTypes,
      new RegExp(`\\b${schemaName}\\b`),
      `${schemaName} leaked into generated app SDK type exports`,
    );
  }
});

test("sdkwork-commerce-app-sdk keeps service area storage keys internal", () => {
  const generatedSourceOpenapi = JSON.parse(
    readFileSync(
      path.join(
        sdkRoot,
        "sdkwork-commerce-app-sdk-typescript",
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

