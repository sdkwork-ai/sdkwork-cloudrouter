import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Brand, Category, ProductCenterService } from '../productCenterService.ts';

export interface CatalogLookupOption {
  value: string;
  label: string;
}

export interface CatalogLookups {
  categories: readonly Category[];
  brands: readonly Brand[];
  categoryName: (categoryId: string | null | undefined) => string | undefined;
  brandName: (brandId: string | null | undefined) => string | undefined;
  categoryOptions: readonly CatalogLookupOption[];
  brandOptions: readonly CatalogLookupOption[];
  loading: boolean;
  reload: () => void;
}

const LOOKUP_PAGE_SIZE = 200;

/**
 * Read-only reference data shared by the catalog pages.
 *
 * Products and SKUs store `categoryId`/`brandId`; an operator needs the human
 * label. Both dictionaries are owned by the catalog module, so they are read
 * through the same generated catalog client instead of being duplicated in the
 * admin bundle. A failed lookup never blocks the primary list: the page falls
 * back to the raw id.
 */
export function useCatalogLookups(service: ProductCenterService): CatalogLookups {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      service.listCategories({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
      service.listBrands({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    ]).then(([categoryResult, brandResult]) => {
      if (!active) {
        return;
      }
      setCategories(categoryResult.status === 'fulfilled' ? categoryResult.value.items : []);
      setBrands(brandResult.status === 'fulfilled' ? brandResult.value.items : []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken, service]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }, [categories]);

  const brandById = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const brand of brands) {
      map.set(brand.id, brand);
    }
    return map;
  }, [brands]);

  const categoryName = useCallback(
    (categoryId: string | null | undefined) => (
      categoryId ? categoryById.get(categoryId)?.name ?? categoryId : undefined
    ),
    [categoryById],
  );

  const brandName = useCallback(
    (brandId: string | null | undefined) => (
      brandId ? brandById.get(brandId)?.name ?? brandId : undefined
    ),
    [brandById],
  );

  const categoryOptions = useMemo<CatalogLookupOption[]>(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories],
  );

  const brandOptions = useMemo<CatalogLookupOption[]>(
    () => brands.map((brand) => ({ value: brand.id, label: brand.name })),
    [brands],
  );

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    categories,
    brands,
    categoryName,
    brandName,
    categoryOptions,
    brandOptions,
    loading,
    reload,
  };
}
