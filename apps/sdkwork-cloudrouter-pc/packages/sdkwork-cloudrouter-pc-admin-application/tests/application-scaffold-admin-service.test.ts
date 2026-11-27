import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApplicationScaffoldAdminServiceError,
  createApplicationScaffoldAdminService,
  isApplicationScaffoldAdminUnavailable,
  type ApplicationScaffoldAdminTransport,
} from "../src/services/application-scaffold-admin";

const updateScaffold = vi.fn();
const listCategories = vi.fn();
const listAppCategories = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();
const deleteCategory = vi.fn();

const transport: ApplicationScaffoldAdminTransport = {
  appCategories: {
    list: listAppCategories,
  },
  app: {
    scaffolds: {
      update: updateScaffold,
      categories: {
        // Reads must never reach the backend-admin plane; this must stay unused.
        list: listCategories,
        create: createCategory,
        update: updateCategory,
        delete: deleteCategory,
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application scaffold admin service", () => {
  it("publishes a scaffold with a review note and an idempotency key", async () => {
    updateScaffold.mockResolvedValue({ id: "scaffold-1" });
    const service = createApplicationScaffoldAdminService(transport);

    await service.updateScaffold("scaffold-1", {
      status: "PUBLISHED",
      reviewNote: "Looks good",
      isFeatured: true,
    });

    expect(updateScaffold).toHaveBeenCalledWith(
      "scaffold-1",
      { status: "PUBLISHED", reviewNote: "Looks good", isFeatured: true },
      { idempotencyKey: expect.any(String) },
    );
  });

  it("lists and sorts scaffold categories from the app plane", async () => {
    listAppCategories.mockResolvedValue({
      items: [
        { id: "cat-2", categoryKey: "b", displayName: "B", sortOrder: 2, status: "ACTIVE" },
        { id: "cat-1", category_key: "a", display_name: "A", sort_order: 1, status: "DISABLED" },
      ],
    });
    const service = createApplicationScaffoldAdminService(transport);

    const categories = await service.listCategories();
    // Regression: reading through the backend-admin plane returned 401 in
    // deployments that do not route it, which cleared the operator's session and
    // redirected to /auth/login. Reads must use the app plane only.
    expect(listAppCategories).toHaveBeenCalledWith({ includeDisabled: true });
    expect(listCategories).not.toHaveBeenCalled();
    expect(categories.map((category) => category.id)).toEqual(["cat-1", "cat-2"]);
    expect(categories[0]).toEqual(expect.objectContaining({ id: "cat-1", categoryKey: "a", status: "DISABLED" }));
  });

  it("creates, updates, and deletes a category", async () => {
    createCategory.mockResolvedValue({ id: "cat-1", categoryKey: "news", displayName: "News", sortOrder: 0, status: "ACTIVE" });
    updateCategory.mockResolvedValue({ id: "cat-1", categoryKey: "news", displayName: "Updates", sortOrder: 1, status: "ACTIVE" });
    deleteCategory.mockResolvedValue(undefined);
    const service = createApplicationScaffoldAdminService(transport);

    const created = await service.createCategory({ categoryKey: "news", displayName: "News" });
    expect(created?.id).toBe("cat-1");
    expect(createCategory).toHaveBeenCalledWith(
      { categoryKey: "news", displayName: "News" },
      { idempotencyKey: expect.any(String) },
    );

    await service.updateCategory("cat-1", { categoryKey: "news", displayName: "Updates", sortOrder: 1, status: "ACTIVE" });
    expect(updateCategory).toHaveBeenCalledWith(
      "cat-1",
      { displayName: "Updates", sortOrder: 1, status: "ACTIVE" },
      { idempotencyKey: expect.any(String) },
    );

    await service.deleteCategory("cat-1");
    expect(deleteCategory).toHaveBeenCalledWith("cat-1");
  });

  it("rejects invalid category input and normalizes unavailable failures", async () => {
    const service = createApplicationScaffoldAdminService(transport);
    await expect(service.createCategory({ categoryKey: "!", displayName: "Bad" }))
      .rejects.toBeInstanceOf(ApplicationScaffoldAdminServiceError);
    expect(createCategory).not.toHaveBeenCalled();

    updateScaffold.mockRejectedValue({ status: 503, detail: "deploy backend unavailable" });
    const error = await service.updateScaffold("scaffold-1", { status: "PUBLISHED" })
      .catch((nextError: unknown) => nextError);
    expect(isApplicationScaffoldAdminUnavailable(error)).toBe(true);
  });
});
