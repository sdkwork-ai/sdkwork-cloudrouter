import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearStoredAppSessionToken } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import { GroupService } from "./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts";
import {
  createGroupInputFromForm,
  createGroupUpdateInputFromForm,
  displayGroupStatus,
  displayGroupType,
} from "./packages/sdkwork-clawrouter-pc-admin-group/src/groupForm.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

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

type ExpectedChannelGroupRecord = {
  id: string;
  groupName: string;
  providerCode: string;
  rateMultiplier: number;
  officialPriceMultiplier: number | null;
  accountCount: { available: number; total: number };
  status: string;
};

test("admin group create input does not fabricate client persistence ids", () => {
  const form = new FormData();
  form.set("groupName", " Default Enterprise ");
  form.set("priceReferenceMode", "official_price");
  form.set("officialPriceMultiplier", "2.5");
  form.set("groupType", "dedicated");
  form.set("capacityTotal", "100");
  form.set("status", "active");

  const input = createGroupInputFromForm(form);

  assert.deepEqual(input, {
    groupName: "Default Enterprise",
    priceReferenceMode: "official_price",
    officialPriceMultiplier: 2.5,
    groupType: "dedicated",
    capacity: { total: 100 },
    status: "active",
  });
  assert.equal("id" in input, false);
  assert.equal("groupCode" in input, false);
  assert.equal("accountCount" in input, false);
  assert.equal("usage" in input, false);
});

test("admin group create input rejects invalid numeric values instead of defaulting rates", () => {
  const form = new FormData();
  form.set("groupName", " Dedicated ");
  form.set("priceReferenceMode", "multiplier");
  form.set("rateMultiplier", "not-a-number");

  assert.throws(() => createGroupInputFromForm(form), /rateMultiplier must be greater than zero/);
});

test("admin group create form reads backend-supported capacity instead of hardcoding it", () => {
  const form = new FormData();
  form.set("groupName", " Enterprise Pool ");
  form.set("priceReferenceMode", "multiplier");
  form.set("rateMultiplier", "1.25");
  form.set("capacityTotal", "250");
  form.set("groupType", "public");

  const input = createGroupInputFromForm(form);

  assert.equal(input.capacity.total, 250);
});

test("admin group create and update forms read resource access selections", () => {
  const form = new FormData();
  form.set("groupName", " Resource scoped group ");
  form.set("priceReferenceMode", "multiplier");
  form.set("rateMultiplier", "1.25");
  form.set("capacityTotal", "250");
  form.set("groupType", "public");
  form.set("status", "active");
  form.append("resourceGroupCodes", " api.openai.chat ");
  form.append("resourceGroupCodes", "api.google.image");
  form.append("resourceGroupCodes", "api.openai.chat");
  form.append("resourceCodes", " api.openai.chat_completions ");
  form.append("resourceCodes", "api.openai.responses");
  form.append("resourceCodes", "api.openai.chat_completions");

  const createInput = createGroupInputFromForm(form);
  const updateInput = createGroupUpdateInputFromForm(form);

  assert.deepEqual(createInput.resourceGroupCodes, ["api.openai.chat", "api.google.image"]);
  assert.deepEqual(createInput.resourceCodes, ["api.openai.chat_completions", "api.openai.responses"]);
  assert.deepEqual(updateInput.resourceGroupCodes, ["api.openai.chat", "api.google.image"]);
  assert.deepEqual(updateInput.resourceCodes, ["api.openai.chat_completions", "api.openai.responses"]);
});

test("admin group create modal uses ai channel group billing modes and removes the platform selector", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<option[^>]*value="multiplier">/);
  assert.match(source, /<option[^>]*value="official_price">/);
  assert.match(source, /t\('admin\.group\.priceReferenceMode\.multiplier'\)/);
  assert.match(source, /t\('admin\.group\.priceReferenceMode\.officialPrice'\)/);
  assert.match(source, /t\('admin\.group\.fields\.officialPriceMultiplier'\)/);
  assert.match(source, /t\('admin\.group\.groupType\.public'\)/);
  assert.match(source, /t\('admin\.group\.groupType\.dedicated'\)/);
  assert.match(source, /t\('common\.status\.active'\)/);
  assert.match(source, /t\('common\.status\.disabled'\)/);
  assert.doesNotMatch(source, /name="groupCode"/);
  assert.match(source, /name="groupName"/);
  assert.match(source, /name="groupType"/);
  assert.match(source, /name="priceReferenceMode"/);
  assert.doesNotMatch(source, /name="platform"/);
  assert.doesNotMatch(source, /name="billingType"/);
  assert.doesNotMatch(source, /name="isPublic"/);
  assert.doesNotMatch(source, /Official price multiplier/);
  assert.match(source, /name="capacityTotal" type="number"[^>]*min="1"[^>]*step="1"/);
  assert.match(source, /name="rateMultiplier" type="number"[^>]*min="0\.01"/);
  assert.match(source, /name="officialPriceMultiplier" type="number"[^>]*min="0\.01"/);
  for (const field of ["description", "allowAllClients", "fallbackGroup"]) {
    assert.doesNotMatch(source, new RegExp(`name="${field}"`), `${field} is not supported by the backend command`);
  }
  for (const unsupportedControl of ["OAuth account only", "privacy protected account only"]) {
    assert.doesNotMatch(source, new RegExp(unsupportedControl), `${unsupportedControl} is not supported by the backend command`);
  }
});

test("admin group create modal uses a two-column resource access layout with reusable selectors", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "data-admin-group-modal-layout",
    "data-admin-group-resource-access",
    "data-admin-group-resource-access-tabs",
    "ResourceGroupSelectorModal",
    "AiResourceSelectorModal",
    "selectionMode=\"multiple\"",
    "resourceAccessTab",
    "resourceGroupCodes",
    "resourceCodes",
    "GroupService.fetchAssignableResourceGroups",
    "GroupService.fetchAssignableResources",
    "admin.group.resourceAccess.title",
    "admin.group.resourceAccess.tabs.resourceGroups",
    "admin.group.resourceAccess.tabs.resources",
  ]) {
    assert.ok(source.includes(expected), `missing resource access modal marker: ${expected}`);
  }

  assert.match(source, /<input\s+type="hidden"\s+name="resourceGroupCodes"/);
  assert.match(source, /<input\s+type="hidden"\s+name="resourceCodes"/);
});

test("admin group resource selectors support configurable single or multiple selection", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const sharedSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/AiResourceSelectorModal.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(source.includes("type ResourceSelectorSelectionMode = 'single' | 'multiple'"));
  assert.match(sharedSource, /selectionMode = 'single'/);
  assert.match(sharedSource, /selectionMode\?: AiResourceSelectorSelectionMode/);
  assert.match(sharedSource, /type=\{selectionMode === 'multiple' \? 'checkbox' : 'radio'\}/);
  assert.match(source, /toggleSelectionCode\(selectedCodes, code, selectionMode\)/);
  assert.match(sharedSource, /toggleAiResourceSelectionCode\(selectedCodes, code, selectionMode\)/);
  assert.match(source, /selectionMode="multiple"/);
});

test("admin group resource selectors provide searchable modal lists with selected count in the footer", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const sharedSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/AiResourceSelectorModal.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "data-admin-group-resource-group-selector-search",
    "data-admin-group-resource-selector-search",
    "resourceGroupSearchQuery",
    "filteredResourceGroupOptions",
    "admin.group.resourceAccess.search.resourceGroupsPlaceholder",
    "admin.group.resourceAccess.search.resourcesPlaceholder",
    "admin.group.resourceAccess.emptyResourceGroupsSearch",
    "admin.group.resourceAccess.emptyResourcesSearch",
  ]) {
    assert.ok(source.includes(expected), `missing resource selector search marker: ${expected}`);
  }

  for (const expected of [
    "resourceSearchQuery",
    "filteredResourceOptions",
    "matchesAiResourceSelectorSearch",
  ]) {
    assert.ok(sharedSource.includes(expected), `missing shared resource selector marker: ${expected}`);
  }

  assert.match(source, /<SelectorFooter[\s\S]*count=\{selectedCodes\.length\}[\s\S]*onClose=\{onClose\}/);
  assert.match(sharedSource, /labels\.selectedCount\(selectedCodes\.length\)/);
  assert.match(sharedSource, /searchDataAttribute = 'data-admin-ai-resource-selector-search'/);
  assert.match(source, /function SelectorFooter\(\{\s*count,\s*onClose,\s*t,\s*\}/);
  assert.match(source, /selectedCount: count => t\('admin\.group\.resourceAccess\.selectedCount', \{ count \}\)/);
  assert.match(source, /done: t\('common\.actions\.done'\)/);
  const headerSource = source.slice(source.indexOf("function SelectorHeader"), source.indexOf("function SelectorState"));
  assert.doesNotMatch(headerSource, /selectedCount/);
});

test("admin group selected resource access rows support removal and detail dialogs", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "type ResourceAccessSummaryItem",
    "resourceAccessDetailTarget",
    "setResourceAccessDetailTarget",
    "removeSelectedResourceGroupCode",
    "removeSelectedResourceCode",
    "openResourceAccessDetail",
    "ResourceAccessDetailModal",
    "data-admin-group-selected-resource-row",
    "data-admin-group-selected-resource-group-row",
    "data-admin-group-selected-ai-resource-row",
    "data-admin-group-resource-access-detail-modal",
    "admin.group.resourceAccess.actions.details",
    "admin.group.resourceAccess.actions.remove",
    "admin.group.resourceAccess.detail.resourceGroupTitle",
    "admin.group.resourceAccess.detail.resourceTitle",
  ]) {
    assert.ok(source.includes(expected), `missing selected resource access row marker: ${expected}`);
  }

  assert.match(source, /selectedResourceGroupCodes\.map\(code => toResourceGroupSummaryItem/);
  assert.match(source, /selectedResourceCodes\.map\(code => toAiResourceSummaryItem/);
  assert.match(source, /onRemove=\{removeSelectedResourceGroupCode\}/);
  assert.match(source, /onRemove=\{removeSelectedResourceCode\}/);
  assert.match(source, /onDetail=\{openResourceAccessDetail\}/);
});

test("admin group create modal does not display group code and the main list omits provider column", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /t\("admin\.group\.index\.text\.1t62v98", "Group code"\)/);
  assert.doesNotMatch(source, /editingGroup\?\.groupCode/);
  assert.doesNotMatch(source, /<span className="text-xs font-mono text-slate-500">\{group\.groupCode\}<\/span>/);
  assert.doesNotMatch(source, /t\("admin\.group\.index\.text\.ah7xpy", "Provider"\)/);
  assert.doesNotMatch(source, /<Settings className="w-3\.5 h-3\.5" \/> \{group\.providerCode\}/);
  assert.match(source, /BusinessStateTableRow colSpan=\{9\}/);
});

test("admin group edit modal select controls keep readable option colors in dark mode", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const name of ["groupType", "priceReferenceMode", "status"]) {
    assert.match(
      source,
      new RegExp(`name="${name}"[^>]*className=\\{groupSelectClassName\\}`),
      `${name} select should use the shared readable select colors`,
    );
  }
  assert.match(source, /const groupSelectClassName = '[^']*bg-white[^']*text-slate-900[^']*dark:bg-\[#202020\][^']*dark:text-white[^']*';/);
  assert.match(source, /const groupOptionClassName = 'bg-white text-slate-900 dark:bg-\[#202020\] dark:text-white';/);
  assert.match(source, /<option className=\{groupOptionClassName\} value="multiplier">\{t\('admin\.group\.priceReferenceMode\.multiplier'\)\}<\/option>/);
  assert.match(source, /<option className=\{groupOptionClassName\} value="public">\{t\('admin\.group\.groupType\.public'\)\}<\/option>/);
});

test("admin group list labels enum values through i18n helpers", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /displayGroupPriceReferenceMode\(group\.priceReferenceMode, t\)/);
  assert.match(source, /displayGroupType\(group\.groupType, t\)/);
  assert.match(source, /displayGroupStatus\(group\.status, t\)/);
  assert.match(source, /function displayGroupPriceReferenceMode/);
  assert.match(source, /admin\.group\.priceReferenceMode\.officialPrice/);
  assert.match(source, /admin\.group\.groupType\.dedicated/);
  assert.match(source, /common\.status\.disabled/);
});

test("admin group table actions are wired to real supported workflows", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /createGroupUpdateInputFromForm/);
  assert.match(source, /GroupService\.updateGroup/);
  assert.match(source, /onClick=\{\(\) => openEditModal\(group\)\}/);
  assert.match(source, /onClick=\{\(\) => \{ void loadGroups\(\); \}\}/);
  assert.match(source, /value=\{platformFilter\}/);
  assert.match(source, /value=\{statusFilter\}/);
  assert.match(source, /value=\{typeFilter\}/);
  assert.match(source, /setSortDirection/);
  assert.doesNotMatch(source, /\u6d93\u64b3\u7758\u934a\u5d87\u5dfc/u);
});

test("admin group page exposes channel account binding management", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "data-admin-group-channel-bindings-drawer",
    "openChannelBindingModal",
    "GroupService.fetchAssignableChannels",
    "GroupService.fetchGroupChannelBindings",
    "GroupService.replaceGroupChannelBindings",
    "admin.group.channelBindings.action",
    "admin.group.channelBindings.title",
  ]) {
    assert.ok(source.includes(expected), `missing group channel binding UI marker: ${expected}`);
  }
  assert.doesNotMatch(source, /secretRef/i);
});

test("admin group page exposes sales price settings by abstract resource category", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const messages = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/group-user.ts", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "openPriceSettingsDrawer",
    "data-admin-group-price-settings-drawer",
    "admin.group.priceSettings.action",
    "admin.group.priceSettings.title",
    "admin.group.priceSettings.scope.category",
    "admin.group.priceSettings.formula.officialMultiplier",
    "admin.group.priceSettings.resourceCategory.model",
    "admin.group.priceSettings.resourceCategory.image",
    "admin.group.priceSettings.resourceCategory.video",
    "admin.group.priceSettings.resourceCategory.audio",
    "admin.group.priceSettings.resourceCategory.music",
    "admin.group.priceSettings.resourceCategory.sfx",
    "admin.group.priceSettings.resourceCategory.api_resource",
  ]) {
    assert.ok(source.includes(expected) || messages.includes(expected), `missing group price settings marker: ${expected}`);
  }

  assert.match(source, /const pricingResourceCategories = \[/);
  assert.match(source, /defaultFormulaMode: 'official_multiplier'/);
  assert.match(source, /defaultMultiplier: 1/);
  assert.match(source, /<Coins className="w-4 h-4" \/> <span>\{t\('admin\.group\.priceSettings\.action'\)\}<\/span>/);
});

test("admin group channel binding drawer manages only current group accounts by default", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "data-admin-group-channel-bindings-drawer",
    "data-admin-group-channel-bindings-toolbar",
    "data-admin-group-channel-binding-search",
    "data-admin-group-channel-binding-add",
    "data-admin-group-channel-binding-remove",
    "data-admin-group-channel-picker-modal",
    "openChannelBindingPicker",
    "addSelectedChannelBindings",
    "removeChannelBindingDraft",
    "visibleBindingRows",
    "pickerChannelOptions",
    "w-[90vw]",
    "h-full",
  ]) {
    assert.ok(source.includes(expected), `missing current-group binding management marker: ${expected}`);
  }

  assert.match(source, /fixed inset-0 z-50 flex justify-start/);
  assert.match(source, /<aside\s+data-admin-group-channel-bindings-drawer/);
  assert.doesNotMatch(source, /data-admin-group-channel-bindings-modal/);
  assert.doesNotMatch(source, /orderedChannelOptions\.map/);
  assert.doesNotMatch(source, /toggleChannelBinding/);
  assert.doesNotMatch(source, /columns\.enabled/);
});

test("admin group channel picker shows already added accounts without allowing duplicates", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const messages = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/group-user.ts", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "pickerChannelOptions",
    "addableChannelCount",
    "isChannelAlreadyBound",
    "data-admin-group-channel-picker-bound",
    "admin.group.channelBindings.alreadyAdded",
  ]) {
    assert.ok(source.includes(expected) || messages.includes(expected), `missing picker duplicate guard marker: ${expected}`);
  }

  assert.match(source, /const isAlreadyBound = isChannelAlreadyBound\(channel\.id\);/);
  assert.match(source, /disabled=\{isAlreadyBound\}/);
  assert.match(source, /checked=\{isAlreadyBound \|\| Boolean\(pickerSelection\[channel\.id\]\)\}/);
  assert.match(source, /Object\.entries\(pickerSelection\)\s*\.filter\(\(\[channelId, selected\]\) => selected && !isChannelAlreadyBound\(channelId\)\)/s);
  assert.doesNotMatch(source, /\.filter\(channel => !bindingDraft\[channel\.id\]\)/);
});

test("admin group channel picker paginates channel choices in a wider dialog", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const messages = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/group-user.ts", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "CHANNEL_PICKER_PAGE_SIZE",
    "pickerPage",
    "pickerTotalPages",
    "paginatedPickerChannelOptions",
    "data-admin-group-channel-picker-pagination",
    "admin.group.channelBindings.pagination",
  ]) {
    assert.ok(source.includes(expected) || messages.includes(expected), `missing picker pagination marker: ${expected}`);
  }

  assert.match(source, /w-\[92vw\]\s+max-w-7xl/);
  assert.match(source, /setPickerPage\(1\)/);
  assert.match(source, /Math\.ceil\(pickerChannelOptions\.length \/ CHANNEL_PICKER_PAGE_SIZE\)/);
  assert.match(source, /pickerChannelOptions\.slice\(\s*\(pickerPage - 1\) \* CHANNEL_PICKER_PAGE_SIZE,\s*pickerPage \* CHANNEL_PICKER_PAGE_SIZE,\s*\)/s);
  assert.match(source, /paginatedPickerChannelOptions\.map\(channel =>/);
});

test("admin group channel picker keeps search controls inside the modal header", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "data-admin-group-channel-picker-header",
    "data-admin-group-channel-picker-search",
    "data-admin-group-channel-picker-selected-count",
  ]) {
    assert.ok(source.includes(expected), `missing picker header search marker: ${expected}`);
  }

  const pickerSource = source.slice(source.indexOf("data-admin-group-channel-picker-modal"));
  assert.match(source, /data-admin-group-channel-picker-header[\s\S]*data-admin-group-channel-picker-search[\s\S]*data-admin-group-channel-picker-selected-count[\s\S]*closeChannelBindingPicker/);
  assert.doesNotMatch(pickerSource, /flex shrink-0 flex-col gap-3 border-b border-slate-200 p-5 dark:border-white\/10 md:flex-row md:items-center md:justify-between/);
});

test("admin group page keeps existing rows visible when a refresh reports a load error", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /loadError && groups\.length > 0/);
  assert.match(source, /loadError && groups\.length === 0/);
  assert.doesNotMatch(source, /\) : loadError \? \(/);
  assert.match(source, /t\('admin\.group\.state\.loadErrorTitle'\)/);
  assert.match(source, /t\('admin\.group\.state\.staleDataDescription'\)/);
});

test("admin group update input does not reuse returned group view model", () => {
  const form = new FormData();
  form.set("groupName", " Enterprise Tier ");
  form.set("priceReferenceMode", "multiplier");
  form.set("rateMultiplier", "1.75");
  form.set("capacityTotal", "100");
  form.set("groupType", "public");
  form.set("status", "active");

  const input = createGroupUpdateInputFromForm(form);

  assert.deepEqual(input, {
    groupName: "Enterprise Tier",
    priceReferenceMode: "multiplier",
    rateMultiplier: 1.75,
    groupType: "public",
    capacity: { total: 100 },
    status: "active",
  });
  for (const field of ["id", "accountCount", "usage"]) {
    assert.equal(field in input, false);
  }
});

test("admin group display labels are stable domain labels", () => {
  assert.equal(displayGroupType("public"), "public");
  assert.equal(displayGroupType("dedicated"), "dedicated");
  assert.equal(displayGroupStatus("active"), "active");
  assert.equal(displayGroupStatus("disabled"), "disabled");
});

test("admin group service calls generated backend SDK paths and normalizes ai channel group data", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/channel_groups" && method === "GET") {
        return {
          items: [
            {
              id: "group-1",
              groupCode: "default-enterprise",
              groupName: "Default Enterprise",
              providerCode: "openai",
              priceReferenceMode: "official_reference",
              rateMultiplier: "2.5",
              officialPriceMultiplier: "2.5",
              groupType: "dedicated",
              accountCount: { available: "3", total: 5 },
              capacity: { used: "10", total: 200 },
              usage: { today: "6", total: 600 },
              status: "disabled",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/channel_groups" && method === "POST") {
        return {
          item: {
            id: "group-2",
            groupCode: "created-group",
            groupName: "Created Group",
            providerCode: "anthropic",
            priceReferenceMode: "multiplier",
            rateMultiplier: 1.25,
            officialPriceMultiplier: null,
            groupType: "public",
            accountCount: { available: 0, total: 0 },
            capacity: { used: 0, total: 100 },
            usage: { today: 0, total: 0 },
            status: "active",
          },
        };
      }
      if (url === "/backend/v3/api/ai/channel_groups/group-2" && method === "PATCH") {
        return {
          item: {
            id: "group-2",
            groupCode: "created-group",
            groupName: "Updated Group",
            providerCode: "anthropic",
            priceReferenceMode: "official_price",
            rateMultiplier: 1.5,
            officialPriceMultiplier: 1.5,
            groupType: "dedicated",
            accountCount: { available: 0, total: 0 },
            capacity: { used: 0, total: 150 },
            usage: { today: 0, total: 0 },
            status: "disabled",
          },
        };
      }
      if (url === "/backend/v3/api/ai/channel_groups/group-2" && method === "DELETE") {
        return { deleted: true };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const groups = await GroupService.fetchGroups() as unknown as ExpectedChannelGroupRecord[];
      const created = await GroupService.addGroup({
        groupName: " Created Group ",
        priceReferenceMode: "multiplier",
        rateMultiplier: 1.25,
        groupType: "public",
        capacity: { total: 100 },
        status: "active",
        resourceGroupCodes: ["api.openai.chat", "api.google.image"],
        resourceCodes: ["api.openai.chat_completions"],
      } as never);
      const updated = await GroupService.updateGroup("group-2", {
        groupName: " Updated Group ",
        priceReferenceMode: "official_price",
        officialPriceMultiplier: 1.5,
        groupType: "dedicated",
        capacity: { total: 150 },
        status: "disabled",
        resourceGroupCodes: ["api.openai.codex"],
        resourceCodes: ["api.openai.responses", "api.openai.containers"],
      } as never);
      const deleted = await GroupService.deleteGroup("group-2");

      assert.equal(groups[0].id, "group-1");
      assert.equal(groups[0].rateMultiplier, 2.5);
      assert.equal(groups[0].officialPriceMultiplier, 2.5);
      assert.equal(groups[0].accountCount.available, 3);
      assert.equal(created.id, "group-2");
      assert.equal(updated?.status, "disabled");
      assert.equal(deleted, true);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/channel_groups",
          "POST /backend/v3/api/ai/channel_groups",
          "PATCH /backend/v3/api/ai/channel_groups/group-2",
          "DELETE /backend/v3/api/ai/channel_groups/group-2",
        ],
      );
      const createBody = JSON.parse(captured[1].body) as Record<string, unknown>;
      assert.match(String(createBody.groupCode), /^group-[a-z0-9-]{12,64}$/);
      assert.deepEqual(
        Object.fromEntries(Object.entries(createBody).filter(([key]) => key !== "groupCode")),
        {
        groupName: "Created Group",
        priceReferenceMode: "multiplier",
        rateMultiplier: 1.25,
        groupType: "public",
        capacity: { total: 100 },
        status: "active",
        resourceGroupCodes: ["api.openai.chat", "api.google.image"],
        resourceCodes: ["api.openai.chat_completions"],
        },
      );
      assert.deepEqual(JSON.parse(captured[2].body), {
        groupName: "Updated Group",
        priceReferenceMode: "official_price",
        officialPriceMultiplier: 1.5,
        groupType: "dedicated",
        capacity: { total: 150 },
        status: "disabled",
        resourceGroupCodes: ["api.openai.codex"],
        resourceCodes: ["api.openai.responses", "api.openai.containers"],
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin group service normalizes assignable resource group and resource options", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/resource_groups" && method === "GET") {
        return {
          items: [
            {
              id: "resource-group-1",
              groupCode: "api.openai.codex",
              groupName: "OpenAI Codex API",
              groupType: "api_group",
              selectionMode: "any",
              description: "Codex and code agent resources",
              resourceCount: "3",
              status: "active",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/resources" && method === "GET") {
        return {
          items: [
            {
              id: "resource-1",
              resourceCode: "api.openai.responses",
              resourceType: "api_endpoint",
              displayName: "OpenAI Responses API",
              vendorCode: "openai",
              modalityCode: "llm",
              apiEndpointCode: "responses",
              catalogKey: "openai.responses",
              model: "gpt-5",
              providerNativeModel: "gpt-5",
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const resourceGroups = await GroupService.fetchAssignableResourceGroups();
      const resources = await GroupService.fetchAssignableResources();

      assert.deepEqual(resourceGroups[0], {
        id: "resource-group-1",
        groupCode: "api.openai.codex",
        groupName: "OpenAI Codex API",
        groupType: "api_group",
        selectionMode: "any",
        description: "Codex and code agent resources",
        resourceCount: 3,
        status: "active",
      });
      assert.deepEqual(resources[0], {
        id: "resource-1",
        resourceCode: "api.openai.responses",
        resourceType: "api_endpoint",
        displayName: "OpenAI Responses API",
        vendorCode: "openai",
        modalityCode: "llm",
        apiEndpointCode: "responses",
        catalogKey: "openai.responses",
        model: "gpt-5",
        providerNativeModel: "gpt-5",
        status: "active",
      });
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/resource_groups",
          "GET /backend/v3/api/ai/resources",
        ],
      );
    },
  );
});

test("admin group runtime does not generate business identifiers with browser randomness", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /crypto\.randomUUID/);
  assert.doesNotMatch(source, /Date\.now/);
  assert.match(source, /group-local-/);
});

test("admin group service manages channel bindings through generated backend SDK paths", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/channel_groups/group-1/channel_bindings" && method === "GET") {
        return {
          items: [
            {
              id: "binding-1",
              channelGroupId: "group-1",
              channelId: "3001",
              channelName: "OpenAI primary",
              providerCode: "openai",
              providerName: "OpenAI",
              channelCode: "openai-primary",
              resourceCodes: ["api.openai.chat_completions"],
              apiScope: ["openai.chat_completions"],
              capabilities: ["llm"],
              priority: "5",
              weight: "80",
              status: "active",
              healthStatus: "active",
              secretRef: "vault://providers/openai/main",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/channel_groups/group-1/channel_bindings" && method === "PUT") {
        return {
          items: [
            {
              id: "binding-1",
              channelGroupId: "group-1",
              channelId: "3001",
              channelName: "OpenAI primary",
              providerCode: "openai",
              providerName: "OpenAI",
              channelCode: "openai-primary",
              resourceCodes: ["api.openai.chat_completions"],
              apiScope: ["openai.chat_completions"],
              capabilities: ["llm"],
              priority: 10,
              weight: 60,
              status: "disabled",
              healthStatus: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const bindings = await GroupService.fetchGroupChannelBindings("group-1");
      const replaced = await GroupService.replaceGroupChannelBindings("group-1", [
        {
          channelId: "3001",
          priority: 10,
          weight: 60,
          status: "disabled",
          resourceCodes: ["api.openai.chat_completions"],
          apiScope: ["openai.chat_completions"],
          capabilities: ["llm"],
        },
      ]);

      assert.equal(bindings[0].channelId, "3001");
      assert.equal(bindings[0].priority, 5);
      assert.equal("secretRef" in bindings[0], false);
      assert.equal(replaced[0].status, "disabled");
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        [
          "GET /backend/v3/api/ai/channel_groups/group-1/channel_bindings",
          "PUT /backend/v3/api/ai/channel_groups/group-1/channel_bindings",
        ],
      );
      assert.deepEqual(JSON.parse(captured[1].body), {
        items: [
          {
            channelId: "3001",
            priority: 10,
            weight: 60,
            status: "disabled",
            resourceCodes: ["api.openai.chat_completions"],
            apiScope: ["openai.chat_completions"],
            capabilities: ["llm"],
          },
        ],
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin group service retrieves backend route explain through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/channel_groups/group-1/route_explain" && method === "GET") {
        return {
          source: "backend_config",
          ready: true,
          issueCodes: [],
          issues: [],
          resourceCodes: ["api.openai.chat_completions"],
          resourceGroupCodes: ["api.openai.chat"],
          effectiveResourceCodes: ["api.openai.chat_completions"],
          configuredResourceAccessCount: "2",
          configuredResourceGroupAccessCount: "1",
          apiScope: ["openai.chat_completions"],
          capabilities: ["llm"],
          activeHealthyBindingCount: "1",
          routableBindingCount: "1",
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const explain = await GroupService.fetchGroupRouteExplain("group-1");

      assert.deepEqual(explain, {
        source: "backend_config",
        ready: true,
        issueCodes: [],
        issues: [],
        resourceCodes: ["api.openai.chat_completions"],
        resourceGroupCodes: ["api.openai.chat"],
        effectiveResourceCodes: ["api.openai.chat_completions"],
        configuredResourceAccessCount: 2,
        configuredResourceGroupAccessCount: 1,
        apiScope: ["openai.chat_completions"],
        capabilities: ["llm"],
        activeHealthyBindingCount: 1,
        routableBindingCount: 1,
      });
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /backend/v3/api/ai/channel_groups/group-1/route_explain"],
      );
      assert.equal(captured[0].headers["x-request-id"], undefined);
    },
  );
});

test("admin group service retrieves runtime route explain through generated backend SDK", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/route_explain" && method === "POST") {
        return {
          source: "runtime_selector",
          ready: true,
          resourceCode: "api.openai.chat_completions",
          catalogKey: "openai/gpt-4o-mini",
          model: "gpt-4o-mini",
          apiCode: "openai.chat_completions",
          capability: "chat",
          billingMeter: "llm_input_token",
          apiKeyId: "100",
          channelGroupId: "10",
          groupCode: "standard-group",
          pricingPlanCode: "standard",
          candidateCount: "1",
          selectedCandidates: [
            {
              kind: "model",
              providerCode: "openrouter",
              channelId: "3001",
              channelGroupId: "10",
              channelGroupCode: "standard-group",
              pricingPlanCode: "standard",
              policyId: "200",
              ruleId: "202",
              apiCode: "openai.chat_completions",
              catalogKey: "openai/gpt-4o-mini",
              requestedModel: "gpt-4o-mini",
              providerModel: "gpt-4o-mini",
              regionCode: "global",
              credentialId: null,
              credentialRotation: "none",
              timeoutMs: "30000",
            },
          ],
          blockedReasons: [],
          warnings: [],
          policyId: "200",
          ruleId: "202",
          policySnapshotVersion: "runtime-catalog-current",
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const explain = await GroupService.fetchRuntimeRouteExplain({
        apiKeyId: "100",
        channelGroupId: "10",
        resourceCode: "api.openai.chat_completions",
        catalogKey: "openai/gpt-4o-mini",
        model: "gpt-4o-mini",
        apiCode: "openai.chat_completions",
        capability: "chat",
        billingMeter: "llm_input_token",
      });

      assert.deepEqual(explain, {
        source: "runtime_selector",
        ready: true,
        resourceCode: "api.openai.chat_completions",
        catalogKey: "openai/gpt-4o-mini",
        model: "gpt-4o-mini",
        apiCode: "openai.chat_completions",
        capability: "chat",
        billingMeter: "llm_input_token",
        apiKeyId: "100",
        channelGroupId: "10",
        groupCode: "standard-group",
        pricingPlanCode: "standard",
        candidateCount: 1,
        selectedCandidates: [
          {
            kind: "model",
            providerCode: "openrouter",
            channelId: "3001",
            channelGroupId: "10",
            channelGroupCode: "standard-group",
            pricingPlanCode: "standard",
            policyId: "200",
            ruleId: "202",
            apiCode: "openai.chat_completions",
            catalogKey: "openai/gpt-4o-mini",
            requestedModel: "gpt-4o-mini",
            providerModel: "gpt-4o-mini",
            regionCode: "global",
            credentialId: null,
            credentialRotation: "none",
            timeoutMs: 30000,
          },
        ],
        blockedReasons: [],
        warnings: [],
        policyId: "200",
        ruleId: "202",
        policySnapshotVersion: "runtime-catalog-current",
      });
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["POST /backend/v3/api/ai/route_explain"],
      );
      assert.deepEqual(JSON.parse(captured[0].body), {
        apiKeyId: "100",
        channelGroupId: "10",
        resourceCode: "api.openai.chat_completions",
        catalogKey: "openai/gpt-4o-mini",
        model: "gpt-4o-mini",
        apiCode: "openai.chat_completions",
        capability: "chat",
        billingMeter: "llm_input_token",
      });
      assert.equal(captured[0].headers["x-request-id"], undefined);
      assert.equal(JSON.stringify(explain).includes("secretRef"), false);
      assert.equal(JSON.stringify(explain).includes("baseUrl"), false);
    },
  );
});

test("admin group channel bindings are scoped by resources instead of direct models", async () => {
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(serviceSource, /models:\s*string\[\];/);
  assert.doesNotMatch(serviceSource, /modelScope\??:\s*string\[\];/);
  assert.doesNotMatch(serviceSource, /models:\s*readStringArray\(item,\s*'models'\)/);
  assert.doesNotMatch(serviceSource, /modelScope:\s*readStringArray\(item,\s*'modelScope'\)/);
  assert.doesNotMatch(serviceSource, /modelScope:\s*item\.modelScope/);
  assert.match(serviceSource, /resourceCodes:\s*string\[\];/);
  assert.match(serviceSource, /apiScope:\s*string\[\];/);
  assert.match(serviceSource, /resourceCodes:\s*readStringArray\(item,\s*'resourceCodes'\)/);
  assert.match(serviceSource, /apiScope:\s*readStringArray\(item,\s*'apiScope'\)/);

  for (const legacyMarker of [
    "row.models",
    "channel.models",
    "row.modelScope",
    "draft?.modelScope",
    "admin.group.channelBindings.columns.models",
    "admin.group.channelBindings.columns.modelScope",
    "admin.group.channelBindings.allModels",
    "admin.group.channelBindings.noModels",
  ]) {
    assert.ok(!pageSource.includes(legacyMarker), `legacy direct model binding marker should be removed: ${legacyMarker}`);
  }

  for (const resourceMarker of [
    "row.resourceCodes",
    "row.apiScope",
    "channel.resourceCodes",
    "channel.apiScope",
    "admin.group.channelBindings.columns.resourceCodes",
    "admin.group.channelBindings.columns.apiScope",
    "admin.group.channelBindings.noResourceCodes",
    "admin.group.channelBindings.noApiScope",
  ]) {
    assert.ok(pageSource.includes(resourceMarker), `missing resource scoped binding marker: ${resourceMarker}`);
  }

  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url === "/backend/v3/api/ai/channel_groups/group-1/channel_bindings" && method === "GET") {
        return {
          items: [
            {
              id: "binding-1",
              channelGroupId: "group-1",
              channelId: "3001",
              channelName: "OpenAI primary",
              providerCode: "openai",
              providerName: "OpenAI",
              channelCode: "openai-primary",
              resourceCodes: ["api.openai.chat_completions"],
              apiScope: ["openai.chat_completions"],
              capabilities: ["llm"],
              priority: 5,
              weight: 80,
              status: "active",
              healthStatus: "active",
            },
          ],
        };
      }
      if (url === "/backend/v3/api/ai/channel_groups/group-1/channel_bindings" && method === "PUT") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        assert.deepEqual(body, {
          items: [
            {
              channelId: "3001",
              priority: 10,
              weight: 60,
              status: "active",
              resourceCodes: ["api.openai.chat_completions"],
              apiScope: ["openai.chat_completions"],
              capabilities: ["llm"],
            },
          ],
        });
        return {
          items: [
            {
              id: "binding-1",
              channelGroupId: "group-1",
              channelId: "3001",
              channelName: "OpenAI primary",
              providerCode: "openai",
              providerName: "OpenAI",
              channelCode: "openai-primary",
              resourceCodes: ["api.openai.chat_completions"],
              apiScope: ["openai.chat_completions"],
              capabilities: ["llm"],
              priority: 10,
              weight: 60,
              status: "active",
              healthStatus: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async () => {
      const bindings = await GroupService.fetchGroupChannelBindings("group-1");
      assert.deepEqual(bindings[0].resourceCodes, ["api.openai.chat_completions"]);
      assert.deepEqual(bindings[0].apiScope, ["openai.chat_completions"]);
      assert.equal("models" in bindings[0], false);
      assert.equal("modelScope" in bindings[0], false);

      await GroupService.replaceGroupChannelBindings("group-1", [
        {
          channelId: "3001",
          priority: 10,
          weight: 60,
          status: "active",
          resourceCodes: ["api.openai.chat_completions"],
          apiScope: ["openai.chat_completions"],
          capabilities: ["llm"],
        },
      ]);
    },
  );
});

test("admin group route preflight explains whether configured pools can route resource API calls", async () => {
  const groupModule = await import("./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts");

  assert.equal(typeof groupModule.buildGroupRoutePreflight, "function");

  const buildGroupRoutePreflight = groupModule.buildGroupRoutePreflight as (
    group: unknown,
    bindings: unknown[],
  ) => {
    ready: boolean;
    issueCodes: string[];
    resourceCodes: string[];
    resourceGroupCodes: string[];
    configuredResourceAccessCount: number;
    apiScope: string[];
    capabilities: string[];
    activeHealthyBindingCount: number;
  };

  const readyResult = buildGroupRoutePreflight(
    {
      resourceCodes: [" api.openai.chat_completions ", "api.openai.chat_completions"],
      resourceGroupCodes: [],
      status: "active",
      accountCount: { available: 1, total: 1 },
    },
    [
      {
        resourceCodes: ["api.openai.chat_completions"],
        apiScope: ["openai.chat_completions"],
        capabilities: ["llm"],
        status: "active",
        healthStatus: "active",
      },
    ],
  );

  assert.equal(readyResult.ready, true);
  assert.deepEqual(readyResult.issueCodes, []);
  assert.deepEqual(readyResult.resourceCodes, ["api.openai.chat_completions"]);
  assert.deepEqual(readyResult.resourceGroupCodes, []);
  assert.equal(readyResult.configuredResourceAccessCount, 1);
  assert.deepEqual(readyResult.apiScope, ["openai.chat_completions"]);
  assert.deepEqual(readyResult.capabilities, ["llm"]);
  assert.equal(readyResult.activeHealthyBindingCount, 1);

  const resourceGroupOnlyResult = buildGroupRoutePreflight(
    {
      resourceCodes: [],
      resourceGroupCodes: [" api.openai.chat ", "api.openai.chat"],
      status: "active",
      accountCount: { available: 1, total: 1 },
    },
    [
      {
        resourceCodes: ["api.openai.chat_completions"],
        apiScope: ["openai.chat_completions"],
        capabilities: ["llm"],
        status: "active",
        healthStatus: "active",
      },
    ],
  );

  assert.equal(resourceGroupOnlyResult.ready, true);
  assert.deepEqual(resourceGroupOnlyResult.resourceCodes, []);
  assert.deepEqual(resourceGroupOnlyResult.resourceGroupCodes, ["api.openai.chat"]);
  assert.equal(resourceGroupOnlyResult.configuredResourceAccessCount, 1);

  const emptyResult = buildGroupRoutePreflight(
    {
      resourceCodes: [],
      resourceGroupCodes: [],
      status: "active",
      accountCount: { available: 0, total: 0 },
    },
    [],
  );

  assert.equal(emptyResult.ready, false);
  assert.deepEqual(emptyResult.issueCodes, [
    "group.account_count.empty",
    "group.resource_access.empty",
    "group.bindings.empty",
  ]);

  const disabledResult = buildGroupRoutePreflight(
    {
      resourceCodes: ["api.openai.responses"],
      resourceGroupCodes: [],
      status: "active",
      accountCount: { available: 1, total: 1 },
    },
    [
      {
        resourceCodes: ["api.openai.responses"],
        apiScope: ["openai.responses"],
        capabilities: ["llm"],
        status: "disabled",
        healthStatus: "active",
      },
      {
        resourceCodes: ["api.openai.responses"],
        apiScope: ["openai.responses"],
        capabilities: ["llm"],
        status: "active",
        healthStatus: "error",
      },
    ],
  );

  assert.equal(disabledResult.ready, false);
  assert.deepEqual(disabledResult.issueCodes, ["group.bindings.no_active_healthy_member"]);

  const mismatchResult = buildGroupRoutePreflight(
    {
      resourceCodes: ["api.openai.responses"],
      resourceGroupCodes: [],
      status: "active",
      accountCount: { available: 1, total: 1 },
    },
    [
      {
        resourceCodes: ["api.google.image_generation"],
        apiScope: [],
        capabilities: [],
        status: "active",
        healthStatus: "active",
      },
    ],
  );

  assert.equal(mismatchResult.ready, true);
  assert.deepEqual(mismatchResult.issueCodes, [
    "group.bindings.no_resource_overlap",
    "group.bindings.missing_scope_metadata",
  ]);
});

test("admin group channel binding drawer surfaces route preflight diagnostics", () => {
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const messages = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/group-user.ts", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "export interface GroupRoutePreflightIssue",
    "export interface GroupRoutePreflightResult",
    "export interface GroupRouteExplainResult",
    "export function buildGroupRoutePreflight",
    "fetchGroupRouteExplain",
  ]) {
    assert.ok(serviceSource.includes(expected), `missing route preflight service marker: ${expected}`);
  }

  for (const expected of [
    "routeExplain",
    "setRouteExplain",
    "routePreflightBindingRows",
    "buildGroupRoutePreflight(channelBindingTarget, routePreflightBindingRows)",
    "data-admin-group-route-preflight",
    "admin.group.routePreflight.title",
    "admin.group.routePreflight.localOnly",
    "admin.group.routePreflight.backendConfigExplain",
    "routePreflight.configuredResourceAccessCount",
    "routeExplain.routableBindingCount",
    "admin.group.routePreflight.ready",
    "admin.group.routePreflight.blocked",
  ]) {
    assert.ok(pageSource.includes(expected), `missing route preflight page marker: ${expected}`);
  }

  for (const expected of [
    "admin.group.routePreflight.localOnly",
    "admin.group.routePreflight.backendConfigExplain",
    "admin.group.routePreflight.backendExplainUnavailable",
    "admin.group.routePreflight.issue.groupDisabled",
    "admin.group.routePreflight.issue.zeroAvailableAccounts",
    "admin.group.routePreflight.issue.emptyResourceAccess",
    "admin.group.routePreflight.issue.emptyBindings",
    "admin.group.routePreflight.issue.noActiveHealthyMember",
    "admin.group.routePreflight.issue.noResourceOverlap",
    "admin.group.routePreflight.issue.missingScopeMetadata",
  ]) {
    assert.ok(messages.includes(expected), `missing route preflight i18n marker: ${expected}`);
  }
});

test("admin group route preflight connects P0 local diagnostics to P1 backend config explain", () => {
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts", import.meta.url),
    "utf8",
  );
  const pageSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );
  const designDoc = readFileSync(
    new URL("../../docs/superpowers/specs/2026-06-09-api-relay-provider-platform-design.md", import.meta.url),
    "utf8",
  );

  assert.match(designDoc, /## P0 Implementation Scope/);
  assert.match(designDoc, /## P1 Backend Contract/);
  assert.match(designDoc, /## P2 Platform Capabilities/);
  assert.match(designDoc, /P0 Implementation Scope[\s\S]*route preflight[\s\S]*P1 Backend Contract[\s\S]*route_explain/i);

  assert.match(serviceSource, /routeExplain/);
  assert.match(serviceSource, /getClawRouterBackendSdkClient\(\)\.ai\.channelGroups\.routeExplain\.retrieve/);
  assert.match(pageSource, /GroupService\.fetchGroupRouteExplain/);
  assert.match(pageSource, /routeExplain\?\.source === 'backend_config'/);
  assert.ok(pageSource.includes("admin.group.routePreflight.localOnly"));
  assert.ok(pageSource.includes("admin.group.routePreflight.backendConfigExplain"));
  assert.ok(!pageSource.includes("admin.group.routePreflight.backendExplainPending"));
});

test("admin group service rejects invalid command values before calling backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for invalid group commands");
    },
    async (captured) => {
      await assert.rejects(
        () =>
          GroupService.addGroup({
            groupName: " ",
            priceReferenceMode: "multiplier",
            rateMultiplier: 1,
            groupType: "public",
            capacity: { total: 100 },
            status: "active",
          } as never),
        /groupName is required/,
      );
      await assert.rejects(
        () =>
          GroupService.addGroup({
            groupName: "Invalid Capacity",
            priceReferenceMode: "multiplier",
            rateMultiplier: 1,
            groupType: "public",
            capacity: { total: 0 },
            status: "active",
          } as never),
        /capacity.total must be a positive integer/,
      );
      await assert.rejects(
        () =>
          GroupService.addGroup({
            groupName: "Fractional Capacity",
            priceReferenceMode: "multiplier",
            rateMultiplier: 1,
            groupType: "public",
            capacity: { total: 1.5 },
            status: "active",
          } as never),
        /capacity.total must be a positive integer/,
      );
      await assert.rejects(
        () => GroupService.updateGroup("group-1", { rateMultiplier: -1 }),
        /rateMultiplier must be greater than zero/,
      );
      await assert.rejects(
        () => GroupService.updateGroup("group-1", { capacity: { total: 2.25 } }),
        /capacity.total must be a positive integer/,
      );
      await assert.rejects(
        () =>
          GroupService.addGroup({
            groupName: "Invalid Billing",
            priceReferenceMode: "enterprise",
            rateMultiplier: 1,
            groupType: "public",
            capacity: { total: 100 },
            status: "active",
          } as never),
        /priceReferenceMode must be multiplier or official_price/,
      );
      await assert.rejects(
        () =>
          GroupService.addGroup({
            groupName: "Invalid Type",
            priceReferenceMode: "multiplier",
            rateMultiplier: 1,
            groupType: "private" as never,
            capacity: { total: 100 },
            status: "active",
          } as never),
        /groupType must be public or dedicated/,
      );
      await assert.rejects(
        () =>
          GroupService.updateGroup("group-1", {
            status: "archived" as never,
          }),
        /status must be active or disabled/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin group service rejects unsafe SDK path ids before calling backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for unsafe group path ids");
    },
    async (captured) => {
      await assert.rejects(
        () => GroupService.updateGroup("group/2", { status: "disabled" }),
        /channelGroupId must be a safe path segment/,
      );
      await assert.rejects(
        () => GroupService.deleteGroup("group?debug=true"),
        /channelGroupId must be a safe path segment/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin group update fails closed when backend success response omits the updated entity", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/channel_groups/group-2" && init?.method === "PATCH") {
        return { updated: true };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => GroupService.updateGroup("group-2", { status: "disabled" }),
        /Updated group response is missing data/,
      );
    },
  );
});

test("admin group delete fails closed unless backend confirms deletion", async () => {
  for (const response of [{}, { deleted: false }]) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/channel_groups/group-2" && init?.method === "DELETE") {
          return response;
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => GroupService.deleteGroup("group-2"),
          /Group delete confirmation is required/,
        );
      },
    );
  }
});

test("admin group list fails closed when backend omits stable group ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/channel_groups" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              groupCode: "missing-id-group",
              groupName: "Missing Id Group",
              providerCode: "openai",
              priceReferenceMode: "multiplier",
              rateMultiplier: 1,
              officialPriceMultiplier: null,
              groupType: "public",
              accountCount: { available: 0, total: 0 },
              capacity: { used: 0, total: 100 },
              usage: { today: 0, total: 0 },
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => GroupService.fetchGroups(),
        /Group id is required/,
      );
    },
  );
});

test("admin group list fails closed when backend returns malformed group rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/channel_groups" && (init?.method ?? "GET") === "GET") {
        return { items: ["not-a-group-record"] };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => GroupService.fetchGroups(),
        /Group record is required/,
      );
    },
  );
});

test("admin group list fails closed when backend omits required group fields", async () => {
  for (const [field, message] of [
    ["groupName", /Group name is required/],
    ["rateMultiplier", /Group rate multiplier is required/],
    ["capacity", /Group capacity is required/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/channel_groups" && (init?.method ?? "GET") === "GET") {
          const group = {
            id: "group-1",
            groupCode: "default-enterprise",
            groupName: "Default Enterprise",
            providerCode: "openai",
            officialPriceMultiplier: "2.5",
            priceReferenceMode: "official_price",
            rateMultiplier: "2.5",
            groupType: "dedicated",
            accountCount: { available: "3", total: 5 },
            capacity: { used: "10", total: 200 },
            usage: { today: "6", total: 600 },
            status: "disabled",
          } as Record<string, unknown>;
          delete group[field];
          return { items: [group] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => GroupService.fetchGroups(),
          message,
        );
      },
    );
  }
});

test("admin group list keeps named groups visible when optional display fields are missing", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/ai/channel_groups" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "group-1",
              groupCode: "default-enterprise",
              groupName: "Default Enterprise",
              priceReferenceMode: "official_price",
              rateMultiplier: "2.5",
              officialPriceMultiplier: "2.5",
              groupType: "dedicated",
              accountCount: { available: "3", total: 5 },
              capacity: { used: "10", total: 200 },
              usage: { today: "6", total: 600 },
              status: "disabled",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      const groups = await GroupService.fetchGroups();

      assert.equal(groups[0].groupName, "Default Enterprise");
      assert.equal(groups[0].providerCode, "unknown");
    },
  );
});

test("admin group page localizes load errors instead of exposing internal service messages", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /description=\{t\('admin\.group\.state\.loadErrorDescription'\)\}/);
  assert.doesNotMatch(source, /description=\{loadError\}/);
  assert.doesNotMatch(source, /error: loadError/);
});

test("admin group table fills the available admin viewport", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "AdminTableShell",
    "data-admin-group-table-card",
    "data-admin-group-table-viewport",
    "flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden",
    "flex-1 min-h-0",
    "viewportClassName=\"min-h-0 flex-1\"",
    "sticky top-0 z-10",
  ]) {
    assert.ok(source.includes(expected), `missing adaptive admin group table marker: ${expected}`);
  }

  assert.doesNotMatch(source, /h-\[calc\(100dvh-74px\)\]/);
});

test("admin group table paginates filtered rows inside the adaptive shell", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "BottomPagination",
    "data-admin-group-pagination",
    "const [page, setPage] = useState(1)",
    "const [pageSize, setPageSize] = useState(20)",
    "const paginatedGroups = filteredGroups.slice(",
    "paginatedGroups.map(group =>",
    "pageSizeOptions={[10, 20, 50, 100]}",
    "admin.group.pagination.showing",
    "admin.group.pagination.page",
    "admin.group.pagination.pageSize",
    "onPageSizeChange={(nextPageSize) => {",
  ]) {
    assert.ok(source.includes(expected), `missing admin group pagination marker: ${expected}`);
  }

  assert.match(source, /hasNextPage=\{page \* pageSize < filteredGroups\.length\}/);
  assert.match(source, /useEffect\(\(\) => \{\s*setPage\(1\);\s*\}, \[searchQuery, platformFilter, statusFilter, typeFilter, sortDirection\]\);/);
  assert.doesNotMatch(source, /filteredGroups\.map\(group =>/);
});

test("admin group list fails closed when backend returns unsupported group enums", async () => {
  for (const [field, value, message] of [
    ["groupType", "enterprise", /Unsupported group type: enterprise/],
    ["status", "archived", /Unsupported group status: archived/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/ai/channel_groups" && (init?.method ?? "GET") === "GET") {
          const group = {
            id: "group-1",
            groupCode: "default-enterprise",
            groupName: "Default Enterprise",
            providerCode: "openai",
            officialPriceMultiplier: "2.5",
            priceReferenceMode: "official_price",
            rateMultiplier: "2.5",
            groupType: "dedicated",
            accountCount: { available: "3", total: 5 },
            capacity: { used: "10", total: 200 },
            usage: { today: "6", total: 600 },
            status: "disabled",
          } as Record<string, unknown>;
          group[field] = value;
          return { items: [group] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => GroupService.fetchGroups(),
          message,
        );
      },
    );
  }
});
