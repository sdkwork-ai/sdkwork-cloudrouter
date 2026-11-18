/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import type { AppStoreCategory, AppStoreCategoryService } from "../src";
import type { ApplicationCatalogContext, ApplicationCatalogView, ApplicationGroupId, ApplicationRecord } from "../src";

/**
 * App Center category management regression.
 *
 * The App Store category group is exercised through the same page an operator
 * uses: browse, create with localized names, toggle the storefront status, and
 * delete. The service seam keeps the generated transport out of the test while
 * still asserting the exact request shape the backend receives.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const category: AppStoreCategory = {
  id: "cat-ai",
  code: "ai-assistants",
  level: 1,
  localizations: [
    { locale: "zh-CN", displayName: "AI 助手", description: "AI 助手与对话" },
    { locale: "en-US", displayName: "AI assistants" },
  ],
  sortOrder: 100,
  status: "active",
  updatedAt: "2026-01-02T00:00:00Z",
};

const childCategory: AppStoreCategory = {
  ...category,
  id: "cat-child",
  code: "ai-coding",
  level: 2,
  parentId: "cat-ai",
  localizations: [{ locale: "zh-CN", displayName: "AI 编程" }],
  sortOrder: 110,
};

function createCategoryService(overrides: Partial<AppStoreCategoryService> = {}): AppStoreCategoryService {
  return {
    list: vi.fn().mockResolvedValue({ items: [category], hasMore: false }),
    create: vi.fn().mockResolvedValue({
      ...category,
      id: "cat-games",
      code: "games",
      localizations: [{ locale: "zh-CN", displayName: "游戏" }],
    }),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as AppStoreCategoryService;
}

function createLoaders() {
  const empty = vi.fn().mockResolvedValue([] as readonly ApplicationRecord[]);
  return {
    "app-store": empty,
    deploy: empty,
    iam: empty,
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<readonly ApplicationRecord[]>>>;
}

function renderPage(
  service: AppStoreCategoryService,
  options: { activeView?: ApplicationCatalogView; showViewNav?: boolean; initialPath?: string } = {},
) {
  const resolveContext = vi.fn<() => Promise<ApplicationCatalogContext>>()
    .mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
  render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter initialEntries={options.initialPath ? [options.initialPath] : undefined}>
        <ApplicationManagementPage
          activeView={options.activeView}
          backTo="/admin/dashboard"
          categoryService={service}
          loaders={createLoaders()}
          resolveContext={resolveContext}
          showViewNav={options.showViewNav}
          tenantId="tenant-1"
        />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

async function openCategories(): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: /分类管理/ }));
}

async function findCategoryName(name: string): Promise<HTMLElement[]> {
  return screen.findAllByText(name);
}

function rowFor(text: string): HTMLElement {
  const cell = screen.getAllByText(text)[0];
  const row = cell?.closest("tr");
  if (!row) {
    throw new Error(`row not found for ${text}`);
  }
  return row as HTMLElement;
}

describe("app center category management", () => {
  it("browses categories, resolves localized names, and shows parent/status", async () => {
    const service = createCategoryService({
      list: vi.fn().mockResolvedValue({ items: [category, childCategory], hasMore: false }),
    });
    renderPage(service);

    await openCategories();
    expect((await findCategoryName("AI 助手")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("AI 助手")[0] as HTMLElement);
    expect(await findCategoryName("AI 编程")).toBeTruthy();
    expect(screen.getByText(/ai-assistants/)).toBeTruthy();
    expect(screen.getByText("一级分类")).toBeTruthy();
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it("creates a category with the simplified-Chinese localization", async () => {
    const service = createCategoryService();
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: /新建一级分类/ }));

    fireEvent.change(await screen.findByPlaceholderText("例如 ai-assistants"), {
      target: { value: "games" },
    });
    const nameInputs = screen.getAllByPlaceholderText("例如 AI 助手与对话");
    fireEvent.change(nameInputs[0] as HTMLElement, { target: { value: "游戏" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(service.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(service.create).mock.calls[0]?.[0]).toMatchObject({
      code: "games",
      level: 1,
      sortOrder: 110,
      localizations: [{ locale: "zh-CN", displayName: "游戏" }],
    });
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
  });

  it("creates a child category from the cascade with the parent preselected", async () => {
    const service = createCategoryService();
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getAllByText("AI 助手")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "新建下级分类 AI 助手" }));

    fireEvent.change(await screen.findByPlaceholderText("例如 ai-assistants"), {
      target: { value: "ai-child" },
    });
    const nameInputs = screen.getAllByPlaceholderText("例如 AI 助手与对话");
    fireEvent.change(nameInputs[0] as HTMLElement, { target: { value: "子分类" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(service.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(service.create).mock.calls[0]?.[0]).toMatchObject({
      code: "ai-child",
      parentId: "cat-ai",
      level: 2,
    });
  });

  it("shows a newly created child in the next cascade column", async () => {
    const createdChild: AppStoreCategory = {
      ...category,
      id: "cat-child-new",
      code: "ai-child",
      level: 2,
      parentId: "cat-ai",
      localizations: [{ locale: "zh-CN", displayName: "新增子分类" }],
      sortOrder: 120,
    };
    const service = createCategoryService({
      list: vi.fn()
        .mockResolvedValueOnce({ items: [category], hasMore: false })
        .mockResolvedValueOnce({ items: [category, createdChild], hasMore: false }),
    });
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getAllByText("AI 助手")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "新建下级分类 AI 助手" }));

    fireEvent.change(await screen.findByPlaceholderText("例如 ai-assistants"), {
      target: { value: "ai-child" },
    });
    const nameInputs = screen.getAllByPlaceholderText("例如 AI 助手与对话");
    fireEvent.change(nameInputs[0] as HTMLElement, { target: { value: "新增子分类" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("新增子分类")).toBeTruthy();
  });

  it("blocks a save when the code or the primary name is missing", async () => {
    const service = createCategoryService();
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: /新建一级分类/ }));
    fireEvent.click(await screen.findByRole("button", { name: "保存" }));

    await screen.findByText("请填写分类编码。");
    expect(screen.getByText("请填写简体中文（zh-CN）名称。")).toBeTruthy();
    expect(service.create).not.toHaveBeenCalled();
  });

  it("toggles a category between active and inactive through the update operation", async () => {
    const service = createCategoryService({
      update: vi.fn().mockResolvedValue({ ...category, status: "inactive" }),
    });
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: /停用 AI 助手/ }));

    await waitFor(() => expect(service.update).toHaveBeenCalledWith("cat-ai", { status: "inactive" }));
  });

  it("refuses to delete a category that still has children", async () => {
    const service = createCategoryService({
      list: vi.fn().mockResolvedValue({ items: [category, childCategory], hasMore: false }),
    });
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: /删除 AI 助手/ }));

    await screen.findByText("该分类下还有子分类，请先停用或移除子分类。");
    expect(screen.queryByRole("button", { name: /确认删除/ })).toBeNull();
    expect(service.update).not.toHaveBeenCalled();
    expect(screen.getAllByText("AI 助手").length).toBeGreaterThan(0);
  });

  it("soft-deletes a leaf category and removes the row", async () => {
    const service = createCategoryService();
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: /删除 AI 助手/ }));
    fireEvent.click(await screen.findByRole("button", { name: /确认删除/ }));

    await waitFor(() => expect(service.update).toHaveBeenCalledWith("cat-ai", { status: "deleted" }));
  });

  it("renders the forbidden state when the operator lacks the catalog scope", async () => {
    const service = createCategoryService({
      list: vi.fn().mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 })),
    });
    renderPage(service);

    await openCategories();
    await screen.findByText(/当前账号没有应用商店分类管理权限/);
    expect(screen.getByRole("button", { name: /重试/ })).toBeTruthy();
  });

  it("renders a route-owned view without a second sidebar in the App Center", async () => {
    const service = createCategoryService();
    renderPage(service, { activeView: "categories", showViewNav: false });

    expect((await screen.findAllByText("AI 助手")).length).toBeGreaterThan(0);
    expect(screen.getByText("应用分类管理")).toBeTruthy();
    expect(document.querySelector("[data-application-group]")).toBeNull();
  });

  it("restores the selected category from the URL", async () => {
    const service = createCategoryService({
      list: vi.fn().mockResolvedValue({ items: [category, childCategory], hasMore: false }),
    });
    renderPage(service, { initialPath: "/?category=cat-child" });

    await openCategories();
    expect(await screen.findByText("AI 编程")).toBeTruthy();
  });

  it("locates a nested category by name", async () => {
    const service = createCategoryService({
      list: vi.fn().mockResolvedValue({ items: [category, childCategory], hasMore: false }),
    });
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.change(screen.getByPlaceholderText("按名称或编码定位分类"), {
      target: { value: "AI 编程" },
    });
    fireEvent.click(screen.getByRole("button", { name: "定位" }));

    expect(await screen.findByText("AI 编程")).toBeTruthy();
  });

  it("reorders sibling categories by swapping sortOrder", async () => {
    const second: AppStoreCategory = {
      ...category,
      id: "cat-second",
      code: "second",
      sortOrder: 110,
      localizations: [{ locale: "zh-CN", displayName: "第二分类" }],
    };
    const service = createCategoryService({
      list: vi.fn().mockResolvedValue({ items: [category, second], hasMore: false }),
    });
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    fireEvent.click(screen.getByRole("button", { name: "下移 AI 助手" }));

    await waitFor(() => expect(service.update).toHaveBeenCalledTimes(2));
    expect(service.update).toHaveBeenNthCalledWith(1, "cat-ai", { sortOrder: 110 });
    expect(service.update).toHaveBeenNthCalledWith(2, "cat-second", { sortOrder: 100 });
  });

  it("keeps every category row action on one line", async () => {
    const service = createCategoryService();
    renderPage(service);

    await openCategories();
    await findCategoryName("AI 助手");
    const actions = document.querySelector("[data-application-row-actions]");
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(6);
  });
});
