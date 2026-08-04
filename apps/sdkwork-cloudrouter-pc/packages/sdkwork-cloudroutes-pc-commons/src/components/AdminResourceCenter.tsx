import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { AdminTableShell } from './AdminTableShell';
import { BottomPagination } from './BottomPagination';
import { BusinessStatePanel, BusinessStateTableRow } from './BusinessState';

export type AdminResourceRecord = Record<string, unknown>;
export type AdminResourceLoadParams = {
  page: number;
  pageSize: number;
};

export type AdminResourceCollectionMeta = {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
};

export type AdminResourceColumn = {
  key: string;
  label: string;
  align?: 'right';
  format?: (value: unknown, record: AdminResourceRecord) => string;
};

export type AdminResourceSection<TSectionId extends string = string, TGroup extends string = string> = {
  id: TSectionId;
  title: string;
  description: string;
  icon: React.ReactNode;
  load: (params?: AdminResourceLoadParams) => Promise<unknown>;
  columns: AdminResourceColumn[];
  searchFields: string[];
  group: TGroup;
  action?: AdminResourceAction;
  actions?: AdminResourceAction[];
  pagination?: AdminResourcePagination;
  rowActions?: AdminResourceRowAction<TSectionId, TGroup>[];
};

export type AdminResourceAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

export type AdminResourcePagination = {
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export type AdminResourceRowAction<TSectionId extends string = string, TGroup extends string = string> = {
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  title?: string | ((record: AdminResourceRecord) => string);
  isDisabled?: (record: AdminResourceRecord) => boolean;
  isVisible?: (record: AdminResourceRecord) => boolean;
  onClick: (record: AdminResourceRecord, section: AdminResourceSection<TSectionId, TGroup>) => void;
};

type AdminResourceState = {
  loading: boolean;
  error: string | null;
  records: AdminResourceRecord[];
  collectionMeta: AdminResourceCollectionMeta | null;
};

export interface AdminResourceCenterProps<TSectionId extends string = string, TGroup extends string = string> {
  sections: AdminResourceSection<TSectionId, TGroup>[];
  activeSectionId?: TSectionId;
  initialSectionId?: TSectionId;
  showSectionNavigation?: boolean;
  errorTitle?: string;
  loadingTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  reloadLabel?: string;
  tableViewportDataAttribute?: string;
  refreshKey?: unknown;
  paginationNextLabel?: string;
  paginationPageLabel?: string;
  paginationPageSizeLabel?: string;
  paginationPreviousLabel?: string;
  paginationShowingLabel?: string;
  onRecordOpen?: (record: AdminResourceRecord, section: AdminResourceSection<TSectionId, TGroup>) => void;
  recordActionColumnLabel?: string;
  recordOpenLabel?: string;
}

const INITIAL_STATE: AdminResourceState = {
  loading: true,
  error: null,
  records: [],
  collectionMeta: null,
};

export function AdminResourceCenter<TSectionId extends string = string, TGroup extends string = string>({
  activeSectionId,
  emptyDescription = 'Adjust the search query or reload the current section.',
  emptyTitle = 'No records',
  errorTitle = 'Data could not be loaded',
  initialSectionId,
  loadingTitle = 'Loading records...',
  onRecordOpen,
  paginationNextLabel = 'Next page',
  paginationPageLabel = 'Page',
  paginationPageSizeLabel = 'Rows',
  paginationPreviousLabel = 'Previous page',
  paginationShowingLabel = 'Showing',
  recordActionColumnLabel = 'Action',
  recordOpenLabel = 'Details',
  reloadLabel = 'Reload',
  refreshKey,
  searchPlaceholder = 'Search records',
  sections,
  showSectionNavigation = true,
  tableViewportDataAttribute,
}: AdminResourceCenterProps<TSectionId, TGroup>) {
  const firstSection = sections[0];
  if (!firstSection) {
    throw new Error('AdminResourceCenter requires at least one section.');
  }

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<TSectionId>(
    activeSectionId ?? initialSectionId ?? firstSection.id,
  );
  const [search, setSearch] = useState('');
  const [stateByTab, setStateByTab] = useState<Record<TSectionId, AdminResourceState>>(
    () => Object.fromEntries(sections.map((section) => [section.id, INITIAL_STATE])) as Record<TSectionId, AdminResourceState>,
  );
  const [paginationByTab, setPaginationByTab] = useState<Record<string, AdminResourceLoadParams>>(() =>
    Object.fromEntries(
      sections
        .filter((section) => section.pagination)
        .map((section) => [
          section.id,
          {
            page: 1,
            pageSize: normalizePageSize(section.pagination?.initialPageSize),
          },
        ]),
    ),
  );
  const requestedActiveTab = activeSectionId ?? uncontrolledActiveTab;
  const activeSection = sections.find((section) => section.id === requestedActiveTab) ?? firstSection;
  const activeTab = activeSection.id;
  const activeState = stateByTab[activeTab] ?? INITIAL_STATE;
  const activeActions = activeSection.actions ?? (activeSection.action ? [activeSection.action] : []);
  const activePagination = activeSection.pagination;
  const activePageState = paginationByTab[activeTab] ?? {
    page: 1,
    pageSize: normalizePageSize(activePagination?.initialPageSize),
  };
  const recordRowActions = activeSection.rowActions ?? [];
  const hasRecordActions = Boolean(onRecordOpen) || recordRowActions.length > 0;
  const tableColumnCount = activeSection.columns.length + (hasRecordActions ? 1 : 0);
  const declaredTotalPages = activeState.collectionMeta?.totalPages
    ?? (activeState.collectionMeta?.total !== undefined
      ? Math.max(1, Math.ceil(activeState.collectionMeta.total / activePageState.pageSize))
      : undefined);
  const hasNextPage = activeState.collectionMeta?.hasMore
    ?? (declaredTotalPages !== undefined
      ? activePageState.page < declaredTotalPages
      : activeState.records.length >= activePageState.pageSize);
  const totalPages = declaredTotalPages
    ?? Math.max(1, activePageState.page + (hasNextPage ? 1 : 0));

  const loadSection = useCallback(async (
    section: AdminResourceSection<TSectionId, TGroup>,
    pageState?: AdminResourceLoadParams,
    isActive: () => boolean = () => true,
  ) => {
    setStateByTab((current) => ({
      ...current,
      [section.id]: { ...(current[section.id] ?? INITIAL_STATE), loading: true, error: null },
    }));
    try {
      const result = await section.load(section.pagination ? pageState : undefined);
      const records = readAdminResourceRecordList(result);
      const collectionMeta = readAdminResourceCollectionMeta(result);
      if (isActive()) {
        setStateByTab((current) => ({
          ...current,
          [section.id]: { loading: false, error: null, records, collectionMeta },
        }));
      }
    } catch (error) {
      if (isActive()) {
        setStateByTab((current) => ({
          ...current,
          [section.id]: {
            loading: false,
            error: error instanceof Error && error.message ? error.message : errorTitle,
            records: [],
            collectionMeta: null,
          },
        }));
      }
    }
  }, [errorTitle]);

  useEffect(() => {
    let active = true;
    void loadSection(activeSection, activePagination ? activePageState : undefined, () => active);
    return () => {
      active = false;
    };
  }, [activePageState.page, activePageState.pageSize, activePagination, activeSection, loadSection, refreshKey]);

  useEffect(() => {
    setSearch('');
  }, [activeTab]);

  useEffect(() => {
    setPaginationByTab((current) => {
      let changed = false;
      const next = { ...current };
      for (const section of sections) {
        if (!section.pagination || next[section.id]) {
          continue;
        }
        next[section.id] = {
          page: 1,
          pageSize: normalizePageSize(section.pagination.initialPageSize),
        };
        changed = true;
      }
      return changed ? next : current;
    });
  }, [sections]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeState.records;
    }
    return activeState.records.filter((record) =>
      activeSection.searchFields.some((field) =>
        String(record[field] ?? '').toLowerCase().includes(query),
      ),
    );
  }, [activeSection.searchFields, activeState.records, search]);

  const groupedSections = useMemo(() => groupAdminResourceSections(sections), [sections]);
  const viewportProps = tableViewportDataAttribute
    ? { [`data-${tableViewportDataAttribute}`]: true }
    : undefined;
  const paginationFooter = activePagination ? (
    <BottomPagination
      disabled={activeState.loading}
      hasNextPage={hasNextPage}
      itemCount={visibleRecords.length}
      nextLabel={paginationNextLabel}
      onNextPage={() => updateSectionPagination(activeTab, { page: activePageState.page + 1 })}
      onPageSizeChange={(pageSize) => updateSectionPagination(activeTab, { page: 1, pageSize })}
      onPreviousPage={() => updateSectionPagination(activeTab, { page: Math.max(1, activePageState.page - 1) })}
      page={activePageState.page}
      pageLabel={`${paginationPageLabel} ${activePageState.page}${activeState.collectionMeta ? ` / ${totalPages}` : ''}`}
      pageSize={activePageState.pageSize}
      pageSizeLabel={paginationPageSizeLabel}
      pageSizeOptions={activePagination.pageSizeOptions}
      previousLabel={paginationPreviousLabel}
      showingLabel={paginationShowingLabel}
    />
  ) : undefined;

  function updateSectionPagination(sectionId: TSectionId, patch: Partial<AdminResourceLoadParams>) {
    setPaginationByTab((current) => {
      const currentPageState = current[sectionId] ?? {
        page: 1,
        pageSize: normalizePageSize(sections.find((section) => section.id === sectionId)?.pagination?.initialPageSize),
      };
      return {
        ...current,
        [sectionId]: {
          ...currentPageState,
          ...patch,
        },
      };
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      {showSectionNavigation && (
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#121212]">
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            {groupedSections.map((group) => (
              <div className="space-y-1" key={group.name}>
                <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                  {group.name}
                </div>
                {group.sections.map((section) => (
                  <button
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      activeTab === section.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                    }`}
                    key={section.id}
                    onClick={() => {
                      setUncontrolledActiveTab(section.id);
                      setSearch('');
                    }}
                    type="button"
                  >
                    {section.icon}
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#1a1a1a]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 md:flex-row md:items-center md:justify-end">
          <div className="flex w-full gap-3 md:w-auto">
            <div className="relative min-w-0 flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                type="text"
                value={search}
              />
            </div>
            {activeActions.map((action, index) => (
              <button
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                type="button"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              onClick={() => void loadSection(activeSection, activePagination ? activePageState : undefined)}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              {reloadLabel}
            </button>
          </div>
        </div>

        {activeState.error ? (
          <BusinessStatePanel
            className="min-h-[360px]"
            description={activeState.error}
            kind="error"
            onRetry={() => void loadSection(activeSection, activePagination ? activePageState : undefined)}
            title={errorTitle}
          />
        ) : (
          <AdminTableShell
            className="m-5 mt-4 min-h-0 flex-1 rounded-xl"
            footer={paginationFooter}
            viewportClassName="min-h-0 flex-1 custom-scrollbar"
            viewportProps={viewportProps}
          >
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  {activeSection.columns.map((column) => (
                    <th
                      className={`px-6 py-4 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}
                      key={column.key}
                    >
                      {column.label}
                    </th>
                  ))}
                  {hasRecordActions ? (
                    <th className="px-6 py-4 text-right font-semibold">
                      {recordActionColumnLabel}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {activeState.loading ? (
                  <BusinessStateTableRow colSpan={tableColumnCount} kind="loading" title={loadingTitle} />
                ) : visibleRecords.length === 0 ? (
                  <BusinessStateTableRow
                    colSpan={tableColumnCount}
                    description={emptyDescription}
                    kind="empty"
                    title={emptyTitle}
                  />
                ) : visibleRecords.map((record, index) => (
                  <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5" key={adminResourceRecordKey(record, index)}>
                    {activeSection.columns.map((column) => {
                      const cellValue = formatAdminResourceColumnCell(column, record);
                      return (
                        <td
                          className={`max-w-[280px] truncate px-6 py-4 ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                          key={column.key}
                          title={cellValue}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                    {hasRecordActions ? (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onRecordOpen ? (
                            <button
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              onClick={() => onRecordOpen(record, activeSection)}
                              type="button"
                            >
                              {recordOpenLabel}
                            </button>
                          ) : null}
                          {recordRowActions.filter((action) => action.isVisible?.(record) ?? true).map((action, actionIndex) => {
                            const actionDisabled = action.isDisabled?.(record) ?? false;
                            const actionTitle = typeof action.title === 'function' ? action.title(record) : action.title;
                            return (
                              <button
                                className={adminResourceRowActionClassName(action.tone)}
                                disabled={actionDisabled}
                                key={`${action.label}-${actionIndex}`}
                                onClick={() => action.onClick(record, activeSection)}
                                title={actionTitle}
                                type="button"
                              >
                                {action.icon}
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        )}
      </main>
    </div>
  );
}

function normalizePageSize(pageSize: number | undefined): number {
  return Number.isFinite(pageSize) && pageSize && pageSize > 0 ? Math.trunc(pageSize) : 50;
}

function adminResourceRowActionClassName(tone: 'default' | 'danger' | undefined): string {
  if (tone === 'danger') {
    return 'inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-500/10';
  }
  return 'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
}

function groupAdminResourceSections<TSectionId extends string, TGroup extends string>(
  sections: AdminResourceSection<TSectionId, TGroup>[],
): Array<{ name: TGroup; sections: AdminResourceSection<TSectionId, TGroup>[] }> {
  const groups: Array<{ name: TGroup; sections: AdminResourceSection<TSectionId, TGroup>[] }> = [];
  for (const section of sections) {
    let group = groups.find((item) => item.name === section.group);
    if (!group) {
      group = { name: section.group, sections: [] };
      groups.push(group);
    }
    group.sections.push(section);
  }
  return groups;
}

export function readAdminResourceRecordList(value: unknown): AdminResourceRecord[] {
  const data = readAdminResourcePayload(value);
  if (Array.isArray(data)) {
    return data.filter(isAdminResourceRecord);
  }
  if (!isAdminResourceRecord(data)) {
    return [];
  }
  for (const key of ['items', 'records', 'list', 'data']) {
    const items = data[key];
    if (Array.isArray(items)) {
      return items.filter(isAdminResourceRecord);
    }
  }
  const item = data.item;
  if (isAdminResourceRecord(item)) {
    return [item];
  }
  return Object.entries(data)
    .filter(([, itemValue]) => typeof itemValue !== 'object' || itemValue === null)
    .map(([key, itemValue]) => ({ metric: key, value: itemValue }));
}

export function readAdminResourceCollectionMeta(value: unknown): AdminResourceCollectionMeta | null {
  const data = readAdminResourcePayload(value);
  if (!isAdminResourceRecord(data)) {
    return null;
  }
  const pageInfo = isAdminResourceRecord(data.pageInfo) ? data.pageInfo : data;
  const page = readPositiveSafeInteger(pageInfo.page);
  const pageSize = readPositiveSafeInteger(pageInfo.pageSize);
  if (page === null || pageSize === null) {
    return null;
  }
  const result: AdminResourceCollectionMeta = { page, pageSize };
  const total = readSafeCount(pageInfo.totalItems ?? pageInfo.total);
  const totalPages = readSafeCount(pageInfo.totalPages);
  if (total !== null) {
    result.total = total;
  }
  if (totalPages !== null) {
    result.totalPages = totalPages;
  }
  if (typeof pageInfo.hasMore === 'boolean') {
    result.hasMore = pageInfo.hasMore;
  }
  return result;
}

export function readAdminResourcePayload(value: unknown): unknown {
  if (!isAdminResourceRecord(value)) {
    return value;
  }
  if ('data' in value) {
    return value.data;
  }
  return value;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readSafeCount(value: unknown): number | null {
  const parsed = readFiniteNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readPositiveSafeInteger(value: unknown): number | null {
  const parsed = readSafeCount(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function isAdminResourceRecord(value: unknown): value is AdminResourceRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function adminResourceRecordKey(record: AdminResourceRecord, index: number): string {
  const id = record.id ?? record.uuid ?? record.skuId ?? record.orderId;
  return typeof id === 'string' && id ? id : String(index);
}

function formatAdminResourceColumnCell(column: AdminResourceColumn, record: AdminResourceRecord): string {
  if (column.format) {
    return column.format(record[column.key], record);
  }
  return formatAdminResourceCell(record[column.key]);
}

function formatAdminResourceCell(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
