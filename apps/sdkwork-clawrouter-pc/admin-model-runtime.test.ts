import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  KNOWN_VENDORS as ADMIN_KNOWN_VENDORS,
  ModelService,
  selectPreferredModelVendorId,
} from "./../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts";
import { ResourceGroupService } from "./../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-resource/src/resourceGroupService.ts";
import { deriveModelRankingRefreshDiagnostics } from "./../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelRankingRefreshDiagnostics.ts";
import {
  createModelInputFromForm,
  createVendorInputFromForm,
  updateModelInputFromForm,
} from "./../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelForm.ts";

const KNOWN_VENDORS = [
  { id: "v_openai", name: "OpenAI", desc: "Industry leading LLMs inclusive of GPT-4 and DALL-E." },
  { id: "custom", name: "Custom Provider", desc: "" },
] as const;

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const PORTAL_ROOT = import.meta.dirname;

type CapturedBackendRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

function adminVendor(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const vendor = {
    id: "vendor-1",
    vendorCode: "openai",
    name: "OpenAI",
    status: "active",
    color: "bg-indigo-500",
    description: "Valid row",
    ...overrides,
  };
  for (const [key, value] of Object.entries(vendor)) {
    if (value === undefined) {
      delete vendor[key as keyof typeof vendor];
    }
  }
  return vendor;
}

function adminModel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const runtimeModel = typeof overrides.model === "string"
    ? overrides.model
    : typeof overrides.name === "string"
      ? overrides.name
      : "gpt-4o-mini";
  const displayName = typeof overrides.displayName === "string"
    ? overrides.displayName
    : runtimeModel;
  const model = {
    id: "model-1",
    vendorId: "vendor-1",
    vendorCode: "openai",
    model: runtimeModel,
    displayName,
    name: displayName,
    type: "Chat",
    regionPrices: [
      {
        regionCode: "global",
        currency: "USD",
        priceIn: "0.1500",
        priceOut: "0.6000",
        cacheReadPrice: "0.0750",
        cacheWritePrice: "0.1500",
      },
    ],
    status: "active",
    calls: "42",
    description: null,
    modalities: ["text"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    apiFormat: "openai_responses",
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    trainingDataCutoff: null,
    contextTokens: 128000,
    maxOutputTokens: null,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
                releaseStage: "1",
                shelfState: "1",
                routingState: "1",
    replacementModel: null,
    ...overrides,
  };
  for (const [key, value] of Object.entries(model)) {
    if (value === undefined) {
      delete model[key as keyof typeof model];
    }
  }
  return model;
}

function modelRegionPrice(
  priceIn: string,
  priceOut: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    regionCode: "global",
    currency: "USD",
    priceIn,
    priceOut,
    ...overrides,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function withBackendSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedBackendRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedBackendRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      dispatchEvent: () => true,
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? init.body : "";
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    captured.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body,
    });
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

test("admin model vendor create input does not reuse returned vendor view model", () => {
  const form = new FormData();
  form.set("customName", " Acme AI ");
  form.set("description", " Enterprise gateway ");

  const input = createVendorInputFromForm(form, "custom", KNOWN_VENDORS, " Enterprise gateway ");

  assert.deepEqual(input, {
    name: "Acme AI",
    status: "active",
    color: "bg-indigo-500",
    description: "Enterprise gateway",
  });
  assert.equal("id" in input!, false);
});

test("admin model vendor create input resolves known vendor selection", () => {
  const input = createVendorInputFromForm(new FormData(), "v_openai", KNOWN_VENDORS, "");

  assert.deepEqual(input, {
    name: "OpenAI",
    status: "active",
    color: "bg-indigo-500",
    description: "Industry leading LLMs inclusive of GPT-4 and DALL-E.",
  });
});

test("admin model known vendor shortcuts only contain model publishers", () => {
  const ids = ADMIN_KNOWN_VENDORS.map((vendor) => vendor.id);
  const names = ADMIN_KNOWN_VENDORS.map((vendor) => vendor.name.toLowerCase());

  for (const providerOnly of ["v_openrouter", "v_ollama"]) {
    assert.equal(ids.includes(providerOnly), false);
  }
  for (const providerOnly of ["openrouter", "ollama", "azure openai", "aws bedrock"]) {
    assert.equal(names.includes(providerOnly), false);
  }
});

test("admin model vendor selection uses persisted vendor ids instead of shortcut ids", () => {
  const vendors = [
    {
      id: "model-vendor-openai",
      vendorCode: "openai",
      name: "OpenAI",
      status: "active",
      color: "bg-indigo-500",
      description: "Official OpenAI model vendor",
    },
    {
      id: "model-vendor-anthropic",
      vendorCode: "anthropic",
      name: "Anthropic",
      status: "active",
      color: "bg-orange-500",
      description: "Official Anthropic model vendor",
    },
  ] as const;

  assert.equal(selectPreferredModelVendorId(vendors, "v_openai"), "model-vendor-openai");
  assert.equal(selectPreferredModelVendorId(vendors, "model-vendor-anthropic"), "model-vendor-anthropic");
  assert.equal(selectPreferredModelVendorId([], "v_openai"), "");
});

test("admin model page does not expose unsupported vendor settings action", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /Vendor settings/);
});

test("admin model page groups rows by vendor code when persisted vendor ids differ", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  assert.match(source, /modelsForVendor\(models,\s*v\)/);
  assert.match(source, /modelsForVendor\(models,\s*selectedVendor\)/);
  assert.doesNotMatch(source, /models\.filter\(m => m\.vendorId === selectedVendorId/);
  assert.doesNotMatch(source, /models\.filter\(m => m\.vendorId === v\.id/);
});

test("admin model page visible copy uses the admin model i18n namespace", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );
  const i18nSource = readFileSync(
    resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts"),
    "utf8",
  );

  const expectedKeys = [
    "admin.model.vendorSidebar.title",
    "admin.model.search.placeholder",
    "admin.model.filters.allModalities",
    "admin.model.filters.modality",
    "admin.model.filters.llm",
    "admin.model.filters.image",
    "admin.model.filters.video",
    "admin.model.filters.audio",
    "admin.model.filters.sfx",
    "admin.model.filters.music",
    "admin.model.filters.embedding",
    "admin.model.table.model",
    "admin.model.table.type",
    "admin.model.table.price",
    "admin.model.table.context",
    "admin.model.table.calls",
    "admin.model.table.status",
    "admin.model.table.actions",
    "admin.model.state.loadingModels",
    "admin.model.state.modelsLoadError",
    "admin.model.state.noModels",
    "admin.model.state.noModelsDescription",
    "admin.model.state.selectVendor",
    "admin.model.status.active",
    "admin.model.status.inactive",
    "admin.model.pricing.input",
    "admin.model.pricing.output",
    "admin.model.pricing.cacheRead",
    "admin.model.pricing.cacheWrite",
    "admin.model.pagination.showing",
    "admin.model.pagination.page",
    "admin.model.pagination.pageSize",
    "admin.model.vendorModal.title",
    "admin.model.vendorModal.vendorBrand",
    "admin.model.vendorModal.selectPlaceholder",
    "admin.model.vendorModal.customNamePlaceholder",
    "admin.model.vendorModal.description",
    "admin.model.vendorModal.descriptionPlaceholder",
    "admin.model.modelModal.editTitle",
    "admin.model.modelModal.connectTitle",
    "admin.model.modelModal.modelId",
    "admin.model.modelModal.modelIdPlaceholder",
    "admin.model.modelModal.modelType",
    "admin.model.modelModal.contextWindow",
    "admin.model.modelModal.contextPlaceholder",
    "admin.model.modelModal.capabilities",
    "admin.model.modelModal.maxOutputTokens",
    "admin.model.modelModal.optionalPlaceholder",
    "admin.model.modelModal.supportedLanguages",
    "admin.model.modelModal.supportedLanguagesPlaceholder",
    "admin.model.modelModal.description",
    "admin.model.modelModal.descriptionPlaceholder",
    "admin.model.modelModal.capabilityIntro",
    "admin.model.modelModal.capabilityIntroPlaceholder",
    "admin.model.modelModal.limitations",
    "admin.model.modelModal.limitationsPlaceholder",
    "admin.model.modelModal.useCases",
    "admin.model.modelModal.useCasesPlaceholder",
    "admin.model.modelModal.pricingTitle",
    "admin.model.modelModal.inputUnitPrice",
    "admin.model.modelModal.outputUnitPrice",
    "admin.model.modelModal.cacheReadUnitPrice",
    "admin.model.modelModal.cacheWriteUnitPrice",
    "admin.model.modelTypes.video",
    "admin.model.modelTypes.chat",
    "admin.model.modelTypes.image",
    "admin.model.modelTypes.audio",
    "admin.model.modelTypes.music",
    "admin.model.modelTypes.soundEffect",
    "admin.model.modelTypes.embedding",
    "admin.model.delete.title",
    "admin.model.delete.description",
    "admin.model.delete.confirm",
  ];

  for (const key of expectedKeys) {
    assert.match(source, new RegExp(`t\\('${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
    assert.match(i18nSource, new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  for (const literal of [
    "Model catalog management",
    "Manage model vendors, model pricing, and routing readiness.",
    "Model vendors",
    "Search models for this vendor...",
    "Ranking refresh runtime",
    "Add model vendor",
    "Model ID",
    "Pricing ($ / 1M units)",
    "Delete model configuration?",
  ]) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(literal)));
  }
});

test("admin model list summarizes prices and opens regional pricing popovers", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );
  const i18nSource = readFileSync(
    resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts"),
    "utf8",
  );

  assert.match(source, /const modelPriceColumnClassName = ['"][^'"]*min-w-\[[^\]]+\][^'"]*whitespace-nowrap[^'"]*['"]/);
  assert.match(source, /<th className=\{modelPriceColumnClassName\}>\{t\('admin\.model\.table\.price'\)\}<\/th>/);
  assert.match(source, /openPricePopoverModelId/);
  assert.match(source, /priceRegionByModelId/);
  assert.match(source, /const modelPriceSummaryButtonClassName = ['"][^'"]*whitespace-nowrap[^'"]*['"]/);
  assert.match(source, /const modelPricePopoverClassName = ['"][^'"]*absolute[^'"]*z-\[/);
  assert.match(source, /getModelRegionPrices\(m\)/);
  assert.match(source, /selectedPriceRegionCode/);
  assert.match(source, /setOpenPricePopoverModelId\(openPricePopoverModelId === m\.id \? null : m\.id\)/);
  assert.match(source, /t\('admin\.model\.pricing\.regionCount'/);
  assert.match(source, /t\('admin\.model\.pricing\.details'\)/);
  assert.match(source, /MODEL_PRICING_REGIONS\.find/);
  assert.doesNotMatch(source, /const modelPricePillClassName = /);
  assert.doesNotMatch(source, /<div className=\{modelPricePillClassName\}>/);
  assert.match(i18nSource, /"admin\.model\.pricing\.regionCount"/);
  assert.match(i18nSource, /"admin\.model\.pricing\.details"/);
});

test("admin ai model create input does not reuse returned model view model", () => {
  const form = new FormData();
  form.set("model", " gpt-4o-mini ");
  form.set("displayName", " GPT-4o mini ");
  form.set("type", "Chat");
  form.set("priceIn.global", " 0.1500 ");
  form.set("priceOut.global", " 0.6000 ");
  form.set("cacheReadPrice.global", " 0.0750 ");
  form.set("cacheWritePrice.global", " 0.1500 ");
  form.set("priceIn.cn", " 0.2000 ");
  form.set("priceOut.cn", " 0.8000 ");
  form.set("cacheReadPrice.cn", " 0.1000 ");
  form.set("cacheWritePrice.cn", " 0.2000 ");
  form.set("contextTokens", "128k");

  const input = createModelInputFromForm(form, "v_openai");

  assert.deepEqual(input, {
    vendorId: "v_openai",
    model: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    type: "Chat",
    regionPrices: [
      {
        regionCode: "cn",
        currency: "CNY",
        priceIn: "0.2000",
        priceOut: "0.8000",
        cacheReadPrice: "0.1000",
        cacheWritePrice: "0.2000",
      },
      {
        regionCode: "global",
        currency: "USD",
        priceIn: "0.1500",
        priceOut: "0.6000",
        cacheReadPrice: "0.0750",
        cacheWritePrice: "0.1500",
      },
    ],
    contextTokens: "128k",
    maxOutputTokens: null,
    description: null,
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    supportsStreaming: false,
    supportsTools: false,
    supportsJsonSchema: false,
  });
  for (const field of ["id", "calls", "status"]) {
    assert.equal(field in input, false);
  }
});

test("admin ai model update input preserves current type marker for partial updates", () => {
  const form = new FormData();
  form.set("model", " gpt-4o-mini ");
  form.set("displayName", " ");
  form.set("type", "Chat");
  form.set("priceIn.global", " 0.2000 ");
  form.set("priceOut.global", " 0.8000 ");
  form.set("cacheReadPrice.global", " 0.1000 ");
  form.set("cacheWritePrice.global", " 0.2000 ");
  form.set("priceIn.cn", " 0.3000 ");
  form.set("priceOut.cn", " 0.9000 ");
  form.set("cacheReadPrice.cn", " 0.1500 ");
  form.set("cacheWritePrice.cn", " 0.3000 ");
  form.set("contextTokens", "128k");

  const input = updateModelInputFromForm(form, "v_openai", {
    id: "model-1",
    vendorId: "v_openai",
    vendorCode: "openai",
    model: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    name: "GPT-4o mini",
    type: "Chat",
    status: "inactive",
    calls: "42",
    description: null,
    modalities: ["text"],
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    apiFormat: "openai_responses",
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    trainingDataCutoff: null,
    contextTokens: 128000,
    maxOutputTokens: null,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    releaseStage: 1,
    shelfState: 1,
    routingState: 1,
    replacementModel: null,
  });

  assert.deepEqual(input, {
    vendorId: "v_openai",
    model: "gpt-4o-mini",
    displayName: null,
    type: "Chat",
    regionPrices: [
      {
        regionCode: "cn",
        currency: "CNY",
        priceIn: "0.3000",
        priceOut: "0.9000",
        cacheReadPrice: "0.1500",
        cacheWritePrice: "0.3000",
      },
      {
        regionCode: "global",
        currency: "USD",
        priceIn: "0.2000",
        priceOut: "0.8000",
        cacheReadPrice: "0.1000",
        cacheWritePrice: "0.2000",
      },
    ],
    contextTokens: "128k",
    maxOutputTokens: null,
    description: null,
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    supportsStreaming: false,
    supportsTools: false,
    supportsJsonSchema: false,
    currentType: "Chat",
  });
});

test("admin ai model form keeps cache prices optional", () => {
  const form = new FormData();
  form.set("model", "gpt-4o-mini");
  form.set("type", "Chat");
  form.set("priceIn.global", "0.1500");
  form.set("priceOut.global", "0.6000");
  form.set("cacheReadPrice.global", " ");
  form.set("cacheWritePrice.global", " ");
  form.set("contextTokens", "128k");

  const input = createModelInputFromForm(form, "v_openai");

  assert.deepEqual(input.regionPrices, [
    {
      regionCode: "global",
      currency: "USD",
      priceIn: "0.1500",
      priceOut: "0.6000",
      cacheReadPrice: "",
      cacheWritePrice: "",
    },
  ]);
});

test("admin ai model form rejects missing or unsupported model types", () => {
  const missing = new FormData();
  missing.set("model", "gpt-4o-mini");
  missing.set("priceIn.global", "0.1500");
  missing.set("priceOut.global", "0.6000");

  assert.throws(
    () => createModelInputFromForm(missing, "v_openai"),
    /Model type is required/,
  );

  const unsupported = new FormData();
  unsupported.set("model", "gpt-4o-mini");
  unsupported.set("type", "Vision");
  unsupported.set("priceIn.global", "0.1500");
  unsupported.set("priceOut.global", "0.6000");

  assert.throws(
    () => createModelInputFromForm(unsupported, "v_openai"),
    /Unsupported model type: Vision/,
  );
});

test("admin ai model form rejects missing context tokens instead of defaulting", () => {
  const form = new FormData();
  form.set("model", "gpt-4o-mini");
  form.set("type", "Chat");
  form.set("priceIn.global", "0.1500");
  form.set("priceOut.global", "0.6000");
  form.set("contextTokens", " ");

  assert.throws(
    () => createModelInputFromForm(form, "v_openai"),
    /contextTokens is required/,
  );
});

test("admin model editor creates default mainland China and global pricing regions", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );
  const formSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelForm.ts"),
    "utf8",
  );
  const serviceSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts"),
    "utf8",
  );
  const i18nSource = readFileSync(
    resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts"),
    "utf8",
  );

  for (const expected of [
    "MODEL_PRICING_REGIONS = [",
    "code: 'cn'",
    "currency: 'CNY'",
    "code: 'global'",
    "currency: 'USD'",
    "formData.get(`priceIn.${regionCode}`)",
    "formData.get(`priceOut.${regionCode}`)",
    "formData.get(`cacheReadPrice.${regionCode}`)",
    "formData.get(`cacheWritePrice.${regionCode}`)",
  ]) {
    assert.ok(formSource.includes(expected), `missing region pricing form marker: ${expected}`);
  }
  for (const legacy of [
    "legacyGlobalPrice",
    "formData.get('priceIn')",
    "formData.get('priceOut')",
    "formData.get('cacheReadPrice')",
    "formData.get('cacheWritePrice')",
  ]) {
    assert.equal(formSource.includes(legacy), false, `model pricing form must not keep flat legacy price fallback: ${legacy}`);
  }

  for (const expected of [
    "regionPrices: ModelRegionPriceInput[]",
    "regionPrices: regionPrices.map",
    "currency: currencyCode(regionPrice.currency",
  ]) {
    assert.ok(serviceSource.includes(expected), `missing region pricing service marker: ${expected}`);
  }
  for (const legacy of [
    "model.priceIn !== undefined || model.priceOut !== undefined",
    "requiredText(model.priceIn ?? '', 'priceIn')",
    "cacheReadPrice: model.cacheReadPrice",
    "cacheWritePrice: model.cacheWritePrice",
    "readModelRegionPrices(item, { priceIn, priceOut, cacheReadPrice, cacheWritePrice })",
    "{ regionCode: 'global', ...fallback }",
  ]) {
    assert.equal(serviceSource.includes(legacy), false, `model service must not rebuild region pricing from flat price fields: ${legacy}`);
  }

  for (const expected of [
    "max-w-5xl",
    "lg:grid-cols-[minmax(0,1fr)_360px]",
    "admin.model.modelModal.pricingRegionsTitle",
    "MODEL_PRICING_REGIONS.map",
    "name={`priceIn.${region.code}`}",
    "name={`priceOut.${region.code}`}",
    "name={`cacheReadPrice.${region.code}`}",
    "name={`cacheWritePrice.${region.code}`}",
  ]) {
    assert.ok(source.includes(expected), `missing region pricing modal marker: ${expected}`);
  }

  for (const key of [
    "admin.model.modelModal.pricingRegionsTitle",
    "admin.model.modelModal.pricingRegion.cn",
    "admin.model.modelModal.pricingRegion.global",
    "admin.model.modelModal.regionPricingHint",
  ]) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin model service calls generated backend SDK paths and normalizes model catalog data", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/model_vendors" && method === "GET") {
        return {
          items: [
            adminVendor({
              status: "inactive",
              color: "bg-green-600",
              description: "Public models",
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              type: "Image",
              status: "inactive",
              modalities: ["image"],
              inputModalities: ["text", "image"],
              outputModalities: ["image"],
              apiFormat: "openai_compatible",
              supportsStreaming: false,
              supportsTools: false,
              supportsJsonSchema: false,
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return {
          items: [
            {
              id: "rank-1",
              name: "gpt-4o-mini",
              requests: "1234567",
              baseVolume: "42",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/models/refresh" && method === "POST") {
        return {
          synced: true,
          source: "sdkwork_models",
          mode: "official_refresh",
          dryRun: false,
          catalogVersion: "2026.05.08.1",
          requestedCatalogVersion: "2026.05.08.1",
          catalogRoot: null,
          vendorCodes: ["anthropic"],
          sourceHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          meterCount: 20,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 3,
          rankingCount: 1,
          acceptedCount: 28,
          snapshotId: "snapshot-1",
          syncRunId: "sync-run-1",
          vendors: [
            adminVendor({
              id: "vendor-2",
              vendorCode: "anthropic",
              name: "Anthropic",
              color: "bg-orange-500",
              description: "Claude",
            }),
          ],
          models: [
            adminModel({
              id: "model-2",
              vendorId: "vendor-2",
              vendorCode: "anthropic",
              model: "claude-3-5-sonnet",
              displayName: "Claude 3.5 Sonnet",
              regionPrices: [modelRegionPrice("3", "15")],
              calls: "7",
              contextTokens: 200000,
              inputModalities: ["text", "image"],
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_vendors" && method === "POST") {
        return {
          item: adminVendor({
            id: "vendor-3",
            vendorCode: "custom-ai",
            name: "Custom AI",
            description: "Custom endpoint",
          }),
        };
      }
      if (url === "/backend/v3/api/ai/models" && method === "POST") {
        return {
          item: adminModel({
            id: "model-3",
            vendorId: "vendor-3",
            vendorCode: "custom-ai",
            model: "custom/model-v1",
            displayName: "Custom model v1",
            type: "Embedding",
            regionPrices: [modelRegionPrice("0.01", "0.02")],
            calls: "0",
            contextTokens: 32000,
            modalities: ["embedding"],
            inputModalities: ["text"],
            outputModalities: ["embedding"],
            apiFormat: "openai_compatible",
            supportsStreaming: false,
            supportsTools: false,
            supportsJsonSchema: false,
          }),
        };
      }
      if (url === "/backend/v3/api/ai/models/model-3" && method === "PATCH") {
        return {
          item: adminModel({
            id: "model-3",
            vendorId: "vendor-3",
            vendorCode: "custom-ai",
            model: "custom/model-v2",
            type: "Embedding",
            regionPrices: [modelRegionPrice("0.03", "0.04")],
            calls: "0",
            contextTokens: 64000,
            modalities: ["embedding"],
            inputModalities: ["text"],
            outputModalities: ["embedding"],
            apiFormat: "openai_compatible",
            supportsStreaming: false,
            supportsTools: false,
            supportsJsonSchema: false,
          }),
        };
      }
      if (url === "/backend/v3/api/ai/models/model-3" && method === "DELETE") {
        return { deleted: true };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const vendors = await ModelService.fetchVendors();
      const models = await ModelService.fetchModels();
      const synced = await ModelService.syncVendorsAndModels();
      const vendor = await ModelService.addVendor({
        name: " Custom AI ",
        status: "active",
        color: "bg-indigo-500",
        description: " Custom endpoint ",
      });
      const model = await ModelService.addModel({
        vendorId: "vendor-3",
        model: "custom/model-v1",
        displayName: "Custom model v1",
        type: "Embedding",
        regionPrices: [modelRegionPrice("0.01", "0.02")],
        contextTokens: "32k",
      });
      const updated = await ModelService.updateModel("model-3", {
        vendorId: "vendor-3",
        model: "custom/model-v2",
        type: "Embedding",
        currentType: "Embedding",
        regionPrices: [modelRegionPrice("0.03", "0.04")],
        contextTokens: "64k",
      });
      const deleted = await ModelService.deleteModel("model-3");

      assert.equal(vendors[0].status, "inactive");
      assert.equal(models[0].type, "Image");
      assert.equal(models[0].contextTokens, 128000);
      assert.equal(models[0].calls, "1.2M");
      assert.deepEqual(models[0].inputModalities, ["text", "image"]);
      assert.equal(synced.synced, true);
      assert.equal(synced.source, "sdkwork_models");
      assert.equal(synced.mode, "official_refresh");
      assert.equal(synced.dryRun, false);
      assert.equal(synced.catalogVersion, "2026.05.08.1");
      assert.equal(synced.requestedCatalogVersion, "2026.05.08.1");
      assert.equal(synced.catalogRoot, null);
      assert.deepEqual(synced.vendorCodes, ["anthropic"]);
      assert.equal(synced.models[0].model, "claude-3-5-sonnet");
      assert.equal(synced.models[0].displayName, "Claude 3.5 Sonnet");
      assert.equal(
        synced.sourceHash,
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      );
      assert.equal(synced.meterCount, 20);
      assert.equal(synced.vendorCount, 1);
      assert.equal(synced.familyCount, 1);
      assert.equal(synced.modelCount, 1);
      assert.equal(synced.capabilityCount, 1);
      assert.equal(synced.priceCount, 3);
      assert.equal(synced.rankingCount, 1);
      assert.equal(synced.acceptedCount, 28);
      assert.equal(synced.snapshotId, "snapshot-1");
      assert.equal(synced.syncRunId, "sync-run-1");
      assert.equal(synced.vendors[0].name, "Anthropic");
      assert.equal(synced.models[0].contextTokens, 200000);
      assert.equal(vendor.id, "vendor-3");
      assert.equal(model.type, "Embedding");
      assert.equal(model.model, "custom/model-v1");
      assert.equal(model.displayName, "Custom model v1");
      assert.equal(updated.model, "custom/model-v2");
      assert.equal(updated.displayName, "custom/model-v2");
      assert.equal(updated.name, "custom/model-v2");
      assert.equal(deleted, true);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/model_vendors",
          "GET /backend/v3/api/ai/models",
          "GET /backend/v3/api/ai/model_rankings?page_size=200",
          "POST /backend/v3/api/ai/models/refresh",
          "POST /backend/v3/api/ai/model_vendors",
          "POST /backend/v3/api/ai/models",
          "PATCH /backend/v3/api/ai/models/model-3",
          "DELETE /backend/v3/api/ai/models/model-3",
        ],
      );
      assert.deepEqual(JSON.parse(captured[4].body), {
        name: "Custom AI",
        status: "active",
        color: "bg-indigo-500",
        description: "Custom endpoint",
      });
      assert.deepEqual(JSON.parse(captured[5].body), {
        vendorId: "vendor-3",
        model: "custom/model-v1",
        displayName: "Custom model v1",
        type: "Embedding",
        regionPrices: [
          {
            regionCode: "global",
            currency: "USD",
            priceIn: "0.01",
            priceOut: "0.02",
          },
        ],
        contextTokens: "32k",
        modalities: ["embedding"],
        inputModalities: ["text"],
        outputModalities: ["embedding"],
        apiFormat: "openai_compatible",
        supportsStreaming: false,
        supportsTools: false,
        supportsJsonSchema: false,
        releaseStage: "1",
        shelfState: "1",
        routingState: "1",
      });
      assert.deepEqual(JSON.parse(captured[6].body), {
        vendorId: "vendor-3",
        model: "custom/model-v2",
        regionPrices: [
          {
            regionCode: "global",
            currency: "USD",
            priceIn: "0.03",
            priceOut: "0.04",
          },
        ],
        contextTokens: "64k",
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin model service does not own AI channel resource operations", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts"),
    "utf8",
  );
  const indexSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /fetchAiResources/);
  assert.doesNotMatch(source, /AdminAiResourceItem/);
  assert.doesNotMatch(indexSource, /AiResource/);
});

test("admin model service initializes empty catalog through generated backend SDK refresh", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/model_vendors" && method === "GET") {
        return { items: [] };
      }
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return { items: [] };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      if (url === "/backend/v3/api/ai/models/refresh" && method === "POST") {
        return {
          synced: true,
          source: "sdkwork_models",
          mode: "official_refresh",
          dryRun: false,
          catalogVersion: "2026.05.08.1",
          requestedCatalogVersion: null,
          catalogRoot: null,
          vendorCodes: ["openai"],
          sourceHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          meterCount: 20,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 2,
          rankingCount: 1,
          acceptedCount: 27,
          snapshotId: "snapshot-empty-init",
          syncRunId: "sync-empty-init",
          vendors: [
            adminVendor({
              id: "vendor-openai",
              vendorCode: "openai",
              name: "OpenAI",
              color: "bg-indigo-500",
              description: "Official OpenAI model vendor",
            }),
          ],
          models: [
            adminModel({
              id: "model-openai-gpt-4o-mini",
              vendorId: "vendor-openai",
              vendorCode: "openai",
              model: "gpt-4o-mini",
            }),
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const catalog = await ModelService.fetchInitializedCatalog();

      assert.equal(catalog.initialized, true);
      assert.equal(catalog.vendors[0].id, "vendor-openai");
      assert.equal(catalog.vendors[0].name, "OpenAI");
      assert.equal(catalog.models[0].vendorId, "vendor-openai");
      assert.equal(catalog.models[0].name, "gpt-4o-mini");
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/model_vendors",
          "GET /backend/v3/api/ai/models",
          "GET /backend/v3/api/ai/model_rankings?page_size=200",
          "POST /backend/v3/api/ai/models/refresh",
        ],
      );
      assert.deepEqual(JSON.parse(captured[3].body), {
        source: "sdkwork_models",
        mode: "official_refresh",
        force: true,
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin model service keeps initialized catalog rows when returned models have no regional prices", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/model_vendors" && method === "GET") {
        return {
          items: [
            adminVendor({
              id: "vendor-openai",
              vendorCode: "openai",
              name: "OpenAI",
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              id: "model-openai-gpt-image",
              vendorId: "vendor-openai",
              vendorCode: "openai",
              model: "gpt-image-1.5",
              type: "Image",
              modalities: ["image"],
              inputModalities: ["text", "image"],
              outputModalities: ["image"],
              regionPrices: [],
            }),
            adminModel({
              id: "model-openai-gpt-4o-mini",
              vendorId: "vendor-openai",
              vendorCode: "openai",
              model: "gpt-4o-mini",
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const catalog = await ModelService.fetchInitializedCatalog();

      assert.equal(catalog.initialized, false);
      assert.equal(catalog.vendors.length, 1);
      assert.equal(catalog.vendors[0].name, "OpenAI");
      assert.equal(catalog.models.length, 2);
      assert.equal(catalog.models[0].model, "gpt-image-1.5");
      assert.deepEqual(catalog.models[0].regionPrices, []);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/model_vendors",
          "GET /backend/v3/api/ai/models",
          "GET /backend/v3/api/ai/model_rankings?page_size=200",
        ],
      );
    },
  );
});

test("admin model service reads model ranking refresh status through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_rankings/status" && (init?.method ?? "GET") === "GET") {
        return {
          status: "ready",
          tenantId: "9007199254740993",
          organizationId: "9007199254740995",
          rankScope: "commercial-default",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-07T00:00:00Z",
          windowEnd: "2026-05-08T00:00:00Z",
          generatedAt: "2026-05-08T00:05:00Z",
          refreshIntervalSeconds: "3600",
          nextRefreshAt: "2026-05-08T01:05:00Z",
          cacheMaxAgeSeconds: "60",
          generatedCount: "2",
          sourceCount: "10",
          sourceTables: ["ai_usage_fact", "ai_model", "ai_model_rank_snapshot"],
          latestJob: {
            id: "job-failed",
            jobName: "model_ranking_refresh",
            status: "failed",
            tenantId: "9007199254740993",
            organizationId: "9007199254740995",
            rankScope: "commercial-default",
            snapshotDate: "2026-05-08",
            snapshotPeriod: "daily",
            windowStart: "2026-05-08T00:00:00Z",
            windowEnd: "2026-05-09T00:00:00Z",
            startedAt: "2026-05-08T01:00:00Z",
            endedAt: "2026-05-08T01:00:01Z",
            durationMs: "1000",
            generatedCount: "0",
            sourceCount: "0",
            successCount: "0",
            failureCount: "1",
            nextRefreshAt: "2026-05-08T02:00:00Z",
            failureReason: "usage aggregate failed",
          },
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      const status = await ModelService.fetchModelRankingRefreshStatus();

      assert.equal(status.status, "ready");
      assert.equal(status.tenantId, "9007199254740993");
      assert.equal(status.organizationId, "9007199254740995");
      assert.equal(status.rankScope, "commercial-default");
      assert.equal(status.snapshotDate, "2026-05-08");
      assert.equal(status.generatedCount, 2);
      assert.equal(status.sourceCount, 10);
      assert.deepEqual(status.sourceTables, ["ai_usage_fact", "ai_model", "ai_model_rank_snapshot"]);
      assert.equal(status.latestJob?.id, "job-failed");
      assert.equal(status.latestJob?.status, "failed");
      assert.equal(status.latestJob?.failureReason, "usage aggregate failed");
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /backend/v3/api/ai/model_rankings/status"],
      );
    },
  );
});

test("admin model ranking refresh status rejects fractional counters", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_rankings/status" && (init?.method ?? "GET") === "GET") {
        return {
          status: "ready",
          tenantId: "9007199254740993",
          organizationId: "9007199254740995",
          rankScope: "commercial-default",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-01T00:00:00.000Z",
          windowEnd: "2026-05-08T00:00:00.000Z",
          generatedAt: "2026-05-08T08:00:00.000Z",
          refreshIntervalSeconds: "3600",
          nextRefreshAt: "2026-05-08T09:00:00.000Z",
          cacheMaxAgeSeconds: "60",
          generatedCount: "2.5",
          sourceCount: "10",
          sourceTables: ["ai_usage_fact", "ai_model_rank_snapshot"],
          latestJob: null,
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModelRankingRefreshStatus(),
        /Model ranking refresh status generated count must be a non-negative integer/,
      );
    },
  );
});

test("admin model service reads model ranking refresh job history through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_rankings/jobs?page_size=20" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "job-failed",
              jobName: "model_ranking_refresh",
              status: "failed",
              tenantId: "9007199254740993",
              organizationId: "9007199254740995",
              rankScope: "commercial-default",
              snapshotDate: "2026-05-08",
              snapshotPeriod: "daily",
              windowStart: "2026-05-07T00:00:00Z",
              windowEnd: "2026-05-08T00:00:00Z",
              startedAt: "2026-05-08T01:00:00Z",
              endedAt: "2026-05-08T01:00:01Z",
              durationMs: "1000",
              generatedCount: "0",
              sourceCount: "0",
              successCount: "0",
              failureCount: "1",
              nextRefreshAt: "2026-05-08T02:00:00Z",
              failureReason: "usage aggregate failed",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      const page = await ModelService.fetchModelRankingRefreshJobs();

      assert.equal(page.items.length, 1);
      assert.equal(page.items[0].id, "job-failed");
      assert.equal(page.items[0].status, "failed");
      assert.equal(page.items[0].tenantId, "9007199254740993");
      assert.equal(page.items[0].organizationId, "9007199254740995");
      assert.equal(page.items[0].rankScope, "commercial-default");
      assert.equal(page.items[0].failureReason, "usage aggregate failed");
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /backend/v3/api/ai/model_rankings/jobs?page_size=20"],
      );
    },
  );
});

test("admin model service triggers model ranking refresh through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_rankings/refresh" && init?.method === "POST") {
        return {
          triggered: true,
          status: "succeeded",
          tenantId: "9007199254740993",
          organizationId: "9007199254740995",
          rankScope: "commercial-default",
          snapshotDate: "2026-05-08",
          snapshotPeriod: "daily",
          windowStart: "2026-05-07T00:00:00Z",
          windowEnd: "2026-05-08T00:00:00Z",
          generatedCount: "7",
          sourceCount: "9",
          refreshIntervalSeconds: "3600",
          cacheMaxAgeSeconds: "60",
          nextRefreshAt: "2026-05-08T01:00:00Z",
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      const result = await ModelService.triggerModelRankingRefresh();

      assert.equal(result.triggered, true);
      assert.equal(result.status, "succeeded");
      assert.equal(result.tenantId, "9007199254740993");
      assert.equal(result.organizationId, "9007199254740995");
      assert.equal(result.rankScope, "commercial-default");
      assert.equal(result.generatedCount, 7);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["POST /backend/v3/api/ai/model_rankings/refresh"],
      );
      assert.deepEqual(JSON.parse(captured[0].body), {
        rankScope: "commercial-default",
        snapshotPeriod: "daily",
        limit: "200",
        lookbackDays: "7",
        refreshIntervalSeconds: "3600",
        cacheMaxAgeSeconds: "60",
      });
      assert.equal(captured[0].headers["x-request-id"], undefined);
    },
  );
});

test("admin model ranking refresh diagnostics surface latest failed execution evidence", () => {
  const diagnostics = deriveModelRankingRefreshDiagnostics(
    {
      status: "ready",
      tenantId: "9007199254740993",
      organizationId: "9007199254740995",
      rankScope: "commercial-default",
      snapshotDate: "2026-05-08",
      snapshotPeriod: "daily",
      windowStart: "2026-05-07T00:00:00Z",
      windowEnd: "2026-05-08T00:00:00Z",
      generatedAt: "2026-05-08T00:05:00Z",
      refreshIntervalSeconds: 3600,
      nextRefreshAt: "2026-05-08T01:05:00Z",
      cacheMaxAgeSeconds: 60,
      generatedCount: 2,
      sourceCount: 10,
      sourceTables: ["ai_usage_fact", "ai_model", "ai_model_rank_snapshot"],
      latestJob: {
        id: "job-failed",
        jobName: "model_ranking_refresh",
        status: "failed",
        tenantId: "9007199254740993",
        organizationId: "9007199254740995",
        rankScope: "commercial-default",
        snapshotDate: "2026-05-08",
        snapshotPeriod: "daily",
        windowStart: "2026-05-07T00:00:00Z",
        windowEnd: "2026-05-08T00:00:00Z",
        startedAt: "2026-05-08T01:00:00Z",
        endedAt: "2026-05-08T01:00:01Z",
        durationMs: 1000,
        generatedCount: 0,
        sourceCount: 0,
        successCount: 0,
        failureCount: 1,
        nextRefreshAt: "2026-05-08T02:00:00Z",
        failureReason: "usage aggregate failed",
      },
    },
  );

  assert.equal(diagnostics.statusLabel, "Ready");
  assert.equal(diagnostics.healthTone, "critical");
  assert.equal(diagnostics.latestJob?.statusLabel, "Failed");
  assert.equal(diagnostics.latestJob?.failureReason, "usage aggregate failed");
  assert.equal(diagnostics.generatedSummary, "2 ranking rows / 10 source rows");
  assert.equal(diagnostics.refreshSchedule, "Every 1h; next 2026-05-08 01:05:00 UTC");
  assert.equal(diagnostics.windowLabel, "2026-05-07 00:00:00 UTC -> 2026-05-08 00:00:00 UTC");
});

test("admin model ranking refresh diagnostics remain useful without job history", () => {
  const diagnostics = deriveModelRankingRefreshDiagnostics(
    {
      status: "empty",
      tenantId: "9007199254740993",
      organizationId: "9007199254740995",
      rankScope: "commercial-default",
      snapshotDate: "",
      snapshotPeriod: "daily",
      windowStart: "",
      windowEnd: "",
      generatedAt: "",
      refreshIntervalSeconds: 900,
      nextRefreshAt: "",
      cacheMaxAgeSeconds: 60,
      generatedCount: 0,
      sourceCount: 0,
      sourceTables: ["ai_usage_fact"],
      latestJob: null,
    },
  );

  assert.equal(diagnostics.statusLabel, "Empty");
  assert.equal(diagnostics.healthTone, "warning");
  assert.equal(diagnostics.latestJob, null);
  assert.equal(diagnostics.generatedSummary, "0 ranking rows / 0 source rows");
  assert.equal(diagnostics.refreshSchedule, "Every 15m; next unavailable");
  assert.equal(diagnostics.windowLabel, "Window unavailable");
});

test("admin model list remains usable when model ranking enhancement fails", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel(),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        throw new Error("ranking store unavailable");
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const models = await ModelService.fetchModels();
      const capturedRequests = captured.map((request) => `${request.method} ${request.url}`);

      assert.equal(models.length, 1);
      assert.equal(models[0].name, "gpt-4o-mini");
      assert.equal(models[0].calls, "42");
      assert.equal(capturedRequests[0], "GET /backend/v3/api/ai/models");
      assert.equal(capturedRequests.length >= 2, true);
      assert.equal(
        capturedRequests.slice(1).every((request) => request === "GET /backend/v3/api/ai/model_rankings?page_size=200"),
        true,
      );
    },
  );
});

test("admin model ranking summary rejects fractional request counters", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return {
          items: [
            {
              id: "openai/gpt-4o-mini",
              rank: 1,
              prevRank: 1,
              name: "gpt-4o-mini",
              vendor: "OpenAI",
              vendorCode: "openai",
              modality: "LLM",
              baseVolume: "1200",
              requests: "1200.5",
              tokens: 456000,
              cost: 12.34,
              currency: "USD",
              costIndicator: 2,
              latency: 120,
              isNew: false,
              color: "#10b981",
              strengths: ["Fast"],
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModelRankings(),
        /Admin model ranking requests must be a non-negative integer/,
      );
    },
  );
});

test("admin model list keeps backend calls when ranking summary is malformed", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              apiFormat: "openai_compatible",
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return {
          items: [
            {
              id: "openai/gpt-4o-mini",
              rank: 1,
              prevRank: 1,
              name: "gpt-4o-mini",
              vendor: "OpenAI",
              vendorCode: "openai",
              modality: "LLM",
              baseVolume: "1200",
              requests: "1200.5",
              tokens: 456000,
              cost: 12.34,
              currency: "USD",
              costIndicator: 2,
              latency: 120,
              isNew: false,
              color: "#10b981",
              strengths: ["Fast"],
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const models = await ModelService.fetchModels();

      assert.equal(models[0].calls, "42");
    },
  );
});

test("admin model list preserves regional prices and rejects missing region price arrays", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              id: "model-regional",
              regionPrices: [
                {
                  regionCode: "cn",
                  currency: "CNY",
                  priceIn: "0.2000",
                  priceOut: "0.8000",
                  cacheReadPrice: "0.1000",
                  cacheWritePrice: "0.2000",
                },
                {
                  regionCode: "global",
                  currency: "USD",
                  priceIn: "0.1500",
                  priceOut: "0.6000",
                  cacheReadPrice: "0.0750",
                  cacheWritePrice: "0.1500",
                },
              ],
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const models = await ModelService.fetchModels();

      assert.deepEqual(models[0].regionPrices, [
        {
          regionCode: "cn",
          currency: "CNY",
          priceIn: "0.2000",
          priceOut: "0.8000",
          cacheReadPrice: "0.1000",
          cacheWritePrice: "0.2000",
        },
        {
          regionCode: "global",
          currency: "USD",
          priceIn: "0.1500",
          priceOut: "0.6000",
          cacheReadPrice: "0.0750",
          cacheWritePrice: "0.1500",
        },
      ]);
    },
  );

  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              id: "model-no-visible-price",
              regionPrices: [],
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const models = await ModelService.fetchModels();

      assert.equal(models.length, 1);
      assert.deepEqual(models[0].regionPrices, []);
    },
  );

  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              id: "model-flat",
              regionPrices: undefined,
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModels(),
        /Model region prices are required/,
      );
    },
  );
});

test("admin model list keeps catalog rows when one pricing side is not available", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            adminModel({
              name: "text-embedding-3-small",
              type: "Embedding",
              modalities: ["embedding"],
              inputModalities: ["text"],
              outputModalities: ["embedding"],
              regionPrices: [modelRegionPrice("0.1500", "")],
              supportsStreaming: false,
              supportsTools: false,
              supportsJsonSchema: false,
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && method === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const models = await ModelService.fetchModels();

      assert.equal(models.length, 1);
      assert.equal(models[0].name, "text-embedding-3-small");
      assert.deepEqual(models[0].regionPrices, [
        {
          regionCode: "global",
          currency: "USD",
          priceIn: "0.1500",
          priceOut: "",
          cacheReadPrice: "",
          cacheWritePrice: "",
        },
      ]);
    },
  );
});

test("admin model service rejects invalid commands before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for invalid model commands");
    },
    async (captured) => {
      await assert.rejects(
        () =>
          ModelService.addVendor({
            name: "",
            status: "active",
            color: "bg-indigo-500",
            description: "",
          }),
        /name is required/,
      );
      await assert.rejects(
        () =>
          ModelService.addModel({
            vendorId: "vendor-1",
            model: "gpt 4",
            type: "Chat",
            regionPrices: [modelRegionPrice("0.1", "0.2")],
            contextTokens: "8k",
          }),
        /model must use ASCII/,
      );
      await assert.rejects(
        () =>
          ModelService.addModel({
            vendorId: "vendor-1",
            model: "gpt-4o-mini",
            type: "Chat",
            regionPrices: [modelRegionPrice("0", "0.2")],
            contextTokens: "8k",
          }),
        /priceIn must be greater than zero/,
      );
      await assert.rejects(
        () =>
          ModelService.addModel({
            vendorId: "vendor-1",
            model: "gpt-4o-mini",
            type: "Vision" as never,
            regionPrices: [modelRegionPrice("0.1", "0.2")],
            contextTokens: "8k",
          }),
        /Unsupported model type: Vision/,
      );
      await assert.rejects(
        () =>
          ModelService.addModel({
            vendorId: "vendor-1",
            model: "gpt-4o-mini",
            type: "Chat",
            regionPrices: [modelRegionPrice("0.1", "0.2")],
            contextTokens: "",
          }),
        /contextTokens is required/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin model service rejects unsafe SDK path ids before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for unsafe model path ids");
    },
    async (captured) => {
      await assert.rejects(
        () => ModelService.deleteModel("model/3"),
        /modelId must be a safe path segment/,
      );
      await assert.rejects(
        () =>
          ModelService.updateModel("model/3", {
            vendorId: "vendor-1",
            name: "gpt-4o-mini",
            type: "Chat",
            currentType: "Chat",
            regionPrices: [modelRegionPrice("0.1", "0.2")],
            contextTokens: "8k",
          }),
        /modelId must be a safe path segment/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin model delete fails closed unless backend confirms deletion", async () => {
  for (const response of [{}, { deleted: false }]) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/models/model-3" && init?.method === "DELETE") {
          return response;
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => ModelService.deleteModel("model-3"),
          /Model delete confirmation is required/,
        );
      },
    );
  }
});

test("admin model vendor list fails closed when backend omits stable vendor ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_vendors" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminVendor({
              id: undefined,
              name: "Missing Id Vendor",
              description: "Invalid contract",
            }),
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchVendors(),
        /Vendor id is required/,
      );
    },
  );
});

test("admin model vendor list fails closed when backend returns malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_vendors" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminVendor(),
            "malformed-vendor-row",
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchVendors(),
        /Vendor record is required/,
      );
    },
  );
});

test("admin model vendor list fails closed when backend omits required vendor fields", async () => {
  const cases: Array<[string, RegExp]> = [
    ["vendorCode", /Vendor code is required/],
    ["name", /Vendor name is required/],
    ["status", /Vendor status is required/],
    ["color", /Vendor color is required/],
    ["description", /Vendor description is required/],
  ];

  for (const [field, error] of cases) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/model_vendors" && (init?.method ?? "GET") === "GET") {
          return {
            items: [
              adminVendor({
                [field]: undefined,
              }),
            ],
          };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => ModelService.fetchVendors(),
          error,
        );
      },
    );
  }
});

test("admin model vendor list fails closed when backend returns unsupported vendor status", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/model_vendors" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminVendor({
              status: "archived",
            }),
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchVendors(),
        /Unsupported vendor status: archived/,
      );
    },
  );
});

test("admin model list fails closed when backend omits stable model ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminModel({
              id: undefined,
            }),
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModels(),
        /Model id is required/,
      );
    },
  );
});

test("admin model list fails closed when backend returns malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminModel(),
            "malformed-model-row",
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModels(),
        /Model record is required/,
      );
    },
  );
});

test("admin model list fails closed when backend returns unsupported model types", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminModel({
              type: "Vision",
            }),
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModels(),
        /Unsupported model type: Vision/,
      );
    },
  );
});

test("admin model list fails closed when backend omits required model fields", async () => {
  const cases: Array<[string, RegExp]> = [
    ["vendorCode", /Model vendor code is required/],
    ["model", /Model model is required/],
    ["status", /Model status is required/],
    ["calls", /Model calls are required/],
    ["description", /Model description field is required/],
    ["modalities", /Model modalities are required/],
    ["inputModalities", /Model input modalities are required/],
    ["outputModalities", /Model output modalities are required/],
    ["apiFormat", /Model API format field is required/],
    ["capabilityIntro", /Model capability intro field is required/],
    ["limitations", /Model limitations are required/],
    ["supportedLanguages", /Model supported languages are required/],
    ["useCases", /Model use cases are required/],
    ["trainingDataCutoff", /Model training data cutoff field is required/],
    ["contextTokens", /Model context tokens field is required/],
    ["maxOutputTokens", /Model max output tokens field is required/],
    ["supportsStreaming", /Model streaming support flag is required/],
    ["supportsTools", /Model tools support flag is required/],
    ["supportsJsonSchema", /Model JSON schema support flag is required/],
    ["releaseStage", /Model release stage field is required/],
    ["shelfState", /Model shelf state field is required/],
    ["routingState", /Model routing state field is required/],
    ["replacementModel", /Model replacement model field is required/],
  ];

  for (const [field, error] of cases) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
          return {
            items: [
              adminModel({
                [field]: undefined,
              }),
            ],
          };
        }
        if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && (init?.method ?? "GET") === "GET") {
          return { items: [] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => ModelService.fetchModels(),
          error,
        );
      },
    );
  }
});

test("admin model list fails closed when backend returns unsupported model status", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            adminModel({
              status: "archived",
            }),
          ],
        };
      }
      if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && (init?.method ?? "GET") === "GET") {
        return { items: [] };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.fetchModels(),
        /Unsupported model status: archived/,
      );
    },
  );
});

test("admin model list fails closed when backend returns malformed model field containers", async () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ["modalities", "text", /Model modalities are required/],
    ["inputModalities", "text", /Model input modalities are required/],
    ["outputModalities", "text", /Model output modalities are required/],
    ["limitations", "none", /Model limitations are required/],
    ["supportedLanguages", "en", /Model supported languages are required/],
    ["useCases", "chat", /Model use cases are required/],
    ["supportsStreaming", "true", /Model streaming support flag is required/],
    ["supportsTools", "true", /Model tools support flag is required/],
    ["supportsJsonSchema", "true", /Model JSON schema support flag is required/],
    ["contextTokens", 1.5, /Model context tokens must be a non-negative integer/],
    ["maxOutputTokens", -1, /Model max output tokens must be a non-negative integer/],
    ["releaseStage", "stable", /Model release stage must be a number or null/],
    ["shelfState", "listed", /Model shelf state must be a number or null/],
    ["routingState", "enabled", /Model routing state must be a number or null/],
  ];

  for (const [field, value, error] of cases) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/models" && (init?.method ?? "GET") === "GET") {
          return {
            items: [
              adminModel({
                [field]: value,
              }),
            ],
          };
        }
        if (url === "/backend/v3/api/ai/model_rankings?page_size=200" && (init?.method ?? "GET") === "GET") {
          return { items: [] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => ModelService.fetchModels(),
          error,
        );
      },
    );
  }
});

test("admin model catalog sync fails closed when backend returns malformed model rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models/refresh" && init?.method === "POST") {
        return {
          synced: true,
          source: "sdkwork_models",
          mode: "official_refresh",
          dryRun: false,
          catalogVersion: "2026.05.08.1",
          requestedCatalogVersion: null,
          catalogRoot: null,
          vendorCodes: ["openai"],
          sourceHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          meterCount: 20,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 3,
          rankingCount: 1,
          acceptedCount: 28,
          vendors: [
            adminVendor(),
          ],
          models: ["malformed-model-row"],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.syncVendorsAndModels(),
        /Model record is required/,
      );
    },
  );
});

test("admin model catalog sync fails closed when governance metadata is missing", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models/refresh" && init?.method === "POST") {
        return {
          synced: true,
          source: "sdkwork_models",
          dryRun: false,
          catalogVersion: "2026.05.08.1",
          vendorCodes: ["openai"],
          sourceHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          meterCount: 20,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 3,
          rankingCount: 1,
          acceptedCount: 28,
          vendors: [],
          models: [],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.syncVendorsAndModels(),
        /Model catalog sync response is missing mode/,
      );
    },
  );
});

test("admin model catalog sync rejects fractional fact counters", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/models/refresh" && init?.method === "POST") {
        return {
          synced: true,
          source: "sdkwork_models",
          mode: "official_refresh",
          dryRun: false,
          catalogVersion: "2026.05.08.1",
          requestedCatalogVersion: null,
          catalogRoot: null,
          vendorCodes: ["openai"],
          sourceHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          meterCount: 20.5,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 3,
          rankingCount: 1,
          acceptedCount: 28,
          vendors: [],
          models: [],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ModelService.syncVendorsAndModels(),
        /Model catalog sync response meter count must be a non-negative integer/,
      );
    },
  );
});

test("admin model table fills the available admin viewport", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  for (const expected of [
    "AdminTableShell",
    "data-admin-model-table-card",
    "data-admin-model-table-viewport",
    "flex min-h-0 flex-1 flex-col",
    "className=\"flex-1 min-h-0 dark:bg-[#1a1a1a]\"",
    "viewportClassName=\"min-h-0 flex-1\"",
    "sticky top-0 z-10",
  ]) {
    assert.ok(source.includes(expected), `missing adaptive admin model table marker: ${expected}`);
  }
});

test("admin model right pane stays as a paginated table list", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  for (const expected of [
    "BottomPagination",
    "data-admin-model-pagination",
    "const [page, setPage] = useState(1)",
    "const [pageSize, setPageSize] = useState(20)",
    "const paginatedVendorModels = vendorModels.slice",
    "paginatedVendorModels.map",
    "footer={(",
  ]) {
    assert.ok(source.includes(expected), `missing model table pagination marker: ${expected}`);
  }

  assert.match(source, /itemCount=\{paginatedVendorModels\.length\}/);
  assert.match(source, /onPageSizeChange=\{\(nextPageSize\) => \{/);
  assert.doesNotMatch(source, /renderRankingRefreshDiagnostics\(\)/);
  assert.doesNotMatch(source, /w-14 h-14 rounded-xl \$\{selectedVendor\.color\}/);
});

test("admin model table supports multi-select modality filtering before pagination", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  for (const expected of [
    "type ModelModalityFilter = Model['type']",
    "const modelModalityFilterOptions",
    "const [modalityFilters, setModalityFilters] = useState<ModelModalityFilter[]>([])",
    "modalityFilters.includes(m.type)",
    "[selectedVendorId, search, modalityFilters]",
    "data-admin-model-modality-filter",
    "data-admin-model-modality-filter-option",
    "data-admin-model-modality-filter-clear",
    "toggleModalityFilter(option.value)",
    "setModalityFilters([])",
    "admin.model.filters.allModalities",
    "admin.model.filters.modality",
  ]) {
    assert.ok(source.includes(expected), `missing model modality filter marker: ${expected}`);
  }

  for (const optionValue of ["Chat", "Image", "Video", "Audio", "SoundEffect", "Music", "Embedding"]) {
    assert.match(source, new RegExp(`value: '${optionValue}'`));
  }
});

test("admin model editor supports cache read and write prices", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );
  const serviceSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts"),
    "utf8",
  );
  const formSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelForm.ts"),
    "utf8",
  );

  for (const expected of [
  ]) {
    assert.ok(serviceSource.includes(expected), `missing service cache price marker: ${expected}`);
  }

  for (const expected of [
    "cacheReadPrice: readOptionalDecimalText(formData.get(`cacheReadPrice.${regionCode}`))",
    "cacheWritePrice: readOptionalDecimalText(formData.get(`cacheWritePrice.${regionCode}`))",
  ]) {
    assert.ok(formSource.includes(expected), `missing form cache price marker: ${expected}`);
  }

  for (const expected of [
    "admin.model.pricing.cacheRead",
    "admin.model.pricing.cacheWrite",
    "admin.model.modelModal.cacheReadUnitPrice",
    "admin.model.modelModal.cacheWriteUnitPrice",
    "name={`cacheReadPrice.${region.code}`}",
    "name={`cacheWritePrice.${region.code}`}",
    "defaultValue={regionPrice?.cacheReadPrice ?? ''}",
    "defaultValue={regionPrice?.cacheWritePrice ?? ''}",
    "const priceRows = [",
    "value: selectedPriceRegion?.cacheReadPrice",
    "value: selectedPriceRegion?.cacheWritePrice",
    "const selectedPriceCurrency = selectedPriceRegion?.currency ?? 'USD'",
    "formatPrice(row.value ?? '', selectedPriceCurrency)",
  ]) {
    assert.ok(source.includes(expected), `missing editor cache price marker: ${expected}`);
  }
  assert.equal(source.includes("formatPrice(row.value ?? '')"), false, "price popover must pass region currency into formatPrice");
});

test("admin model editor uses six-decimal pricing precision", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  const sixDecimalPriceInputs = source.match(/step="0\.000001"/g) ?? [];
  assert.equal(sixDecimalPriceInputs.length, 4);
  assert.doesNotMatch(source, /step="0\.0001"/);
});

test("admin model modality filter closes when clicking outside", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  for (const expected of [
    "const modalityFilterRef = useRef<HTMLDivElement | null>(null)",
    "if (!isModalityFilterOpen) {",
    "const handlePointerDown = (event: PointerEvent) => {",
    "modalityFilterRef.current.contains(target)",
    "setIsModalityFilterOpen(false)",
    "document.addEventListener('pointerdown', handlePointerDown)",
    "document.removeEventListener('pointerdown', handlePointerDown)",
    "ref={modalityFilterRef}",
  ]) {
    assert.ok(source.includes(expected), `missing outside-click modality filter marker: ${expected}`);
  }
});

test("admin model catalog sync action lives in the vendor sidebar header", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );

  const sidebarStart = source.indexOf('{/* SIDEBAR - VENDORS */}');
  const mainAreaStart = source.indexOf('{/* MAIN AREA - MODELS LIST */}');
  assert.notEqual(sidebarStart, -1, "vendor sidebar marker must exist");
  assert.notEqual(mainAreaStart, -1, "main area marker must exist");

  const syncActionIndex = source.indexOf("t('common.actions.syncModelCatalog')");
  const syncHandlerIndex = source.indexOf("onClick={handleSyncAll}");
  const addVendorHandlerIndex = source.indexOf("onClick={openVendorModal}");
  assert.ok(syncActionIndex > sidebarStart, "sync catalog action must be inside vendor sidebar");
  assert.ok(syncActionIndex < mainAreaStart, "sync catalog action must stay out of the model table header");
  assert.ok(syncHandlerIndex > sidebarStart, "sync catalog handler must be wired in vendor sidebar");
  assert.ok(syncHandlerIndex < mainAreaStart, "sync catalog handler must stay out of the page-level header");
  assert.ok(syncHandlerIndex < addVendorHandlerIndex, "sync icon button must sit to the left of the add vendor button");

  const vendorHeader = source.slice(sidebarStart, mainAreaStart);
  assert.match(vendorHeader, /<RefreshCw className="[^"]*\bw-4\b[^"]*\bh-4\b[^"]*"/);
  assert.match(vendorHeader, /title=\{isSyncing \? t\('common\.actions\.syncingCatalog'\) : t\('common\.actions\.syncModelCatalog'\)\}/);
  assert.doesNotMatch(vendorHeader, /className="[^"]*\bw-full\b[^"]*"/);
  assert.doesNotMatch(vendorHeader, /<span className="truncate">\{isSyncing \? t\('common\.actions\.syncingCatalog'\) : t\('common\.actions\.syncModelCatalog'\)\}<\/span>/);

  const contentBeforeSidebar = source.slice(source.indexOf('return ('), sidebarStart);
  assert.doesNotMatch(contentBeforeSidebar, /onClick=\{handleSyncAll\}/);
  assert.doesNotMatch(contentBeforeSidebar, /common\.actions\.syncModelCatalog/);
});

test("admin model resource management is registered as a model management menu route", () => {
  const appSource = readFileSync(resolve(PORTAL_ROOT, "src/App.tsx"), "utf8");
  const registrySource = readFileSync(resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts"), "utf8");
  const packageSource = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/index.tsx"),
    "utf8",
  );
  const navSource = readFileSync(
    resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts"),
    "utf8",
  );

  assert.match(appSource, /const ResourceAdmin = lazyRoute\(\(\) => import\('@sdkwork\/models-pc-admin-resource'\), 'ResourceAdmin'\)/);
  assert.match(appSource, /<Route path="model\/resources" element=\{<ResourceAdmin \/>\} \/>/);
  assert.match(registrySource, /path: '\/admin\/model\/resources'/);
  assert.match(registrySource, /labelKey: 'admin\.menu\.modelResources'/);
  assert.match(registrySource, /icon: Boxes/);
  assert.match(packageSource, /export function ModelAdmin/);
  assert.match(navSource, /"admin\.menu\.modelResources": "Resource Management"/);
  assert.match(navSource, /"admin\.menu\.modelResources": "资源管理"/);
});

test("admin model resource page exposes group CRUD and static all-api safeguards", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-resource/src/resourceAdmin.tsx"),
    "utf8",
  );
  const i18nSource = readFileSync(
    resolve(PORTAL_ROOT, "packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/model.ts"),
    "utf8",
  );

  for (const expected of [
    "data-admin-model-resource-page",
    "ResourceGroupService.fetchResourceGroups()",
    "ResourceGroupService.fetchResourceGroupResources(selectedGroup.groupCode)",
    "ResourceGroupService.fetchResourceGroupResources('api.all')",
    "ResourceGroupService.createResourceGroup(input as ResourceGroupCreateInput)",
    "ResourceGroupService.updateResourceGroup(form.id, input)",
    "ResourceGroupService.deleteResourceGroup(deleteTarget.id)",
    "disabled={selectedGroup.dynamic || selectedGroup.groupCode === 'api.all'}",
    "disabled={form.groupCode === 'api.all'}",
    "selectionMode: form.groupCode === 'api.all' ? 'all' : 'manual'",
    "data-admin-model-resource-sidebar",
    "data-admin-model-resource-sidebar-header",
    "data-admin-model-resource-sidebar-list",
    "data-admin-model-resource-main",
    "data-admin-model-resource-main-panel",
    "data-admin-model-resource-table-scroll",
    "data-admin-model-resource-pagination",
    "data-admin-model-resource-group-drawer",
    "data-admin-model-resource-group-drawer-basic",
    "data-admin-model-resource-group-drawer-resources",
    "data-admin-model-resource-group-form-resource-table",
    "BottomPagination",
    "resourcePage",
    "resourcePageSize",
    "paginatedResources",
    "setResourcePage(1)",
    "AiResourceSelectorModal",
    "selectionMode=\"multiple\"",
    "selectedCodes={form.memberCodes}",
    "setResourceSelectorOpen(true)",
    "setForm({ ...form, memberCodes: codes })",
    "w-[80vw] max-w-[80vw]",
    "flex min-h-0 h-full w-full flex-col bg-slate-50 dark:bg-[#121212] rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/5",
    "setSelectedGroupCode(nextGroups.find(group => group.groupCode === 'api.all')?.groupCode",
  ]) {
    assert.ok(source.includes(expected), `missing resource management marker: ${expected}`);
  }

  assert.doesNotMatch(source, /<header className=/);
  assert.doesNotMatch(source, /t\('admin\.model\.resources\.subtitle'\)/);
  assert.doesNotMatch(source, /items-center justify-center bg-slate-950\/50 p-4/);
  assert.doesNotMatch(source, /value=\{form\.members\}/);
  assert.doesNotMatch(source, /rows=\{8\}/);
  assert.match(source, /className="flex min-h-0 h-full w-full flex-col[\s\S]*overflow-hidden/);
  assert.match(source, /data-admin-model-resource-sidebar-list[\s\S]*className="min-h-0 flex-1 overflow-y-auto/);
  assert.match(source, /data-admin-model-resource-main-panel[\s\S]*className="flex min-h-0 flex-1 flex-col overflow-hidden/);
  assert.match(source, /data-admin-model-resource-table-scroll[\s\S]*className="min-h-0 flex-1 overflow-auto/);
  assert.match(source, /data-admin-model-resource-pagination[\s\S]*<BottomPagination/);
  assert.match(source, /itemCount=\{paginatedResources\.length\}/);
  assert.match(source, /hasNextPage=\{resourcePage \* resourcePageSize < filteredResources\.length\}/);
  assert.match(source, /onPreviousPage=\{\(\) => setResourcePage\(\(current\) => Math\.max\(1, current - 1\)\)\}/);
  assert.match(source, /onNextPage=\{\(\) => setResourcePage\(\(current\) => current \+ 1\)\}/);
  assert.match(source, /onPageSizeChange=\{\(nextPageSize\) => \{/);
  assert.match(source, /setResourcePageSize\(nextPageSize\)/);
  assert.match(source, /filteredResources\.length === 0/);
  assert.match(source, /paginatedResources\.map\(\(resource\) =>/);
  assert.doesNotMatch(source, /filteredResources\.map\(resource =>/);
  const sidebarHeaderStart = source.indexOf("data-admin-model-resource-sidebar-header");
  const mainStart = source.indexOf("data-admin-model-resource-main");
  assert.notEqual(sidebarHeaderStart, -1, "resource group sidebar header marker must exist");
  assert.notEqual(mainStart, -1, "resource management main area marker must exist");
  assert.ok(sidebarHeaderStart < mainStart, "resource group sidebar header must be before main area");
  const sidebarHeader = source.slice(sidebarHeaderStart, mainStart);
  assert.match(sidebarHeader, /t\('admin\.model\.resources\.sidebarTitle'\)/);
  assert.match(sidebarHeader, /onClick=\{startCreate\}/);
  assert.match(sidebarHeader, /void loadGroups\(\);/);
  assert.match(sidebarHeader, /void loadAllResources\(\);/);
  assert.match(sidebarHeader, /<Plus className="[^"]*\b(?:w-4 h-4|h-4 w-4)\b[^"]*"/);
  assert.match(sidebarHeader, /<RefreshCw className="[^"]*\b(?:w-4 h-4|h-4 w-4)\b[^"]*"/);

  assert.match(source, /\{deleteTarget && \(\s*<ConfirmDialog/);
  assert.match(source, /isBusy=\{saving\}/);
  assert.doesNotMatch(source, /\bopen=\{deleteTarget !== null\}/);
  assert.doesNotMatch(source, /\bloading=\{saving\}/);

  for (const key of [
    "admin.model.resources.sidebarTitle",
    "admin.model.resources.actions.newGroup",
    "admin.model.resources.actions.edit",
    "admin.model.resources.actions.delete",
    "admin.model.resources.form.groupCode",
    "admin.model.resources.form.selectedResources",
    "admin.model.resources.form.selectResources",
    "admin.model.resources.form.emptySelectedResources",
    "admin.model.resources.form.removeResource",
    "admin.model.resources.form.resourceSelectorTitle",
    "admin.model.resources.dynamic",
    "admin.model.resources.deleteDialog.title",
    "admin.model.resources.deleteDialog.description",
  ]) {
    assert.match(source, new RegExp(`t\\('${escapeRegExp(key)}'`));
    const occurrences = i18nSource.match(new RegExp(`"${escapeRegExp(key)}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} in English and Chinese resources`);
  }
});

test("admin model resource group detail panel manages members with multi-select resource picker", () => {
  const source = readFileSync(
    resolve(PORTAL_ROOT, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-resource/src/resourceAdmin.tsx"),
    "utf8",
  );

  for (const expected of [
    "data-admin-model-resource-main-resource-actions",
    "data-admin-model-resource-add-resource",
    "data-admin-model-resource-table",
    "data-admin-model-resource-row-action",
    "resourceAssignmentSelectorOpen",
    "resourceAssignmentDraftCodes",
    "allResourceOptions",
    "resourceOptionsByCode",
    "setResourceAssignmentDraftCodes(resources.map(resource => resource.resourceCode))",
    "selectedCodes={resourceAssignmentDraftCodes}",
    "onClose={() => void saveResourceAssignmentDraft()}",
    "ResourceGroupService.updateResourceGroup(selectedGroup.id, {",
    "members: memberCodes.map((resourceCode, index) => ({",
    "disabled={!canManageSelectedGroupResources || loadingResources || saving}",
    "selectionMode=\"multiple\"",
    "t('admin.model.resources.actions.addResource')",
    "t('admin.model.resources.form.resourceSelectorTitle')",
  ]) {
    assert.ok(source.includes(expected), `missing resource group member management marker: ${expected}`);
  }
  assert.doesNotMatch(source, /options=\{assignableResources\}/);
  assert.doesNotMatch(source, /options=\{assignableResourceOptions\}/);
  assert.match(source, /options=\{allResourceOptions\}/);

  const mainTableStart = source.indexOf("data-admin-model-resource-table");
  const drawerTableStart = source.indexOf("data-admin-model-resource-group-form-resource-table");
  assert.notEqual(mainTableStart, -1, "resource detail table marker must exist");
  assert.notEqual(drawerTableStart, -1, "resource group form table marker must exist");
  const mainTableSource = source.slice(mainTableStart, drawerTableStart);
  assert.match(mainTableSource, /t\('admin\.model\.resources\.columns\.actions'\)/);
  assert.match(mainTableSource, /t\('admin\.model\.resources\.actions\.removeResource'\)/);
  assert.match(mainTableSource, /onClick=\{\(\) => void removeSelectedGroupResource\(resource\.resourceCode\)\}/);
});

test("admin model resource group service calls generated backend SDK resource group paths", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/resource_groups" && method === "GET") {
        return {
          items: [
            {
              id: "group-all",
              groupCode: "api.all",
              groupName: "全部API",
              groupType: "api_group",
              selectionMode: "all",
              description: "All seeded API resources",
              sortOrder: 1,
              status: "active",
              resourceCount: 2,
              dynamic: false,
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/resource_groups/api.all/resources" && method === "GET") {
        return {
          items: [
            {
              id: "resource-chat",
              resourceCode: "api.openai.chat_completions",
              resourceType: "api_endpoint",
              displayName: "OpenAI Chat API",
              vendorCode: "openai",
              modalityCode: "chat",
              apiEndpointCode: "openai.chat.completions",
              catalogKey: null,
              model: null,
              providerNativeModel: null,
              status: "active",
              sortOrder: 10,
              memberRole: "included",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/resources" && method === "GET") {
        return {
          items: [
            {
              id: "resource-assignable-chat",
              resourceCode: "api.openai.responses",
              resourceType: "api_endpoint",
              displayName: "OpenAI Responses API",
              vendorCode: "openai",
              modalityCode: "llm",
              apiEndpointCode: "openai.responses",
              catalogKey: "openai.responses",
              model: "gpt-5",
              providerNativeModel: "gpt-5",
              status: "active",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/resource_groups" && method === "POST") {
        assert.deepEqual(JSON.parse(String(init?.body)), {
          groupCode: "api.custom.chat",
          groupName: "Custom Chat",
          groupType: "api_group",
          selectionMode: "manual",
          description: "Custom endpoints",
          sortOrder: "22",
          status: "active",
          members: [
            {
              resourceCode: "api.openai.chat_completions",
              itemRole: "included",
              sortOrder: "1",
            },
          ],
        });
        return {
          item: {
            id: "group-custom-chat",
            groupCode: "api.custom.chat",
            groupName: "Custom Chat",
            groupType: "api_group",
            selectionMode: "manual",
            description: "Custom endpoints",
            sortOrder: 22,
            status: "active",
            resourceCount: 1,
            dynamic: false,
          },
        };
      }
      if (url === "/backend/v3/api/ai/resource_groups/group-custom-chat" && method === "PATCH") {
        assert.deepEqual(JSON.parse(String(init?.body)), {
          groupName: "Custom Chat Updated",
          members: [],
        });
        return {
          item: {
            id: "group-custom-chat",
            groupCode: "api.custom.chat",
            groupName: "Custom Chat Updated",
            groupType: "api_group",
            selectionMode: "manual",
            description: "Custom endpoints",
            sortOrder: 22,
            status: "active",
            resourceCount: 0,
            dynamic: false,
          },
        };
      }
      if (url === "/backend/v3/api/ai/resource_groups/group-custom-chat" && method === "DELETE") {
        return { deleted: true };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const groups = await ResourceGroupService.fetchResourceGroups();
      const resources = await ResourceGroupService.fetchResourceGroupResources("api.all");
      const assignableResources = await ResourceGroupService.fetchAssignableResources();
      const created = await ResourceGroupService.createResourceGroup({
        groupCode: "API.Custom.Chat",
        groupName: " Custom Chat ",
        groupType: "api_group",
        selectionMode: "manual",
        description: " Custom endpoints ",
        sortOrder: 22,
        status: "active",
        members: [
          {
            resourceCode: "API.OpenAI.Chat_Completions",
            itemRole: "included",
            sortOrder: 1,
          },
        ],
      });
      const updated = await ResourceGroupService.updateResourceGroup("group-custom-chat", {
        groupName: "Custom Chat Updated",
        members: [],
      });
      const deleted = await ResourceGroupService.deleteResourceGroup("group-custom-chat");

      assert.equal(groups.length, 1);
      assert.equal(groups[0].groupCode, "api.all");
      assert.equal(groups[0].selectionMode, "all");
      assert.equal(groups[0].dynamic, false);
      assert.equal(groups[0].resourceCount, 2);
      assert.equal(resources[0].resourceCode, "api.openai.chat_completions");
      assert.equal(resources[0].memberRole, "included");
      assert.deepEqual(assignableResources[0], {
        id: "resource-assignable-chat",
        resourceCode: "api.openai.responses",
        resourceType: "api_endpoint",
        displayName: "OpenAI Responses API",
        vendorCode: "openai",
        modalityCode: "llm",
        apiEndpointCode: "openai.responses",
        catalogKey: "openai.responses",
        model: "gpt-5",
        providerNativeModel: "gpt-5",
        status: "active",
      });
      assert.equal(created.groupCode, "api.custom.chat");
      assert.equal(created.dynamic, false);
      assert.equal(updated.groupName, "Custom Chat Updated");
      assert.equal(deleted, true);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/resource_groups",
          "GET /backend/v3/api/ai/resource_groups/api.all/resources",
          "GET /backend/v3/api/ai/resources",
          "POST /backend/v3/api/ai/resource_groups",
          "PATCH /backend/v3/api/ai/resource_groups/group-custom-chat",
          "DELETE /backend/v3/api/ai/resource_groups/group-custom-chat",
        ],
      );
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin model resource group service fails closed on malformed resource group payloads", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/resource_groups" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "group-bad",
              groupCode: "api.bad",
              groupName: "Bad",
              groupType: "provider_group",
              selectionMode: "manual",
              status: "active",
              resourceCount: 0,
              dynamic: false,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ResourceGroupService.fetchResourceGroups(),
        /Unsupported AI resource group type: provider_group/,
      );
    },
  );
});

test("admin API resource group seed defines supported API groups with static all-api semantics", () => {
  const seedPath = resolve(PORTAL_ROOT, "../../data/ai-routing/resource-groups/admin-api-groups.json");
  const manifestPath = resolve(PORTAL_ROOT, "../../data/ai-routing/install-manifest.json");
  const openaiResourcePath = resolve(PORTAL_ROOT, "../../data/ai-routing/resources/openai-resources.json");
  const vendorNativeResourcePath = resolve(PORTAL_ROOT, "../../data/ai-routing/resources/vendor-native-resources.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { items: Array<Record<string, unknown>> };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    sections: { resourceGroups: string[] };
  };
  const openaiResources = JSON.parse(readFileSync(openaiResourcePath, "utf8")) as { items: Array<Record<string, unknown>> };
  const vendorNativeResources = JSON.parse(readFileSync(vendorNativeResourcePath, "utf8")) as {
    items: Array<Record<string, unknown>>;
  };
  const expectedCodes = [
    "api.all",
    "api.openai_compatible.all",
    "api.openai.codex",
    "api.openai.chat",
    "api.openai.image",
    "api.openai.audio",
    "api.openai.embeddings",
    "api.claude.code",
    "api.gemini.chat",
    "api.claude.all",
    "api.google.all",
    "api.kling.all",
    "api.kling.image",
    "api.kling.video",
    "api.minimax.music",
    "api.volcengine.image",
    "api.volcengine.video",
    "api.vidu.image",
    "api.vidu.video",
    "api.google.image",
    "api.google.video",
  ];
  const endpointResourceCodes = [...openaiResources.items, ...vendorNativeResources.items]
    .filter((resource) => resource.resourceType === "api_endpoint")
    .map((resource) => resource.resourceCode);

  assert.ok(manifest.sections.resourceGroups.includes("admin-api-groups.json"));
  assert.deepEqual(seed.items.map((group) => group.groupCode), expectedCodes);
  assert.equal(new Set(seed.items.map((group) => group.groupCode)).size, expectedCodes.length);

  for (const group of seed.items) {
    assert.equal(group.groupType, "api_group", `groupType mismatch for ${group.groupCode}`);
    assert.ok(typeof group.sortOrder === "number", `sortOrder missing for ${group.groupCode}`);
  }

  const allApi = seed.items.find((group) => group.groupCode === "api.all");
  assert.ok(allApi, "api.all group must exist");
  assert.equal(allApi.selectionMode, "all");
  assert.deepEqual(
    (allApi.items as Array<Record<string, unknown>>).map((item) => item.resourceCode),
    endpointResourceCodes,
  );

  for (const group of seed.items) {
    assert.equal(group.selectionMode, "all", `all selection expected for ${group.groupCode}`);
    assert.ok(Array.isArray(group.items), `items must be an array for ${group.groupCode}`);
    assert.ok((group.items as unknown[]).length > 0, `explicit resources required for ${group.groupCode}`);
    for (const item of group.items as Array<Record<string, unknown>>) {
      assert.ok(
        endpointResourceCodes.includes(item.resourceCode),
        `resource ${String(item.resourceCode)} referenced by ${String(group.groupCode)} must exist`,
      );
    }
  }

  const groupItems = new Map(
    seed.items.map((group) => [
      group.groupCode,
      new Set((group.items as Array<Record<string, unknown>>).map((item) => item.resourceCode)),
    ]),
  );
  assert.ok(groupItems.get("api.minimax.music")?.has("api.minimax.music_generation"));
  assert.ok(groupItems.get("api.volcengine.image")?.has("api.jimeng.image_generation"));
  assert.ok(groupItems.get("api.volcengine.video")?.has("api.jimeng.video_generation"));
  assert.ok(groupItems.get("api.vidu.image")?.has("api.vidu.reference_to_image"));
  assert.ok(groupItems.get("api.vidu.video")?.has("api.vidu.start_end_to_video"));
});
