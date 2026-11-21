/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it } from "vitest";

import { AppSourceRemixDrawer, useApplicationCatalogMessages } from "../src";
import { zh } from "../src/i18n/zh-CN/iam/application/catalog";
import type { ApplicationRecord } from "../src";
import type {
  DeployAppRemixState,
  DeployAppSourceService,
  DeployAppSourceSnapshot,
  DeployAppSourceState,
  DeployAppSourceUpdatePayload,
  DeployArtifactOption,
} from "../src";

/**
 * Source & remix drawer regression.
 *
 * Covers the four behaviours the entry point exists for: the readiness verdict is
 * rendered with its reason, the remix switch is refused (and explained) while the
 * source is missing, a reader cannot reach any write control, and saving sends the
 * exact GIT / ARCHIVE payload of the selected kind.
 */
afterEach(() => {
  cleanup();
});

const copy = zh.sourceRemix;

const application: ApplicationRecord = {
  environment: "production",
  groupId: "deploy",
  id: "app-1",
  kind: "WEB",
  name: "Storefront",
  reference: "storefront",
  status: "ACTIVE",
};

function sourceState(overrides: Partial<DeployAppSourceState> = {}): DeployAppSourceState {
  return {
    appId: "app-1",
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
    ...overrides,
  };
}

function remixState(
  remixEnabled: boolean,
  overrides: Partial<DeployAppRemixState> = {},
): DeployAppRemixState {
  return {
    appId: "app-1",
    readiness: "READY",
    remixEnabled,
    sourceKind: "GIT",
    ...overrides,
  };
}

interface RecordedCall {
  operation: string;
  args: readonly unknown[];
}

function createService(options: {
  load?: () => Promise<DeployAppSourceSnapshot>;
  retire?: () => Promise<void>;
  save?: (appId: string, payload: DeployAppSourceUpdatePayload) => Promise<DeployAppSourceState>;
  setRemix?: (appId: string, enabled: boolean) => Promise<DeployAppRemixState>;
  artifacts?: readonly DeployArtifactOption[];
} = {}): { calls: RecordedCall[]; service: DeployAppSourceService } {
  const calls: RecordedCall[] = [];
  const service: DeployAppSourceService = {
    async load(appId) {
      calls.push({ operation: "load", args: [appId] });
      return options.load
        ? options.load()
        : { source: sourceState(), remix: remixState(false) };
    },
    async save(appId, payload) {
      calls.push({ operation: "save", args: [appId, payload] });
      return options.save ? options.save(appId, payload) : sourceState({ sourceKind: payload.kind });
    },
    async retire(appId) {
      calls.push({ operation: "retire", args: [appId] });
      if (options.retire) {
        await options.retire();
      }
    },
    async setRemix(appId, enabled) {
      calls.push({ operation: "setRemix", args: [appId, enabled] });
      return options.setRemix ? options.setRemix(appId, enabled) : remixState(enabled);
    },
    async listArtifacts() {
      calls.push({ operation: "listArtifacts", args: [] });
      return options.artifacts ?? [];
    },
  };
  return { calls, service };
}

function Harness({
  canRead = true,
  canWrite = true,
  service,
}: {
  canRead?: boolean;
  canWrite?: boolean;
  service: DeployAppSourceService;
}) {
  const messages = useApplicationCatalogMessages();
  return (
    <AppSourceRemixDrawer
      application={application}
      canRead={canRead}
      canWrite={canWrite}
      messages={messages}
      onClose={() => undefined}
      service={service}
    />
  );
}

function renderDrawer(props: {
  canRead?: boolean;
  canWrite?: boolean;
  service: DeployAppSourceService;
}) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter>
        <Harness {...props} />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

function input(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  expect(element).not.toBeNull();
  return element as HTMLInputElement;
}

function switchElement(): HTMLButtonElement {
  return screen.getByRole("switch") as HTMLButtonElement;
}

function template(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}

describe("source & remix drawer", () => {
  it("renders the readiness verdict with its reason and blocks remix", async () => {
    const { service } = createService({
      load: async () => ({
        source: sourceState({
          readiness: "MISSING",
          readinessReason: "GIT_REPOSITORY_NOT_VALIDATED",
          remixEnabled: false,
        }),
        remix: remixState(false, {
          readiness: "MISSING",
          readinessReason: "GIT_REPOSITORY_NOT_VALIDATED",
        }),
      }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.missing);
    expect(document.querySelector('[data-app-source-readiness="MISSING"]')).not.toBeNull();
    expect(document.querySelector("[data-app-source-readiness]")?.getAttribute("data-app-source-reason"))
      .toBe("GIT_REPOSITORY_NOT_VALIDATED");
    expect(screen.getByText(copy.readiness.reasons.GIT_REPOSITORY_NOT_VALIDATED)).toBeTruthy();
    expect(screen.getByText("(GIT_REPOSITORY_NOT_VALIDATED)")).toBeTruthy();
    expect(screen.getByText(template(copy.remix.blockedTemplate, {
      reason: copy.readiness.reasons.GIT_REPOSITORY_NOT_VALIDATED,
    }))).toBeTruthy();
    expect(switchElement().disabled).toBe(true);
  });

  it("enables the remix switch only when the source is ready", async () => {
    const { calls, service } = createService({
      load: async () => ({ source: sourceState(), remix: remixState(false) }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.ready);
    const toggle = switchElement();
    expect(toggle.disabled).toBe(false);
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(calls.find((call) => call.operation === "setRemix")?.args).toEqual(["app-1", true]);
    });
    await waitFor(() => expect(switchElement().getAttribute("aria-checked")).toBe("true"));
  });

  it("explains a refused enable with the readiness reason the server returned", async () => {
    const { service } = createService({
      load: async () => ({ source: sourceState(), remix: remixState(false) }),
      setRemix: async () => {
        throw Object.assign(
          new Error("remix cannot be enabled: the application source is MISSING (SOURCE_KIND_MISMATCH)"),
          { status: 409 },
        );
      },
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.ready);
    fireEvent.click(switchElement());

    await screen.findByText(template(copy.errors.conflictTemplate, {
      reason: copy.readiness.reasons.SOURCE_KIND_MISMATCH,
    }));
    expect(switchElement().getAttribute("aria-checked")).toBe("false");
  });

  it("hides every write control from a reader", async () => {
    const { service } = createService({
      load: async () => ({ source: sourceState(), remix: remixState(false) }),
    });
    renderDrawer({ canWrite: false, service });

    await screen.findByText(copy.readiness.ready);
    expect(screen.queryByRole("button", { name: copy.save })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.delete.action })).toBeNull();
    expect(screen.getByText(copy.errors.writeDenied)).toBeTruthy();
    expect(switchElement().disabled).toBe(true);
    expect(input("app-source-repo-url").disabled).toBe(true);
  });

  it("sends the Git payload built from the form", async () => {
    const { calls, service } = createService({
      load: async () => ({
        source: sourceState({
          sourceKind: undefined,
          git: undefined,
          readiness: "MISSING",
          readinessReason: "SOURCE_NOT_CONFIGURED",
        }),
        remix: remixState(false, {
          sourceKind: undefined,
          readiness: "MISSING",
          readinessReason: "SOURCE_NOT_CONFIGURED",
        }),
      }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.missing);
    fireEvent.change(input("app-source-repo-url"), {
      target: { value: " https://github.com/acme/app.git " },
    });
    fireEvent.change(input("app-source-sub-path"), { target: { value: "./apps/web/" } });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    await waitFor(() => {
      expect(calls.find((call) => call.operation === "save")?.args).toEqual([
        "app-1",
        {
          kind: "GIT",
          git: {
            repoProvider: "GITHUB",
            repoUrl: "https://github.com/acme/app.git",
            cloneMode: "SHALLOW",
            subPath: "apps/web",
          },
        },
      ]);
    });
  });

  it("sends the archive payload when the archive kind is selected", async () => {
    const { calls, service } = createService({
      load: async () => ({
        source: sourceState({
          sourceKind: undefined,
          git: undefined,
          readiness: "MISSING",
          readinessReason: "SOURCE_NOT_CONFIGURED",
        }),
        remix: remixState(false, {
          sourceKind: undefined,
          readiness: "MISSING",
          readinessReason: "SOURCE_NOT_CONFIGURED",
        }),
      }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.missing);
    fireEvent.click(screen.getByRole("radio", { name: copy.kind.archive }));
    fireEvent.change(input("app-source-artifact-id"), { target: { value: " art-7 " } });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    await waitFor(() => {
      expect(calls.find((call) => call.operation === "save")?.args).toEqual([
        "app-1",
        { kind: "ARCHIVE", archive: { artifactId: "art-7" } },
      ]);
    });
  });

  it("reports a form error instead of calling the API", async () => {
    const { calls, service } = createService({
      load: async () => ({
        source: sourceState({
          sourceKind: undefined,
          git: undefined,
          readiness: "MISSING",
          readinessReason: "SOURCE_NOT_CONFIGURED",
        }),
        remix: remixState(false, { sourceKind: undefined, readiness: "MISSING" }),
      }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.missing);
    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    await screen.findByText(copy.validation["repo-url-required"]);
    expect(calls.some((call) => call.operation === "save")).toBe(false);
  });

  it("removes the configured source after confirmation", async () => {
    const { calls, service } = createService({
      load: async () => ({ source: sourceState(), remix: remixState(true) }),
    });
    renderDrawer({ service });

    await screen.findByText(copy.readiness.ready);
    fireEvent.click(screen.getByRole("button", { name: copy.delete.action }));
    fireEvent.click(screen.getByRole("button", { name: copy.delete.confirm }));

    await waitFor(() => {
      expect(calls.find((call) => call.operation === "retire")?.args).toEqual(["app-1"]);
    });
  });

  it("separates a missing application from an unreachable service on load", async () => {
    const missing = createService({
      load: async () => {
        throw Object.assign(new Error("not found"), { status: 404 });
      },
    });
    renderDrawer({ service: missing.service });
    await screen.findByText(copy.errors.notFound);
    cleanup();

    const offline = createService({
      load: async () => {
        throw Object.assign(new Error("network"), { code: "NETWORK_ERROR", name: "NetworkError" });
      },
    });
    renderDrawer({ service: offline.service });
    await screen.findByText(copy.errors.network);
  });
});
