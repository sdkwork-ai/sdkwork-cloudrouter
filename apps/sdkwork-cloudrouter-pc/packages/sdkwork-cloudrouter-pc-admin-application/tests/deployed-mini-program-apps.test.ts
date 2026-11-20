import { describe, expect, it } from "vitest";

import {
  toDeployedMiniProgramApps,
} from "../src/services/deployed-mini-program-apps";
import type { ApplicationResourceLinkRecord } from "../src/types/application-integrations";
import {
  APPLICATION_INTEGRATION_METADATA_KEY,
  APPLICATION_INTEGRATION_SCHEMA,
} from "../src/types/application-integrations";

function miniProgramApp(input: {
  appId?: string;
  accountName?: string;
  environments?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: "deploy-app-1",
    name: "Acme mini program",
    slug: "acme-mini",
    appKind: "WECHAT_MINIPROGRAM",
    appStatus: "ACTIVE",
    defaultEnvironment: "production",
    metadata: {
      ...input.metadata,
      ...(input.environments === undefined
        ? {}
        : {
          [APPLICATION_INTEGRATION_METADATA_KEY]: {
            schema: APPLICATION_INTEGRATION_SCHEMA,
            environments: input.environments,
          },
        }),
    },
  };
}

function miniProgramBinding(appId: string, displayName: string): Record<string, unknown> {
  return {
    id: `iamora-${appId}`,
    appId,
    displayName,
    providerCode: "wechat",
    resourceAccountKind: "mini-program",
    enabled: true,
    status: "active",
  };
}

describe("deployed mini program application projection", () => {
  it("resolves the mini program account AppID linked in the deploy app integrations", () => {
    const rows = toDeployedMiniProgramApps(miniProgramApp({
      environments: {
        production: { miniProgram: miniProgramBinding("wx-prod", "Acme mini program production") },
      },
    }));

    expect(rows).toEqual([
      {
        id: "deploy-app-1",
        name: "Acme mini program",
        reference: "acme-mini",
        status: "ACTIVE",
        environment: "production",
        appId: "wx-prod",
        accountName: "Acme mini program production",
      },
    ]);
  });

  it("offers one row per distinct AppID and collapses a repeated one", () => {
    const rows = toDeployedMiniProgramApps(miniProgramApp({
      environments: {
        development: { miniProgram: miniProgramBinding("wx-dev", "Acme dev") },
        staging: { miniProgram: miniProgramBinding("wx-dev", "Acme dev") },
        production: { miniProgram: miniProgramBinding("wx-prod", "Acme prod") },
      },
    }));

    expect(rows.map((row) => [row.environment, row.appId])).toEqual([
      ["development", "wx-dev"],
      ["production", "wx-prod"],
    ]);
  });

  it("keeps a deployed app without a linked account as an unselectable row", () => {
    const rows = toDeployedMiniProgramApps(miniProgramApp({ environments: {} }));

    expect(rows).toEqual([
      {
        id: "deploy-app-1",
        name: "Acme mini program",
        reference: "acme-mini",
        status: "ACTIVE",
      },
    ]);
  });

  it("reads the snake_case integration shape the deploy document tolerates", () => {
    const rows = toDeployedMiniProgramApps(miniProgramApp({
      environments: {
        production: {
          mini_program: {
            id: "iamora-wx-snake",
            app_id: "wx-snake",
            display_name: "Acme snake",
            provider_code: "wechat",
          },
        },
      },
    }));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      environment: "production",
      appId: "wx-snake",
      accountName: "Acme snake",
    });
  });

  it("ignores other app kinds, archived apps, and records without an identity", () => {
    expect(toDeployedMiniProgramApps({ ...miniProgramApp({}), appKind: "SPA_WEB" })).toEqual([]);
    expect(toDeployedMiniProgramApps({ ...miniProgramApp({}), appKind: "DOUYIN_MINIPROGRAM" })).toEqual([]);
    expect(toDeployedMiniProgramApps({ ...miniProgramApp({}), appStatus: "ARCHIVED" })).toEqual([]);
    expect(toDeployedMiniProgramApps({ name: "no id", appKind: "WECHAT_MINIPROGRAM" })).toEqual([]);
    expect(toDeployedMiniProgramApps(undefined)).toEqual([]);
    expect(toDeployedMiniProgramApps("not a record")).toEqual([]);
  });

  it("reads the authoritative resource link when the legacy document has no binding", () => {
    // New bindings are written to `deploy_application_resource_link` only, so a
    // picker that reads the metadata document alone would drop the AppID.
    const rows = toDeployedMiniProgramApps(miniProgramApp({}), [resourceLink("wx-prod", "Acme prod")]);

    expect(rows).toEqual([
      {
        id: "deploy-app-1",
        name: "Acme mini program",
        reference: "acme-mini",
        status: "ACTIVE",
        environment: "production",
        appId: "wx-prod",
        accountName: "Acme prod",
      },
    ]);
  });

  it("prefers the authoritative link over a stale legacy binding of the same environment", () => {
    const rows = toDeployedMiniProgramApps(
      miniProgramApp({
        environments: {
          production: { miniProgram: miniProgramBinding("wx-legacy", "Legacy mini") },
        },
      }),
      [resourceLink("wx-authority", "Authoritative mini")],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      appId: "wx-authority",
      accountName: "Authoritative mini",
      environment: "production",
    });
  });
});

/** One authoritative `deploy_application_resource_link` row for a mini program. */
function resourceLink(appId: string, displayName: string): ApplicationResourceLinkRecord {
  return {
    bindingStatus: "ACTIVE",
    environment: "production",
    id: `link-${appId}`,
    isDefault: false,
    metadata: {
      accountId: `iamora-${appId}`,
      appId,
      displayName,
      providerCode: "wechat",
    },
    providerCode: "wechat",
    resourceKind: "mini_program",
    resourceRef: appId,
  };
}
