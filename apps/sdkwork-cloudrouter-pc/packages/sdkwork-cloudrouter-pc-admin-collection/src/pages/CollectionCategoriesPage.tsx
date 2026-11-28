import { useEffect, useId, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderTree,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  COLLECTION_CATEGORY_CODE_PATTERN,
  CollectionService,
  type AdminCollectionCategory,
  type CollectionCategoryInput,
  type CollectionCategoryListParams,
  type CollectionKind,
  type CollectionPageInfo,
  type CollectionRecordStatus,
} from '../collectionService';
import {
  collectionCategoryLabel,
  CollectionKindBadge,
  formatDateTime,
  IconButton,
  kindOptions,
  MetricCard,
  RecordStatusBadge,
  recordStatusOptions,
  SelectField,
  TextAreaField,
  TextField,
} from '../collectionUi';

interface CategoryFilters {
  search: string;
  collectionKind: CollectionKind | '';
  status: CollectionRecordStatus | '';
}

const EMPTY_FILTERS: CategoryFilters = {
  search: '',
  collectionKind: '',
  status: '',
};

type CategoryDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; category: AdminCollectionCategory };

interface CategoryFormFields {
  collectionKind: CollectionKind;
  categoryCode: string;
  name: string;
  description: string;
  iconRef: string;
  sortOrder: string;
  status: CollectionRecordStatus;
}

function toListParams(filters: CategoryFilters, page: number, pageSize: number): CollectionCategoryListParams {
  return {
    search: filters.search,
    ...(filters.collectionKind ? { collectionKind: filters.collectionKind } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    page,
    pageSize,
  };
}

function parseSortOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^[0-9]+$/u.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647 ? parsed : null;
}

/**
 * Collection category management.
 *
 * The parent category is intentionally not exposed: the console keeps the
 * collection taxonomy flat, but an existing `parentId` is preserved verbatim on
 * edit so a backend-authored hierarchy is never flattened by the UI.
 */
export function CollectionCategoriesAdminPage() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<AdminCollectionCategory[]>([]);
  const [pageInfo, setPageInfo] = useState<CollectionPageInfo | null>(null);
  const [filters, setFilters] = useState<CategoryFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CategoryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [initializeError, setInitializeError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCollectionCategory | null>(null);
  const [initializeOpen, setInitializeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const locale = i18n.language;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void CollectionService.listCollectionCategories(toListParams(appliedFilters, page, pageSize))
      .then((result) => {
        if (active) {
          setCategories(result.items);
          setPageInfo(result.pageInfo);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(resolveProblemMessage(
            error,
            t,
            t('admin.collections.categories.errors.load', 'Failed to load collection categories'),
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

  const metrics = (() => {
    const system = categories.filter((category) => category.isSystem).length;
    const enabled = categories.filter((category) => category.status === 'enabled').length;
    const collectionTotal = categories.reduce((sum, category) => {
      const count = Number(category.collectionCount);
      return Number.isSafeInteger(count) ? sum + count : sum;
    }, 0);
    return {
      total: pageInfo?.totalItems ?? categories.length,
      system,
      enabled,
      collections: collectionTotal,
    };
  })();

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const applyFilters = (next: CategoryFilters) => {
    setAppliedFilters(next);
    setPage(1);
    setActionNotice(null);
    setRefreshToken((value) => value + 1);
  };

  const refresh = () => setRefreshToken((value) => value + 1);

  useEffect(() => {
    if (loading || !pageInfo) {
      return;
    }
    const totalPages = pageInfo.totalPages;
    if (totalPages !== null && page > Math.max(1, totalPages)) {
      setPage(Math.max(1, totalPages));
      return;
    }
    if (totalPages === null && categories.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [categories.length, loading, page, pageInfo]);

  const notify = (message: string) => {
    setActionNotice(message);
  };

  const submitDialog = async (input: CollectionCategoryInput) => {
    if (!dialog) {
      return;
    }
    if (dialog.mode === 'create') {
      await CollectionService.createCollectionCategory(input);
      notify(t('admin.collections.categories.notices.created', 'Category created.'));
    } else {
      const { category } = dialog;
      await CollectionService.updateCollectionCategory(category.id, {
        ...input,
        // Preserve an existing backend-authored parent; never send it as null.
        ...(category.parentId ? { parentId: category.parentId } : {}),
      });
      notify(t('admin.collections.categories.notices.updated', 'Category updated.'));
    }
    setDialog(null);
    refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusy(true);
    setDeleteError(null);
    try {
      await CollectionService.deleteCollectionCategory(deleteTarget.id);
      notify(t('admin.collections.categories.notices.deleted', 'Category deleted.'));
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      setDeleteError(resolveProblemMessage(
        error,
        t,
        t('admin.collections.categories.errors.delete', 'Failed to delete the category'),
      ));
    } finally {
      setBusy(false);
    }
  };

  const confirmInitialize = async () => {
    setBusy(true);
    setInitializeError(null);
    try {
      await CollectionService.initializeCollectionCategories();
      notify(t(
        'admin.collections.categories.notices.initialized',
        'Standard categories are available. Existing categories were left unchanged.',
      ));
      setInitializeOpen(false);
      refresh();
    } catch (error) {
      setInitializeError(resolveProblemMessage(
        error,
        t,
        t('admin.collections.categories.errors.initialize', 'Failed to initialize the standard categories'),
      ));
    } finally {
      setBusy(false);
    }
  };

  const hasNextPage = pageInfo?.hasNextPage ?? categories.length >= pageSize;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t('admin.collections.categories.metrics.total', 'Categories')}
          value={metrics.total}
          tone="text-slate-700 dark:text-slate-100"
          hint={t('admin.collections.categories.metrics.totalHint', 'All categories matching the current filters.')}
        />
        <MetricCard
          label={t('admin.collections.categories.metrics.systemPage', 'System (page)')}
          value={metrics.system}
          tone="text-lobster-600 dark:text-lobster-300"
          hint={t('admin.collections.metrics.pageHint', 'Counted on the current page.')}
        />
        <MetricCard
          label={t('admin.collections.categories.metrics.enabledPage', 'Enabled (page)')}
          value={metrics.enabled}
          tone="text-emerald-600 dark:text-emerald-300"
          hint={t('admin.collections.metrics.pageHint', 'Counted on the current page.')}
        />
        <MetricCard
          label={t('admin.collections.categories.metrics.collectionsPage', 'Filed (page)')}
          value={metrics.collections}
          tone="text-blue-600 dark:text-blue-300"
          hint={t('admin.collections.categories.metrics.collectionsHint', 'Collections filed under the categories on this page.')}
        />
      </div>

      {actionNotice ? (
        <div
          role="status"
          data-admin-category-action-notice
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
        data-admin-category-table
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={(
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  data-admin-category-search
                  maxLength={256}
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      applyFilters(filters);
                    }
                  }}
                  placeholder={t('admin.collections.categories.search.placeholder', 'Search name or code')}
                  aria-label={t('admin.collections.categories.search.placeholder', 'Search name or code')}
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
                data-admin-category-kind-filter
                aria-label={t('admin.collections.filters.kind', 'Collection kind')}
                value={filters.collectionKind}
                onChange={(event) => {
                  const next = { ...filters, collectionKind: event.target.value as CollectionKind | '' };
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
                data-admin-category-status-filter
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
              {hasActiveFilters ? (
                <button
                  type="button"
                  data-admin-category-reset-filters
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
                data-admin-category-search-submit
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-admin-category-initialize
                onClick={() => {
                        setInitializeError(null);
                        setInitializeOpen(true);
                      }}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <Sparkles className="h-4 w-4 text-lobster-500" />
                {t('admin.collections.categories.actions.initialize', 'Initialize standard categories')}
              </button>
              <button
                type="button"
                data-admin-category-create
                onClick={() => setDialog({ mode: 'create' })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lobster-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lobster-600"
              >
                <Plus className="h-4 w-4" />
                {t('admin.collections.categories.actions.create', 'New category')}
              </button>
            </div>
          </div>
        )}
        viewportClassName="min-h-0 flex-1 relative"
        footer={(
          <BottomPagination
            page={page}
            pageSize={pageSize}
            itemCount={categories.length}
            hasNextPage={hasNextPage}
            totalItems={pageInfo?.totalItems ?? undefined}
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
          aria-label={t('admin.collections.categories.tableLabel', 'Collection categories')}
          className="min-w-[1080px] w-full whitespace-nowrap text-left text-sm"
        >
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">{t('admin.collections.categories.columns.category', 'Category')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.kind', 'Kind')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.categories.columns.system', 'Source')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.categories.columns.collectionCount', 'Collections')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.categories.columns.sortOrder', 'Sort order')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.status', 'Status')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.collections.columns.updatedAt', 'Updated')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('admin.collections.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {loading ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="loading"
                title={t('admin.collections.categories.states.loading', 'Loading collection categories...')}
              />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="error"
                title={t('admin.collections.categories.states.error', 'Collection categories could not be loaded')}
                description={loadError}
                onRetry={refresh}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : categories.length === 0 ? (
              <BusinessStateTableRow
                colSpan={8}
                kind="empty"
                title={hasActiveFilters
                  ? t('admin.collections.categories.states.emptyFiltered', 'No categories match the current filters')
                  : t('admin.collections.categories.states.empty', 'No collection categories found')}
                description={hasActiveFilters
                  ? t(
                    'admin.collections.categories.states.emptyFilteredDesc',
                    'Adjust or reset the filters to see more categories.',
                  )
                  : t(
                    'admin.collections.categories.states.emptyDesc',
                    'Create a category or initialize the standard category set.',
                  )}
                action={hasActiveFilters
                  ? {
                    label: t('admin.collections.actions.resetFilters', 'Reset filters'),
                    onClick: () => {
                      setFilters(EMPTY_FILTERS);
                      applyFilters(EMPTY_FILTERS);
                    },
                  }
                  : {
                    label: t('admin.collections.categories.actions.create', 'New category'),
                    onClick: () => setDialog({ mode: 'create' }),
                  }}
              />
            ) : categories.map((category) => (
              <tr
                key={category.id}
                data-admin-category-row
                data-category-code={category.categoryCode}
                className="transition hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <td className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
                      <FolderTree className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-white">{collectionCategoryLabel(t, category)}</div>
                      <div className="mt-0.5 max-w-[260px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {category.categoryCode}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><CollectionKindBadge kind={category.collectionKind} /></td>
                <td className="px-5 py-3">
                  {category.isSystem ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lobster-50 px-2.5 py-1 text-xs font-semibold text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('admin.collections.categories.systemLabel', 'System')}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {t('admin.collections.categories.customLabel', 'Custom')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{category.collectionCount}</td>
                <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{category.sortOrder}</td>
                <td className="px-5 py-3"><RecordStatusBadge status={category.status} /></td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(category.updatedAt, locale)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {category.isSystem ? (
                      <span
                        title={t(
                          'admin.collections.categories.systemLocked',
                          'System categories cannot be edited or deleted.',
                        )}
                        className="text-xs text-slate-400 dark:text-slate-500"
                      >
                        {t('admin.collections.categories.systemLockedShort', 'Read-only')}
                      </span>
                    ) : (
                      <>
                        <IconButton
                          label={t('admin.collections.actions.edit', 'Edit')}
                          disabled={busy}
                          onClick={() => setDialog({ mode: 'edit', category })}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={t('admin.collections.actions.delete', 'Delete')}
                          tone="danger"
                          disabled={busy}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(category);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {dialog ? (
        <CategoryDialog
          state={dialog}
          onCancel={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.collections.categories.delete.title', 'Delete collection category')}
          description={t(
            'admin.collections.categories.delete.description',
            'Categories that still contain collections cannot be deleted. Move or delete those collections first.',
          )}
          confirmLabel={t('admin.collections.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          busyLabel={t('common.actions.deleting', 'Deleting...')}
          isBusy={busy}
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

      {initializeOpen ? (
        <ConfirmDialog
          title={t('admin.collections.categories.initialize.title', 'Initialize standard categories')}
          description={t(
            'admin.collections.categories.initialize.description',
            'The built-in category set is created when it is missing. Existing categories are never modified.',
          )}
          confirmLabel={t('admin.collections.categories.actions.initialize', 'Initialize standard categories')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          busyLabel={t('admin.collections.categories.initialize.busy', 'Initializing...')}
          isBusy={busy}
          icon={<Sparkles className="h-4 w-4" />}
          onConfirm={() => { void confirmInitialize(); }}
          onCancel={() => {
            setInitializeOpen(false);
            setInitializeError(null);
          }}
        >
          {initializeError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {initializeError}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function CategoryDialog({
  state,
  onCancel,
  onSubmit,
}: {
  state: CategoryDialogState;
  onCancel: () => void;
  onSubmit: (input: CollectionCategoryInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const creating = state.mode === 'create';
  const [fields, setFields] = useState<CategoryFormFields>(() => (state.mode === 'create'
    ? {
      collectionKind: 'mixed',
      categoryCode: '',
      name: '',
      description: '',
      iconRef: '',
      sortOrder: '0',
      status: 'enabled',
    }
    : {
      collectionKind: state.category.collectionKind,
      categoryCode: state.category.categoryCode,
      name: state.category.name,
      description: state.category.description,
      iconRef: state.category.iconRef,
      sortOrder: String(state.category.sortOrder),
      status: state.category.status,
    }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sortOrderError, setSortOrderError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [initialSnapshot] = useState(() => JSON.stringify(state.mode === 'create'
    ? { collectionKind: 'mixed', categoryCode: '', name: '', description: '', iconRef: '', sortOrder: '0', status: 'enabled' }
    : {
      collectionKind: state.category.collectionKind,
      categoryCode: state.category.categoryCode,
      name: state.category.name,
      description: state.category.description,
      iconRef: state.category.iconRef,
      sortOrder: String(state.category.sortOrder),
      status: state.category.status,
    }));
  const dirty = JSON.stringify(fields) !== initialSnapshot;
  const requestCancel = () => {
    if (saving) {
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onCancel();
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving || discardOpen) {
        return;
      }
      event.preventDefault();
      requestCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = fields.name.trim();
    if (!name) {
      setError(t('admin.collections.validation.nameRequired', 'Name is required.'));
      return;
    }
    const categoryCode = fields.categoryCode.trim();
    if (creating && !COLLECTION_CATEGORY_CODE_PATTERN.test(categoryCode)) {
      setCodeError(t(
        'admin.collections.categories.validation.code',
        'Category code must start with a letter or digit and contain only lowercase letters, digits, "_" or "-".',
      ));
      return;
    }
    const sortOrder = parseSortOrder(fields.sortOrder);
    if (sortOrder === null) {
      setSortOrderError(t('admin.collections.validation.sortOrder', 'Sort order must be a non-negative integer.'));
      return;
    }
    setCodeError(null);
    setSortOrderError(null);
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...(creating ? { collectionKind: fields.collectionKind, categoryCode } : {}),
        name,
        description: fields.description,
        iconRef: fields.iconRef,
        sortOrder,
        status: fields.status,
      });
    } catch (submitError) {
      setError(resolveProblemMessage(
        submitError,
        t,
        t('admin.collections.categories.errors.save', 'Failed to save the category'),
      ));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-admin-category-dialog
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestCancel();
        }
      }}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <div id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
                {creating
                  ? t('admin.collections.categories.dialog.createTitle', 'New collection category')
                  : t('admin.collections.categories.dialog.editTitle', 'Edit collection category')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'admin.collections.categories.dialog.subtitle',
                  'A category belongs to one collection kind and keeps collections of that kind together.',
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={requestCancel}
            aria-label={t('common.actions.cancel', 'Cancel')}
            disabled={saving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label={t('admin.collections.fields.collectionKind', 'Collection kind')}
            value={fields.collectionKind}
            options={kindOptions(t)}
            disabled={!creating}
            required
            hint={creating
              ? t('admin.collections.categories.fields.kindHint', 'The kind cannot change after creation.')
              : t('admin.collections.fields.collectionKindLocked', 'The kind is fixed after creation.')}
            onChange={(value) => setFields((current) => ({ ...current, collectionKind: value }))}
            dataAttribute={{ 'data-admin-category-kind': true }}
          />
          <TextField
            label={t('admin.collections.categories.fields.categoryCode', 'Category code')}
            value={fields.categoryCode}
            disabled={!creating}
            required={creating}
            maxLength={128}
            error={codeError}
            monospace
            placeholder={t('admin.collections.categories.fields.categoryCodePlaceholder', 'e.g. frontend')}
            hint={creating
              ? t(
                'admin.collections.categories.fields.categoryCodeHint',
                'Lowercase slug used by integrations; dots are not allowed.',
              )
              : t('admin.collections.categories.fields.categoryCodeLocked', 'The code is fixed after creation.')}
            onChange={(value) => {
              setCodeError(null);
              setFields((current) => ({ ...current, categoryCode: value.toLowerCase() }));
            }}
            dataAttribute={{ 'data-admin-category-code': true }}
          />
          <TextField
            autoFocus
            required
            maxLength={255}
            label={t('admin.collections.fields.name', 'Name')}
            value={fields.name}
            onChange={(value) => setFields((current) => ({ ...current, name: value }))}
            dataAttribute={{ 'data-admin-category-name': true }}
          />
          <TextField
            maxLength={512}
            label={t('admin.collections.fields.iconRef', 'Icon reference')}
            value={fields.iconRef}
            onChange={(value) => setFields((current) => ({ ...current, iconRef: value }))}
          />
          <div className="md:col-span-2">
            <TextAreaField
              label={t('admin.collections.fields.description', 'Description')}
              value={fields.description}
              rows={3}
              maxLength={4000}
              onChange={(value) => setFields((current) => ({ ...current, description: value }))}
            />
          </div>
          <TextField
            label={t('admin.collections.fields.sortOrder', 'Sort order')}
            value={fields.sortOrder}
            maxLength={10}
            error={sortOrderError}
            hint={t('admin.collections.fields.sortOrderHint', 'Lower numbers appear first.')}
            onChange={(value) => {
              setSortOrderError(null);
              setFields((current) => ({ ...current, sortOrder: value }));
            }}
          />
          <SelectField
            label={t('admin.collections.columns.status', 'Status')}
            value={fields.status}
            options={recordStatusOptions(t)}
            hint={t(
              'admin.collections.categories.fields.statusHint',
              'A disabled category cannot receive new collections.',
            )}
            onChange={(value) => setFields((current) => ({ ...current, status: value }))}
            dataAttribute={{ 'data-admin-category-status': true }}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={requestCancel}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {t('common.actions.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            data-admin-category-save
            disabled={saving || (!creating && !dirty)}
            aria-busy={saving}
            className="rounded-lg bg-lobster-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? t('common.actions.saving', 'Saving...')
              : creating
                ? t('admin.collections.categories.actions.create', 'Create category')
                : t('admin.collections.actions.saveChanges', 'Save changes')}
          </button>
        </div>
      </form>

      {discardOpen ? (
        <ConfirmDialog
          title={t('admin.collections.editor.discardTitle', 'Discard unsaved changes?')}
          description={t(
            'admin.collections.categories.dialog.discardDescription',
            'Closing now loses the category edits made in this dialog.',
          )}
          confirmLabel={t('admin.collections.actions.discard', 'Discard')}
          cancelLabel={t('admin.collections.actions.keepEditing', 'Keep editing')}
          tone="danger"
          onConfirm={() => {
            setDiscardOpen(false);
            onCancel();
          }}
          onCancel={() => setDiscardOpen(false)}
        />
      ) : null}
    </div>
  );
}
