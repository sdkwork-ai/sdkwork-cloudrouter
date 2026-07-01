import { vi } from 'vitest';

export type BackendCatalogMock = {
  categories: {
    management: { list: ReturnType<typeof vi.fn> };
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  categorySeeds: { create: ReturnType<typeof vi.fn> };
  products: {
    management: {
      list: ReturnType<typeof vi.fn>;
      retrieve: ReturnType<typeof vi.fn>;
    };
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  skus: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  attributes: {
    management: { list: ReturnType<typeof vi.fn> };
    create: ReturnType<typeof vi.fn>;
  };
  categoryAttributes: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  priceLists: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

export function createBackendCatalogMock(
  catalog: Partial<BackendCatalogMock> = {},
): BackendCatalogMock {
  return {
    categories: {
      management: {
        list: catalog.categories?.management?.list ?? vi.fn(),
      },
      create: catalog.categories?.create ?? vi.fn(),
      update: catalog.categories?.update ?? vi.fn(),
      delete: catalog.categories?.delete ?? vi.fn(),
    },
    categorySeeds: {
      create: catalog.categorySeeds?.create ?? vi.fn(),
    },
    products: {
      management: {
        list: catalog.products?.management?.list ?? vi.fn(),
        retrieve: catalog.products?.management?.retrieve ?? vi.fn(),
      },
      create: catalog.products?.create ?? vi.fn(),
      update: catalog.products?.update ?? vi.fn(),
      delete: catalog.products?.delete ?? vi.fn(),
    },
    skus: {
      list: catalog.skus?.list ?? vi.fn(),
      create: catalog.skus?.create ?? vi.fn(),
      update: catalog.skus?.update ?? vi.fn(),
      delete: catalog.skus?.delete ?? vi.fn(),
    },
    attributes: {
      management: {
        list: catalog.attributes?.management?.list ?? vi.fn(),
      },
      create: catalog.attributes?.create ?? vi.fn(),
    },
    categoryAttributes: {
      list: catalog.categoryAttributes?.list ?? vi.fn(),
      create: catalog.categoryAttributes?.create ?? vi.fn(),
      update: catalog.categoryAttributes?.update ?? vi.fn(),
      delete: catalog.categoryAttributes?.delete ?? vi.fn(),
    },
    priceLists: {
      list: catalog.priceLists?.list ?? vi.fn(),
      create: catalog.priceLists?.create ?? vi.fn(),
    },
  };
}
