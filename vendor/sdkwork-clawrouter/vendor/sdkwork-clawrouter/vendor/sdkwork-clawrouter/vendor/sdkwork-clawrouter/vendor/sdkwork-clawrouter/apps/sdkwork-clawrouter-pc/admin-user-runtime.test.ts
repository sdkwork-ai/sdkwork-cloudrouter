import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import { UserService } from "./packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts";
import {
  createApiKeyInputFromForm,
  createUserGroupUpdateInputFromForm,
  createUserInputFromForm,
  createUserProfileUpdateInputFromForm,
  createUserStatusUpdateInput,
} from "./packages/sdkwork-clawrouter-pc-admin-user/src/userForm.ts";
import { resources } from "./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedBackendRequest = {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
};

async function withBackendSdkResponse<T>(
  responseBody: unknown,
  fn: (captured: CapturedBackendRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedBackendRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      __CLAWROUTER_ENV__: {
        VITE_CLAWROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
        VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL: "https://appbase.example.com/backend/v3/api",
      },
      dispatchEvent: () => true,
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : "",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    return new Response(JSON.stringify(responseBody), {
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("admin user create input does not reuse the returned user view model", () => {
  const form = new FormData();
  form.set("email", " admin@example.com ");
  form.set("username", " Root User ");
  form.set("balance", "42.5");
  form.set("password", "ignored-password");
  form.set("concurrency", "99");

  const input = createUserInputFromForm(form);

  assert.deepEqual(input, {
    email: "admin@example.com",
    username: "Root User",
    balance: "42.50",
  });
  for (const field of ["id", "role", "group", "status", "lastActive", "lastUsed", "createdAt"]) {
    assert.equal(field in input, false);
  }
});

test("admin user create input rejects invalid balances instead of defaulting to zero", () => {
  const form = new FormData();
  form.set("email", "billing@example.com");
  form.set("username", " ");
  form.set("balance", "not-a-number");

  assert.throws(() => createUserInputFromForm(form), /balance must be a non-negative money amount/);

  const blankBalance = new FormData();
  blankBalance.set("email", "billing@example.com");
  assert.deepEqual(createUserInputFromForm(blankBalance), {
    email: "billing@example.com",
    balance: "0.00",
  });
});

test("admin API key create input uses stable command naming without clock drift", () => {
  const named = new FormData();
  named.set("keyName", " Production Key ");

  assert.deepEqual(createApiKeyInputFromForm(named, "9007199254740993"), {
    userId: "9007199254740993",
    name: "Production Key",
  });

  const unnamed = new FormData();
  assert.deepEqual(createApiKeyInputFromForm(unnamed, "9007199254740993"), {
    userId: "9007199254740993",
    name: "Default API Key",
  });
});

test("admin user balance adjustment modals do not expose unsupported remark fields", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );
  const formSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/userForm.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /name="remark"/);
  assert.doesNotMatch(formSource, /createUserBalanceAdjustmentInputFromForm/);
  assert.doesNotMatch(source, />\u5a62\u8dfa\u6d26\u93c1?\/label>/u);
});

test("admin user records modal does not render static fake success rows", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<td className="px-4 py-3 font-mono text-xs">Unavailable<\/td>/);
  assert.doesNotMatch(source, /text-emerald-600 bg-emerald-50/);
  assert.match(source, /Records are available from the billing history and recharge records modules/);
});

test("admin user modals do not expose password controls without a backend password command", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /name="password"/);
  assert.doesNotMatch(source, /generatedPassword/);
  assert.doesNotMatch(source, /generateRandomPassword/);
  assert.match(source, /Password setup is managed by IAM registration and reset flows/);
});

test("admin user create modal does not expose unsupported concurrency controls", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /name="concurrency"/);
  assert.doesNotMatch(source, />\u6960\u70b6\u6cdb\u8930\u509e\u5f2b?\/label>/u);
  assert.doesNotMatch(source, />Concurrency<\/label>/);
});

test("admin user profile update input does not reuse returned user fields", () => {
  const form = new FormData();
  form.set("username", " Billing Owner ");
  form.set("password", "ignored-password");
  form.set("email", "ignored@example.com");
  form.set("status", "banned");

  const input = createUserProfileUpdateInputFromForm(form);

  assert.deepEqual(input, {
    username: "Billing Owner",
  });
  for (const field of ["id", "email", "role", "group", "balance", "status", "lastActive", "lastUsed", "createdAt"]) {
    assert.equal(field in input, false);
  }

  const blank = new FormData();
  blank.set("username", " ");
  assert.deepEqual(createUserProfileUpdateInputFromForm(blank), {});
});

test("admin user group update input is isolated from the user view model", () => {
  const form = new FormData();
  form.set("group", " vip ");
  form.set("role", "admin");
  form.set("balance", "100");

  assert.deepEqual(createUserGroupUpdateInputFromForm(form), {
    group: "vip",
  });
});

test("admin user status update input uses the backend supported status enum", () => {
  assert.deepEqual(createUserStatusUpdateInput("active"), {
    status: "active",
  });
  assert.deepEqual(createUserStatusUpdateInput("banned"), {
    status: "banned",
  });
  assert.throws(
    () => createUserStatusUpdateInput("disabled"),
    /status must be active or banned/,
  );
});

test("admin user table exposes backend-backed status toggle actions", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /handleStatusToggle/);
  assert.match(source, /createUserStatusUpdateInput\(nextStatus\)/);
  assert.match(source, /getStatusToggleLabel/);
  assert.match(source, /u\.status === 'active' \? t\('admin\.user\.index\.actions\.disable'/);
  assert.match(source, /: t\(['"]common\.actions\.enable['"]/);
});

test("admin user group selector preserves backend custom groups", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /createDefaultUserGroupOptions\(t\)/);
  assert.match(source, /defaultUserGroupOptions\.some\(\(group\) => group\.value === groupsTarget\.group\)/);
  assert.match(
    source,
    /t\('admin\.user\.groups\.current', '\{\{group\}\} \(current\)', \{ group: groupsTarget\.group \}\)/,
  );
});

test("admin user search is applied by clicking query and can refresh current data", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[searchDraft, setSearchDraft\] = useState\(''\);/);
  assert.match(source, /const \[appliedSearch, setAppliedSearch\] = useState\(''\);/);
  assert.match(source, /const loadUsers = async \(searchText = appliedSearch\) => \{/);
  assert.match(source, /const normalizedSearchText = searchText\.trim\(\);/);
  assert.match(source, /UserService\.loadAdminTableData\(\{\s*q: normalizedSearchText \|\| undefined,\s*pageSize: 200,\s*\}\)/s);
  assert.match(source, /setAppliedSearch\(normalizedSearchText\);/);
  assert.match(source, /onChange=\{\(event\) => setSearchDraft\(event\.target\.value\)\}/);
  assert.match(source, /value=\{searchDraft\}/);
  assert.match(source, /data-admin-user-query-action/);
  assert.match(source, /onClick=\{\(\) => \{ void loadUsers\(searchDraft\); \}\}/);
  assert.match(source, /t\('admin\.user\.index\.actions\.query', 'Query'\)/);
  assert.match(source, /data-admin-user-refresh-action/);
  assert.match(source, /onClick=\{\(\) => \{ void loadUsers\(appliedSearch\); \}\}/);
  assert.match(source, /t\('admin\.user\.index\.actions\.refresh', 'Refresh'\)/);
  assert.doesNotMatch(source, /const visibleUsers/);
  assert.doesNotMatch(source, /users\.filter/);
});

test("admin user static copy is translated through i18n keys", () => {
  const service = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts", import.meta.url),
    "utf8",
  );
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const token of [
    "admin.user.errors.fetchUsersFallback",
    "admin.user.errors.fetchApiKeysFallback",
    "admin.user.errors.addUserFallback",
    "admin.user.errors.updateUserFallback",
    "admin.user.errors.createApiKeyFallback",
  ]) {
    assert.match(service, new RegExp(escapeRegExp(token)));
  }

  for (const token of [
    "t('admin.user.index.searchPlaceholder', 'Search users...')",
    "t('admin.user.index.actions.query', 'Query')",
    "t('admin.user.index.actions.refresh', 'Refresh')",
    "t('admin.user.index.createUser', 'Create user')",
    "t('admin.user.index.columns.user', 'User')",
    "t('admin.user.index.columns.id', 'ID')",
    "t('admin.user.index.columns.username', 'Username')",
    "t('admin.user.index.columns.contact', 'Contact')",
    "t('admin.user.index.columns.region', 'Region')",
    "t('admin.user.index.columns.gender', 'Gender')",
    "t('admin.user.index.columns.role', 'Role')",
    "t('admin.user.index.columns.group', 'Group')",
    "t('admin.user.index.columns.status', 'Status')",
    "t('admin.user.index.columns.lastActive', 'Last active')",
    "t('admin.user.index.columns.lastUsed', 'Last used')",
    "t('admin.user.index.columns.createdAt', 'Created')",
    "t('admin.user.index.columns.actions', 'Actions')",
    "t('admin.user.groups.default', 'default (Default group)')",
    "t('admin.user.groups.vip', 'VIP (Advanced users)')",
    "t('admin.user.groups.svip', 'SVIP (Premium users)')",
    "t('admin.user.index.text.passwordSetupCreate', 'Password setup is handled through registration and reset flows. This form creates the account profile.')",
    "t('admin.user.index.text.passwordSetupEdit', 'Password setup is managed by IAM registration and reset flows. No password update is sent from this profile dialog.')",
    "t('admin.user.index.text.recordsEmptyRecharge', 'No recharge records loaded')",
    "t('admin.user.index.text.recordsEmptyExchange', 'No exchange records loaded')",
    "t('admin.user.index.text.loadingUsers', 'Loading users...')",
    "t('admin.user.index.text.usersLoadError', 'Users could not be loaded')",
    "t('admin.user.index.text.usersEmpty', 'No users found')",
    "t('admin.user.index.text.usersEmptyDescription', 'Create a user before assigning groups, balances, or API keys.')",
    "t('admin.user.index.text.usersRetry', 'Retry')",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(token)));
  }

  assert.doesNotMatch(source, /admin\.user\.index\.text\.[0-9][a-z0-9]*/);
  assert.match(source, /function getUserRoleLabel\(role: string, t: TranslationFunction\): string/);
  assert.match(source, /function getUserGroupLabel\(/);
  assert.match(source, /function getUserStatusLabel\(status: UserListItem\['status'\], t: TranslationFunction\): string/);
  assert.match(source, /function getUserGenderLabel\(gender: string, t: TranslationFunction\): string/);
  assert.match(source, /function formatUserRegion\(user: UserListItem\): string/);
  assert.match(source, /function formatUserPrimaryLabel\(user: UserListItem\): string/);
  assert.match(source, /function displayValue\(value: string \| null \| undefined\): string/);
  assert.match(source, /function getApiKeyStatusLabel\(status: string, t: TranslationFunction\): string/);
  assert.match(source, /\{getUserRoleLabel\(userItem\.role, t\)\}/);
  assert.match(source, /\{getUserGroupLabel\(userItem\.group, defaultUserGroupOptions\)\}/);
  assert.match(source, /\{getUserStatusLabel\(userItem\.status, t\)\}/);
  assert.match(source, /\{getUserGenderLabel\(userItem\.gender, t\)\}/);
  assert.match(source, /\{formatUserRegion\(userItem\)\}/);
  assert.match(source, /\{getApiKeyStatusLabel\(key\.status, t\)\}/);

  assert.match(
    source,
    /t\(\s*'admin\.user\.index\.text\.recordsEmptyDescription',\s*'Records are available from the billing history and recharge records modules; this user dialog does not synthesize transaction rows\.'\s*,?\s*\)/s,
  );
});

test("admin user i18n resources cover visible management copy", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );
  const service = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts", import.meta.url),
    "utf8",
  );
  const keys = new Set([
    ...Array.from(source.matchAll(/['"](admin\.user\.[^'"]+)['"]/g), (match) => match[1]),
    ...Array.from(service.matchAll(/['"](admin\.user\.[^'"]+)['"]/g), (match) => match[1]),
  ]);

  for (const key of keys) {
    assert.equal(typeof resources.en.translation[key], "string", `missing English user i18n key: ${key}`);
    assert.equal(typeof resources.zh.translation[key], "string", `missing Chinese user i18n key: ${key}`);
    assert.notEqual(resources.en.translation[key], "", `empty English user i18n key: ${key}`);
    assert.notEqual(resources.zh.translation[key], "", `empty Chinese user i18n key: ${key}`);
  }

  assert.equal(resources.en.translation["admin.user.index.searchPlaceholder"], "Search users...");
  assert.equal(resources.zh.translation["admin.user.index.searchPlaceholder"], "搜索用户...");
  assert.equal(resources.en.translation["admin.user.index.actions.query"], "Query");
  assert.equal(resources.zh.translation["admin.user.index.actions.query"], "查询");
  assert.equal(resources.en.translation["admin.user.index.actions.refresh"], "Refresh");
  assert.equal(resources.zh.translation["admin.user.index.actions.refresh"], "刷新");
  assert.equal(resources.en.translation["admin.user.index.createUser"], "Create user");
  assert.equal(resources.zh.translation["admin.user.index.createUser"], "创建用户");
  assert.equal(resources.en.translation["admin.user.index.columns.username"], "Username");
  assert.equal(resources.zh.translation["admin.user.index.columns.username"], "用户名");
  assert.equal(resources.en.translation["admin.user.index.columns.region"], "Region");
  assert.equal(resources.zh.translation["admin.user.index.columns.region"], "地区");
  assert.equal(resources.en.translation["admin.user.gender.female"], "Female");
  assert.equal(resources.zh.translation["admin.user.gender.female"], "女");
});

test("admin user table keeps professional optional profile fields from appbase users", async () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );
  const service = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts", import.meta.url),
    "utf8",
  );

  for (const field of ["displayName", "mobile", "gender", "country", "province", "city", "district", "address", "updatedAt"]) {
    assert.match(service, new RegExp(`${field}: string;`), `missing UserListItem field ${field}`);
  }

  assert.match(service, /displayName: readFirstString\(item, \['displayName', 'name', 'nickname', 'title'\]/);
  assert.match(service, /mobile: readFirstString\(item, \['mobile', 'phone', 'phoneNumber'\]\)/);
  assert.match(service, /gender: readFirstString\(item, \['gender', 'sex'\]\)/);
  assert.match(service, /country: readFirstString\(item, \['country', 'countryCode', 'countryName', 'nation'\]\)/);
  assert.match(service, /province: readFirstString\(item, \['province', 'state', 'region'\]\)/);
  assert.match(service, /city: readFirstString\(item, \['city', 'locality'\]\)/);
  assert.match(service, /district: readFirstString\(item, \['district', 'county', 'area'\]\)/);
  assert.match(service, /address: readFirstString\(item, \['address', 'streetAddress', 'addressLine'\]\)/);

  assert.match(source, /t\('admin\.user\.index\.columns\.contact', 'Contact'\)/);
  assert.match(source, /t\('admin\.user\.index\.columns\.region', 'Region'\)/);
  assert.match(source, /t\('admin\.user\.index\.columns\.gender', 'Gender'\)/);
  assert.match(source, /displayValue\(userItem\.email\)/);
  assert.match(source, /displayValue\(userItem\.mobile\)/);
  assert.match(source, /formatUserRegion\(userItem\)/);
  assert.match(source, /getUserGenderLabel\(userItem\.gender, t\)/);
  assert.match(source, /function getUserGenderLabel\(gender: string, t: TranslationFunction\): string/);
  assert.match(source, /function formatUserRegion\(user: UserListItem\): string/);
  assert.match(source, /function formatUserPrimaryLabel\(user: UserListItem\): string/);
  assert.match(source, /function displayValue\(value: string \| null \| undefined\): string/);
  assert.match(source, /data-admin-user-primary-action/);
  assert.match(source, /className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white/);

  assert.equal(resources.en.translation["admin.user.index.columns.region"], "Region");
  assert.equal(resources.zh.translation["admin.user.index.columns.region"], "地区");
  assert.equal(resources.en.translation["admin.user.gender.female"], "Female");
  assert.equal(resources.zh.translation["admin.user.gender.female"], "女");

  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "9007199254740993",
            email: "admin@example.com",
            username: "Admin",
            displayName: "Admin Owner",
            mobile: "+86 13800000000",
            sex: "female",
            countryName: "China",
            province: "Zhejiang",
            city: "Hangzhou",
            district: "Xihu",
            addressLine: "No. 1 Road",
            status: "inactive",
            createdAt: "2026-05-05T08:00:00Z",
            updatedAt: "2026-05-05T09:00:00Z",
          },
        ],
      },
    },
    async () => {
      const users = await UserService.fetchUsers();
      assert.equal(users[0].displayName, "Admin Owner");
      assert.equal(users[0].mobile, "+86 13800000000");
      assert.equal(users[0].gender, "female");
      assert.equal(users[0].country, "China");
      assert.equal(users[0].province, "Zhejiang");
      assert.equal(users[0].city, "Hangzhou");
      assert.equal(users[0].district, "Xihu");
      assert.equal(users[0].address, "No. 1 Road");
      assert.equal(users[0].status, "inactive");
      assert.equal(users[0].role, "");
      assert.equal(users[0].group, "");
      assert.equal(users[0].balance, "");
      assert.equal(users[0].lastActive, "");
      assert.equal(users[0].lastUsed, "");
    },
  );
});

test("admin user list sends remote search and bounded page size through the appbase backend SDK", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "9007199254740993",
            email: "owner@example.com",
            username: "owner",
            displayName: "Owner",
            status: "active",
          },
        ],
      },
    },
    async (captured) => {
      const users = await UserService.fetchUsers({ q: " owner@example.com ", pageSize: 20 });

      assert.equal(users[0].id, "9007199254740993");
      assert.equal(
        captured[0].url,
        "https://appbase.example.com/backend/v3/api/iam/users?page_size=20&q=owner%40example.com",
      );
      assert.equal(captured[0].method, "GET");
    },
  );
});

test("admin user table fills the available admin viewport", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "AdminTableShell",
    "data-admin-user-table-card",
    "data-admin-user-table-viewport",
    "flex h-full min-h-0 w-full flex-col",
    "className=\"flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]\"",
    "viewportClassName=\"min-h-0 flex-1\"",
    "sticky top-0 z-10",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(expected)), `missing adaptive admin user table marker: ${expected}`);
  }
});

test("admin user service reads created API key data returned by the generated backend SDK", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        key: {
          id: "admin-key-1",
          name: "Production Key",
          key: "sk-****1234",
          used: "0",
          status: "active",
        },
        rawKey: "sk-admin-secret",
      },
    },
    async (captured) => {
      const result = await UserService.createApiKey({ userId: "9007199254740993", name: "Production Key" });

      assert.equal(captured[0].url, "/backend/v3/api/iam/api_keys");
      assert.equal(captured[0].method, "POST");
      assert.deepEqual(JSON.parse(captured[0].body), {
        userId: "9007199254740993",
        name: "Production Key",
      });
      assert.equal(result.key.id, "admin-key-1");
      assert.equal(result.rawKey, "sk-admin-secret");
    },
  );
});

test("admin user initial table load preserves users when API key prefetch fails", async () => {
  const users = [
    {
      id: "9007199254740993",
      email: "admin@example.com",
      username: "Admin",
      role: "admin",
      group: "default",
      balance: "0.00",
      status: "active" as const,
      lastActive: "2026-05-05T09:00:00Z",
      lastUsed: "2026-05-05T09:00:00Z",
      createdAt: "2026-05-05T08:00:00Z",
    },
  ];

  const result = await UserService.loadAdminTableData({
    fetchUsers: async () => users,
    fetchApiKeysMap: async () => {
      throw new Error("admin.user.errors.fetchApiKeysFallback");
    },
  });

  assert.deepEqual(result.users, users);
  assert.deepEqual(result.apiKeysMap, {});
  assert.match(result.apiKeysLoadError?.message ?? "", /admin\.user\.errors\.fetchApiKeysFallback/);
});

test("admin user initial table load passes query params to the user list loader", async () => {
  const users = [
    {
      id: "9007199254740993",
      email: "owner@example.com",
      username: "owner",
      displayName: "Owner",
      mobile: "",
      gender: "",
      country: "",
      province: "",
      city: "",
      district: "",
      address: "",
      role: "admin",
      group: "standard",
      balance: "0.00",
      status: "active" as const,
      lastActive: "2026-05-05T09:00:00Z",
      lastUsed: "2026-05-05T09:00:00Z",
      createdAt: "2026-05-05T08:00:00Z",
      updatedAt: "2026-05-05T09:00:00Z",
    },
  ];
  const seenQueries: unknown[] = [];

  const result = await UserService.loadAdminTableData(
    { q: "owner@example.com", pageSize: 20 },
    {
      fetchUsers: async (query) => {
        seenQueries.push(query);
        return users;
      },
      fetchApiKeysMap: async () => ({}),
    },
  );

  assert.deepEqual(result.users, users);
  assert.deepEqual(seenQueries, [{ q: "owner@example.com", pageSize: 20 }]);
});

test("admin user initial table load still fails when the users request fails", async () => {
  await assert.rejects(
    () =>
      UserService.loadAdminTableData({
        fetchUsers: async () => {
          throw new Error("users boom");
        },
        fetchApiKeysMap: async () => ({}),
      }),
    /users boom/,
  );
});

test("admin user create and update use appbase backend IAM users SDK commands", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        item: {
          id: "9007199254740993",
          email: "admin@example.com",
          username: "Admin",
          role: "admin",
          group: "default",
          balance: "0.00",
          status: "active",
          lastActive: "2026-05-05T09:00:00Z",
          lastUsed: "2026-05-05T09:00:00Z",
          createdAt: "2026-05-05T08:00:00Z",
        },
      },
    },
    async (captured) => {
      await UserService.addUser({ email: " admin@example.com ", username: " Admin " });
      await UserService.updateUser("9007199254740993", { username: " Owner ", group: " vip " });

      assert.equal(captured[0].url, "https://appbase.example.com/backend/v3/api/iam/users");
      assert.equal(captured[0].method, "POST");
      assert.deepEqual(JSON.parse(captured[0].body), {
        email: "admin@example.com",
        username: "Admin",
      });
      assert.equal(captured[1].url, "https://appbase.example.com/backend/v3/api/iam/users/9007199254740993");
      assert.equal(captured[1].method, "PATCH");
      assert.deepEqual(JSON.parse(captured[1].body), {
        username: "Owner",
        group: "vip",
      });
      assert.equal(captured[0].headers["x-request-id"], undefined);
      assert.equal(captured[1].headers["x-request-id"], undefined);
      assert.equal(captured[0].headers["idempotency-key"], undefined);
      assert.equal(captured[1].headers["idempotency-key"], undefined);
    },
  );
});

test("admin user service rejects unsafe API key path ids before calling claw-router backend SDK", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: { deleted: true },
    },
    async (captured) => {
      await assert.rejects(
        () => UserService.deleteApiKey("9007199254740993", "key/1"),
        /apiKeyId must be a safe path segment/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin API key delete uses claw-router backend IAM api key SDK", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: { deleted: true },
    },
    async (captured) => {
      await UserService.deleteApiKey("9007199254740993", "admin-key-1");

      assert.equal(captured[0].url, "/backend/v3/api/iam/api_keys/admin-key-1");
      assert.equal(captured[0].method, "DELETE");
      assert.equal(captured[0].body, "");
    },
  );
});

test("admin API key delete fails closed when claw-router backend reports failure", async () => {
  await withBackendSdkResponse(
    {
      code: "4000",
      message: "delete failed",
      data: {},
    },
    async () => {
      await assert.rejects(
        () => UserService.deleteApiKey("9007199254740993", "admin-key-1"),
        /delete failed/,
      );
    },
  );
});

test("admin user list fails closed when backend omits stable user ids", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            email: "missing-id@example.com",
            username: "Missing Id",
            role: "user",
            group: "default",
            balance: "0.00",
            status: "active",
            lastActive: "2026-05-05T09:00:00Z",
            lastUsed: "2026-05-05T09:00:00Z",
            createdAt: "2026-05-05T08:00:00Z",
          },
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.fetchUsers(),
        /User id is required/,
      );
    },
  );
});

test("admin user list fails closed when backend returns malformed user rows", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "9007199254740993",
            email: "admin@example.com",
            username: "Admin",
            role: "admin",
            group: "default",
            balance: "0.00",
            status: "active",
            lastActive: "2026-05-05T09:00:00Z",
            lastUsed: "2026-05-05T09:00:00Z",
            createdAt: "2026-05-05T08:00:00Z",
          },
          "malformed-user-row",
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.fetchUsers(),
        /User record is required/,
      );
    },
  );
});

test("admin user list preserves real users when optional email and profile fields are absent", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "9007199254740993",
            username: "Admin",
            role: "admin",
            group: "default",
            balance: "0.00",
            status: "active",
            lastActive: "2026-05-05T09:00:00Z",
            lastUsed: "2026-05-05T09:00:00Z",
            createdAt: "2026-05-05T08:00:00Z",
          },
        ],
      },
    },
    async () => {
      const users = await UserService.fetchUsers();
      assert.equal(users[0].id, "9007199254740993");
      assert.equal(users[0].email, "");
      assert.equal(users[0].displayName, "");
      assert.equal(users[0].mobile, "");
    },
  );
});

test("admin user list preserves backend user lifecycle statuses instead of failing on real values", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        items: [
          {
            id: "9007199254740993",
            email: "admin@example.com",
            username: "Admin",
            role: "admin",
            group: "default",
            balance: "0.00",
            status: "deleted",
            lastActive: "2026-05-05T09:00:00Z",
            lastUsed: "2026-05-05T09:00:00Z",
            createdAt: "2026-05-05T08:00:00Z",
          },
        ],
      },
    },
    async () => {
      const users = await UserService.fetchUsers();
      assert.equal(users[0].status, "deleted");
    },
  );
});

test("admin API key map fails closed when backend returns malformed key rows", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        "9007199254740993": ["malformed-api-key-row"],
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.fetchApiKeysMap(),
        /API key record is required/,
      );
    },
  );
});

test("admin API key map fails closed when backend returns malformed map shape", async () => {
  for (const [data, message] of [
    [{ "9007199254740993": { id: "key-1" } }, /API key list for user 9007199254740993 is required/],
    [{ guest: [] }, /API key map user id must be a positive int64 string/],
    [{ 0: [] }, /API key map user id must be a positive int64 string/],
    [{ "42.5": [] }, /API key map user id must be a positive int64 string/],
  ] as const) {
    await withBackendSdkResponse(
      {
        code: "2000",
        data,
      },
      async () => {
        await assert.rejects(
          () => UserService.fetchApiKeysMap(),
          message,
        );
      },
    );
  }
});

test("admin API key map fails closed when backend omits stable key ids", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        "9007199254740993": [
          {
            name: "Production Key",
            key: "sk-****1234",
            used: "0",
            status: "active",
          },
        ],
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.fetchApiKeysMap(),
        /API key id is required/,
      );
    },
  );
});

test("admin API key creation fails closed when backend omits stable key ids", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        key: {
          name: "Production Key",
          key: "sk-****1234",
          used: "0",
          status: "active",
        },
        rawKey: "sk-admin-secret",
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.createApiKey({ userId: "9007199254740993", name: "Production Key" }),
        /API key id is required/,
      );
    },
  );
});

test("admin API key creation fails closed when backend omits key material", async () => {
  await withBackendSdkResponse(
    {
      code: "2000",
      data: {
        key: {
          id: "admin-key-1",
          name: "Production Key",
          used: "0",
          status: "active",
        },
        rawKey: "sk-admin-secret",
      },
    },
    async () => {
      await assert.rejects(
        () => UserService.createApiKey({ userId: "9007199254740993", name: "Production Key" }),
        /API key value is required/,
      );
    },
  );
});
