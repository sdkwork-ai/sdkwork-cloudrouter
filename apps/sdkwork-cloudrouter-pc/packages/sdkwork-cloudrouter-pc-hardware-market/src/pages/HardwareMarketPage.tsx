import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Search, Sparkles, X } from 'lucide-react';

import {
  HARDWARE_MARKET_PAGE_SIZE,
  MARKET_SORT_OPTIONS,
  flattenCategoryNodes,
  isMarketSort,
  type MarketCategoryNode,
  type MarketSort,
} from '../catalog/hardwareMarketCatalog.ts';
import {
  isHardwareMarketAbort,
  loadHardwareMarketCategories,
  loadHardwareMarketProducts,
  type HardwareMarketProductPage,
} from '../services/hardwareMarketService.ts';
import { HardwareMarketCategoryRail } from '../components/HardwareMarketCategoryRail.tsx';
import { HardwareMarketProductCard } from '../components/HardwareMarketProductCard.tsx';
import {
  HardwareMarketEmpty,
  HardwareMarketError,
  HardwareMarketLoading,
} from '../components/HardwareMarketStates.tsx';

function toCount(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * The Smart Hardware Market storefront.
 *
 * The page is the buyer surface of the Product Center: categories, published
 * physical products, and their SKU prices come from the buyer-facing catalog
 * API, and the operator entry link hands merchandising back to the same Product
 * Center admin module. Nothing is cached or re-declared here — an operator's
 * publish is visible on the next load.
 */
export function HardwareMarketPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(() => {
    // Detail breadcrumbs deep-link a category through the query string, so one
    // shared URL can point at a filtered hardware shelf.
    if (typeof window === 'undefined') {
      return null;
    }
    const initial = new URLSearchParams(window.location.search).get('category');
    return initial && initial.trim() ? initial.trim() : null;
  });
  const [sort, setSort] = useState<MarketSort>('newest');
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [categoryTree, setCategoryTree] = useState<MarketCategoryNode[]>([]);
  const [catalog, setCatalog] = useState<HardwareMarketProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadHardwareMarketCategories({ signal: controller.signal })
      .then((tree) => {
        if (!controller.signal.aborted) {
          setCategoryTree(tree);
        }
      })
      .catch((error: unknown) => {
        // A category failure degrades the rail, not the storefront: products
        // remain browsable through the unfiltered grid.
        if (!controller.signal.aborted && !isHardwareMarketAbort(error)) {
          setCategoryTree([]);
        }
      });
    return () => controller.abort();
  }, [reloadVersion]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    loadHardwareMarketProducts(
      { q: searchQuery, categoryId, sort },
      page,
      { signal: controller.signal },
    )
      .then((nextCatalog) => {
        if (!controller.signal.aborted) {
          setCatalog(nextCatalog);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isHardwareMarketAbort(error)) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [categoryId, page, reloadVersion, searchQuery, sort]);

  const categoryNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const node of flattenCategoryNodes(categoryTree)) {
      names.set(node.id, node.name);
    }
    return names;
  }, [categoryTree]);

  const totalItems = toCount(catalog?.pageInfo.totalItems);
  const pageSize = catalog?.pageInfo.pageSize ?? HARDWARE_MARKET_PAGE_SIZE;
  const totalPages = Math.max(1, catalog?.pageInfo.totalPages ?? 1);
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(totalItems, page * pageSize);
  const hasFilters = searchQuery.length > 0 || categoryId !== null;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('hardwareMarket.meta.title', 'Smart Hardware Market');
    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  const changeCategory = (nextCategoryId: string | null) => {
    setCategoryId(nextCategoryId);
    setPage(1);
  };

  const submitSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryId(null);
    setSort('newest');
    setPage(1);
  };

  const retry = () => {
    setReloadVersion((current) => current + 1);
  };

  return (
    <main className="min-h-[calc(100vh-var(--sdkwork-portal-navbar-height,4rem))] bg-slate-50 text-slate-950 dark:bg-[#080808] dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lobster-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-[calc(var(--sdkwork-portal-navbar-height,4rem)+2.5rem)] sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-lobster-500/20 bg-lobster-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lobster-700 dark:text-lobster-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t('hardwareMarket.badge', 'Powered by the Product Center')}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
                {t('hardwareMarket.hero.title', 'Smart Hardware Market')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {t(
                  'hardwareMarket.hero.subtitle',
                  'Devices, sensors, edge gateways, and accessories published from the Cloud Router Product Center.',
                )}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#hardware-market-catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-[#050505]"
                >
                  {t('hardwareMarket.hero.browse', 'Browse the catalog')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  to="/admin/products/list"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-lobster-400 hover:text-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200 dark:hover:border-lobster-500/50 dark:hover:text-white"
                >
                  {t('hardwareMarket.hero.manage', 'Manage in Product Center')}
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('hardwareMarket.hero.stat.products', 'Products on sale')}
                </dt>
                <dd className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {catalog ? totalItems : t('hardwareMarket.common.dash', '—')}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('hardwareMarket.hero.stat.categories', 'Categories')}
                </dt>
                <dd className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {categoryNames.size}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <HardwareMarketCategoryRail
            activeCategoryId={categoryId}
            allLabel={t('hardwareMarket.category.all', 'All hardware')}
            label={t('hardwareMarket.category.label', 'Product categories')}
            onChange={changeCategory}
            tree={categoryTree}
            variant="inline"
          />
        </div>

        <div className="mt-6 grid gap-8 lg:mt-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--sdkwork-portal-navbar-height,4rem)+2rem)]">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('hardwareMarket.category.label', 'Product categories')}
              </h2>
              <HardwareMarketCategoryRail
                activeCategoryId={categoryId}
                allLabel={t('hardwareMarket.category.all', 'All hardware')}
                label={t('hardwareMarket.category.label', 'Product categories')}
                onChange={changeCategory}
                tree={categoryTree}
              />
            </div>
          </aside>

          <section id="hardware-market-catalog" className="min-w-0 scroll-mt-24" aria-live="polite">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <form
                role="search"
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
              >
                <label htmlFor="hardware-market-search" className="sr-only">
                  {t('hardwareMarket.search.label', 'Search smart hardware')}
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="hardware-market-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={t(
                      'hardwareMarket.search.placeholder',
                      'Search by product name, product number, or model',
                    )}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/30 dark:border-white/15 dark:bg-[#101010] dark:text-white"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      aria-label={t('hardwareMarket.search.clear', 'Clear search')}
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-lobster-400 hover:text-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200 dark:hover:text-white"
                >
                  {t('hardwareMarket.search.submit', 'Search')}
                </button>
              </form>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="hardware-market-sort"
                  className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400"
                >
                  {t('hardwareMarket.sort.label', 'Sort by')}
                </label>
                <select
                  id="hardware-market-sort"
                  value={sort}
                  onChange={(event) => {
                    const nextSort = event.target.value;
                    if (isMarketSort(nextSort)) {
                      setSort(nextSort);
                      setPage(1);
                    }
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/30 dark:border-white/15 dark:bg-[#101010] dark:text-white"
                >
                  {MARKET_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.value)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
              {t('hardwareMarket.results', '{{count}} products', { count: totalItems })}
            </div>

            {loading ? <HardwareMarketLoading label={t('hardwareMarket.state.loading', 'Loading the hardware catalog...')} /> : null}

            {!loading && failed ? (
              <HardwareMarketError
                title={t('hardwareMarket.state.error', 'The hardware catalog could not be loaded')}
                hint={t(
                  'hardwareMarket.state.errorHint',
                  'Check your connection and try again.',
                )}
                retryLabel={t('hardwareMarket.state.retry', 'Try again')}
                onRetry={retry}
              />
            ) : null}

            {!loading && !failed && catalog && catalog.items.length === 0 ? (
              hasFilters ? (
                <HardwareMarketEmpty
                  tone="no-results"
                  title={t('hardwareMarket.state.noResults', 'No hardware matches the current filters')}
                  hint={t(
                    'hardwareMarket.state.noResultsHint',
                    'Try another keyword, category, or clear the filters.',
                  )}
                  action={{ label: t('hardwareMarket.search.clear', 'Clear search'), onClick: clearFilters }}
                />
              ) : (
                <HardwareMarketEmpty
                  title={t('hardwareMarket.state.empty', 'No smart hardware has been published yet')}
                  hint={t(
                    'hardwareMarket.state.emptyHint',
                    'Operators publish hardware products in the Product Center, and they appear here immediately.',
                  )}
                  action={{
                    label: t('hardwareMarket.hero.manage', 'Manage in Product Center'),
                    onClick: () => navigate('/admin/products/list'),
                  }}
                />
              )
            ) : null}

            {!loading && !failed && catalog && catalog.items.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {catalog.items.map((summary) => (
                  <HardwareMarketProductCard
                    key={summary.product.id}
                    summary={summary}
                    categoryName={categoryNames.get(summary.product.categoryId) ?? null}
                    locale={locale}
                  />
                ))}
              </div>
            ) : null}

            {!loading && !failed && catalog && catalog.items.length > 0 ? (
              <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row dark:border-white/10">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('hardwareMarket.pagination.showing', 'Showing {{from}}-{{to}} of {{total}}', {
                    from: showingFrom,
                    to: showingTo,
                    total: totalItems,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label={t('hardwareMarket.pagination.previous', 'Previous page')}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {t('hardwareMarket.pagination.previous', 'Previous page')}
                  </button>
                  <span className="px-1 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                    {t('hardwareMarket.pagination.page', 'Page {{page}} of {{total}}', {
                      page,
                      total: totalPages,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={!catalog.pageInfo.hasMore}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label={t('hardwareMarket.pagination.next', 'Next page')}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200"
                  >
                    {t('hardwareMarket.pagination.next', 'Next page')}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
