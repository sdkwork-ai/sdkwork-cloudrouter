import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import {
  createCommerceProductAdminService,
  createCommerceProductAdminWorkspaceManifest,
} from "../src";

describe("sdkwork-commerce-pc-admin-product service", () => {
  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "commerce-product-admin-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("delegates the complete catalog admin workflow through the Commerce service boundary", async () => {
    const calls = {
      categoryCreate: vi.fn().mockResolvedValue({ data: { id: "category-1" } }),
      categoryUpdate: vi.fn().mockResolvedValue({ data: { id: "category-1", name: "Updated" } }),
      categoryDelete: vi.fn().mockResolvedValue({ data: { deleted: true } }),
      categorySeedsCreate: vi.fn().mockResolvedValue({ data: [{ dataset: "product", requested: 2, upserted: 2 }] }),
      productCreate: vi.fn().mockResolvedValue({ data: { id: "product-1" } }),
      productUpdate: vi.fn().mockResolvedValue({ data: { id: "product-1", title: "Updated" } }),
      productDelete: vi.fn().mockResolvedValue({ data: { deleted: true } }),
      skuCreate: vi.fn().mockResolvedValue({ data: { id: "sku-1" } }),
      skuUpdate: vi.fn().mockResolvedValue({ data: { id: "sku-1", skuNo: "SKU-1" } }),
      skuDelete: vi.fn().mockResolvedValue({ data: { deleted: true } }),
      attributeCreate: vi.fn().mockResolvedValue({ data: { id: "attribute-1" } }),
      categoryAttributeCreate: vi.fn().mockResolvedValue({ data: { id: "binding-1" } }),
      categoryAttributeUpdate: vi.fn().mockResolvedValue({ data: { id: "binding-1", required: true } }),
      categoryAttributeDelete: vi.fn().mockResolvedValue({ data: { deleted: true } }),
      priceListCreate: vi.fn().mockResolvedValue({ data: { id: "price-list-1" } }),
      productRetrieve: vi.fn().mockResolvedValue({ data: { id: "product-1" } }),
    };
    const commerceService = createCommerceServiceMock({
      admin: {
        catalog: {
          attributes: {
            management: {
              list: vi.fn().mockResolvedValue({ data: [{ id: "attribute-1" }] }),
            },
            create: calls.attributeCreate,
          },
          categories: {
            management: {
              list: vi.fn().mockResolvedValue({ data: [{ id: "category-1" }] }),
            },
            create: calls.categoryCreate,
            update: calls.categoryUpdate,
            delete: calls.categoryDelete,
          },
          categoryAttributes: {
            list: vi.fn().mockResolvedValue({ data: [{ id: "binding-1" }] }),
            create: calls.categoryAttributeCreate,
            update: calls.categoryAttributeUpdate,
            delete: calls.categoryAttributeDelete,
          },
          categorySeeds: {
            create: calls.categorySeedsCreate,
          },
          priceLists: {
            list: vi.fn().mockResolvedValue({ data: [{ id: "price-list-1" }] }),
            create: calls.priceListCreate,
          },
          products: {
            management: {
              list: vi.fn().mockResolvedValue({ data: [{ id: "product-1" }] }),
              retrieve: calls.productRetrieve,
            },
            create: calls.productCreate,
            update: calls.productUpdate,
            delete: calls.productDelete,
          },
          skus: {
            list: vi.fn().mockResolvedValue({ data: [{ id: "sku-1" }] }),
            create: calls.skuCreate,
            update: calls.skuUpdate,
            delete: calls.skuDelete,
          },
        },
      },
    });
    const service = createCommerceProductAdminService({ commerceService });

    await expect(service.listCategories({ page: "1" })).resolves.toEqual({ data: [{ id: "category-1" }] });
    await expect(service.createCategory({ name: "Root" })).resolves.toEqual({ data: { id: "category-1" } });
    await expect(service.updateCategory("category-1", { name: "Updated" })).resolves.toEqual({
      data: { id: "category-1", name: "Updated" },
    });
    await expect(service.deleteCategory("category-1")).resolves.toEqual({ data: { deleted: true } });
    await expect(service.initializeCategorySeeds({ datasets: ["product"] })).resolves.toEqual({
      data: [{ dataset: "product", requested: 2, upserted: 2 }],
    });
    await expect(service.listProducts({ status: "active" })).resolves.toEqual({ data: [{ id: "product-1" }] });
    await expect(service.retrieveProduct("product-1")).resolves.toEqual({ data: { id: "product-1" } });
    await expect(service.createProduct({ title: "Product" })).resolves.toEqual({ data: { id: "product-1" } });
    await expect(service.updateProduct("product-1", { title: "Updated" })).resolves.toEqual({
      data: { id: "product-1", title: "Updated" },
    });
    await expect(service.deleteProduct("product-1")).resolves.toEqual({ data: { deleted: true } });
    await expect(service.listSkus({ productId: "product-1" })).resolves.toEqual({ data: [{ id: "sku-1" }] });
    await expect(service.createSku({ skuNo: "SKU-1" })).resolves.toEqual({ data: { id: "sku-1" } });
    await expect(service.updateSku("sku-1", { skuNo: "SKU-1" })).resolves.toEqual({
      data: { id: "sku-1", skuNo: "SKU-1" },
    });
    await expect(service.deleteSku("sku-1")).resolves.toEqual({ data: { deleted: true } });
    await expect(service.listAttributes({ scope: "sku" })).resolves.toEqual({ data: [{ id: "attribute-1" }] });
    await expect(service.createAttribute({ name: "Color" })).resolves.toEqual({ data: { id: "attribute-1" } });
    await expect(service.listCategoryAttributes({ categoryId: "category-1" })).resolves.toEqual({
      data: [{ id: "binding-1" }],
    });
    await expect(service.createCategoryAttribute({ categoryId: "category-1" })).resolves.toEqual({
      data: { id: "binding-1" },
    });
    await expect(service.updateCategoryAttribute("binding-1", { required: true })).resolves.toEqual({
      data: { id: "binding-1", required: true },
    });
    await expect(service.deleteCategoryAttribute("binding-1")).resolves.toEqual({ data: { deleted: true } });
    await expect(service.listPriceLists({ page: "1" })).resolves.toEqual({ data: [{ id: "price-list-1" }] });
    await expect(service.createPriceList({ name: "Default" })).resolves.toEqual({ data: { id: "price-list-1" } });

    expect(calls.categoryCreate).toHaveBeenCalledWith({ name: "Root" });
    expect(calls.categoryUpdate).toHaveBeenCalledWith("category-1", { name: "Updated" });
    expect(calls.categoryDelete).toHaveBeenCalledWith("category-1");
    expect(calls.categorySeedsCreate).toHaveBeenCalledWith({ datasets: ["product"] });
    expect(calls.productRetrieve).toHaveBeenCalledWith("product-1");
    expect(calls.productDelete).toHaveBeenCalledWith("product-1");
    expect(calls.skuDelete).toHaveBeenCalledWith("sku-1");
    expect(calls.categoryAttributeUpdate).toHaveBeenCalledWith("binding-1", { required: true });
  });

  it("exports a reusable workspace manifest for Claw Router integration", () => {
    expect(createCommerceProductAdminWorkspaceManifest()).toMatchObject({
      capability: "product-admin",
      packageNames: ["@sdkwork/commerce-pc-admin-product"],
      routePath: "/admin/commerce/products",
    });
  });

  it("keeps the product admin remote boundary on Commerce service only", () => {
    const source = readFileSync(
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/catalogService.ts",
      "utf8",
    );

    expect(source).toContain("@sdkwork/commerce-service");
    expect(source).toContain("catalog.products.management.retrieve");
    expect(source).toContain("catalog.categories.management.list");
    expect(source).toContain("catalog.attributes.management.list");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toContain("clawrouter-backend-sdk");
  });

  it("keeps product admin catalog field names on the canonical commerce contract", () => {
    const sourceFiles = [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/ProductCreatePage.tsx",
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/SkuManagementPage.tsx",
    ];
    const retiredFieldNames = ["deliveryMode", "delivery_mode", "salesStatus", "sales_status"];

    for (const sourceFile of sourceFiles) {
      const source = readFileSync(sourceFile, "utf8");

      for (const fieldName of retiredFieldNames) {
        expect(source, `${sourceFile} must not contain retired field ${fieldName}`).not.toContain(fieldName);
      }
    }
  });

  it("loads edit drafts through backend product retrieve instead of list-search fallback", () => {
    const sourceFile = "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/ProductCreatePage.tsx";
    const source = readFileSync(sourceFile, "utf8");

    expect(source).toContain("retrieveCommerceProduct");
    for (const retiredEditLookup of [
      "fallbackResult",
      "fallbackMatch",
      "listCommerceProducts({ page: '1', pageSize: '50', q: productId })",
    ]) {
      expect(source, `${sourceFile} must not contain edit lookup fallback ${retiredEditLookup}`).not.toContain(
        retiredEditLookup,
      );
    }
  });

  it("exposes commercial product center view-model helpers and editor panels", () => {
    const packageRoot = "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src";
    const createPageSource = readFileSync(`${packageRoot}/ProductCreatePage.tsx`, "utf8");
    const listPageSource = readFileSync(`${packageRoot}/ProductListPage.tsx`, "utf8");
    const mappingSource = readFileSync(`${packageRoot}/productAdminMapping.ts`, "utf8");
    const readinessSource = readFileSync(`${packageRoot}/productAdminReadiness.ts`, "utf8");

    for (const marker of [
      "ProductDetailConfigPanel",
      "ProductStoreInventoryPanel",
      "ProductPublishReadinessPanel",
      "ProductAttributeValuePanel",
      "SkuMatrixCommercialPanel",
    ]) {
      expect(createPageSource).toContain(marker);
    }

    expect(mappingSource).toContain("buildCommercialProductMetadata");
    expect(mappingSource).toContain("productDetailConfig");
    expect(mappingSource).toContain("storeVisibility");
    expect(mappingSource).toContain("categoryAttributeValues");
    expect(mappingSource).toContain("skuAttributeValues");
    expect(mappingSource).toContain("publishReadiness");
    expect(mappingSource).toContain("readProductCommercialSignals");
    expect(readinessSource).toContain("evaluateProductReadiness");
    expect(readinessSource).toContain("Physical products require inventory source policy before publish.");
    expect(createPageSource).toContain("metadata: {");
    expect(createPageSource).toContain("buildSkuAttributePayloads");
    expect(listPageSource).toContain("readProductCommercialSignals");
    expect(listPageSource).toContain("data-admin-product-commercial-signals");
  });
});
