import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw } from 'lucide-react';

import {
  Button,
  DataTable,
  Dialog,
  EntityForm,
  ErrorState,
  FilterBar,
  LoadingState,
  Notice,
  Pagination,
  PageHeader,
  Panel,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
  type FormValue,
  type FormValues,
} from '../components/ui.tsx';import {
  describeProductCenterError,
  type ProductCenterError,
  type ProductCenterPage,
  type ProductCenterPageQuery,
  type ProductCenterService,
} from '../productCenterService.ts';

/** Every page accepts an optional service so tests can bind stub SDK ports. */
export interface ProductCenterPageProps {
  service?: ProductCenterService;
}

export interface ResourceQueryState extends ProductCenterPageQuery {
  filters: Record<string, string>;
}

export interface RowActionContext {
  reload: () => void;
  reportError: (error: unknown) => void;
  reportSuccess: (message: string) => void;
}

export interface UseResourceListOptions<T> {
  load: (query: ResourceQueryState) => Promise<ProductCenterPage<T>>;
  filters: readonly FilterControl[];
  initialFilters?: Record<string, string>;
  initialPageSize?: number;
}

export interface ResourceListState<T> {
  rows: readonly T[];
  pageInfo: ProductCenterPage<T>['pageInfo'];
  page: number;
  pageSize: number;
  loading: boolean;
  error: ProductCenterError | null;
  draftFilters: Record<string, string>;
  setFilter: (name: string, value: string) => void;
  submitFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  reload: () => void;
  notice: string | null;
  actionError: string | null;
  clearNotice: () => void;
  clearActionError: () => void;
  reportSuccess: (message: string) => void;
  reportError: (error: unknown) => void;
}

function defaultFilterValues(
  filters: readonly FilterControl[],
  initialFilters?: Record<string, string>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const filter of filters) {
    values[filter.name] = initialFilters?.[filter.name]
      ?? (filter.kind === 'select' ? (filter.options?.[0]?.value ?? '') : '');
  }
  return values;
}

/**
 * List state for one Product Center resource.
 *
 * Every query is derived from injected state (`filters`, `page`, `pageSize`)
 * and executed through the caller's `load`, so the host admin can never issue a
 * resource query the owning backend does not document. In-flight responses are
 * ignored once the query changes, which keeps a slow page from overwriting a
 * newer one.
 */
export function useResourceList<T>({
  load,
  filters,
  initialFilters,
  initialPageSize = 20,
}: UseResourceListOptions<T>): ResourceListState<T> {
  const initialValues = useMemo(
    () => defaultFilterValues(filters, initialFilters),
    // The identity of `filters` is owned by the caller and memoized there.
    [filters, initialFilters],
  );
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>(initialValues);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(initialValues);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [rows, setRows] = useState<T[]>([]);
  const [pageInfo, setPageInfo] = useState<ProductCenterPage<T>['pageInfo']>({
    page: 1,
    pageSize: initialPageSize,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProductCenterError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load({ page, pageSize, filters: appliedFilters }).then(
      (result) => {
        if (!active) {
          return;
        }
        setRows(result.items);
        setPageInfo(result.pageInfo);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setRows([]);
        setError(describeProductCenterError(loadError));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [appliedFilters, load, page, pageSize, reloadToken]);

  return {
    rows,
    pageInfo,
    page,
    pageSize,
    loading,
    error,
    draftFilters,
    setFilter: (name, value) => setDraftFilters((current) => ({ ...current, [name]: value })),
    submitFilters: () => {
      setPageState(1);
      setAppliedFilters({ ...draftFilters });
    },
    resetFilters: () => {
      setDraftFilters(initialValues);
      setAppliedFilters(initialValues);
      setPageState(1);
    },
    setPage: setPageState,
    setPageSize: (nextSize) => {
      setPageSizeState(nextSize);
      setPageState(1);
    },
    reload,
    notice,
    actionError,
    clearNotice: () => setNotice(null),
    clearActionError: () => setActionError(null),
    reportSuccess: (message) => {
      setActionError(null);
      setNotice(message);
    },
    reportError: (actionFailure) => {
      setNotice(null);
      setActionError(describeProductCenterError(actionFailure).message);
    },
  };
}

export interface ResourceListPanelProps<T> {
  state: ResourceListState<T>;
  filters: readonly FilterControl[];
  columns: readonly DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  panelTitle?: ReactNode;
  panelActions?: ReactNode;
  toolbarActions?: ReactNode;
  rowActions?: (row: T, context: RowActionContext) => ReactNode;
  /** Extra content rendered below the table inside the same panel. */
  children?: ReactNode;
}

/** Filter bar + table + pagination for one resource, without page chrome. */
export function ResourceListPanel<T>({
  state,
  filters,
  columns,
  rowKey,
  emptyLabel,
  panelTitle,
  panelActions,
  toolbarActions,
  rowActions,
  children,
}: ResourceListPanelProps<T>) {
  const { t } = useTranslation();
  const rowActionContext = useMemo<RowActionContext>(() => ({
    reload: state.reload,
    reportError: state.reportError,
    reportSuccess: state.reportSuccess,
  }), [state.reload, state.reportError, state.reportSuccess]);

  const tableColumns = useMemo<readonly DataColumn<T>[]>(() => {
    if (!rowActions) {
      return columns;
    }
    return [
      ...columns,
      {
        key: '__actions',
        header: t('admin.productCenter.common.actions', 'Actions'),
        headerClassName: 'text-right',
        className: 'text-right',
        cell: (row) => <div className="flex justify-end gap-1">{rowActions(row, rowActionContext)}</div>,
      },
    ];
  }, [columns, rowActions, rowActionContext, t]);

  return (
    <Panel
      actions={panelActions}
      bodyClassName="flex min-h-0 flex-col p-0"
      className="min-h-0 flex-1"
      title={panelTitle}
    >
      <FilterBar
        filters={filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        onSubmit={state.submitFilters}
        resetLabel={t('admin.productCenter.actions.reset', 'Reset')}
        searchLabel={t('admin.productCenter.actions.search', 'Search')}
        values={state.draftFilters}
      >
        {toolbarActions}
      </FilterBar>
      <div className="min-h-0 flex-1 overflow-auto">
        {state.loading ? (
          <LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} />
        ) : state.error ? (
          <ErrorState
            code={state.error.code}
            codeLabel={t('admin.productCenter.error.code', 'Error code')}
            message={state.error.message}
            onRetry={state.reload}
            retryLabel={t('admin.productCenter.actions.retry', 'Retry')}
            title={t('admin.productCenter.state.error', 'The request failed')}
            traceId={state.error.traceId}
            traceLabel={t('admin.productCenter.error.traceId', 'Trace id')}
          />
        ) : (
          <DataTable
            columns={tableColumns}
            emptyLabel={emptyLabel}
            rowKey={(row, index) => `${rowKey(row)}-${index}`}
            rows={state.rows}
          />
        )}
      </div>
      <Pagination
        disabled={state.loading}
        hasNextPage={state.pageInfo.hasNextPage}
        itemCount={state.rows.length}
        labels={{
          next: t('admin.productCenter.actions.next', 'Next'),
          page: t('admin.productCenter.common.page', 'Page'),
          pageSize: t('admin.productCenter.common.pageSize', 'Rows'),
          previous: t('admin.productCenter.actions.previous', 'Previous'),
          showing: t('admin.productCenter.common.showing', 'Showing'),
          total: t('admin.productCenter.common.total', 'Total'),
        }}
        onNextPage={() => state.setPage(state.page + 1)}
        onPageSizeChange={state.setPageSize}
        onPreviousPage={() => state.setPage(Math.max(1, state.page - 1))}
        page={state.page}
        pageSize={state.pageSize}
        totalItems={state.pageInfo.totalItems}
      />
      {children}
    </Panel>
  );
}

function emptyValues(fields: readonly FormFieldSpec[], seed: Record<string, string> = {}): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.kind === 'checkbox') {
      values[field.name] = false;
      continue;
    }
    if (seed[field.name] !== undefined) {
      values[field.name] = seed[field.name] ?? '';
      continue;
    }
    values[field.name] = field.kind === 'select' ? (field.options?.[0]?.value ?? '') : '';
  }
  return values;
}

export function requireString(values: FormValues, name: string): string {
  const value = values[name];
  return typeof value === 'string' ? value.trim() : '';
}

export interface ResourcePageFrameProps<T> {
  title: string;
  description: string;
  emptyLabel: string;
  columns: readonly DataColumn<T>[];
  filters: readonly FilterControl[];
  load: (query: ResourceQueryState) => Promise<ProductCenterPage<T>>;
  rowKey: (row: T) => string;
  toolbarActions?: ReactNode;
  rowActions?: (row: T, context: RowActionContext) => ReactNode;
  create?: {
    label: string;
    title: string;
    fields: readonly FormFieldSpec[];
    onSubmit: (values: FormValues) => Promise<void>;
  };
  /** Extra content rendered under the table (for example a binding panel). */
  children?: ReactNode;
  /** Initial filter values; defaults to an empty string for every filter. */
  initialFilters?: Record<string, string>;
}

/** Whole-page list surface: header, notices, table, pagination, create dialog. */
export function ResourcePageFrame<T>({
  title,
  description,
  emptyLabel,
  columns,
  filters,
  load,
  rowKey,
  toolbarActions,
  rowActions,
  create,
  children,
  initialFilters,
}: ResourcePageFrameProps<T>) {
  const { t } = useTranslation();
  const state = useResourceList<T>({ filters, initialFilters, load });
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<FormValues>(() => emptyValues(create?.fields ?? []));
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!create) {
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    create.onSubmit(createValues).then(
      () => {
        setCreateSubmitting(false);
        setCreateOpen(false);
        setCreateValues(emptyValues(create.fields));
        state.reportSuccess(t('admin.productCenter.toast.created', 'Created'));
        state.reload();
      },
      (submitError: unknown) => {
        setCreateSubmitting(false);
        setCreateError(describeProductCenterError(submitError).message);
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <>
            {toolbarActions}
            <Button onClick={state.reload} variant="secondary">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.refresh', 'Refresh')}
            </Button>
            {create ? (
              <Button
                onClick={() => {
                  setCreateValues(emptyValues(create.fields));
                  setCreateError(null);
                  setCreateOpen(true);
                }}
                variant="primary"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                {create.label}
              </Button>
            ) : null}
          </>
        }
        description={description}
        title={title}
      />

      {state.notice ? (
        <Notice onDismiss={state.clearNotice} tone="success">
          {state.notice}
        </Notice>
      ) : null}
      {state.actionError ? (
        <Notice onDismiss={state.clearActionError} tone="error">
          {state.actionError}
        </Notice>
      ) : null}

      <ResourceListPanel<T>
        columns={columns}
        emptyLabel={emptyLabel}
        filters={filters}
        rowActions={rowActions}
        rowKey={rowKey}
        state={state}
      >
        {children}
      </ResourceListPanel>

      {create ? (
        <Dialog
          footer={
            <>
              <Button disabled={createSubmitting} onClick={() => setCreateOpen(false)} variant="secondary">
                {t('admin.productCenter.actions.cancel', 'Cancel')}
              </Button>
              <Button disabled={createSubmitting} onClick={handleCreate} variant="primary">
                {createSubmitting
                  ? t('admin.productCenter.actions.saving', 'Saving…')
                  : t('admin.productCenter.actions.save', 'Save')}
              </Button>
            </>
          }
          onClose={() => setCreateOpen(false)}
          open={createOpen}
          title={create.title}
          wide
        >
          {createError ? <Notice tone="error">{createError}</Notice> : null}
          <div className="mt-2">
            <EntityForm
              fields={create.fields}
              onChange={(name: string, value: FormValue) => setCreateValues((current) => ({ ...current, [name]: value }))}
              values={createValues}
            />
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

