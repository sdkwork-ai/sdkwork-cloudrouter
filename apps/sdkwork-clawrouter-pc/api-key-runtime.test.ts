import assert from "node:assert/strict";
import test from "node:test";

import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  createApiKeyInputsFromForm,
  createApiKeyInputFromForm,
  type ApiKeyFormValues,
} from "./packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyForm.ts";
import { ApiKeyService } from "./packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts";
import {
  formatAccountGroupOptionLabel,
  resolveAccountGroupCode,
  resolveAccountGroupName,
} from "./packages/sdkwork-clawrouter-pc-console-api-keys/src/accountGroups.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedSdkRequest = {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
};

type ApiKeySdkResponder = (request: CapturedSdkRequest, index: number) => unknown;

async function withApiKeySdkResponse<T>(
  responseBody: unknown,
  fn: (captured: CapturedSdkRequest[]) => Promise<T>,
): Promise<T> {
  return withApiKeySdkResponder(() => responseBody, fn);
}

async function withApiKeySdkResponder<T>(
  responder: ApiKeySdkResponder,
  fn: (captured: CapturedSdkRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedSdkRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: { dispatchEvent: () => true },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : "",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    const request = captured[captured.length - 1];
    const responseBody = responder(request, captured.length - 1);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  storeAppSessionFromResult({
    code: "2000",
    data: { accessToken: "test-access-token", authToken: "test-auth-token" },
  });
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

test("console api key form values normalize into a single create command", () => {
  const values: ApiKeyFormValues & Record<string, unknown> = {
    id: "view-key",
    maskedKey: "sk-****",
    usedQuota: "999",
    status: "enabled",
    name: "  Production Key  ",
    accountGroup: " default ",
    quota: " 123.450000 ",
    isUnlimitedQuota: false,
    modalities: ["text", "image", "text"],
    ipLimit: " 10.0.0.0/24, 192.168.1.10 ",
    expires: " 2026-06-01T08:30 ",
    createCount: 2,
  };

  const input = createApiKeyInputFromForm(values, 1);

  assert.deepEqual(input, {
    name: "Production Key",
    accountGroup: "default",
    quota: "123.450000",
    isUnlimitedQuota: false,
    modalities: ["text", "image"],
    ipLimit: "10.0.0.0/24, 192.168.1.10",
    expires: "2026-06-01T08:30",
  });
  assert.equal("id" in input, false);
  assert.equal("maskedKey" in input, false);
  assert.equal("usedQuota" in input, false);
  assert.equal("status" in input, false);
});

test("console api key batch form values create deterministic names", () => {
  const values: ApiKeyFormValues = {
    name: " Key ",
    accountGroup: " standard ",
    quota: "",
    isUnlimitedQuota: true,
    modalities: ["text"],
    ipLimit: "",
    expires: "",
    createCount: 2,
  };

  const inputs = createApiKeyInputsFromForm(values);

  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].name, "Key 1");
  assert.equal(inputs[1].name, "Key 2");
  assert.deepEqual(inputs[0], {
    name: "Key 1",
    accountGroup: "standard",
    quota: "0.000000",
    isUnlimitedQuota: true,
    modalities: ["text"],
    ipLimit: "unrestricted",
    expires: "never",
  });
});

test("console api key form values default blank groups to the default group", () => {
  const input = createApiKeyInputFromForm({
    name: "Production Key",
    accountGroup: "",
    quota: "0.000000",
    isUnlimitedQuota: true,
    modalities: ["text"],
    ipLimit: "",
    expires: "",
    createCount: 1,
  });

  assert.equal(input.accountGroup, "default");
});

test("console api key form values reject blank or invalid command fields", () => {
  const values: ApiKeyFormValues = {
    name: "Production",
    accountGroup: "default",
    quota: "100",
    isUnlimitedQuota: false,
    modalities: ["text"],
    ipLimit: "",
    expires: "",
    createCount: 1,
  };

  assert.throws(() => createApiKeyInputFromForm({ ...values, name: "" }), /name is required/);
  assert.equal(createApiKeyInputFromForm({ ...values, accountGroup: "" }).accountGroup, "default");
  assert.throws(() => createApiKeyInputFromForm({ ...values, quota: "not-a-number" }), /quota must be a non-negative decimal/);
  assert.throws(() => createApiKeyInputFromForm({ ...values, modalities: ["text", "unknown"] }), /Unsupported API key modality: unknown/);
  assert.throws(() => createApiKeyInputFromForm({ ...values, modalities: [] }), /modalities must include at least one item/);
  assert.throws(() => createApiKeyInputsFromForm({ ...values, createCount: 150 }), /createCount must be between 1 and 100/);
});

test("console api key drawer uses the default group when no groups are available", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/CreateKeyDrawer.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /groups\[0\]\?\.code\s*\?\?\s*DEFAULT_ACCOUNT_GROUP/);
  assert.match(source, /<option value=\{DEFAULT_ACCOUNT_GROUP\}>\{t\('console\.apiKeys\.defaultGroup', '默认分组'\)\}<\/option>/);
  assert.doesNotMatch(source, /<option value="">No groups available<\/option>/);
});

test("console account group labels use group names while preserving submitted group codes", () => {
  const groups = [
    { id: "GRP-premium", code: "premium", name: "Premium accounts", rate: "0.80" },
    { id: "group-default", code: "default", name: "Default routing", rate: null },
  ];

  assert.equal(resolveAccountGroupName("premium", groups), "Premium accounts");
  assert.equal(resolveAccountGroupName("GRP-premium", groups), "Premium accounts");
  assert.equal(resolveAccountGroupCode("GRP-premium", groups), "premium");
  assert.equal(resolveAccountGroupName("legacy", groups), "legacy");
  assert.equal(resolveAccountGroupCode("legacy", groups), "legacy");
  assert.equal(formatAccountGroupOptionLabel(groups[0]), "Premium accounts (0.80)");
  assert.equal(formatAccountGroupOptionLabel(groups[1]), "Default routing");
});

test("console account group selectors render group names while submitting group codes", async () => {
  const [drawerSource, listSource, usageSource] = await Promise.all([
    import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/CreateKeyDrawer.tsx", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/usage-details/ApiKeyUsageDetailsDrawer.tsx", import.meta.url), "utf8"),
    ),
  ]);

  assert.match(drawerSource, /value=\{item\.code\}/);
  assert.doesNotMatch(drawerSource, /resolveAccountGroupCode\(initialData\.group, groups\)/);
  assert.match(drawerSource, /groups\.some\(\(item\) => item\.code === normalizedGroup\)/);
  assert.match(drawerSource, /formatAccountGroupOptionLabel\(item\)/);
  assert.match(drawerSource, /groups\.some\(\(item\) => item\.code === normalizedGroup\)/);
  assert.match(listSource, /displayAccountGroupName\(key, groups\)/);
  assert.match(listSource, /openGroupSelector\(key\)/);
  assert.match(listSource, /formatAccountGroupOptionLabel\(group\)/);
  assert.match(listSource, /value=\{group\.code\}/);
  assert.doesNotMatch(listSource, />\s*\{group\.code\}\s*<\/option>/);
  assert.match(usageSource, /apiKey\.accountGroupName \?\? apiKey\.accountGroup/);
});

test("console api key page lazily loads groups only when group choices are opened", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /ensureGroupsLoaded/);
  assert.match(source, /ApiKeyService\.fetchGroups\(\)/);
  assert.match(source, /onClick=\{\(\) => \{\s*void openCreateDrawer\(\);\s*\}\}/);
  assert.match(source, /const openCreateDrawer = async \(\) => \{\s*setShowCreateDrawer\(true\);\s*\};/);
  assert.match(source, /onFocus=\{\(\) => \{\s*void ensureGroupsLoaded\(\);\s*\}\}/);
  assert.match(source, /openGroupSelector\(key\)/);
  assert.doesNotMatch(source, /setGroups\(data\.groups\)/);
  assert.doesNotMatch(source, /ApiKeyService\.fetchKeys\(\)[\s\S]*\.then\(\(data\) =>[\s\S]*setGroups/);
});

test("console api key list never copies masked key material", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.doesNotMatch(source, /CopyButton[\s\S]*text=\{key\.maskedKey\}/);
  assert.doesNotMatch(source, /copyableKey/);
  assert.doesNotMatch(source, /console\.apiKeys\.copyKey/);
});

test("console api key service returns raw key only from create and never from list", async () => {
  await withApiKeySdkResponder(
    (request) => {
      if (request.method === "POST") {
        return {
          code: 0,
          traceId: "trace-api-key-create",
          data: {
            item: {
              id: "key-2",
              name: "Created",
              maskedKey: "sk-****wxyz",
              accountGroup: "default",
              rate: null,
              quota: "0.000000",
              usedQuota: "0.000000",
              modalities: ["text"],
              ipLimit: "unrestricted",
              created: "2026-05-05T09:00:00Z",
              expires: "never",
              status: "enabled",
            },
            rawKey: "sk-live-created-secret",
          },
        };
      }

      return {
        code: "2000",
        msg: "success",
        data: {
          items: [
            {
              id: "key-2",
              name: "Created",
              maskedKey: "sk-****wxyz",
              accountGroup: "default",
              rate: null,
              quota: "0.000000",
              usedQuota: "0.000000",
              modalities: ["text"],
              ipLimit: "unrestricted",
              created: "2026-05-05T09:00:00Z",
              expires: "never",
              status: "enabled",
            },
          ],
        },
      };
    },
    async () => {
      const created = await ApiKeyService.createKey({
        name: "Created",
        accountGroup: "default",
        quota: "0.000000",
        isUnlimitedQuota: true,
        modalities: ["text"],
        ipLimit: "unrestricted",
        expires: "never",
      });
      const fetched = await ApiKeyService.fetchKeys();

      assert.equal(created.rawKey, "sk-live-created-secret");
      assert.equal("copyableKey" in created.key, false);
      assert.equal("copyableKey" in fetched.keys[0], false);
    },
  );
});

test("console api key list replaces rows with backend metadata across updates", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /mergeUpdatedApiKey/);
  assert.doesNotMatch(source, /copyableKey:\s*updated\.copyableKey\s*\?\?\s*current\.copyableKey/);
  assert.match(source, /return updated;/);
  assert.match(source, /previous\.map\(\(item\) => mergeUpdatedApiKey\(item, updated\)\)/);
});

test("console api key list exposes details, edit, delete, and quick group actions", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /setUsageDetailsKey\(key\)/);
  assert.match(source, /<ApiKeyUsageDetailsDrawer/);
  assert.match(source, /setDetailsKey\(key\)/);
  assert.match(source, /setEditingKey\(key\)/);
  assert.match(source, /setDeletingKey\(key\)/);
  assert.match(source, /handleGroupChange\(key,\s*event\.target\.value\)/);
});

test("console api key creation success modal can open usage details for created keys", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /interface CreatedSecret[\s\S]*key: ApiKey;/);
  assert.match(source, /created\.push\(\{ key: result\.key, rawKey: result\.rawKey \}\)/);
  assert.match(source, /handleCreatedKeyUsageDetails\(item\.key\)/);
  assert.match(source, /setUsageDetailsKey\(key\)/);
  assert.match(source, /setShowSuccessModal\(false\)/);
  assert.match(source, /setCreatedKeys\(\[\]\)/);
  assert.match(source, /t\('console\.apiKeys\.usageDetails'/);
  assert.match(source, /<ApiKeyUsageDetailsDrawer[\s\S]*apiKey=\{usageDetailsKey\}/);
});

test("console api key table separates status and created columns after IP ACL", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  const headerOrder = [
    "console.apiKeys.nameToken",
    "console.apiKeys.group",
    "console.apiKeys.quota",
    "console.apiKeys.modalities",
    "console.apiKeys.ipAcl",
    "console.apiKeys.status",
    "console.apiKeys.created",
    "console.apiKeys.expiration",
    "common.actions.actions",
  ].map((key) => source.indexOf(key));

  assert.equal(headerOrder.every((index) => index >= 0), true);
  assert.deepEqual([...headerOrder].sort((left, right) => left - right), headerOrder);
  assert.doesNotMatch(source, /console\.apiKeys\.statusGroup/);
  assert.doesNotMatch(source, /Status \/ Group/);
  assert.match(source, /colSpan=\{9\}/);
  assert.match(source, /{key\.ipLimit}[\s\S]*displayApiKeyStatus\(key\.status, t\)[\s\S]*{key\.created}[\s\S]*{key\.expires}/);
});

test("console api key page starts with the action toolbar without a duplicate title header", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.doesNotMatch(source, /<h1[^>]*>\{t\('console\.apiKeys\.title', 'API Keys'\)\}<\/h1>/);
  assert.doesNotMatch(source, /<Key className=/);
  assert.doesNotMatch(source, /(^|\n)\s*Key,\r?\n/);
  assert.doesNotMatch(source, /py-2 border-b border-slate-200/);
  assert.match(source, /<Plus className="w-4 h-4" \/>\s*\{t\('common\.actions\.createKey'\)\}/);
  assert.match(source, /placeholder=\{t\('console\.apiKeys\.searchPlaceholder'/);
});

test("console api key table keeps pagination visible while rows scroll inside the viewport", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /className="[^"]*flex[^"]*h-full[^"]*flex-col[^"]*overflow-hidden/);
  assert.match(source, /className="[^"]*shrink-0[^"]*flex[^"]*flex-col[^"]*md:flex-row/);
  assert.match(source, /className="[^"]*flex[^"]*flex-col[^"]*flex-1[^"]*min-h-0/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-auto/);
  assert.match(source, /className="[^"]*sticky[^"]*top-0[^"]*z-10/);
  assert.match(source, /className="[^"]*shrink-0[^"]*border-t/);
  assert.doesNotMatch(source, /\{filteredKeys\.length > 0 && \(/);
  assert.doesNotMatch(source, /\.slice\(/);
  assert.match(source, /ApiKeyService\.fetchKeys\(\{/);
  assert.match(source, /setTotalKeys\(data\.total\)/);
});

test("console api key service reads SdkWork list totals from pageInfo.totalItems", async () => {
  const serviceSource = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts", import.meta.url), "utf8"),
  );

  assert.match(serviceSource, /readApiKeyListPageTotal/);
  assert.match(serviceSource, /totalItems', 'total_items'/);
  assert.match(serviceSource, /iam\.apiKeys\.list\(toApiKeyListQueryParams/);
});

test("console api key usage details profiles cover supported tool setup tabs", async () => {
  const {
    API_KEY_USAGE_TOOL_PROFILES,
    buildApiKeyUsageToolSnippets,
    resolveGatewayEndpoint,
  } = await import("./packages/sdkwork-clawrouter-pc-console-api-keys/src/usage-details/toolProfiles.ts");

  assert.deepEqual(
    API_KEY_USAGE_TOOL_PROFILES.map((profile) => profile.id),
    ["codex", "claude-code", "gemini", "opencode", "openclaw", "hermes-agent"],
  );
  assert.equal(resolveGatewayEndpoint("https://console.example.test/v1", "openai"), "https://console.example.test/v1");
  assert.equal(resolveGatewayEndpoint("https://console.example.test/v1", "anthropic"), "https://console.example.test/anthropic");
  assert.equal(resolveGatewayEndpoint("https://console.example.test/proxy/v1", "gemini"), "https://console.example.test/proxy/google/v1beta");

  const snippets = buildApiKeyUsageToolSnippets({
    apiKeyPlaceholder: "<YOUR_CLAW_ROUTER_API_KEY>",
    openAiBaseUrl: "https://console.example.test/v1",
    anthropicBaseUrl: "https://console.example.test/anthropic",
    geminiBaseUrl: "https://console.example.test/google/v1beta",
  });

  assert.match(snippets.codex, /model_provider = "clawrouter"/);
  assert.match(snippets.codex, /env_key = "CLAW_ROUTER_API_KEY"/);
  assert.match(snippets["claude-code"], /ANTHROPIC_BASE_URL="https:\/\/console\.example\.test\/anthropic"/);
  assert.match(snippets.gemini, /GOOGLE_GEMINI_BASE_URL="https:\/\/console\.example\.test\/google\/v1beta"/);
  assert.match(snippets.opencode, /"npm": "@ai-sdk\/openai-compatible"/);
  assert.match(snippets.opencode, /"options": \{/);
  assert.match(snippets.openclaw, /base_url: https:\/\/console\.example\.test\/v1/);
  assert.match(snippets["hermes-agent"], /baseUrl: "https:\/\/console\.example\.test\/v1"/);
  assert.match(snippets["hermes-agent"], /protocol: openai/);
  assert.doesNotMatch(snippets["hermes-agent"], /OPENAI_API_KEY/);
});

test("console api key usage details drawer never exposes persisted full-key copy", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/usage-details/ApiKeyUsageDetailsDrawer.tsx", import.meta.url), "utf8"),
  );

  assert.doesNotMatch(source, /copyableKey/);
  assert.match(source, /<YOUR_CLAW_ROUTER_API_KEY>/);
  assert.doesNotMatch(source, /text=\{apiKey\.maskedKey\}/);
});

test("console api key details drawer displays masked keys without copying masked material", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/CreateKeyDrawer.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /value=\{initialData\.maskedKey\}/);
  assert.doesNotMatch(source, /CopyButton[\s\S]*text=\{value\}/);
  assert.doesNotMatch(source, /copyableKey/);
});

test("console api key edit drawer hides batch create controls", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-console-api-keys/src/CreateKeyDrawer.tsx", import.meta.url), "utf8"),
  );

  assert.match(source, /\{!isView && !isEdit && \(/);
});

test("console api key i18n keys are present in English and Chinese resources", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/api-keys.ts", import.meta.url), "utf8"),
  );

  for (const key of [
    "console.apiKeys.changeGroup",
    "console.apiKeys.copyKey",
    "console.apiKeys.deleteTitle",
    "console.apiKeys.editTitle",
    "console.apiKeys.maskedToken",
    "console.apiKeys.loadingGroups",
    "console.apiKeys.usageDetails",
    "console.apiKeys.usageDetailsTitle",
    "console.apiKeys.usageDetails.copySnippet",
  ]) {
    assert.equal(source.match(new RegExp(`"${key}"`, "g"))?.length, 2, `${key} must be translated in both locales`);
  }
});

test("console api key service fetches keys through the generated app SDK and normalizes envelope data", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      msg: "success",
      data: {
        items: [
          {
            id: "key-1",
            name: "Production",
            maskedKey: "sk-****abcd",
            accountGroup: "default",
            accountGroupName: "Default group",
            rate: "0.25",
            quota: "100.000000",
            usedQuota: "3.500000",
            modalities: ["text", "image"],
            ipLimit: "unrestricted",
            created: "2026-05-05T09:00:00Z",
            expires: "never",
            status: "enabled",
          },
        ],
      },
    },
    async (captured) => {
      const result = await ApiKeyService.fetchKeys();

      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/app/v3/api/iam/api_keys");
      assert.equal(captured[0].method, "GET");
      assert.deepEqual(result.keys.map((key) => key.id), ["key-1"]);
      assert.equal("copyableKey" in result.keys[0], false);
      assert.equal(result.keys[0].accountGroupName, "Default group");
    },
  );
});

test("console api key service fetches selectable account groups through the generated app SDK only when requested", async () => {
  await withApiKeySdkResponder(
    (request) => {
      if (request.url === "/app/v3/api/ai/routing/account_groups") {
        return {
          code: "2000",
          msg: "success",
          data: {
            items: [{ id: "group-1", groupCode: "default", groupName: "Default group", costMultiplier: null }],
          },
        };
      }
      return {
        code: "2000",
        msg: "success",
        data: { items: [] },
      };
    },
    async (captured) => {
      const keys = await ApiKeyService.fetchKeys();
      assert.deepEqual(keys.keys, []);
      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/app/v3/api/iam/api_keys");

      const groups = await ApiKeyService.fetchGroups();
      assert.equal(captured.length, 2);
      assert.equal(captured[1].url, "/app/v3/api/ai/routing/account_groups");
      assert.deepEqual(groups.map((group) => group.name), ["Default group"]);
    },
  );
});

test("console api key service lists masked metadata without reusable key material", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      msg: "success",
      data: {
        items: [
          {
            id: "key-1",
            name: "Production",
            maskedKey: "sk-****abcd",
            accountGroup: "default",
            accountGroupName: "Default group",
            rate: "0.25",
            quota: "100.000000",
            usedQuota: "3.500000",
            modalities: ["text", "image"],
            ipLimit: "unrestricted",
            created: "2026-05-05T09:00:00Z",
            expires: "never",
            status: "enabled",
          },
        ],
      },
    },
    async () => {
      const result = await ApiKeyService.fetchKeys();

      assert.deepEqual(result.keys.map((key) => key.id), ["key-1"]);
      assert.equal(result.keys[0].maskedKey, "sk-****abcd");
      assert.equal("copyableKey" in result.keys[0], false);
    },
  );
});

test("console api key service creates keys in the default group when the input group is blank", async () => {
  await withApiKeySdkResponse(
    {
      code: 0,
      traceId: "trace-api-key-default-group",
      data: {
        item: {
          id: "key-2",
          name: "Created",
          maskedKey: "sk-****wxyz",
          accountGroup: "default",
          rate: null,
          quota: "0.000000",
          usedQuota: "0.000000",
          modalities: ["text"],
          ipLimit: "unrestricted",
          created: "2026-05-05T09:00:00Z",
          expires: "never",
          status: "enabled",
        },
        rawKey: "sk-live-created-secret",
      },
    },
    async (captured) => {
      await ApiKeyService.createKey({
        name: "Created",
        accountGroup: "",
        quota: "0.000000",
        isUnlimitedQuota: true,
        modalities: ["text"],
        ipLimit: "unrestricted",
        expires: "never",
      });

      assert.equal(captured.length, 1);
      assert.equal(JSON.parse(captured[0].body).accountGroup, "default");
    },
  );
});

test("console api key creation keeps raw key separate from returned metadata", async () => {
  await withApiKeySdkResponse(
    {
      code: 0,
      traceId: "trace-api-key-secret-separation",
      data: {
        item: {
          id: "key-2",
          name: "Created",
          maskedKey: "sk-****wxyz",
          accountGroup: "default",
          rate: null,
          quota: "0.000000",
          usedQuota: "0.000000",
          modalities: ["text"],
          ipLimit: "unrestricted",
          created: "2026-05-05T09:00:00Z",
          expires: "never",
          status: "enabled",
        },
        rawKey: "sk-live-created-secret",
      },
    },
    async () => {
      const result = await ApiKeyService.createKey({
        name: "Created",
        accountGroup: "default",
        quota: "0.000000",
        isUnlimitedQuota: true,
        modalities: ["text"],
        ipLimit: "unrestricted",
        expires: "never",
      });

      assert.equal(result.rawKey, "sk-live-created-secret");
      assert.equal("copyableKey" in result.key, false);
    },
  );
});

test("console api key service creates keys through the generated app SDK with idempotency keys only", async () => {
  await withApiKeySdkResponse(
    {
      code: 0,
      traceId: "trace-api-key-idempotency",
      data: {
        item: {
          id: "key-2",
          name: "Created",
          maskedKey: "sk-****wxyz",
          accountGroup: "default",
          rate: null,
          quota: "0.000000",
          usedQuota: "0.000000",
          modalities: ["text"],
          ipLimit: "unrestricted",
          created: "2026-05-05T09:00:00Z",
          expires: "never",
          status: "enabled",
        },
        rawKey: "sk-live-created-secret",
      },
    },
    async (captured) => {
      const result = await ApiKeyService.createKey({
        name: "Created",
        accountGroup: "default",
        quota: "0.000000",
        isUnlimitedQuota: true,
        modalities: ["text"],
        ipLimit: "unrestricted",
        expires: "never",
      });

      assert.equal(result.rawKey, "sk-live-created-secret");
      assert.equal(result.key.id, "key-2");
      assert.equal("copyableKey" in result.key, false);
      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/app/v3/api/iam/api_keys");
      assert.equal(captured[0].method, "POST");
      assert.match(captured[0].body, /"name":"Created"/);
      assert.match(captured[0].headers["idempotency-key"], /^create-api-key-/);
      assert.equal(captured[0].headers["x-request-id"], undefined);
    },
  );
});

test("console api key service updates keys through the generated app SDK without request ids", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        item: {
          id: "key-2",
          name: "Updated",
          maskedKey: "sk-****wxyz",
          accountGroup: "premium",
          rate: null,
          quota: "0.000000",
          usedQuota: "0.000000",
          modalities: ["text"],
          ipLimit: "unrestricted",
          created: "2026-05-05T09:00:00Z",
          expires: "never",
          status: "enabled",
        },
      },
    },
    async (captured) => {
      const result = await ApiKeyService.updateKey("key-2", {
        name: "Updated",
        accountGroup: "premium",
        quota: "0.000000",
        isUnlimitedQuota: true,
        modalities: ["text"],
        ipLimit: "",
        expires: "",
      });

      assert.equal(result.accountGroup, "premium");
      assert.equal("copyableKey" in result, false);
      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/app/v3/api/iam/api_keys/key-2");
      assert.equal(captured[0].method, "PATCH");
      assert.match(captured[0].body, /"accountGroup":"premium"/);
      assert.equal(JSON.parse(captured[0].body).ipLimit, "unrestricted");
      assert.equal(captured[0].headers["x-request-id"], undefined);
    },
  );
});

test("console api key service deletes keys through the generated app SDK", async () => {
  await withApiKeySdkResponse(
    { code: "2000", data: { id: "key-2", deleted: true } },
    async (captured) => {
      await ApiKeyService.deleteKey("key-2");

      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/app/v3/api/iam/api_keys/key-2");
      assert.equal(captured[0].method, "DELETE");
    },
  );
});

test("console api key service fails closed when fetched key rows omit stable ids", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            name: "Missing Id",
            maskedKey: "sk-****abcd",
            accountGroup: "default",
          },
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchKeys(),
        /API key id is required/,
      );
    },
  );
});

test("console api key service fails closed when fetched key rows omit masked key material", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "key-1",
            name: "Missing Mask",
            accountGroup: "default",
          },
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchKeys(),
        /API key masked value is required/,
      );
    },
  );
});

test("console api key service fails closed when fetched selectable account groups omit stable codes", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        items: [{ id: "group-1", name: "Missing Code" }],
      },
    },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchGroups(),
        /Account group code is required/,
      );
    },
  );
});

test("console api key service fails closed when fetched keys contain unsupported modalities", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "key-1",
            name: "Production",
            maskedKey: "sk-****abcd",
            accountGroup: "default",
            rate: null,
            quota: "100.000000",
            usedQuota: "3.500000",
            modalities: ["text", "unknown"],
            ipLimit: "unrestricted",
            created: "2026-05-05T09:00:00Z",
            expires: "never",
            status: "enabled",
          },
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchKeys(),
        /Unsupported API key modality: unknown/,
      );
    },
  );
});

test("console api key creation fails closed when response omits stable key entity", async () => {
  await withApiKeySdkResponse(
    {
      code: 0,
      traceId: "trace-api-key-invalid-entity",
      data: {
        item: {
            id: "key-2",
            maskedKey: "sk-****wxyz",
        },
        rawKey: "sk-live-created-secret",
      },
    },
    async () => {
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Created",
            accountGroup: "default",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: ["text"],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /API key creation response is missing key data/,
      );
    },
  );
});

test("console api key creation fails closed when response omits raw key material", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        item: {
            id: "key-2",
            name: "Created",
            maskedKey: "sk-****wxyz",
            accountGroup: "default",
            rate: null,
          quota: "0.000000",
          usedQuota: "0.000000",
          modalities: ["text"],
          ipLimit: "unrestricted",
          created: "2026-05-05T09:00:00Z",
          expires: "never",
          status: "enabled",
        },
      },
    },
    async () => {
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Created",
            accountGroup: "default",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: ["text"],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /API key creation response is missing key material/,
      );
    },
  );
});

test("console api key service rejects invalid create commands before calling generated app SDK", async () => {
  await withApiKeySdkResponse(
    {
      code: "2000",
      data: {
        item: {
          id: "unexpected",
          maskedKey: "sk-****unexpected",
        },
        rawKey: "sk-unexpected",
      },
    },
    async (captured) => {
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "",
            accountGroup: "default",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: ["text"],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /name is required/,
      );
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Production",
            accountGroup: "",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: [],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /modalities must include at least one item/,
      );
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Production",
            accountGroup: "default",
            quota: "-1",
            isUnlimitedQuota: false,
            modalities: ["text"],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /quota must be a non-negative decimal/,
      );
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Production",
            accountGroup: "default",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: [],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /modalities must include at least one item/,
      );
      await assert.rejects(
        () =>
          ApiKeyService.createKey({
            name: "Production",
            accountGroup: "default",
            quota: "0.000000",
            isUnlimitedQuota: true,
            modalities: ["unknown"],
            ipLimit: "unrestricted",
            expires: "never",
          }),
        /Unsupported API key modality: unknown/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("console api key service rejects API business failures with the backend message", async () => {
  await withApiKeySdkResponse(
    { code: "4001", msg: "API key quota exceeded", data: null },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchKeys(),
        /API key quota exceeded/,
      );
    },
  );
});

test("console api key service fails closed for non-API envelope responses", async () => {
  await withApiKeySdkResponse(
    { data: { items: [] } },
    async () => {
      await assert.rejects(
        () => ApiKeyService.fetchKeys(),
        /console\.apiKeys\.errors\.loadFallback/,
      );
    },
  );
});
