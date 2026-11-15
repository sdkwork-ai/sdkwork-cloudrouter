import { describe, expect, it, vi } from "vitest";

import {
  createAppStoreCategoryService,
  createCategoryRequestBody,
  isAppStoreCategoryConflict,
  isAppStoreCategoryForbidden,
  isAppStoreCategoryUnavailable,
  mapCategory,
  mapCategoryPage,
  resolveCategoryDisplayName,
  updateCategoryRequestBody,
  type AppStoreCategoryTransport,
} from "../src/services/appstore-categories";

/**
 * App Store category transport regression.
 *
 * The backend serializes the category aggregate as `{ category, localizations }`
 * and the Rust status enum as `Active`, while the update request accepts
 * `active`. These tests pin the projection and both wire directions so a
 * convention change cannot silently blank the operator list or no-op a write.
 */

interface Recorder {
  listCalls: Array<{ cursor?: string; pageSize?: number } | undefined>;
  createCalls: Record<string, unknown>[];
  updateCalls: Array<{ id: string; body: Record<string, unknown> }>;
}

function createTransport(handlers: {
  list?: (params?: { cursor?: string; pageSize?: number }) => Promise<unknown>;
  create?: (body: Record<string, unknown>) => Promise<unknown>;
  update?: (id: string, body: Record<string, unknown>) => Promise<unknown>;
}): { recorder: Recorder; transport: AppStoreCategoryTransport } {
  const recorder: Recorder = { listCalls: [], createCalls: [], updateCalls: [] };
  return {
    recorder,
    transport: {
      catalog: {
        appstore: {
          catalog: {
            admin: {
              categories: {
                async list(params) {
                  recorder.listCalls.push(params);
                  return handlers.list?.(params) ?? { items: [], pageInfo: { mode: "cursor" } };
                },
              },
            },
            categories: {
              async create(body) {
                recorder.createCalls.push(body);
                return handlers.create?.(body) ?? {};
              },
              async update(id, body) {
                recorder.updateCalls.push({ id, body });
                return handlers.update?.(id, body) ?? {};
              },
            },
          },
        },
      },
    },
  };
}

function wireCategory(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    category: {
      id: "cat-1",
      tenantId: "100001",
      categoryCode: "ai-assistants",
      parentCategoryId: null,
      categoryLevel: 1,
      status: "Active",
      sortOrder: 100,
      iconMediaResourceId: "mr-cat-ai-assistants-icon",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      ...overrides,
    },
    localizations: [
      { locale: "zh-CN", displayName: "AI 助手", description: "AI 助手与对话" },
      { locale: "en-US", displayName: "AI assistants" },
    ],
  };
}

describe("app store category service", () => {
  it("maps the wrapped aggregate, including the capitalized Rust enum status", async () => {
    const { transport } = createTransport({
      list: async () => ({
        items: [wireCategory()],
        pageInfo: { mode: "cursor", nextCursor: "cat-1", hasMore: true },
      }),
    });
    const service = createAppStoreCategoryService(transport);

    const page = await service.list({ pageSize: 50 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: "cat-1",
      code: "ai-assistants",
      level: 1,
      status: "active",
      sortOrder: 100,
      iconMediaResourceId: "mr-cat-ai-assistants-icon",
    });
    expect(page.items[0]?.localizations).toEqual([
      { locale: "zh-CN", displayName: "AI 助手", description: "AI 助手与对话" },
      { locale: "en-US", displayName: "AI assistants" },
    ]);
    expect(page).toMatchObject({ hasMore: true, nextCursor: "cat-1" });
  });

  it("sends the typed create body with localizations and derived level", async () => {
    const { recorder, transport } = createTransport({
      create: async () => wireCategory(),
    });
    const service = createAppStoreCategoryService(transport);

    const created = await service.create({
      code: "  ai-assistants ",
      level: 1,
      sortOrder: 100,
      iconMediaResourceId: "mr-icon",
      localizations: [
        { locale: "zh-CN", displayName: "AI 助手" },
        { locale: "en-US", displayName: "  " },
      ],
    });

    expect(recorder.createCalls).toHaveLength(1);
    expect(recorder.createCalls[0]).toEqual({
      categoryCode: "ai-assistants",
      categoryLevel: 1,
      sortOrder: 100,
      iconMediaResourceId: "mr-icon",
      localizations: [{ locale: "zh-CN", displayName: "AI 助手" }],
    });
    expect(created.id).toBe("cat-1");
  });

  it("sends the lowercase wire status and preserves typed update fields", async () => {
    const { recorder, transport } = createTransport({
      update: async () => wireCategory({ status: "Inactive" }),
    });
    const service = createAppStoreCategoryService(transport);

    const updated = await service.update("cat-1", {
      status: "inactive",
      sortOrder: 120,
      localizations: [{ locale: "zh-CN", displayName: "AI 助手与对话" }],
    });

    expect(recorder.updateCalls).toEqual([
      {
        id: "cat-1",
        body: {
          sortOrder: 120,
          status: "inactive",
          localizations: [{ locale: "zh-CN", displayName: "AI 助手与对话" }],
        },
      },
    ]);
    expect(updated?.status).toBe("inactive");
  });

  it("classifies a duplicate category code as a conflict", async () => {
    const { transport } = createTransport({
      create: async () => {
        throw Object.assign(new Error("Category code already exists: ai"), { status: 409 });
      },
    });
    const service = createAppStoreCategoryService(transport);

    await expect(service.create({
      code: "ai",
      localizations: [{ locale: "zh-CN", displayName: "AI" }],
    })).rejects.toMatchObject({ kind: "conflict" });
  });

  it("classifies a missing permission and an unmounted service separately", async () => {
    const forbidden = createTransport({
      list: async () => {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
      },
    });
    const unavailable = createTransport({
      list: async () => {
        throw Object.assign(new Error("Not Found"), { status: 404 });
      },
    });

    await expect(createAppStoreCategoryService(forbidden.transport).list())
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(createAppStoreCategoryService(unavailable.transport).list())
      .rejects.toMatchObject({ kind: "unavailable" });
  });

  it("recognizes classified errors through the exported predicates", () => {
    expect(isAppStoreCategoryForbidden(Object.assign(new Error("x"), { status: 403 }))).toBe(true);
    expect(isAppStoreCategoryUnavailable(Object.assign(new Error("x"), { status: 501 }))).toBe(true);
    expect(isAppStoreCategoryConflict(Object.assign(new Error("already exists"), { status: 409 }))).toBe(true);
    expect(isAppStoreCategoryUnavailable(new Error("all good"))).toBe(false);
  });

  it("resolves display names by locale with a base-language fallback", () => {
    const category = mapCategory(wireCategory());
    expect(category).toBeDefined();
    if (!category) {
      return;
    }

    expect(resolveCategoryDisplayName(category, "zh-CN")).toBe("AI 助手");
    expect(resolveCategoryDisplayName(category, "en-GB")).toBe("AI assistants");
    expect(resolveCategoryDisplayName(category, "fr-FR")).toBe("AI 助手");
  });

  it("keeps cursor page data and unknown statuses visible", () => {
    const page = mapCategoryPage({
      items: [wireCategory({ status: "Retired" })],
      pageInfo: { mode: "cursor", hasMore: false },
    });

    expect(page.items[0]?.status).toBe("unknown");
    expect(page.hasMore).toBe(false);
  });

  it("builds request bodies without unknown keys or blank optional values", () => {
    expect(createCategoryRequestBody({
      code: "games",
      parentId: "",
      sortOrder: 10,
      localizations: [{ locale: "zh-CN", displayName: "游戏", description: "  " }],
    })).toEqual({
      categoryCode: "games",
      sortOrder: 10,
      localizations: [{ locale: "zh-CN", displayName: "游戏" }],
    });

    expect(updateCategoryRequestBody({
      parentId: "cat-parent",
      level: 2,
      status: "inactive",
      localizations: [{ locale: "zh-CN", displayName: "  " }],
    })).toEqual({
      parentCategoryId: "cat-parent",
      categoryLevel: 2,
      status: "inactive",
    });
  });
});
