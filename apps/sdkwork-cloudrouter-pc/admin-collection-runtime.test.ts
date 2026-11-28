import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ADMIN_MODULES,
  getActiveModuleFromPath,
  getAdminModuleMenu,
} from "@sdkwork/cloudrouter-pc-admin-shell";

const appRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(appRoot, "packages", "sdkwork-cloudrouter-pc-admin-collection");
const servicePath = join(packageRoot, "src", "collectionService.ts");
const hostMountPath = join(appRoot, "src", "admin", "cloudRouterAdminHostMount.tsx");
const i18nPath = join(
  appRoot,
  "packages",
  "sdkwork-cloudrouter-pc-i18n",
  "src",
  "resources",
  "admin",
  "collections.ts",
);
const i18nIndexPath = join(
  appRoot,
  "packages",
  "sdkwork-cloudrouter-pc-i18n",
  "src",
  "resources",
  "index.ts",
);

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

const COLLECTION_OPERATIONS = [
  "listCollectionCategories",
  "createCollectionCategory",
  "updateCollectionCategory",
  "deleteCollectionCategory",
  "initializeCollectionCategories",
  "listCollections",
  "createCollection",
  "getCollection",
  "updateCollection",
  "deleteCollection",
  "replaceCollectionItems",
  "updateCollectionStatus",
  "listCollectionReleases",
] as const;

test("collection menu group exposes both capability collection routes", () => {
  const homeMenu = getAdminModuleMenu("home");
  const foundation = homeMenu.groups.find((group) => group.groupKey === "admin.menu.home.aiFoundation");

  assert.ok(foundation, "the AI foundation group must exist");
  const collectionGroup = foundation.groups?.find(
    (group) => group.groupKey === "admin.menu.home.collectionManagement",
  );
  assert.ok(collectionGroup, "the collection management nested group must exist");
  assert.deepEqual(
    collectionGroup.items.map((item) => item.path),
    ["/admin/collection/categories", "/admin/collection"],
  );
  assert.deepEqual(
    collectionGroup.items.map((item) => item.labelKey),
    ["admin.menu.collections.categories", "admin.menu.collections"],
  );

  assert.equal(getActiveModuleFromPath("/admin/collection"), "home");
  assert.equal(getActiveModuleFromPath("/admin/collection/categories"), "home");

  const homeModule = ADMIN_MODULES.find((module) => module.id === "home");
  assert.ok(homeModule, "the home module must exist");
  assert.ok(
    homeModule.pathPrefixes.includes("/admin/collection"),
    "the home module must claim /admin/collection so the header switcher stays on home",
  );
});

test("host mount registers both collection routes against the backend SDK", () => {
  const source = readText(hostMountPath);

  assert.match(
    source,
    /lazyAdminRoute\(\(\) => import\('@sdkwork\/cloudrouter-pc-admin-collection'\), 'CollectionsAdminPage'\)/,
    "the collections page must be lazily loaded from the admin package",
  );
  assert.match(
    source,
    /lazyAdminRoute\(\(\) => import\('@sdkwork\/cloudrouter-pc-admin-collection'\), 'CollectionCategoriesAdminPage'\)/,
    "the categories page must be lazily loaded from the admin package",
  );

  for (const path of ["collection/categories", "collection"]) {
    const pattern = new RegExp(
      `route\\('${path}',\\s*'sdkwork-cloudrouter',\\s*'@sdkwork/cloudrouter-pc-admin-collection',\\s*`
        + `\\['cloudrouter-backend-sdk'\\],\\s*'cloudrouter\\.admin\\.access'`,
      "u",
    );
    assert.match(source, pattern, `route ${path} must be registered with the backend SDK and admin access`);
  }
});

test("collection service owns exactly the 13 contract operations and no raw HTTP", () => {
  const source = readText(servicePath);

  for (const operation of COLLECTION_OPERATIONS) {
    assert.match(
      source,
      new RegExp(`static async ${operation}\\(`, "u"),
      `collectionService.ts must declare ${operation}`,
    );
  }
  assert.equal(
    (source.match(/static async /gu) ?? []).length,
    COLLECTION_OPERATIONS.length,
    "the service must declare exactly the contract operations and no extra async methods",
  );

  assert.match(source, /getCloudRouterBackendSdkClient\(\)/u);
  assert.match(source, /ai\.collectionCategories\./u);
  assert.match(source, /ai\.collections\./u);
  assert.match(source, /requiredSafePathSegment/u);

  for (const forbidden of ["fetch(", "axios", "localStorage"]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `collectionService.ts must not contain ${forbidden}`,
    );
  }
});

test("collection i18n bundle keeps en and zh key sets identical", () => {
  const source = readText(i18nPath);
  const enIndex = source.indexOf("en: {");
  const zhIndex = source.indexOf("zh: {");
  assert.ok(enIndex >= 0 && zhIndex > enIndex, "the bundle must declare an en block followed by a zh block");

  const keyPattern = /"(admin\.collections\.[^"]+)":/gu;
  const enKeys = [...source.slice(enIndex, zhIndex).matchAll(keyPattern)].map((match) => match[1]);
  const zhKeys = [...source.slice(zhIndex).matchAll(keyPattern)].map((match) => match[1]);

  assert.ok(enKeys.length > 0, "the en bundle must declare admin.collections.* keys");
  assert.deepEqual([...enKeys].sort(), [...zhKeys].sort(), "en and zh must expose the same key set");
  assert.equal(new Set(enKeys).size, enKeys.length, "the en bundle must not repeat a key");
  assert.equal(new Set(zhKeys).size, zhKeys.length, "the zh bundle must not repeat a key");

  for (const required of [
    "admin.collections.metrics.total",
    "admin.collections.items.title",
    "admin.collections.categories.metrics.total",
    "admin.collections.categories.actions.initialize",
  ]) {
    assert.ok(enKeys.includes(required), `${required} must exist in both locales`);
    assert.ok(zhKeys.includes(required), `${required} must exist in the zh projection`);
  }

  assert.match(
    readText(i18nIndexPath),
    /adminCollectionsMessages/u,
    "the host i18n catalog must register the collection bundle",
  );
});
