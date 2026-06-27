#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SDKWORK_COMMERCE_API_ROUTES, SDKWORK_COMMERCE_OPERATION_IDS } from "../packages/common/commerce/sdkwork-commerce-contracts/src/index.ts";
import { RETIRED_APP_OPERATION_ID_SET } from "../packages/common/commerce/sdkwork-commerce-contracts/src/retired-app-operation-ids.ts";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);
const SDK_OWNER = "sdkwork-commerce";
const SDK_AUTHORITIES = {
  open: "sdkwork-commerce-open-api",
  app: "sdkwork-commerce-app-api",
  backend: "sdkwork-commerce-backend-api",
};

const API_SURFACE_LABELS = {
  open: "open-api",
  app: "app-api",
  backend: "backend-api",
};

function resolveApiSurfaceLabel(surface) {
  return API_SURFACE_LABELS[surface] ?? surface;
}

function assertRetiredAppOperationsAbsentFromContracts() {
  const violations = Object.values(SDKWORK_COMMERCE_OPERATION_IDS)
    .filter((operation) => operation.apiSurface === "app")
    .map((operation) => operation.operationId)
    .filter((operationId) => RETIRED_APP_OPERATION_ID_SET.has(operationId));

  if (violations.length > 0) {
    fail(`contracts must not declare retired app operations: ${violations.join(", ")}`);
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const defaultOpenOpenapiPath = path.join(
  workspaceRoot,
  "apis",
  "open-api",
  "commerce",
  "commerce-open-api.openapi.json",
);
const defaultAppOpenapiPath = path.join(
  workspaceRoot,
  "apis",
  "app-api",
  "commerce",
  "commerce-app-api.openapi.json",
);
const defaultBackendOpenapiPath = path.join(
  workspaceRoot,
  "apis",
  "backend-api",
  "commerce",
  "commerce-backend-api.openapi.json",
);
const BODYLESS_METHODS = new Set(["GET", "DELETE", "HEAD"]);
const SHOP_SCHEMAS = createShopSchemas();

function fail(message) {
  process.stderr.write(`[commerce_openapi_export] ${message}\n`);
  process.exit(1);
}

function resolveWorkspacePath(inputPath) {
  if (!inputPath) {
    fail("path argument cannot be empty");
  }
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(workspaceRoot, inputPath);
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    fail(`missing OpenAPI file: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid JSON OpenAPI ${filePath}: ${error.message}`);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createShopSchemas() {
  const stringSchema = { type: "string" };
  const booleanSchema = { type: "boolean" };
  const integerSchema = { type: "integer" };
  const nonNegativeIntegerSchema = { type: "integer", minimum: 0 };
  const jsonObjectSchema = { type: "object", additionalProperties: true };
  const jsonArraySchema = { type: "array", items: jsonObjectSchema };
  const pageInfoSchema = objectSchema(
    {
      page: { type: "integer", minimum: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 200 },
      total: { type: "integer", minimum: 0 },
    },
    ["page", "pageSize", "total"],
  );

  const shopSummary = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopNo: stringSchema,
      shopName: stringSchema,
      shopType: stringSchema,
      businessModel: stringSchema,
      storefrontStatus: stringSchema,
      operationStatus: stringSchema,
      reviewStatus: stringSchema,
      dataScope: stringSchema,
      logoMediaResourceId: stringSchema,
      coverMediaResourceId: stringSchema,
      defaultCurrencyCode: stringSchema,
      defaultLocale: stringSchema,
      timezone: stringSchema,
      version: integerSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopNo",
      "shopName",
      "shopType",
      "businessModel",
      "storefrontStatus",
      "operationStatus",
      "reviewStatus",
      "dataScope",
      "defaultCurrencyCode",
      "version",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopDetail = objectSchema(
    {
      ...shopSummary.properties,
      verificationSnapshot: jsonObjectSchema,
      contactSnapshot: jsonObjectSchema,
      operationConfig: jsonObjectSchema,
      submittedAt: stringSchema,
      approvedAt: stringSchema,
      rejectedAt: stringSchema,
      suspendedAt: stringSchema,
      closedAt: stringSchema,
      deletedAt: stringSchema,
    },
    [...shopSummary.required, "verificationSnapshot", "contactSnapshot", "operationConfig"],
  );
  const shopApplication = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      applicationNo: stringSchema,
      applicationType: stringSchema,
      reviewStatus: stringSchema,
      legalEntitySnapshot: jsonObjectSchema,
      contactSnapshot: jsonObjectSchema,
      qualificationSnapshot: jsonObjectSchema,
      submittedBy: stringSchema,
      submittedAt: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      reviewComment: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "applicationNo",
      "applicationType",
      "reviewStatus",
      "legalEntitySnapshot",
      "contactSnapshot",
      "qualificationSnapshot",
      "submittedBy",
      "submittedAt",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopVerification = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      verificationType: stringSchema,
      verificationStatus: stringSchema,
      legalEntityName: stringSchema,
      credentialNoHash: stringSchema,
      credentialMediaResourceId: stringSchema,
      verificationSnapshot: jsonObjectSchema,
      expiresAt: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "verificationType",
      "verificationStatus",
      "verificationSnapshot",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopStatusEvent = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      eventNo: stringSchema,
      eventType: stringSchema,
      fromStatus: stringSchema,
      toStatus: stringSchema,
      reasonCode: stringSchema,
      reasonDetail: stringSchema,
      actorType: stringSchema,
      actorId: stringSchema,
      createdAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "eventNo",
      "eventType",
      "toStatus",
      "actorType",
      "createdAt",
    ],
  );
  const shopChannel = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      channelCode: stringSchema,
      storefrontStatus: stringSchema,
      domainName: stringSchema,
      pathPrefix: stringSchema,
      themeCode: stringSchema,
      channelConfig: jsonObjectSchema,
      sortOrder: integerSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "channelCode",
      "storefrontStatus",
      "channelConfig",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopFulfillmentProfile = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      fulfillmentMode: stringSchema,
      shippingOriginRegionCode: stringSchema,
      serviceLevelCode: stringSchema,
      afterSalesPolicy: jsonObjectSchema,
      serviceConfig: jsonObjectSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "fulfillmentMode",
      "afterSalesPolicy",
      "serviceConfig",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopSettlementProfile = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      settlementStatus: stringSchema,
      settlementCycle: stringSchema,
      settlementCurrencyCode: stringSchema,
      accountRef: stringSchema,
      riskHoldDays: integerSchema,
      settlementConfig: jsonObjectSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "settlementStatus",
      "settlementCycle",
      "settlementCurrencyCode",
      "riskHoldDays",
      "settlementConfig",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopMetricSnapshot = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      snapshotDate: stringSchema,
      grossSalesAmount: stringSchema,
      currencyCode: stringSchema,
      paidOrderCount: integerSchema,
      refundOrderCount: integerSchema,
      fulfillmentPendingCount: integerSchema,
      settlementPendingAmount: stringSchema,
      createdAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "snapshotDate",
      "grossSalesAmount",
      "currencyCode",
      "paidOrderCount",
      "refundOrderCount",
      "fulfillmentPendingCount",
      "settlementPendingAmount",
      "createdAt",
    ],
  );
  const shopReadinessItem = objectSchema(
    {
      code: stringSchema,
      title: stringSchema,
      status: stringSchema,
      severity: stringSchema,
      sourceType: stringSchema,
      sourceId: stringSchema,
      blocking: booleanSchema,
      message: stringSchema,
      actionHint: stringSchema,
      evaluatedAt: stringSchema,
    },
    ["code", "title", "status", "severity", "blocking", "evaluatedAt"],
  );
  const shopReadiness = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      readinessScope: stringSchema,
      readinessStatus: stringSchema,
      blockingCount: nonNegativeIntegerSchema,
      warningCount: nonNegativeIntegerSchema,
      checklist: {
        type: "array",
        items: { $ref: "#/components/schemas/ShopReadinessItem" },
      },
      evaluatedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
      version: integerSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "readinessScope",
      "readinessStatus",
      "blockingCount",
      "warningCount",
      "checklist",
      "evaluatedAt",
      "createdAt",
      "updatedAt",
      "version",
    ],
  );
  const shopBusinessHour = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      scheduleType: stringSchema,
      timezone: stringSchema,
      weeklySchedule: jsonObjectSchema,
      holidaySchedule: jsonObjectSchema,
      effectiveFrom: stringSchema,
      effectiveTo: stringSchema,
      status: stringSchema,
      version: integerSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "scheduleType",
      "timezone",
      "weeklySchedule",
      "holidaySchedule",
      "status",
      "version",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopServiceArea = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      areaType: stringSchema,
      countryCode: stringSchema,
      regionCode: stringSchema,
      cityCode: stringSchema,
      postalCodePattern: stringSchema,
      deliveryRadiusMeters: nonNegativeIntegerSchema,
      serviceStatus: stringSchema,
      serviceConfig: jsonObjectSchema,
      sortOrder: integerSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "areaType",
      "countryCode",
      "serviceStatus",
      "serviceConfig",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopPolicy = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      policyType: stringSchema,
      policyStatus: stringSchema,
      policyVersion: integerSchema,
      policy: jsonObjectSchema,
      publishedAt: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "policyType",
      "policyStatus",
      "policyVersion",
      "policy",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopDepositAccount = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      depositStatus: stringSchema,
      currencyCode: stringSchema,
      requiredAmount: stringSchema,
      paidAmount: stringSchema,
      frozenAmount: stringSchema,
      accountRef: stringSchema,
      dueAt: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "depositStatus",
      "currencyCode",
      "requiredAmount",
      "paidAmount",
      "frozenAmount",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopRiskSignal = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      signalNo: stringSchema,
      signalType: stringSchema,
      riskLevel: stringSchema,
      signalStatus: stringSchema,
      sourceType: stringSchema,
      sourceId: stringSchema,
      riskScore: integerSchema,
      payload: jsonObjectSchema,
      detectedAt: stringSchema,
      resolvedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "signalNo",
      "signalType",
      "riskLevel",
      "signalStatus",
      "riskScore",
      "payload",
      "detectedAt",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopCategoryBinding = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      shopCategoryCode: stringSchema,
      platformCategoryCode: stringSchema,
      platformCategoryName: stringSchema,
      categoryPath: stringSchema,
      categoryLevel: nonNegativeIntegerSchema,
      categoryStatus: stringSchema,
      qualificationRequired: booleanSchema,
      qualificationSnapshot: jsonObjectSchema,
      reviewStatus: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      effectiveFrom: stringSchema,
      effectiveTo: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "shopCategoryCode",
      "categoryLevel",
      "categoryStatus",
      "qualificationRequired",
      "qualificationSnapshot",
      "reviewStatus",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopBrandAuthorization = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      brandCode: stringSchema,
      brandName: stringSchema,
      authorizationType: stringSchema,
      authorizationStatus: stringSchema,
      brandOwnerName: stringSchema,
      trademarkHash: stringSchema,
      trademarkMediaResourceId: stringSchema,
      authorizationMediaResourceId: stringSchema,
      authorizationSnapshot: jsonObjectSchema,
      validFrom: stringSchema,
      validTo: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "brandCode",
      "brandName",
      "authorizationType",
      "authorizationStatus",
      "authorizationSnapshot",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopQualification = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      qualificationType: stringSchema,
      qualificationStatus: stringSchema,
      subjectType: stringSchema,
      subjectId: stringSchema,
      credentialName: stringSchema,
      credentialHash: stringSchema,
      credentialMediaResourceId: stringSchema,
      qualificationSnapshot: jsonObjectSchema,
      issuedAt: stringSchema,
      expiresAt: stringSchema,
      reviewedBy: stringSchema,
      reviewedAt: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "qualificationType",
      "qualificationStatus",
      "subjectType",
      "subjectId",
      "qualificationSnapshot",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopCustomerService = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      serviceChannel: stringSchema,
      serviceStatus: stringSchema,
      contactRef: stringSchema,
      contactLabel: stringSchema,
      serviceWindow: jsonObjectSchema,
      serviceConfig: jsonObjectSchema,
      isDefault: booleanSchema,
      sortOrder: integerSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "serviceChannel",
      "serviceStatus",
      "contactRef",
      "serviceWindow",
      "serviceConfig",
      "isDefault",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopReturnAddress = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      addressUsage: stringSchema,
      addressKey: stringSchema,
      receiverName: stringSchema,
      phoneHash: stringSchema,
      countryCode: stringSchema,
      regionCode: stringSchema,
      cityCode: stringSchema,
      districtCode: stringSchema,
      addressLine1: stringSchema,
      postalCode: stringSchema,
      isDefault: booleanSchema,
      addressStatus: stringSchema,
      addressSnapshot: jsonObjectSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "addressUsage",
      "addressKey",
      "receiverName",
      "countryCode",
      "addressLine1",
      "isDefault",
      "addressStatus",
      "addressSnapshot",
      "createdAt",
      "updatedAt",
    ],
  );
  const shopShippingTemplate = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      shopId: stringSchema,
      templateCode: stringSchema,
      templateName: stringSchema,
      templateStatus: stringSchema,
      pricingMode: stringSchema,
      deliveryMethod: stringSchema,
      baseQuantity: { type: "integer", minimum: 1 },
      baseFeeAmount: stringSchema,
      currencyCode: stringSchema,
      isDefault: booleanSchema,
      regionRule: { type: "array", items: jsonObjectSchema },
      freeShippingRule: jsonObjectSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "organizationId",
      "shopId",
      "templateCode",
      "templateName",
      "templateStatus",
      "pricingMode",
      "deliveryMethod",
      "baseQuantity",
      "baseFeeAmount",
      "currencyCode",
      "isDefault",
      "regionRule",
      "freeShippingRule",
      "createdAt",
      "updatedAt",
    ],
  );
  const afterSalesItem = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      afterSalesId: stringSchema,
      orderItemId: stringSchema,
      skuId: stringSchema,
      skuSnapshot: jsonObjectSchema,
      requestedQuantity: nonNegativeIntegerSchema,
      approvedQuantity: nonNegativeIntegerSchema,
      receivedQuantity: nonNegativeIntegerSchema,
      refundedQuantity: nonNegativeIntegerSchema,
      refundAmount: stringSchema,
      replacementSkuId: stringSchema,
      itemStatus: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "afterSalesId",
      "orderItemId",
      "skuSnapshot",
      "requestedQuantity",
      "approvedQuantity",
      "receivedQuantity",
      "refundedQuantity",
      "refundAmount",
      "itemStatus",
      "createdAt",
      "updatedAt",
    ],
  );
  const afterSalesRequest = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      afterSalesNo: stringSchema,
      orderId: stringSchema,
      ownerUserId: stringSchema,
      shopId: stringSchema,
      refundId: stringSchema,
      replacementOrderId: stringSchema,
      afterSalesType: stringSchema,
      status: stringSchema,
      refundStatus: stringSchema,
      returnStatus: stringSchema,
      exchangeStatus: stringSchema,
      reasonCode: stringSchema,
      description: stringSchema,
      evidenceSnapshot: jsonArraySchema,
      requestedAmount: stringSchema,
      approvedAmount: stringSchema,
      currencyCode: stringSchema,
      requestedByType: stringSchema,
      requestedBy: stringSchema,
      reviewerType: stringSchema,
      reviewerId: stringSchema,
      reviewedAt: stringSchema,
      closedAt: stringSchema,
      requestNo: stringSchema,
      idempotencyKey: stringSchema,
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/AfterSalesItem" },
      },
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "afterSalesNo",
      "orderId",
      "afterSalesType",
      "status",
      "refundStatus",
      "returnStatus",
      "exchangeStatus",
      "evidenceSnapshot",
      "requestedAmount",
      "approvedAmount",
      "currencyCode",
      "requestedByType",
      "requestNo",
      "idempotencyKey",
      "items",
      "createdAt",
      "updatedAt",
    ],
  );
  const afterSalesReturnShipment = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      afterSalesId: stringSchema,
      returnShipmentNo: stringSchema,
      shipmentDirection: stringSchema,
      carrierCode: stringSchema,
      carrierName: stringSchema,
      trackingNo: stringSchema,
      packageSnapshot: jsonArraySchema,
      shipFromAddressSnapshot: jsonObjectSchema,
      shipToAddressSnapshot: jsonObjectSchema,
      status: stringSchema,
      shippedAt: stringSchema,
      receivedAt: stringSchema,
      requestNo: stringSchema,
      idempotencyKey: stringSchema,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "afterSalesId",
      "returnShipmentNo",
      "shipmentDirection",
      "packageSnapshot",
      "shipFromAddressSnapshot",
      "shipToAddressSnapshot",
      "status",
      "requestNo",
      "idempotencyKey",
      "createdAt",
      "updatedAt",
    ],
  );
  const afterSalesEvent = objectSchema(
    {
      id: stringSchema,
      tenantId: stringSchema,
      organizationId: stringSchema,
      afterSalesId: stringSchema,
      eventNo: stringSchema,
      eventType: stringSchema,
      fromStatus: stringSchema,
      toStatus: stringSchema,
      actorType: stringSchema,
      actorId: stringSchema,
      reasonCode: stringSchema,
      payload: jsonObjectSchema,
      idempotencyKey: stringSchema,
      createdAt: stringSchema,
    },
    [
      "id",
      "tenantId",
      "afterSalesId",
      "eventNo",
      "eventType",
      "toStatus",
      "actorType",
      "payload",
      "idempotencyKey",
      "createdAt",
    ],
  );
  const createAfterSalesRequestItem = objectSchema(
    {
      orderItemId: stringSchema,
      skuId: stringSchema,
      requestedQuantity: { type: "integer", minimum: 1 },
      refundAmount: stringSchema,
      replacementSkuId: stringSchema,
      reasonCode: stringSchema,
      evidenceSnapshot: jsonArraySchema,
    },
    ["orderItemId", "requestedQuantity"],
  );

  return {
    ShopSummary: shopSummary,
    ShopDetail: shopDetail,
    ShopApplication: shopApplication,
    ShopVerification: shopVerification,
    ShopStatusEvent: shopStatusEvent,
    ShopChannel: shopChannel,
    ShopFulfillmentProfile: shopFulfillmentProfile,
    ShopSettlementProfile: shopSettlementProfile,
    ShopMetricSnapshot: shopMetricSnapshot,
    ShopReadiness: shopReadiness,
    ShopReadinessItem: shopReadinessItem,
    ShopBusinessHour: shopBusinessHour,
    ShopServiceArea: shopServiceArea,
    ShopPolicy: shopPolicy,
    ShopDepositAccount: shopDepositAccount,
    ShopRiskSignal: shopRiskSignal,
    ShopCategoryBinding: shopCategoryBinding,
    ShopBrandAuthorization: shopBrandAuthorization,
    ShopQualification: shopQualification,
    ShopCustomerService: shopCustomerService,
    ShopReturnAddress: shopReturnAddress,
    ShopShippingTemplate: shopShippingTemplate,
    AfterSalesRequest: afterSalesRequest,
    AfterSalesItem: afterSalesItem,
    AfterSalesReturnShipment: afterSalesReturnShipment,
    AfterSalesEvent: afterSalesEvent,
    CreateAfterSalesRequestItem: createAfterSalesRequestItem,
    ShopListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopSummary" }, pageInfoSchema),
    ),
    ShopDetailResponse: apiResultSchema({ $ref: "#/components/schemas/ShopDetail" }),
    CurrentShopResponse: apiResultSchema({ $ref: "#/components/schemas/ShopDetail" }),
    ShopDashboardResponse: apiResultSchema(
      objectSchema(
        {
          shop: { $ref: "#/components/schemas/ShopSummary" },
          metrics: { $ref: "#/components/schemas/ShopMetricSnapshot" },
          pendingApplicationCount: integerSchema,
          pendingVerificationCount: integerSchema,
          pendingSettlementAmount: stringSchema,
          currencyCode: stringSchema,
        },
        [
          "shop",
          "metrics",
          "pendingApplicationCount",
          "pendingVerificationCount",
          "pendingSettlementAmount",
          "currencyCode",
        ],
      ),
    ),
    ShopReadinessResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopReadiness",
    }),
    ShopApplicationListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopApplication" }, pageInfoSchema),
    ),
    ShopApplicationResponse: apiResultSchema({ $ref: "#/components/schemas/ShopApplication" }),
    ShopVerificationListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopVerification" }, pageInfoSchema),
    ),
    ShopStatusEventListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopStatusEvent" }, pageInfoSchema),
    ),
    ShopChannelListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopChannel" }, pageInfoSchema),
    ),
    ShopChannelResponse: apiResultSchema({ $ref: "#/components/schemas/ShopChannel" }),
    ShopFulfillmentProfileResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopFulfillmentProfile",
    }),
    ShopSettlementProfileResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopSettlementProfile",
    }),
    ShopBusinessHourResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopBusinessHour",
    }),
    ShopServiceAreaListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopServiceArea" }, pageInfoSchema),
    ),
    ShopServiceAreaResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopServiceArea",
    }),
    ShopPolicyListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopPolicy" }, pageInfoSchema),
    ),
    ShopPolicyResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopPolicy",
    }),
    ShopDepositAccountResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopDepositAccount",
    }),
    ShopRiskSignalListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopRiskSignal" }, pageInfoSchema),
    ),
    ShopRiskSignalResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopRiskSignal",
    }),
    ShopCategoryBindingListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopCategoryBinding" }, pageInfoSchema),
    ),
    ShopCategoryBindingResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopCategoryBinding",
    }),
    ShopBrandAuthorizationListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopBrandAuthorization" }, pageInfoSchema),
    ),
    ShopBrandAuthorizationResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopBrandAuthorization",
    }),
    ShopQualificationListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopQualification" }, pageInfoSchema),
    ),
    ShopQualificationResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopQualification",
    }),
    ShopCustomerServiceListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopCustomerService" }, pageInfoSchema),
    ),
    ShopCustomerServiceResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopCustomerService",
    }),
    ShopReturnAddressListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopReturnAddress" }, pageInfoSchema),
    ),
    ShopReturnAddressResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopReturnAddress",
    }),
    ShopShippingTemplateListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopShippingTemplate" }, pageInfoSchema),
    ),
    ShopShippingTemplateResponse: apiResultSchema({
      $ref: "#/components/schemas/ShopShippingTemplate",
    }),
    ShopManagementListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/ShopSummary" }, pageInfoSchema),
    ),
    ShopManagementDetailResponse: apiResultSchema({ $ref: "#/components/schemas/ShopDetail" }),
    AfterSalesRequestListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/AfterSalesRequest" }, pageInfoSchema),
    ),
    AfterSalesRequestResponse: apiResultSchema({
      $ref: "#/components/schemas/AfterSalesRequest",
    }),
    AfterSalesReturnShipmentListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/AfterSalesReturnShipment" }, pageInfoSchema),
    ),
    AfterSalesReturnShipmentResponse: apiResultSchema({
      $ref: "#/components/schemas/AfterSalesReturnShipment",
    }),
    AfterSalesEventListResponse: apiResultSchema(
      pagedListSchema({ $ref: "#/components/schemas/AfterSalesEvent" }, pageInfoSchema),
    ),
    CreateAfterSalesRequest: objectSchema(
      {
        orderId: stringSchema,
        afterSalesType: stringSchema,
        reasonCode: stringSchema,
        description: stringSchema,
        evidenceSnapshot: jsonArraySchema,
        requestedAmount: stringSchema,
        currencyCode: stringSchema,
        items: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/components/schemas/CreateAfterSalesRequestItem" },
        },
      },
      ["orderId", "afterSalesType", "reasonCode", "requestedAmount", "currencyCode", "items"],
    ),
    CreateAfterSalesReturnShipmentRequest: objectSchema(
      {
        shipmentDirection: stringSchema,
        carrierCode: stringSchema,
        carrierName: stringSchema,
        trackingNo: stringSchema,
        packageSnapshot: jsonArraySchema,
        shipFromAddressSnapshot: jsonObjectSchema,
        shipToAddressSnapshot: jsonObjectSchema,
        shippedAt: stringSchema,
      },
      ["carrierCode", "trackingNo"],
    ),
    ReviewAfterSalesRequest: objectSchema(
      {
        reviewAction: stringSchema,
        status: stringSchema,
        refundStatus: stringSchema,
        returnStatus: stringSchema,
        exchangeStatus: stringSchema,
        approvedAmount: stringSchema,
        replacementOrderId: stringSchema,
        reasonCode: stringSchema,
        reasonDetail: stringSchema,
        reviewComment: stringSchema,
      },
      ["reviewAction"],
    ),
    CreateShopRequest: objectSchema(
      {
        organizationId: stringSchema,
        shopName: stringSchema,
        shopType: stringSchema,
        businessModel: stringSchema,
        defaultCurrencyCode: stringSchema,
        defaultLocale: stringSchema,
        timezone: stringSchema,
        contactSnapshot: jsonObjectSchema,
        operationConfig: jsonObjectSchema,
      },
      ["organizationId", "shopName", "shopType", "businessModel", "defaultCurrencyCode"],
    ),
    UpdateShopRequest: objectSchema({
      shopName: stringSchema,
      businessModel: stringSchema,
      storefrontStatus: stringSchema,
      logoMediaResourceId: stringSchema,
      coverMediaResourceId: stringSchema,
      defaultCurrencyCode: stringSchema,
      defaultLocale: stringSchema,
      timezone: stringSchema,
      contactSnapshot: jsonObjectSchema,
      operationConfig: jsonObjectSchema,
      version: integerSchema,
    }),
    SubmitShopReviewRequest: reasonRequestSchema(),
    ApproveShopRequest: reasonRequestSchema(),
    RejectShopRequest: reasonRequestSchema(["reasonCode", "reasonDetail"]),
    SuspendShopRequest: reasonRequestSchema(["reasonCode", "reasonDetail"]),
    ResumeShopRequest: reasonRequestSchema(),
    CloseShopRequest: reasonRequestSchema(["reasonCode", "reasonDetail"]),
    SubmitShopApplicationRequest: objectSchema(
      {
        applicationType: stringSchema,
        legalEntitySnapshot: jsonObjectSchema,
        contactSnapshot: jsonObjectSchema,
        qualificationSnapshot: jsonObjectSchema,
      },
      ["applicationType", "legalEntitySnapshot", "contactSnapshot", "qualificationSnapshot"],
    ),
    UpdateShopVerificationRequest: objectSchema(
      {
        verificationStatus: stringSchema,
        legalEntityName: stringSchema,
        credentialNoHash: stringSchema,
        credentialMediaResourceId: stringSchema,
        verificationSnapshot: jsonObjectSchema,
        expiresAt: stringSchema,
        reviewComment: stringSchema,
      },
      ["verificationStatus"],
    ),
    CreateShopChannelRequest: shopChannelRequestSchema(["channelCode", "storefrontStatus"]),
    UpdateShopChannelRequest: shopChannelRequestSchema(),
    UpdateShopFulfillmentProfileRequest: objectSchema({
      fulfillmentMode: stringSchema,
      shippingOriginRegionCode: stringSchema,
      serviceLevelCode: stringSchema,
      afterSalesPolicy: jsonObjectSchema,
      serviceConfig: jsonObjectSchema,
    }),
    UpdateShopSettlementProfileRequest: objectSchema({
      settlementStatus: stringSchema,
      settlementCycle: stringSchema,
      settlementCurrencyCode: stringSchema,
      accountRef: stringSchema,
      riskHoldDays: integerSchema,
      settlementConfig: jsonObjectSchema,
    }),
    ApproveShopSettlementProfileRequest: reasonRequestSchema(),
    RejectShopSettlementProfileRequest: reasonRequestSchema(["reasonCode", "reasonDetail"]),
    UpdateShopBusinessHourRequest: objectSchema({
      scheduleType: stringSchema,
      timezone: stringSchema,
      weeklySchedule: jsonObjectSchema,
      holidaySchedule: jsonObjectSchema,
      effectiveFrom: stringSchema,
      effectiveTo: stringSchema,
      status: stringSchema,
      version: integerSchema,
    }),
    CreateShopServiceAreaRequest: shopServiceAreaRequestSchema(["areaType", "countryCode", "serviceStatus"]),
    UpdateShopServiceAreaRequest: shopServiceAreaRequestSchema(),
    CreateShopPolicyRequest: objectSchema(
      {
        policyType: stringSchema,
        policyStatus: stringSchema,
        policyVersion: integerSchema,
        policy: jsonObjectSchema,
        publishedAt: stringSchema,
      },
      ["policyType", "policyStatus", "policy", "policyVersion"],
    ),
    UpdateShopPolicyRequest: objectSchema({
      policyStatus: stringSchema,
      policyVersion: integerSchema,
      policy: jsonObjectSchema,
      publishedAt: stringSchema,
      reviewComment: stringSchema,
    }),
    UpdateShopDepositAccountRequest: objectSchema({
      depositStatus: stringSchema,
      currencyCode: stringSchema,
      requiredAmount: stringSchema,
      paidAmount: stringSchema,
      frozenAmount: stringSchema,
      accountRef: stringSchema,
      dueAt: stringSchema,
    }),
    ReviewShopDepositAccountRequest: reasonRequestSchema(["reviewComment"]),
    CreateShopRiskSignalRequest: objectSchema(
      {
        signalNo: stringSchema,
        signalType: stringSchema,
        riskLevel: stringSchema,
        signalStatus: stringSchema,
        sourceType: stringSchema,
        sourceId: stringSchema,
        riskScore: integerSchema,
        payload: jsonObjectSchema,
        detectedAt: stringSchema,
      },
      ["signalType", "riskLevel", "signalStatus", "riskScore", "payload"],
    ),
    ResolveShopRiskSignalRequest: reasonRequestSchema(["reasonCode", "reasonDetail"]),
    UpsertShopCategoryBindingRequest: objectSchema(
      {
        shopCategoryCode: stringSchema,
        platformCategoryCode: stringSchema,
        platformCategoryName: stringSchema,
        categoryPath: stringSchema,
        categoryLevel: nonNegativeIntegerSchema,
        categoryStatus: stringSchema,
        qualificationRequired: booleanSchema,
        qualificationSnapshot: jsonObjectSchema,
        reviewStatus: stringSchema,
        effectiveFrom: stringSchema,
        effectiveTo: stringSchema,
      },
      ["shopCategoryCode", "categoryStatus", "qualificationRequired", "qualificationSnapshot", "reviewStatus"],
    ),
    UpsertShopBrandAuthorizationRequest: objectSchema(
      {
        brandCode: stringSchema,
        brandName: stringSchema,
        authorizationType: stringSchema,
        authorizationStatus: stringSchema,
        brandOwnerName: stringSchema,
        trademarkHash: stringSchema,
        trademarkMediaResourceId: stringSchema,
        authorizationMediaResourceId: stringSchema,
        authorizationSnapshot: jsonObjectSchema,
        validFrom: stringSchema,
        validTo: stringSchema,
      },
      ["brandCode", "brandName", "authorizationType", "authorizationStatus", "authorizationSnapshot"],
    ),
    UpsertShopQualificationRequest: objectSchema(
      {
        qualificationType: stringSchema,
        qualificationStatus: stringSchema,
        subjectType: stringSchema,
        subjectId: stringSchema,
        credentialName: stringSchema,
        credentialHash: stringSchema,
        credentialMediaResourceId: stringSchema,
        qualificationSnapshot: jsonObjectSchema,
        issuedAt: stringSchema,
        expiresAt: stringSchema,
      },
      ["qualificationType", "qualificationStatus", "subjectType", "subjectId", "qualificationSnapshot"],
    ),
    UpsertShopCustomerServiceRequest: objectSchema(
      {
        serviceChannel: stringSchema,
        serviceStatus: stringSchema,
        contactRef: stringSchema,
        contactLabel: stringSchema,
        serviceWindow: jsonObjectSchema,
        serviceConfig: jsonObjectSchema,
        isDefault: booleanSchema,
        sortOrder: integerSchema,
      },
      ["serviceChannel", "serviceStatus", "contactRef", "serviceWindow", "serviceConfig", "isDefault"],
    ),
    UpsertShopReturnAddressRequest: objectSchema(
      {
        addressUsage: stringSchema,
        addressKey: stringSchema,
        receiverName: stringSchema,
        phoneHash: stringSchema,
        countryCode: stringSchema,
        regionCode: stringSchema,
        cityCode: stringSchema,
        districtCode: stringSchema,
        addressLine1: stringSchema,
        postalCode: stringSchema,
        isDefault: booleanSchema,
        addressStatus: stringSchema,
        addressSnapshot: jsonObjectSchema,
      },
      ["addressUsage", "addressKey", "receiverName", "countryCode", "addressLine1", "isDefault", "addressStatus", "addressSnapshot"],
    ),
    UpsertShopShippingTemplateRequest: objectSchema(
      {
        templateCode: stringSchema,
        templateName: stringSchema,
        templateStatus: stringSchema,
        pricingMode: stringSchema,
        deliveryMethod: stringSchema,
        baseQuantity: { type: "integer", minimum: 1 },
        baseFeeAmount: stringSchema,
        currencyCode: stringSchema,
        isDefault: booleanSchema,
        regionRule: { type: "array", items: jsonObjectSchema },
        freeShippingRule: jsonObjectSchema,
      },
      ["templateCode", "templateName", "templateStatus", "pricingMode", "deliveryMethod", "baseQuantity", "baseFeeAmount", "currencyCode", "isDefault", "regionRule", "freeShippingRule"],
    ),
  };
}

function objectSchema(properties, required = []) {
  return {
    type: "object",
    additionalProperties: false,
    ...(required.length > 0 ? { required } : {}),
    properties,
  };
}

function apiResultSchema(dataSchema) {
  return objectSchema(
    {
      code: { type: "string" },
      message: { type: "string" },
      requestId: {
        type: "string",
        format: "uuid",
        description: "Server-owned request correlation id.",
      },
      data: dataSchema,
    },
    ["code", "message", "requestId", "data"],
  );
}

function pagedListSchema(itemSchema, pageInfoSchema) {
  return objectSchema(
    {
      items: {
        type: "array",
        items: itemSchema,
      },
      pageInfo: pageInfoSchema,
    },
    ["items", "pageInfo"],
  );
}

function reasonRequestSchema(required = []) {
  return objectSchema(
    {
      reasonCode: { type: "string" },
      reasonDetail: { type: "string" },
      reviewComment: { type: "string" },
    },
    required,
  );
}

function shopChannelRequestSchema(required = []) {
  return objectSchema(
    {
      channelCode: { type: "string" },
      storefrontStatus: { type: "string" },
      domainName: { type: "string" },
      pathPrefix: { type: "string" },
      themeCode: { type: "string" },
      channelConfig: { type: "object", additionalProperties: true },
      sortOrder: { type: "integer" },
    },
    required,
  );
}

function shopServiceAreaRequestSchema(required = []) {
  return objectSchema(
    {
      areaType: { type: "string" },
      countryCode: { type: "string" },
      regionCode: { type: "string" },
      cityCode: { type: "string" },
      postalCodePattern: { type: "string" },
      deliveryRadiusMeters: { type: "integer", minimum: 0 },
      serviceStatus: { type: "string" },
      serviceConfig: { type: "object", additionalProperties: true },
      sortOrder: { type: "integer" },
    },
    required,
  );
}

function operationEntries(document) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(document.paths || {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [methodName, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(methodName.toLowerCase())) {
        continue;
      }
      entries.push({ pathKey, methodName: methodName.toLowerCase(), operation });
    }
  }
  return entries;
}

function normalizeErrorResponseContent(document) {
  for (const { operation } of operationEntries(document)) {
    for (const [statusCode, response] of Object.entries(operation.responses || {})) {
      const numericStatus = Number(statusCode);
      if (!Number.isFinite(numericStatus) || numericStatus < 400) {
        continue;
      }
      if (!response || typeof response !== "object") {
        continue;
      }
      const content =
        response.content && typeof response.content === "object" ? response.content : {};
      if (content["application/problem+json"]) {
        continue;
      }
      response.content = {
        "application/problem+json": content["application/json"] ?? {
          schema: { $ref: "#/components/schemas/ProblemDetail" },
        },
        ...content,
      };
    }
  }
}

function normalizeOperationTags(document) {
  const usedTags = new Set();
  for (const { operation } of operationEntries(document)) {
    const tags = Array.isArray(operation.tags) ? operation.tags : [];
    const normalizedTags = tags.map((tag) => normalizeTagName(tag));
    operation.tags = normalizedTags.length > 0 ? [normalizedTags[0]] : ["commerce"];
    usedTags.add(operation.tags[0]);
  }
  document.tags = Array.from(usedTags)
    .sort()
    .map((name) => ({
      name,
      description: `${toTitle(name)} API resources.`,
      "x-sdk-nested-resource-surface": true,
    }));
}

function normalizeTagName(tagName) {
  const raw = String(tagName || "").trim();
  if (!raw) {
    return "commerce";
  }
  return raw
    .replace(/[^A-Za-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase());
}

function normalizeOwnerOnlyDocument(inputDocument, options) {
  const document = cloneJson(inputDocument);
  if (!document.openapi || !String(document.openapi).startsWith("3.1")) {
    document.openapi = "3.1.2";
  }
  document.info = {
    ...(document.info || {}),
    title: options.title,
    version: options.version,
    description: options.description,
    "x-sdkwork-owner": SDK_OWNER,
    "x-sdkwork-api-authority": options.authority,
    "x-sdkwork-sdk-family": options.sdkFamily,
    "x-sdkwork-audience": options.audience,
  };
  document.servers = [
    {
      url: options.serverUrl,
      description: "Local sdkwork-commerce runtime",
    },
  ];
  document.paths = {};
  document.components = document.components || {};
  document.components.securitySchemes = document.components.securitySchemes || {};
  document.components.schemas = document.components.schemas || {};
  Object.assign(document.components.schemas, SHOP_SCHEMAS);
  syncOperationContractsFromContracts(document, options);
  normalizeOperationTags(document);
  normalizeErrorResponseContent(document);
  document["x-sdkwork-owner"] = SDK_OWNER;
  document["x-sdkwork-api-authority"] = options.authority;
  document["x-sdkwork-domain"] = "commerce";
  document["x-sdkwork-standard-profile"] = options.standardProfile;

  for (const { operation } of operationEntries(document)) {
    operation["x-sdkwork-owner"] = SDK_OWNER;
    operation["x-sdkwork-api-authority"] = options.authority;
    operation["x-sdkwork-domain"] = "commerce";
  }
  pruneUnreferencedSchemas(document);

  return document;
}

function pruneUnreferencedSchemas(document) {
  const schemas = document.components?.schemas || {};
  const referencedSchemas = collectReferencedSchemas(document);
  const prunedSchemas = {};
  for (const schemaName of Object.keys(schemas).sort()) {
    if (referencedSchemas.has(schemaName)) {
      prunedSchemas[schemaName] = schemas[schemaName];
    }
  }
  document.components.schemas = prunedSchemas;
}

function collectReferencedSchemas(document) {
  const referenced = new Set();
  const seenRefs = new Set();

  function visit(value) {
    if (!value || typeof value !== "object") {
      return;
    }
    if (typeof value.$ref === "string") {
      const prefix = "#/components/schemas/";
      if (value.$ref.startsWith(prefix)) {
        const schemaName = value.$ref.slice(prefix.length);
        if (!seenRefs.has(schemaName)) {
          seenRefs.add(schemaName);
          referenced.add(schemaName);
          visit(document.components?.schemas?.[schemaName]);
        }
      }
    }
    for (const child of Object.values(value)) {
      visit(child);
    }
  }

  visit(document.paths);
  return referenced;
}

function syncOperationContractsFromContracts(document, options) {
  for (const contract of commerceOperationContractsForSurface(options.surface)) {
    document.paths[contract.path] = document.paths[contract.path] || {};
    const methodName = contract.method.toLowerCase();
    if (!document.paths[contract.path][methodName]) {
      document.paths[contract.path][methodName] = createOperationFromContract(contract, options);
      continue;
    }
    syncOperationFromContract(document.paths[contract.path][methodName], contract, options);
  }
}

function commerceOperationContractsForSurface(surface) {
  const entries = [];
  collectCommerceOperationContracts(SDKWORK_COMMERCE_API_ROUTES, surface, entries);
  return entries;
}

function collectCommerceOperationContracts(node, surface, entries) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (typeof node.method === "string" && typeof node.path === "string" && typeof node.operationId === "string") {
    if (node.apiSurface === surface) {
      if (surface === "app" && RETIRED_APP_OPERATION_ID_SET.has(node.operationId)) {
        return;
      }
      entries.push(node);
    }
    return;
  }
  for (const value of Object.values(node)) {
    collectCommerceOperationContracts(value, surface, entries);
  }
}

function createOperationFromContract(contract, options) {
  const operation = {};
  syncOperationFromContract(operation, contract, options);
  return operation;
}

function syncOperationFromContract(operation, contract, options) {
  operation.tags = [contract.tag || "commerce"];
  operation.summary = `${toTitle(contract.operationId)}.`;
  operation.operationId = contract.operationId;
  operation.parameters = createParametersFromContract(contract);
  operation.responses = createStandardResponses(contract.responseSchema);
  operation.security =
    contract.security === "public"
      ? []
      : [
          {
            AuthToken: [],
            AccessToken: [],
          },
        ];
  operation["x-sdkwork-owner"] = SDK_OWNER;
  operation["x-sdkwork-api-authority"] = options.authority;
  operation["x-sdkwork-domain"] = "commerce";
  operation["x-sdkwork-resource"] = resourceNameFromOperationId(contract.operationId);
  operation["x-sdkwork-request-context"] = "WebRequestContext";
  operation["x-sdkwork-api-surface"] = resolveApiSurfaceLabel(options.surface);
  operation["x-sdkwork-server-request-id"] = true;
  if (contract.security === "public") {
    operation["x-sdkwork-auth-mode"] = "anonymous";
  } else {
    delete operation["x-sdkwork-auth-mode"];
  }
  if (contract.permission) {
    operation["x-sdkwork-permission"] = contract.permission;
  } else {
    delete operation["x-sdkwork-permission"];
  }
  if (contract.auditEvent) {
    operation["x-sdkwork-audit-event"] = contract.auditEvent;
  } else {
    delete operation["x-sdkwork-audit-event"];
  }
  if (contract.idempotent === true) {
    operation["x-sdkwork-idempotent"] = true;
  } else {
    delete operation["x-sdkwork-idempotent"];
  }
  syncRequestBodyFromContract(operation, contract);
}

function syncRequestBodyFromContract(operation, contract) {
  if (BODYLESS_METHODS.has(contract.method)) {
    delete operation.requestBody;
    return;
  }

  const requestSchema = contract.requestSchema || "CommerceOperationCommand";
  operation.requestBody = {
    required: contract.bodyRequired ?? (contract.requestSchema ? true : contract.method === "POST"),
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${requestSchema}` },
      },
    },
  };
}

function createParametersFromContract(contract) {
  const queryParameters = Array.isArray(contract.queryParameters)
    ? contract.queryParameters.map((name) => createQueryParameter(name))
    : [];
  const headerParameters = contract.idempotent ? [createIdempotencyKeyParameter()] : [];
  return [...createPathParameters(contract.path), ...queryParameters, ...headerParameters];
}

function createPathParameters(pathTemplate) {
  return Array.from(pathTemplate.matchAll(/\{([^}]+)\}/g)).map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
}

function createQueryParameter(name) {
  return {
    name,
    in: "query",
    required: false,
    schema: queryParameterSchema(name),
  };
}

function queryParameterSchema(name) {
  if (name === "page") {
    return {
      type: "integer",
      minimum: 1,
      default: 1,
    };
  }
  if (name === "page_size") {
    return {
      type: "integer",
      minimum: 1,
      maximum: 200,
      default: 20,
    };
  }
  if (name === "is_default") {
    return { type: "boolean" };
  }
  return { type: "string" };
}

function createIdempotencyKeyParameter() {
  return {
    name: "Idempotency-Key",
    in: "header",
    required: true,
    schema: {
      type: "string",
      minLength: 8,
      maxLength: 128,
    },
    description: "Client retry key scoped by tenant, principal, method, and path.",
  };
}

function createStandardResponses(responseSchema = "CommerceApiResult") {
  return {
    "200": {
      description: "Success",
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${responseSchema}` },
        },
      },
    },
    "400": { description: "Bad request", content: problemContent() },
    "401": { description: "Unauthorized", content: problemContent() },
    "403": { description: "Forbidden", content: problemContent() },
    "404": { description: "Not found", content: problemContent() },
    "409": { description: "Conflict", content: problemContent() },
    "500": { description: "Internal server error", content: problemContent() },
  };
}

function problemContent() {
  return {
    "application/problem+json": {
      schema: { $ref: "#/components/schemas/ProblemDetail" },
    },
  };
}

function resourceNameFromOperationId(operationId) {
  return String(operationId).split(".").slice(0, -1).join(".");
}

function toTitle(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    outputDir: null,
    openInput: defaultOpenOpenapiPath,
    appInput: defaultAppOpenapiPath,
    backendInput: defaultBackendOpenapiPath,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--check") {
      parsed.check = true;
      continue;
    }
    if (current === "--open-input") {
      parsed.openInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--app-input") {
      parsed.appInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--backend-input") {
      parsed.backendInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--output-dir") {
      parsed.outputDir = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    fail(`unknown argument: ${current}`);
  }
  return parsed;
}

const surfaceOptions = {
  open: {
    surface: "open",
    authority: SDK_AUTHORITIES.open,
    sdkFamily: "sdkwork-commerce-sdk",
    title: "SDKWork Commerce Open API",
    version: "1.0.0",
    description: "Public commerce contract for SDKWork Commerce owned Open API operations.",
    audience: "Public commerce integrations.",
    serverUrl: "http://127.0.0.1:18082",
    standardProfile: "sdkwork-commerce-open-v3",
  },
  app: {
    surface: "app",
    authority: SDK_AUTHORITIES.app,
    sdkFamily: "sdkwork-commerce-app-sdk",
    title: "SDKWork Commerce App API",
    version: "1.0.0",
    description: "App/client contract for SDKWork Commerce product, order, payment, wallet, promotion, invoice, and membership modules.",
    audience: "App, desktop, mobile, H5, and user-facing clients.",
    serverUrl: "http://127.0.0.1:18080",
    standardProfile: "sdkwork-v3",
  },
  backend: {
    surface: "backend",
    authority: SDK_AUTHORITIES.backend,
    sdkFamily: "sdkwork-commerce-backend-sdk",
    title: "SDKWork Commerce Backend API",
    version: "1.0.0",
    description: "Backend/admin contract for SDKWork Commerce catalog, order, payment, inventory, wallet, promotion, invoice, membership, and reporting modules.",
    audience: "Backend consoles, operators, control-plane integrations, and admin automation.",
    serverUrl: "http://127.0.0.1:18080",
    standardProfile: "sdkwork-v3",
  },
};

assertRetiredAppOperationsAbsentFromContracts();

const args = parseArgs(process.argv.slice(2));
const openOpenapi = normalizeOwnerOnlyDocument(readJson(args.openInput), surfaceOptions.open);
const appOpenapi = normalizeOwnerOnlyDocument(readJson(args.appInput), surfaceOptions.app);
const backendOpenapi = normalizeOwnerOnlyDocument(
  readJson(args.backendInput),
  surfaceOptions.backend,
);

if (!args.check) {
  const outputPaths = args.outputDir
    ? {
        open: path.join(args.outputDir, "commerce-open-api.openapi.json"),
        app: path.join(args.outputDir, "commerce-app-api.openapi.json"),
        backend: path.join(args.outputDir, "commerce-backend-api.openapi.json"),
      }
    : {
        open: defaultOpenOpenapiPath,
        app: defaultAppOpenapiPath,
        backend: defaultBackendOpenapiPath,
      };

  for (const outputPath of Object.values(outputPaths)) {
    mkdirSync(path.dirname(outputPath), { recursive: true });
  }
  writeFileSync(outputPaths.open, `${JSON.stringify(openOpenapi, null, 2)}\n`, "utf8");
  writeFileSync(outputPaths.app, `${JSON.stringify(appOpenapi, null, 2)}\n`, "utf8");
  writeFileSync(outputPaths.backend, `${JSON.stringify(backendOpenapi, null, 2)}\n`, "utf8");
}

process.stdout.write(
  `[commerce_openapi_export] ok app=${operationEntries(appOpenapi).length} backend=${operationEntries(backendOpenapi).length}\n`,
);
