import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AdminTableShell,
  BottomPagination,
  BusinessStateTableRow,
  ConfirmDialog,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';
import {
  COLLECTION_CAPABILITY_TYPES,
  CollectionService,
  enabledCapabilityCount,
  type AdminCollection,
  type AdminCollectionCategory,
  type CollectionKind,
  type CollectionListParams,
  type CollectionPageInfo,
  type CollectionPublishStatus,
  type CollectionRecordStatus,
  type CollectionStatusUpdateTarget,
} from '../collectionService';
import {
  capabilityTypeLabel,
  collectionCategoryLabel,
  CollectionKindBadge,
  formatDateTime,
  IconButton,
  kindOptions,
  MetricCard,
  publishStatusOptions,
  PublishStatusBadge,
  RecordStatusBadge,
  visibilityLabel,
  recordStatusOptions,
} from '../collectionUi';
import { CollectionEditorDrawer, type CollectionEditorState } from '../components/CollectionEditorDrawer';

interface CollectionFilters {
  search: string;
  collectionKind: CollectionKind | '';
  categoryId: string;
  publishStatus: CollectionPublishStatus | '';
  status: CollectionRecordStatus | '';
  featured: '' | 'true' | 'false';
}

const EMPTY_FILTERS: CollectionFilters = {
  search: '',
  collectionKind: '',
  categoryId: '',
  publishStatus: '',
  status: '',
  featured: '',
};

interface StatusChangeState {
  collection: AdminCollection;
  target: CollectionStatusUpdateTarget;
}

function toListParams(filters: CollectionFilters, page: number, pageSize: number): CollectionListParams {
  return {
    search: filters.search,
    ...(filters.collectionKind ? { collectionKind: filters.collectionKind } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.publishStatus ? { publishStatus: filters.publishStatus } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.featured === '' ? {} : { featured: filters.featured === 'true' }),
    page,
    pageSize,
  };
}

/**
 * Capability collection list and entry point for the collection editor.
 *
 * Metric cards are derived from the current page (the list endpoint reports the
 * matching total through `pageInfo`, not per-status totals), so the cards always
 * describe the rows an operator is looking at.
 */
export function CollectionsAdminPage() {
  const { t, i18n } = useTranslation();
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [pageInfo, setPageInfo] = useState<CollectionPageInfo | null>(null);
  const [categories, setCategories] = useState<AdminCollectionCategory[]>([]);
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editor, setEditor] = useState<CollectionEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCollection | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<StatusChangeState | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busyCollectionId, setBusyCollectionId] = useState<string | null>(null);

  const locale = i18n.language;

  useEffect(() => {
    let active = true;
    void CollectionService.listCollectionCategories({ pageSize: 200 })
      .then((result) => {
        if (active) {
          setCategories(result.items);
        }
      })
      .catch(() => {
        // The category filter degrades to "all categories" when the category
        // read fails; the collection list itself is unaffected.
      });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void CollectionService.listCollections(toListParams(appliedFilters, page, pageSize))
      .then((result) => {
        if (active) {
          setCollections(result.items);
          setPageInfo(result.pageInfo);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(resolveProblemMessage(
            error,
            t,
            t('admin.collections.errors.load', 'Failed to load collections'),
          ));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, page, pageSize, refreshToken, t]);

  const metrics = useMemo(() => {
    const published = collections.filter((collection) => collection.publishStatus === 'published').length;
    const draft = collections.filter((collection) => collection.publishStatus === 'draft').length;
    const mixed = collections.filter((collection) => collection.collectionKind === 'mixed').length;
    const singleKind = collections.length - mixed;
    return {
      total: pageInfo?.totalItems ?? collections.length,
      published,
      draft,
      mixed,
      singleKind,
    };
  }, [collections, pageInfo]);

  const categoryOptions = useMemo(() => {
    const selectedKind = appliedFilters.collectionKind;
    const visible = selectedKind === ''
      ? categories
      : categories.filter((category) => category.collectionKind === selectedKind);
    return [
      { value: '', label: t('admin.collections.filters.categoryAll', 'All categories') },
      ...visible.map((category) => ({ value: category.id, label: collectionCategoryLabel(t, category) })),
    ];
  }, [appliedFilters.collectionKind, categories, t]);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const applyFilters = (next: CollectionFilters) => {
    setAppliedFilters(next);
    setPage(1);
    setActionNotice(null);
    setRefreshToken((value) => value + 1);
  };

  const refresh = () => setRefreshToken((value) => value + 1);

  // A delete or a filter change can leave the current page past the end; step
  // back so the operator never stares at an empty page with a "Next" button.
  useEffect(() => {
    if (loading || !pageInfo) {
      return;
    }
    const totalPages = pageInfo.totalPages;
    if (totalPages !== null && page > Math.max(1, totalPages)) {
      setPage(Math.max(1, totalPages));
      return;
    }
    if (totalPages === null && collections.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [collections.length, loading, page, pageInfo]);

  const notify = (message: string) => {
    setActionNotice(message);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyCollectionId(deleteTarget.id);
    setDeleteError(null);
    try {
      await CollectionService.deleteCollection(deleteTarget.id);
      notify(t('admin.collections.notices.deleted', 'Collection deleted.'));
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      setDeleteError(resolveProblemMessage(
        error,
        t,
        t('admin.collections.errors.delete', 'Failed to delete the collection'),
      ));
    } finally {
      setBusyCollectionId(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusChange) {
      return;
    }
    setBusyCollectionId(statusChange.collection.id);
    setStatusError(null);
    try {
      await CollectionService.updateCollectionStatus(statusChange.collection.id, {
        publishStatus: statusChange.target,
        notes: statusNotes,
      });
      notify(statusChange.target === 'published'
        ? t('admin.collections.notices.published', 'Collection published.')
        : t('admin.collections.notices.archived', 'Collection archived.'));
      setStatusChange(null);
      setStatusNotes('');
      refresh();
    } catch (error) {
      setStatusError(resolveProblemMessage(
        error,
        t,
        t('admin.collections.errors.status', 'Failed to update the collection status'),
      ));
    } finally {
      setBusyCollectionId(null);
    }
  };

  const hasNextPage = pageInfo?.hasNextPage ?? collections.length >= pageSize;
  const totalItems = pageInfo?.totalItems ?? undefined;
  const statusEnabledCount = statusChange ? enabledCapabilityCount(statusChange.collection) : 0;
  const statusPublishBlocked = statusChange?.target === 'published'
    && (statusEnabledCount === 0 || statusChange.collection.status !== 'enabled');

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t('admin.collections.metrics.total', 'Collections')}
          value={metrics.total}
          tone="text-slate-700 dark:text-slate-100"
          hint={t('admin.collections.metrics.totalHint', 'All collections matching the current filters.')}
        />
        <MetricCard
          label={t('admin.collections.metrics.publishedPage', 'Published (page)')}
          value={metrics.published}
          tone="text-emerald-600 dark:text-emerald-300"
          hint={t('admin.collections.metrics.pageHint', 'Counted on the current page.')}
        />
        <MetricCard
          label={t('admin.collections.metrics.draftPage', 'Draft (page)')}
          value={metrics.draft}
          tone="text-amber-600 dark:text-amber-300"
          hint={t('admin.collections.metrics.pageHint', 'Counted on the current page.')}
        />
        <MetricCard
          label={t('admin.collections.metrics.kindSplit', 'Mixed / single-kind')}
          value={`${metrics.mixed} / ${metrics.singleKind}`}
          tone="text-blue-600 dark:text-blue-300"
          hint={t('admin.collections.metrics.pageHint', 'Counted on the current page.')}
        />
      </div>

      {actionNotice ? (
        <div
          role="status"
          data-admin-collection-action-notice
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <span className="flex min-w-0 items-center gap-2 break-words">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {actionNotice}
          </span>
          <button
            type="button"
            aria-label={t('common.actions.dismiss', 'Dismiss')}
            onClick={() => setActionNotice(null)}
            className="shrink-0 rounded p-0.5 text-emerald-600 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <AdminTableShell
        data-admin-collection-table
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={(
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  data-admin-collection-search
                  maxLength={256}
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      applyFilters(filters);
                    }
                  }}
                  placeholder={t('admin.collections.search.placeholder', 'Search name, key, tag or summary')}
                  aria-label={t('admin.collections.search.placeholder', 'Search name, key, tag or summary')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
                {filters.search ? (
                  <button
                    type="button"
                    aria-label={t('admin.collections.actions.clearSearch', 'Clear search')}
                    onClick={() => {
                      const next = { ...filters, search: '' };
                      setFilters(next);
                      applyFilters(next);
                    }}
                    className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <select
                data-admin-collection-kind-filter
                aria-label={t('admin.collections.filters.kind', 'Collection kind')}
                value={filters.collectionKind}
                onChange={(event) => {
                  const next = {
                    ...filters,
                    collectionKind: event.target.value as CollectionKind | '',
                    categoryId: '',
                  };
                  setFilters(next);
                  applyFilters(next);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                <option value="">{t('admin.collections.filters.kindAll', 'All kinds')}</option>
                {kindOptions(t).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                data-admin-collection-category-filter
                aria-label={t('admin.collections.filters.category', 'Category')}
                value={filters.categoryId}
                onChange={(event) => {
                  const next = { ...filters, categoryId: event.target.value };
                  setFilters(next);
                  applyFilters(next);
                }}
                className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                data-admin-collection-publish-status-filter
                aria-label={t('admin.collections.filters.publishStatus', 'Publish status')}
                value={filters.publishStatus}
                onChange={(event) => {
                  const next = { ...filters, publishStatus: event.target.value as CollectionPublishStatus | '' };
                  setFilters(next);
                  applyFilters(next);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                <option value="">{t('admin.collections.filters.publishStatusAll', 'All publish statuses')}</option>
                {publishStatusOptions(t).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                data-admin-collection-status-filter
                aria-label={t('admin.collections.filters.status', 'Status')}
                value={filters.status}
                onChange={(event) => {
                  const next = { ...filters, status: event.target.value as CollectionRecordStatus | '' };
                  setFilters(next);
                  applyFilters(next);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                <option value="">{t('admin.collections.filters.statusAll', 'All statuses')}</option>
                {recordStatusOptions(t).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                data-admin-collection-featured-filter
                aria-label={t('admin.collections.filters.featured', 'Featured')}
                value={filters.featured}
                onChange={(event) => {
                  const next = { ...filters, featured: event.target.value as CollectionFilters['featured'] };
                  setFilters(next);
                  applyFilters(next);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                <option value="">{t('admin.collections.filters.featuredAll', 'All collections')}</option>
                <option value="true">{t('admin.collections.filters.featuredOnly', 'Featured only')}</option>
                <option value="false">{t('admin.collections.filters.notFeatured', 'Not featured')}</option>
              </select>
              {hasActiveFilters ? (
                <button
                  type="button"
                  data-admin-collection-reset-filters
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    applyFilters(EMPTY_FILTERS);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  {t('admin.collections.actions.resetFilters', 'Reset filters')}
                </button>
              ) : null}
              <button
                type="button"
                data-admin-collection-search-submit
                onClick={() => applyFilters(filters)}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Search className="h-4 w-4" />
                {t('admin.collections.filters.apply', 'Search')}
              </button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('admin.collections.actions.refresh', 'Refresh')}
              </button>
            </div>
            <button
              type="button"
              data-admin-collection-create
              onClick={() => setEditor({ mode: 'create' })}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lobster-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lobster-600"
            >
              <Plus className="h-4 w-4" />
              {t('admin.collections.actions.create', 'New collection')}
            </button>
          </div>
        )}
        viewportClassName="min-h-0 flex-1 relative"
        footer={(
          <BottomPagination
            page={page}
            pageSize={pageSize}
            itemCount={collections.length}
            hasNextPage={hasNextPage}
            totalItems={totalItems}
            totalLabel={t('admin.collections.pagination.total', 'Total')}
            showingLabel={t('admin.collections.pagination.showing', 'Showing')}
            pageLabel={`${t('admin.collections.pagination.page', 'Page')} ${page}`}
            pageSizeLabel={t('admin.collections.pagination.pageSize', 'Per page')}
            previousLabel={t('admin.collections.pagination.previous', 'Previous page')}
            nextLabel={t('admin.collections.pagination.next', 'Next page')}
            ariaLabel={t('admin.collections.pagination.label', 'Pagination')}
            disabled={loading}
            nowrap
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setPage((current) => current + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        )}
      >
        <table
          aria-label={t('admin.collections.tableLabel', 'Collections')}
          className="min-w-[1240px] w-full whitespace-nowrap text-left text-sm"
        >
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.collection', 'Collection')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.kind', 'Kind')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.capabilities', 'Enabled capabilities')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.category', 'Category')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.publishStatus', 'Publish status')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.itemCount', 'Items')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.updatedAt', 'Updated')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('admin.collections.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {loading ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="loading"
                title={t('admin.collections.states.loading', 'Loading collections...')}
              />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="error"
                title={t('admin.collections.states.error', 'Collections could not be loaded')}
                description={loadError}
                onRetry={refresh}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : collections.length === 0 ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="empty"
                title={hasActiveFilters
                  ? t('admin.collections.states.emptyFiltered', 'No collections match the current filters')
                  : t('admin.collections.states.empty', 'No collections found')}
                description={hasActiveFilters
                  ? t('admin.collections.states.emptyFilteredDesc', 'Adjust or reset the filters to see more collections.')
                  : t('admin.collections.states.emptyDesc', 'Create the first collection for this workspace.')}
                action={hasActiveFilters
                  ? {
                    label: t('admin.collections.actions.resetFilters', 'Reset filters'),
                    onClick: () => {
                      setFilters(EMPTY_FILTERS);
                      applyFilters(EMPTY_FILTERS);
                    },
                  }
                  : { label: t('admin.collections.actions.create', 'New collection'), onClick: () => setEditor({ mode: 'create' }) }}
              />
            ) : collections.map((collection) => (
              <tr
                key={collection.id}
                data-admin-collection-row
                data-collection-id={collection.id}
                className="transition hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <td className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
                      <Layers3 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-slate-900 dark:text-white">{collection.name}</span>
                        {collection.featured ? (
                          <Star
                            className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                            aria-label={t('admin.collections.labels.featured', 'Featured')}
                          />
                        ) : null}
                      </div>
                      <div className="mt-0.5 max-w-[260px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {collection.collectionKey}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><CollectionKindBadge kind={collection.collectionKind} /></td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLLECTION_CAPABILITY_TYPES
                      .map((type) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        >
                          {capabilityTypeLabel(t, type)}
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                            {collection.capabilityCounts[type]}
                          </span>
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {(() => {
                    const category = categories.find((entry) => entry.id === collection.categoryId);
                    return category ? collectionCategoryLabel(t, category) : (collection.categoryName ?? '-');
                  })()}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PublishStatusBadge status={collection.publishStatus} />
                      {collection.status === 'disabled' ? (
                        <RecordStatusBadge status="disabled" />
                      ) : null}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {visibilityLabel(t, collection.visibility)}
                      </span>
                    </div>
                    {collection.latestReleaseNo !== null ? (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('admin.collections.releases.latest', 'Latest release')} #{collection.latestReleaseNo}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{collection.itemCount}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                  {formatDateTime(collection.updatedAt, locale)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      data-admin-collection-edit
                      onClick={() => setEditor({ mode: 'edit', collection })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-lobster-200 hover:bg-lobster-50 hover:text-lobster-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lobster-500/30 dark:hover:bg-lobster-500/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('admin.collections.actions.edit', 'Edit')}
                    </button>
                    <IconButton
                      label={collection.publishStatus === 'published'
                        ? t('admin.collections.actions.archive', 'Archive')
                        : t('admin.collections.actions.publish', 'Publish')}
                      disabled={busyCollectionId === collection.id}
                      onClick={() => {
                        setStatusNotes('');
                        setStatusError(null);
                        setStatusChange({
                          collection,
                          target: collection.publishStatus === 'published' ? 'archived' : 'published',
                        });
                      }}
                    >
                      {collection.publishStatus === 'published'
                        ? <Archive className="h-4 w-4" />
                        : <UploadCloud className="h-4 w-4" />}
                    </IconButton>
                    <IconButton
                      label={t('admin.collections.actions.delete', 'Delete')}
                      tone="danger"
                      disabled={busyCollectionId === collection.id}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(collection);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {editor ? (
        <CollectionEditorDrawer
          state={editor}
          categories={categories}
          onClose={() => {
            setEditor(null);
            // A save may have applied one of two writes before failing; refresh
            // so the list never keeps a stale view of the collection.
            refresh();
          }}
          onSaved={(_saved, options) => {
            notify(options?.resetToDraft
              ? t(
                'admin.collections.notices.savedAsDraft',
                'Collection saved as draft. Publish it again to update the active release.',
              )
              : t('admin.collections.notices.saved', 'Collection saved.'));
            setEditor(null);
            refresh();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.collections.delete.title', 'Delete collection')}
          description={t(
            'admin.collections.delete.description',
            'The collection is soft-deleted and its key becomes reusable. Its release history is retained but no longer shown.',
          )}
          confirmLabel={t('admin.collections.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          busyLabel={t('common.actions.deleting', 'Deleting...')}
          isBusy={busyCollectionId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => { void confirmDelete(); }}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        >
          {deleteError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {deleteError}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}

      {statusChange ? (
        <ConfirmDialog
          title={statusChange.target === 'published'
            ? t('admin.collections.status.titlePublish', 'Publish collection')
            : t('admin.collections.status.titleArchive', 'Archive collection')}
          description={statusChange.target === 'published'
            ? t(
              'admin.collections.status.descriptionPublish',
              'Publishing snapshots the current enabled capabilities into an immutable release. Editing the collection afterwards returns it to draft and requires publishing again.',
            )
            : t(
              'admin.collections.status.descriptionArchive',
              'Archiving removes the published release from the active catalog while keeping its history.',
            )}
          confirmLabel={statusChange.target === 'published'
            ? t('admin.collections.actions.publish', 'Publish')
            : t('admin.collections.actions.archive', 'Archive')}
          confirmDisabled={statusPublishBlocked}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          busyLabel={statusChange.target === 'published'
            ? t('admin.collections.status.publishing', 'Publishing...')
            : t('admin.collections.status.archiving', 'Archiving...')}
          isBusy={busyCollectionId === statusChange.collection.id}
          icon={statusChange.target === 'published'
            ? <UploadCloud className="h-4 w-4" />
            : <Archive className="h-4 w-4" />}
          onConfirm={() => { void confirmStatusChange(); }}
          onCancel={() => {
            setStatusChange(null);
            setStatusNotes('');
            setStatusError(null);
          }}
        >
          {statusChange.target === 'published' ? (
            statusChange.collection.status !== 'enabled' ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {t(
                  'admin.collections.status.disabledBlocked',
                  'This collection is disabled. Enable it before publishing.',
                )}
              </p>
            ) : statusEnabledCount === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {t(
                  'admin.collections.status.requiresEnabledItems',
                  'Enable at least one capability before publishing. Disabled items are not published.',
                )}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  {t('admin.collections.status.publishSummary', {
                    enabled: statusEnabledCount,
                    total: statusChange.collection.itemCount,
                    defaultValue: 'Publishing {{enabled}} enabled capabilities ({{total}} items) as release #{{release}}.',
                    release: (statusChange.collection.latestReleaseNo ?? 0) + 1,
                  })}
                </p>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.collections.status.notes', 'Release notes')}
                  </span>
                  <textarea
                    value={statusNotes}
                    rows={3}
                    maxLength={1024}
                    onChange={(event) => setStatusNotes(event.target.value)}
                    placeholder={t('admin.collections.status.notesPlaceholder', 'Optional notes for this release')}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                  />
                </label>
              </div>
            )
          ) : null}
          {statusError ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              {statusError}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

