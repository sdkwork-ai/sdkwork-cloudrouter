import { getCloudRouterAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { OfficialPricingCatalogResponse, PricingCatalogFilters } from '../types/pricing';

export async function fetchOfficialPricingRates(
  filters: PricingCatalogFilters,
  signal?: AbortSignal,
): Promise<OfficialPricingCatalogResponse> {
  return getCloudRouterAppSdkClient().ai.pricing.rates.list(
    {
      category: filters.category,
      q: normalizeOptional(filters.searchQuery),
      vendorCode: normalizeOptional(filters.vendorCode),
      regionCode: normalizeOptional(filters.regionCode),
      meterCode: normalizeOptional(filters.meterCode),
      currencyCode: normalizeOptional(filters.currencyCode),
      page: filters.page,
      pageSize: filters.pageSize,
    },
    { signal },
  );
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
