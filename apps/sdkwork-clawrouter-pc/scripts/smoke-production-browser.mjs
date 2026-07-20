#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUEST_TIMEOUT_MS = 2_000;
const CDP_TIMEOUT_MS = 7_500;
const PORT_SEARCH_START = 3_400;
const PORT_SEARCH_LIMIT = 100;
const CHROME_DEBUG_PORT_SEARCH_START = 9_220;
const ROUTE_RENDER_TIMEOUT_MS = 10_000;
const EDGE_SERVER_STARTUP_TIMEOUT_MS = parsePositiveIntegerEnv("CLAWROUTER_EDGE_STARTUP_TIMEOUT_MS", 900_000);
const PROCESS_OUTPUT_TAIL_MAX_CHARS = 12_000;
const PROCESS_SHUTDOWN_TIMEOUT_MS = 5_000;
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = path.join(portalRoot, "dist", "index.html");
const workspaceRoot = path.resolve(portalRoot, "..", "..");

const WINDOWS_CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const LINUX_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
];

const MACOS_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

function mediaResource(url, kind = "image") {
  return {
    kind,
    source: url.startsWith("data:") ? "data_url" : "external_url",
    url,
    publicUrl: url,
  };
}

const TRANSPARENT_PIXEL_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const TRANSPARENT_IMAGE_RESOURCE = mediaResource(TRANSPARENT_PIXEL_DATA_URL, "image");
const APP_SDK_FIXTURE_MODE = "app-sdk-success";
const APP_SDK_MODEL_FIXTURE_MODE = "app-sdk-model-success";
const APP_SDK_MODEL_EMPTY_FIXTURE_MODE = "app-sdk-model-empty";
const API_PLAYGROUND_FIXTURE_MODE = "api-playground-success";
const API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE = "api-playground-primitive";
const API_PLAYGROUND_AUTH_FIXTURE_MODE = "api-playground-auth";
const API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE = "api-playground-network-failure";
const API_PLAYGROUND_EXPECTED_API_KEY = "browser-smoke-api-key";
const APP_SDK_PORTAL_SESSION_FIXTURE_MODE = "app-sdk-portal-session";
const BACKEND_SDK_PORTAL_SESSION_FIXTURE_MODE = "backend-sdk-portal-session";
const APP_SESSION_STORAGE_KEY = "sdkwork.clawRouter.appSession.v1";
const BROWSER_SMOKE_SESSION = {
  accessToken: "browser-smoke-access-token",
  authToken: "browser-smoke-auth-token",
  expiresAt: 4_102_444_800,
  refreshToken: "browser-smoke-refresh-token",
  sessionId: "browser-smoke-session",
  storedAt: 1_778_716_800,
  context: {
    tenantId: "100001",
    userId: "30",
    sessionId: "browser-smoke-session",
  },
};
const BROWSER_SMOKE_STORED_SESSION = {
  ...BROWSER_SMOKE_SESSION,
};

const PRIVATE_PRICING_TOKENS = [
  "lowestUpstreamCostUnitPrice",
  "upstreamCost",
  "providerCost",
  "channelCost",
  "costPrice",
  "customerUnitPrice",
  "grossMarginPerUnit",
  "pricingPlanCode",
  "groupCode",
];

const API_REFERENCE_ROUTE_BUNDLE_FORBIDDEN_TOKENS = [
  "Math.random",
  "toLocaleDateString",
];

const BROWSER_SMOKE_MODEL_RECORDS = [
  {
    model: "gpt-5.5-pro",
    catalogKey: "openai/gpt-5.5-pro",
    displayName: "GPT-5.5 Pro",
    vendorCode: "openai",
    vendor: "OpenAI",
    capabilities: ["chat", "tools", "json schema", "vision"],
    groups: ["default", "enterprise"],
    categories: ["Recommended", "Proprietary", "New"],
    description: "OpenAI GPT-5.5 Pro frontier model for maximum reasoning depth, coding, and agentic workloads.",
    modalities: ["text"],
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    apiFormat: "openai_responses",
    capabilityIntro: "OpenAI GPT-5.5 Pro is tuned for maximum reasoning depth, coding, and agentic workflows.",
    limitations: ["Use trusted evaluation for business-critical automation."],
    supportedLanguages: ["English", "Chinese"],
    useCases: ["Complex reasoning", "Coding agents", "Long-context analysis"],
    trainingDataCutoff: "2026-05",
    contextTokens: 1050000,
    maxOutputTokens: 128000,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    providerCodes: ["openai"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "15.000000", currency: "USD" },
      { regionCode: "global", billingMeter: "llm_output_token", unitPrice: "120.000000", currency: "USD" },
    ],
    priceAvailability: {
      status: "reference",
      reason: "Public reference price only. Customer-specific pricing requires an API key context.",
    },
  },
  {
    model: "gpt-5.5",
    catalogKey: "openai/gpt-5.5",
    displayName: "GPT-5.5",
    vendorCode: "openai",
    vendor: "OpenAI",
    capabilities: ["chat", "tools", "json schema", "vision"],
    groups: ["default"],
    categories: ["Recommended", "Proprietary", "New"],
    description: "Current OpenAI frontier model for coding, reasoning, and agentic workloads.",
    modalities: ["text"],
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    apiFormat: "openai_responses",
    capabilityIntro: "OpenAI GPT-5.5 balances frontier reasoning, coding, and agentic workloads.",
    limitations: ["Review outputs before automated execution."],
    supportedLanguages: ["English", "Chinese"],
    useCases: ["Software engineering", "Reasoning", "Agents"],
    trainingDataCutoff: "2026-05",
    contextTokens: 1050000,
    maxOutputTokens: 128000,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    providerCodes: ["openai"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "5.000000", currency: "USD" },
      { regionCode: "global", billingMeter: "llm_output_token", unitPrice: "30.000000", currency: "USD" },
      { regionCode: "global", billingMeter: "llm_cache_read_token", unitPrice: "0.500000", currency: "USD" },
    ],
    priceAvailability: {
      status: "reference",
      reason: "Public reference price only. Customer-specific pricing requires an API key context.",
    },
  },
  {
    model: "claude-opus-4-7",
    catalogKey: "anthropic/claude-opus-4-7",
    displayName: "Claude Opus 4.7",
    vendorCode: "anthropic",
    vendor: "Anthropic",
    capabilities: ["chat", "tools", "json schema", "long context", "vision"],
    groups: ["default", "enterprise"],
    categories: ["Recommended", "Proprietary", "New"],
    description: "Current Claude Opus frontier model for complex reasoning, coding, and agentic work.",
    modalities: ["text"],
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    apiFormat: "anthropic_messages",
    capabilityIntro: "Claude Opus 4.7 is a frontier model for complex reasoning, coding, and long-context agentic work.",
    limitations: ["Validate outputs before high-impact decisions."],
    supportedLanguages: ["English", "Chinese"],
    useCases: ["Reasoning", "Coding", "Long-context synthesis"],
    trainingDataCutoff: "2026-05",
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    providerCodes: ["anthropic"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "5.000000", currency: "USD" },
      { regionCode: "global", billingMeter: "llm_output_token", unitPrice: "25.000000", currency: "USD" },
      { regionCode: "global", billingMeter: "llm_cache_read_token", unitPrice: "0.500000", currency: "USD" },
    ],
    priceAvailability: {
      status: "reference",
      reason: "Public reference price only. Customer-specific pricing requires an API key context.",
    },
  },
  {
    model: "runtime-good",
    catalogKey: "newvendor/runtime-good",
    displayName: "Runtime Good",
    vendorCode: "newvendor",
    vendor: "New Vendor",
    capabilities: ["chat", "tools", "json mode"],
    groups: ["default"],
    categories: ["Recommended", "Proprietary"],
    modalities: ["text"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextTokens: 128000,
    maxOutputTokens: 8192,
    providerCodes: ["browser-smoke-provider"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.200000", currency: "USD" },
    ],
    priceAvailability: {
      status: "reference",
      reason: "Public reference price only. Customer-specific pricing requires an API key context.",
    },
    lowestUpstreamCostUnitPrice: "0.010000",
    upstreamCost: "0.010000",
    providerCost: "0.012000",
    channelCost: "0.013000",
    costPrice: "0.014000",
    customerUnitPrice: "0.300000",
    grossMarginPerUnit: "0.290000",
    pricingPlanCode: "internal-plan",
    groupCode: "internal-group",
  },
  {
    model: "gpt-4o-mini",
    catalogKey: "openai/gpt-4o-mini",
    displayName: "Runtime Enterprise",
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
    providerCodes: ["browser-smoke-provider"],
    officialReferencePrices: [
      { regionCode: "global", billingMeter: "llm_input_token", unitPrice: "0.150000", currency: "USD" },
    ],
    priceAvailability: {
      status: "reference",
      reason: "Public reference price only. Customer-specific pricing requires an API key context.",
    },
  },
  {
    model: "runtime-unpriced",
    catalogKey: "unpricedvendor/runtime-unpriced",
    displayName: "Runtime Unpriced",
    vendorCode: "unpricedvendor",
    vendor: "Unpriced Vendor",
    capabilities: ["chat"],
    groups: ["default"],
    categories: ["Recommended", "Proprietary"],
    modalities: ["text"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextTokens: 32000,
    maxOutputTokens: 4096,
    providerCodes: ["browser-smoke-provider"],
    officialReferencePrices: [],
    priceAvailability: {
      status: "unavailable",
      reason: "Public reference price is not configured for this model.",
    },
  },
];


const APP_SDK_BROWSER_FIXTURES = new Map([
  [`${APP_SDK_FIXTURE_MODE} GET /app/v3/api/auth/sessions/current`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: BROWSER_SMOKE_SESSION,
    },
  }],
  [`${APP_SDK_MODEL_FIXTURE_MODE} GET /app/v3/api/ai/models`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        items: BROWSER_SMOKE_MODEL_RECORDS,
      },
    },
  }],
  [`${APP_SDK_MODEL_EMPTY_FIXTURE_MODE} GET /app/v3/api/ai/models`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        items: [],
      },
    },
  }],
  [`${APP_SDK_PORTAL_SESSION_FIXTURE_MODE} GET /app/v3/api/auth/sessions/current`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: BROWSER_SMOKE_SESSION,
    },
  }],
]);

const APP_SDK_SHARED_BROWSER_FIXTURES = new Map([
  [`GET /app/v3/api/notification/notifications`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        items: [],
      },
    },
  }],
  [`GET /app/v3/api/ecosystem/skills`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        items: [],
      },
    },
  }],
]);

const BACKEND_SDK_BROWSER_FIXTURES = new Map([
  [`${BACKEND_SDK_PORTAL_SESSION_FIXTURE_MODE} GET /backend/v3/api/system/installation/status`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        status: "ready",
        schemaVersion: "2026.06.22.1",
      },
    },
  }],
  [`${BACKEND_SDK_PORTAL_SESSION_FIXTURE_MODE} GET /backend/v3/api/messaging/provider_accounts`, {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data: {
        items: [
          {
            id: "browser-smoke-provider",
            displayName: "Browser Smoke Provider",
            providerCode: "browser-smoke",
            channel: "email",
            status: "active",
          },
        ],
        total: 1,
      },
    },
  }],
]);

const API_PLAYGROUND_BROWSER_RESPONSE = {
  id: "browser-smoke-playground-response",
  object: "browser.smoke",
  message: "Browser smoke playground response",
  ok: true,
};

const API_PLAYGROUND_AUTH_BROWSER_RESPONSE = {
  id: "browser-smoke-playground-api-key-auth-response",
  object: "browser.smoke",
  message: "Browser smoke API key auth response",
  ok: true,
};

const BROWSER_SMOKE_ROUTES = [
  {
    pathName: "/models",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    requiredTextTokens: ["GPT-5.5 Pro", "GPT-5.5", "Claude Opus 4.7", "REFERENCE / 1M TOKENS"],
  },
  {
    pathName: "/models/openai%2Fgpt-5.5-pro",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    requiredTextTokens: ["GPT-5.5 Pro", "openai/gpt-5.5-pro", "API Example", "Try in Playground"],
  },
  {
    pathName: "/models?__browser-smoke-runtime=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    requiredTextTokens: [
      "Runtime Good",
      "Runtime Enterprise",
      "Runtime Unpriced",
      "Function Calling",
      "JSON Mode",
      "REFERENCE / 1M TOKENS",
      "UNAVAILABLE",
    ],
    forbiddenTextTokens: PRIVATE_PRICING_TOKENS,
  },
  {
    pathName: "/models?__browser-smoke-groups=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    setupExpressions: [
      clickRouteFilterLabelByText("Enterprise exclusive"),
    ],
    requiredTextTokens: [
      "Runtime Enterprise",
      "Enterprise exclusive",
      "REFERENCE / 1M TOKENS",
    ],
    forbiddenTextTokens: [
      "Runtime Good",
      "Runtime Unpriced",
      ...PRIVATE_PRICING_TOKENS,
    ],
  },
  {
    // Runtime model catalog filter route exercises search input state against app-SDK data.
    pathName: "/models?__browser-smoke-filter=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    setupExpressions: [
      setRouteTextInputByPlaceholder("Search models...", "no-match-runtime-model"),
    ],
    requiredTextTokens: [
      "No models found",
      "We couldn't find any models matching your current filters.",
    ],
    requiredDomExpressions: [
      `document.querySelector('input[placeholder="Search models..."]')?.value === "no-match-runtime-model"`,
    ],
    forbiddenTextTokens: [
      "Runtime Good",
      "Runtime Enterprise",
      "Runtime Unpriced",
      ...PRIVATE_PRICING_TOKENS,
    ],
  },
  {
    pathName: "/models?__browser-smoke-empty-runtime=1",
    appSdkFixtureMode: APP_SDK_MODEL_EMPTY_FIXTURE_MODE,
    requiredTextTokens: [
      "No models found",
      "We couldn't find any models matching your current filters.",
    ],
    forbiddenTextTokens: [
      "GPT-5.5 Pro",
      "GPT-5.5",
      "Claude Opus 4.7",
      "Runtime Good",
      "Runtime Enterprise",
      "Runtime Unpriced",
      "REFERENCE / 1M TOKENS",
      ...PRIVATE_PRICING_TOKENS,
    ],
  },
  {
    pathName: "/models?__browser-smoke-detail-click=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    setupExpressions: [
      clickRouteModelCardByName("Runtime Good"),
    ],
    requiredTextTokens: [
      "Runtime Good",
      "newvendor/runtime-good",
      "API Example",
      "Try in Playground",
      "CATALOG REFERENCE VALUES",
      "REFERENCE",
    ],
    forbiddenTextTokens: PRIVATE_PRICING_TOKENS,
  },
  {
    pathName: "/models/newvendor%2Fruntime-good?__browser-smoke-detail=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    requiredTextTokens: [
      "Runtime Good",
      "newvendor/runtime-good",
      "API Example",
      "Try in Playground",
      "Provider Docs",
      "Performance Metrics",
      "CATALOG REFERENCE VALUES",
      "Specifications",
      "$0.20",
      "Price is unavailable for the selected billing meter.",
    ],
    forbiddenTextTokens: PRIVATE_PRICING_TOKENS,
  },
  {
    pathName: "/models/unpricedvendor%2Fruntime-unpriced?__browser-smoke-unavailable-detail=1",
    appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE,
    requiredTextTokens: [
      "Runtime Unpriced",
      "unpricedvendor/runtime-unpriced",
      "Public reference price is not configured for this model.",
      "Performance Metrics",
      "Unavailable",
    ],
    forbiddenTextTokens: PRIVATE_PRICING_TOKENS,
  },
  {
    pathName: "/rankings",
    requiredTextTokens: ["Published catalog benchmark", "Snapshot Benchmark"],
  },
  {
    pathName: "/api-reference",
    requiredTextTokens: ["AI聚合API", "Create Chat Completion", "Request Parameters", "Response Properties"],
  },
  {
    pathName: "/api-reference?__browser-smoke-tool-api-disabled=1",
    forbiddenToolApiPaths: ["/api/code-snippet"],
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
    ],
    requiredTextTokens: [
      "API Reference",
      "Create Chat Completion",
      "Request",
      "Authorization",
      "CLAWROUTER_API_KEY",
    ],
    forbiddenTextTokens: [
      "Code snippet generation failed",
    ],
    requiredDomExpressions: [
      `window.__CLAWROUTER_ENV__?.VITE_TOOL_API_ENABLED === "false"`,
      `Array.from(document.querySelectorAll('pre code')).some((code) => code.textContent?.includes("CLAWROUTER_API_KEY"))`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-code-snippet-tabs=1",
    forbiddenToolApiPaths: ["/api/code-snippet"],
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteCodeLanguageButtonByExactText("typescript"),
      `Array.from(document.querySelectorAll('pre code')).some((code) => code.textContent?.includes("axios.request"))`,
      clickRouteCodeLibraryButtonByExactText("fetch"),
      `Array.from(document.querySelectorAll('pre code')).some((code) => code.textContent?.includes("await fetch"))`,
      installRouteClipboardProbe(),
      clickRouteButtonByTitle("Copy code"),
    ],
    requiredTextTokens: [
      "API Reference",
      "Create Chat Completion",
      "Request",
      "typescript",
      "axios",
      "fetch",
      "CLAWROUTER_API_KEY",
    ],
    forbiddenTextTokens: [
      "Code snippet generation failed",
    ],
    requiredDomExpressions: [
      `window.__CLAWROUTER_ENV__?.VITE_TOOL_API_ENABLED === "false"`,
      `Array.from(document.querySelectorAll('pre code')).some((code) => code.textContent?.includes("await fetch"))`,
      `Array.from(document.querySelectorAll('pre code')).some((code) => code.textContent?.includes("CLAWROUTER_API_KEY"))`,
      `window.__BROWSER_SMOKE_CLIPBOARD__?.includes("await fetch")`,
      `window.__BROWSER_SMOKE_CLIPBOARD__?.includes("CLAWROUTER_API_KEY")`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-validation=1",
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Retrieve Model"),
      clickRouteButtonByExactText("Try it out"),
      clickRouteButtonByExactText("Send"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Retrieve Model",
      "Path Variables",
      "Validation Error",
      "Please fill in all required parameters and body before sending the request.",
      "REQ",
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-managed-header=1",
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundBulkEditForSection("Headers"),
      setRouteBulkEditValue("Authorization:Bearer unsafe-browser-smoke"),
      clickRouteButtonByExactText("Key-Value Edit"),
      clickRouteButtonByExactText("Send"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Managed Header",
      "Authorization, cookies, browser-controlled headers, and transport headers are managed by the playground runtime and cannot be overridden in custom headers.",
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-send=1",
    apiPlaygroundFixtureMode: API_PLAYGROUND_FIXTURE_MODE,
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundTabByExactText("Authorization"),
      setRouteSelectValueByOptionText("Bearer Token"),
      setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key"),
      clickRoutePlaygroundBulkEditForSection("Query Params"),
      setRouteBulkEditValue("browser_smoke:query-value"),
      clickRouteButtonByExactText("Key-Value Edit"),
      setRouteParamTableInput("Query Params", "browser_smoke", "query-updated"),
      clickRoutePlaygroundTabByExactText("Body"),
      setRouteTextareaValue(JSON.stringify({
        model: "browser-smoke-model",
        messages: [
          {
            role: "user",
            content: "Browser smoke playground request",
          },
        ],
      }, null, 2)),
      clickRouteButtonByExactText("Send"),
      bodyTextIncludesExpression("Browser smoke playground response"),
      clickRouteResponseTabByExactText("Raw"),
      installRouteDownloadProbe(),
      clickRouteSaveResponseButton(),
      installRouteClipboardProbe(),
      clickRouteCopyResponseButton(),
      clickRouteResponseTabByExactText("Headers"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Response",
      "Status:",
      "200 OK",
      "Save Response",
      "Headers",
      "content-type",
      "application/json; charset=utf-8",
    ],
    requiredDomExpressions: [
      `Boolean(document.querySelector('button[title="Save Response"]'))`,
      `Array.from(document.querySelectorAll('button')).some((button) => button instanceof HTMLButtonElement && button.getAttribute('title')?.trim().toLowerCase() === "copy response")`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.download === "playground-response-200-ok.json"`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.href?.startsWith("blob:")`,
      `window.__BROWSER_SMOKE_CLIPBOARD__?.includes("Browser smoke playground response")`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-primitive-response=1",
    apiPlaygroundFixtureMode: API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE,
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundTabByExactText("Authorization"),
      setRouteSelectValueByOptionText("Bearer Token"),
      setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key"),
      clickRoutePlaygroundTabByExactText("Body"),
      setRouteTextareaValue(JSON.stringify({
        model: "browser-smoke-model",
        messages: [
          {
            role: "user",
            content: "Browser smoke primitive response request",
          },
        ],
      }, null, 2)),
      clickRouteButtonByExactText("Send"),
      clickRouteResponseTabByExactText("Raw"),
      bodyTextIncludesExpression("null"),
      installRouteClipboardProbe(),
      clickRouteCopyResponseButton(),
      installRouteDownloadProbe(),
      clickRouteSaveResponseButton(),
      clickRouteResponseTabByExactText("Headers"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Response",
      "Status:",
      "200 OK",
      "Save Response",
      "Copy",
      "Headers",
      "content-type",
      "application/json; charset=utf-8",
      "x-browser-smoke",
      "Browser smoke primitive response",
    ],
    requiredDomExpressions: [
      `Boolean(document.querySelector('button[title="Save Response"]'))`,
      `Array.from(document.querySelectorAll('button')).some((button) => button instanceof HTMLButtonElement && button.getAttribute('title')?.trim().toLowerCase() === "copy response")`,
      `window.__BROWSER_SMOKE_CLIPBOARD__ === "null"`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.download === "playground-response-200-ok.json"`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.href?.startsWith("blob:")`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.text === "null"`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-send-download=1",
    apiPlaygroundFixtureMode: API_PLAYGROUND_FIXTURE_MODE,
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundTabByExactText("Authorization"),
      setRouteSelectValueByOptionText("Bearer Token"),
      setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key"),
      clickRoutePlaygroundTabByExactText("Body"),
      setRouteTextareaValue(JSON.stringify({
        model: "browser-smoke-model",
        messages: [
          {
            role: "user",
            content: "Browser smoke playground send and download request",
          },
        ],
      }, null, 2)),
      installRouteDownloadProbe(),
      clickRouteButtonByExactText("Send and Download"),
      bodyTextIncludesExpression("Browser smoke playground response"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Response",
      "Browser smoke playground response",
      "Status:",
      "200 OK",
    ],
    requiredDomExpressions: [
      `window.__BROWSER_SMOKE_DOWNLOAD__?.download === "playground-response-200-ok.json"`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.href?.startsWith("blob:")`,
      `window.__BROWSER_SMOKE_DOWNLOAD__?.text?.includes("Browser smoke playground response")`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-api-key-auth=1",
    apiPlaygroundFixtureMode: API_PLAYGROUND_AUTH_FIXTURE_MODE,
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundTabByExactText("Authorization"),
      setRouteSelectValueByOptionText("Bearer Token"),
      setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key"),
      `document.querySelector('input[placeholder="Enter your API Key (sk-...)"]')?.value === "browser-smoke-api-key"`,
      clickRoutePlaygroundTabByExactText("Body"),
      setRouteTextareaValue(JSON.stringify({
        model: "browser-smoke-model",
        messages: [
          {
            role: "user",
            content: "Browser smoke API key auth request",
          },
        ],
      }, null, 2)),
      clickRouteButtonByExactText("Send"),
      bodyTextIncludesExpression("Browser smoke API key auth response"),
      clickRouteResponseTabByExactText("Headers"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Response",
      "Status:",
      "200 OK",
      "Headers",
      "x-browser-smoke",
      "api-reference-playground-api-key-auth",
    ],
    requiredDomExpressions: [
      `!document.body.innerText.includes("browser-smoke-api-key")`,
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-network-error=1",
    apiPlaygroundFixtureMode: API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE,
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      clickRoutePlaygroundTabByExactText("Authorization"),
      setRouteSelectValueByOptionText("Bearer Token"),
      setRoutePasswordInputByPlaceholder("Enter your API Key (sk-...)", "browser-smoke-api-key"),
      clickRoutePlaygroundTabByExactText("Body"),
      setRouteTextareaValue(JSON.stringify({
        model: "browser-smoke-model",
        messages: [
          {
            role: "user",
            content: "Browser smoke network failure request",
          },
        ],
      }, null, 2)),
      clickRouteButtonByExactText("Send"),
      bodyTextIncludesExpression("Network Error"),
    ],
    requiredTextTokens: [
      "API PLAYGROUND",
      "Create Chat Completion",
      "Response",
      "Status:",
      "0 Network Error",
      "This might be a CORS issue",
    ],
  },
  {
    pathName: "/api-reference?__browser-smoke-playground-drawer=1",
    setupExpressions: [
      selectRouteApiReferenceEndpointByName("Create Chat Completion"),
      clickRouteButtonByExactText("Try it out"),
      bodyTextIncludesExpression("API PLAYGROUND"),
      `Boolean(document.querySelector('[class*="max-w-[100vw]"], [class*="max-w-\\\\[100vw\\\\]"]'))`,
      clickRouteButtonByTitle("Close Drawer"),
    ],
    requiredTextTokens: [
      "API Reference",
      "Create Chat Completion",
      "Try it out",
    ],
    requiredDomExpressions: [
      `!document.body.innerText.includes("API PLAYGROUND")`,
      `!Boolean(document.querySelector('button[title="Close Drawer"]'))`,
      `!Boolean(document.querySelector('[class*="max-w-[100vw]"], [class*="max-w-\\\\[100vw\\\\]"]'))`,
    ],
  },
  {
    pathName: "/admin/messaging/providers?__browser-smoke-portal-session=1",
    requiresPortalSession: true,
    appSdkFixtureMode: APP_SDK_PORTAL_SESSION_FIXTURE_MODE,
    backendSdkFixtureMode: BACKEND_SDK_PORTAL_SESSION_FIXTURE_MODE,
    requiredTextTokens: [
      "Messaging Delivery",
      "Browser Smoke Provider",
    ],
  },
];

async function canBindPortOnHost(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", (error) => {
      if (error?.code === "EAFNOSUPPORT" || error?.code === "EINVAL") {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function canBindPort(port) {
  return (await canBindPortOnHost(port, "127.0.0.1")) && (await canBindPortOnHost(port, "::1"));
}

async function findAvailablePort(startPort = PORT_SEARCH_START) {
  for (let offset = 0; offset < PORT_SEARCH_LIMIT; offset += 1) {
    const port = startPort + offset;
    if (await canBindPort(port)) {
      return port;
    }
  }

  throw new Error(`Unable to find an available port in ${startPort}-${startPort + PORT_SEARCH_LIMIT - 1}`);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChromeExecutable() {
  if (process.env.CLAWROUTER_BROWSER_EXECUTABLE) {
    if (!(await pathExists(process.env.CLAWROUTER_BROWSER_EXECUTABLE))) {
      throw new Error(`CLAWROUTER_BROWSER_EXECUTABLE does not exist: ${process.env.CLAWROUTER_BROWSER_EXECUTABLE}`);
    }
    return process.env.CLAWROUTER_BROWSER_EXECUTABLE;
  }

  const candidates = process.platform === "win32"
    ? WINDOWS_CHROME_CANDIDATES
    : process.platform === "darwin"
      ? MACOS_CHROME_CANDIDATES
      : LINUX_CHROME_CANDIDATES;

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Chrome, Edge, or Chromium executable was not found. Set CLAWROUTER_BROWSER_EXECUTABLE to run the production browser DOM smoke.",
  );
}

function resolveBooleanEnv(value) {
  return ENABLED_VALUES.has(String(value ?? "").trim().toLowerCase());
}

function parsePositiveIntegerEnv(name, defaultValue) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function skipBrowserSmoke(reason) {
  if (resolveBooleanEnv(process.env.CLAWROUTER_BROWSER_SMOKE_REQUIRED)) {
    throw new Error(`${reason}. CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`);
  }
  console.warn(`[browser-smoke] skipped: ${reason}`);
}

function isProcessSpawnPermissionError(error) {
  return error?.code === "EPERM" || String(error?.message ?? error).includes("spawn EPERM");
}

function processSpawnPermissionDiagnostic(error, processName) {
  const original = error instanceof Error ? error.message : String(error);
  return (
    `Unable to spawn ${processName} for browser DOM smoke because child process spawn is not available in this environment. ` +
    "CLAWROUTER_BROWSER_SMOKE_REQUIRED requires this smoke to launch real processes. " +
    "Run it from a local shell or CI runner that permits Node child_process.spawn. " +
    `Original error: ${original}`
  );
}

function resolveRustEdgeCargoTargetDir() {
  const explicit = process.env.CLAWROUTER_BROWSER_SMOKE_CARGO_TARGET_DIR?.trim();
  const inherited = process.env.CARGO_TARGET_DIR?.trim();
  const targetDir = explicit || inherited || path.join("target-codex", "browser-smoke-edge");
  return path.isAbsolute(targetDir) ? targetDir : path.resolve(workspaceRoot, targetDir);
}

function appendProcessOutputTail(current, chunk) {
  const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  const next = `${current}${text}`;
  return next.length > PROCESS_OUTPUT_TAIL_MAX_CHARS
    ? next.slice(-PROCESS_OUTPUT_TAIL_MAX_CHARS)
    : next;
}

function rustEdgeServerStartupStderrDiagnostic(server) {
  const stderr = server?.browserSmokeStderrTail?.trim();
  return stderr ? `\nRust edge server startup stderr:\n${stderr}` : "";
}

function browserProcessDiagnostic(browser) {
  const stderr = browser?.browserSmokeStderrTail?.trim();
  return stderr ? `\nBrowser stderr:\n${stderr}` : "";
}

function spawnRustEdgeServer() {
  let server;
  const env = {
    ...process.env,
    CARGO_TARGET_DIR: resolveRustEdgeCargoTargetDir(),
  };
  try {
    server = spawn(process.platform === "win32" ? "cargo.exe" : "cargo", ["run", "-p", "sdkwork-clawrouter-edge-runtime"], {
      cwd: workspaceRoot,
      env,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: process.platform === "win32",
    });
  } catch (error) {
    skipBrowserSmoke(processSpawnPermissionDiagnostic(error, "Rust edge server"));
    return null;
  }

  server.browserSmokeStartupError = null;
  server.browserSmokeStartupErrorKind = null;
  server.browserSmokeStderrTail = "";
  server.browserSmokeExit = null;
  server.stderr.on("data", (chunk) => {
    server.browserSmokeStderrTail = appendProcessOutputTail(server.browserSmokeStderrTail, chunk);
  });
  server.once("error", (error) => {
    server.browserSmokeStartupError = error;
    server.browserSmokeStartupErrorKind = isProcessSpawnPermissionError(error) ? "spawnPermission" : "process";
    console.warn(`[browser-smoke] Rust edge server emitted a startup error: ${error.message}`);
  });
  server.once("exit", (code, signal) => {
    server.browserSmokeExit = { code, signal };
  });
  return server;
}

async function fetchJsonWithTimeout(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return await response.json();
}

async function waitForChromeVersion(debugPort) {
  const versionUrl = `http://127.0.0.1:${debugPort}/json/version`;
  const deadline = Date.now() + CDP_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const version = await fetchJsonWithTimeout(versionUrl);
      if (typeof version.webSocketDebuggerUrl === "string") {
        return version;
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Chrome DevTools Protocol did not become ready on port ${debugPort}: ${lastError?.message ?? "timeout"}`);
}

async function waitForPageTarget(debugPort) {
  const listUrl = `http://127.0.0.1:${debugPort}/json/list`;
  const deadline = Date.now() + CDP_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const targets = await fetchJsonWithTimeout(listUrl);
      const pageTarget = Array.isArray(targets)
        ? targets.find((target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string")
        : undefined;
      if (pageTarget) {
        return pageTarget;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Chrome DevTools Protocol did not expose a page target on port ${debugPort}: ${lastError?.message ?? "timeout"}`);
}

function connectDevTools(webSocketDebuggerUrl) {
  if (typeof WebSocket !== "function") {
    throw new Error("This Node.js runtime does not expose the global WebSocket client required for Chrome DevTools Protocol.");
  }
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const events = new Map();
  let browserProcess = null;

  socket.addEventListener("message", (event) => {
    const rawMessage = typeof event.data === "string"
      ? event.data
      : Buffer.from(event.data).toString("utf8");
    const message = JSON.parse(rawMessage);
    if (typeof message.id === "number") {
      const request = pending.get(message.id);
      if (!request) {
        return;
      }
      pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(`${request.method} failed: ${message.error.message}`));
      } else {
        request.resolve(message.result ?? {});
      }
      return;
    }

    if (message.method) {
      const handlers = events.get(message.method) ?? [];
      for (const handler of handlers) {
        handler(message.params ?? {});
      }
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out${browserProcessDiagnostic(browserProcess)}`));
      }, CDP_TIMEOUT_MS);
      pending.set(id, {
        method,
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      socket.send(payload);
    });
  }

  function on(method, handler) {
    const handlers = events.get(method) ?? [];
    handlers.push(handler);
    events.set(method, handlers);
  }

  function attachBrowserProcess(browser) {
    browserProcess = browser ?? null;
  }

  function rejectPendingRequests(createError) {
    for (const request of pending.values()) {
      request.reject(createError(request));
    }
    pending.clear();
  }

  function close() {
    for (const request of pending.values()) {
      request.reject(new Error("Chrome DevTools Protocol connection closed"));
    }
    pending.clear();
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }

  return { ready, send, attachBrowserProcess, rejectPendingRequests, on, close };
}

async function evaluateExpression(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${result.exceptionDetails.text}`);
  }
  return result.result?.value;
}

async function waitForExpression(cdp, expression, description) {
  const deadline = Date.now() + ROUTE_RENDER_TIMEOUT_MS;
  let lastValue;

  while (Date.now() < deadline) {
    lastValue = await evaluateExpression(cdp, expression);
    if (lastValue) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Timed out waiting for browser DOM condition: ${description}; last value: ${String(lastValue)}`);
}

async function captureBrowserDomDiagnostics(cdp) {
  try {
    return await evaluateExpression(cdp, `(() => {
      const root = document.querySelector('#root');
      return {
        location: window.location.href,
        readyState: document.readyState,
        rootChildCount: root?.children.length ?? null,
        rootHtml: (root?.innerHTML ?? '').slice(0, 1_000),
        bodyText: (document.body?.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 1_000),
        scripts: Array.from(document.scripts).map((script) => ({
          src: script.src,
          type: script.type,
          noModule: script.noModule,
        })).slice(-12),
      };
    })()`);
  } catch (error) {
    return {
      diagnosticError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function captureRouteSetupDiagnostics(cdp) {
  try {
    return await evaluateExpression(cdp, `(() => ({
      location: window.location.href,
      bodyText: (document.body?.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 1_500),
      headings: Array.from(document.querySelectorAll('h1,h2,h3,h4'))
        .map((heading) => heading.textContent?.replace(/\\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .slice(0, 80),
      buttons: Array.from(document.querySelectorAll('button'))
        .map((button) => ({
          text: button.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
          title: button.getAttribute('title') ?? '',
          disabled: button.disabled,
          visible: Boolean(button.offsetParent || button.getClientRects().length),
        }))
        .filter((button) => button.text || button.title)
        .slice(0, 120),
      inputs: Array.from(document.querySelectorAll('input, textarea, select'))
        .map((input) => ({
          tagName: input.tagName,
          placeholder: input.getAttribute('placeholder') ?? '',
          ariaLabel: input.getAttribute('aria-label') ?? '',
          value: input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement
            ? input.value.slice(0, 160)
            : '',
        }))
        .slice(0, 80),
    }))()`);
  } catch (error) {
    return {
      diagnosticError: error instanceof Error ? error.message : String(error),
    };
  }
}

function stringifyBrowserDiagnostics(diagnostics) {
  try {
    return JSON.stringify(diagnostics);
  } catch {
    return String(diagnostics);
  }
}

async function navigate(cdp, baseUrl, pathName) {
  await cdp.send("Page.navigate", { url: `${baseUrl}${pathName}` });
  await waitForExpression(cdp, "document.readyState === 'complete'", `${pathName} document ready`);
}

async function seedPortalSession(cdp) {
  const storageKey = JSON.stringify(APP_SESSION_STORAGE_KEY);
  const sessionPayload = JSON.stringify(BROWSER_SMOKE_STORED_SESSION);
  await evaluateExpression(cdp, `(() => {
    const payload = ${sessionPayload};
    window.sessionStorage.setItem(${storageKey}, JSON.stringify(payload));
    return window.sessionStorage.getItem(${storageKey}) === JSON.stringify(payload);
  })()`);
}

async function waitForRouteTextTokens(cdp, pathName, requiredTextTokens) {
  if (!Array.isArray(requiredTextTokens) || requiredTextTokens.length === 0) {
    return;
  }

  const escapedTokens = JSON.stringify(requiredTextTokens);
  try {
    await waitForExpression(
      cdp,
      `(() => {
        const bodyText = document.body.innerText;
        const tokens = ${escapedTokens};
        return tokens.every((token) => bodyText.includes(token));
      })()`,
      `${pathName} required text tokens`,
    );
  } catch (error) {
    const diagnostics = await evaluateExpression(cdp, `(() => {
      const bodyText = document.body.innerText;
      const tokens = ${escapedTokens};
      return {
        missingTokens: tokens.filter((token) => !bodyText.includes(token)),
        bodyText: bodyText.replace(/\\s+/g, ' ').trim().slice(0, 1_500),
      };
    })()`);
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; text diagnostics: ${stringifyBrowserDiagnostics(diagnostics)}`,
    );
  }
}

async function waitForRouteForbiddenTextTokens(cdp, pathName, forbiddenTextTokens) {
  if (!Array.isArray(forbiddenTextTokens) || forbiddenTextTokens.length === 0) {
    return;
  }

  const escapedTokens = JSON.stringify(forbiddenTextTokens);
  await waitForExpression(
    cdp,
    `(() => {
      const bodyText = document.body.innerText;
      const tokens = ${escapedTokens};
      return tokens.every((token) => !bodyText.includes(token));
    })()`,
    `${pathName} forbidden text tokens`,
  );
}

async function runRouteSetupExpressions(cdp, pathName, setupExpressions) {
  if (!Array.isArray(setupExpressions) || setupExpressions.length === 0) {
    return;
  }

  for (const [index, expression] of setupExpressions.entries()) {
    try {
      await waitForExpression(cdp, expression, `${pathName} setup expression ${index + 1}`);
    } catch (error) {
      const diagnostics = await captureRouteSetupDiagnostics(cdp);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; setup expression: ${expression}; setup diagnostics: ${stringifyBrowserDiagnostics(diagnostics)}`,
      );
    }
  }
}

async function waitForRouteDomExpressions(cdp, pathName, requiredDomExpressions) {
  if (!Array.isArray(requiredDomExpressions) || requiredDomExpressions.length === 0) {
    return;
  }

  for (const expression of requiredDomExpressions) {
    try {
      await waitForExpression(cdp, expression, `${pathName} required DOM expression`);
    } catch (error) {
      const diagnostics = await evaluateExpression(cdp, `(() => ({
        bodyText: (document.body?.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 1_500),
        headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((heading) => heading.textContent?.trim() ?? '').slice(0, 80),
      }))()`);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; expression: ${expression}; DOM diagnostics: ${stringifyBrowserDiagnostics(diagnostics)}`,
      );
    }
  }
}

function bodyTextIncludesExpression(text) {
  return `document.body.innerText.includes(${JSON.stringify(text)})`;
}

function clickRouteButtonByExactText(text) {
  return `(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    button?.click();
    return Boolean(button);
  })()`;
}

function clickRouteModelCardByName(name) {
  return `(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    const heading = headings.find((item) => item.textContent?.includes(${JSON.stringify(name)}));
    const card = heading?.closest('[class*="cursor-pointer"]');
    if (!(card instanceof HTMLElement)) {
      return false;
    }
    card.click();
    return true;
  })()`;
}

function clickRouteFilterLabelByText(text) {
  return `(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    if (!(label instanceof HTMLLabelElement)) {
      return false;
    }
    label.click();
    return true;
  })()`;
}



function clickRouteButtonByTitle(title) {
  return `(() => {
    const button = document.querySelector(${JSON.stringify(`button[title="${title}"]`)});
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  })()`;
}

function clickRouteCopyResponseButton() {
  return `(() => {
    const findResponseShell = () => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((item) => item instanceof HTMLButtonElement);
      for (const button of buttons) {
        const label = button.textContent?.trim();
        const title = button.getAttribute('title')?.trim().toLowerCase();
        if (label !== 'Save Response' && title !== 'save response') {
          continue;
        }
        let shell = button.parentElement;
        for (let depth = 0; depth < 8 && shell; depth += 1) {
          if (
            shell instanceof HTMLElement
            && shell.innerText.includes('Status:')
            && shell.innerText.includes('Save Response')
            && shell.innerText.includes('Copy')
          ) {
            return shell;
          }
          shell = shell.parentElement;
        }
      }
      return null;
    };
    const playground = findResponseShell();
    if (!(playground instanceof HTMLElement)) {
      return false;
    }
    const buttons = Array.from(playground.querySelectorAll('button'))
      .filter((item) => item instanceof HTMLButtonElement);
    const button = buttons.find((item) => item.getAttribute('title')?.trim().toLowerCase() === 'copy response')
      ?? buttons.find((item) => item.textContent?.trim() === 'Copy');
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  })()`;
}

function clickRouteSaveResponseButton() {
  return `(() => {
    const findResponseShell = () => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((item) => item instanceof HTMLButtonElement);
      for (const button of buttons) {
        const label = button.textContent?.trim();
        const title = button.getAttribute('title')?.trim().toLowerCase();
        if (label !== 'Save Response' && title !== 'save response') {
          continue;
        }
        let shell = button.parentElement;
        for (let depth = 0; depth < 8 && shell; depth += 1) {
          if (
            shell instanceof HTMLElement
            && shell.innerText.includes('Status:')
            && shell.innerText.includes('Save Response')
            && shell.innerText.includes('Copy')
          ) {
            return shell;
          }
          shell = shell.parentElement;
        }
      }
      return null;
    };
    const playground = findResponseShell();
    if (!(playground instanceof HTMLElement)) {
      return false;
    }
    const buttons = Array.from(playground.querySelectorAll('button'))
      .filter((item) => item instanceof HTMLButtonElement);
    const button = buttons.find((item) => item.getAttribute('title')?.trim().toLowerCase() === 'save response')
      ?? buttons.find((item) => item.textContent?.trim() === 'Save Response');
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  })()`;
}

function clickRoutePlaygroundTabByExactText(text) {
  return `(() => {
    const responseLabel = Array.from(document.querySelectorAll('span'))
      .find((item) => item.textContent?.trim() === 'Response');
    let playground = responseLabel;
    for (let depth = 0; depth < 10 && playground; depth += 1) {
      if (
        playground instanceof HTMLElement
        && playground.innerText.includes('API PLAYGROUND')
        && playground.innerText.includes('Send')
      ) {
        break;
      }
      playground = playground.parentElement;
    }
    if (!(playground instanceof HTMLElement)) {
      return false;
    }
    const button = Array.from(playground.querySelectorAll('button'))
      .find((item) => item.textContent?.trim().startsWith(${JSON.stringify(text)}));
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    const visibleText = playground.innerText;
    if (${JSON.stringify(text)} === 'Params' && visibleText.includes('Query Params')) {
      return true;
    }
    if (
      ${JSON.stringify(text)} === 'Headers'
      && playground.querySelector('input[placeholder="Key"]')
      && playground.querySelector('input[placeholder="Value"]')
    ) {
      return true;
    }
    if (${JSON.stringify(text)} === 'Authorization' && visibleText.includes('Auth Type') && playground.querySelector('select')) {
      return true;
    }
    if (${JSON.stringify(text)} === 'Body' && playground.querySelector('textarea:not([placeholder="key:value"])')) {
      return true;
    }
    button.click();
    return false;
  })()`;
}

function clickRoutePlaygroundBulkEditForSection(sectionTitle) {
  return `(() => {
    const tabText = ${JSON.stringify(sectionTitle)} === 'Headers' ? 'Headers' : 'Params';
    const responseLabel = Array.from(document.querySelectorAll('span'))
      .find((item) => item.textContent?.trim() === 'Response');
    let playground = responseLabel;
    for (let depth = 0; depth < 10 && playground; depth += 1) {
      if (
        playground instanceof HTMLElement
        && playground.innerText.includes('API PLAYGROUND')
        && playground.innerText.includes('Send')
      ) {
        break;
      }
      playground = playground.parentElement;
    }
    if (!(playground instanceof HTMLElement)) {
      return false;
    }
    const sectionHeading = Array.from(playground.querySelectorAll('h4'))
      .find((heading) => heading.textContent?.trim() === ${JSON.stringify(sectionTitle)});
    const section = sectionHeading?.closest('div.relative');
    if (section instanceof HTMLElement) {
      const textarea = section.querySelector('textarea[placeholder="key:value"]');
      if (textarea instanceof HTMLTextAreaElement) {
        return true;
      }
      const bulkButton = Array.from(section.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Bulk Edit');
      if (bulkButton instanceof HTMLButtonElement) {
        bulkButton.click();
        return false;
      }
    }
    const tabButton = Array.from(playground.querySelectorAll('button'))
      .find((button) => button.textContent?.trim().startsWith(tabText));
    if (tabButton instanceof HTMLButtonElement) {
      tabButton.click();
    }
    return false;
  })()`;
}

function selectRouteApiReferenceEndpointByName(name) {
  return `(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((item) => Array.from(item.querySelectorAll('span'))
      .some((span) => span.textContent?.trim() === ${JSON.stringify(name)}));
    const activeEndpointHeading = Array.from(document.querySelectorAll('main h2'))
      .find((heading) => heading.textContent?.trim() === ${JSON.stringify(name)});
    if (activeEndpointHeading) {
      return true;
    }
    button?.click();
    return false;
  })()`;
}

function clickRouteCodeLanguageButtonByExactText(text) {
  return `(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  })()`;
}

function clickRouteCodeLibraryButtonByExactText(text) {
  return `(() => {
    const requestHeading = Array.from(document.querySelectorAll('h3'))
      .find((item) => item.textContent?.trim() === 'Request');
    let requestSection = requestHeading;
    for (let depth = 0; depth < 8 && requestSection; depth += 1) {
      if (
        requestSection instanceof HTMLElement
        && requestSection.innerText.includes('Copy code')
        && requestSection.innerText.includes('CLAWROUTER_API_KEY')
      ) {
        break;
      }
      requestSection = requestSection.parentElement;
    }
    if (!(requestSection instanceof HTMLElement)) {
      return false;
    }
    const button = Array.from(requestSection.querySelectorAll('button'))
      .find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  })()`;
}

function setRouteInputValue(inputExpression, value) {
  return `(() => {
    const input = ${inputExpression};
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return input.value === ${JSON.stringify(value)};
  })()`;
}

function setRouteParamTableInput(title, key, value) {
  return setRouteInputValue(
    `(() => {
      const sections = Array.from(document.querySelectorAll('h4'))
        .filter((heading) => heading.textContent?.trim() === ${JSON.stringify(title)})
        .map((heading) => heading.closest('div.relative'));
      for (const section of sections) {
        if (!section) {
          continue;
        }
        const rows = Array.from(section.querySelectorAll('tbody tr'));
        for (const row of rows) {
          const inputs = Array.from(row.querySelectorAll('input'));
          const keyInput = inputs.find((input) => input instanceof HTMLInputElement && input.value === ${JSON.stringify(key)});
          if (!keyInput) {
            continue;
          }
          const valueInput = inputs.find((input) => input instanceof HTMLInputElement && input.placeholder === 'Value');
          if (valueInput instanceof HTMLInputElement) {
            return valueInput;
          }
        }
      }
      return null;
    })()`,
    value,
  );
}

function setRouteBulkEditValue(value) {
  return `(() => {
    const textarea = Array.from(document.querySelectorAll('textarea'))
      .find((item) => item.placeholder === 'key:value');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, ${JSON.stringify(value)});
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return textarea.value === ${JSON.stringify(value)};
  })()`;
}

function setRouteTextareaValue(value) {
  return `(() => {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    const textarea = textareas.find((item) => item.placeholder !== 'key:value');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, ${JSON.stringify(value)});
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return textarea.value === ${JSON.stringify(value)};
  })()`;
}

function setRouteSelectValueByOptionText(text) {
  return `(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const select = selects.find((item) => Array.from(item.options)
      .some((option) => option.textContent?.trim() === ${JSON.stringify(text)}));
    if (!(select instanceof HTMLSelectElement)) {
      return false;
    }
    const option = Array.from(select.options)
      .find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    if (!option) {
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, option.value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return select.value === option.value;
  })()`;
}

function setRoutePasswordInputByPlaceholder(placeholder, value) {
  return setRouteInputValue(
    `document.querySelector(${JSON.stringify(`input[type="password"][placeholder="${placeholder}"]`)})`,
    value,
  );
}

function clickRouteResponseTabByExactText(text) {
  return `(() => {
    const responseLabel = Array.from(document.querySelectorAll('span'))
      .find((item) => item.textContent?.trim() === 'Response');
    let responseSection = responseLabel;
    for (let depth = 0; depth < 8 && responseSection; depth += 1) {
      if (
        responseSection instanceof HTMLElement
        && responseSection.innerText.includes('Status:')
        && responseSection.innerText.includes('Raw')
      ) {
        break;
      }
      responseSection = responseSection.parentElement;
    }
    if (!(responseSection instanceof HTMLElement)) {
      return false;
    }
    const button = Array.from(document.querySelectorAll('button'))
      .find((item) => responseSection.contains(item) && item.textContent?.trim().startsWith(${JSON.stringify(text)}));
    button?.click();
    return Boolean(button);
  })()`;
}

function installRouteDownloadProbe() {
  return `(() => {
    window.__BROWSER_SMOKE_DOWNLOAD__ = null;
    if (window.__BROWSER_SMOKE_DOWNLOAD_PROBE_INSTALLED__) {
      return true;
    }
    const browserSmokeBlobUrls = new Map();
    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    const originalClick = HTMLAnchorElement.prototype.click;
    Object.defineProperty(window, "__BROWSER_SMOKE_BLOB_URLS__", {
      value: browserSmokeBlobUrls,
      configurable: true,
    });
    Object.defineProperty(window, "__BROWSER_SMOKE_ORIGINAL_CREATE_OBJECT_URL__", {
      value: originalCreateObjectURL,
      configurable: true,
    });
    Object.defineProperty(window, "__BROWSER_SMOKE_ORIGINAL_REVOKE_OBJECT_URL__", {
      value: originalRevokeObjectURL,
      configurable: true,
    });
    Object.defineProperty(window, "__BROWSER_SMOKE_ORIGINAL_ANCHOR_CLICK__", {
      value: originalClick,
      configurable: true,
    });
    URL.createObjectURL = function browserSmokeCreateObjectURL(blob) {
      const url = originalCreateObjectURL(blob);
      browserSmokeBlobUrls.set(url, blob);
      return url;
    };
    URL.revokeObjectURL = function browserSmokeRevokeObjectURL(url) {
      setTimeout(() => {
        browserSmokeBlobUrls.delete(url);
      }, 0);
      return originalRevokeObjectURL(url);
    };
    HTMLAnchorElement.prototype.click = function browserSmokeAnchorClick() {
      const blob = browserSmokeBlobUrls.get(this.href);
      window.__BROWSER_SMOKE_DOWNLOAD__ = {
        download: this.download,
        href: this.href,
        text: null,
      };
      if (blob instanceof Blob) {
        void blob.text().then((text) => {
          if (window.__BROWSER_SMOKE_DOWNLOAD__?.href === this.href) {
            window.__BROWSER_SMOKE_DOWNLOAD__.text = text;
          }
        });
      }
    };
    Object.defineProperty(window, "__BROWSER_SMOKE_DOWNLOAD_PROBE_INSTALLED__", {
      value: true,
      configurable: true,
    });
    return true;
  })()`;
}

function installRouteClipboardProbe() {
  return `(() => {
    window.__BROWSER_SMOKE_CLIPBOARD__ = "";
    const clipboard = {
      writeText: async (text) => {
        window.__BROWSER_SMOKE_CLIPBOARD__ = String(text);
      },
    };
    Object.defineProperty(navigator, "clipboard", {
      value: clipboard,
      configurable: true,
    });
    return typeof navigator.clipboard?.writeText === "function";
  })()`;
}

function setRouteTextInputByPlaceholder(placeholder, value) {
  return `(() => {
    const input = document.querySelector(${JSON.stringify(`input[placeholder="${placeholder}"]`)});
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input.value === ${JSON.stringify(value)};
  })()`;
}

function normalizeFixtureUrlPath(rawUrl) {
  try {
    return new URL(rawUrl).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function plusApiFixture(data) {
  return {
    statusCode: 200,
    body: {
      code: "2000",
      msg: "success",
      data,
    },
  };
}

function parseFixtureUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function resolveAppSdkFixture(appSdkFixtureMode, request) {
  const method = String(request.method ?? "GET").toUpperCase();
  const pathName = normalizeFixtureUrlPath(request.url);
  const sharedFixture = APP_SDK_SHARED_BROWSER_FIXTURES.get(`${method} ${pathName}`);
  if (sharedFixture) {
    return sharedFixture;
  }
  if (!appSdkFixtureMode) {
    return null;
  }
  return APP_SDK_BROWSER_FIXTURES.get(`${appSdkFixtureMode} ${method} ${pathName}`) ?? null;
}

function resolveBackendSdkFixture(backendSdkFixtureMode, request) {
  if (!backendSdkFixtureMode) {
    return null;
  }
  const method = String(request.method ?? "GET").toUpperCase();
  const pathName = normalizeFixtureUrlPath(request.url);
  return BACKEND_SDK_BROWSER_FIXTURES.get(`${backendSdkFixtureMode} ${method} ${pathName}`) ?? null;
}

function requestHeaderValue(request, name) {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(request.headers ?? {})) {
    if (key.toLowerCase() === normalizedName) {
      return String(value);
    }
  }
  return "";
}

function apiPlaygroundCorsHeaders(request) {
  const origin = requestHeaderValue(request, "origin") || "http://127.0.0.1";
  return [
    { name: "access-control-allow-origin", value: origin },
    { name: "access-control-allow-credentials", value: "true" },
    { name: "access-control-allow-methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
    { name: "access-control-allow-headers", value: "authorization, content-type, access-token, x-browser-smoke" },
    { name: "access-control-expose-headers", value: "content-type, x-browser-smoke" },
    { name: "vary", value: "origin" },
  ];
}

function resolveApiPlaygroundFixture(apiPlaygroundFixtureMode, request) {
  if (
    apiPlaygroundFixtureMode !== API_PLAYGROUND_FIXTURE_MODE
    && apiPlaygroundFixtureMode !== API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE
    && apiPlaygroundFixtureMode !== API_PLAYGROUND_AUTH_FIXTURE_MODE
    && apiPlaygroundFixtureMode !== API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE
  ) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(request.url);
  } catch {
    return null;
  }

  const isTenantApiRequest = parsedUrl.origin === "https://tenant-api.example.com"
    && parsedUrl.pathname.startsWith("/api/");
  const isSameOriginGatewayRequest = parsedUrl.pathname.startsWith("/v1/");
  if (!isTenantApiRequest && !isSameOriginGatewayRequest) {
    return null;
  }

  const method = String(request.method ?? "GET").toUpperCase();
  if (apiPlaygroundFixtureMode === API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE && method !== "OPTIONS") {
    return {
      networkErrorReason: "ConnectionFailed",
    };
  }

  const corsHeaders = apiPlaygroundCorsHeaders(request);
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      statusText: "No Content",
      responseHeaders: corsHeaders,
      body: "",
    };
  }

  const expectedChatCompletionsPath = isSameOriginGatewayRequest
    ? "/v1/chat/completions"
    : "/api/v1/chat/completions";
  if (method !== "POST" || parsedUrl.pathname !== expectedChatCompletionsPath) {
    return {
      statusCode: 404,
      statusText: "Not Found",
      responseHeaders: [
        ...corsHeaders,
        { name: "content-type", value: "application/json; charset=utf-8" },
      ],
      body: {
        error: "Browser smoke API fixture only handles chat completions.",
      },
    };
  }

  if (apiPlaygroundFixtureMode === API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE) {
    return {
      statusCode: 200,
      statusText: "OK",
      responseHeaders: [
        ...corsHeaders,
        { name: "content-type", value: "application/json; charset=utf-8" },
        { name: "cache-control", value: "no-store" },
        { name: "x-browser-smoke", value: "Browser smoke primitive response" },
      ],
      body: null,
    };
  }

  if (apiPlaygroundFixtureMode === API_PLAYGROUND_AUTH_FIXTURE_MODE) {
    const authorizationHeader = requestHeaderValue(request, "authorization");
    const expectedAuthorizationHeader = `Bearer ${API_PLAYGROUND_EXPECTED_API_KEY}`;
    if (authorizationHeader !== expectedAuthorizationHeader) {
      return {
        statusCode: 401,
        statusText: "Unauthorized",
        responseHeaders: [
          ...corsHeaders,
          { name: "content-type", value: "application/json; charset=utf-8" },
          { name: "cache-control", value: "no-store" },
          { name: "x-browser-smoke", value: "api-reference-playground-api-key-auth-missing" },
        ],
        body: {
          error: "Browser smoke API key Authorization header was not sent correctly.",
        },
      };
    }

    return {
      statusCode: 200,
      statusText: "OK",
      responseHeaders: [
        ...corsHeaders,
        { name: "content-type", value: "application/json; charset=utf-8" },
        { name: "cache-control", value: "no-store" },
        { name: "x-browser-smoke", value: "api-reference-playground-api-key-auth" },
      ],
      body: API_PLAYGROUND_AUTH_BROWSER_RESPONSE,
    };
  }

  return {
    statusCode: 200,
    statusText: "OK",
    responseHeaders: [
      ...corsHeaders,
      { name: "content-type", value: "application/json; charset=utf-8" },
      { name: "cache-control", value: "no-store" },
      { name: "x-browser-smoke", value: "api-reference-playground" },
    ],
    body: API_PLAYGROUND_BROWSER_RESPONSE,
  };
}

function installApiPlaygroundFetchInterceptor(state, resetConsoleIssueFilter = () => undefined) {
  return {
    setActiveMode(mode) {
      state.apiPlaygroundFixtureMode = mode ?? null;
      resetConsoleIssueFilter();
    },
  };
}

async function installAppSdkFixtureInterceptor(cdp, resetConsoleIssueFilter = () => undefined) {
  const state = {
    appSdkFixtureMode: null,
    backendSdkFixtureMode: null,
    apiPlaygroundFixtureMode: null,
  };
  const apiPlaygroundFixtureInterceptor = installApiPlaygroundFetchInterceptor(state, resetConsoleIssueFilter);

  await cdp.send("Fetch.enable", {
    patterns: [
      {
        requestStage: "Request",
        urlPattern: "*://*/app/v3/api/*",
      },
      {
        requestStage: "Request",
        urlPattern: "*://*/backend/v3/api/*",
      },
      {
        requestStage: "Request",
        urlPattern: "https://tenant-api.example.com/api/*",
      },
      {
        requestStage: "Request",
        urlPattern: "*://*/v1/*",
      },
    ],
  });

  cdp.on("Fetch.requestPaused", (params) => {
    const request = params.request ?? {};
    const fixture = resolveAppSdkFixture(state.appSdkFixtureMode, request)
      ?? resolveBackendSdkFixture(state.backendSdkFixtureMode, request)
      ?? resolveApiPlaygroundFixture(state.apiPlaygroundFixtureMode, request);
    if (!fixture) {
      void cdp.send("Fetch.continueRequest", {
        requestId: params.requestId,
      });
      return;
    }

    if (fixture.networkErrorReason) {
      void cdp.send("Fetch.failRequest", {
        requestId: params.requestId,
        errorReason: fixture.networkErrorReason,
      });
      return;
    }

    void cdp.send("Fetch.fulfillRequest", {
      requestId: params.requestId,
      responseCode: fixture.statusCode,
      responsePhrase: fixture.statusText,
      responseHeaders: fixture.responseHeaders ?? [
        { name: "content-type", value: "application/json; charset=utf-8" },
        { name: "cache-control", value: "no-store" },
      ],
      body: Buffer.from(typeof fixture.body === "string" ? fixture.body : JSON.stringify(fixture.body)).toString("base64"),
    });
  });

  return {
    setActiveMode(mode) {
      state.appSdkFixtureMode = mode ?? null;
    },
    setActiveBackendMode(mode) {
      state.backendSdkFixtureMode = mode ?? null;
    },
    setActiveApiPlaygroundMode(mode) {
      apiPlaygroundFixtureInterceptor.setActiveMode(mode);
    },
  };
}

async function verifyRuntimeEnvironment(cdp, baseUrl) {
  await navigate(cdp, baseUrl, "/");
  await waitForExpression(
    cdp,
    "Boolean(window.__CLAWROUTER_ENV__ && window.__CLAWROUTER_ENV__.VITE_API_BASE_URL)",
    "window.__CLAWROUTER_ENV__ exists",
  );

  const runtimeEnv = await evaluateExpression(cdp, "window.__CLAWROUTER_ENV__");
  if (runtimeEnv.VITE_API_BASE_URL !== "https://tenant-api.example.com/api") {
    throw new Error(`Browser runtime env used an unexpected API base URL: ${runtimeEnv.VITE_API_BASE_URL}`);
  }
  if (runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL !== "https://tenant-api.example.com/api") {
    throw new Error(
      `Browser runtime env used an unexpected open SDK base URL: ${runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL}`,
    );
  }
  if (runtimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL !== "/app/v3/api") {
    throw new Error(
      `Browser runtime env used an unexpected app base URL: ${runtimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL}`,
    );
  }
  if (runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL !== "/backend/v3/api") {
    throw new Error(
      `Browser runtime env used an unexpected backend base URL: ${runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL}`,
    );
  }
  if (runtimeEnv.VITE_TOOL_API_ENABLED !== "false") {
    throw new Error(`Browser runtime env used an unexpected local tool flag: ${runtimeEnv.VITE_TOOL_API_ENABLED}`);
  }

  const runtimeScriptIndex = await evaluateExpression(
    cdp,
    "Array.from(document.scripts).findIndex((script) => script.src.endsWith('/runtime-env.js'))",
  );
  const bundleScriptIndex = await evaluateExpression(
    cdp,
    "Array.from(document.scripts).findIndex((script) => /\\/assets\\/.*\\.js$/.test(script.src))",
  );
  if (runtimeScriptIndex < 0 || bundleScriptIndex < 0 || runtimeScriptIndex > bundleScriptIndex) {
    throw new Error(`Runtime env script order is invalid: runtime=${runtimeScriptIndex}, bundle=${bundleScriptIndex}`);
  }
}

async function applyBrowserLocale(cdp) {
  await cdp.send("Network.enable");
  await cdp.send("Network.setExtraHTTPHeaders", {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  await sendLocaleOverride(cdp, "en-US");
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: await evaluateExpression(cdp, "navigator.userAgent"),
    acceptLanguage: "en-US,en;q=0.9",
    platform: await evaluateExpression(cdp, "navigator.platform"),
  });
}

async function sendLocaleOverride(cdp, locale) {
  try {
    await cdp.send("Emulation.setLocaleOverride", {
      locale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Another locale override is already in effect")) {
      throw error;
    }
  }
}

function createToolApiRequestCollector() {
  const requests = [];
  let activePaths = null;

  return {
    register(cdp) {
      cdp.on("Network.requestWillBeSent", (params) => {
        if (!activePaths) {
          return;
        }
        const rawUrl = params.request?.url;
        if (typeof rawUrl !== "string") {
          return;
        }
        let parsedUrl;
        try {
          parsedUrl = new URL(rawUrl);
        } catch {
          return;
        }
        if (activePaths.has(parsedUrl.pathname)) {
          requests.push(rawUrl);
        }
      });
    },
    start(paths) {
      requests.length = 0;
      activePaths = new Set(paths);
    },
    stop() {
      activePaths = null;
    },
    assertNoRequests(pathName) {
      if (requests.length > 0) {
        throw new Error(`${pathName} made disabled local tool API requests: ${requests.join(", ")}`);
      }
    },
  };
}

async function verifyRouteDom(cdp, baseUrl, route, issueCollector, toolApiRequestCollector) {
  const {
    pathName,
    requiredTextTokens,
    forbiddenTextTokens,
    forbiddenToolApiPaths,
    requiredDomExpressions,
    setupExpressions,
    apiPlaygroundFixtureMode,
    expectedBrowserLogTexts,
    requiresPortalSession,
  } = route;
  const routeForbiddenTextTokens = [
    ...(forbiddenTextTokens ?? []),
    ...(pathName.startsWith("/api-reference") ? API_REFERENCE_ROUTE_BUNDLE_FORBIDDEN_TOKENS : []),
  ];
  const hasForbiddenToolApiPaths = Array.isArray(forbiddenToolApiPaths) && forbiddenToolApiPaths.length > 0;
  for (const expectedBrowserLogText of expectedBrowserLogTexts ?? []) {
    issueCollector?.ignoreBrowserLogTextFor(expectedBrowserLogText, ROUTE_RENDER_TIMEOUT_MS);
  }
  if (apiPlaygroundFixtureMode && issueCollector) {
    issueCollector?.ignoreNetworkErrorsFor(ROUTE_RENDER_TIMEOUT_MS);
    if (apiPlaygroundFixtureMode === API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE) {
      issueCollector?.ignoreBrowserLogTextFor(
        "Failed to load resource: net::ERR_CONNECTION_FAILED",
        ROUTE_RENDER_TIMEOUT_MS,
      );
    }
  }
  if (hasForbiddenToolApiPaths) {
    if (!toolApiRequestCollector) {
      throw new Error(`${pathName} requires a local tool API request collector`);
    }
    toolApiRequestCollector.start(forbiddenToolApiPaths);
  }
  try {
    if (requiresPortalSession) {
      await seedPortalSession(cdp);
    }
    await navigate(cdp, baseUrl, pathName);
    try {
      await waitForExpression(cdp, "Boolean(document.querySelector('#root')?.children.length)", `${pathName} React root`);
    } catch (error) {
      const diagnostics = await captureBrowserDomDiagnostics(cdp);
      const issueSummary = issueCollector?.issues?.length
        ? `; browser issues: ${issueCollector.issues.join(" | ")}`
        : "";
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}${issueSummary}; diagnostics: ${stringifyBrowserDiagnostics(diagnostics)}`,
      );
    }
    await runRouteSetupExpressions(cdp, pathName, setupExpressions);
    await waitForRouteTextTokens(cdp, pathName, requiredTextTokens);
    await waitForRouteForbiddenTextTokens(cdp, pathName, routeForbiddenTextTokens);
    await waitForRouteDomExpressions(cdp, pathName, requiredDomExpressions);

    const bodyText = await evaluateExpression(cdp, "document.body.innerText");
    for (const token of requiredTextTokens) {
      if (!bodyText.includes(token)) {
        throw new Error(`${pathName} rendered DOM is missing required text: ${token}`);
      }
    }
    for (const forbiddenToken of routeForbiddenTextTokens) {
      if (bodyText.includes(forbiddenToken)) {
        throw new Error(`${pathName} rendered DOM includes forbidden text: ${forbiddenToken}`);
      }
    }
    for (const forbiddenToken of PRIVATE_PRICING_TOKENS) {
      if (bodyText.includes(forbiddenToken)) {
        throw new Error(`${pathName} rendered DOM exposed private token: ${forbiddenToken}`);
      }
    }
    if (hasForbiddenToolApiPaths) {
      toolApiRequestCollector.assertNoRequests(pathName);
    }
  } finally {
    if (hasForbiddenToolApiPaths) {
      toolApiRequestCollector.stop();
    }
  }
}

async function verifySecurityPolicy(cdp) {
  const csp = await evaluateExpression(
    cdp,
    "document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')?.content ?? document.policy?.allowedFeatures?.().join(',') ?? ''",
  );
  if (typeof csp !== "string") {
    throw new Error("Browser security policy probe returned a non-string result");
  }
}

async function waitForEdgeServer(baseUrl, server) {
  const deadline = Date.now() + EDGE_SERVER_STARTUP_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    if (server?.browserSmokeStartupError) {
      throw server.browserSmokeStartupError;
    }
    if (server?.browserSmokeExit) {
      const { code, signal } = server.browserSmokeExit;
      throw new Error(
        `Rust edge server exited before readiness: code=${String(code)} signal=${String(signal)}${rustEdgeServerStartupStderrDiagnostic(server)}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`/healthz returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
  throw new Error(
    `Rust edge server did not become ready within ${EDGE_SERVER_STARTUP_TIMEOUT_MS}ms: ${lastError instanceof Error ? lastError.message : String(lastError)}${rustEdgeServerStartupStderrDiagnostic(server)}`,
  );
}

async function closeServer(server) {
  await terminateProcess(server);
}

async function cleanupBrowserUserDataDir(userDataDir) {
  const transientLockCodes = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(userDataDir, { force: true, recursive: true });
      return;
    } catch (error) {
      lastError = error;
      if (!transientLockCodes.has(error?.code)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  console.warn(
    `[browser-smoke] browser user data dir cleanup skipped after transient ${lastError?.code ?? "unknown"} lock: ${userDataDir}`,
  );
}

function terminateProcess(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill();
    setTimeout(() => resolve(), PROCESS_SHUTDOWN_TIMEOUT_MS).unref();
  });
}

function createBrowserIssueCollector() {
  const issues = [];
  const requestUrlsById = new Map();
  let activeRoutePath = null;
  let ignoredNetworkErrorDeadline = 0;
  const ignoredBrowserLogTexts = new Map();
  function routeIssuePrefix() {
    return activeRoutePath ? `${activeRoutePath} ` : "";
  }
  return {
    issues,
    setActiveRoute(pathName) {
      activeRoutePath = pathName ?? null;
    },
    ignoreNetworkErrorsFor(durationMs) {
      ignoredNetworkErrorDeadline = Math.max(ignoredNetworkErrorDeadline, Date.now() + durationMs);
    },
    ignoreBrowserLogTextFor(text, durationMs) {
      ignoredBrowserLogTexts.set(
        text,
        Math.max(ignoredBrowserLogTexts.get(text) ?? 0, Date.now() + durationMs),
      );
    },
    register(cdp) {
      cdp.on("Runtime.exceptionThrown", (params) => {
        const exceptionDetails = params.exceptionDetails ?? {};
        const exception = exceptionDetails.exception ?? {};
        const stackFrames = exceptionDetails.stackTrace?.callFrames ?? [];
        const topFrame = stackFrames[0];
        const stackLocation = topFrame
          ? ` at ${topFrame.url || "<anonymous>"}:${topFrame.lineNumber + 1}:${topFrame.columnNumber + 1}`
          : "";
        const description = exception.description || exceptionDetails.text || "unknown exception";
        issues.push(`${routeIssuePrefix()}Runtime.exceptionThrown: ${description}${stackLocation}`);
      });
      cdp.on("Network.requestWillBeSent", (params) => {
        const requestId = params.requestId;
        const url = params.request?.url;
        if (typeof requestId === "string" && typeof url === "string") {
          requestUrlsById.set(requestId, url);
        }
      });
      cdp.on("Network.responseReceived", (params) => {
        const status = params.response?.status;
        if (typeof status !== "number" || status < 400) {
          return;
        }
        if (
          Date.now() < ignoredNetworkErrorDeadline
          && typeof params.response?.url === "string"
          && params.response.url.includes("https://tenant-api.example.com/api/")
        ) {
          return;
        }
        const url = params.response?.url ?? requestUrlsById.get(params.requestId) ?? "<unknown>";
        issues.push(`${routeIssuePrefix()}Network.responseReceived ${status}: ${url}`);
      });
      cdp.on("Log.entryAdded", (params) => {
        const entry = params.entry ?? {};
        const entryText = typeof entry.text === "string" ? entry.text : "";
        if (
          Date.now() < ignoredNetworkErrorDeadline
          && entry.level === "error"
          && entryText.includes("https://tenant-api.example.com/api/")
        ) {
          return;
        }
        for (const [ignoredText, deadline] of ignoredBrowserLogTexts.entries()) {
          if (Date.now() < deadline && entryText.includes(ignoredText)) {
            return;
          }
          if (Date.now() >= deadline) {
            ignoredBrowserLogTexts.delete(ignoredText);
          }
        }
        if (["error", "warning"].includes(entry.level)) {
          issues.push(`${routeIssuePrefix()}Log.entryAdded ${entry.level}: ${entryText}`);
        }
      });
    },
    assertNoIssues() {
      if (issues.length > 0) {
        throw new Error(`Browser console/runtime issues detected: ${issues.join(" | ")}`);
      }
    },
  };
}

async function main() {
  await access(indexHtml);

  const port = await findAvailablePort();
  const externalDebugPort = process.env.CLAWROUTER_BROWSER_DEBUG_PORT;
  const debugPort = externalDebugPort
    ? Number(externalDebugPort)
    : await findAvailablePort(CHROME_DEBUG_PORT_SEARCH_START);
  const userDataDir = await mkdtemp(path.join(tmpdir(), "clawrouter-browser-smoke-"));
  const previousNodeEnv = process.env.NODE_ENV;
  const previousServerBind = process.env.SDKWORK_CLAW_SERVER_BIND;
  const previousEdgeServer = process.env.SDKWORK_CLAW_EDGE_SERVER;
  const previousPortalStaticDist = process.env.SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST;
  const previousPublicApiBaseUrl = process.env.PORTAL_PUBLIC_API_BASE_URL;
  const previousPublicOpenApiBaseUrl = process.env.PORTAL_PUBLIC_OPEN_API_BASE_URL;
  const previousPublicAppApiBaseUrl = process.env.PORTAL_PUBLIC_APP_API_BASE_URL;
  const previousPublicBackendApiBaseUrl = process.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL;
  const previousPublicToolApiEnabled = process.env.PORTAL_PUBLIC_TOOL_API_ENABLED;
  const previousCwd = process.cwd();
  let server;
  let browser;
  let cdp;
  let verifiedRouteCount = 0;
  let browserSmokeCompleted = false;
  let primarySmokeError = null;

  try {
    if (externalDebugPort && (!Number.isInteger(debugPort) || debugPort < 1 || debugPort > 65535)) {
      throw new Error(`Invalid CLAWROUTER_BROWSER_DEBUG_PORT value: ${externalDebugPort}`);
    }

    process.env.NODE_ENV = "production";
    process.env.SDKWORK_CLAW_SERVER_BIND = `127.0.0.1:${port}`;
    process.env.SDKWORK_CLAW_EDGE_SERVER = "1";
    process.env.SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST = path.join(portalRoot, "dist");
    process.env.PORTAL_PUBLIC_API_BASE_URL = "https://tenant-api.example.com/api";
    process.env.PORTAL_PUBLIC_OPEN_API_BASE_URL = "https://tenant-api.example.com/api";
    process.env.PORTAL_PUBLIC_APP_API_BASE_URL = "/app/v3/api";
    process.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL = "/backend/v3/api";
    process.env.PORTAL_PUBLIC_TOOL_API_ENABLED = "false";
    process.chdir(portalRoot);

    const baseUrl = `http://127.0.0.1:${port}`;
    server = spawnRustEdgeServer();
    if (!server) {
      return;
    }
    try {
      await waitForEdgeServer(baseUrl, server);
    } catch (error) {
      if (isProcessSpawnPermissionError(error)) {
        skipBrowserSmoke(processSpawnPermissionDiagnostic(error, "Rust edge server"));
        return;
      }
      throw error;
    }

    if (!externalDebugPort) {
      const chromeExecutable = await findChromeExecutable();
      try {
        browser = spawn(chromeExecutable, [
          "--headless=new",
          "--disable-gpu",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-extensions",
          "--disable-sync",
          "--lang=en-US",
          "--metrics-recording-only",
          "--no-first-run",
          "--no-default-browser-check",
          "--remote-debugging-address=127.0.0.1",
          `--remote-debugging-port=${debugPort}`,
          `--user-data-dir=${userDataDir}`,
          "about:blank",
        ], {
          stdio: ["ignore", "ignore", "pipe"],
          windowsHide: true,
        });
      } catch (error) {
        if (isProcessSpawnPermissionError(error)) {
          skipBrowserSmoke(processSpawnPermissionDiagnostic(error, "Chrome or Edge"));
        } else {
          skipBrowserSmoke(`Unable to spawn Chrome or Edge for browser DOM smoke: ${error.message}`);
        }
        return;
      }
      browser.browserSmokeStderrTail = "";
      browser.browserSmokeExit = null;
      browser.stderr.on("data", (chunk) => {
        browser.browserSmokeStderrTail = appendProcessOutputTail(browser.browserSmokeStderrTail, chunk);
      });
      browser.once("error", (error) => {
        console.warn(`[browser-smoke] Chrome or Edge emitted a startup error: ${error.message}`);
      });
      browser.once("exit", (code, signal) => {
        browser.browserSmokeExit = { code, signal };
        if (cdp) {
          cdp.rejectPendingRequests(
            (request) => new Error(
              `Browser process exited before CDP command ${request.method} completed: code=${String(code)} signal=${String(signal)}${browserProcessDiagnostic(browser)}`,
            ),
          );
        }
      });
    }

    let version;
    try {
      version = await waitForChromeVersion(debugPort);
    } catch (error) {
      if (!externalDebugPort) {
        skipBrowserSmoke(`Chrome DevTools Protocol did not become available for browser DOM smoke: ${error.message}`);
        return;
      }
      throw error;
    }
    if (!version.Browser) {
      throw new Error("Chrome DevTools Protocol version response did not include browser metadata");
    }
    const pageTarget = await waitForPageTarget(debugPort);
    cdp = connectDevTools(pageTarget.webSocketDebuggerUrl);
    cdp.attachBrowserProcess(browser);
    await cdp.ready;

    const issueCollector = createBrowserIssueCollector();
    issueCollector.register(cdp);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await applyBrowserLocale(cdp);
    const toolApiRequestCollector = createToolApiRequestCollector();
    toolApiRequestCollector.register(cdp);
    const appSdkFixtureInterceptor = await installAppSdkFixtureInterceptor(
      cdp,
      () => issueCollector.ignoreNetworkErrorsFor(ROUTE_RENDER_TIMEOUT_MS),
    );

    // Chrome DevTools Protocol checks below execute the built production bundle in a real browser.
    await verifyRuntimeEnvironment(cdp, baseUrl);
    for (const route of BROWSER_SMOKE_ROUTES) {
      issueCollector.setActiveRoute(route.pathName);
      appSdkFixtureInterceptor.setActiveMode(route.appSdkFixtureMode);
      appSdkFixtureInterceptor.setActiveBackendMode(route.backendSdkFixtureMode);
      appSdkFixtureInterceptor.setActiveApiPlaygroundMode(route.apiPlaygroundFixtureMode);
      await verifyRouteDom(cdp, baseUrl, route, issueCollector, toolApiRequestCollector);
      verifiedRouteCount += 1;
    }
    issueCollector.setActiveRoute(null);
    if (verifiedRouteCount === 0) {
      throw new Error("Browser smoke did not verify any production routes.");
    }
    appSdkFixtureInterceptor.setActiveMode(null);
    appSdkFixtureInterceptor.setActiveBackendMode(null);
    appSdkFixtureInterceptor.setActiveApiPlaygroundMode(null);
    await verifySecurityPolicy(cdp);
    issueCollector.assertNoIssues();

    browserSmokeCompleted = true;
    console.log(`Portal production browser DOM smoke passed at ${baseUrl}; routes=${verifiedRouteCount}/${BROWSER_SMOKE_ROUTES.length}`);
  } catch (error) {
    primarySmokeError = error;
    throw error;
  } finally {
    if (cdp) {
      cdp.close();
    }
    await terminateProcess(browser);
    if (server) {
      await closeServer(server);
    }
    await cleanupBrowserUserDataDir(userDataDir);
    if (!primarySmokeError && !browserSmokeCompleted && verifiedRouteCount !== BROWSER_SMOKE_ROUTES.length) {
      throw new Error(
        `Browser smoke exited before completing production route verification: routes=${verifiedRouteCount}/${BROWSER_SMOKE_ROUTES.length}`,
      );
    }
    process.chdir(previousCwd);
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousServerBind === undefined) {
      delete process.env.SDKWORK_CLAW_SERVER_BIND;
    } else {
      process.env.SDKWORK_CLAW_SERVER_BIND = previousServerBind;
    }
    if (previousEdgeServer === undefined) {
      delete process.env.SDKWORK_CLAW_EDGE_SERVER;
    } else {
      process.env.SDKWORK_CLAW_EDGE_SERVER = previousEdgeServer;
    }
    if (previousPortalStaticDist === undefined) {
      delete process.env.SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST;
    } else {
      process.env.SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST = previousPortalStaticDist;
    }
    if (previousPublicApiBaseUrl === undefined) {
      delete process.env.PORTAL_PUBLIC_API_BASE_URL;
    } else {
      process.env.PORTAL_PUBLIC_API_BASE_URL = previousPublicApiBaseUrl;
    }
    if (previousPublicOpenApiBaseUrl === undefined) {
      delete process.env.PORTAL_PUBLIC_OPEN_API_BASE_URL;
    } else {
      process.env.PORTAL_PUBLIC_OPEN_API_BASE_URL = previousPublicOpenApiBaseUrl;
    }
    if (previousPublicAppApiBaseUrl === undefined) {
      delete process.env.PORTAL_PUBLIC_APP_API_BASE_URL;
    } else {
      process.env.PORTAL_PUBLIC_APP_API_BASE_URL = previousPublicAppApiBaseUrl;
    }
    if (previousPublicBackendApiBaseUrl === undefined) {
      delete process.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL;
    } else {
      process.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL = previousPublicBackendApiBaseUrl;
    }
    if (previousPublicToolApiEnabled === undefined) {
      delete process.env.PORTAL_PUBLIC_TOOL_API_ENABLED;
    } else {
      process.env.PORTAL_PUBLIC_TOOL_API_ENABLED = previousPublicToolApiEnabled;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
