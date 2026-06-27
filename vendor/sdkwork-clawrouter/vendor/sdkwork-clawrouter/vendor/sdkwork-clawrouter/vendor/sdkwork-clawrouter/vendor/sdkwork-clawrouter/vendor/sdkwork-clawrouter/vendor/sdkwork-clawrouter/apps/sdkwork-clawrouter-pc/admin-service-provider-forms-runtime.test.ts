import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM,
  DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
  DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM,
  SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES,
  toServiceProviderDownstreamCreateRequest,
  toServiceProviderPricingRuleCreateRequest,
  toServiceProviderPricingRuleUpdateCommand,
} from "./packages/sdkwork-clawrouter-pc-admin-service-provider/src/serviceProviderForms";

test("service provider downstream form builds a normalized create request", () => {
  const request = toServiceProviderDownstreamCreateRequest({
    ...DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM,
    sellerProviderId: " 100 ",
    providerNo: " sp-child ",
    displayName: " Child Provider ",
    providerType: " reseller ",
    defaultCurrency: " usd ",
    settlementMode: " prepaid ",
    pricePlanCode: " plan-child ",
    defaultMultiplier: " 1.1500 ",
  });

  assert.deepEqual(request, {
    sellerProviderId: "100",
    providerNo: "sp-child",
    displayName: "Child Provider",
    providerType: "reseller",
    defaultCurrency: "USD",
    settlementMode: "prepaid",
    pricePlanCode: "plan-child",
    defaultMultiplier: "1.1500",
  });
});

test("service provider pricing rule create form requires a writable edge or price plan", () => {
  assert.throws(
    () => toServiceProviderPricingRuleCreateRequest({
      ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
      sellerProviderId: "1",
      buyerProviderId: "2",
      edgeId: "",
      pricePlanId: "",
      billingMeterCode: "llm_input_token",
      unitPrice: "0.0100",
      unitSize: "1000",
      minimumCharge: "0",
    }),
    /edgeId or pricePlanId is required/,
  );

  const request = toServiceProviderPricingRuleCreateRequest({
    ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
    sellerProviderId: " 1 ",
    buyerProviderId: " 2 ",
    edgeId: "500",
    pricePlanId: "",
    catalogKey: " openai:gpt-4.1 ",
    model: " gpt-4.1 ",
    billingMeterCode: " llm_output_token ",
    tokenKind: " output ",
    unitPrice: " 0.0300 ",
    unitSize: " 1000 ",
    minimumCharge: " 0 ",
    currency: " usd ",
    priority: "20",
  });

  assert.deepEqual(request, {
    sellerProviderId: "1",
    buyerProviderId: "2",
    edgeId: "500",
    catalogKey: "openai:gpt-4.1",
    model: "gpt-4.1",
    billingMeterCode: "llm_output_token",
    tokenKind: "output",
    unitPrice: "0.0300",
    unitSize: "1000",
    minimumCharge: "0",
    currency: "USD",
    priority: 20,
  });
});

test("service provider pricing rule create form maps resource categories to billing meters", () => {
  assert.deepEqual(
    SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES.map((category) => category.id),
    ["model", "image", "video", "audio", "music", "sfx", "api_resource"],
  );
  assert.ok(
    SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES.some(
      (category) => category.id === "api_resource" && category.defaultBillingMeterCode === "api_request",
    ),
  );
  assert.ok(
    SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES.some(
      (category) => category.id === "sfx" && category.defaultBillingMeterCode === "sfx_result",
    ),
  );

  const apiRule = toServiceProviderPricingRuleCreateRequest({
    ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
    sellerProviderId: "1",
    buyerProviderId: "2",
    edgeId: "500",
    resourceCategory: "api_resource",
    pricingMethod: "specified_unit_price",
    billingMeterCode: "",
    tokenKind: "",
    unitPrice: "0.0100",
    unitSize: "1",
    minimumCharge: "0",
  });
  assert.equal(apiRule.billingMeterCode, "api_request");
  assert.equal(apiRule.tokenKind, "request");

  const sfxRule = toServiceProviderPricingRuleCreateRequest({
    ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
    sellerProviderId: "1",
    buyerProviderId: "2",
    edgeId: "500",
    resourceCategory: "sfx",
    pricingMethod: "specified_unit_price",
    billingMeterCode: "",
    tokenKind: "",
    unitPrice: "0.0200",
    unitSize: "1",
    minimumCharge: "0",
  });
  assert.equal(sfxRule.billingMeterCode, "sfx_result");
  assert.equal(sfxRule.tokenKind, "result");
});

test("service provider pricing rule create form does not fake multiplier persistence", () => {
  assert.throws(
    () => toServiceProviderPricingRuleCreateRequest({
      ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
      sellerProviderId: "1",
      buyerProviderId: "2",
      edgeId: "500",
      pricingMethod: "official_multiplier",
    }),
    /defaultMultiplier/,
  );
});

test("service provider pricing rule update form returns rule id and changed fields only", () => {
  assert.throws(
    () => toServiceProviderPricingRuleUpdateCommand({
      ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM,
      ruleId: "9001",
      unitPrice: "",
      unitSize: "",
      minimumCharge: "",
      priority: "",
      status: "",
    }),
    /price rule update must include at least one field/,
  );

  const command = toServiceProviderPricingRuleUpdateCommand({
    ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM,
    ruleId: " 9001 ",
    unitPrice: " 0.0200 ",
    unitSize: " 1000 ",
    minimumCharge: " 0.1000 ",
    priority: "30",
    status: "ACTIVE",
  });

  assert.deepEqual(command, {
    ruleId: "9001",
    input: {
      unitPrice: "0.0200",
      unitSize: "1000",
      minimumCharge: "0.1000",
      priority: 30,
      status: "active",
    },
  });
});
