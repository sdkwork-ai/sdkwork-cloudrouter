import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clawRouterDownloadCatalog,
  createClawRouterDownloadCards,
  createClawRouterDownloadCatalog,
  resolveClawRouterDownloadBaseUrl,
} from "./packages/sdkwork-clawrouter-pc-home/src/downloads/clawRouterDownloads.ts";

function readPortalSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const t = (key: string, fallback?: unknown) => {
  if (typeof fallback === "string") {
    return fallback;
  }

  if (
    fallback
    && typeof fallback === "object"
    && "defaultValue" in fallback
    && typeof fallback.defaultValue === "string"
  ) {
    return fallback.defaultValue;
  }

  return key;
};

test("home download catalog exposes desktop server and mobile cards without placeholder links", () => {
  const cards = createClawRouterDownloadCards(t);

  assert.deepEqual(cards.map((card) => card.kind), ["desktop", "server", "mobile"]);
  assert.deepEqual(cards.map((card) => card.id), [
    "claw-router-desktop",
    "claw-router-server",
    "claw-router-mobile",
  ]);

  const actions = cards.flatMap((card) => card.actions);
  assert.equal(actions.some((action) => action.href === "#"), false);
  assert.equal(actions.some((action) => action.disabled !== true), true);
  assert.equal(actionsById(actions).get("mobile-ios")?.disabled, true);
});

test("home page mounts download components in both hero and deploy sections", () => {
  const homeSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-home/src/pages/Home.tsx", import.meta.url),
    "utf8",
  );
  const heroSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-home/src/components/Hero.tsx", import.meta.url),
    "utf8",
  );
  const downloadSectionSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-home/src/components/DownloadSection.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(homeSource.includes("<DownloadSection />"), "deploy section must keep the bottom download component");
  assert.ok(heroSource.includes("<DownloadPanel"), "hero must mount the top download component");
  assert.ok(downloadSectionSource.includes("export function DownloadPanel"), "top and bottom downloads must share the catalog-backed panel");
});

test("home hero release badge is driven by the download catalog version", () => {
  const heroSource = readPortalSource("./packages/sdkwork-clawrouter-pc-home/src/components/Hero.tsx");
  const i18nSource = readPortalSource("./packages/sdkwork-clawrouter-pc-i18n/src/resources/shared/navigation.ts");

  assert.ok(heroSource.includes("createClawRouterDownloadCatalog"));
  assert.ok(heroSource.includes("clawRouterDownloadCatalog"));
  assert.ok(heroSource.includes("product.version"));
  assert.ok(heroSource.includes("version:"));
  assert.equal(i18nSource.includes("Claw Router 2.0"), false);
  assert.ok(i18nSource.includes("Claw Router v{{version}} is now live"));
  assert.ok(i18nSource.includes("Claw Router v{{version}} 现已发布"));
});

test("home hero gives the top download panel a wide layout container", () => {
  const heroSource = readPortalSource("./packages/sdkwork-clawrouter-pc-home/src/components/Hero.tsx");

  assert.ok(heroSource.includes("max-w-4xl text-center"), "hero copy should keep a readable narrow text measure");
  assert.ok(heroSource.includes("max-w-7xl"), "hero download panel must use a wider container than the hero copy");
});

test("home hero top download panel stays flat and borderless", () => {
  const heroSource = readPortalSource("./packages/sdkwork-clawrouter-pc-home/src/components/Hero.tsx");

  assert.ok(heroSource.includes('className="mx-auto mt-14 w-full max-w-7xl"'));
  assert.equal(heroSource.includes('rounded-3xl border'), false);
  assert.equal(heroSource.includes('shadow-xl'), false);
  assert.equal(heroSource.includes('bg-white/80'), false);
  assert.equal(heroSource.includes('backdrop-blur'), false);
});

test("home bottom download panel also uses the shared flat borderless component", () => {
  const downloadSectionSource = readPortalSource("./packages/sdkwork-clawrouter-pc-home/src/components/DownloadSection.tsx");

  assert.ok(downloadSectionSource.includes("SdkworkProductDownloadSection"));
  assert.equal(downloadSectionSource.includes('rounded-3xl'), false);
  assert.equal(downloadSectionSource.includes('border '), false);
  assert.equal(downloadSectionSource.includes('shadow'), false);
  assert.equal(downloadSectionSource.includes('bg-white/80'), false);
});

function actionsById(actions: ReturnType<typeof createClawRouterDownloadCards>[number]["actions"]) {
  return new Map(actions.map((action) => [action.id, action]));
}

test("home download catalog derives stable release artifact URLs from configured base URL", () => {
  const cards = createClawRouterDownloadCards(t, {
    baseUrl: "https://downloads.example.test/claw-router/",
  });
  const actionsById = new Map(cards.flatMap((card) => card.actions.map((action) => [action.id, action])));

  assert.equal(
    actionsById.get("desktop-windows")?.href,
    "https://downloads.example.test/claw-router/desktop/windows/latest",
  );
  assert.equal(
    actionsById.get("server-docker")?.href,
    "https://downloads.example.test/claw-router/server/docker/latest",
  );
  assert.equal(
    actionsById.get("mobile-android")?.href,
    "https://downloads.example.test/claw-router/mobile/android/latest",
  );
  assert.equal(actionsById.get("mobile-ios")?.disabled, false);
});

test("home download catalog consumes the release JSON data contract for exact post-release links", () => {
  const cards = createClawRouterDownloadCards(t, {
    catalog: {
      schemaVersion: "2026-05-18.sdkwork-download-catalog.v1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      product: {
        id: "sdkwork-clawrouter",
        name: "SdkWork ClawRouter",
        version: "1.2.3",
      },
      cards: [
        {
          actions: [
            {
              fileName: "clawrouter-windows-x64-desktop-1.2.3.msi",
              href: "https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
              id: "desktop-windows-x64",
              label: "Windows x64",
              platform: "windows",
              version: "1.2.3",
            },
          ],
          description: "Desktop release",
          icon: "desktop",
          id: "claw-router-desktop",
          kind: "desktop",
          primaryActionStrategy: "detected-platform",
          title: "Desktop",
          tone: "brand",
        },
        {
          actions: [
            {
              disabled: true,
              href: "",
              id: "server-docker",
              label: "Docker Image",
              platform: "docker",
              unavailableLabel: "Docker Image coming soon",
            },
          ],
          description: "Server release",
          icon: "server",
          id: "claw-router-server",
          kind: "server",
          title: "Server",
          tone: "server",
        },
      ],
    },
  });
  const actionsById = new Map(cards.flatMap((card) => card.actions.map((action) => [action.id, action])));

  assert.equal(
    actionsById.get("desktop-windows-x64")?.href,
    "https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
  );
  assert.equal(actionsById.get("server-docker")?.disabled, true);
  assert.equal(actionsById.get("server-docker")?.href, "");
});

test("home download catalog preserves selectable download sources from release JSON", () => {
  const cards = createClawRouterDownloadCards(t, {
    catalog: {
      schemaVersion: "2026-05-18.sdkwork-download-catalog.v1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      product: {
        id: "sdkwork-clawrouter",
        name: "SdkWork ClawRouter",
        version: "1.2.3",
      },
      cards: [
        {
          actions: [
            {
              fileName: "clawrouter-windows-x64-desktop-1.2.3.msi",
              href: "https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
              id: "desktop-windows-x64",
              label: "Windows x64",
              platform: "windows",
              sources: [
                {
                  href: "https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
                  id: "github",
                  label: "GitHub",
                  primary: true,
                },
                {
                  href: "https://cdn.example.test/claw-router/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
                  id: "cdn",
                  label: "CDN",
                },
                {
                  href: "javascript:alert(1)",
                  id: "unsafe",
                  label: "Unsafe",
                },
              ],
              version: "1.2.3",
            },
          ],
          description: "Desktop release",
          icon: "desktop",
          id: "claw-router-desktop",
          kind: "desktop",
          primaryActionStrategy: "detected-platform",
          title: "Desktop",
          tone: "brand",
        },
      ],
    },
  });
  const actionsById = new Map(cards.flatMap((card) => card.actions.map((action) => [action.id, action])));
  const sources = actionsById.get("desktop-windows-x64")?.sources ?? [];

  assert.deepEqual(sources.map((source) => source.id), ["github", "cdn"]);
  assert.equal(sources[0]?.primary, true);
  assert.equal(
    sources[1]?.href,
    "https://cdn.example.test/claw-router/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi",
  );
});

test("checked-in release download JSON is the default homepage data source", () => {
  const catalog = createClawRouterDownloadCatalog(clawRouterDownloadCatalog);
  const cards = createClawRouterDownloadCards(t);
  const actions = cards.flatMap((card) => card.actions);
  const actionIds = new Set(actions.map((action) => action.id));

  assert.equal(catalog.schemaVersion, "2026-05-18.sdkwork-download-catalog.v1");
  assert.equal(catalog.product.id, "sdkwork-clawrouter");
  assert.equal(catalog.product.version, "0.3.0");
  assert.equal(catalog.cards.length, 3);
  assert.equal(actions.some((action) => action.href === "#"), false);
  assert.ok(
    actions.some((action) =>
      action.href.includes("https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v0.3.0/")
    ),
    "default homepage catalog must include release asset URLs",
  );
  assert.equal(
    actions.some((action) => action.sources?.some((source) => source.id === "cdn")),
    false,
    "default homepage catalog must not include CDN sources until a CDN base URL is configured",
  );
  for (const id of [
    "server-macos-x64",
    "server-macos-arm64",
    "server-windows-x64",
    "server-windows-arm64",
    "server-linux-x64",
    "server-linux-arm64",
    "server-macos-archive-x64",
    "server-macos-archive-arm64",
    "server-windows-archive-x64",
    "server-windows-archive-arm64",
    "server-linux-archive-x64",
    "server-linux-archive-arm64",
  ]) {
    assert.ok(actionIds.has(id), `default homepage catalog must include ${id} from the real v0.3.0 release`);
  }
});

test("download base URL resolver accepts runtime env and rejects unsafe values", () => {
  assert.equal(
    resolveClawRouterDownloadBaseUrl({
      VITE_CLAWROUTER_DOWNLOAD_BASE_URL: " https://downloads.example.test/releases ",
    }),
    "https://downloads.example.test/releases",
  );
  assert.equal(
    resolveClawRouterDownloadBaseUrl({
      VITE_CLAWROUTER_DOWNLOAD_BASE_URL: "/downloads/claw-router/",
    }),
    "/downloads/claw-router",
  );
  assert.equal(
    resolveClawRouterDownloadBaseUrl({
      VITE_CLAWROUTER_DOWNLOAD_BASE_URL: "javascript:alert(1)",
    }),
    undefined,
  );
});
