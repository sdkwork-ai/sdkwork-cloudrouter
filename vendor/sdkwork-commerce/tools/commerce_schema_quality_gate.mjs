#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const APPBASE_DEPENDENCY_PATH_PREFIXES = [
  "/app/v3/api/auth/",
  "/app/v3/api/iam/",
  "/app/v3/api/open_platform/",
  "/app/v3/api/system/iam/",
  "/backend/v3/api/auth/",
  "/backend/v3/api/iam/",
  "/backend/v3/api/open_platform/",
  "/backend/v3/api/system/iam/",
];
const REQUIRED_APP_OPERATION_IDS = [
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
  "wallet.transactions.list",
  "wallet.accounts.list",
  "wallet.overview.retrieve",
  "memberships.packages.list",
  "memberships.purchases.create",
  "promotions.offers.list",
  "promotions.userCoupons.list",
  "invoices.create",
  "invoices.list",
  "recharges.orders.create",
  "refunds.create",
  "afterSales.requests.create",
  "afterSales.returnShipments.create",
];
const REQUIRED_BACKEND_OPERATION_IDS = [
  "catalog.products.management.list",
  "catalog.products.create",
  "catalog.products.delete",
  "catalog.skus.list",
  "catalog.skus.delete",
  "catalog.categorySeeds.create",
  "catalog.categoryAttributes.list",
  "catalog.categoryAttributes.create",
  "catalog.categoryAttributes.update",
  "catalog.categoryAttributes.delete",
  "catalog.spus.publish",
  "inventory.stocks.list",
  "inventory.reservations.list",
  "orders.management.list",
  "orders.management.retrieve",
  "payments.providerAccounts.list",
  "payments.providerAccounts.create",
  "payments.reconciliationRuns.list",
  "payments.webhookEvents.replays.create",
  "wallet.accounts.management.list",
  "wallet.adjustments.management.create",
  "memberships.plans.management.list",
  "memberships.packages.management.list",
  "promotions.offers.management.list",
  "promotions.couponStocks.list",
  "invoices.management.list",
  "commerceReports.paymentReconciliation.retrieve",
  "reports.commerceOverview.retrieve",
  "refunds.management.list",
  "afterSales.management.list",
  "afterSales.reviews.create",
];
const REQUIRED_DATABASE_MARKERS = [
  "commerce_shop",
  "commerce_shop_application",
  "commerce_shop_verification",
  "commerce_shop_status_event",
  "commerce_shop_channel",
  "commerce_shop_fulfillment_profile",
  "commerce_shop_settlement_profile",
  "commerce_shop_metric_snapshot",
  "commerce_shop_readiness",
  "commerce_shop_business_hour",
  "commerce_shop_service_area",
  "commerce_shop_policy",
  "commerce_shop_deposit_account",
  "commerce_shop_risk_signal",
  "commerce_shop_category_binding",
  "commerce_shop_brand_authorization",
  "commerce_shop_qualification",
  "commerce_shop_customer_service",
  "commerce_shop_return_address",
  "commerce_shop_shipping_template",
  "commerce_product_spu",
  "commerce_product_sku",
  "commerce_inventory_stock",
  "commerce_order",
  "commerce_order_item",
  "commerce_payment_intent",
  "commerce_payment_webhook_event",
  "commerce_refund",
  "commerce_account",
  "commerce_account_ledger_entry",
  "commerce_billing_history",
  "commerce_invoice",
  "promotion_offer",
  "promotion_user_coupon",
  "membership_plan",
  "membership_package",
  "membership_subscription",
];
const REQUIRED_APP_SHOP_SCHEMAS = [
  "ShopSummary",
  "ShopDetail",
  "ShopApplication",
  "ShopVerification",
  "ShopStatusEvent",
  "ShopChannel",
  "ShopFulfillmentProfile",
  "ShopSettlementProfile",
  "ShopMetricSnapshot",
  "ShopReadiness",
  "ShopReadinessItem",
  "ShopBusinessHour",
  "ShopServiceArea",
  "ShopPolicy",
  "ShopDepositAccount",
  "ShopRiskSignal",
  "ShopCategoryBinding",
  "ShopBrandAuthorization",
  "ShopQualification",
  "ShopCustomerService",
  "ShopReturnAddress",
  "ShopShippingTemplate",
  "ShopListResponse",
  "ShopDetailResponse",
  "CurrentShopResponse",
  "ShopDashboardResponse",
  "ShopReadinessResponse",
  "ShopApplicationListResponse",
  "ShopApplicationResponse",
  "ShopVerificationListResponse",
  "ShopStatusEventListResponse",
  "ShopChannelListResponse",
  "ShopChannelResponse",
  "ShopFulfillmentProfileResponse",
  "ShopSettlementProfileResponse",
  "ShopBusinessHourResponse",
  "ShopServiceAreaListResponse",
  "ShopServiceAreaResponse",
  "ShopPolicyListResponse",
  "ShopPolicyResponse",
  "ShopDepositAccountResponse",
  "ShopRiskSignalListResponse",
  "ShopCategoryBindingListResponse",
  "ShopCategoryBindingResponse",
  "ShopBrandAuthorizationListResponse",
  "ShopBrandAuthorizationResponse",
  "ShopQualificationListResponse",
  "ShopQualificationResponse",
  "ShopCustomerServiceListResponse",
  "ShopCustomerServiceResponse",
  "ShopReturnAddressListResponse",
  "ShopReturnAddressResponse",
  "ShopShippingTemplateListResponse",
  "ShopShippingTemplateResponse",
  "SubmitShopApplicationRequest",
  "UpdateShopChannelRequest",
  "UpdateShopFulfillmentProfileRequest",
  "UpdateShopSettlementProfileRequest",
  "UpdateShopBusinessHourRequest",
  "CreateShopServiceAreaRequest",
  "UpdateShopServiceAreaRequest",
  "UpdateShopPolicyRequest",
  "UpsertShopCategoryBindingRequest",
  "UpsertShopBrandAuthorizationRequest",
  "UpsertShopQualificationRequest",
  "UpsertShopCustomerServiceRequest",
  "UpsertShopReturnAddressRequest",
  "UpsertShopShippingTemplateRequest",
];
const REQUIRED_BACKEND_SHOP_SCHEMAS = [
  "ShopSummary",
  "ShopDetail",
  "ShopVerification",
  "ShopStatusEvent",
  "ShopChannel",
  "ShopFulfillmentProfile",
  "ShopSettlementProfile",
  "ShopReadiness",
  "ShopReadinessItem",
  "ShopBusinessHour",
  "ShopServiceArea",
  "ShopPolicy",
  "ShopDepositAccount",
  "ShopRiskSignal",
  "ShopCategoryBinding",
  "ShopBrandAuthorization",
  "ShopQualification",
  "ShopCustomerService",
  "ShopReturnAddress",
  "ShopShippingTemplate",
  "ShopManagementListResponse",
  "ShopManagementDetailResponse",
  "ShopReadinessResponse",
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
  "UpdateShopChannelRequest",
  "UpdateShopFulfillmentProfileRequest",
  "UpdateShopSettlementProfileRequest",
  "ApproveShopSettlementProfileRequest",
  "RejectShopSettlementProfileRequest",
  "UpdateShopBusinessHourRequest",
  "CreateShopServiceAreaRequest",
  "UpdateShopServiceAreaRequest",
  "CreateShopPolicyRequest",
  "UpdateShopPolicyRequest",
  "UpdateShopDepositAccountRequest",
  "ReviewShopDepositAccountRequest",
  "CreateShopRiskSignalRequest",
  "ResolveShopRiskSignalRequest",
  "UpsertShopCategoryBindingRequest",
  "UpsertShopBrandAuthorizationRequest",
  "UpsertShopQualificationRequest",
  "UpsertShopCustomerServiceRequest",
  "UpsertShopReturnAddressRequest",
  "UpsertShopShippingTemplateRequest",
  "ShopVerificationListResponse",
  "ShopStatusEventListResponse",
  "ShopChannelListResponse",
  "ShopChannelResponse",
  "ShopFulfillmentProfileResponse",
  "ShopSettlementProfileResponse",
  "ShopBusinessHourResponse",
  "ShopServiceAreaListResponse",
  "ShopServiceAreaResponse",
  "ShopPolicyListResponse",
  "ShopPolicyResponse",
  "ShopDepositAccountResponse",
  "ShopRiskSignalListResponse",
  "ShopRiskSignalResponse",
  "ShopCategoryBindingListResponse",
  "ShopCategoryBindingResponse",
  "ShopBrandAuthorizationListResponse",
  "ShopBrandAuthorizationResponse",
  "ShopQualificationListResponse",
  "ShopQualificationResponse",
  "ShopCustomerServiceListResponse",
  "ShopCustomerServiceResponse",
  "ShopReturnAddressListResponse",
  "ShopReturnAddressResponse",
  "ShopShippingTemplateListResponse",
  "ShopShippingTemplateResponse",
];
const APP_SHOP_TYPED_RESPONSES = {
  "shops.list": "ShopListResponse",
  "shops.retrieve": "ShopDetailResponse",
  "shops.current.retrieve": "CurrentShopResponse",
  "shops.current.dashboard.retrieve": "ShopDashboardResponse",
  "shops.current.readiness.retrieve": "ShopReadinessResponse",
  "shops.current.applications.list": "ShopApplicationListResponse",
  "shops.current.applications.create": "ShopApplicationResponse",
  "shops.current.verifications.list": "ShopVerificationListResponse",
  "shops.current.statusEvents.list": "ShopStatusEventListResponse",
  "shops.current.channels.list": "ShopChannelListResponse",
  "shops.current.channels.update": "ShopChannelResponse",
  "shops.current.fulfillmentProfile.retrieve": "ShopFulfillmentProfileResponse",
  "shops.current.fulfillmentProfile.update": "ShopFulfillmentProfileResponse",
  "shops.current.settlementProfile.retrieve": "ShopSettlementProfileResponse",
  "shops.current.settlementProfile.update": "ShopSettlementProfileResponse",
  "shops.current.businessHours.retrieve": "ShopBusinessHourResponse",
  "shops.current.businessHours.update": "ShopBusinessHourResponse",
  "shops.current.serviceAreas.list": "ShopServiceAreaListResponse",
  "shops.current.serviceAreas.create": "ShopServiceAreaResponse",
  "shops.current.serviceAreas.update": "ShopServiceAreaResponse",
  "shops.current.policies.list": "ShopPolicyListResponse",
  "shops.current.policies.update": "ShopPolicyResponse",
  "shops.current.depositAccount.retrieve": "ShopDepositAccountResponse",
  "shops.current.riskSignals.list": "ShopRiskSignalListResponse",
  "shops.current.categoryBindings.list": "ShopCategoryBindingListResponse",
  "shops.current.categoryBindings.upsert": "ShopCategoryBindingResponse",
  "shops.current.brandAuthorizations.list": "ShopBrandAuthorizationListResponse",
  "shops.current.brandAuthorizations.upsert": "ShopBrandAuthorizationResponse",
  "shops.current.qualifications.list": "ShopQualificationListResponse",
  "shops.current.qualifications.upsert": "ShopQualificationResponse",
  "shops.current.customerServices.list": "ShopCustomerServiceListResponse",
  "shops.current.customerServices.upsert": "ShopCustomerServiceResponse",
  "shops.current.returnAddresses.list": "ShopReturnAddressListResponse",
  "shops.current.returnAddresses.upsert": "ShopReturnAddressResponse",
  "shops.current.shippingTemplates.list": "ShopShippingTemplateListResponse",
  "shops.current.shippingTemplates.upsert": "ShopShippingTemplateResponse",
};
const BACKEND_SHOP_TYPED_RESPONSES = {
  "shops.management.list": "ShopManagementListResponse",
  "shops.management.retrieve": "ShopManagementDetailResponse",
  "shops.create": "ShopManagementDetailResponse",
  "shops.update": "ShopManagementDetailResponse",
  "shops.submitReview": "ShopManagementDetailResponse",
  "shops.approve": "ShopManagementDetailResponse",
  "shops.reject": "ShopManagementDetailResponse",
  "shops.suspend": "ShopManagementDetailResponse",
  "shops.resume": "ShopManagementDetailResponse",
  "shops.close": "ShopManagementDetailResponse",
  "shops.verifications.list": "ShopVerificationListResponse",
  "shops.verifications.update": "ShopVerificationListResponse",
  "shops.statusEvents.list": "ShopStatusEventListResponse",
  "shops.channels.list": "ShopChannelListResponse",
  "shops.channels.create": "ShopChannelResponse",
  "shops.channels.update": "ShopChannelResponse",
  "shops.fulfillmentProfile.retrieve": "ShopFulfillmentProfileResponse",
  "shops.fulfillmentProfile.update": "ShopFulfillmentProfileResponse",
  "shops.settlementProfile.retrieve": "ShopSettlementProfileResponse",
  "shops.settlementProfile.update": "ShopSettlementProfileResponse",
  "shops.settlementProfile.approve": "ShopSettlementProfileResponse",
  "shops.settlementProfile.reject": "ShopSettlementProfileResponse",
  "shops.businessHours.retrieve": "ShopBusinessHourResponse",
  "shops.businessHours.update": "ShopBusinessHourResponse",
  "shops.serviceAreas.list": "ShopServiceAreaListResponse",
  "shops.serviceAreas.create": "ShopServiceAreaResponse",
  "shops.serviceAreas.update": "ShopServiceAreaResponse",
  "shops.policies.list": "ShopPolicyListResponse",
  "shops.policies.create": "ShopPolicyResponse",
  "shops.policies.update": "ShopPolicyResponse",
  "shops.depositAccount.retrieve": "ShopDepositAccountResponse",
  "shops.depositAccount.update": "ShopDepositAccountResponse",
  "shops.depositAccount.review": "ShopDepositAccountResponse",
  "shops.riskSignals.list": "ShopRiskSignalListResponse",
  "shops.riskSignals.create": "ShopRiskSignalResponse",
  "shops.riskSignals.resolve": "ShopRiskSignalResponse",
  "shops.readiness.retrieve": "ShopReadinessResponse",
  "shops.categoryBindings.list": "ShopCategoryBindingListResponse",
  "shops.categoryBindings.upsert": "ShopCategoryBindingResponse",
  "shops.brandAuthorizations.list": "ShopBrandAuthorizationListResponse",
  "shops.brandAuthorizations.upsert": "ShopBrandAuthorizationResponse",
  "shops.qualifications.list": "ShopQualificationListResponse",
  "shops.qualifications.upsert": "ShopQualificationResponse",
  "shops.customerServices.list": "ShopCustomerServiceListResponse",
  "shops.customerServices.upsert": "ShopCustomerServiceResponse",
  "shops.returnAddresses.list": "ShopReturnAddressListResponse",
  "shops.returnAddresses.upsert": "ShopReturnAddressResponse",
  "shops.shippingTemplates.list": "ShopShippingTemplateListResponse",
  "shops.shippingTemplates.upsert": "ShopShippingTemplateResponse",
};
const SHOP_TYPED_REQUESTS = {
  "shops.create": "CreateShopRequest",
  "shops.update": "UpdateShopRequest",
  "shops.submitReview": "SubmitShopReviewRequest",
  "shops.approve": "ApproveShopRequest",
  "shops.reject": "RejectShopRequest",
  "shops.suspend": "SuspendShopRequest",
  "shops.resume": "ResumeShopRequest",
  "shops.close": "CloseShopRequest",
  "shops.current.applications.create": "SubmitShopApplicationRequest",
  "shops.current.channels.update": "UpdateShopChannelRequest",
  "shops.current.fulfillmentProfile.update": "UpdateShopFulfillmentProfileRequest",
  "shops.current.settlementProfile.update": "UpdateShopSettlementProfileRequest",
  "shops.current.businessHours.update": "UpdateShopBusinessHourRequest",
  "shops.current.serviceAreas.create": "CreateShopServiceAreaRequest",
  "shops.current.serviceAreas.update": "UpdateShopServiceAreaRequest",
  "shops.current.policies.update": "UpdateShopPolicyRequest",
  "shops.verifications.update": "UpdateShopVerificationRequest",
  "shops.channels.create": "CreateShopChannelRequest",
  "shops.channels.update": "UpdateShopChannelRequest",
  "shops.fulfillmentProfile.update": "UpdateShopFulfillmentProfileRequest",
  "shops.settlementProfile.update": "UpdateShopSettlementProfileRequest",
  "shops.settlementProfile.approve": "ApproveShopSettlementProfileRequest",
  "shops.settlementProfile.reject": "RejectShopSettlementProfileRequest",
  "shops.businessHours.update": "UpdateShopBusinessHourRequest",
  "shops.serviceAreas.create": "CreateShopServiceAreaRequest",
  "shops.serviceAreas.update": "UpdateShopServiceAreaRequest",
  "shops.policies.create": "CreateShopPolicyRequest",
  "shops.policies.update": "UpdateShopPolicyRequest",
  "shops.depositAccount.update": "UpdateShopDepositAccountRequest",
  "shops.depositAccount.review": "ReviewShopDepositAccountRequest",
  "shops.riskSignals.create": "CreateShopRiskSignalRequest",
  "shops.riskSignals.resolve": "ResolveShopRiskSignalRequest",
  "shops.current.categoryBindings.upsert": "UpsertShopCategoryBindingRequest",
  "shops.current.brandAuthorizations.upsert": "UpsertShopBrandAuthorizationRequest",
  "shops.current.qualifications.upsert": "UpsertShopQualificationRequest",
  "shops.current.customerServices.upsert": "UpsertShopCustomerServiceRequest",
  "shops.current.returnAddresses.upsert": "UpsertShopReturnAddressRequest",
  "shops.current.shippingTemplates.upsert": "UpsertShopShippingTemplateRequest",
  "shops.categoryBindings.upsert": "UpsertShopCategoryBindingRequest",
  "shops.brandAuthorizations.upsert": "UpsertShopBrandAuthorizationRequest",
  "shops.qualifications.upsert": "UpsertShopQualificationRequest",
  "shops.customerServices.upsert": "UpsertShopCustomerServiceRequest",
  "shops.returnAddresses.upsert": "UpsertShopReturnAddressRequest",
  "shops.shippingTemplates.upsert": "UpsertShopShippingTemplateRequest",
};
const BACKEND_SHOP_WRITE_OPERATION_IDS = [
  "shops.create",
  "shops.update",
  "shops.submitReview",
  "shops.approve",
  "shops.reject",
  "shops.suspend",
  "shops.resume",
  "shops.close",
  "shops.verifications.update",
  "shops.channels.create",
  "shops.channels.update",
  "shops.fulfillmentProfile.update",
  "shops.settlementProfile.update",
  "shops.settlementProfile.approve",
  "shops.settlementProfile.reject",
  "shops.businessHours.update",
  "shops.serviceAreas.create",
  "shops.serviceAreas.update",
  "shops.policies.create",
  "shops.policies.update",
  "shops.depositAccount.update",
  "shops.depositAccount.review",
  "shops.riskSignals.create",
  "shops.riskSignals.resolve",
  "shops.categoryBindings.upsert",
  "shops.brandAuthorizations.upsert",
  "shops.qualifications.upsert",
  "shops.customerServices.upsert",
  "shops.returnAddresses.upsert",
  "shops.shippingTemplates.upsert",
];
const APP_SHOP_WRITE_OPERATION_IDS = [
  "shops.current.applications.create",
  "shops.current.channels.update",
  "shops.current.fulfillmentProfile.update",
  "shops.current.settlementProfile.update",
  "shops.current.businessHours.update",
  "shops.current.serviceAreas.create",
  "shops.current.serviceAreas.update",
  "shops.current.policies.update",
  "shops.current.categoryBindings.upsert",
  "shops.current.brandAuthorizations.upsert",
  "shops.current.qualifications.upsert",
  "shops.current.customerServices.upsert",
  "shops.current.returnAddresses.upsert",
  "shops.current.shippingTemplates.upsert",
];
const SERVICE_AREA_WRITE_OPERATION_IDS = [
  "shops.current.serviceAreas.create",
  "shops.current.serviceAreas.update",
  "shops.serviceAreas.create",
  "shops.serviceAreas.update",
];
const FORBIDDEN_SHOP_SERVICE_AREA_PUBLIC_FIELDS = ["areaKey", "area_key"];
const SENSITIVE_SHOP_RAW_PUBLIC_FIELDS = [
  "credentialNo",
  "trademarkNo",
  "phoneNumber",
  "receiverPhone",
  "rawPhone",
];
const APP_FORBIDDEN_BACKEND_SHOP_REQUEST_SCHEMAS = [
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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const defaultOpenOpenapiPath = path.join(
  workspaceRoot,
  "generated",
  "openapi",
  "commerce-open-api.openapi.json",
);
const defaultAppOpenapiPath = path.join(
  workspaceRoot,
  "generated",
  "openapi",
  "commerce-app-api.openapi.json",
);
const defaultBackendOpenapiPath = path.join(
  workspaceRoot,
  "generated",
  "openapi",
  "commerce-backend-api.openapi.json",
);

function fail(message) {
  process.stderr.write(`[commerce_schema_quality_gate] ${message}\n`);
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

function parseArgs(argv) {
  const parsed = {
    openOpenapiPath: defaultOpenOpenapiPath,
    appOpenapiPath: defaultAppOpenapiPath,
    backendOpenapiPath: defaultBackendOpenapiPath,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--open-openapi") {
      parsed.openOpenapiPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--app-openapi") {
      parsed.appOpenapiPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--backend-openapi") {
      parsed.backendOpenapiPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    fail(`unknown argument: ${current}`);
  }
  return parsed;
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    fail(`missing file: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid json ${filePath}: ${error.message}`);
  }
}

function operationEntries(document) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(document.paths || {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }
      entries.push({ pathKey, method: method.toLowerCase(), operation });
    }
  }
  return entries;
}

function collectOperationIds(document, label) {
  const ids = [];
  for (const { pathKey, method, operation } of operationEntries(document)) {
    if (!operation?.operationId) {
      fail(`${label} ${method.toUpperCase()} ${pathKey} missing operationId`);
    }
    ids.push(String(operation.operationId));
  }
  return ids;
}

function assertOpenapiVersion31(document, label) {
  if (!document.openapi || !String(document.openapi).startsWith("3.1")) {
    fail(`${label} must use OpenAPI 3.1.x`);
  }
}

function assertPathPrefix(document, prefix, label) {
  for (const pathKey of Object.keys(document.paths || {})) {
    if (!pathKey.startsWith(prefix)) {
      fail(`${label} path must start with ${prefix}: ${pathKey}`);
    }
  }
}

function assertNoDependencyOwnedPaths(document, label) {
  for (const pathKey of Object.keys(document.paths || {})) {
    const prefix = APPBASE_DEPENDENCY_PATH_PREFIXES.find((candidate) =>
      pathKey.startsWith(candidate),
    );
    if (prefix) {
      fail(`${label} must not include appbase dependency path ${pathKey}; prefix=${prefix}`);
    }
  }
}

function assertOwnerMetadata(document, expectedAuthority, label) {
  if (document["x-sdkwork-owner"] !== SDK_OWNER) {
    fail(`${label} must declare x-sdkwork-owner=${SDK_OWNER}`);
  }
  if (document["x-sdkwork-api-authority"] !== expectedAuthority) {
    fail(`${label} must declare x-sdkwork-api-authority=${expectedAuthority}`);
  }
  if (document.info?.["x-sdkwork-owner"] !== SDK_OWNER) {
    fail(`${label} info must declare x-sdkwork-owner=${SDK_OWNER}`);
  }
  if (document.info?.["x-sdkwork-api-authority"] !== expectedAuthority) {
    fail(`${label} info must declare x-sdkwork-api-authority=${expectedAuthority}`);
  }
  for (const { pathKey, method, operation } of operationEntries(document)) {
    if (operation?.["x-sdkwork-owner"] !== SDK_OWNER) {
      fail(`${label} ${method.toUpperCase()} ${pathKey} must be ${SDK_OWNER} owned`);
    }
    if (operation?.["x-sdkwork-api-authority"] !== expectedAuthority) {
      fail(`${label} ${method.toUpperCase()} ${pathKey} must use ${expectedAuthority}`);
    }
    if (operation?.["x-sdkwork-domain"] !== "commerce") {
      fail(`${label} ${method.toUpperCase()} ${pathKey} must declare commerce domain`);
    }
  }
}

function assertProblemDetailSchema(document, label) {
  const schema = document.components?.schemas?.ProblemDetail;
  if (!schema) {
    fail(`${label} missing components.schemas.ProblemDetail`);
  }
  const properties = schema.properties || {};
  for (const propertyName of ["type", "title", "status", "detail", "code", "traceId", "requestId"]) {
    if (!properties[propertyName]) {
      fail(`${label} ProblemDetail missing property ${propertyName}`);
    }
  }
}

function assertCommerceEnvelopeSchemas(document, label) {
  const schemas = document.components?.schemas || {};
  if (!schemas.CommerceApiResult) {
    fail(`${label} missing CommerceApiResult schema`);
  }
  if (!schemas.CommerceOperationCommand) {
    fail(`${label} missing CommerceOperationCommand schema`);
  }
  if (schemas.AppbaseApiResult || schemas.AppbaseOperationCommand) {
    fail(`${label} must not expose appbase-named commerce envelope schemas`);
  }
}

function operationById(document, operationId, label) {
  const matches = operationEntries(document).filter(
    ({ operation }) => operation?.operationId === operationId,
  );
  if (matches.length !== 1) {
    fail(`${label} expected exactly one operationId ${operationId}, found ${matches.length}`);
  }
  return matches[0].operation;
}

function responseSchemaRef(operation) {
  return operation.responses?.["200"]?.content?.["application/json"]?.schema?.$ref;
}

function requestSchemaRef(operation) {
  return operation.requestBody?.content?.["application/json"]?.schema?.$ref;
}

function assertShopOpenApiCompleteness(appDocument, backendDocument) {
  const appSchemas = appDocument.components?.schemas || {};
  const backendSchemas = backendDocument.components?.schemas || {};
  for (const schemaName of REQUIRED_APP_SHOP_SCHEMAS) {
    if (!appSchemas[schemaName]) {
      fail(`app openapi missing shop schema ${schemaName}`);
    }
  }
  for (const schemaName of REQUIRED_BACKEND_SHOP_SCHEMAS) {
    if (!backendSchemas[schemaName]) {
      fail(`backend openapi missing shop schema ${schemaName}`);
    }
  }
  assertNoForbiddenAppShopRequestSchemas(appSchemas);
  assertShopServiceAreaRadiusSchemas(appSchemas, "app openapi");
  assertShopServiceAreaRadiusSchemas(backendSchemas, "backend openapi");
  assertNoInternalShopServiceAreaFields(appSchemas, "app openapi");
  assertNoInternalShopServiceAreaFields(backendSchemas, "backend openapi");
  assertNoSensitiveRawShopFields(appSchemas, "app openapi");
  assertNoSensitiveRawShopFields(backendSchemas, "backend openapi");
  assertShopCustomerServiceDefaultSchemas(appSchemas, "app openapi");
  assertShopCustomerServiceDefaultSchemas(backendSchemas, "backend openapi");
  assertShopCustomerServiceDefaultFilters(appDocument, backendDocument);
  assertShopShippingTemplateDefaultSchemas(appSchemas, "app openapi");
  assertShopShippingTemplateDefaultSchemas(backendSchemas, "backend openapi");
  assertShopShippingTemplateDefaultFilters(appDocument, backendDocument);
  assertShopServiceAreaConflictResponses(appDocument, backendDocument);
  assertReferencedSchemasExist(appDocument, "app openapi");
  assertReferencedSchemasExist(backendDocument, "backend openapi");
  assertSchemasAreReferenced(appDocument, "app openapi");
  assertSchemasAreReferenced(backendDocument, "backend openapi");

  for (const [operationId, schemaName] of Object.entries(APP_SHOP_TYPED_RESPONSES)) {
    const operation = operationById(appDocument, operationId, "app openapi");
    const expectedRef = `#/components/schemas/${schemaName}`;
    if (responseSchemaRef(operation) !== expectedRef) {
      fail(`app openapi ${operationId} must respond with ${expectedRef}`);
    }
  }

  for (const [operationId, schemaName] of Object.entries(BACKEND_SHOP_TYPED_RESPONSES)) {
    const operation = operationById(backendDocument, operationId, "backend openapi");
    const expectedRef = `#/components/schemas/${schemaName}`;
    if (responseSchemaRef(operation) !== expectedRef) {
      fail(`backend openapi ${operationId} must respond with ${expectedRef}`);
    }
  }

  for (const [operationId, schemaName] of Object.entries(SHOP_TYPED_REQUESTS)) {
    const document = operationId.startsWith("shops.current.") ? appDocument : backendDocument;
    const label = operationId.startsWith("shops.current.") ? "app openapi" : "backend openapi";
    const operation = operationById(document, operationId, label);
    const expectedRef = `#/components/schemas/${schemaName}`;
    if (requestSchemaRef(operation) !== expectedRef) {
      fail(`${label} ${operationId} must use request body ${expectedRef}`);
    }
    if (requestSchemaRef(operation) === "#/components/schemas/CommerceOperationCommand") {
      fail(`${label} ${operationId} must not use generic CommerceOperationCommand`);
    }
  }

  for (const operationId of BACKEND_SHOP_WRITE_OPERATION_IDS) {
    const operation = operationById(backendDocument, operationId, "backend openapi");
    if (!operation["x-sdkwork-permission"]?.startsWith("commerce.shops.")) {
      fail(`backend openapi ${operationId} must declare commerce shop permission`);
    }
    if (!operation["x-sdkwork-audit-event"]?.startsWith("commerce.shop.")) {
      fail(`backend openapi ${operationId} must declare commerce shop audit event`);
    }
    if (operation["x-sdkwork-idempotent"] !== true) {
      fail(`backend openapi ${operationId} must be idempotent`);
    }
    const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
    const hasIdempotencyHeader = parameters.some(
      (parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key",
    );
    if (!hasIdempotencyHeader) {
      fail(`backend openapi ${operationId} must declare Idempotency-Key header`);
    }
  }

  for (const operationId of APP_SHOP_WRITE_OPERATION_IDS) {
    const operation = operationById(appDocument, operationId, "app openapi");
    if (!operation["x-sdkwork-permission"]?.startsWith("commerce.shops.")) {
      fail(`app openapi ${operationId} must declare commerce shop permission`);
    }
    if (!operation["x-sdkwork-audit-event"]?.startsWith("commerce.shop.")) {
      fail(`app openapi ${operationId} must declare commerce shop audit event`);
    }
    if (operation["x-sdkwork-idempotent"] !== true) {
      fail(`app openapi ${operationId} must be idempotent`);
    }
    const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
    const hasIdempotencyHeader = parameters.some(
      (parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key",
    );
    if (!hasIdempotencyHeader) {
      fail(`app openapi ${operationId} must declare Idempotency-Key header`);
    }
  }
}

function assertShopServiceAreaRadiusSchemas(schemas, label) {
  for (const schemaName of [
    "ShopServiceArea",
    "CreateShopServiceAreaRequest",
    "UpdateShopServiceAreaRequest",
  ]) {
    const deliveryRadius = schemas[schemaName]?.properties?.deliveryRadiusMeters;
    if (!deliveryRadius) {
      fail(`${label} ${schemaName} must declare deliveryRadiusMeters`);
    }
    if (deliveryRadius.type !== "integer") {
      fail(`${label} ${schemaName}.deliveryRadiusMeters must be an integer`);
    }
    if (deliveryRadius.minimum !== 0) {
      fail(`${label} ${schemaName}.deliveryRadiusMeters must reject negative values`);
    }
  }
}

function assertNoInternalShopServiceAreaFields(schemas, label) {
  for (const schemaName of [
    "ShopServiceArea",
    "CreateShopServiceAreaRequest",
    "UpdateShopServiceAreaRequest",
  ]) {
    const schemaText = JSON.stringify(schemas[schemaName] || {});
    for (const fieldName of FORBIDDEN_SHOP_SERVICE_AREA_PUBLIC_FIELDS) {
      if (schemaText.includes(fieldName)) {
        fail(`${label} ${schemaName} must not expose internal service area field ${fieldName}`);
      }
    }
  }
}

function assertNoSensitiveRawShopFields(schemas, label) {
  for (const schemaName of [
    "ShopBrandAuthorization",
    "UpsertShopBrandAuthorizationRequest",
    "ShopQualification",
    "UpsertShopQualificationRequest",
    "ShopReturnAddress",
    "UpsertShopReturnAddressRequest",
  ]) {
    const schemaText = JSON.stringify(schemas[schemaName] || {});
    for (const fieldName of SENSITIVE_SHOP_RAW_PUBLIC_FIELDS) {
      if (schemaText.includes(fieldName)) {
        fail(`${label} ${schemaName} must not expose sensitive raw field ${fieldName}`);
      }
    }
  }
}

function assertShopShippingTemplateDefaultSchemas(schemas, label) {
  for (const schemaName of [
    "ShopShippingTemplate",
    "UpsertShopShippingTemplateRequest",
  ]) {
    const schema = schemas[schemaName];
    if (!schema) {
      fail(`${label} missing ${schemaName}`);
    }
    const isDefault = schema.properties?.isDefault;
    if (!isDefault) {
      fail(`${label} ${schemaName} must declare isDefault`);
    }
    if (isDefault.type !== "boolean") {
      fail(`${label} ${schemaName}.isDefault must be boolean`);
    }
    if (!Array.isArray(schema.required) || !schema.required.includes("isDefault")) {
      fail(`${label} ${schemaName}.isDefault must be required`);
    }
  }
}

function assertShopCustomerServiceDefaultSchemas(schemas, label) {
  for (const schemaName of [
    "ShopCustomerService",
    "UpsertShopCustomerServiceRequest",
  ]) {
    const schema = schemas[schemaName];
    if (!schema) {
      fail(`${label} missing ${schemaName}`);
    }
    const isDefault = schema.properties?.isDefault;
    if (!isDefault) {
      fail(`${label} ${schemaName} must declare isDefault`);
    }
    if (isDefault.type !== "boolean") {
      fail(`${label} ${schemaName}.isDefault must be boolean`);
    }
    if (!Array.isArray(schema.required) || !schema.required.includes("isDefault")) {
      fail(`${label} ${schemaName}.isDefault must be required`);
    }
  }
}

function assertShopCustomerServiceDefaultFilters(appDocument, backendDocument) {
  for (const [document, label, operationId] of [
    [appDocument, "app openapi", "shops.current.customerServices.list"],
    [backendDocument, "backend openapi", "shops.customerServices.list"],
  ]) {
    const operation = operationById(document, operationId, label);
    const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
    const isDefaultParameter = parameters.find(
      (parameter) => parameter.in === "query" && parameter.name === "is_default",
    );
    if (!isDefaultParameter) {
      fail(`${label} ${operationId} must support is_default query filtering`);
    }
    if (isDefaultParameter.schema?.type !== "boolean") {
      fail(`${label} ${operationId} is_default query filter must be boolean`);
    }
  }
}

function assertShopShippingTemplateDefaultFilters(appDocument, backendDocument) {
  for (const [document, label, operationId] of [
    [appDocument, "app openapi", "shops.current.shippingTemplates.list"],
    [backendDocument, "backend openapi", "shops.shippingTemplates.list"],
  ]) {
    const operation = operationById(document, operationId, label);
    const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
    const isDefaultParameter = parameters.find(
      (parameter) => parameter.in === "query" && parameter.name === "is_default",
    );
    if (!isDefaultParameter) {
      fail(`${label} ${operationId} must support is_default query filtering`);
    }
    if (isDefaultParameter.schema?.type !== "boolean") {
      fail(`${label} ${operationId} is_default query filter must be boolean`);
    }
  }
}

function assertShopServiceAreaConflictResponses(appDocument, backendDocument) {
  for (const operationId of SERVICE_AREA_WRITE_OPERATION_IDS) {
    const isBackendOperation = operationId.startsWith("shops.serviceAreas.");
    const document = isBackendOperation ? backendDocument : appDocument;
    const label = isBackendOperation ? "backend openapi" : "app openapi";
    const operation = operationById(document, operationId, label);
    const conflictResponse = operation.responses?.["409"];
    const problemRef =
      conflictResponse?.content?.["application/problem+json"]?.schema?.$ref;
    if (problemRef !== "#/components/schemas/ProblemDetail") {
      fail(`${label} ${operationId} must declare 409 ProblemDetail for duplicate service areas`);
    }
  }
}

function assertReferencedSchemasExist(document, label) {
  const schemas = document.components?.schemas || {};
  const referencedSchemas = collectReferencedSchemas(document);
  for (const schemaName of referencedSchemas) {
    if (!schemas[schemaName]) {
      fail(`${label} references missing schema ${schemaName}`);
    }
  }
}

function assertNoForbiddenAppShopRequestSchemas(appSchemas) {
  for (const schemaName of APP_FORBIDDEN_BACKEND_SHOP_REQUEST_SCHEMAS) {
    if (appSchemas[schemaName]) {
      fail(`app openapi must not expose backend-only shop request schema ${schemaName}`);
    }
  }
}

function assertSchemasAreReferenced(document, label) {
  const schemas = document.components?.schemas || {};
  const referencedSchemas = collectReferencedSchemas(document);
  for (const schemaName of Object.keys(schemas)) {
    if (!referencedSchemas.has(schemaName)) {
      fail(`${label} must not expose unreferenced schema ${schemaName}`);
    }
  }
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

  visit({ paths: document.paths, components: { securitySchemes: document.components?.securitySchemes } });
  return referenced;
}

function assertDualTokenSecurity(document, label) {
  const schemes = document.components?.securitySchemes;
  if (!schemes || typeof schemes !== "object") {
    fail(`${label} missing components.securitySchemes`);
  }
  if (schemes.AuthToken?.type !== "http" || schemes.AuthToken?.scheme !== "bearer") {
    fail(`${label} AuthToken must be HTTP bearer`);
  }
  if (
    schemes.AccessToken?.type !== "apiKey" ||
    schemes.AccessToken?.in !== "header" ||
    schemes.AccessToken?.name !== "Access-Token"
  ) {
    fail(`${label} AccessToken must be canonical Access-Token header`);
  }
}

function assertUniqueOperationIds(operationIds, label) {
  const seen = new Set();
  for (const operationId of operationIds) {
    if (seen.has(operationId)) {
      fail(`${label} duplicate operationId: ${operationId}`);
    }
    seen.add(operationId);
  }
}

function assertOperationIdsInclude(operationIds, requiredOperationIds, label) {
  const actual = new Set(operationIds);
  for (const operationId of requiredOperationIds) {
    if (!actual.has(operationId)) {
      fail(`${label} missing required operationId: ${operationId}`);
    }
  }
}

function assertNoAppbaseOwnershipStrings(document, label) {
  const source = JSON.stringify(document);
  for (const forbidden of [
    "\"x-sdkwork-owner\":\"sdkwork-appbase\"",
    "\"x-sdkwork-domain\":\"iam\"",
    "\"x-sdkwork-domain\":\"auth\"",
    "#/components/schemas/Appbase",
  ]) {
    if (source.includes(forbidden)) {
      fail(`${label} contains forbidden appbase ownership marker: ${forbidden}`);
    }
  }
}

function assertCommerceDatabaseMigrated() {
  const storageSourcePath = path.join(
    workspaceRoot,
    "crates",
    "sdkwork-commerce-storage-repository-sqlx",
    "src",
    "lib.rs",
  );
  const migrationSourcePath = path.join(
    workspaceRoot,
    "crates",
    "sdkwork-commerce-storage-repository-sqlx",
    "migrations",
    "0001_commerce_foundation.sql",
  );
  const storageSource = readFileSync(storageSourcePath, "utf8");
  const migrationSource = readFileSync(migrationSourcePath, "utf8");
  for (const marker of REQUIRED_DATABASE_MARKERS) {
    if (!storageSource.includes(marker) && !migrationSource.includes(marker)) {
      fail(`commerce storage migration missing database marker: ${marker}`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const openOpenapi = readJson(args.openOpenapiPath);
const appOpenapi = readJson(args.appOpenapiPath);
const backendOpenapi = readJson(args.backendOpenapiPath);

assertOpenapiVersion31(openOpenapi, "open openapi");
assertOpenapiVersion31(appOpenapi, "app openapi");
assertOpenapiVersion31(backendOpenapi, "backend openapi");
assertPathPrefix(openOpenapi, "/open/v3/api", "open openapi");
assertPathPrefix(appOpenapi, "/app/v3/api", "app openapi");
assertPathPrefix(backendOpenapi, "/backend/v3/api", "backend openapi");
assertNoDependencyOwnedPaths(openOpenapi, "open openapi");
assertNoDependencyOwnedPaths(appOpenapi, "app openapi");
assertNoDependencyOwnedPaths(backendOpenapi, "backend openapi");
assertOwnerMetadata(openOpenapi, SDK_AUTHORITIES.open, "open openapi");
assertOwnerMetadata(appOpenapi, SDK_AUTHORITIES.app, "app openapi");
assertOwnerMetadata(backendOpenapi, SDK_AUTHORITIES.backend, "backend openapi");
assertProblemDetailSchema(appOpenapi, "app openapi");
assertProblemDetailSchema(backendOpenapi, "backend openapi");
assertCommerceEnvelopeSchemas(appOpenapi, "app openapi");
assertCommerceEnvelopeSchemas(backendOpenapi, "backend openapi");
assertDualTokenSecurity(appOpenapi, "app openapi");
assertDualTokenSecurity(backendOpenapi, "backend openapi");
assertShopOpenApiCompleteness(appOpenapi, backendOpenapi);
assertNoAppbaseOwnershipStrings(openOpenapi, "open openapi");
assertNoAppbaseOwnershipStrings(appOpenapi, "app openapi");
assertNoAppbaseOwnershipStrings(backendOpenapi, "backend openapi");

const openOperationIds = collectOperationIds(openOpenapi, "open openapi");
const appOperationIds = collectOperationIds(appOpenapi, "app openapi");
const backendOperationIds = collectOperationIds(backendOpenapi, "backend openapi");
assertUniqueOperationIds(openOperationIds, "open openapi");
assertUniqueOperationIds(appOperationIds, "app openapi");
assertUniqueOperationIds(backendOperationIds, "backend openapi");
assertOperationIdsInclude(appOperationIds, REQUIRED_APP_OPERATION_IDS, "app openapi");
assertOperationIdsInclude(
  backendOperationIds,
  REQUIRED_BACKEND_OPERATION_IDS,
  "backend openapi",
);
assertCommerceDatabaseMigrated();

process.stdout.write("[commerce_schema_quality_gate] passed\n");

