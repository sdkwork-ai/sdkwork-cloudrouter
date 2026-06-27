import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  findModelByCatalogRouteId,
  mergeRuntimeModelCatalog,
  resolveRuntimeModelCatalog,
  type RuntimeModelCatalogItem,
} from "./packages/sdkwork-clawrouter-pc-models/src/runtimeModelCatalog.ts";
import {
  MODEL_CATALOG_FILTER_FIELDS,
  deriveModelCatalogCardView,
  deriveModelCatalogDetailView,
  deriveModelCatalogFilterOptions,
  deriveModelCatalogPricingView,
  modelCatalogCategoryLabelKey,
  modelCatalogCapabilityLabelKey,
  modelCatalogGroupFallbackLabel,
  modelCatalogGroupLabelKey,
  resolveDisplayedProvidersForCatalog,
  resolveProviderShowMoreStateForCatalog,
  filterProvidersForCatalog,
  filterModelsForCatalog,
  createDefaultModelCatalogFilters,
  resetModelCatalogFilters,
  MODEL_CATEGORIES,
  type ModelCatalogFilters,
} from "./packages/sdkwork-clawrouter-pc-models/src/modelCatalog.ts";
import { ModelService } from "./packages/sdkwork-clawrouter-pc-models/src/modelService.ts";
import type { Model } from "./packages/sdkwork-clawrouter-pc-models/src/data/models.ts";
import { formatModelPrice, modelPricingBadgeLabel, modelPricingUnitLabel } from "./packages/sdkwork-clawrouter-pc-models/src/pricing.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedAppRequest = {
  url: string;
  method: string;
};

async function withAppSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedAppRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedAppRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    captured.push({ url, method });
    const result = handler(url, init);
    return new Response(JSON.stringify({ code: "2000", data: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    return await fn(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

function catalogFilters(overrides: Partial<ModelCatalogFilters> = {}): ModelCatalogFilters {
  return {
    searchQuery: "",
    providerSearchQuery: "",
    selectedProviders: [],
    selectedModalities: [],
    selectedCapabilities: [],
    selectedCategories: [],
    selectedGroups: [],
    sortBy: "Popularity",
    ...overrides,
  };
}

function catalogModel(overrides: Partial<Model>): Model {
  return {
    id: "test/model",
    modelId: "model",
    vendorCode: "test",
    name: "Test Model",
    provider: "OpenAI",
    modality: "Text",
    context: "128k",
    groups: ["default"],
    categories: ["Recommended", "Proprietary"],
    pricing: { input: 1, output: 1, unit: "1M tokens", currency: "USD", status: "reference" },
    description: "Test model description.",
    capabilities: ["Function Calling"],
    latency: "100ms",
    throughput: "100 t/s",
    apiFormat: "OpenAI Compatible API",
    ...overrides,
  };
}

function modelIds(models: Model[]): string[] {
  return models.map((model) => model.id);
}

const TEST_ROUTE_MODELS: Model[] = [
  catalogModel({
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
  }),
];

test("generated app model reference price contract includes regionCode", () => {
  const appOpenApi = JSON.parse(readFileSync(new URL("../../generated/openapi/clawrouter-app-openapi.json", import.meta.url), "utf8"));
  const referencePriceSchema = appOpenApi.components?.schemas?.AppModelCatalogReferencePrice;
  const appSdkReferencePriceType = readFileSync(
    new URL("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/app-model-catalog-reference-price.ts", import.meta.url),
    "utf8",
  );

  assert.equal(referencePriceSchema?.properties?.regionCode?.type, "string");
  assert.equal(referencePriceSchema?.required?.includes("regionCode"), true);
  assert.match(appSdkReferencePriceType, /regionCode:\s*string;/);
});

test("model catalog filter state has isolated defaults and full reset semantics", () => {
  const firstDefaults = createDefaultModelCatalogFilters();
  const secondDefaults = createDefaultModelCatalogFilters();

  assert.deepEqual(firstDefaults, catalogFilters());
  assert.notEqual(firstDefaults.selectedProviders, secondDefaults.selectedProviders);
  assert.notEqual(firstDefaults.selectedModalities, secondDefaults.selectedModalities);
  assert.notEqual(firstDefaults.selectedCapabilities, secondDefaults.selectedCapabilities);
  assert.notEqual(firstDefaults.selectedCategories, secondDefaults.selectedCategories);
  assert.notEqual(firstDefaults.selectedGroups, secondDefaults.selectedGroups);

  const reset = resetModelCatalogFilters({
    searchQuery: "gpt",
    selectedProviders: ["OpenAI"],
    selectedModalities: ["Text"],
    selectedCapabilities: ["Vision"],
    selectedCategories: ["Recommended"],
    selectedGroups: ["vip"],
    providerSearchQuery: "anthropic",
    sortBy: "Context Length",
  });

  assert.deepEqual(reset, catalogFilters());
});

test("model catalog filter field registry matches defaults and reset output", () => {
  const expectedFields = [
    "searchQuery",
    "providerSearchQuery",
    "selectedProviders",
    "selectedModalities",
    "selectedCapabilities",
    "selectedCategories",
    "selectedGroups",
    "sortBy",
  ];
  const defaults = createDefaultModelCatalogFilters();
  const reset = resetModelCatalogFilters({
    searchQuery: "gpt",
    providerSearchQuery: "open",
    selectedProviders: ["OpenAI"],
    selectedModalities: ["Text"],
    selectedCapabilities: ["Vision"],
    selectedCategories: ["Recommended"],
    selectedGroups: ["enterprise"],
    sortBy: "Context Length",
  });

  assert.deepEqual(MODEL_CATALOG_FILTER_FIELDS, expectedFields);
  assert.deepEqual(Object.keys(defaults), MODEL_CATALOG_FILTER_FIELDS);
  assert.deepEqual(Object.keys(reset), MODEL_CATALOG_FILTER_FIELDS);
});

test("model catalog filter options derive unique sorted provider modality and capability values", () => {
  const models = [
    catalogModel({
      id: "openai/text",
      provider: "OpenAI",
      modality: "Text",
      capabilities: ["Vision", "Function Calling"],
    }),
    catalogModel({
      id: "anthropic/text",
      provider: "Anthropic",
      modality: "Text",
      capabilities: ["Function Calling", "JSON Mode"],
    }),
    catalogModel({
      id: "openai/image",
      provider: "OpenAI",
      modality: "Image",
      capabilities: ["Vision"],
    }),
  ];

  const options = deriveModelCatalogFilterOptions(models);

  assert.deepEqual(options, {
    providers: ["Anthropic", "OpenAI"],
    modalities: ["Image", "Text"],
    capabilities: ["Function Calling", "JSON Mode", "Vision"],
    groups: [
      { key: "default", label: "Default group" },
    ],
  });
  assert.deepEqual(modelIds(models), ["openai/text", "anthropic/text", "openai/image"]);
  assert.deepEqual(models[0].capabilities, ["Vision", "Function Calling"]);
});

test("model catalog i18n label keys are normalized outside page rendering", () => {
  assert.equal(modelCatalogCategoryLabelKey("Open Source"), "models.category.opensource");
  assert.equal(modelCatalogCategoryLabelKey("  New  "), "models.category.new");
  assert.equal(modelCatalogCategoryLabelKey("Multi   Word  Category"), "models.category.multiwordcategory");
  assert.equal(modelCatalogCapabilityLabelKey("Function Calling"), "models.capability.functioncalling");
  assert.equal(modelCatalogCapabilityLabelKey("  JSON   Mode "), "models.capability.jsonmode");
  assert.equal(modelCatalogCapabilityLabelKey("Vision"), "models.capability.vision");
  assert.equal(modelCatalogGroupLabelKey("premium-lab"), "models.group.premium-lab");
  assert.equal(modelCatalogGroupFallbackLabel("premium-lab"), "Premium Lab");
  assert.equal(modelCatalogGroupFallbackLabel("vip"), "VIP group");
});

test("model catalog card view derives stable route copy and capability label keys", () => {
  const model = catalogModel({
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    modality: "Text",
    description: "Fast public model.",
    context: "128k",
    latency: "80ms",
    throughput: "200 t/s",
    capabilities: ["Function Calling", "JSON Mode"],
  });

  const view = deriveModelCatalogCardView(model);

  assert.deepEqual(view, {
    id: "openai/gpt-4o-mini",
    detailPath: "/models/openai%2Fgpt-4o-mini",
    provider: "OpenAI",
    name: "GPT-4o mini",
    modality: "Text",
    description: "Fast public model.",
    descriptionLabelKey: "models.data.openai/gpt-4o-mini.desc",
    context: "128k",
    latency: "80ms",
    throughput: "200 t/s",
    capabilities: [
      {
        label: "Function Calling",
        labelKey: "models.capability.functioncalling",
      },
      {
        label: "JSON Mode",
        labelKey: "models.capability.jsonmode",
      },
    ],
  });
  assert.deepEqual(model.capabilities, ["Function Calling", "JSON Mode"]);
});

test("model catalog pricing view derives token flat and unavailable cached cells", () => {
  const textModel = catalogModel({
    modality: "Text",
    pricing: { input: 0.15, output: 0.6, cachedInput: 0.075, unit: "1M tokens", currency: "USD", status: "reference" },
  });
  const uncachedTextModel = catalogModel({
    modality: "Text",
    pricing: { input: 0.11, output: 0.42, unit: "1M tokens", currency: "USD", status: "reference" },
  });
  const imageModel = catalogModel({
    modality: "Image",
    pricing: { input: 0.05, output: 0, unit: "image", currency: "USD", status: "reference" },
  });

  assert.deepEqual(deriveModelCatalogPricingView(textModel), {
    badgeLabel: "reference / 1M tokens",
    layout: "token",
    cells: [
      { key: "input", labelKey: "models.input", value: "$0.15", tone: "default", unavailable: false },
      { key: "output", labelKey: "models.output", value: "$0.60", tone: "default", unavailable: false },
      { key: "cachedInput", labelKey: "models.cachedIn", value: "$0.075", tone: "cached", unavailable: false },
    ],
  });
  assert.deepEqual(deriveModelCatalogPricingView(uncachedTextModel), {
    badgeLabel: "reference / 1M tokens",
    layout: "token",
    cells: [
      { key: "input", labelKey: "models.input", value: "$0.11", tone: "default", unavailable: false },
      { key: "output", labelKey: "models.output", value: "$0.42", tone: "default", unavailable: false },
      { key: "cachedInput", labelKey: "models.cachedIn", value: "-", tone: "muted", unavailable: true },
    ],
  });
  assert.deepEqual(deriveModelCatalogPricingView(imageModel), {
    badgeLabel: "reference / image",
    layout: "flat",
    cells: [
      { key: "flatPrice", labelKey: "models.flatPrice", value: "$0.050", tone: "flat", unavailable: false },
    ],
  });
});

test("model catalog pricing view marks missing billing meters unavailable without rendering zero prices", () => {
  const inputOnlyTextModel = catalogModel({
    modality: "Text",
    pricing: {
      input: 0.2,
      output: 0,
      unit: "1M tokens",
      currency: "USD",
      status: "reference",
      unavailableFields: ["output", "cachedInput"],
    },
  });

  assert.deepEqual(deriveModelCatalogPricingView(inputOnlyTextModel), {
    badgeLabel: "reference / 1M tokens",
    layout: "token",
    cells: [
      { key: "input", labelKey: "models.input", value: "$0.20", tone: "default", unavailable: false },
      { key: "output", labelKey: "models.output", value: "-", tone: "muted", unavailable: true },
      { key: "cachedInput", labelKey: "models.cachedIn", value: "-", tone: "muted", unavailable: true },
    ],
  });

  assert.deepEqual(deriveModelCatalogDetailView(inputOnlyTextModel).pricingRows, [
    { key: "input", labelKey: "models.input", fallbackLabel: "Input", value: "$0.20", unitLabel: "per 1M tokens" },
    {
      key: "output",
      labelKey: "models.output",
      fallbackLabel: "Output",
      value: "-",
      unitLabel: "Price is unavailable for the selected billing meter.",
    },
    {
      key: "cachedInput",
      labelKey: "models.cachedIn",
      fallbackLabel: "Cached Input",
      value: "-",
      unitLabel: "Price is unavailable for the selected billing meter.",
    },
  ]);
});

test("model catalog detail view derives copy route and sidebar rows", () => {
  const model = catalogModel({
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    modality: "Text",
    context: "128k",
    description: "Fast public model.",
    capabilityIntro: "Small model introduction.",
    pricing: { input: 0.15, output: 0.6, cachedInput: 0.075, unit: "1M tokens", currency: "USD", status: "reference" },
    latency: "80ms",
    throughput: "200 t/s",
    ttft: "70ms",
    maxOutput: "16,384",
    trainingData: "Up to Oct 2023",
    useCases: ["Customer support", "Data extraction"],
    limitations: ["Less capable at complex reasoning"],
    supportedLanguages: ["English", "Chinese"],
    parameters: {
      Temperature: "0.0 - 2.0",
      "Max Tokens": "16384",
    },
  });

  const detail = deriveModelCatalogDetailView(model);

  assert.deepEqual(detail.hero, {
    id: "openai/gpt-4o-mini",
    provider: "OpenAI",
    providerDocsUrl: "https://platform.openai.com/docs",
    name: "GPT-4o mini",
    modality: "Text",
    description: "Fast public model.",
    descriptionLabelKey: "models.data.openai/gpt-4o-mini.desc",
    intro: "Small model introduction.",
    introLabelKey: "models.data.openai/gpt-4o-mini.intro",
    modalityTone: "text",
  });
  assert.match(detail.apiExample, /searchQuery: "openai\/gpt-4o-mini"/);
  assert.match(detail.apiExample, /client\.ai\.models\.list\(params\)/);
  assert.match(detail.apiExample, /SdkworkAppClient/);
  assert.match(detail.apiExample, /@sdkwork\/clawrouter-app-sdk/);
  assert.doesNotMatch(detail.apiExample, /ClawRouterClient/);
  assert.doesNotMatch(detail.apiExample, /@sdkwork\/clawrouter-sdk/);
  assert.deepEqual(detail.useCases, [
    { label: "Customer support", labelKey: "models.data.openai/gpt-4o-mini.useCases.0" },
    { label: "Data extraction", labelKey: "models.data.openai/gpt-4o-mini.useCases.1" },
  ]);
  assert.deepEqual(detail.limitations, [
    { label: "Less capable at complex reasoning", labelKey: "models.data.openai/gpt-4o-mini.limitations.0" },
  ]);
  assert.deepEqual(detail.supportedLanguages, ["English", "Chinese"]);
  assert.deepEqual(detail.parameters, [
    { key: "Temperature", value: "0.0 - 2.0" },
    { key: "Max Tokens", value: "16384" },
  ]);
  assert.deepEqual(detail.pricingRows, [
    { key: "input", labelKey: "models.input", fallbackLabel: "Input", value: "$0.15", unitLabel: "per 1M tokens" },
    { key: "output", labelKey: "models.output", fallbackLabel: "Output", value: "$0.60", unitLabel: "per 1M tokens" },
    {
      key: "cachedInput",
      labelKey: "models.cachedIn",
      fallbackLabel: "Cached Input",
      value: "$0.075",
      unitLabel: "per 1M tokens",
    },
  ]);
  assert.deepEqual(detail.specificationRows, [
    { key: "context", labelKey: "models.details.contextTokens", fallbackLabel: "Context Window", value: "128k" },
    { key: "maxOutput", labelKey: "models.details.maxOutput", fallbackLabel: "Max Output", value: "16,384" },
    { key: "trainingData", labelKey: "models.details.trainingData", fallbackLabel: "Training Data", value: "Up to Oct 2023" },
    { key: "latency", labelKey: "models.details.avgLatency", fallbackLabel: "Avg. Latency", value: "80ms" },
    { key: "throughput", labelKey: "models.details.throughput", fallbackLabel: "Throughput", value: "200 t/s" },
  ]);
  assert.deepEqual(detail.performanceSummary, {
    providerDocsLabelKey: "models.details.providerDocs",
    fallbackProviderDocsLabel: "Provider Docs",
    specificationsLabelKey: "models.details.specifications",
    fallbackSpecificationsLabel: "Specifications",
    titleLabelKey: "models.details.performanceMetrics",
    fallbackTitle: "Performance Metrics",
    sourceLabelKey: "models.details.performanceSource",
    fallbackSource: "Catalog reference values",
    rows: [
      { key: "latency", labelKey: "models.details.avgLatency", fallbackLabel: "Avg. Latency", value: "80ms" },
      { key: "throughput", labelKey: "models.details.throughput", fallbackLabel: "Throughput", value: "200 t/s" },
      { key: "ttft", labelKey: "models.details.timeToFirstToken", fallbackLabel: "Time to First Token", value: "70ms" },
    ],
  });
});

test("model catalog detail API example serializes model ids as safe TypeScript string literals", () => {
  const unusualModelId = "vendor/weird'\\model\nnext";
  const detail = deriveModelCatalogDetailView(catalogModel({ id: unusualModelId }));

  assert.equal(detail.apiExample.includes(`    searchQuery: ${JSON.stringify(unusualModelId)},`), true);
  assert.doesNotMatch(detail.apiExample, /model: 'vendor\/weird'/);
});

test("model catalog detail view fills optional empty sidebar sections and performance safely", () => {
  const model = catalogModel({
    id: "image/provider-model",
    provider: "Provider Name",
    modality: "Image",
    capabilityIntro: undefined,
    pricing: { input: 0.05, output: 0, unit: "image", currency: "USD", status: "unavailable", reason: "Price unavailable" },
    maxOutput: undefined,
    trainingData: undefined,
    useCases: undefined,
    limitations: undefined,
    supportedLanguages: undefined,
    parameters: undefined,
    latency: "",
    throughput: "",
    ttft: undefined,
  });

  const detail = deriveModelCatalogDetailView(model);

  assert.equal(detail.hero.providerDocsUrl, "https://platform.providername.com/docs");
  assert.equal(detail.hero.intro, model.description);
  assert.equal(detail.hero.modalityTone, "image");
  assert.deepEqual(detail.useCases, []);
  assert.deepEqual(detail.limitations, []);
  assert.deepEqual(detail.supportedLanguages, []);
  assert.deepEqual(detail.parameters, []);
  assert.deepEqual(detail.pricingRows, [
    { key: "input", labelKey: "models.input", fallbackLabel: "Input", value: "-", unitLabel: "Price unavailable" },
    { key: "output", labelKey: "models.output", fallbackLabel: "Output", value: "-", unitLabel: "Price unavailable" },
  ]);
  assert.deepEqual(detail.specificationRows, [
    { key: "context", labelKey: "models.details.contextTokens", fallbackLabel: "Context Window", value: "128k" },
    { key: "maxOutput", labelKey: "models.details.maxOutput", fallbackLabel: "Max Output", value: "-" },
    { key: "trainingData", labelKey: "models.details.trainingData", fallbackLabel: "Training Data", value: "Unknown" },
    { key: "latency", labelKey: "models.details.avgLatency", fallbackLabel: "Avg. Latency", value: "Unavailable" },
    { key: "throughput", labelKey: "models.details.throughput", fallbackLabel: "Throughput", value: "Unavailable" },
  ]);
  assert.deepEqual(detail.performanceSummary.rows, [
    { key: "latency", labelKey: "models.details.avgLatency", fallbackLabel: "Avg. Latency", value: "Unavailable" },
    { key: "throughput", labelKey: "models.details.throughput", fallbackLabel: "Throughput", value: "Unavailable" },
    { key: "ttft", labelKey: "models.details.timeToFirstToken", fallbackLabel: "Time to First Token", value: "Unavailable" },
  ]);
});

test("model catalog provider search is pure case-insensitive and whitespace tolerant", () => {
  const providers = ["OpenAI", "Anthropic", "Google", "Mistral"];

  const blankResult = filterProvidersForCatalog(providers, "   ");
  const searchResult = filterProvidersForCatalog(providers, "  oo  ");
  const mixedCaseResult = filterProvidersForCatalog(providers, "ANTH");

  assert.deepEqual(blankResult, providers);
  assert.notEqual(blankResult, providers);
  assert.deepEqual(searchResult, ["Google"]);
  assert.deepEqual(mixedCaseResult, ["Anthropic"]);
  assert.deepEqual(providers, ["OpenAI", "Anthropic", "Google", "Mistral"]);
});

test("model catalog displayed providers respect default limit search and show-all state", () => {
  const providers = ["OpenAI", "Anthropic", "Google", "Mistral", "Meta", "Cohere"];

  const defaultResult = resolveDisplayedProvidersForCatalog(providers, {
    providerSearchQuery: "",
    showAllProviders: false,
  });
  const searchedResult = resolveDisplayedProvidersForCatalog(providers, {
    providerSearchQuery: "  meta  ",
    showAllProviders: false,
  });
  const showAllResult = resolveDisplayedProvidersForCatalog(providers, {
    providerSearchQuery: "",
    showAllProviders: true,
  });
  const emptyResult = resolveDisplayedProvidersForCatalog([], {
    providerSearchQuery: "",
    showAllProviders: true,
  });

  assert.deepEqual(defaultResult, ["OpenAI", "Anthropic", "Google", "Mistral", "Meta"]);
  assert.notEqual(defaultResult, providers);
  assert.deepEqual(searchedResult, providers);
  assert.notEqual(searchedResult, providers);
  assert.deepEqual(showAllResult, providers);
  assert.notEqual(showAllResult, providers);
  assert.deepEqual(emptyResult, []);
  assert.deepEqual(providers, ["OpenAI", "Anthropic", "Google", "Mistral", "Meta", "Cohere"]);
});

test("model catalog provider show-more state is derived from filtered providers", () => {
  const providers = ["OpenAI", "Anthropic", "Google", "Mistral", "Meta", "Cohere", "DeepSeek"];

  const collapsedState = resolveProviderShowMoreStateForCatalog(providers, {
    providerSearchQuery: "",
    showAllProviders: false,
  });
  const expandedState = resolveProviderShowMoreStateForCatalog(providers, {
    providerSearchQuery: "",
    showAllProviders: true,
  });
  const searchedState = resolveProviderShowMoreStateForCatalog(providers, {
    providerSearchQuery: " open ",
    showAllProviders: false,
  });
  const shortState = resolveProviderShowMoreStateForCatalog(providers.slice(0, 5), {
    providerSearchQuery: "",
    showAllProviders: false,
  });

  assert.deepEqual(collapsedState, {
    visible: true,
    expanded: false,
    hiddenCount: 2,
    labelKey: "models.showMore",
    fallbackLabel: "Show 2 More",
  });
  assert.deepEqual(expandedState, {
    visible: true,
    expanded: true,
    hiddenCount: 2,
    labelKey: "models.showLess",
    fallbackLabel: "Show Less",
  });
  assert.deepEqual(searchedState, {
    visible: false,
    expanded: false,
    hiddenCount: 0,
    labelKey: null,
    fallbackLabel: null,
  });
  assert.deepEqual(shortState, {
    visible: false,
    expanded: false,
    hiddenCount: 0,
    labelKey: null,
    fallbackLabel: null,
  });
  assert.deepEqual(providers, ["OpenAI", "Anthropic", "Google", "Mistral", "Meta", "Cohere", "DeepSeek"]);
});

test("runtime model catalog maps public reference prices without exposing private pricing fields", () => {
  const models = mergeRuntimeModelCatalog([
    {
      model: "gpt-4o-mini",
      catalogKey: "openai/gpt-4o-mini",
      displayName: "GPT-4o mini",
      vendorCode: "openai",
      vendor: "openai",
      capabilities: ["chat", "tools"],
      description: "Runtime commercial model description.",
      modalities: ["text", "image"],
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      apiFormat: "openai_responses",
      capabilityIntro: "Runtime capability intro.",
      limitations: ["Runtime limitation"],
      supportedLanguages: ["English", "Chinese"],
      useCases: ["Runtime support", "Runtime extraction"],
      trainingDataCutoff: "2025",
      contextTokens: 128000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonSchema: true,
      releaseStage: 1,
      shelfState: 1,
      routingState: 1,
      replacementModel: null,
      groups: ["default", "enterprise"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["openrouter"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
      ],
      priceAvailability: {
        status: "reference",
        reason: "Public reference price only. Customer-specific pricing requires an API key context.",
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "openai/gpt-4o-mini");
  assert.equal(models[0].modelId, "gpt-4o-mini");
  assert.equal(models[0].vendorCode, "openai");
  assert.equal(models[0].description, "Runtime commercial model description.");
  assert.equal(models[0].context, "128k");
  assert.equal(models[0].maxOutput, "16,384");
  assert.equal(models[0].apiFormat, "OpenAI Responses API");
  assert.equal(models[0].capabilityIntro, "Runtime capability intro.");
  assert.deepEqual(models[0].limitations, ["Runtime limitation"]);
  assert.deepEqual(models[0].supportedLanguages, ["English", "Chinese"]);
  assert.deepEqual(models[0].useCases, ["Runtime support", "Runtime extraction"]);
  assert.equal(models[0].trainingData, "2025");
  assert.equal(models[0].modality, "Text");
  assert.equal(models[0].pricing.status, "reference");
  assert.equal(models[0].pricing.input, 0.15);
  assert.equal(formatModelPrice(models[0].pricing, "input"), "$0.15");
  assert.equal(modelPricingBadgeLabel(models[0]), "reference / 1M tokens");
  assert.equal(modelPricingUnitLabel(models[0]), "per 1M tokens");

  const serialized = JSON.stringify(models[0]);
  assert.doesNotMatch(serialized, /lowestUpstreamCostUnitPrice/);
  assert.doesNotMatch(serialized, /upstreamCost/);
  assert.doesNotMatch(serialized, /providerCost/);
  assert.doesNotMatch(serialized, /channelCost/);
  assert.doesNotMatch(serialized, /costPrice/);
  assert.doesNotMatch(serialized, /customerUnitPrice/);
  assert.doesNotMatch(serialized, /grossMarginPerUnit/);
  assert.doesNotMatch(serialized, /pricingPlanCode/);
  assert.doesNotMatch(serialized, /groupCode/);
});

test("runtime model catalog keeps region in reference prices instead of model identity", () => {
  const models = mergeRuntimeModelCatalog([
    {
      model: "MiniMax-M2.7",
      catalogKey: "minimax/MiniMax-M2.7",
      displayName: "MiniMax M2.7",
      vendorCode: "minimax",
      vendor: "minimax",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["minimax_direct"],
      officialReferencePrices: [
        { regionCode: "cn", billingMeter: "llm_input_token", unitPrice: "2.100000", currency: "CNY" },
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.300000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
  ]);

  assert.deepEqual(
    models.map((model) => model.id),
    ["minimax/MiniMax-M2.7"],
  );
  assert.equal(formatModelPrice(models[0].pricing, "input"), "$0.30");
  assert.deepEqual(models[0].pricing.referencePrices, [
    { regionCode: "global", billingMeter: "llm_input_token", unitPrice: 0.3, currency: "USD" },
    { regionCode: "cn", billingMeter: "llm_input_token", unitPrice: 2.1, currency: "CNY" },
  ]);
});

test("model catalog category filters are explicit business rules instead of passthrough labels", () => {
  const models = [
    catalogModel({
      id: "openai/recommended",
      name: "Recommended OpenAI",
      provider: "OpenAI",
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      pricing: { input: 0.2, output: 0.4, unit: "1M tokens", currency: "USD", status: "reference" },
    }),
    catalogModel({
      id: "meta/open-source",
      name: "Open Source",
      provider: "Meta",
      groups: ["enterprise"],
      categories: ["Open Source"],
      pricing: { input: 0.3, output: 0.3, unit: "1M tokens", currency: "USD", status: "reference" },
    }),
    catalogModel({
      id: "google/new-beta",
      name: "New Beta",
      provider: "Google",
      groups: ["beta"],
      categories: ["New", "Proprietary"],
      pricing: { input: 0.5, output: 0.5, unit: "1M tokens", currency: "USD", status: "reference" },
    }),
    catalogModel({
      id: "local/free",
      name: "Free",
      provider: "Local",
      groups: ["default"],
      categories: ["Free"],
      pricing: { input: 0, output: 0, unit: "1M tokens", currency: "USD", status: "reference" },
    }),
    catalogModel({
      id: "local/unavailable-zero",
      name: "Unavailable Zero",
      provider: "Local",
      groups: ["default"],
      categories: [],
      pricing: { input: 0, output: 0, unit: "1M tokens", currency: "USD", status: "unavailable" },
    }),
  ];

  assert.deepEqual(MODEL_CATEGORIES, ["Recommended", "Open Source", "Proprietary", "Free", "New"]);
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["Recommended"] }))),
    ["openai/recommended"],
  );
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["New"] }))),
    ["google/new-beta"],
  );
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["Free"] }))),
    ["local/free"],
  );
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["Unsupported"] }))),
    [],
  );
});

test("runtime model catalog maps backend-owned model taxonomy instead of deriving sidebar filters locally", () => {
  const models = mergeRuntimeModelCatalog([
    {
      model: "gpt-4o-mini",
      catalogKey: "openai/gpt-4o-mini",
      displayName: "GPT-4o mini",
      vendorCode: "openai",
      vendor: "openai",
      capabilities: ["chat", "tools"],
      groups: ["default", "enterprise", "vip"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["openai"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
    {
      model: "llama-3",
      catalogKey: "meta/llama-3",
      displayName: "Llama 3",
      vendorCode: "meta",
      vendor: "meta",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Open Source"],
      providerCodes: ["meta"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.000000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
  ]);

  assert.deepEqual(models.map((model) => model.groups), [["default", "enterprise", "vip"], ["default"]]);
  assert.deepEqual(models.map((model) => model.categories), [["Recommended", "Proprietary"], ["Open Source"]]);
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["Proprietary"] }))),
    ["openai/gpt-4o-mini"],
  );
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedCategories: ["Free"] }))),
    [],
  );
});

test("runtime model catalog preserves backend-configured custom model groups for sidebar filters", () => {
  const models = mergeRuntimeModelCatalog([
    {
      model: "gpt-4o-mini",
      catalogKey: "openai/gpt-4o-mini",
      displayName: "GPT-4o mini",
      vendorCode: "openai",
      vendor: "openai",
      capabilities: ["chat", "tools"],
      groups: ["standard-group", "premium-lab", "enterprise"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["openai"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
  ]);
  const options = deriveModelCatalogFilterOptions(models);
  const configuredOptions = deriveModelCatalogFilterOptions(models, [
    { key: "standard-group", label: "Standard Users", modelCount: 1 },
    { key: "premium-lab", label: "Premium Lab", modelCount: 1 },
    { key: "empty-admin-group", label: "Empty Admin Group", modelCount: 0 },
  ]);

  assert.deepEqual(models[0].groups, ["standard-group", "premium-lab", "enterprise"]);
  assert.deepEqual(options.groups, [
    { key: "enterprise", label: "Enterprise exclusive" },
    { key: "premium-lab", label: "Premium Lab" },
    { key: "standard-group", label: "Standard Group" },
  ]);
  assert.deepEqual(configuredOptions.groups, [
    { key: "standard-group", label: "Standard Users", modelCount: 1 },
    { key: "premium-lab", label: "Premium Lab", modelCount: 1 },
    { key: "empty-admin-group", label: "Empty Admin Group", modelCount: 0 },
  ]);
  assert.deepEqual(
    modelIds(filterModelsForCatalog(models, catalogFilters({ selectedGroups: ["premium-lab"] }))),
    ["openai/gpt-4o-mini"],
  );
});

test("runtime model catalog keeps unknown public prices unavailable instead of free", () => {
  const models = mergeRuntimeModelCatalog([
    {
      model: "new-runtime-only",
      catalogKey: "newvendor/new-runtime-only",
      displayName: "Runtime Only",
      vendorCode: "newvendor",
      vendor: "newvendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      officialReferencePrices: [],
      priceAvailability: {
        status: "unavailable",
        reason: "price is not configured",
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].pricing.status, "unavailable");
  assert.equal(models[0].pricing.input, 0);
  assert.equal(models[0].pricing.output, 0);
  assert.equal(formatModelPrice(models[0].pricing, "input"), "-");
  assert.equal(modelPricingBadgeLabel(models[0]), "unavailable");
  assert.equal(modelPricingUnitLabel(models[0]), "price is not configured");
});

test("runtime model catalog returns an empty runtime catalog when the app SDK returns no usable items", () => {
  const emptyCatalogModels = resolveRuntimeModelCatalog([]);
  const malformedCatalogModels = resolveRuntimeModelCatalog(null);
  const invalidCatalogModels = resolveRuntimeModelCatalog([
    null,
    {},
    {
      model: "missing-arrays",
      catalogKey: "openai/missing-arrays",
      displayName: "Missing Arrays",
      vendorCode: "openai",
      vendor: "OpenAI",
      priceAvailability: { status: "reference" },
    },
    {
      model: "   ",
      catalogKey: "openai/blank",
      displayName: "Blank model",
      vendorCode: "openai",
      vendor: "OpenAI",
      capabilities: ["chat"],
      providerCodes: ["openai"],
      priceAvailability: {
        status: "reference",
        reason: "Public reference price only. Customer-specific pricing requires an API key context.",
      },
    },
  ]);

  assert.deepEqual(emptyCatalogModels, []);
  assert.deepEqual(malformedCatalogModels, []);
  assert.deepEqual(invalidCatalogModels, []);
});

test("runtime model catalog skips malformed items while keeping usable runtime models", () => {
  const models = resolveRuntimeModelCatalog([
    {},
    null,
    {
      model: "bad-capability",
      catalogKey: "newvendor/bad-capability",
      displayName: "Bad Capability",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat", 42],
      providerCodes: ["newprovider"],
      priceAvailability: { status: "reference" },
    },
    {
      model: "runtime-good",
      catalogKey: "newvendor/runtime-good",
      displayName: "Runtime Good",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.200000", currency: "USD" },
      ],
      priceAvailability: {
        status: "reference",
        reason: "Public reference price only. Customer-specific pricing requires an API key context.",
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "newvendor/runtime-good");
  assert.equal(models[0].name, "Runtime Good");
  assert.equal(models[0].pricing.status, "reference");
  assert.equal(models[0].pricing.input, 0.2);
  assert.equal(models[0].pricing.currency, "USD");
  assert.deepEqual(models[0].capabilities, []);
});

test("runtime model catalog accepts canonical backend model catalog keys", () => {
  const models = resolveRuntimeModelCatalog([
    {
      model: "gpt-4o-mini",
      catalogKey: "openai/gpt-4o-mini",
      displayName: "GPT-4o mini",
      vendorCode: "openai",
      vendor: "OpenAI",
      capabilities: ["chat", "tools"],
      groups: ["default", "enterprise"],
      categories: ["Recommended", "Proprietary"],
      modalities: ["text"],
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextTokens: 128000,
      maxOutputTokens: 16384,
      providerCodes: ["openai"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
        { regionCode: "global", billingMeter: "llm_output_token", unitPrice: "0.600000", currency: "USD" },
      ],
      priceAvailability: {
        status: "reference",
        reason: "Public reference price only. Customer-specific pricing requires an API key context.",
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "openai/gpt-4o-mini");
  assert.equal(models[0].modelId, "gpt-4o-mini");
  assert.equal(models[0].pricing.input, 0.15);
  assert.equal(models[0].pricing.output, 0.6);
});

test("runtime model catalog rejects regional catalog keys instead of compatibility aliases", () => {
  const models = resolveRuntimeModelCatalog([
    {
      model: "gpt-4o-mini",
      catalogKey: "openai/global/gpt-4o-mini",
      displayName: "GPT-4o mini",
      vendorCode: "openai",
      vendor: "OpenAI",
      capabilities: ["chat", "tools"],
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["openai"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
    {
      model: "global/gpt-4o-mini",
      catalogKey: "openai/global/gpt-4o-mini",
      displayName: "GPT-4o mini legacy alias",
      vendorCode: "openai",
      vendor: "OpenAI",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["openai"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
    {
      model: "anthropic/claude-3-opus",
      catalogKey: "openrouter/anthropic/claude-3-opus",
      displayName: "Claude 3 Opus via OpenRouter",
      vendorCode: "openrouter",
      vendor: "OpenRouter",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["openrouter"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "1.000000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
  ]);

  assert.deepEqual(modelIds(models), ["openrouter/anthropic/claude-3-opus"]);
});

test("runtime model catalog rejects mismatched catalog keys instead of synthesizing identities", () => {
  const models = resolveRuntimeModelCatalog([
    {
      model: "runtime-good",
      catalogKey: "other/runtime-good",
      displayName: "Runtime Good",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      priceAvailability: { status: "reference" },
    },
    {
      model: "runtime-good",
      catalogKey: "newvendor/runtime-good",
      displayName: "Runtime Good",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      priceAvailability: { status: "reference" },
    },
  ]);

  assert.deepEqual(modelIds(models), ["newvendor/runtime-good"]);
});

test("model detail route resolver requires exact catalog keys for ambiguous official ids", () => {
  const runtimeModels = resolveRuntimeModelCatalog([
    {
      model: "MiniMax-M2.7",
      catalogKey: "minimax/MiniMax-M2.7",
      displayName: "MiniMax M2.7",
      vendorCode: "minimax",
      vendor: "minimax",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["minimax_direct"],
      officialReferencePrices: [
        { regionCode: "cn", billingMeter: "llm_input_token", unitPrice: "2.100000", currency: "CNY" },
      ],
      priceAvailability: { status: "reference" },
    },
    {
      model: "MiniMax-M2.7",
      catalogKey: "minimax/MiniMax-M2.7",
      displayName: "MiniMax M2.7",
      vendorCode: "minimax",
      vendor: "minimax",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended", "Proprietary"],
      providerCodes: ["minimax_direct"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.300000", currency: "USD" },
      ],
      priceAvailability: { status: "reference" },
    },
  ]);

  assert.equal(findModelByCatalogRouteId(runtimeModels, "MiniMax-M2.7"), null);
  assert.equal(
    findModelByCatalogRouteId(runtimeModels, encodeURIComponent("minimax/MiniMax-M2.7"))?.id,
    "minimax/MiniMax-M2.7",
  );
});

test("model detail route resolver accepts encoded catalog route ids without crashing on malformed escapes", () => {
  const runtimeModels = resolveRuntimeModelCatalog([
    {
      model: "runtime-good",
      catalogKey: "newvendor/runtime-good",
      displayName: "Runtime Good",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      officialReferencePrices: [
        { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.200000", currency: "USD" },
      ],
      priceAvailability: {
        status: "reference",
        reason: "Public reference price only. Customer-specific pricing requires an API key context.",
      },
    },
  ]);

  const staticRouteModel = findModelByCatalogRouteId(TEST_ROUTE_MODELS, "openai%2Fgpt-4o-mini");
  const runtimeRouteModel = findModelByCatalogRouteId(runtimeModels, encodeURIComponent("newvendor/runtime-good"));
  const malformedRouteModel = findModelByCatalogRouteId(runtimeModels, "%E0%A4%A");

  assert.equal(staticRouteModel?.id, "openai/gpt-4o-mini");
  assert.equal(runtimeRouteModel?.id, "newvendor/runtime-good");
  assert.equal(malformedRouteModel, null);
});

test("runtime model catalog rejects unsafe identifiers and caps public runtime text", () => {
  const longDisplayName = `  ${"Runtime Display ".repeat(12)}  `;
  const longReason = `  ${"public reference reason ".repeat(12)}  `;
  const models = resolveRuntimeModelCatalog([
    {
      model: "bad\nmodel",
      catalogKey: "newvendor/bad-model",
      displayName: "Bad Model",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      providerCodes: ["newprovider"],
      priceAvailability: { status: "reference" },
    },
    {
      model: "runtime-safe",
      catalogKey: "newvendor/runtime-safe",
      displayName: longDisplayName,
      vendorCode: "  newvendor  ",
      vendor: "  New\tVendor  ",
      capabilities: ["tools", "json mode", "capability ".repeat(12)],
      groups: ["default", "enterprise"],
      categories: ["Recommended"],
      providerCodes: ["  newprovider  "],
      priceAvailability: {
        status: "reference",
        reason: longReason,
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "newvendor/runtime-safe");
  assert.equal(models[0].name.length <= 80, true);
  assert.equal(models[0].name.endsWith("..."), true);
  assert.equal(models[0].provider, "New Vendor");
  assert.equal(models[0].pricing.reason?.length <= 160, true);
  assert.equal(models[0].pricing.reason?.endsWith("..."), true);
  assert.equal(models[0].capabilities.every((capability) => capability.length <= 64), true);
});

test("runtime model catalog omits blank normalized price reasons", () => {
  const models = resolveRuntimeModelCatalog([
    {
      model: "blank-reason",
      catalogKey: "newvendor/blank-reason",
      displayName: "Blank Reason",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      priceAvailability: {
        status: "unavailable",
        reason: "   ",
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].pricing.status, "unavailable");
  assert.equal(models[0].pricing.reason, "Public reference price is not configured for this model.");
});

test("runtime model catalog treats malformed price payloads as unavailable instead of crashing", () => {
  const models = resolveRuntimeModelCatalog([
    {
      model: "bad-price",
      catalogKey: "newvendor/bad-price",
      displayName: "Bad Price",
      vendorCode: "newvendor",
      vendor: "New Vendor",
      capabilities: ["chat"],
      groups: ["default"],
      categories: ["Recommended"],
      providerCodes: ["newprovider"],
      priceAvailability: {
        status: "reference",
        reason: 100,
      },
    },
  ]);

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "newvendor/bad-price");
  assert.equal(models[0].pricing.status, "unavailable");
  assert.equal(models[0].pricing.input, 0);
  assert.equal(models[0].pricing.reason, "Public reference price is not configured for this model.");
});

test("runtime model catalog item contract does not accept public private pricing fields", () => {
  const allowedItem = {
    catalogKey: "openai/gpt-4o-mini",
    model: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    vendorCode: "openai",
    vendor: "openai",
    capabilities: ["chat"],
    description: "Fast model.",
    modalities: ["text"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    apiFormat: "openai_compatible",
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    trainingDataCutoff: null,
    contextTokens: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    releaseStage: 1,
    shelfState: 1,
    routingState: 1,
    replacementModel: null,
    groups: ["default"],
    categories: ["Recommended", "Proprietary"],
    providerCodes: ["openrouter"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
    ],
    priceAvailability: { status: "reference" },
  } satisfies RuntimeModelCatalogItem;

  assert.equal(allowedItem.model, "gpt-4o-mini");
});

test("model service loads the runtime catalog through the generated app SDK", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/models");
      assert.equal(requestUrl.searchParams.has("billingMeter"), false);
      return {
        items: [
          {
            model: "runtime-sdk-model",
            catalogKey: "openai/runtime-sdk-model",
            displayName: "Runtime SDK Model",
            vendorCode: "openai",
            vendor: "OpenAI",
            capabilities: ["chat", "tools"],
            groups: ["default", "enterprise", "vip"],
            categories: ["Recommended", "Proprietary"],
            modalities: ["text"],
            inputModalities: ["text"],
            outputModalities: ["text"],
            contextTokens: 1050000,
            maxOutputTokens: 32768,
            providerCodes: ["openai"],
            officialReferencePrices: [
              { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "1.250000", currency: "USD" },
              { regionCode: "global", billingMeter: "llm_output_token", unitPrice: "5.000000", currency: "USD" },
              { regionCode: "global", billingMeter: "llm_cache_read_token", unitPrice: "0.125000", currency: "USD" },
            ],
            priceAvailability: {
              status: "reference",
            },
          },
        ],
      };
    },
    async (captured) => {
      const models = await ModelService.fetchModels();
      const requestedUrls = captured.map((request) => request.url);

      assert.equal(models.length, 1);
      assert.equal(models[0].id, "openai/runtime-sdk-model");
      assert.equal(models[0].context, "1.05M");
      assert.equal(models[0].pricing.input, 1.25);
      assert.equal(models[0].pricing.output, 5);
      assert.equal(models[0].pricing.cachedInput, 0.125);
      assert.equal(captured.every((request) => request.method === "GET"), true);
      assert.deepEqual(requestedUrls, ["/app/v3/api/ai/models"]);
    },
  );
});

test("model service preserves the backend admin group catalog for model library filters", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/models");
      return {
        items: [
          {
            model: "runtime-sdk-model",
            catalogKey: "openai/runtime-sdk-model",
            displayName: "Runtime SDK Model",
            vendorCode: "openai",
            vendor: "OpenAI",
            capabilities: ["chat", "tools"],
            groups: ["premium-lab"],
            categories: ["Recommended", "Proprietary"],
            modalities: ["text"],
            inputModalities: ["text"],
            outputModalities: ["text"],
            providerCodes: ["openai"],
            officialReferencePrices: [
              { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "1.250000", currency: "USD" },
            ],
            priceAvailability: {
              status: "reference",
            },
          },
        ],
        groups: [
          { key: "standard-group", label: "Standard Users", modelCount: 12 },
          { key: "premium-lab", label: "Premium Lab", modelCount: 1 },
          { key: "empty-admin-group", label: "Empty Admin Group", modelCount: 0 },
        ],
      };
    },
    async () => {
      const catalog = await ModelService.fetchModelCatalog();
      const options = deriveModelCatalogFilterOptions(catalog.models, catalog.groups);

      assert.deepEqual(catalog.models.map((model) => model.groups), [["premium-lab"]]);
      assert.deepEqual(catalog.groups, [
        { key: "standard-group", label: "Standard Users", modelCount: 12 },
        { key: "premium-lab", label: "Premium Lab", modelCount: 1 },
        { key: "empty-admin-group", label: "Empty Admin Group", modelCount: 0 },
      ]);
      assert.deepEqual(options.groups, catalog.groups);
    },
  );
});

test("model service sends sidebar filters through the generated app SDK query contract", async () => {
  await withAppSdkFetch(
    (url) => {
      const requestUrl = new URL(url, "http://localhost");
      assert.equal(requestUrl.pathname, "/app/v3/api/ai/models");
      assert.equal(requestUrl.searchParams.get("billing_meter"), "llm_input_token");
      assert.equal(requestUrl.searchParams.get("vendor_codes"), "openai,anthropic");
      assert.equal(requestUrl.searchParams.get("modalities"), "text,image");
      assert.equal(requestUrl.searchParams.get("capabilities"), "tools,json mode");
      assert.equal(requestUrl.searchParams.get("categories"), "Recommended,Proprietary");
      assert.equal(requestUrl.searchParams.get("groups"), "enterprise,vip");
      assert.equal(requestUrl.searchParams.get("q"), "gpt");
      assert.equal(requestUrl.searchParams.has("search_query"), false);
      assert.equal(requestUrl.searchParams.get("limit"), "200");
      return { items: [] };
    },
    async (captured) => {
      const models = await ModelService.fetchModels({
        billingMeter: "llm_input_token",
        vendorCodes: ["openai", "anthropic"],
        modalities: ["text", "image"],
        capabilities: ["tools", "json mode"],
        categories: ["Recommended", "Proprietary"],
        groups: ["enterprise", "vip"],
        searchQuery: "gpt",
        limit: 200,
      });

      assert.deepEqual(models, []);
      assert.deepEqual(captured.map((request) => `${request.method} ${request.url}`), [
        "GET /app/v3/api/ai/models?billing_meter=llm_input_token&vendor_codes=openai%2Canthropic&modalities=text%2Cimage&capabilities=tools%2Cjson%20mode&categories=Recommended%2CProprietary&groups=enterprise%2Cvip&q=gpt&limit=200",
      ]);
    },
  );
});
