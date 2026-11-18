/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppTemplateCategoryPanel, AppTemplatePanel } from "../src";
import { useApplicationCatalogMessages } from "../src/i18n";
import { DeployTemplateAdminServiceError } from "../src/services/deploy-template-admin";
import type {
  DeployAppTemplateService,
  DeployTemplateAdminService,
} from "../src";
import type { DeployAppTemplate } from "../src/types/deploy-app-templates";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const template: DeployAppTemplate = {
  id: "tpl-1",
  templateKey: "acme-notes",
  displayName: "Acme Notes",
  summary: "Notes template",
  description: "A notes app template",
  appUuid: "app-1",
  templateType: "APP",
  categoryUuid: "cat-1",
  authorUserId: "author-1",
  visibility: "PUBLIC",
  pricingModel: "FREE",
  priceMinor: "0",
  currency: "CNY",
  status: "PENDING_REVIEW",
  isFeatured: true,
  installCount: "0",
  viewCount: "0",
  version: "1",
  screenshots: [],
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-02T00:00:00Z",
};

function createTemplateService(): DeployAppTemplateService {
  return {
    list: vi.fn().mockResolvedValue({ items: [template], page: 1, pageSize: 20, total: 1, hasMore: false }),
    listApps: vi.fn().mockResolvedValue([]),
    listCategories: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    submit: vi.fn(),
    listVersions: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    createVersion: vi.fn(),
  } as unknown as DeployAppTemplateService;
}

function createAdminService(categories: readonly { id: string; categoryKey: string; displayName: string; sortOrder: number; status: "ACTIVE" | "DISABLED" }[] = []): DeployTemplateAdminService {
  return {
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    listCategories: vi.fn().mockResolvedValue(categories),
    createCategory: vi.fn().mockResolvedValue(undefined),
    updateCategory: vi.fn().mockResolvedValue(undefined),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
  };
}

function TemplateHarness({ adminService, service }: { adminService: DeployTemplateAdminService; service: DeployAppTemplateService }) {
  const messages = useApplicationCatalogMessages();
  return (
    <AppTemplatePanel
      adminService={adminService}
      canReview
      description={messages.templates.reviewQueue.description}
      initialStatus="PENDING_REVIEW"
      messages={messages}
      service={service}
      title={messages.templates.reviewQueue.title}
    />
  );
}

function CategoryHarness({ fallbackService, service }: {
  service: DeployTemplateAdminService;
  fallbackService?: { listCategories(): Promise<readonly { id: string; categoryKey: string; displayName: string; sortOrder?: number; status?: string }[]> };
}) {
  const messages = useApplicationCatalogMessages();
  return (
    <MemoryRouter>
      <AppTemplateCategoryPanel
        canWrite
        {...(fallbackService ? { fallbackService: fallbackService as never } : {})}
        messages={messages}
        service={service}
      />
    </MemoryRouter>
  );
}

describe("App Center template review and taxonomy", () => {
  it("opens the review drawer and submits a backend-admin decision", async () => {
    const service = createTemplateService();
    const adminService = createAdminService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <TemplateHarness adminService={adminService} service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("模板审核队列")).toBeTruthy();
    expect(await screen.findByText("Acme Notes")).toBeTruthy();
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_REVIEW" }));

    fireEvent.click(screen.getByRole("button", { name: "审核" }));
    expect(await screen.findByText("模板审核")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("审核说明"), {
      target: { value: "请补充截图" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));

    await waitFor(() => expect(adminService.updateTemplate).toHaveBeenCalledTimes(1));
    expect(adminService.updateTemplate).toHaveBeenCalledWith("tpl-1", {
      status: "PENDING_REVIEW",
      reviewNote: "请补充截图",
      isFeatured: true,
    });
  });

  it("creates a template category through the backend-admin service", async () => {
    const adminService = createAdminService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <CategoryHarness service={adminService} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("暂无分类，先新建一级分类。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "新建一级分类" }));
    fireEvent.change(screen.getByLabelText("分类标识"), { target: { value: "productivity" } });
    fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: "效率工具" } });
    fireEvent.click(screen.getByRole("button", { name: "保存分类" }));

    await waitFor(() => expect(adminService.createCategory).toHaveBeenCalledTimes(1));
    expect(adminService.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryKey: "productivity",
        displayName: "效率工具",
      }),
    );
  });

  it("falls back to the read-only app catalog when the backend is unavailable", async () => {
    const adminService = createAdminService();
    adminService.listCategories = vi.fn().mockRejectedValue(
      new DeployTemplateAdminServiceError("unavailable", "deploy backend unavailable"),
    );
    const fallbackService = {
      listCategories: vi.fn().mockResolvedValue([
        { id: "cat-1", categoryKey: "productivity", displayName: "效率工具", sortOrder: 1, status: "ACTIVE" },
      ]),
    };

    render(
      <SdkworkI18nProvider locale="zh-CN">
        <CategoryHarness fallbackService={fallbackService} service={adminService} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("效率工具")).toBeTruthy();
    expect(fallbackService.listCategories).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "新建一级分类" })).toBeNull();
    expect(screen.getByText(/当前后台不可用/)).toBeTruthy();
  });
});
