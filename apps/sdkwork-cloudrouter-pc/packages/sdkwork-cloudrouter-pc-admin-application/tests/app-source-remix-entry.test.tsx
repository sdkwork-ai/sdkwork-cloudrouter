/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import { zh } from "../src/i18n/zh-CN/iam/application/catalog";
import type {
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationRecord,
  DeployAppSourceService,
  DeployAppSourceSnapshot,
} from "../src";

/**
 * App Center entry point for the Deploy source/remix surface.
 *
 * The row command is the only way into the drawer, so it must be gated on
 * `deploy.apps.read`, stay on deploy rows only, and carry the write gate into the
 * drawer it opens.
 */
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const copy = zh.sourceRemix;

const deployApplication: ApplicationRecord = {
  environment: "production",
  groupId: "deploy",
  id: "deploy-1",
  kind: "WEB",
  name: "Storefront",
  reference: "storefront",
  status: "ACTIVE",
};

const appStoreApplication: ApplicationRecord = {
  groupId: "app-store",
  id: "library-1",
  kind: "DESKTOP_WINDOWS",
  name: "sdkwork-birdcoder",
  status: "installed",
  version: "1.2.0",
};

function createLoaders() {
  return {
    "app-store": vi.fn().mockResolvedValue([appStoreApplication]),
    deploy: vi.fn().mockResolvedValue([deployApplication]),
    iam: vi.fn().mockResolvedValue([]),
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<readonly ApplicationRecord[]>>>;
}

function createSourceService(): DeployAppSourceService {
  const snapshot: DeployAppSourceSnapshot = {
    source: {
      appId: "deploy-1",
      readiness: "READY",
      remixEnabled: false,
      sourceKind: "GIT",
      git: {
        repoProvider: "GITHUB",
        repoUrl: "https://github.com/acme/app.git",
        repoRef: "main",
        cloneMode: "SHALLOW",
        repoStatus: "VALIDATED",
      },
    },
    remix: {
      appId: "deploy-1",
      readiness: "READY",
      remixEnabled: false,
      sourceKind: "GIT",
    },
  };
  return {
    load: vi.fn(async () => snapshot),
    save: vi.fn(async () => snapshot.source),
    retire: vi.fn(async () => undefined),
    setRemix: vi.fn(async (_appId: string, enabled: boolean) => ({
      ...snapshot.remix,
      remixEnabled: enabled,
    })),
    listArtifacts: vi.fn(async () => []),
  };
}

function openConfigMenu(): void {
  const trigger = screen.getAllByRole("button", { name: "应用配置" })[0];
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  fireEvent.click(trigger);
}

function chooseConfigAction(action: string): void {
  openConfigMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: action }));
}

function renderPage(input: {
  permissionScope?: readonly string[];
  sourceService: DeployAppSourceService;
}) {
  const resolveContext = vi.fn(
    async (): Promise<ApplicationCatalogContext> => ({ tenantId: "tenant-1", tenantName: "Acme" }),
  );
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter>
        <ApplicationManagementPage
          backTo="/admin/dashboard"
          loaders={createLoaders()}
          permissionScope={input.permissionScope}
          resolveContext={resolveContext}
          sourceService={input.sourceService}
        />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

describe("App Center source & remix entry", () => {
  it("opens the drawer from the deploy row and keeps it read-only for a reader", async () => {
    const sourceService = createSourceService();
    renderPage({ permissionScope: ["deploy.apps.read"], sourceService });

    await screen.findAllByText("Storefront");
    chooseConfigAction(copy.action);

    await screen.findByRole("heading", { name: copy.title });
    expect(sourceService.load).toHaveBeenCalledWith("deploy-1");
    await screen.findByText(copy.readiness.ready);
    expect(screen.queryByRole("button", { name: copy.save })).toBeNull();
    expect(screen.getByText(copy.errors.writeDenied)).toBeTruthy();
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders the write controls for a writer", async () => {
    const sourceService = createSourceService();
    renderPage({
      permissionScope: ["deploy.apps.read", "deploy.apps.write"],
      sourceService,
    });

    await screen.findAllByText("Storefront");
    chooseConfigAction(copy.action);

    expect(await screen.findByRole("button", { name: copy.save })).toBeTruthy();
    expect(screen.queryByText(copy.errors.writeDenied)).toBeNull();
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(false);
  });

  it("stays hidden without the deploy read grant", async () => {
    renderPage({ permissionScope: [], sourceService: createSourceService() });

    await screen.findAllByText("Storefront");
    openConfigMenu();
    expect(screen.queryByRole("menuitem", { name: copy.action })).toBeNull();
  });

  it("does not offer the deploy source entry on App Store rows", async () => {
    renderPage({ permissionScope: ["deploy.apps.read"], sourceService: createSourceService() });

    await screen.findAllByText("Storefront");
    const appStoreTab = document.querySelector('[data-application-group="app-store"]');
    expect(appStoreTab).not.toBeNull();
    fireEvent.click(appStoreTab as Element);

    await screen.findAllByText("sdkwork-birdcoder");
    openConfigMenu();
    expect(screen.queryByRole("menuitem", { name: copy.action })).toBeNull();
  });
});
