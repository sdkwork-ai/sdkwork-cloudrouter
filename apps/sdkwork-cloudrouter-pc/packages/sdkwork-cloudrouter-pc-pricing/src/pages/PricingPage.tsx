import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, X } from 'lucide-react';
import { PricingCategoryNav } from '../components/PricingCategoryNav';
import { PricingCompareDrawer } from '../components/PricingCompareDrawer';
import { PricingFilters } from '../components/PricingFilters';
import { PricingPagination, PricingRateTable } from '../components/PricingRateTable';
import { PricingEmptyState, PricingErrorState, PricingLoadingState } from '../components/PricingState';
import { fetchOfficialPricingRates } from '../services/pricingService';
import { compareKeyOf, rateCategory } from '../types/compare';
import type { OfficialPricingCatalogResponse, OfficialPricingRate, PricingCategoryCode } from '../types/pricing';

const DEFAULT_PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MILLIS = 300;
const MISMATCH_HINT_MILLIS = 4000;

export function PricingPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<PricingCategoryCode>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [meterCode, setMeterCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [catalog, setCatalog] = useState<OfficialPricingCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedRates, setSelectedRates] = useState<OfficialPricingRate[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mismatchHint, setMismatchHint] = useState<string | null>(null);
  const mismatchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (mismatchTimerRef.current !== null) window.clearTimeout(mismatchTimerRef.current);
    };
  }, []);

  const showMismatchHint = (categoryCode: PricingCategoryCode) => {
    setMismatchHint(t('pricing.compare.mismatch', { category: t(`pricing.category.${categoryCode}`) }));
    if (mismatchTimerRef.current !== null) window.clearTimeout(mismatchTimerRef.current);
    mismatchTimerRef.current = window.setTimeout(() => setMismatchHint(null), MISMATCH_HINT_MILLIS);
  };

  const selectedKeys = useMemo(() => new Set(selectedRates.map(compareKeyOf)), [selectedRates]);
  const selectionCategory = selectedRates.length > 0 ? rateCategory(selectedRates[0]) : null;

  const toggleSelection = (rate: OfficialPricingRate) => {
    const key = compareKeyOf(rate);
    if (selectedKeys.has(key)) {
      setSelectedRates((current) => current.filter((selected) => compareKeyOf(selected) !== key));
      return;
    }
    const nextCategory = rateCategory(rate);
    if (selectionCategory !== null && selectionCategory !== nextCategory) {
      showMismatchHint(selectionCategory);
      return;
    }
    setSelectedRates((current) => [...current, rate]);
  };

  const clearSelection = () => {
    setSelectedRates([]);
    setCompareOpen(false);
  };

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
        currencyCode,
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
  }, [category, currencyCode, meterCode, page, regionCode, reloadVersion, searchQuery, vendorCode]);

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
    setCurrencyCode('');
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
            currencyCode={currencyCode}
            vendors={catalog?.vendors ?? []}
            regions={catalog?.regions ?? []}
            meters={catalog?.meters ?? []}
            currencies={catalog?.currencies ?? []}
            onSearchChange={setSearchInput}
            onVendorChange={updateFilter(setVendorCode)}
            onRegionChange={updateFilter(setRegionCode)}
            onMeterChange={updateFilter(setMeterCode)}
            onCurrencyChange={updateFilter(setCurrencyCode)}
            onClear={clearFilters}
          />

          {selectedRates.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-lobster-500/30 bg-lobster-500/[0.04] px-4 py-3 dark:border-lobster-500/25 dark:bg-lobster-500/[0.06]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-lobster-500/10 text-lobster-500">
                  <Scale className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {t('pricing.compare.selected', { count: selectedRates.length })}
                    {selectionCategory ? (
                      <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                        {t(`pricing.category.${selectionCategory}`)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{t('pricing.compare.selectHint')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {mismatchHint ? (
                  <span className="max-w-56 truncate rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" role="status">
                    {mismatchHint}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t('pricing.compare.clear')}
                </button>
                <button
                  type="button"
                  onClick={() => setCompareOpen(true)}
                  disabled={selectedRates.length < 2}
                  title={selectedRates.length < 2 ? t('pricing.compare.selectMore') : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-lobster-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500/50"
                >
                  <Scale className="h-4 w-4" aria-hidden="true" />
                  {t('pricing.compare.start')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            {loading ? <PricingLoadingState /> : null}
            {!loading && failed ? <PricingErrorState onRetry={() => setReloadVersion((version) => version + 1)} /> : null}
            {!loading && !failed && catalog?.items.length === 0 ? <PricingEmptyState /> : null}
            {!loading && !failed && catalog && catalog.items.length > 0 ? (
              <>
                <PricingRateTable
                  items={catalog.items}
                  selectedKeys={selectedKeys}
                  onToggleSelection={toggleSelection}
                />
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

      <PricingCompareDrawer
        open={compareOpen}
        selections={selectedRates}
        defaultRegion={regionCode}
        onRemove={(key) => setSelectedRates((current) => current.filter((selected) => compareKeyOf(selected) !== key))}
        onClear={clearSelection}
        onClose={() => setCompareOpen(false)}
      />
    </main>
  );
}
