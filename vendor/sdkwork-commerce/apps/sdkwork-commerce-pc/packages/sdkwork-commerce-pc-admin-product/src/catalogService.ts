import { getSdkworkCommerceService, type SdkworkCommerceService } from "@sdkwork/commerce-service";

export interface CreateCommerceProductAdminServiceOptions {
  commerceService?: SdkworkCommerceService;
}

type CatalogAdminService = SdkworkCommerceService["admin"]["catalog"];

export interface CommerceProductAdminService {
  listCategories(params?: Record<string, unknown>): Promise<unknown>;
  createCategory(body: Record<string, unknown>): Promise<unknown>;
  updateCategory(categoryId: string, body: Record<string, unknown>): Promise<unknown>;
  deleteCategory(categoryId: string): Promise<unknown>;
  initializeCategorySeeds(body: Record<string, unknown>): Promise<unknown>;
  listProducts(params?: Record<string, unknown>): Promise<unknown>;
  retrieveProduct(productId: string): Promise<unknown>;
  createProduct(body: Record<string, unknown>): Promise<unknown>;
  updateProduct(productId: string, body: Record<string, unknown>): Promise<unknown>;
  deleteProduct(productId: string): Promise<unknown>;
  listSkus(params?: Record<string, unknown>): Promise<unknown>;
  createSku(body: Record<string, unknown>): Promise<unknown>;
  updateSku(skuId: string, body: Record<string, unknown>): Promise<unknown>;
  deleteSku(skuId: string): Promise<unknown>;
  listAttributes(params?: Record<string, unknown>): Promise<unknown>;
  createAttribute(body: Record<string, unknown>): Promise<unknown>;
  listCategoryAttributes(params?: Record<string, unknown>): Promise<unknown>;
  createCategoryAttribute(body: Record<string, unknown>): Promise<unknown>;
  updateCategoryAttribute(bindingId: string, body: Record<string, unknown>): Promise<unknown>;
  deleteCategoryAttribute(bindingId: string): Promise<unknown>;
  listPriceLists(params?: Record<string, unknown>): Promise<unknown>;
  createPriceList(body: Record<string, unknown>): Promise<unknown>;
}

export function createCommerceProductAdminService(
  options: CreateCommerceProductAdminServiceOptions = {},
): CommerceProductAdminService {
  const catalog = resolveCatalogService(options.commerceService);
  return {
    listCategories: (params) => catalog.categories.management.list(params),
    createCategory: (body) => catalog.categories.create(body),
    updateCategory: (categoryId, body) => catalog.categories.update(categoryId, body),
    deleteCategory: (categoryId) => catalog.categories.delete(categoryId),
    initializeCategorySeeds: (body) => catalog.categorySeeds.create(body),
    listProducts: (params) => catalog.products.management.list(params),
    retrieveProduct: (productId) => catalog.products.management.retrieve(productId),
    createProduct: (body) => catalog.products.create(body),
    updateProduct: (productId, body) => catalog.products.update(productId, body),
    deleteProduct: (productId) => catalog.products.delete(productId),
    listSkus: (params) => catalog.skus.list(params),
    createSku: (body) => catalog.skus.create(body),
    updateSku: (skuId, body) => catalog.skus.update(skuId, body),
    deleteSku: (skuId) => catalog.skus.delete(skuId),
    listAttributes: (params) => catalog.attributes.management.list(params),
    createAttribute: (body) => catalog.attributes.create(body),
    listCategoryAttributes: (params) => catalog.categoryAttributes.list(params),
    createCategoryAttribute: (body) => catalog.categoryAttributes.create(body),
    updateCategoryAttribute: (bindingId, body) => catalog.categoryAttributes.update(bindingId, body),
    deleteCategoryAttribute: (bindingId) => catalog.categoryAttributes.delete(bindingId),
    listPriceLists: (params) => catalog.priceLists.list(params),
    createPriceList: (body) => catalog.priceLists.create(body),
  };
}

export function createCommerceProductAdminWorkspaceManifest() {
  return {
    capability: "product-admin",
    packageNames: ["@sdkwork/commerce-pc-admin-product"],
    routePath: "/admin/commerce/products",
    source: "commerce-product-admin-workspace",
  };
}

function resolveCatalogService(commerceService?: SdkworkCommerceService): CatalogAdminService {
  return (commerceService ?? getSdkworkCommerceService()).admin.catalog;
}

function defaultService(): CommerceProductAdminService {
  return createCommerceProductAdminService();
}

export async function listCommerceCategories(params?: Record<string, unknown>) {
  return defaultService().listCategories(params);
}

export async function listCommerceProducts(params?: Record<string, unknown>) {
  return defaultService().listProducts(params);
}

export async function retrieveCommerceProduct(productId: string) {
  return defaultService().retrieveProduct(productId);
}

export async function listCommerceSkus(params?: Record<string, unknown>) {
  return defaultService().listSkus(params);
}

export async function listCommerceAttributes(params?: Record<string, unknown>) {
  return defaultService().listAttributes(params);
}

export async function listCommerceCategoryAttributes(params?: Record<string, unknown>) {
  return defaultService().listCategoryAttributes(params);
}

export async function listCommercePriceLists(params?: Record<string, unknown>) {
  return defaultService().listPriceLists(params);
}

export async function createCommerceCategory(body: Record<string, unknown>) {
  return defaultService().createCategory(body);
}

export async function updateCommerceCategory(categoryId: string, body: Record<string, unknown>) {
  return defaultService().updateCategory(categoryId, body);
}

export async function deleteCommerceCategory(categoryId: string) {
  return defaultService().deleteCategory(categoryId);
}

export async function initializeCommerceCategorySeeds(body: Record<string, unknown>) {
  return defaultService().initializeCategorySeeds(body);
}

export async function createCommerceProduct(body: Record<string, unknown>) {
  return defaultService().createProduct(body);
}

export async function updateCommerceProduct(productId: string, body: Record<string, unknown>) {
  return defaultService().updateProduct(productId, body);
}

export async function deleteCommerceProduct(productId: string) {
  return defaultService().deleteProduct(productId);
}

export async function createCommerceSku(body: Record<string, unknown>) {
  return defaultService().createSku(body);
}

export async function updateCommerceSku(skuId: string, body: Record<string, unknown>) {
  return defaultService().updateSku(skuId, body);
}

export async function deleteCommerceSku(skuId: string) {
  return defaultService().deleteSku(skuId);
}

export async function createCommerceAttribute(body: Record<string, unknown>) {
  return defaultService().createAttribute(body);
}

export async function createCommerceCategoryAttribute(body: Record<string, unknown>) {
  return defaultService().createCategoryAttribute(body);
}

export async function updateCommerceCategoryAttribute(bindingId: string, body: Record<string, unknown>) {
  return defaultService().updateCategoryAttribute(bindingId, body);
}

export async function deleteCommerceCategoryAttribute(bindingId: string) {
  return defaultService().deleteCategoryAttribute(bindingId);
}

export async function createCommercePriceList(body: Record<string, unknown>) {
  return defaultService().createPriceList(body);
}
