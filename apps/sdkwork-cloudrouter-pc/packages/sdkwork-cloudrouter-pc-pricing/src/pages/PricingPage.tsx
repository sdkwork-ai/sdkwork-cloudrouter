import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PricingCategoryNav } from '../components/PricingCategoryNav';
import { PricingFilters } from '../components/PricingFilters';
import { PricingPagination, PricingRateTable } from '../components/PricingRateTable';
import { PricingEmptyState, PricingErrorState, PricingLoadingState } from '../components/PricingState';
import { fetchOfficialPricingRates } from '../services/pricingService';
import type { OfficialPricingCatalogResponse, PricingCategoryCode } from '../types/pricing';

const DEFAULT_PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MILLIS = 300;

export function PricingPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<PricingCategoryCode>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [meterCode, setMeterCode] = useState('');
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [catalog, setCatalog] = useState<OfficialPricingCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MILLIS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetchOfficialPricingRates(
      {
        category,
        searchQuery,
        vendorCode,
        regionCode,
        meterCode,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      },
      controller.signal,
    )
      .then((nextCatalog) => {
        if (!controller.signal.aborted) setCatalog(nextCatalog);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, meterCode, page, regionCode, reloadVersion, searchQuery, vendorCode]);

  const categoryCounts = useMemo(
    () => new Map((catalog?.groups ?? []).map((group) => [group.code, group.count])),
    [catalog?.groups],
  );
  const totalItems = catalog?.pageInfo.totalItems ?? '0';
  const changeCategory = (nextCategory: PricingCategoryCode) => {
    setCategory(nextCategory);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setVendorCode('');
    setRegionCode('');
    setMeterCode('');
    setPage(1);
  };
  const updateFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <main className="min-h-[calc(100vh-var(--sdkwork-portal-navbar-height,4rem))] bg-slate-50 text-slate-950 dark:bg-[#080808] dark:text-white">
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d0d0d]">
        <div className="mx-auto w-full px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{t('pricing.title')}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('pricing.subtitle')}</p>
            </div>
            <div className="text-sm font-medium tabular-nums text-slate-500 dark:text-slate-400">
              {t('pricing.results', { count: totalItems })}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <PricingCategoryNav activeCategory={category} counts={categoryCounts} onChange={changeCategory} />
        <section className="min-w-0 flex-1" aria-live="polite">
          <div className="mb-5 lg:hidden">
            <PricingCategoryNav mobile activeCategory={category} counts={categoryCounts} onChange={changeCategory} />
          </div>
          <PricingFilters
            searchQuery={searchInput}
            vendorCode={vendorCode}
            regionCode={regionCode}
            meterCode={meterCode}
            vendors={catalog?.vendors ?? []}
            regions={catalog?.regions ?? []}
            meters={catalog?.meters ?? []}
            onSearchChange={setSearchInput}
            onVendorChange={updateFilter(setVendorCode)}
            onRegionChange={updateFilter(setRegionCode)}
            onMeterChange={updateFilter(setMeterCode)}
            onClear={clearFilters}
          />

          <div className="mt-5">
            {loading ? <PricingLoadingState /> : null}
            {!loading && failed ? <PricingErrorState onRetry={() => setReloadVersion((version) => version + 1)} /> : null}
            {!loading && !failed && catalog?.items.length === 0 ? <PricingEmptyState /> : null}
            {!loading && !failed && catalog && catalog.items.length > 0 ? (
              <>
                <PricingRateTable items={catalog.items} />
                <PricingPagination
                  page={catalog.pageInfo.page ?? page}
                  totalPages={catalog.pageInfo.totalPages}
                  hasMore={catalog.pageInfo.hasMore ?? false}
                  onPageChange={setPage}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
