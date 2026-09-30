import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  cloudRouterDownloadCatalog,
  createCloudRouterDownloadCards,
  createCloudRouterDownloadCatalog,
  readRuntimeDownloadCatalog,
  resolveCloudRouterDownloadBaseUrl,
  resolveUsableDownloadCatalog,
} from "./packages/sdkwork-cloudrouter-pc-home/src/downloads/cloudRouterDownloads.ts";
import { createHomeContentRuntime } from "./packages/sdkwork-cloudrouter-pc-home/src/content/home-content.ts";

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
  const cards = createCloudRouterDownloadCards(t);

  assert.deepEqual(cards.map((card) => card.kind), ["desktop", "server", "mobile"]);
  assert.deepEqual(cards.map((card) => card.id), [
    "cloud-router-desktop",
    "cloud-router-server",
    "cloud-router-mobile",
  ]);

  const actions = cards.flatMap((card) => card.actions);
  assert.equal(actions.some((action) => action.href === "#"), false);
  assert.equal(actions.some((action) => action.disabled !== true), true);
  assert.equal(actionsById(actions).get("mobile-ios")?.disabled, true);
});

test("home page mounts download components in both hero and deploy sections", () => {
  const homeSource = readFileSync(
    new URL("./packages/sdkwork-cloudrouter-pc-home/src/pages/Home.tsx", import.meta.url),
    "utf8",
  );
  const heroSource = readFileSync(
    new URL("./packages/sdkwork-cloudrouter-pc-home/src/components/Hero.tsx", import.meta.url),
    "utf8",
  );
  const downloadSectionSource = readFileSync(
    new URL("./packages/sdkwork-cloudrouter-pc-home/src/components/DownloadSection.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(homeSource.includes("<DownloadSection />"), "deploy section must keep the bottom download component");
  assert.ok(heroSource.includes("<DownloadPanel"), "hero must mount the top download component");
  assert.ok(downloadSectionSource.includes("export function DownloadPanel"), "top and bottom downloads must share the catalog-backed panel");
});

test("home hero release badge is driven by the download catalog version", () => {
  const heroSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/components/Hero.tsx");
  const contentSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/content/home-content.ts");
  const i18nSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/navigation.ts");

  // The version still comes from the release catalog rather than being typed into the copy — but it
  // now resolves once in the shared content runtime (operator override, else the published catalog,
  // else the checked-in one) instead of being read at Hero's module scope. Assert that resolution
  // exists and that Hero consumes it, rather than pinning the call site to one file.
  assert.ok(contentSource.includes("readBundledCloudRouterVersion"));
  assert.ok(contentSource.includes("readDownloadCatalogVersion"));
  assert.ok(heroSource.includes("home.variables"));
  assert.ok(heroSource.includes("home.text("));

  // The badge copy carries both the brand and the version as tokens. A literal product name here is
  // exactly what made re-branding leave the old name in the hero.
  assert.ok(i18nSource.includes('"hero.badge": "{{siteName}} v{{version}} is now live"'));
  assert.ok(i18nSource.includes('"hero.badge": "{{siteName}} v{{version}} 现已发布"'));
  assert.equal(
    i18nSource.includes('"hero.badge": "Cloud Router'),
    false,
    "the badge must not embed a product name; it is published from /admin/site",
  );
  assert.equal(i18nSource.includes("Cloud Router 2.0"), false);
});

test("home hero gives the top download panel a wide layout container", () => {
  const heroSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/components/Hero.tsx");

  assert.ok(heroSource.includes("max-w-4xl text-center"), "hero copy should keep a readable narrow text measure");
  assert.ok(heroSource.includes("max-w-7xl"), "hero download panel must use a wider container than the hero copy");
});

/**
 * Scoped to the `<DownloadPanel>` element rather than the whole file.
 *
 * The previous form asserted the Hero file contains no `backdrop-blur` / `bg-white/80` /
 * `shadow-xl`. The Hero legitimately uses those classes for its badge and its secondary button, so
 * the assertion had been failing on `main` since before this change — it was describing the panel
 * but measuring the file. Scoping it to the element under test is what makes it able to fail for
 * the right reason.
 */
test("home hero top download panel stays flat and borderless", () => {
  const heroSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/components/Hero.tsx");
  const panel = /<DownloadPanel\b[\s\S]*?\/>/.exec(heroSource);

  assert.ok(panel, "hero must render the download panel");
  for (const forbidden of ["rounded-3xl", "shadow", "bg-white", "backdrop-blur", "border "]) {
    assert.equal(
      panel[0].includes(forbidden),
      false,
      `top download panel must not carry ${forbidden}`,
    );
  }
});

test("home bottom download panel also uses the shared flat borderless component", () => {
  const downloadSectionSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/components/DownloadSection.tsx");

  assert.ok(downloadSectionSource.includes("SdkworkProductDownloadSection"));
  assert.equal(downloadSectionSource.includes('rounded-3xl'), false);
  assert.equal(downloadSectionSource.includes('border '), false);
  assert.equal(downloadSectionSource.includes('shadow'), false);
  assert.equal(downloadSectionSource.includes('bg-white/80'), false);
});

function actionsById(actions: ReturnType<typeof createCloudRouterDownloadCards>[number]["actions"]) {
  return new Map(actions.map((action) => [action.id, action]));
}

test("home download catalog derives stable release artifact URLs from configured base URL", () => {
  const cards = createCloudRouterDownloadCards(t, {
    baseUrl: "https://downloads.example.test/cloud-router/",
  });
  const actionsById = new Map(cards.flatMap((card) => card.actions.map((action) => [action.id, action])));

  assert.equal(
    actionsById.get("desktop-windows")?.href,
    "https://downloads.example.test/cloud-router/desktop/windows/latest",
  );
  assert.equal(
    actionsById.get("server-docker")?.href,
    "https://downloads.example.test/cloud-router/server/docker/latest",
  );
  assert.equal(
    actionsById.get("mobile-android")?.href,
    "https://downloads.example.test/cloud-router/mobile/android/latest",
  );
  assert.equal(actionsById.get("mobile-ios")?.disabled, false);
});

test("home download catalog consumes the release JSON data contract for exact post-release links", () => {
  const cards = createCloudRouterDownloadCards(t, {
    catalog: {
      schemaVersion: "2026-05-18.sdkwork-download-catalog.v1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      product: {
        id: "sdkwork-cloudrouter",
        name: "SdkWork CloudRouter",
        version: "1.2.3",
      },
      cards: [
        {
          actions: [
            {
              fileName: "cloudrouter-windows-x64-desktop-1.2.3.msi",
              href: "https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/download/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
              id: "desktop-windows-x64",
              label: "Windows x64",
              platform: "windows",
              version: "1.2.3",
            },
          ],
          description: "Desktop release",
          icon: "desktop",
          id: "cloud-router-desktop",
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
          id: "cloud-router-server",
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
    "https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/download/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
  );
  assert.equal(actionsById.get("server-docker")?.disabled, true);
  assert.equal(actionsById.get("server-docker")?.href, "");
});

test("home download catalog preserves selectable download sources from release JSON", () => {
  const cards = createCloudRouterDownloadCards(t, {
    catalog: {
      schemaVersion: "2026-05-18.sdkwork-download-catalog.v1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      product: {
        id: "sdkwork-cloudrouter",
        name: "SdkWork CloudRouter",
        version: "1.2.3",
      },
      cards: [
        {
          actions: [
            {
              fileName: "cloudrouter-windows-x64-desktop-1.2.3.msi",
              href: "https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/download/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
              id: "desktop-windows-x64",
              label: "Windows x64",
              platform: "windows",
              sources: [
                {
                  href: "https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/download/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
                  id: "github",
                  label: "GitHub",
                  primary: true,
                },
                {
                  href: "https://cdn.example.test/cloud-router/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
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
          id: "cloud-router-desktop",
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
    "https://cdn.example.test/cloud-router/v1.2.3/cloudrouter-windows-x64-desktop-1.2.3.msi",
  );
});

test("checked-in release download JSON is the default homepage data source", () => {
  const catalog = createCloudRouterDownloadCatalog(cloudRouterDownloadCatalog);
  const cards = createCloudRouterDownloadCards(t);
  const actions = cards.flatMap((card) => card.actions);
  const actionIds = new Set(actions.map((action) => action.id));

  assert.equal(catalog.schemaVersion, "2026-05-18.sdkwork-download-catalog.v1");
  assert.equal(catalog.product.id, "sdkwork-cloudrouter");
  assert.equal(catalog.product.version, "0.3.0");
  assert.equal(catalog.cards.length, 3);
  assert.equal(actions.some((action) => action.href === "#"), false);
  assert.ok(
    actions.some((action) =>
      action.href.includes("https://github.com/sdkwork-ai/sdkwork-cloudrouter/releases/download/v0.3.0/")
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
    resolveCloudRouterDownloadBaseUrl({
      VITE_CLOUDROUTER_DOWNLOAD_BASE_URL: " https://downloads.example.test/releases ",
    }),
    "https://downloads.example.test/releases",
  );
  assert.equal(
    resolveCloudRouterDownloadBaseUrl({
      VITE_CLOUDROUTER_DOWNLOAD_BASE_URL: "/downloads/cloud-router/",
    }),
    "/downloads/cloud-router",
  );
  assert.equal(
    resolveCloudRouterDownloadBaseUrl({
      VITE_CLOUDROUTER_DOWNLOAD_BASE_URL: "javascript:alert(1)",
    }),
    undefined,
  );
});

/* --------------------------------------------------------------------------------------------
 * Homepage configurability
 *
 * The landing page used to be shipped copy: the product name, the hero figures, the vendor lists
 * and every download URL lived in the bundle. It is now operator content published from
 * `/admin/site`. Two properties matter, and they pull in opposite directions:
 *
 * 1. A deployment that never opens the console must render exactly what it renders today.
 * 2. A deployment that does configure the page must see its own values everywhere — including
 *    where the shipped copy used to embed the product name.
 *
 * Both are asserted below, because the second one is silently lost the moment a resolver decides to
 * "helpfully" fall back mid-string.
 * ------------------------------------------------------------------------------------------ */

test("an unconfigured homepage keeps every shipped default", () => {
  const home = createHomeContentRuntime({ siteName: "Cloud Router" });

  assert.deepEqual(home.sections, {
    cta: true,
    download: true,
    features: true,
    hero: true,
    modalities: true,
    models: true,
  });
  assert.equal(home.productName, "Cloud Router");
  assert.equal(home.version, "0.3.0", "the badge version comes from the checked-in release catalog");
  assert.equal(
    home.downloadCatalog,
    undefined,
    "no published catalog must mean `undefined`, which is the signal to keep the bundled one",
  );
  assert.equal(home.text(undefined, "Ready to deploy?"), "Ready to deploy?");
});

test("published copy resolves brand tokens so a re-brand reaches the rendered text", () => {
  const home = createHomeContentRuntime({
    homepage: {
      hero: {
        badge: "{{productName}} v{{version}} is live",
        titleLead: "One API for every model",
      },
      productName: "Acme Gateway",
      sections: { models: false },
    },
    siteName: "Acme",
  });

  assert.equal(home.productName, "Acme Gateway");
  assert.equal(home.text(home.content.hero?.badge, "unused"), "Acme Gateway v0.3.0 is live");
  assert.equal(home.text(home.content.hero?.titleLead, "unused"), "One API for every model");
  assert.equal(home.sections.models, false, "a section switch from the console hides the section");
  assert.equal(home.sections.hero, true, "sections the console did not mention keep rendering");
});

test("an unknown brand token stays visible instead of being blanked", () => {
  const home = createHomeContentRuntime({
    homepage: { hero: { badge: "{{productName}} ships {{unknownThing}}" } },
    siteName: "Acme",
  });

  assert.equal(
    home.text(home.content.hero?.badge, "unused"),
    "Acme ships {{unknownThing}}",
    "a token with no value must remain visible rather than silently deleting the sentence",
  );
});

test("a published download catalog is authoritative and is not rewritten by shipped i18n", () => {
  const home = createHomeContentRuntime({
    downloads: {
      cards: [
        {
          actions: [
            {
              href: "https://dl.example.test/acme-windows.msi",
              id: "acme-windows",
              label: "Windows installer",
              platform: "windows",
            },
          ],
          description: "Install Acme on Windows.",
          id: "cloud-router-desktop",
          kind: "desktop",
          title: "Acme Desktop",
        },
      ],
      product: { id: "acme-appliance", name: "Acme Gateway Appliance", version: "9.9.9" },
    },
    siteName: "Acme",
  });

  assert.notEqual(home.downloadCatalog, undefined);
  assert.equal(home.version, "9.9.9", "the published catalog's version drives the hero badge");

  // The card id deliberately matches the shipped i18n override key. Passing a *wrong* brand here is
  // the sharp part: if the shipped translation were applied the title would come out as
  // "Should Not Appear Desktop", so this fails the moment the operator's copy stops winning.
  const cards = createCloudRouterDownloadCards(t, {
    brandVariables: { productName: "Should Not Appear", siteName: "nope", version: "0" },
    catalog: home.downloadCatalog,
  });

  assert.equal(cards[0]?.title, "Acme Desktop");
  assert.equal(cards[0]?.description, "Install Acme on Windows.");
  assert.equal(cards[0]?.actions[0]?.label, "Windows installer");
  assert.equal(cards[0]?.actions[0]?.href, "https://dl.example.test/acme-windows.msi");
  assert.equal(cards[0]?.actions[0]?.disabled, false);
});

test("an unusable published catalog falls back to the checked-in release", () => {
  // Nothing published.
  assert.equal(readRuntimeDownloadCatalog(undefined), undefined);
  assert.equal(readRuntimeDownloadCatalog({}), undefined);

  // A catalog from an incompatible console build cannot be interpreted safely.
  assert.equal(
    readRuntimeDownloadCatalog({
      cards: [{ id: "anything" }],
      product: { id: "acme", name: "Acme", version: "1.0.0" },
      schemaVersion: "2099-01-01.sdkwork-download-catalog.v99",
    }),
    undefined,
  );

  // Envelope present but incomplete.
  assert.equal(readRuntimeDownloadCatalog({ cards: [{ id: "x" }], product: { id: "acme" } }), undefined);
  assert.equal(
    readRuntimeDownloadCatalog({ cards: [], product: { id: "acme", name: "Acme", version: "1.0.0" } }),
    undefined,
  );

  // Usable: the schema token is ours, so it is stamped for a console that omitted it.
  const stamped = readRuntimeDownloadCatalog({
    cards: [{ id: "x" }],
    product: { id: "acme", name: "Acme", version: "1.0.0" },
  });
  assert.equal(
    (stamped as Record<string, unknown>).schemaVersion,
    "2026-05-18.sdkwork-download-catalog.v1",
  );

  // Envelope-complete but no card survives normalisation: the shipped catalog must keep rendering
  // rather than the landing page throwing.
  assert.equal(
    resolveUsableDownloadCatalog({
      cards: [{ id: "no-title-or-actions" }],
      product: { id: "acme", name: "Acme", version: "1.0.0" },
    }),
    undefined,
  );
  assert.equal(resolveUsableDownloadCatalog(undefined), undefined);
});

test("published links are restricted to navigable targets", () => {
  const home = createHomeContentRuntime({
    homepage: {
      cta: {
        primaryCta: { href: "https://example.test/sales", label: "Talk to Sales" },
        secondaryCta: { href: "//evil.test/steal", label: "Evil" },
      },
      hero: {
        primaryCta: { href: "javascript:alert(1)", label: "Bad" },
        secondaryCta: { href: "/docs", label: "Docs" },
      },
    },
    siteName: "Acme",
  });

  assert.equal(home.content.hero?.primaryCta, undefined, "a javascript: target must be dropped");
  assert.equal(home.content.hero?.secondaryCta?.href, "/docs");
  assert.equal(home.content.cta?.primaryCta?.href, "https://example.test/sales");
  assert.equal(
    home.content.cta?.secondaryCta,
    undefined,
    "a protocol-relative target must be dropped",
  );
});

test("the download panel prefers the published catalog and keeps the bundled one as fallback", () => {
  const source = readPortalSource("./packages/sdkwork-cloudrouter-pc-home/src/components/DownloadSection.tsx");

  assert.ok(source.includes("useHomeContent"), "the panel must read published content");
  assert.ok(source.includes("resolveUsableDownloadCatalog"));
  assert.ok(source.includes("brandVariables: home.variables"));
  assert.ok(
    source.includes("cloudRouterDownloadCatalog"),
    "the checked-in catalog must remain the fallback for an unconfigured deployment",
  );
});

test("shipped release-edition titles are brand-neutral", () => {
  const i18nSource = readPortalSource("./packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/navigation.ts");

  for (const line of [
    '"home.desktop.title": "{{productName}} Desktop"',
    '"home.server.title": "{{productName}} Server"',
    '"home.mobile.title": "{{productName}} Mobile"',
    '"home.desktop.title": "{{productName}} 桌面版"',
    '"home.server.title": "{{productName}} 服务器版"',
    '"home.mobile.title": "{{productName}} 移动端"',
  ]) {
    assert.ok(i18nSource.includes(line), `expected brand-neutral copy: ${line}`);
  }
  assert.equal(
    i18nSource.includes('"home.desktop.title": "Cloud Router'),
    false,
    "a shipped edition title must not embed the product name",
  );
});

test("the legacy base-URL download path resolves brand tokens in every edition title", () => {
  // A stub that actually interpolates, unlike the shared `t` above: the regression this guards
  // against was a title that reached the DOM as the literal text "{{productName}} Desktop",
  // because the legacy branch called the translator without the brand variables.
  const interpolating = (key: string, fallback?: unknown): string => {
    const template =
      typeof fallback === "string"
        ? fallback
        : fallback && typeof fallback === "object" && "defaultValue" in fallback
          && typeof (fallback as { defaultValue?: unknown }).defaultValue === "string"
          ? (fallback as { defaultValue: string }).defaultValue
          : key;
    const values = (fallback && typeof fallback === "object" ? fallback : {}) as Record<string, unknown>;
    return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
    );
  };

  const cards = createCloudRouterDownloadCards(interpolating, {
    baseUrl: "https://downloads.example.test/cloud-router",
    brandVariables: { productName: "Acme Gateway", siteName: "Acme", version: "9.9.9" },
  });
  const titleById = new Map(cards.map((card) => [card.id, card.title]));

  assert.deepEqual(
    [...titleById.values()],
    ["Acme Gateway Desktop", "Acme Gateway Server", "Acme Gateway Mobile"],
    "each edition title must carry the operator's product name",
  );
  for (const [id, title] of titleById) {
    assert.equal(title.includes("{{"), false, `${id} still renders an unresolved brand token`);
  }

  // Without brand variables the fallback copy must still be coherent rather than blank, and the
  // token must remain visible so the missing wiring is discoverable instead of silent.
  const untitled = new Map(
    createCloudRouterDownloadCards(interpolating, {
      baseUrl: "https://downloads.example.test/cloud-router",
    }).map((card) => [card.id, card.title]),
  );
  assert.equal(untitled.get("cloud-router-desktop"), "{{productName}} Desktop");
});
