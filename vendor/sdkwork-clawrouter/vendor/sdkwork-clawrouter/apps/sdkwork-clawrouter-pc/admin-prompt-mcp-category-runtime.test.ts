import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const PORTAL_ROOT = import.meta.dirname;

function readPortalFile(relativePath: string): string {
  return readFileSync(resolve(PORTAL_ROOT, relativePath), "utf8");
}

test("admin prompt and mcp pages use left category management instead of section sidebar", () => {
  const promptSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-prompts/src/index.tsx");
  const mcpSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-mcp/src/index.tsx");
  const categoryTreePath = resolve(PORTAL_ROOT, "packages/sdkwork-clawroutes-pc-commons/src/components/AdminCategoryManagementSidebar.tsx");

  assert.ok(existsSync(categoryTreePath), "shared admin category management sidebar must exist");

  for (const [name, source, rootAttribute] of [
    ["prompts", promptSource, "admin-prompts-category-management"],
    ["mcp", mcpSource, "admin-mcp-category-management"],
  ] as const) {
    assert.match(source, /AdminCategoryManagementSidebar/);
    assert.match(source, new RegExp(`dataAttribute="${rootAttribute}"`));
    assert.match(source, /selectedCategoryId/);
    assert.match(source, /categoryModalState/);
    assert.match(source, /deleteCategoryTarget/);
    assert.match(source, /showSectionNavigation=\{false\}/);
    assert.doesNotMatch(source, /<div className="flex shrink-0 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm[\s\S]*scope\.(?:prompt|server)/);
    if (name === "mcp") {
      assert.match(source, /activeSectionId=\{activeSectionId\}/, `${name} section tabs must be controlled outside the left sidebar`);
    }
  }
});

test("admin prompt and mcp resource tables scroll inside the shared resource center", () => {
  const promptSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-prompts/src/index.tsx");
  const mcpSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-mcp/src/index.tsx");
  const resourceCenterSource = readPortalFile("packages/sdkwork-clawroutes-pc-commons/src/components/AdminResourceCenter.tsx");

  for (const [name, source, tableMarker] of [
    ["prompts", promptSource, 'tableViewportDataAttribute="admin-prompts-table"'],
    ["mcp", mcpSource, 'tableViewportDataAttribute="admin-mcp-table"'],
  ] as const) {
    assert.ok(source.includes("AdminResourceCenter"), `${name} page must use shared resource center`);
    assert.ok(source.includes(tableMarker), `${name} page must expose table viewport data marker`);
  }

  for (const [name, source, rootMarker, layoutMarker, contentMarker] of [
    [
      "prompts",
      promptSource,
      'className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden" data-admin-prompts="prompt-management"',
      'className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]"',
      "data-admin-prompts-content",
    ],
    [
      "mcp",
      mcpSource,
      'className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden" data-admin-mcp="mcp-management"',
      'className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]"',
      "data-admin-mcp-content",
    ],
  ] as const) {
    assert.ok(source.includes(rootMarker), `${name} page root must hide page overflow`);
    assert.ok(source.includes(layoutMarker), `${name} page content grid must not create document scroll`);
    assert.ok(source.includes(contentMarker), `${name} page must mark the bounded content region`);
  }

  assert.ok(
    mcpSource.includes('className="min-h-0 flex-1 overflow-hidden" data-admin-mcp-resource-center-frame'),
    "mcp resource center must be wrapped in a flex child that absorbs remaining viewport height below tabs and selectors",
  );

  for (const expected of [
    'className="flex h-full min-h-0 w-full overflow-hidden rounded-xl',
    '<main className="flex min-w-0 flex-1 flex-col bg-white',
    'className="m-5 mt-4 min-h-0 flex-1 rounded-xl"',
    'viewportClassName="min-h-0 flex-1 custom-scrollbar"',
    'viewportProps={viewportProps}',
  ]) {
    assert.ok(resourceCenterSource.includes(expected), `missing shared resource center table layout marker: ${expected}`);
  }
});

test("admin prompt page keeps versions and bindings inside prompt detail", () => {
  const promptSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-prompts/src/index.tsx");

  assert.doesNotMatch(promptSource, /type PromptAdminSectionId = 'prompts' \| 'versions' \| 'bindings'/);
  assert.doesNotMatch(promptSource, /<SectionTabs[\s\S]*sections=\{sections\}/);
  assert.doesNotMatch(promptSource, /activeSectionId=\{activeSectionId\}/);
  assert.match(promptSource, /type PromptDetailTabId = 'overview' \| 'versions' \| 'usage'/);
  assert.match(promptSource, /PromptDetailPanel/);
  assert.match(promptSource, /onRecordOpen=\{handleOpenPromptDetail\}/);
  assert.match(promptSource, /listPromptVersions\(/);
  assert.match(promptSource, /listPromptBindings\(/);
});

test("admin prompt and mcp category management uses generated backend SDK category CRUD", () => {
  const categorySource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-core/src/admin-category-options.ts");
  const promptSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-prompts/src/index.tsx");
  const mcpSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-mcp/src/index.tsx");
  const promptServiceSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-prompts/src/promptService.ts");
  const mcpServiceSource = readPortalFile("packages/sdkwork-clawrouter-pc-admin-mcp/src/mcpService.ts");
  const tsconfig = JSON.parse(readPortalFile("tsconfig.json"));

  assert.match(categorySource, /createAdminAiCategory/);
  assert.match(categorySource, /updateAdminAiCategory/);
  assert.match(categorySource, /deleteAdminAiCategory/);
  assert.match(categorySource, /\.ecosystem\.skills\.categories\.create\(/);
  assert.match(categorySource, /\.ecosystem\.skills\.categories\.update\(/);
  assert.match(categorySource, /\.ecosystem\.skills\.categories\.delete\(/);
  assert.doesNotMatch(categorySource, /\bfetch\s*\(/);
  assert.doesNotMatch(categorySource, /\baxios\b/);
  assert.doesNotMatch(categorySource, /\/backend\/v3\/api/);

  assert.match(promptServiceSource, /normalizePromptListParams/);
  assert.match(promptServiceSource, /categoryId:\s*optionalPromptListCategoryId/);
  assert.match(mcpServiceSource, /normalizeMcpServerListParams/);
  assert.match(mcpServiceSource, /categoryId:\s*optionalMcpListCategoryId/);
  assert.match(promptSource, /from '@sdkwork\/clawrouter-pc-admin-core'/);
  assert.match(mcpSource, /from '@sdkwork\/clawrouter-pc-admin-core'/);
  assert.deepEqual(
    tsconfig.compilerOptions.paths["sdkwork-clawrouter-pc-admin-prompts"],
    ["./packages/sdkwork-clawrouter-pc-admin-prompts/src/index.tsx"],
  );
  assert.deepEqual(
    tsconfig.compilerOptions.paths["sdkwork-clawrouter-pc-admin-core"],
    ["./packages/sdkwork-clawrouter-pc-admin-core/src/index.ts"],
  );
  assert.deepEqual(
    tsconfig.compilerOptions.paths["sdkwork-clawrouter-pc-admin-mcp"],
    ["./packages/sdkwork-clawrouter-pc-admin-mcp/src/index.tsx"],
  );
});
