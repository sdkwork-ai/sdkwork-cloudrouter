import { describe, expect, it } from "vitest";

import {
  createDeployAppTemplateService,
  DeployAppTemplateServiceError,
  isDeployAppTemplateConflict,
  isDeployAppTemplateForbidden,
  isDeployAppTemplateUnavailable,
  mapTemplatePage,
  mapVersion,
  type DeployAppTemplateTransport,
} from "../src/services/deploy-app-templates";

function templateRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "tpl-1",
    templateKey: "demo-template",
    displayName: "Demo template",
    summary: "One line",
    description: "Long form",
    appUuid: "app-1",
    categoryUuid: "cat-1",
    authorUserId: "user-1",
    visibility: "PUBLIC",
    pricingModel: "FREE",
    priceMinor: "0",
    currency: "CNY",
    status: "PUBLISHED",
    isFeatured: false,
    installCount: "12",
    viewCount: "34",
    version: "1.2.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function createTransport(overrides: Partial<DeployAppTemplateTransport["template"]> = {}): {
  transport: DeployAppTemplateTransport;
  calls: Array<{ operation: string; args: readonly unknown[] }>;
} {
  const calls: Array<{ operation: string; args: readonly unknown[] }> = [];
  const transport: DeployAppTemplateTransport = {
    app: {
      list: async () => {
        calls.push({ operation: "app.list", args: [] });
        return { items: [{ id: "app-1", name: "Demo app" }], pageInfo: {} };
      },
    },
    template: {
      templateCategories: {
        list: async () => ({ items: [{ id: "cat-1", categoryKey: "demo", displayName: "Demo", status: "ACTIVE" }] }),
      },
      appTemplates: {
        list: async (params) => {
          calls.push({ operation: "appTemplates.list", args: [params] });
          return {
            items: [templateRecord()],
            pageInfo: { totalItems: 1, hasMore: false, page: 1, pageSize: 20 },
          };
        },
        retrieve: async () => templateRecord(),
        create: async (body, params) => {
          calls.push({ operation: "appTemplates.create", args: [body, params] });
          return templateRecord();
        },
        update: async (id, body, params) => {
          calls.push({ operation: "appTemplates.update", args: [id, body, params] });
          return templateRecord({ id });
        },
        delete: async (id) => {
          calls.push({ operation: "appTemplates.delete", args: [id] });
        },
        submit: async (id) => {
          calls.push({ operation: "appTemplates.submit", args: [id] });
          return templateRecord({ id, status: "PENDING_REVIEW" });
        },
        ...overrides.appTemplates,
      },
      appTemplateVersions: {
        list: async (id) => {
          calls.push({ operation: "appTemplateVersions.list", args: [id] });
          return { items: [{ id: "ver-1", templateUuid: id, version: "1.2.0", status: "PUBLISHED" }] };
        },
        create: async (id, body, params) => {
          calls.push({ operation: "appTemplateVersions.create", args: [id, body, params] });
          return { id: "ver-2", templateUuid: id, version: "1.3.0", status: "DRAFT" };
        },
        ...overrides.appTemplateVersions,
      },
    },
  };
  return { transport, calls };
}

describe("deploy app template service", () => {
  it("maps the list page and pagination info", async () => {
    const { transport } = createTransport();
    const service = createDeployAppTemplateService(transport);
    const page = await service.list({ page: 2, pageSize: 20, keyword: "demo" });

    expect(page.items[0]?.displayName).toBe("Demo template");
    expect(page.items[0]?.status).toBe("PUBLISHED");
    expect(page.total).toBe(1);
    expect(page.hasMore).toBe(false);
  });

  it("maps apps and categories", async () => {
    const { transport } = createTransport();
    const service = createDeployAppTemplateService(transport);

    await expect(service.listApps()).resolves.toEqual([{ id: "app-1", name: "Demo app" }]);
    const categories = await service.listCategories();
    expect(categories).toEqual([
      { id: "cat-1", categoryKey: "demo", displayName: "Demo", status: "ACTIVE" },
    ]);
  });

  it("creates and updates templates with idempotency keys", async () => {
    const { transport, calls } = createTransport();
    const service = createDeployAppTemplateService(transport);

    const created = await service.create({
      appUuid: "app-1",
      categoryUuid: "cat-1",
      templateKey: "demo-template",
      displayName: "Demo",
      summary: "One line",
      pricingModel: "PAID",
      priceMinor: "9900",
      currency: "cny",
    });
    const createCall = calls.find((call) => call.operation === "appTemplates.create");
    expect(created.id).toBe("tpl-1");
    expect(createCall?.args[0]).toMatchObject({
      appUuid: "app-1",
      templateKey: "demo-template",
      pricingModel: "PAID",
      priceMinor: "9900",
      currency: "CNY",
    });
    expect((createCall?.args[1] as { idempotencyKey: string }).idempotencyKey).toBeTruthy();

    const updated = await service.update("tpl-1", {
      displayName: "Renamed",
      priceMinor: "",
      currency: "",
    });
    const updateCall = calls.find((call) => call.operation === "appTemplates.update");
    expect(updated.id).toBe("tpl-1");
    expect(updateCall?.args[1]).toMatchObject({ displayName: "Renamed" });
    expect((updateCall?.args[1] as Record<string, unknown>).priceMinor).toBeUndefined();
  });

  it("removes, submits, and manages versions", async () => {
    const { transport, calls } = createTransport();
    const service = createDeployAppTemplateService(transport);

    await service.remove("tpl-1");
    const submitted = await service.submit("tpl-1");
    expect(submitted.status).toBe("PENDING_REVIEW");
    const versions = await service.listVersions("tpl-1");
    expect(versions[0]?.version).toBe("1.2.0");
    const created = await service.createVersion("tpl-1", { version: "1.3.0", changelog: "Fixes" });
    expect(created.version).toBe("1.3.0");
    expect(calls.map((call) => call.operation)).toEqual(
      expect.arrayContaining([
        "appTemplates.delete",
        "appTemplates.submit",
        "appTemplateVersions.list",
        "appTemplateVersions.create",
      ]),
    );
  });

  it("normalizes permission, availability, and conflict failures", async () => {
    const { transport } = createTransport({
      appTemplates: {
        list: async () => Promise.reject(Object.assign(new Error("forbidden"), { status: 403 })),
      } as unknown as DeployAppTemplateTransport["template"]["appTemplates"],
    });
    const service = createDeployAppTemplateService(transport);

    const failure = await service.list().catch((error: unknown) => error);
    expect(isDeployAppTemplateForbidden(failure)).toBe(true);
    const error = new DeployAppTemplateServiceError("conflict", "duplicate", 409);
    expect(isDeployAppTemplateConflict(error)).toBe(true);
    expect(isDeployAppTemplateUnavailable(new DeployAppTemplateServiceError("unavailable", "x", 404))).toBe(true);
  });

  it("maps an empty page safely", () => {
    const page = mapTemplatePage({ items: [], pageInfo: {} });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("renders the semantic template version, not the record lock revision", () => {
    expect(mapVersion({ id: "ver-1", templateVersion: "2.1.0", version: "7" })?.version).toBe("2.1.0");
    expect(mapVersion({ id: "ver-2", version: "1.0.0" })?.version).toBe("1.0.0");
    expect(mapVersion({})).toBeUndefined();
  });
});
