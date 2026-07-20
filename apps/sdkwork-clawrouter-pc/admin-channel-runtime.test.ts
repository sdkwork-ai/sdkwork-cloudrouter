import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  ChannelAiResourceService,
  ChannelModelCatalogService,
  ChannelService,
} from "./packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts";
import {
  createAiResourceInputFromForm,
  createAiResourceUpdateInputFromForm,
  createChannelInputFromForm,
  createChannelCopyDraft,
  createChannelEditDraft,
  createChannelStatusUpdateInput,
  createChannelUpdateInputFromForm,
  resolveAuthTypeFormValue,
  resolveAuthTypeSubmitValue,
  resolveChannelSelectFormValue,
  resolveChannelSelectSubmitValue,
} from "./packages/sdkwork-clawrouter-pc-admin-channel/src/channelForm.ts";
import {
  deriveChannelTargetVendorCodes,
  isAiResourceGroupVisibleForChannelVendorScope,
  isAiResourceVisibleForChannelVendorScope,
  isDirectChannelBindableAiResource,
  reconcileChannelVendorSelection,
} from "./packages/sdkwork-clawrouter-pc-admin-channel/src/channelVendorSelection.ts";
import { authTypesList, knownModelVendors, protocolsList } from "./packages/sdkwork-clawrouter-pc-admin-channel/src/channelOptions.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

function readAdminChannelI18nSource(): string {
  return [
    "./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/channel.ts",
    "./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/channel-resource-routing.ts",
  ]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n");
}

type CapturedBackendRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

async function withBackendSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedBackendRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedBackendRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: { dispatchEvent: () => true },
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

function channelContractDefaults() {
  return {
    channelId: "9001",
    channelType: "official",
    credentialRotation: "default",
    credentials: [
      {
        id: "credential-1",
        credentialId: "10001",
        name: "Primary",
        baseUrl: "https://api.openai.com/v1",
        secretRef: "secret://ai-channel-credentials/openai/primary",
        apiKey: "sk-live-openai",
        maskedLabel: "sk-l***enai",
        priority: 1,
        weight: 100,
        status: "active",
        errors: 0,
      },
    ],
    resourceCodes: [],
  } as const;
}

function channelCredentialForm(overrides: Record<string, unknown> = {}) {
  return {
    name: "Primary",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-openai",
    priority: 1,
    weight: 100,
    status: "active",
    ...overrides,
  };
}

test("admin channel create input does not reuse returned channel view model", () => {
  const input = createChannelInputFromForm({
    name: " OpenAI Primary ",
    vendor: " OpenAI ",
    channelType: " relay ",
    protocol: " OpenAI ",
    accessType: " Standard API Key ",
    credentials: [channelCredentialForm({ baseUrl: " https://api.openai.com/v1 ", apiKey: " sk-live-openai " })],
    expiresAt: " 2026-06-30T08:00:00Z ",
    capabilities: ["llm", " image ", "llm"],
    resourceCodes: [" Bundle.OpenRouter.OpenAI.Chat ", "bundle.openrouter.openai.chat"],
    circuitBreakerEnabled: true,
    circuitBreakerFailureThreshold: "4",
    weight: 125,
    status: "active",
  });

  assert.deepEqual(input, {
    name: "OpenAI Primary",
    vendor: "OpenAI",
    channelType: "relay",
    protocol: "OpenAI",
    accessType: "Standard API Key",
    credentials: [
      {
        name: "Primary",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-live-openai",
        priority: 1,
        weight: 100,
        status: "active",
      },
    ],
    expiresAt: "2026-06-30T08:00:00Z",
    capabilities: ["llm", "image"],
    resourceCodes: ["bundle.openrouter.openai.chat"],
    circuitBreakerPolicy: { failureThreshold: 4 },
    weight: 125,
    status: "active",
  });
  for (const field of ["id", "isMultimodal", "balance", "errors"]) {
    assert.equal(field in input, false);
  }
  for (const field of ["baseUrl", "apiKey", "secretRef"]) {
    assert.equal(field in input, false);
  }
});

test("admin channel service creates accounts with multiple upstream credentials and rotation", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/integration/channels" && method === "POST") {
        return {
          item: {
            id: "channel-multi-credential",
            name: "OpenAI Multi",
            vendor: "OpenAI",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            credentialRotation: "round_robin",
            credentials: [
              {
                id: "credential-1",
                credentialId: "10001",
                name: "Primary",
                baseUrl: "https://api.openai.com/v1",
                secretRef: "secret://ai-channel-credentials/openai/primary",
                apiKey: "sk-primary",
                maskedLabel: "sk-p***mary",
                priority: 10,
                weight: 100,
                status: "active",
                errors: 0,
              },
              {
                id: "credential-2",
                credentialId: "10002",
                name: "Backup",
                baseUrl: "https://backup.openai.example/v1",
                secretRef: "secret://ai-channel-credentials/openai/backup",
                apiKey: "sk-backup",
                maskedLabel: "sk-b***ckup",
                priority: 20,
                weight: 50,
                status: "active",
                errors: 0,
              },
            ],
            createdAt: "2026-05-05T08:00:00Z",
            capabilities: ["llm"],
            resourceCodes: [],
            isMultimodal: false,
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const created = await ChannelService.addChannel({
        name: "OpenAI Multi",
        vendor: "OpenAI",
        protocol: "OpenAI",
        accessType: "api-key",
        credentialRotation: "round_robin",
        credentials: [
          {
            name: " Primary ",
            baseUrl: " https://api.openai.com/v1 ",
            apiKey: " sk-primary ",
            priority: 10,
            weight: 100,
            status: "active",
          },
          {
            name: " Backup ",
            baseUrl: " https://backup.openai.example/v1 ",
            apiKey: " sk-backup ",
            priority: 20,
            weight: 50,
            status: "active",
          },
        ],
        capabilities: ["llm"],
        weight: 100,
        status: "active",
      });

      assert.equal(created.credentialRotation, "round_robin");
      assert.deepEqual(
        created.credentials.map((credential) => ({
          name: credential.name,
          baseUrl: credential.baseUrl,
          maskedLabel: credential.maskedLabel,
          priority: credential.priority,
          weight: credential.weight,
        })),
        [
          {
            name: "Primary",
            baseUrl: "https://api.openai.com/v1",
            maskedLabel: "sk-p***mary",
            priority: 10,
            weight: 100,
          },
          {
            name: "Backup",
            baseUrl: "https://backup.openai.example/v1",
            maskedLabel: "sk-b***ckup",
            priority: 20,
            weight: 50,
          },
        ],
      );
      assert.equal(captured.length, 1);
      const body = JSON.parse(captured[0].body);
      assert.equal("baseUrl" in body, false);
      assert.equal("apiKey" in body, false);
      assert.equal("secretRef" in body, false);
      assert.deepEqual(body, {
        name: "OpenAI Multi",
        vendor: "OpenAI",
        protocol: "OpenAI",
        accessType: "api-key",
        credentialRotation: "round_robin",
        credentials: [
          {
            name: "Primary",
            baseUrl: "https://api.openai.com/v1",
            apiKey: "sk-primary",
            priority: "10",
            weight: "100",
            status: "active",
          },
          {
            name: "Backup",
            baseUrl: "https://backup.openai.example/v1",
            apiKey: "sk-backup",
            priority: "20",
            weight: "50",
            status: "active",
          },
        ],
        capabilities: ["llm"],
        weight: "100",
        status: "active",
      });
    },
  );
});

test("admin channel service creates provider accounts without model resource bindings", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/integration/channels" && method === "POST") {
        return {
          item: {
            id: "channel-no-model-bindings",
            name: "OpenAI Account",
            vendor: "OpenAI",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            createdAt: "2026-06-04T08:00:00Z",
            capabilities: ["llm"],
            resourceCodes: ["vendor.openai"],
            isMultimodal: false,
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const created = await ChannelService.addChannel({
        name: "OpenAI Account",
        vendor: "OpenAI",
        channelType: "official",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm()],
        capabilities: ["llm"],
        resourceCodes: ["vendor.openai"],
        weight: 100,
        status: "active",
      });

      assert.equal("models" in created, false);
      assert.equal(captured.length, 1);
      const body = JSON.parse(captured[0].body);
      assert.equal("models" in body, false);
      assert.deepEqual(body.resourceCodes, ["vendor.openai"]);
    },
  );
});

test("admin channel form treats empty expiration as never expires by default", () => {
  const createInput = createChannelInputFromForm({
    name: "OpenAI",
    vendor: "OpenAI",
    protocol: "OpenAI",
    accessType: "api-key",
    credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-openai" })],
    expiresAt: " ",
    capabilities: ["llm"],
    weight: 100,
    status: "active",
  });
  assert.equal("expiresAt" in createInput, false);

  const updateInput = createChannelUpdateInputFromForm({
    name: "OpenAI",
    vendor: "OpenAI",
    protocol: "OpenAI",
    accessType: "api-key",
    credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: " " })],
    expiresAt: " ",
    capabilities: ["llm"],
    weight: 100,
    status: "active",
  });
  assert.equal(updateInput.expiresAt, null);

  const updateWithExpiry = createChannelUpdateInputFromForm({
    name: "OpenAI",
    vendor: "OpenAI",
    protocol: "OpenAI",
    accessType: "api-key",
    credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: " " })],
    expiresAt: " 2026-07-01T00:00:00Z ",
    capabilities: ["llm"],
    weight: 100,
    status: "active",
  });
  assert.equal(updateWithExpiry.expiresAt, "2026-07-01T00:00:00Z");
});

test("admin channel vendor selection supports official single vendor and relay multi vendor resources", () => {
  assert.deepEqual(
    deriveChannelTargetVendorCodes({
      channelType: "official",
      accountVendor: "OpenAI",
      modelMappings: [{ targetModel: "anthropic/claude-3-5-sonnet" }],
      resourceCodes: ["vendor.anthropic"],
    }),
    ["openai"],
  );
  assert.deepEqual(
    deriveChannelTargetVendorCodes({
      channelType: "relay",
      accountVendor: "OpenRouter",
      modelMappings: [
        { targetModel: "openai/gpt-4o" },
        { targetModel: "anthropic/claude-3-5-sonnet" },
      ],
      resourceCodes: ["vendor.google"],
    }),
    ["openai", "anthropic", "google"],
  );

  assert.deepEqual(
    reconcileChannelVendorSelection({
      channelType: "official",
      accountVendor: "OpenAI",
      selectedVendorCodes: ["openai", "anthropic"],
      selectedResourceCodes: ["vendor.anthropic", "bundle.openrouter.openai.chat"],
      availableResourceCodes: ["vendor.openai", "vendor.anthropic"],
    }),
    {
      selectedVendorCodes: ["openai"],
      selectedResourceCodes: ["bundle.openrouter.openai.chat", "vendor.openai"],
    },
  );

  assert.deepEqual(
    reconcileChannelVendorSelection({
      channelType: "relay",
      accountVendor: "OpenRouter",
      selectedVendorCodes: ["openai", "anthropic"],
      selectedResourceCodes: ["vendor.google", "bundle.openrouter.openai.chat"],
      availableResourceCodes: ["vendor.openai", "vendor.anthropic", "vendor.google"],
    }),
    {
      selectedVendorCodes: ["openai", "anthropic"],
      selectedResourceCodes: ["bundle.openrouter.openai.chat", "vendor.openai", "vendor.anthropic"],
    },
  );
});

test("admin channel relay vendor selection initializes from multiple vendor resources", () => {
  assert.deepEqual(
    deriveChannelTargetVendorCodes({
      channelType: "relay",
      accountVendor: "OpenRouter",
      resourceCodes: ["vendor.openai", "vendor.anthropic", "vendor.google"],
    }),
    ["openai", "anthropic", "google"],
  );

  assert.deepEqual(
    reconcileChannelVendorSelection({
      channelType: "relay",
      accountVendor: "OpenRouter",
      selectedVendorCodes: ["openai", "anthropic", "google"],
      selectedResourceCodes: ["vendor.openai", "vendor.anthropic", "vendor.google"],
      availableResourceCodes: ["vendor.openai", "vendor.anthropic", "vendor.google"],
    }),
    {
      selectedVendorCodes: ["openai", "anthropic", "google"],
      selectedResourceCodes: ["vendor.openai", "vendor.anthropic", "vendor.google"],
    },
  );
});

test("admin channel AI resource selector only exposes direct resources for selected vendors", () => {
  assert.equal(
    isDirectChannelBindableAiResource({
      resourceCode: "vendor.openai",
      resourceType: "vendor",
      vendorCode: "openai",
    }),
    false,
  );
  assert.equal(
    isDirectChannelBindableAiResource({
      resourceCode: "modality.chat",
      resourceType: "modality",
      vendorCode: null,
    }),
    false,
  );
  assert.equal(
    isDirectChannelBindableAiResource({
      resourceCode: "api.openai.responses",
      resourceType: "api_endpoint",
      vendorCode: "OpenAI",
    }),
    true,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.openai.responses",
        resourceType: "api_endpoint",
        vendorCode: "OpenAI",
        capabilities: ["llm", "chat"],
      },
      ["openai"],
      ["llm"],
    ),
    true,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.openai.images",
        resourceType: "api_endpoint",
        vendorCode: "OpenAI",
        capability: "image",
        capabilities: ["image"],
      },
      ["openai"],
      ["llm"],
    ),
    false,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.openai.embeddings",
        resourceType: "api_endpoint",
        vendorCode: "OpenAI",
        capability: "embedding",
        capabilities: ["embedding", "embeddings", "llm"],
      },
      ["openai"],
      ["llm"],
    ),
    false,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.openai.files",
        resourceType: "api_endpoint",
        vendorCode: "OpenAI",
        capability: "network",
        capabilities: ["network", "http"],
      },
      ["openai"],
      ["llm"],
    ),
    false,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.openai.audio.speech",
        resourceType: "api_endpoint",
        vendorCode: "OpenAI",
        capability: "speech",
      },
      ["openai"],
      ["audio"],
    ),
    true,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.anthropic.messages",
        resourceType: "api_endpoint",
        vendorCode: "Anthropic",
      },
      ["openai"],
    ),
    false,
  );
  assert.equal(
    isAiResourceVisibleForChannelVendorScope(
      {
        resourceCode: "api.generic.responses",
        resourceType: "api_endpoint",
        vendorCode: null,
      },
      ["openai"],
    ),
    false,
  );
  assert.equal(
    isAiResourceGroupVisibleForChannelVendorScope(
      {
        groupCode: "api.openai.chat",
        groupName: "OpenAI Chat API",
        vendorCodes: ["openai"],
        capabilities: ["llm"],
      },
      ["openai"],
      ["llm"],
    ),
    true,
  );
  assert.equal(
    isAiResourceGroupVisibleForChannelVendorScope(
      {
        groupCode: "api.openai_compatible.all",
        groupName: "All OpenAI Compatible APIs",
        vendorCodes: ["openai"],
        capabilities: ["llm", "image", "audio", "video", "embedding"],
      },
      ["openai"],
      ["llm"],
    ),
    false,
  );
});

test("admin channel create input rejects invalid optional values before persistence", () => {
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: " Custom ",
        vendor: " Custom ",
        protocol: " ",
        accessType: " ",
        credentials: [channelCredentialForm({ baseUrl: "https://api.example.com/v1", apiKey: " sk-custom " })],
        capabilities: [],
        circuitBreakerEnabled: true,
        circuitBreakerFailureThreshold: "0",
        weight: Number.NaN,
        status: "active",
      }),
    /weight must be a positive integer/,
  );
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: " Custom ",
        vendor: " Custom ",
        protocol: " ",
        accessType: " ",
        credentials: [channelCredentialForm({ baseUrl: "https://api.example.com/v1", apiKey: " sk-custom " })],
        capabilities: [],
        weight: 100,
        status: "archived",
      }),
    /Unsupported channel status: archived/,
  );
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: " Custom ",
        vendor: " Custom ",
        protocol: " ",
        accessType: " ",
        credentials: [channelCredentialForm({ baseUrl: "https://api.example.com/v1", apiKey: " sk-custom " })],
        capabilities: ["llm", "unknown"],
        weight: 100,
        status: "active",
      }),
    /Unsupported channel capability: unknown/,
  );
});

test("admin channel form normalizes and validates circuit breaker policy", () => {
  assert.deepEqual(
    createChannelInputFromForm({
      name: "OpenAI",
      vendor: "OpenAI",
      protocol: "OpenAI",
      accessType: "api-key",
      credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", secretRef: "vault://providers/openai/main", apiKey: undefined })],
      capabilities: ["llm"],
      circuitBreakerEnabled: true,
      circuitBreakerFailureThreshold: "2",
      weight: 100,
      status: "active",
    }).circuitBreakerPolicy,
    { failureThreshold: 2 },
  );
  assert.equal(
    createChannelInputFromForm({
      name: "OpenAI",
      vendor: "OpenAI",
      protocol: "OpenAI",
      accessType: "api-key",
      credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", secretRef: "vault://providers/openai/main", apiKey: undefined })],
      capabilities: ["llm"],
      circuitBreakerEnabled: false,
      circuitBreakerFailureThreshold: "2",
      weight: 100,
      status: "active",
    }).circuitBreakerPolicy,
    undefined,
  );
  assert.deepEqual(
    createChannelUpdateInputFromForm({
      name: "OpenAI",
      vendor: "OpenAI",
      protocol: "OpenAI",
      accessType: "api-key",
      credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", secretRef: "vault://providers/openai/main", apiKey: undefined })],
      capabilities: ["llm"],
      circuitBreakerEnabled: false,
      circuitBreakerFailureThreshold: "",
      weight: 100,
      status: "active",
    }).circuitBreakerPolicy,
    null,
  );
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: "OpenAI",
        vendor: "OpenAI",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", secretRef: "vault://providers/openai/main", apiKey: undefined })],
        capabilities: ["llm"],
        circuitBreakerEnabled: true,
        circuitBreakerFailureThreshold: "101",
        weight: 100,
        status: "active",
      }),
    /circuitBreakerPolicy.failureThreshold must be between 1 and 100/,
  );
});

test("admin channel update input does not reuse returned channel view model", () => {
  const input = createChannelUpdateInputFromForm({
    name: " Anthropic Backup ",
    vendor: " Anthropic ",
    channelType: " official ",
    protocol: " Anthropic ",
    accessType: " Standard API Key ",
    credentials: [],
    capabilities: ["llm"],
    resourceCodes: [" Vendor.Anthropic.Chat "],
    circuitBreakerEnabled: false,
    circuitBreakerFailureThreshold: "",
    weight: 20,
    status: "disabled",
  });

  assert.deepEqual(input, {
    name: "Anthropic Backup",
    vendor: "Anthropic",
    channelType: "official",
    protocol: "Anthropic",
    accessType: "Standard API Key",
    capabilities: ["llm"],
    resourceCodes: ["vendor.anthropic.chat"],
    circuitBreakerPolicy: null,
    weight: 20,
    status: "disabled",
  });
  for (const field of ["id", "isMultimodal", "balance", "errors"]) {
    assert.equal(field in input, false);
  }
});

test("admin channel update input preserves an explicit empty AI resource list", () => {
  const input = createChannelUpdateInputFromForm({
    name: "OpenAI Primary",
    vendor: "OpenAI",
    channelType: "official",
    protocol: "OpenAI",
    accessType: "api-key",
    credentials: [],
    capabilities: ["llm"],
    resourceCodes: [],
    circuitBreakerEnabled: false,
    circuitBreakerFailureThreshold: "",
    weight: 100,
    status: "active",
  });

  assert.equal("resourceCodes" in input, true);
  assert.deepEqual(input.resourceCodes, []);
  assert.equal("credentials" in input, false);
});

test("admin channel copy-create draft reuses routing settings but clears secret material", () => {
  const sourceChannel = {
    id: "channel-1",
    name: "OpenAI Primary",
    vendor: "OpenAI",
    ...channelContractDefaults(),
    protocol: "OpenAI",
    accessType: "api-key",
    createdAt: "2026-05-05T08:00:00Z",
    expiresAt: "2026-06-30T08:00:00Z",
    capabilities: ["llm", "image"],
    isMultimodal: true,
    circuitBreakerPolicy: { failureThreshold: 2 },
    weight: 100,
    status: "error" as const,
    balance: "$20.00",
    errors: 2,
  };

  const editDraft = createChannelEditDraft(sourceChannel);
  const copyDraft = createChannelCopyDraft(sourceChannel);

  assert.deepEqual(editDraft, {
    name: "OpenAI Primary",
    vendor: "OpenAI",
    channelType: "official",
    protocol: "OpenAI",
    accessType: "api-key",
    credentialRotation: "default",
    credentials: [
      {
        name: "Primary",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        secretRef: "secret://ai-channel-credentials/openai/primary",
        priority: 1,
        weight: 100,
        status: "active",
      },
    ],
    expiresAt: "2026-06-30T08:00:00Z",
    capabilities: ["llm", "image"],
    resourceCodes: [],
    circuitBreakerEnabled: true,
    circuitBreakerFailureThreshold: 2,
    weight: 100,
    status: "error",
  });
  assert.deepEqual(copyDraft, {
    name: "OpenAI Primary",
    vendor: "OpenAI",
    channelType: "official",
    protocol: "OpenAI",
    accessType: "api-key",
    credentialRotation: "default",
    credentials: [
      {
        name: "Primary",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        secretRef: "",
        priority: 1,
        weight: 100,
        status: "active",
      },
    ],
    expiresAt: "2026-06-30T08:00:00Z",
    capabilities: ["llm", "image"],
    resourceCodes: [],
    circuitBreakerEnabled: true,
    circuitBreakerFailureThreshold: 2,
    weight: 100,
    status: "disabled",
  });
  assert.notEqual(copyDraft.capabilities, sourceChannel.capabilities);
  assert.equal("id" in copyDraft, false);
  assert.equal("baseUrl" in copyDraft, false);
  assert.equal("apiKey" in copyDraft, false);
  assert.equal("secretRef" in copyDraft, false);
  assert.deepEqual(copyDraft.credentials.map((credential) => credential.secretRef), [""]);
});

test("admin channel account form normalizes channel type and AI resource codes", () => {
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: "Relay",
        vendor: "OpenRouter",
        channelType: "aggregator",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm({ baseUrl: "https://openrouter.ai/api/v1", apiKey: "sk-relay" })],
        capabilities: ["llm"],
        resourceCodes: ["bundle.openrouter.openai.chat"],
        weight: 100,
        status: "active",
      }),
    /Unsupported channel type: aggregator/,
  );
  assert.throws(
    () =>
      createChannelInputFromForm({
        name: "Relay",
        vendor: "OpenRouter",
        channelType: "relay",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm({ baseUrl: "https://openrouter.ai/api/v1", apiKey: "sk-relay" })],
        capabilities: ["llm"],
        resourceCodes: ["bundle/openrouter/openai/chat"],
        weight: 100,
        status: "active",
      }),
    /Unsupported AI resource code: bundle\/openrouter\/openai\/chat/,
  );
});

test("admin channel status update input is a minimal command", () => {
  assert.deepEqual(createChannelStatusUpdateInput("disabled"), { status: "disabled" });
  assert.deepEqual(createChannelStatusUpdateInput("active"), { status: "active" });
});

test("admin AI resource form creates structured commands and preserves optional field semantics", () => {
  const createInput = createAiResourceInputFromForm({
    resourceCode: " Bundle.OpenRouter.OpenAI.Chat ",
    resourceType: " bundle ",
    displayName: " OpenRouter OpenAI Chat ",
    vendorCode: " OpenAI ",
    modalityCode: " Chat ",
    apiEndpointCode: " Chat_Completions ",
    catalogKey: " openai/gpt-5.5 ",
    model: " gpt-5.5 ",
    providerNativeModel: " gpt-5.5 ",
    compositionMode: " any ",
    status: " active ",
    sortOrder: "10",
    membersText: [
      " Model.OpenAI.GPT-5.5.Chat | included | true | 1 ",
      "model.openai.gpt-4o-mini.chat|fallback|false|2",
    ].join("\n"),
  });

  assert.deepEqual(createInput, {
    resourceCode: "Bundle.OpenRouter.OpenAI.Chat",
    resourceType: "bundle",
    displayName: "OpenRouter OpenAI Chat",
    vendorCode: "OpenAI",
    modalityCode: "Chat",
    apiEndpointCode: "Chat_Completions",
    catalogKey: "openai/gpt-5.5",
    model: "gpt-5.5",
    providerNativeModel: "gpt-5.5",
    compositionMode: "any",
    status: "active",
    sortOrder: 10,
    members: [
      {
        memberResourceCode: "Model.OpenAI.GPT-5.5.Chat",
        memberRole: "included",
        required: true,
        sortOrder: 1,
      },
      {
        memberResourceCode: "model.openai.gpt-4o-mini.chat",
        memberRole: "fallback",
        required: false,
        sortOrder: 2,
      },
    ],
  });

  const updateInput = createAiResourceUpdateInputFromForm({
    resourceCode: " ",
    resourceType: " ",
    displayName: " OpenRouter Realtime ",
    vendorCode: " ",
    modalityCode: " ",
    apiEndpointCode: " ",
    catalogKey: " ",
    model: " ",
    providerNativeModel: " ",
    compositionMode: " ",
    status: " disabled ",
    sortOrder: " ",
    membersText: " ",
  });

  assert.deepEqual(updateInput, {
    displayName: "OpenRouter Realtime",
    vendorCode: null,
    modalityCode: null,
    apiEndpointCode: null,
    catalogKey: null,
    model: null,
    providerNativeModel: null,
    status: "disabled",
    sortOrder: null,
    members: [],
  });
});

test("admin AI resource form rejects malformed member lines", () => {
  assert.throws(
    () => createAiResourceInputFromForm({
      resourceCode: "bundle.openrouter.openai.chat",
      resourceType: "bundle",
      displayName: "OpenRouter OpenAI Chat",
      membersText: "model.openai.gpt-5.5.chat | unknown | true | 1",
    }),
    /Unsupported AI resource member role: unknown/,
  );
  assert.throws(
    () => createAiResourceInputFromForm({
      resourceCode: "bundle.openrouter.openai.chat",
      resourceType: "bundle",
      displayName: "OpenRouter OpenAI Chat",
      membersText: "model.openai.gpt-5.5.chat | included | maybe | 1",
    }),
    /members\[0\]\.required must be true or false/,
  );
  assert.throws(
    () => createAiResourceInputFromForm({
      resourceCode: "bundle.openrouter.openai.chat",
      resourceType: "bundle",
      displayName: "OpenRouter OpenAI Chat",
      sortOrder: "-1",
    }),
    /sortOrder must be a non-negative integer/,
  );
});

test("admin channel modal rejects invalid traffic weight instead of defaulting it", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /readPositiveIntegerFormValue\(formData, 'weight'/);
  assert.doesNotMatch(source, /Number\.parseInt\(String\(formData\.get\('weight'\) \?\? '100'\), 10\)/);
  assert.doesNotMatch(source, /weight:\s*Number\.isFinite\(weight\) && weight > 0 \? weight : 100/);
});

test("admin channel account drawer replaces the centered modal shell", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-admin-channel-account-drawer/);
  assert.match(source, /className="fixed inset-0 z-50 flex justify-start bg-slate-900\/50 backdrop-blur-sm"/);
  assert.match(source, /className="relative flex h-full w-\[80vw\] max-w-\[80vw\] flex-col overflow-hidden border-r/);
  assert.match(source, /className="flex min-h-0 flex-1 overflow-hidden"/);
  assert.match(source, /className="shrink-0 border-t border-slate-200/);
  assert.doesNotMatch(source, /fixed inset-0 z-50 flex justify-end bg-slate-900\/50/);
  assert.doesNotMatch(source, /h-full w-full max-w-5xl flex-col overflow-hidden border-l/);
  assert.doesNotMatch(source, /items-center justify-center p-4 bg-slate-900\/50/);
  assert.doesNotMatch(source, /rounded-2xl shadow-xl w-full max-w-6xl/);
});

test("admin channel drawer keeps credential rotation compact and edits one credential tab at a time", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[apiKeyVisible, setApiKeyVisible\] = useState\(false\)/);
  assert.match(source, /const \[activeCredentialId, setActiveCredentialId\] = useState\(''\)/);
  assert.match(source, /data-admin-channel-credentials-editor/);
  assert.match(source, /data-admin-channel-credential-rotation/);
  assert.match(source, /<select[\s\S]*data-admin-channel-credential-rotation/);
  assert.match(source, /credentialRotationOptions\.map\(\(option\) => \(/);
  assert.match(source, /data-admin-channel-credential-controls/);
  assert.match(source, /data-admin-channel-credential-controls[\s\S]*data-admin-channel-credential-mode-select[\s\S]*data-admin-channel-credential-rotation/);
  assert.match(source, /data-admin-channel-credential-tabs/);
  assert.match(source, /data-admin-channel-active-credential-form/);
  assert.doesNotMatch(source, /data-admin-channel-credential-list/);
  assert.doesNotMatch(source, /data-admin-channel-credential-row/);
  assert.match(source, /admin\.channel\.fields\.credentialRotation/);
  assert.match(source, /setActiveCredentialId\(nextCredential\.localId\)/);
  assert.match(source, /data-admin-channel-api-key-input-shell/);
  assert.match(source, /data-admin-channel-api-key-visibility-toggle/);
  assert.match(source, /className="pointer-events-auto absolute inset-y-0 right-2/);
  assert.match(source, /<div className="sm:col-span-2">\s*<label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">\{t\('admin\.channel\.fields\.baseUrl'\)\}<\/label>/);
  assert.doesNotMatch(source, /value=\{activeCredential\.name \?\? ''\}/);
  assert.doesNotMatch(source, /placeholder=\{t\('admin\.channel\.placeholders\.credentialName'\)\}/);
  assert.match(source, /type=\{apiKeyVisible \? 'text' : 'password'\}/);
  assert.match(source, /apiKeyVisible \? <EyeOff className="h-3\.5 w-3\.5" \/> : <Eye className="h-3\.5 w-3\.5" \/>/);
  assert.doesNotMatch(source, /inline-flex items-center gap-1\.5 rounded-lg border[\s\S]{0,320}admin\.channel\.actions\.showApiKey/);
  assert.doesNotMatch(source, /credentialSecretHelp/);
  assert.doesNotMatch(source, /selectedCredentialRotationOption\.descKey/);
  assert.doesNotMatch(source, /selectedCredentialRotationOption\.labelKey/);
});

test("admin channel credential details can reveal returned plaintext api key", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[apiKeyVisible, setApiKeyVisible\] = useState\(false\)/);
  assert.match(source, /channel\.credentials\.map\(\(credential, index\) =>/);
  assert.match(source, /const apiKeyDisplayValue = apiKeyVisible[\s\S]*credential\.apiKey \?\? ''[\s\S]*maskApiKeyForDisplay\(credential\.apiKey\)/);
  assert.match(source, /value=\{apiKeyDisplayValue\}/);
  assert.match(source, /onCopy=\{\(\) => onCopyCredentialApiKey\(credential\)\}/);
  assert.doesNotMatch(source, /resolveVisibleApiKey\(channel\)/);
  assert.doesNotMatch(source, /value=\{apiKeyVisible \? channel\.apiKey : maskApiKeyForDisplay\(channel\.apiKey\)\}/);
  assert.match(source, /onToggleVisibility=\{\(\) => setApiKeyVisible\(\(current\) => !current\)\}/);
  assert.match(source, /admin\.channel\.credentials\.apiKeyUnavailable/);
});

test("admin channel account lifetime fields are shown with never-expires default copy", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  assert.match(source, /name="expiresAt"/);
  assert.match(source, /type="datetime-local"/);
  assert.match(source, /admin\.channel\.fields\.createdAt/);
  assert.match(source, /admin\.channel\.fields\.expiresAt/);
  assert.match(source, /admin\.channel\.table\.createdAt/);
  assert.match(source, /admin\.channel\.table\.expiresAt/);
  assert.match(source, /admin\.channel\.expiration\.never/);
  assert.match(source, /<BusinessStateTableRow colSpan=\{8\}/);
  assert.match(source, /label=\{t\('admin\.channel\.fields\.createdAt'\)\} value=\{displayChannelTime\(channel\.createdAt/);
  assert.match(source, /label=\{t\('admin\.channel\.fields\.expiresAt'\)\}[\s\S]+admin\.channel\.expiration\.never/);

  for (const key of [
    "admin.channel.fields.createdAt",
    "admin.channel.fields.expiresAt",
    "admin.channel.table.createdAt",
    "admin.channel.table.expiresAt",
    "admin.channel.expiration.never",
    "admin.channel.help.expiresAt",
  ]) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel list omits account model allowlist cells and shows actions by default", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<ChannelModelsCell/);
  assert.doesNotMatch(source, /function ChannelModelsCell/);
  assert.doesNotMatch(source, /admin\.channel\.modelCount/);
  assert.doesNotMatch(source, /admin\.channel\.table\.models/);
  assert.doesNotMatch(source, /(?<!admin\.)channel\.models/);
  assert.doesNotMatch(source, /channel\.models\.slice\(0, 3\)\.map/);
  assert.doesNotMatch(source, /\+{channel\.models\.length - 3}/);
  assert.doesNotMatch(source, /opacity-0 group-hover:opacity-100/);
  assert.match(source, /className="flex items-center justify-end gap-1"/);
});

test("admin channel row actions expose copy-create without copying credentials", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  assert.match(source, /type AccountDrawerMode = 'create' \| 'copy' \| 'edit'/);
  assert.match(source, /const openCopyCreateModal = \(channel: ChannelItem\) =>/);
  assert.match(source, /setChannelFormDraft\(createChannelCopyDraft\(channel\)\)/);
  assert.match(source, /mode === 'copy'\s+\? t\('admin\.channel\.modals\.copyChannelTitle'\)/);
  assert.match(source, /title=\{t\('admin\.channel\.actions\.copyCreateChannel'\)\}/);
  assert.match(source, /onClick=\{\(\) => openCopyCreateModal\(channel\)\}/);
  assert.match(source, /<Copy className="w-4 h-4" \/>/);
  assert.doesNotMatch(source, /defaultValue=\{initialValues\?\.apiKey/);

  for (const key of [
    "admin.channel.actions.copyCreateChannel",
    "admin.channel.modals.copyChannelTitle",
  ]) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel drawer separates target models from mapping rules in the model routing workbench", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[vendorPickerOpen, setVendorPickerOpen\] = useState\(false\)/);
  assert.match(source, /function ChannelVendorPickerModal/);
  assert.match(source, /data-admin-channel-vendor-picker-modal/);
  assert.match(source, /onClick=\{\(\) => setVendorPickerOpen\(true\)\}/);
  assert.match(source, /activeAccountDrawerTab/);
  assert.match(source, /data-admin-channel-right-tabs/);
  assert.match(source, /className="min-w-0 w-\[40%\] max-w-\[40%\] shrink-0/);
  assert.match(source, /data-admin-channel-right-panel/);
  assert.match(source, /data-admin-channel-model-routing-card/);
  assert.match(source, /data-admin-channel-model-route-tabs/);
  assert.match(source, /data-admin-channel-target-models-tab/);
  assert.match(source, /data-admin-channel-mapping-rules-tab/);
  assert.match(source, /data-admin-channel-target-models-table/);
  assert.match(source, /data-admin-channel-mapping-rules-table/);
  assert.match(source, /data-admin-channel-select-target-model/);
  assert.match(source, /data-admin-channel-add-mapping-rule/);
  assert.match(source, /data-admin-channel-generate-same-name-mappings/);
  assert.match(source, /function ChannelTargetModelSelectorModal/);
  assert.match(source, /function ChannelMappingRuleModal/);
  assert.match(source, /data-admin-channel-target-model-selector-modal/);
  assert.match(source, /data-admin-channel-mapping-rule-modal/);
  assert.match(source, /data-admin-channel-account-type-vendor-picker/);
  assert.doesNotMatch(source, /data-admin-channel-model-mapping-header-vendor-button/);
  assert.doesNotMatch(source, /data-admin-channel-model-mapping-sidebar/);
  assert.doesNotMatch(source, /data-admin-channel-model-catalog-table/);
  assert.doesNotMatch(source, /activeMappingVendorCode/);
  assert.match(source, /modelMappingsByVendor/);
  assert.match(source, /targetModelsByVendor/);
  assert.match(source, /activeModelRouteTab/);
  assert.match(source, /addTargetModel/);
  assert.match(source, /removeTargetModel/);
  assert.match(source, /upsertModelMappingRule/);
  assert.match(source, /generateSameNameMappings/);
  assert.doesNotMatch(source, /addCustomModelMapping/);
  assert.doesNotMatch(source, /customMappingSourceModel/);
  assert.doesNotMatch(source, /customMappingTargetModel/);
  assert.doesNotMatch(source, /admin\.channel\.models\.customMapping/);
  assert.match(source, /const modelMappingRows = flattenModelMappings\(modelMappingsByVendor\)/);
  assert.match(source, /const models = flattenTargetModels\(targetModelsByVendor\)/);
  assert.match(source, /models,/);
  assert.match(source, /modelMappings: accountModelMappingInputs\(modelMappingRows, accountVendorCode\)/);
  assert.match(source, /AccountModelMappingService\.replaceAccountMappings/);
  assert.match(source, /nextRows\.some\(\(row\) => row\.sourceModel === normalizedSourceModel && row\.targetModel === normalizedTargetModel\)/);
  assert.doesNotMatch(source, /max-h-44|max-h-56|max-h-\[520px\]|min-h-\[440px\]/);
  assert.doesNotMatch(source, /<select[\s\S]*admin\.channel\.vendorPicker\.accountVendor[\s\S]*knownModelVendors\.map/s);
  assert.doesNotMatch(source, /Model mapping/);
  assert.doesNotMatch(source, /Only the target model values are persisted for this channel/);
  assert.doesNotMatch(source, /modelMode === 'mapping'/);
  assert.doesNotMatch(source, /Gateway model|Provider model/);
});

test("admin channel drawer permits accounts without target model bindings", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  assert.match(source, /const models = flattenTargetModels\(targetModelsByVendor\)/);
  assert.match(source, /models,/);
  assert.doesNotMatch(source, /models\.length === 0/);
  assert.doesNotMatch(source, /admin\.channel\.validation\.modelRequired/);
  assert.doesNotMatch(i18nSource, /admin\.channel\.validation\.modelRequired/);
});

test("admin channel custom mappings preserve source and target model pairs for channel-bound mapping rules", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /type AccountModelMappingRow = \{[\s\S]*sourceModel: string;[\s\S]*targetModel: string;/);
  assert.match(source, /function flattenModelMappings\(mappings: AccountModelMappingsByVendor\): AccountModelMappingRow\[\]/);
  assert.match(source, /type ChannelTargetModelsByVendor = Record<string, string\[\]>/);
  assert.match(source, /function flattenTargetModels\(modelsByVendor: ChannelTargetModelsByVendor\): string\[\]/);
  assert.match(source, /function validateTargetModelVendorScope\(/);
  assert.match(source, /function validateMappingTargetsExist\(/);
  assert.doesNotMatch(source, /function flattenModelMappings\(mappings: AccountModelMappingsByVendor\): string\[\]/);
  assert.match(source, /sourceModel: row\.sourceModel\.trim\(\)/);
  assert.match(source, /targetModel: row\.targetModel\.trim\(\)/);
  assert.match(source, /validateModelMappingVendorScope\(/);

  assert.match(serviceSource, /export type AccountModelMappingInput = \{/);
  assert.match(serviceSource, /export class AccountModelMappingService/);
  assert.match(serviceSource, /static async replaceAccountMappings/);
  assert.match(serviceSource, /bindingType: 'channel'/);
  assert.match(serviceSource, /const sourceModel = requiredText\(mapping\.sourceModel, 'sourceModel'\)/);
  assert.match(serviceSource, /sourceModel,/);
  assert.match(serviceSource, /const targetCatalogKey = toCatalogModelKey\(mapping\.targetModel, targetVendorCode\)/);
  assert.match(serviceSource, /targetCatalogKey,/);
});

test("admin account model mapping service stores one account-bound alias rule per target vendor", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (method === "GET" && url.includes("/backend/v3/api/ai/model_mappings")) {
        return {
          items: [
            {
              id: "91",
              bindingType: "channel",
              sourceVendorCode: "openai",
              targetVendorCode: "openai",
              mappingMode: "alias",
              matchType: "exact",
              enabled: true,
              bindings: [
                { id: "911", bindingType: "channel", bindingId: "3001", bindingCode: null, bindingName: "OpenRouter Main", sortOrder: 100, enabled: true },
              ],
              mappingItems: [
                { id: "912", sourceModel: "legacy-gpt", targetModel: "gpt-4o-mini", targetCatalogKey: "openai/gpt-4o-mini", sortOrder: 100, enabled: true },
              ],
              createdAt: null,
              updatedAt: null,
            },
          ],
        };
      }
      if (method === "PATCH" && url.includes("/backend/v3/api/ai/model_mappings/91")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        assert.equal(body.sourceVendorCode, "openai");
        assert.equal(body.targetVendorCode, "openai");
        assert.equal(body.bindings[0].bindingType, "channel");
        assert.equal(body.bindings[0].bindingId, "3001");
        assert.deepEqual(
          body.mappingItems.map((item: Record<string, unknown>) => ({
            sourceModel: item.sourceModel,
            targetModel: item.targetModel,
            targetCatalogKey: item.targetCatalogKey,
          })),
          [
            { sourceModel: "gpt-5.5", targetModel: "gpt-5.1", targetCatalogKey: "openai/gpt-5.1" },
            { sourceModel: "legacy-gpt", targetModel: "gpt-4o-mini", targetCatalogKey: "openai/gpt-4o-mini" },
          ],
        );
        return {
          item: {
            id: "91",
            bindingType: "channel",
            sourceVendorCode: "openai",
            targetVendorCode: "openai",
            mappingMode: "alias",
            matchType: "exact",
            enabled: true,
            bindings: [],
            mappingItems: [],
            createdAt: null,
            updatedAt: null,
          },
        };
      }
      throw new Error(`unexpected backend call ${method} ${url}`);
    },
    async () => {
      const { AccountModelMappingService } = await import("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts");
      await AccountModelMappingService.replaceAccountMappings({
        channelId: "3001",
        channelName: "OpenRouter Main",
        accountVendorCode: "openai",
        mappings: [
          { sourceModel: "gpt-5.5", targetModel: "openai/gpt-5.1", targetVendorCode: "openai" },
          { sourceModel: "legacy-gpt", targetModel: "openai/gpt-4o-mini", targetVendorCode: "openai" },
        ],
      });
    },
  );
});

test("admin channel account drawer places vendor selection directly under account type", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();
  const drawerStart = source.indexOf("data-admin-channel-account-drawer");
  const rightPanelStart = source.indexOf("data-admin-channel-right-panel");
  assert.notEqual(drawerStart, -1, "missing account drawer marker");
  assert.notEqual(rightPanelStart, -1, "missing right panel marker");
  const leftPanelSource = source.slice(drawerStart, rightPanelStart);
  const channelTypeIndex = leftPanelSource.indexOf("admin.channel.fields.channelType");
  const vendorPickerIndex = leftPanelSource.indexOf("data-admin-channel-account-type-vendor-picker");
  const credentialModeIndex = leftPanelSource.indexOf("admin.channel.fields.credentialMode");

  assert.notEqual(channelTypeIndex, -1, "missing account type field in left panel");
  assert.notEqual(vendorPickerIndex, -1, "missing account-type vendor picker entry in left panel");
  assert.notEqual(credentialModeIndex, -1, "missing credential mode field in left panel");
  assert.ok(channelTypeIndex < vendorPickerIndex, "vendor picker should be directly after account type");
  assert.ok(vendorPickerIndex < credentialModeIndex, "vendor picker should be before credential mode");
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-picker[\s\S]*onClick=\{\(\) => setVendorPickerOpen\(true\)\}/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-picker[\s\S]*\{modelVendor\}/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-picker[\s\S]*\{accountVendorCode\}/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-picker[\s\S]*admin\.channel\.vendorPicker\.choose/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-summary/);
  assert.match(leftPanelSource, /data-admin-channel-target-vendor-summary/);
  assert.match(leftPanelSource, /selectedVendorSummaries\.map\(\(vendor\) =>/);
  assert.match(leftPanelSource, /selectedVendorCodes\.length/);
  assert.match(leftPanelSource, /border border-indigo-200 bg-indigo-50/);
  assert.match(leftPanelSource, /bg-indigo-600/);
  assert.doesNotMatch(source, /data-admin-channel-model-mapping-header-vendor-button/);

  for (const key of [
    "admin.channel.vendorPicker.accountTypeHint",
    "admin.channel.vendorPicker.currentVendor",
  ]) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel account drawer keeps the left account form compact", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const drawerStart = source.indexOf("data-admin-channel-account-drawer");
  const rightPanelStart = source.indexOf("data-admin-channel-right-panel");
  assert.notEqual(drawerStart, -1, "missing account drawer marker");
  assert.notEqual(rightPanelStart, -1, "missing right panel marker");
  const leftPanelSource = source.slice(drawerStart, rightPanelStart);

  assert.match(leftPanelSource, /data-admin-channel-account-left-form/);
  assert.match(leftPanelSource, /data-admin-channel-left-section="identity"/);
  assert.match(leftPanelSource, /data-admin-channel-left-section="credentials"/);
  assert.match(leftPanelSource, /data-admin-channel-left-section="policy"/);
  assert.match(leftPanelSource, /data-admin-channel-left-section="capabilities"/);
  assert.match(leftPanelSource, /bg-slate-50\/80/);
  assert.match(leftPanelSource, /data-admin-channel-left-section-title/);
  assert.match(leftPanelSource, /rounded-xl border border-slate-200 bg-white p-3 shadow-sm/);
  assert.match(leftPanelSource, /border-b border-slate-100 pb-2/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-segmented/);
  assert.match(leftPanelSource, /data-admin-channel-credential-mode-select/);
  assert.match(leftPanelSource, /data-admin-channel-credential-controls/);
  assert.match(leftPanelSource, /authTypesList[\s\S]*\.map\(\(type\) => \(\s*<option key=\{type\.id\} value=\{type\.id\}>/);
  assert.match(leftPanelSource, /data-admin-channel-circuit-breaker-compact/);
  assert.match(leftPanelSource, /data-admin-channel-account-type-vendor-picker[\s\S]*className="flex w-full flex-col items-stretch/);
  assert.doesNotMatch(leftPanelSource, /t\(option\.descKey\)/);
  assert.doesNotMatch(leftPanelSource, /showMoreAuth/);
  assert.doesNotMatch(leftPanelSource, /setShowMoreAuth/);
  assert.doesNotMatch(leftPanelSource, /admin\.channel\.actions\.showAdvancedModes/);
  assert.doesNotMatch(leftPanelSource, /admin\.channel\.actions\.hideAdvancedModes/);
  assert.doesNotMatch(leftPanelSource, /t\(selectedCredentialRotationOption\.descKey\)/);
  assert.doesNotMatch(leftPanelSource, /t\(selectedCredentialRotationOption\.labelKey\)/);
  assert.doesNotMatch(leftPanelSource, /<label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">\{t\('admin\.channel\.fields\.capabilities'\)\}<\/label>/);
  assert.doesNotMatch(leftPanelSource, /className="grid grid-cols-1 sm:grid-cols-2 gap-2"/);
  assert.doesNotMatch(leftPanelSource, /rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3/);
  assert.doesNotMatch(leftPanelSource, /rounded-xl border border-slate-200 bg-slate-50 p-4/);
  assert.doesNotMatch(leftPanelSource, /admin\.channel\.vendorPicker\.accountTypeHint/);
  assert.doesNotMatch(leftPanelSource, /t\(type\.descKey\)/);
  assert.doesNotMatch(leftPanelSource, /admin\.channel\.help\.circuitBreaker/);
});

test("admin channel relay vendor picker exposes multiple selected vendors", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const drawerStart = source.indexOf("data-admin-channel-account-drawer");
  const rightPanelStart = source.indexOf("data-admin-channel-right-panel");
  const modalStart = source.indexOf("function ChannelVendorPickerModal");
  assert.notEqual(drawerStart, -1, "missing account drawer marker");
  assert.notEqual(rightPanelStart, -1, "missing right panel marker");
  assert.notEqual(modalStart, -1, "missing vendor picker modal");
  const leftPanelSource = source.slice(drawerStart, rightPanelStart);
  const modalSource = source.slice(modalStart);

  assert.match(source, /const selectedVendorSummaries = useMemo/);
  assert.match(source, /function vendorSummariesForCodes/);
  assert.match(leftPanelSource, /data-admin-channel-target-vendor-summary[\s\S]*selectedVendorSummaries\.map\(\(vendor\) =>/);
  assert.match(leftPanelSource, /admin\.channel\.vendorPicker\.selectedCount[\s\S]*selectedVendorCodes\.length/);
  assert.match(modalSource, /data-admin-channel-vendor-picker-selected-summary/);
  assert.match(modalSource, /data-admin-channel-vendor-picker-selected-list/);
  assert.match(modalSource, /data-admin-channel-vendor-target-toggle/);
  assert.match(modalSource, /border-indigo-300 bg-indigo-50/);
  assert.match(modalSource, /border-indigo-500 bg-indigo-600 text-white/);
});

test("admin channel account drawer visually connects right tabs with tab content", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const rightPanelStart = source.indexOf("data-admin-channel-right-panel");
  assert.notEqual(rightPanelStart, -1, "missing right panel marker");
  const rightPanelSource = source.slice(rightPanelStart);

  assert.match(rightPanelSource, /data-admin-channel-right-shell/);
  assert.match(rightPanelSource, /data-admin-channel-right-content/);
  assert.match(rightPanelSource, /data-admin-channel-right-tabs[\s\S]*border-b border-slate-200/);
  assert.match(rightPanelSource, /data-admin-channel-right-tabs[\s\S]*-mb-px border-slate-200 bg-white/);
  assert.match(rightPanelSource, /data-admin-channel-right-content[\s\S]*bg-white dark:bg-black/);
  assert.match(rightPanelSource, /data-admin-channel-right-content[\s\S]*activeAccountDrawerTab === 'models'/);
  assert.match(rightPanelSource, /data-admin-channel-right-content[\s\S]*activeAccountDrawerTab === 'resources'/);
  assert.doesNotMatch(rightPanelSource, /inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold/);
  assert.doesNotMatch(rightPanelSource, /data-admin-channel-model-mapping-card>[\s\S]{0,220}<div className="mb-4/);
  assert.doesNotMatch(rightPanelSource, /data-admin-channel-resource-association-card>[\s\S]{0,220}<div className="mb-4/);
});

test("admin channel drawer binds resource groups and resources through selector modals", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts", import.meta.url),
    "utf8",
  );
  const messages = readAdminChannelI18nSource();

  assert.match(serviceSource, /type AiResourceGroup = Omit<AdminAiResourceGroupItem, 'resourceCount' \| 'sortOrder'>/);
  assert.match(serviceSource, /ChannelAiResourceService[\s\S]*fetchAiResourceGroupsPage/);
  assert.match(serviceSource, /modelsBackendClient\(\)\.ai\.aiResourceGroups\.list\(/);
  assert.match(serviceSource, /ChannelAiResourceService[\s\S]*fetchAiResourcesPage/);
  assert.match(serviceSource, /ChannelModelCatalogService[\s\S]*fetchModelsPage/);
  assert.doesNotMatch(serviceSource, /fetchAiResources\(\)/);
  assert.doesNotMatch(serviceSource, /fetchAiResourceGroups\(\)/);
  assert.doesNotMatch(serviceSource, /fetchModels\(\)/);
  assert.match(source, /const \[resourceGroupSelectorOpen, setResourceGroupSelectorOpen\] = useState\(false\)/);
  assert.match(source, /const \[resourceSelectorOpen, setResourceSelectorOpen\] = useState\(false\)/);
  assert.match(source, /<ChannelPaginatedAiResourceSelectorModal/);
  assert.match(source, /<AiResourceGroupSelectorModal/);
  assert.match(source, /resourceGroupOptionByCode/);
  assert.match(source, /resourceOptionByCode/);
  assert.match(source, /data-admin-channel-resource-group-selector-modal/);
  assert.match(source, /data-admin-channel-resource-selector-modal/);
  assert.match(source, /resourceGroupCodes/);
  assert.match(source, /selectedResourceGroupCodes/);
  assert.match(source, /activeResourceAssociationTab/);
  assert.match(source, /data-admin-channel-resource-tabs/);
  assert.match(source, /data-admin-channel-resource-association-card/);
  assert.match(source, /<section className="flex min-h-0 flex-1 flex-col overflow-hidden[^"]*" data-admin-channel-resource-association-card>/);
  assert.match(source, /data-admin-channel-resource-association-body/);
  assert.match(source, /data-admin-channel-resource-group-list-tab/);
  assert.match(source, /data-admin-channel-resource-list-tab/);
  assert.match(source, /data-admin-channel-selected-resource-groups-list/);
  assert.match(source, /data-admin-channel-selected-resources-list/);
  assert.match(source, /visibleResourcePickerOptions/);
  assert.match(source, /visibleResourceGroupPickerOptions/);
  assert.match(source, /fetchAiResourcesPage/);
  assert.match(source, /fetchAiResourceGroupsPage/);
  assert.match(source, /fetchModelsPage/);
  assert.doesNotMatch(source, /loadModelCatalog/);
  assert.doesNotMatch(source, /loadAiResources/);
  assert.doesNotMatch(source, /loadAiResourceGroups/);
  assert.match(source, /selectedVisibleResourceGroupCodes/);
  assert.match(source, /selectedDirectResourceCodes/);
  assert.match(source, /isAiResourceVisibleForChannelVendorScope\(resource, selectedVendorCodes, capabilities\)/);
  assert.match(source, /isAiResourceGroupVisibleForChannelVendorScope\(group, selectedVendorCodes, capabilities\)/);
  assert.match(source, /resourceCodes: \[\.\.\.selectedVisibleResourceGroupCodes, \.\.\.selectedDirectResourceCodes\]/);
  assert.match(source, /splitResourceAssociationCodes/);
  assert.doesNotMatch(source, /max-h-\[26rem\]/);
  assert.doesNotMatch(source, /startsWith\('group\.'\)/);
  assert.doesNotMatch(source, /admin\.channel\.aiResources\.availableTitle[\s\S]*availableAiResources\.map/s);

  for (const key of [
    "admin.channel.aiResourceGroups.actions.add",
    "admin.channel.aiResourceGroups.empty",
    "admin.channel.aiResourceGroups.searchPlaceholder",
    "admin.channel.aiResourceGroups.selectedCount",
    "admin.channel.aiResourceGroups.title",
    "admin.channel.aiResources.actions.addResource",
    "admin.channel.drawerTabs.models",
    "admin.channel.drawerTabs.resources",
    "admin.channel.models.catalogColumns.model",
    "admin.channel.resourceAssociations.tabs.groups",
    "admin.channel.resourceAssociations.tabs.resources",
    "admin.channel.resourceAssociations.title",
  ]) {
    const occurrences = messages.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel drawer does not expose protocol as a product routing control", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /showProtocolOptions/);
  assert.doesNotMatch(source, /setSelectedProtocol/);
  assert.doesNotMatch(source, /protocolsList\.map/);
  assert.doesNotMatch(source, /admin\.channel\.vendorPicker\.protocolAuto/);
  assert.doesNotMatch(source, /CredentialDetailField label=\{t\('admin\.channel\.fields\.protocol'\)\}/);
  assert.doesNotMatch(source, /\{channel\.protocol\}/);
  assert.match(source, /protocol: inferProtocolForVendor\(modelVendor\)/);
});

test("admin channel visible account copy is routed through i18n resources", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const optionsSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelOptions.ts", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  const hardcodedVisiblePhrases = [
    "Edit channel account",
    "Add channel account",
    "Channel name",
    "Credential mode",
    "Secret reference",
    "Manual reference",
    "Traffic weight",
    "Model allowlist",
    "Bind the provider models supported by this channel.",
    "At least one model must be bound to the channel.",
    "Credential name",
    "Auth type",
    "Credential references",
    "Vault/KMS handles used by provider channel accounts.",
    "Loading credential references...",
    "Credential references could not be loaded",
    "No credential references registered",
    "Add a vault or KMS reference before binding provider channels.",
    "Failed to fetch channel accounts.",
    "Delete channel account?",
    "from provider routing. Active traffic should be moved before confirming.",
    "Channel updated.",
    "Channel created.",
    "Channel disabled.",
    "Channel enabled.",
    "Channel test passed",
    "Channel test failed",
    "Channel deleted.",
    "Credential reference updated.",
    "Credential reference created.",
    "Credential reference enabled.",
    "Credential reference disabled.",
    "Credential reference deleted.",
    "Provider routing accounts, resource access, weights, and credential references.",
    "Search channels",
    "Loading channel accounts...",
    "Channel accounts could not be loaded",
    "No channels found",
    "Add a provider channel account to start routing model traffic.",
    "Adjust the search query or provider filter to find matching channel accounts.",
  ];
  for (const phrase of hardcodedVisiblePhrases) {
    assert.equal(
      source.includes(phrase),
      false,
      `expected visible phrase to use i18n instead of hardcoding: ${phrase}`,
    );
  }

  for (const phrase of [
    "OpenAI compatible",
    "Ollama native",
    "Custom protocol",
    "Standard API Key",
    "Bearer token via secretRef",
    "Setup token",
  ]) {
    assert.equal(
      optionsSource.includes(phrase),
      false,
      `expected channel option phrase to use i18n metadata instead of hardcoding: ${phrase}`,
    );
  }

  const requiredKeys = [
    "admin.channel.title",
    "admin.channel.subtitle",
    "admin.channel.searchPlaceholder",
    "admin.channel.fields.channelName",
    "admin.channel.fields.vendor",
    "admin.channel.fields.protocol",
    "admin.channel.fields.credentialMode",
    "admin.channel.fields.baseUrl",
    "admin.channel.fields.apiKey",
    "admin.channel.fields.trafficWeight",
    "admin.channel.fields.capabilities",
    "admin.channel.fields.addModel",
    "admin.channel.fields.credentialName",
    "admin.channel.fields.authType",
    "admin.channel.fields.status",
    "admin.channel.table.channel",
    "admin.channel.table.provider",
    "admin.channel.table.weight",
    "admin.channel.table.status",
    "admin.channel.table.actions",
    "admin.channel.states.loadingChannels",
    "admin.channel.states.channelsLoadErrorTitle",
    "admin.channel.states.emptyChannelsTitle",
    "admin.channel.states.emptyChannelsDescription",
    "admin.channel.states.emptySearchDescription",
    "admin.channel.credentials.title",
    "admin.channel.credentials.description",
    "admin.channel.credentials.loading",
    "admin.channel.credentials.loadErrorTitle",
    "admin.channel.credentials.emptyTitle",
    "admin.channel.credentials.emptyDescription",
    "admin.channel.confirm.deleteChannelTitle",
    "admin.channel.confirm.deleteChannelDescription",
    "admin.channel.confirm.deleteCredentialTitle",
    "admin.channel.confirm.deleteCredentialDescription",
    "admin.channel.messages.channelCreated",
    "admin.channel.messages.channelUpdated",
    "admin.channel.messages.channelEnabled",
    "admin.channel.messages.channelDisabled",
    "admin.channel.messages.channelDeleted",
    "admin.channel.messages.channelTestPassed",
    "admin.channel.messages.channelTestFailed",
    "admin.channel.messages.credentialCreated",
    "admin.channel.messages.credentialUpdated",
    "admin.channel.messages.credentialEnabled",
    "admin.channel.messages.credentialDisabled",
    "admin.channel.messages.credentialDeleted",
    "admin.channel.pagination.total",
    "admin.channel.pagination.page",
    "admin.channel.status.active",
    "admin.channel.status.disabled",
    "admin.channel.status.errors",
    "admin.channel.options.protocol.openai",
    "admin.channel.options.auth.apiKey.title",
    "admin.channel.options.auth.apiKey.description",
  ];
  for (const key of requiredKeys) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel AI resources are not exposed as a standalone admin navigation route", () => {
  const registrySource = readFileSync(
    new URL("./src/adminModuleRegistry.ts", import.meta.url),
    "utf8",
  );
  const appSource = readFileSync(
    new URL("./src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(registrySource, /\/admin\/channel\/resources/);
  assert.doesNotMatch(registrySource, /labelKey: 'admin\.menu\.aiResources'/);
  assert.doesNotMatch(appSource, /path="channel\/resources"/);
  assert.doesNotMatch(appSource, /AiResourceAdmin/);
  assert.match(registrySource, /itemBlock\(\{ path: '\/admin\/channel', labelKey: 'admin\.menu\.channels'/);
  assert.doesNotMatch(registrySource, /\/admin\/model\/capabilities/);
  assert.doesNotMatch(appSource, /path="model\/capabilities"/);
});

test("admin channel list uses server pagination instead of client slice", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ChannelService\.fetchChannels\(\{/);
  assert.match(source, /setTotalChannels\(channelData\.total\)/);
  assert.doesNotMatch(source, /filteredChannels\.slice\(/);
  assert.doesNotMatch(source, /paginatedChannels/);
  assert.match(source, /filteredChannels\.map\(\(channel\) =>/);
});

test("admin channel endpoint management route is removed from navigation", () => {
  const registrySource = readFileSync(
    new URL("./src/adminModuleRegistry.ts", import.meta.url),
    "utf8",
  );
  const appSource = readFileSync(
    new URL("./src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(registrySource, /\/admin\/channel\/endpoints/);
  assert.doesNotMatch(registrySource, /admin\.menu\.channelEndpoints/);
  assert.doesNotMatch(appSource, /ChannelEndpointAdmin/);
  assert.doesNotMatch(appSource, /path="channel\/endpoints"/);
});

test("admin channel account modal supports account type and reusable AI resource binding", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const packageManifest = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/package.json", import.meta.url),
    "utf8",
  );

  assert.match(source, /ChannelAiResourceService\.fetchAiResourcesPage/);
  assert.doesNotMatch(source, /ChannelAiResourceService\.fetchAiResources\(\)/);
  assert.doesNotMatch(source, /sdkwork-clawrouter-pc-admin-model/);
  assert.doesNotMatch(packageManifest, /sdkwork-clawrouter-pc-admin-model/);
  assert.match(source, /channelType/);
  assert.match(source, /resourceCodes/);
  assert.match(source, /admin\.channel\.fields\.channelType/);
  assert.match(source, /admin\.channel\.resourceAssociations\.title/);
  assert.match(source, /admin\.channel\.aiResourceGroups\.actions\.add/);
  assert.match(source, /admin\.channel\.aiResources\.actions\.addResource/);
  assert.match(source, /admin\.channel\.channelType\.official/);
  assert.match(source, /admin\.channel\.channelType\.relay/);
});

test("admin channel AI resources expose product categories including per-call API resources", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const messages = readAdminChannelI18nSource();

  for (const expected of [
    "type AiResourceCategory",
    "function aiResourceCategory",
    "function displayAiResourceCategory",
    "admin.channel.aiResourceCategory.model",
    "admin.channel.aiResourceCategory.image",
    "admin.channel.aiResourceCategory.video",
    "admin.channel.aiResourceCategory.audio",
    "admin.channel.aiResourceCategory.music",
    "admin.channel.aiResourceCategory.sfx",
    "admin.channel.aiResourceCategory.api_resource",
  ]) {
    assert.ok(source.includes(expected) || messages.includes(expected), `missing AI resource category marker: ${expected}`);
  }

  assert.match(source, /displayAiResourceCategory\(resource, t\)/);
  assert.match(source, /resourceType: displayAiResourceCategory\(resource, t\)/);
  assert.match(source, /capabilities: channelAiResourceCapabilityCodes\(resource\)/);
  assert.match(source, /isAiResourceVisibleForChannelVendorScope\(resource, selectedVendorCodes, capabilities\)/);
  assert.match(source, /isAiResourceGroupVisibleForChannelVendorScope\(group, selectedVendorCodes, capabilities\)/);
  assert.match(source, /selectedVisibleResourceGroupCodes/);
  assert.match(source, /resourceCodes: \[\.\.\.selectedVisibleResourceGroupCodes, \.\.\.selectedDirectResourceCodes\]/);
  assert.doesNotMatch(
    source,
    /admin\.channel\.aiResourceType\.\$\{resource\.resourceType\}/,
    "resource cards should show product category instead of raw resourceType",
  );
});

test("admin channel credentials are viewed from account row actions instead of a standalone table", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.ok((source.match(/<table\b/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /export function AiResourceAdmin/);
  assert.doesNotMatch(source, /name="secretRef"/);
  assert.doesNotMatch(source, /setSecretRef/);
  assert.doesNotMatch(source, /availableSecrets/);
  assert.doesNotMatch(source, /providerSecrets=\{providerSecrets\}/);
  assert.doesNotMatch(source, /findProviderSecretForCredential/);
  assert.doesNotMatch(source, /ProviderSecretService\.fetchProviderSecrets\(\)/);
  assert.doesNotMatch(source, /name="apiKey"/);
  assert.match(source, /admin\.channel\.fields\.apiKey/);
  assert.match(source, /admin\.channel\.placeholders\.apiKey/);
  assert.doesNotMatch(source, /function CredentialReferencePanel/);
  assert.doesNotMatch(source, /<CredentialReferencePanel/);
  assert.doesNotMatch(source, /function ProviderSecretModal/);
  assert.doesNotMatch(source, /secretModalMode/);
  assert.doesNotMatch(source, /createProviderSecretInputFromForm/);
  assert.match(source, /function CredentialDetailsModal/);
  assert.match(source, /viewingCredentialChannel/);
  assert.match(source, /admin\.channel\.actions\.viewCredential/);
});

test("admin channel endpoint management UI and SDK calls are removed", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelService.ts", import.meta.url),
    "utf8",
  );
  const formSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/channelForm.ts", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  for (const [name, content] of [
    ["source", source],
    ["service", serviceSource],
    ["form", formSource],
    ["i18n", i18nSource],
  ] as const) {
    assert.equal(content.includes("ChannelEndpointAdmin"), false, `${name} still exposes ChannelEndpointAdmin`);
    assert.equal(content.includes("ChannelEndpointFormModal"), false, `${name} still exposes ChannelEndpointFormModal`);
    assert.equal(content.includes("ChannelEndpointService"), false, `${name} still exposes ChannelEndpointService`);
    assert.equal(content.includes("fetchChannelEndpointOptions"), false, `${name} still exposes fetchChannelEndpointOptions`);
    assert.equal(content.includes("channelEndpoints"), false, `${name} still references channelEndpoints`);
    assert.equal(content.includes("channel_endpoints"), false, `${name} still references channel_endpoints`);
  }
});

test("admin channel copy describes resource access instead of direct model bindings", () => {
  const i18nSource = readAdminChannelI18nSource();

  assert.doesNotMatch(
    i18nSource,
    /model bindings|模型绑定|绑定模型/,
    "channel account copy must not imply direct account-to-model bindings",
  );
  assert.match(i18nSource, /resource access|资源访问/);
});

test("admin channel AI resource service calls generated backend SDK path and normalizes data", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/resources" && method === "GET") {
        return {
          items: [
            {
              id: "cap-1",
              resourceCode: "bundle.openrouter.openai.chat",
              resourceType: "bundle",
              displayName: "OpenRouter OpenAI Chat",
              vendorCode: "openai",
              modalityCode: "chat",
              apiEndpointCode: "chat_completions",
              catalogKey: "openai/gpt-5.5",
              model: "gpt-5.5",
              providerNativeModel: "gpt-5.5",
              capability: "llm",
              capabilities: ["llm", "chat"],
              compositionMode: "any",
              status: "active",
              sortOrder: 10,
              members: [
                {
                  parentResourceCode: "bundle.openrouter.openai.chat",
                  memberResourceCode: "model.openai.gpt-5.5.chat_completions",
                  memberRole: "included",
                  required: true,
                  sortOrder: 1,
                },
              ],
            },
          ],
        };
      }
      throw new Error(`Unexpected ${method} ${url}`);
    },
    async (captured) => {
      const page = await ChannelAiResourceService.fetchAiResourcesPage({ page: 1, pageSize: 20 });

      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/backend/v3/api/ai/resources");
      assert.deepEqual(page.resources, [
        {
          id: "cap-1",
          resourceCode: "bundle.openrouter.openai.chat",
          resourceType: "bundle",
          displayName: "OpenRouter OpenAI Chat",
          vendorCode: "openai",
          modalityCode: "chat",
          apiEndpointCode: "chat_completions",
          catalogKey: "openai/gpt-5.5",
          model: "gpt-5.5",
          providerNativeModel: "gpt-5.5",
          capability: "llm",
          capabilities: ["llm", "chat"],
          compositionMode: "any",
          status: "active",
          sortOrder: 10,
          members: [
            {
              parentResourceCode: "bundle.openrouter.openai.chat",
              memberResourceCode: "model.openai.gpt-5.5.chat_completions",
              memberRole: "included",
              required: true,
              sortOrder: 1,
            },
          ],
        },
      ]);
      assert.equal(page.total, 1);
    },
  );
});

test("admin channel AI resource service creates and updates through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url === "/backend/v3/api/ai/resources" && method === "POST") {
        assert.deepEqual(body, {
          resourceCode: "bundle.openrouter.openai.standard",
          resourceType: "bundle",
          displayName: "OpenRouter OpenAI Standard",
          vendorCode: "openai",
          compositionMode: "all",
          status: "active",
          sortOrder: "5",
          members: [
            {
              memberResourceCode: "model.openai.gpt-4o-mini.chat",
              memberRole: "included",
              required: true,
              sortOrder: "1",
            },
          ],
        });
        return {
          item: {
            id: "resource-5",
            ...body,
            modalityCode: body.modalityCode ?? null,
            apiEndpointCode: body.apiEndpointCode ?? null,
            catalogKey: body.catalogKey ?? null,
            model: body.model ?? null,
            providerNativeModel: body.providerNativeModel ?? null,
            capability: body.capability ?? null,
            capabilities: body.capabilities ?? [],
            members: body.members.map((member: Record<string, unknown>) => ({
              parentResourceCode: body.resourceCode,
              ...member,
            })),
          },
        };
      }
      if (url === "/backend/v3/api/ai/resources/resource-5" && method === "PUT") {
        return {
          item: {
            id: "resource-5",
            resourceCode: "bundle.openrouter.openai.standard",
            resourceType: "bundle",
            displayName: body.displayName ?? "OpenRouter OpenAI Standard",
            vendorCode: body.vendorCode,
            modalityCode: null,
            apiEndpointCode: null,
            catalogKey: null,
            model: null,
            providerNativeModel: null,
            capability: null,
            capabilities: [],
            compositionMode: body.compositionMode ?? "all",
            status: body.status ?? "active",
            sortOrder: body.sortOrder,
            members: body.members ?? [],
          },
        };
      }
      throw new Error(`Unexpected ${method} ${url}`);
    },
    async (captured) => {
      const created = await ChannelAiResourceService.createAiResource({
        resourceCode: " Bundle.OpenRouter.OpenAI.Standard ",
        resourceType: "bundle",
        displayName: " OpenRouter OpenAI Standard ",
        vendorCode: " OpenAI ",
        compositionMode: "all",
        status: "active",
        sortOrder: 5,
        members: [
          {
            memberResourceCode: " Model.OpenAI.GPT-4o-Mini.Chat ",
            memberRole: "included",
            required: true,
            sortOrder: 1,
          },
        ],
      });
      const updated = await ChannelAiResourceService.updateAiResource("resource-5", {
        displayName: " OpenRouter OpenAI Realtime ",
        vendorCode: null,
        sortOrder: null,
        members: [],
      });
      await ChannelAiResourceService.updateAiResource("resource-5", { status: "disabled" });

      assert.equal(created.id, "resource-5");
      assert.equal(updated.vendorCode, undefined);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "POST /backend/v3/api/ai/resources",
          "PUT /backend/v3/api/ai/resources/resource-5",
          "PUT /backend/v3/api/ai/resources/resource-5",
        ],
      );
      assert.deepEqual(JSON.parse(captured[1].body), {
        displayName: "OpenRouter OpenAI Realtime",
        vendorCode: null,
        sortOrder: null,
        members: [],
      });
      assert.deepEqual(JSON.parse(captured[2].body), { status: "disabled" });
    },
  );
});

test("admin channel AI resource service rejects unsafe mutation input before SDK calls", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("SDK fetch should not be called for invalid AI resource input");
    },
    async (captured) => {
      await assert.rejects(
        () => ChannelAiResourceService.updateAiResource("resource/5", { status: "active" }),
        /aiResourceId must be a safe path segment/,
      );
      await assert.rejects(
        () => ChannelAiResourceService.createAiResource({
          resourceCode: "bundle/openrouter/openai/chat",
          resourceType: "bundle",
          displayName: "OpenRouter OpenAI Chat",
        }),
        /resourceCode must be an AI resource code/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin channel standalone AI resource admin page is removed while binding support remains", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );
  const i18nSource = readAdminChannelI18nSource();

  assert.doesNotMatch(source, /export function AiResourceAdmin/);
  assert.doesNotMatch(source, /function AiResourceFormModal/);
  assert.match(source, /<ChannelPaginatedAiResourceSelectorModal/);
  assert.match(source, /ChannelAiResourceService\.fetchAiResourcesPage/);
  assert.doesNotMatch(source, /ChannelAiResourceService\.fetchAiResources/);
  assert.match(source, /admin\.channel\.aiResources\.actions\.addResource/);
  assert.match(source, /admin\.channel\.resourceAssociations\.title/);
  assert.doesNotMatch(source, /data-admin-channel-ai-resource-table-card/);
  assert.doesNotMatch(source, /data-admin-channel-ai-resource-table-viewport/);

  for (const key of [
    "admin.channel.aiResources.actions.addResource",
    "admin.channel.aiResources.empty",
    "admin.channel.aiResources.searchPlaceholder",
    "admin.channel.aiResources.selectedCount",
    "admin.channel.aiResources.noneSelected",
    "admin.channel.resourceAssociations.title",
  ]) {
    const occurrences = i18nSource.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g"))?.length ?? 0;
    assert.equal(occurrences, 2, `expected ${key} to exist in English and Chinese resources`);
  }
});

test("admin channel removes standalone AI resource authoring UI while keeping selector binding", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<ChannelPaginatedAiResourceSelectorModal/);
  assert.match(source, /visibleResourcePickerOptions/);
  assert.match(source, /selectedDirectResourceCodes/);
  assert.doesNotMatch(source, /resourceSelectorOptions/);
  assert.doesNotMatch(source, /function AiResourceFormModal/);
  assert.doesNotMatch(source, /function AiResourceModelSelector/);
  assert.doesNotMatch(source, /function AiResourceMemberSelector/);
  assert.doesNotMatch(source, /data-ai-resource-model-selector/);
  assert.doesNotMatch(source, /data-ai-resource-member-selector/);
  assert.doesNotMatch(source, /ChannelAiResourceService\.createAiResource/);
  assert.doesNotMatch(source, /ChannelAiResourceService\.updateAiResource/);
});

test("admin channel AI resource service fails closed for malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/resources" && method === "GET") {
        return {
          items: [
            {
              id: "cap-1",
              resourceCode: "bundle/openrouter/openai/chat",
              resourceType: "bundle",
              displayName: "OpenRouter OpenAI Chat",
              compositionMode: "any",
              status: "active",
              members: [],
            },
          ],
        };
      }
      throw new Error(`Unexpected ${method} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelAiResourceService.fetchAiResourcesPage({ page: 1, pageSize: 20 }),
        /resourceCode must be an AI resource code/,
      );
    },
  );
});

test("admin channel mapping catalog maps runtime ids instead of display aliases", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            {
              id: "model-1",
              vendorId: "vendor-1",
              vendorCode: "openai",
              catalogKey: "openai/gpt-4o-mini",
              regionCode: "global",
              model: "gpt-4o-mini",
              displayName: "GPT-4o Mini",
              name: "GPT-4o Mini",
              type: "Chat",
              priceIn: "0.1500",
              priceOut: "0.6000",
              cacheReadPrice: "0.0750",
              cacheWritePrice: "0.1500",
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
              releaseStage: 1,
              shelfState: 1,
              routingState: 1,
              replacementModel: null,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const page = await ChannelModelCatalogService.fetchModelsPage({ page: 1, pageSize: 20 });

      assert.deepEqual(page.models, [
        {
          catalogKey: "openai/gpt-4o-mini",
          model: "gpt-4o-mini",
          displayName: "GPT-4o Mini",
          vendorCode: "openai",
          regionCode: "global",
        },
      ]);
      assert.equal(page.total, 1);
    },
  );
});

test("admin channel mapping catalog rejects regional catalog key debt", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            {
              id: "model-legacy-region",
              vendorId: "vendor-1",
              vendorCode: "openai",
              catalogKey: "openai/global/gpt-4o-mini",
              model: "gpt-4o-mini",
              displayName: "GPT-4o Mini",
              name: "GPT-4o Mini",
              type: "Chat",
              priceIn: "0.1500",
              priceOut: "0.6000",
              cacheReadPrice: "0.0750",
              cacheWritePrice: "0.1500",
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
              releaseStage: 1,
              shelfState: 1,
              routingState: 1,
              replacementModel: null,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      await assert.rejects(
        () => ChannelModelCatalogService.fetchModelsPage({ page: 1, pageSize: 20 }),
        /Model catalog key must use vendor\/model identity/,
      );
      await assert.rejects(
        () => ChannelModelCatalogService.fetchModelsPage({ page: 1, pageSize: 20 }),
        /Model catalog key must use vendor\/model identity/,
      );
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /backend/v3/api/ai/models", "GET /backend/v3/api/ai/models"],
      );
    },
  );
});

test("admin channel mapping catalog rejects cloud region segments but accepts relay provider namespaces", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/models" && method === "GET") {
        return {
          items: [
            {
              id: "model-openrouter-anthropic",
              vendorId: "vendor-openrouter",
              vendorCode: "openrouter",
              catalogKey: "openrouter/anthropic/claude-3-opus",
              model: "anthropic/claude-3-opus",
              displayName: "Claude 3 Opus",
              name: "Claude 3 Opus",
              type: "Chat",
              priceIn: "15.0000",
              priceOut: "75.0000",
              cacheReadPrice: "0.0000",
              cacheWritePrice: "0.0000",
              status: "active",
              calls: "42",
              description: null,
              modalities: ["text"],
              inputModalities: ["text"],
              outputModalities: ["text"],
              apiFormat: "openai_chat_completions",
              capabilityIntro: null,
              limitations: [],
              supportedLanguages: [],
              useCases: [],
              trainingDataCutoff: null,
              contextTokens: 200000,
              maxOutputTokens: null,
              supportsStreaming: true,
              supportsTools: true,
              supportsJsonSchema: true,
              releaseStage: 1,
              shelfState: 1,
              routingState: 1,
              replacementModel: null,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const page = await ChannelModelCatalogService.fetchModelsPage({ page: 1, pageSize: 20 });

      assert.deepEqual(page.models.map((model) => model.catalogKey), ["openrouter/anthropic/claude-3-opus"]);
    },
  );

  assert.equal("models" in createChannelInputFromForm({
    name: "Regional deployment key",
    vendor: "OpenAI",
    credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-openai" })],
    capabilities: ["llm"],
    weight: 100,
    status: "active",
  }), false);
});

test("admin channel auth type helpers preserve unknown backend auth types", () => {
  const knownAuthTypes = [
    { id: "api-key", title: "Standard API Key" },
    { id: "aws-bedrock", title: "AWS Bedrock" },
  ];

  assert.equal(resolveAuthTypeFormValue(" Standard API Key ", knownAuthTypes), "api-key");
  assert.equal(resolveAuthTypeFormValue("custom-sigv4", knownAuthTypes), "custom-sigv4");
  assert.equal(resolveAuthTypeSubmitValue("api-key", knownAuthTypes), "Standard API Key");
  assert.equal(resolveAuthTypeSubmitValue("custom-sigv4", knownAuthTypes), "custom-sigv4");
  assert.throws(
    () => resolveAuthTypeSubmitValue(" ", knownAuthTypes),
    /authType is required/,
  );
});

test("admin channel auth options support official, oauth, and major cloud credential methods", () => {
  assert.deepEqual(
    authTypesList.map((type) => type.id),
    [
      "api-key",
      "openai",
      "claude-code",
      "google",
      "oauth-gcp",
      "azure",
      "azure-ad",
      "aws-bedrock",
      "aliyun",
      "volcengine",
      "tencent-cloud",
    ],
  );

  assert.equal(resolveAuthTypeFormValue("OpenAI", authTypesList), "openai");
  assert.equal(resolveAuthTypeFormValue("Google", authTypesList), "google");
  assert.equal(resolveAuthTypeFormValue("Azure Cloud Account", authTypesList), "azure");
  assert.equal(resolveAuthTypeFormValue("Azure OpenAI", authTypesList), "azure-ad");
  assert.equal(resolveAuthTypeFormValue("Alibaba Cloud", authTypesList), "aliyun");
  assert.equal(resolveAuthTypeFormValue("Volcengine", authTypesList), "volcengine");
  assert.equal(resolveAuthTypeFormValue("Tencent Cloud", authTypesList), "tencent-cloud");
  assert.equal(resolveAuthTypeSubmitValue("aliyun", authTypesList), "Alibaba Cloud");
  assert.equal(resolveAuthTypeSubmitValue("volcengine", authTypesList), "Volcengine");
  assert.equal(resolveAuthTypeSubmitValue("tencent-cloud", authTypesList), "Tencent Cloud");
});

test("admin channel form serializes structured cloud credentials into existing secret material", () => {
  const input = createChannelInputFromForm({
    name: "AWS Bedrock",
    vendor: "Bedrock",
    channelType: "official",
    protocol: "OpenAI",
    accessType: "AWS Bedrock",
    credentials: [channelCredentialForm({ baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com", apiKey: undefined, credentialFields: {
      awsAccessKeyId: " AKIA_TEST ",
      awsSecretAccessKey: " secret ",
      awsRegion: " us-east-1 ",
      awsSessionToken: " ",
    } })],
    capabilities: ["llm"],
    resourceCodes: [],
    weight: 100,
    status: "active",
  } as Parameters<typeof createChannelInputFromForm>[0]);

  assert.equal(input.credentials[0]?.apiKey, JSON.stringify({
    awsAccessKeyId: "AKIA_TEST",
    awsSecretAccessKey: "secret",
    awsRegion: "us-east-1",
  }));
  assert.equal("apiKey" in input, false);
});

test("admin channel drawer renders structured credential fields for non-api auth types", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "credentialFieldSets",
    "activeCredentialFields",
    "updateCredentialField",
    "credentialFields?.[field.name]",
    "credentialFieldsForAuthType(activeAuthType)",
    "field.secret && !apiKeyVisible",
    "awsAccessKeyId",
    "awsSecretAccessKey",
    "azureTenantId",
    "azureClientSecret",
    "googleServiceAccountJson",
    "aliyunAccessKeySecret",
    "volcengineSecretAccessKey",
    "tencentSecretKey",
    "claudeCodeToken",
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("admin channel select helpers preserve custom vendors and protocols", () => {
  assert.equal(resolveChannelSelectFormValue(undefined, knownModelVendors, "OpenAI"), "OpenAI");
  assert.equal(resolveChannelSelectFormValue(" DeepSeek ", knownModelVendors, "OpenAI"), "DeepSeek");
  assert.equal(resolveChannelSelectFormValue("acme-ai", knownModelVendors, "OpenAI"), "acme-ai");

  assert.equal(resolveChannelSelectFormValue("OpenAI compatible", protocolsList, "OpenAI"), "OpenAI");
  assert.equal(resolveChannelSelectFormValue("Acme RPC", protocolsList, "OpenAI"), "Acme RPC");

  assert.equal(resolveChannelSelectSubmitValue("OpenAI", protocolsList, "protocol"), "OpenAI");
  assert.equal(resolveChannelSelectSubmitValue("OpenAI compatible", protocolsList, "protocol"), "OpenAI");
  assert.equal(resolveChannelSelectSubmitValue("Acme RPC", protocolsList, "protocol"), "Acme RPC");
  assert.throws(
    () => resolveChannelSelectSubmitValue(" ", protocolsList, "protocol"),
    /protocol is required/,
  );
});

test("admin channel service persists and clears circuit breaker policy through backend SDK contract", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/integration/channels" && method === "POST") {
        return {
          item: {
            id: "channel-circuit",
            name: "OpenAI Circuit",
            vendor: "OpenAI",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            baseUrl: "https://api.openai.com/v1",
            secretRef: "vault://providers/openai/main",
            createdAt: "2026-05-05T08:00:00Z",
            capabilities: ["llm"],
            isMultimodal: false,
            circuitBreakerPolicy: {
              failureThreshold: 4,
            },
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      if (url === "/backend/v3/api/integration/channels" && method === "PUT") {
        return {
          item: {
            id: "channel-circuit",
            name: "OpenAI Circuit",
            vendor: "OpenAI",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            baseUrl: "https://api.openai.com/v1",
            secretRef: "vault://providers/openai/main",
            createdAt: "2026-05-05T08:00:00Z",
            capabilities: ["llm"],
            isMultimodal: false,
            circuitBreakerPolicy: null,
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const created = await ChannelService.addChannel({
        name: "OpenAI Circuit",
        vendor: "OpenAI",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", secretRef: "vault://providers/openai/main", apiKey: undefined })],
        capabilities: ["llm"],
        circuitBreakerPolicy: { failureThreshold: 4 },
        weight: 100,
        status: "active",
      });
      const updated = await ChannelService.updateChannel("channel-circuit", {
        circuitBreakerPolicy: null,
      });

      assert.deepEqual(created.circuitBreakerPolicy, { failureThreshold: 4 });
      assert.equal(updated.circuitBreakerPolicy, undefined);
      assert.deepEqual(JSON.parse(captured[0].body).circuitBreakerPolicy, { failureThreshold: 4 });
      assert.equal("models" in JSON.parse(captured[0].body), false);
      assert.equal("baseUrl" in JSON.parse(captured[0].body), false);
      assert.equal("apiKey" in JSON.parse(captured[0].body), false);
      assert.equal("secretRef" in JSON.parse(captured[0].body), false);
      assert.equal(JSON.parse(captured[1].body).circuitBreakerPolicy, null);
    },
  );
});

test("admin channel service sends an empty AI resource list when clearing bindings", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/integration/channels" && method === "PUT") {
        return {
          item: {
            id: "channel-clear-resources",
            name: "OpenAI Primary",
            vendor: "OpenAI",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            baseUrl: "https://api.openai.com/v1",
            secretRef: "vault://providers/openai/main",
            createdAt: "2026-05-05T08:00:00Z",
            capabilities: ["llm"],
            resourceCodes: [],
            isMultimodal: false,
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      await ChannelService.updateChannel("channel-clear-resources", {
        resourceCodes: [],
      });

      assert.deepEqual(JSON.parse(captured[0].body).resourceCodes, []);
    },
  );
});

test("admin channel list fails closed when backend returns malformed circuit breaker policy", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              circuitBreakerPolicy: {
                failureThreshold: 0,
              },
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Channel circuitBreakerPolicy.failureThreshold must be between 1 and 100/,
      );
    },
  );
});

test("admin channel service calls generated backend SDK paths and normalizes channel data", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/integration/channels" && method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              channelId: "9001",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              baseUrl: "https://api.openai.com/v1",
              secretRef: "vault://providers/openai/main",
              apiKey: "sk-live-openai",
              createdAt: "2026-05-05T08:00:00Z",
              expiresAt: "2026-06-30T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              timeoutMs: "30000",
              retryPolicy: {
                maxAttempts: 3,
                retryableStatusCodes: [429, 500],
                backoffMs: 250,
              },
              circuitBreakerPolicy: {
                failureThreshold: 2,
              },
              weight: "100",
              status: "error",
              balance: "$20.00",
              errors: "2",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/integration/channels" && method === "POST") {
        return {
          item: {
            id: "channel-2",
            name: "Anthropic Backup",
            vendor: "Anthropic",
            ...channelContractDefaults(),
            channelId: "9002",
            protocol: "Anthropic",
            accessType: "api-key",
            baseUrl: "https://api.anthropic.com",
            secretRef: "vault://providers/anthropic/backup",
            apiKey: "sk-ant-live-secret",
            createdAt: "2026-05-06T08:00:00Z",
            capabilities: ["llm"],
            isMultimodal: false,
            circuitBreakerPolicy: {
              failureThreshold: 4,
            },
            weight: 20,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      if (url === "/backend/v3/api/integration/channels" && method === "PUT") {
        return {
          item: {
            id: "channel-2",
            name: "Anthropic Updated",
            vendor: "Anthropic",
            ...channelContractDefaults(),
            channelId: "9002",
            protocol: "Anthropic",
            accessType: "api-key",
            apiKey: "sk-ant-live-secret",
            createdAt: "2026-05-06T08:00:00Z",
            expiresAt: null,
            capabilities: ["llm"],
            isMultimodal: false,
            circuitBreakerPolicy: null,
            weight: 30,
            status: "disabled",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      if (url === "/backend/v3/api/integration/channels/channel-2/verify" && method === "POST") {
        return {
        channelId: "7",
        success: true,
        status: "active",
        latency: "88ms",
          item: {
          id: "7",
          channelId: "9001",
          name: "OpenAI Primary",
          vendor: "OpenAI",
          ...channelContractDefaults(),
          protocol: "OpenAI",
          accessType: "api-key",
          apiKey: "sk-live-openai",
          createdAt: "2026-05-05T08:00:00Z",
          expiresAt: "2026-06-30T08:00:00Z",
          capabilities: ["llm"],
          isMultimodal: false,
          weight: 100,
          status: "active",
          balance: "N/A",
          errors: 0,
        },
        };
      }
      if (url === "/backend/v3/api/integration/channels/channel-2" && method === "DELETE") {
        return undefined;
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const { channels } = await ChannelService.fetchChannels();
      const created = await ChannelService.addChannel({
        name: " Anthropic Backup ",
        vendor: " Anthropic ",
        protocol: "Anthropic",
        accessType: "api-key",
        credentials: [channelCredentialForm({
          name: "Backup",
          baseUrl: " https://api.anthropic.com ",
          apiKey: " sk-ant-live-secret ",
        })],
        expiresAt: " 2026-07-01T00:00:00Z ",
        capabilities: ["llm"],
        weight: 20,
        circuitBreakerPolicy: { failureThreshold: 4 },
        status: "active",
      });
      const updated = await ChannelService.updateChannel("channel-2", {
        name: "Anthropic Updated",
        weight: 30,
        status: "disabled",
        expiresAt: null,
      });
      const tested = await ChannelService.testChannel("channel-2");
      const deleted = await ChannelService.deleteChannel("channel-2");

      assert.equal(channels[0].id, "channel-1");
      assert.equal(channels[0].channelId, "9001");
      assert.equal(channels[0].status, "error");
      assert.equal(channels[0].credentials[0]?.apiKey, "sk-live-openai");
      assert.equal(channels[0].createdAt, "2026-05-05T08:00:00Z");
      assert.equal(channels[0].expiresAt, "2026-06-30T08:00:00Z");
      assert.equal(channels[0].timeoutMs, 30000);
      assert.deepEqual(channels[0].retryPolicy?.retryableStatusCodes, [429, 500]);
      assert.deepEqual(channels[0].circuitBreakerPolicy, { failureThreshold: 2 });
      assert.equal(created.id, "channel-2");
      assert.equal(created.channelId, "9002");
      assert.deepEqual(created.circuitBreakerPolicy, { failureThreshold: 4 });
      assert.equal(updated?.status, "disabled");
      assert.equal(updated?.circuitBreakerPolicy, undefined);
      assert.equal(tested.channelId, "7");
      assert.equal(tested.success, true);
      assert.equal(deleted, true);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/integration/channels",
          "POST /backend/v3/api/integration/channels",
          "PUT /backend/v3/api/integration/channels",
          "POST /backend/v3/api/integration/channels/channel-2/verify",
          "DELETE /backend/v3/api/integration/channels/channel-2",
        ],
      );
      assert.deepEqual(JSON.parse(captured[1].body), {
        name: "Anthropic Backup",
        vendor: "Anthropic",
        protocol: "Anthropic",
        accessType: "api-key",
        credentials: [
          {
            name: "Backup",
            baseUrl: "https://api.anthropic.com",
            apiKey: "sk-ant-live-secret",
            priority: "1",
            weight: "100",
            status: "active",
          },
        ],
        expiresAt: "2026-07-01T00:00:00Z",
        capabilities: ["llm"],
        circuitBreakerPolicy: { failureThreshold: 4 },
        weight: "20",
        status: "active",
      });
      assert.deepEqual(JSON.parse(captured[2].body), {
        id: "channel-2",
        name: "Anthropic Updated",
        weight: "30",
        status: "disabled",
        expiresAt: null,
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin channel service preserves canonical cross-vendor catalog keys for relay accounts", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "POST") {
        return {
          item: {
            id: "channel-openrouter",
            name: "OpenRouter",
            vendor: "OpenRouter",
            ...channelContractDefaults(),
            protocol: "OpenAI",
            accessType: "api-key",
            baseUrl: "https://openrouter.ai/api/v1",
            secretRef: "vault://providers/openrouter/main",
            apiKey: "sk-openrouter",
            createdAt: "2026-05-06T08:00:00Z",
            capabilities: ["llm"],
            isMultimodal: false,
            weight: 20,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      await ChannelService.addChannel({
        name: "OpenRouter",
        vendor: "OpenRouter",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm({
          baseUrl: "https://openrouter.ai/api/v1",
          apiKey: "sk-openrouter",
        })],
        capabilities: ["llm"],
        weight: 20,
        status: "active",
      });

      assert.equal("models" in JSON.parse(captured[0].body), false);
    },
  );
});

test("admin channel service does not submit target models as account allowlists", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "POST") {
        return {
          item: {
            id: "channel-official",
            name: "Anthropic Official",
            vendor: "Anthropic",
            ...channelContractDefaults(),
            channelType: "official",
            protocol: "Anthropic",
            accessType: "api-key",
            createdAt: "2026-05-01T00:00:00Z",
            capabilities: ["llm"],
            resourceCodes: [],
            isMultimodal: false,
            weight: 100,
            status: "active",
            balance: "N/A",
            errors: 0,
          },
        };
      }
      throw new Error(`unexpected backend call ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      await ChannelService.addChannel({
        name: "Anthropic Official",
        vendor: "Anthropic",
        channelType: "official",
        protocol: "Anthropic",
        accessType: "api-key",
        credentials: [channelCredentialForm()],
        capabilities: ["llm"],
        resourceCodes: [],
        weight: 100,
        status: "active",
      });

      assert.equal(captured.length, 1);
      assert.equal("models" in JSON.parse(captured[0].body), false);
    },
  );
});

test("admin channel service accepts relay account resource selections without model allowlists", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "POST") {
        return {
          id: "channel-relay",
          name: "OpenRouter Relay",
          vendor: "OpenRouter",
          protocol: "OpenAI",
          accessType: "api-key",
          capabilities: ["llm"],
          isMultimodal: false,
          weight: 100,
          status: "active",
          balance: "$0.00",
          errors: 0,
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
          ...channelContractDefaults(),
          channelType: "relay",
        };
      }
      throw new Error(`unexpected backend call ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      await ChannelService.addChannel({
        name: "OpenRouter Relay",
        vendor: "OpenRouter",
        channelType: "relay",
        protocol: "OpenAI",
        accessType: "api-key",
        credentials: [channelCredentialForm()],
        capabilities: ["llm"],
        resourceCodes: [],
        weight: 100,
        status: "active",
      });

      assert.equal("models" in JSON.parse(captured[0].body), false);
    },
  );
});

test("admin channel service rejects invalid commands before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for invalid channel commands");
    },
    async (captured) => {
      await assert.rejects(
        () =>
          ChannelService.addChannel({
            name: "",
            vendor: "OpenAI",
            credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-openai" })],
          }),
        /name is required/,
      );
      await assert.rejects(
        () =>
          ChannelService.addChannel({
            name: "OpenAI",
            vendor: "OpenAI",
            credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: " " })],
          }),
        /credentials\[0\]\.apiKey is required/,
      );
      await assert.rejects(
        () =>
          ChannelService.addChannel({
            name: "OpenAI",
            vendor: "OpenAI",
            credentials: [],
          }),
        /credentials must include at least one upstream credential/,
      );
      await assert.rejects(
        () =>
          ChannelService.addChannel({
            name: "OpenAI",
            vendor: "OpenAI",
            credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-openai" })],
            capabilities: ["llm", "unknown"],
          }),
        /Unsupported channel capability: unknown/,
      );
      await assert.rejects(
        () =>
          ChannelService.addChannel({
            name: "OpenAI",
            vendor: "OpenAI",
            credentials: [channelCredentialForm({ baseUrl: "https://api.openai.com/v1", apiKey: "sk-openai" })],
            weight: 1.5,
          }),
        /weight must be a positive integer/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin channel service rejects unsafe SDK path ids before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for unsafe channel path ids");
    },
    async (captured) => {
      await assert.rejects(
        () => ChannelService.updateChannel("channel/2", { name: "Updated" }),
        /channelId must be a safe path segment/,
      );
      await assert.rejects(
        () => ChannelService.deleteChannel("../channel-2"),
        /channelId must be a safe path segment/,
      );
      await assert.rejects(
        () => ChannelService.testChannel("channel?debug=true"),
        /channelId must be a safe path segment/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin channel test fails closed when backend success response omits the tested channel item", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels/channel-2/verify" && init?.method === "POST") {
        return {
          channelId: "channel-2",
          success: true,
          status: "active",
          latency: "88ms",
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.testChannel("channel-2"),
        /Channel test response is missing channel data/,
      );
    },
  );
});

test("admin channel test fails closed when backend omits required test metadata", async () => {
  const baseItem = {
    id: "channel-2",
    name: "Anthropic Backup",
    vendor: "Anthropic",
    ...channelContractDefaults(),
    protocol: "Anthropic",
    accessType: "api-key",
    capabilities: ["llm"],
    isMultimodal: false,
    weight: 20,
    status: "active",
    balance: "N/A",
    errors: 0,
  };

  for (const [field, message] of [
    ["channelId", /Channel test channel id is required/],
    ["success", /Channel test success flag is required/],
    ["latency", /Channel test latency is required/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/integration/channels/channel-2/verify" && init?.method === "POST") {
          const response = {
            channelId: "channel-2",
            success: true,
            status: "active",
            latency: "88ms",
            item: baseItem,
          } as Record<string, unknown>;
          delete response[field];
          return response;
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => ChannelService.testChannel("channel-2"),
          message,
        );
      },
    );
  }
});

test("admin channel list fails closed when backend omits stable channel ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              name: "Missing Id Channel",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Channel id is required/,
      );
    },
  );
});

test("admin channel list fails closed when backend returns malformed channel rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
            "malformed-channel-row",
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Channel record is required/,
      );
    },
  );
});

test("admin channel list loads provider accounts without exposing direct model bindings", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async (captured) => {
      const { channels } = await ChannelService.fetchChannels();

      assert.deepEqual(channels.map((channel) => ({
        id: channel.id,
        channelId: channel.channelId,
        name: channel.name,
        vendor: channel.vendor,
        hasModels: "models" in channel,
      })), [
        {
          id: "channel-1",
          channelId: "9001",
          name: "OpenAI Primary",
          vendor: "OpenAI",
          hasModels: false,
        },
      ]);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /backend/v3/api/integration/channels"],
      );
    },
  );
});

test("admin channel list fails closed when backend returns unsupported channel status", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              weight: 100,
              status: "archived",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Unsupported channel status: archived/,
      );
    },
  );
});

test("admin channel delete treats a resolved SDK void response as success", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels/channel-2" && init?.method === "DELETE") {
        return undefined;
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.doesNotReject(async () => {
        assert.equal(await ChannelService.deleteChannel("channel-2"), true);
      });
    },
  );
});

test("admin channel list fails closed when backend returns incomplete retry policy", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              retryPolicy: {
                retryableStatusCodes: [429],
              },
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Channel retryPolicy.maxAttempts is required/,
      );
    },
  );
});

test("admin channel list fails closed when backend returns unsupported retry statuses", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/integration/channels" && init?.method === "GET") {
        return {
          items: [
            {
              id: "channel-1",
              name: "OpenAI Primary",
              vendor: "OpenAI",
              ...channelContractDefaults(),
              protocol: "OpenAI",
              accessType: "api-key",
              secretRef: "vault://providers/openai/main",
              createdAt: "2026-05-05T08:00:00Z",
              capabilities: ["llm"],
              isMultimodal: false,
              retryPolicy: {
                maxAttempts: 3,
                retryableStatusCodes: [429, 418],
              },
              weight: 100,
              status: "active",
              balance: "N/A",
              errors: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => ChannelService.fetchChannels(),
        /Channel retryPolicy\.retryableStatusCodes contains unsupported status: 418/,
      );
    },
  );
});

test("admin channel table fills the available admin viewport", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "AdminTableShell",
    "data-admin-channel-table-card",
    "data-admin-channel-table-viewport",
    "flex h-full min-h-0 w-full flex-col",
    "className=\"flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]\"",
    "viewportClassName=\"min-h-0 flex-1\"",
    "sticky top-0 z-10",
    "footer={",
  ]) {
    assert.ok(source.includes(expected), `missing adaptive admin channel table marker: ${expected}`);
  }
});

test("admin channel standalone resource and endpoint tables are removed", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("data-admin-channel-ai-resource-table-card"), false);
  assert.equal(source.includes("data-admin-channel-ai-resource-table-viewport"), false);
  assert.equal(source.includes("data-admin-channel-endpoint-table-card"), false);
  assert.equal(source.includes("data-admin-channel-endpoint-table-viewport"), false);
  assert.match(source, /<ChannelPaginatedAiResourceSelectorModal/);
  assert.match(source, /<AiResourceGroupSelectorModal/);
});
