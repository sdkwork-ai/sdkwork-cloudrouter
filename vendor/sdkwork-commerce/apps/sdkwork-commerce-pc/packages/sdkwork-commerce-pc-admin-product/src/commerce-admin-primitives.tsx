import React, { useCallback, useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";

export type BusinessStateKind = "loading" | "error" | "empty";

export interface BusinessStateAction {
  label: string;
  onClick: () => void;
}

export interface BusinessStatePanelProps {
  kind?: BusinessStateKind;
  title: string;
  description?: string;
  action?: BusinessStateAction;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
  className?: string;
}

const stateStyle: Record<BusinessStateKind, { role: "status" | "alert"; tone: string; dot: string }> = {
  loading: {
    role: "status",
    tone: "text-slate-500 dark:text-slate-400",
    dot: "border-emerald-500 border-t-transparent animate-spin",
  },
  error: {
    role: "alert",
    tone: "text-red-600 dark:text-red-400",
    dot: "border-red-500 bg-red-500",
  },
  empty: {
    role: "status",
    tone: "text-slate-500 dark:text-slate-400",
    dot: "border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-600",
  },
};

export function BusinessStatePanel({
  action,
  className = "",
  description,
  icon,
  kind,
  onRetry,
  retryLabel = "Retry",
  title,
}: BusinessStatePanelProps) {
  const resolvedKind = kind === "loading" || kind === "error" || kind === "empty" ? kind : "empty";
  const style = stateStyle[resolvedKind];
  const resolvedAction = action ?? (onRetry ? { label: retryLabel, onClick: onRetry } : undefined);

  return (
    <div
      role={style.role}
      aria-live={resolvedKind === "loading" ? "polite" : "assertive"}
      className={`flex min-h-32 flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300">
        {icon ?? <span className={`h-4 w-4 rounded-full border-2 ${style.dot}`} aria-hidden="true" />}
      </div>
      <div>
        <div className={`text-sm font-medium ${style.tone}`}>{title}</div>
        {description ? (
          <div className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
        ) : null}
      </div>
      {resolvedAction ? (
        <button
          type="button"
          onClick={resolvedAction.onClick}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
        >
          {resolvedAction.label}
        </button>
      ) : null}
    </div>
  );
}

type DataAttributes = Record<`data-${string}`, string | number | boolean | undefined>;

interface AdminTableShellProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  viewportClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  children: ReactNode;
}

function AdminTableShell({
  children,
  className = "",
  footer,
  header,
  viewportClassName = "",
  viewportProps,
  ...props
}: AdminTableShellProps) {
  const { className: viewportPropsClassName = "", ...restViewportProps } = viewportProps ?? {};

  return (
    <div
      className={`flex min-h-0 flex-1 overflow-hidden min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717] ${className}`.trim()}
      {...props}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        data-admin-table-shell-viewport
        className={`min-h-0 flex-1 overflow-auto ${viewportClassName} ${viewportPropsClassName}`.trim()}
        {...restViewportProps}
      >
        {children}
      </div>
      {footer ? (
        <div data-admin-table-shell-footer className="shrink-0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export type AdminResourceRecord = Record<string, unknown>;
export type AdminResourceLoadParams = {
  page: number;
  pageSize: number;
};

export type AdminResourceCollectionMeta = {
  total: number;
  page: number;
  pageSize: number;
};

export type AdminResourceColumn = {
  key: string;
  label: string;
  align?: "right";
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
}

const INITIAL_STATE: AdminResourceState = {
  loading: true,
  error: null,
  records: [],
  collectionMeta: null,
};

export function AdminResourceCenter<TSectionId extends string = string, TGroup extends string = string>({
  activeSectionId,
  emptyDescription = "Adjust the search query or reload the current section.",
  emptyTitle = "No records",
  errorTitle = "Data could not be loaded",
  initialSectionId,
  loadingTitle = "Loading records...",
  reloadLabel = "Reload",
  searchPlaceholder = "Search records",
  sections,
  showSectionNavigation = true,
  tableViewportDataAttribute,
}: AdminResourceCenterProps<TSectionId, TGroup>) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<TSectionId>(
    activeSectionId ?? initialSectionId ?? sections[0].id,
  );
  const [search, setSearch] = useState("");
  const [stateByTab, setStateByTab] = useState<Record<TSectionId, AdminResourceState>>(
    () => Object.fromEntries(sections.map((section) => [section.id, INITIAL_STATE])) as Record<TSectionId, AdminResourceState>,
  );
  const requestedActiveTab = activeSectionId ?? uncontrolledActiveTab;
  const activeSection = sections.find((section) => section.id === requestedActiveTab) ?? sections[0];
  const activeTab = activeSection.id;
  const activeState = stateByTab[activeTab] ?? INITIAL_STATE;
  const groupedSections = useMemo(() => groupAdminResourceSections(sections), [sections]);
  const viewportProps = tableViewportDataAttribute ? { [`data-${tableViewportDataAttribute}`]: true } : undefined;

  const loadSection = useCallback(async (
    section: AdminResourceSection<TSectionId, TGroup>,
    isActive: () => boolean = () => true,
  ) => {
    setStateByTab((current) => ({
      ...current,
      [section.id]: { ...(current[section.id] ?? INITIAL_STATE), loading: true, error: null },
    }));
    try {
      const result = await section.load();
      const records = readAdminResourceRecordList(result);
      const collectionMeta = readAdminResourceCollectionMeta(result);
      if (isActive()) {
        setStateByTab((current) => ({
          ...current,
          [section.id]: { collectionMeta, error: null, loading: false, records },
        }));
      }
    } catch (error) {
      if (isActive()) {
        setStateByTab((current) => ({
          ...current,
          [section.id]: {
            collectionMeta: null,
            error: error instanceof Error && error.message ? error.message : errorTitle,
            loading: false,
            records: [],
          },
        }));
      }
    }
  }, [errorTitle]);

  useEffect(() => {
    let active = true;
    void loadSection(activeSection, () => active);
    return () => {
      active = false;
    };
  }, [activeSection, loadSection]);

  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeState.records;
    }
    return activeState.records.filter((record) =>
      activeSection.searchFields.some((field) => String(record[field] ?? "").toLowerCase().includes(query)),
    );
  }, [activeSection.searchFields, activeState.records, search]);

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
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                    key={section.id}
                    onClick={() => {
                      setUncontrolledActiveTab(section.id);
                      setSearch("");
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
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              onClick={() => void loadSection(activeSection)}
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
            onRetry={() => void loadSection(activeSection)}
            title={errorTitle}
          />
        ) : (
          <AdminTableShell
            className="m-5 mt-4 min-h-0 flex-1 rounded-xl"
            viewportClassName="min-h-0 flex-1 custom-scrollbar"
            viewportProps={viewportProps}
          >
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  {activeSection.columns.map((column) => (
                    <th
                      className={`px-6 py-4 font-semibold ${column.align === "right" ? "text-right" : ""}`}
                      key={column.key}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {activeState.loading ? (
                  <BusinessStateTableRow colSpan={activeSection.columns.length} kind="loading" title={loadingTitle} />
                ) : visibleRecords.length === 0 ? (
                  <BusinessStateTableRow
                    colSpan={activeSection.columns.length}
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
                          className={`max-w-[280px] truncate px-6 py-4 ${column.align === "right" ? "text-right tabular-nums" : ""}`}
                          key={column.key}
                          title={cellValue}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
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

function BusinessStateTableRow({ colSpan, ...props }: BusinessStatePanelProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-0">
        <BusinessStatePanel {...props} />
      </td>
    </tr>
  );
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

function readAdminResourceRecordList(value: unknown): AdminResourceRecord[] {
  const data = readAdminResourcePayload(value);
  if (Array.isArray(data)) {
    return data.filter(isAdminResourceRecord);
  }
  if (!isAdminResourceRecord(data)) {
    return [];
  }
  for (const key of ["items", "records", "list", "data"]) {
    const items = data[key];
    if (Array.isArray(items)) {
      return items.filter(isAdminResourceRecord);
    }
  }
  const item = data.item;
  return isAdminResourceRecord(item) ? [item] : [];
}

function readAdminResourceCollectionMeta(value: unknown): AdminResourceCollectionMeta | null {
  const data = readAdminResourcePayload(value);
  if (!isAdminResourceRecord(data)) {
    return null;
  }
  const total = readFiniteNumber(data.total);
  const page = readFiniteNumber(data.page);
  const pageSize = readFiniteNumber(data.pageSize ?? data.page_size);
  if (total === null || page === null || pageSize === null) {
    return null;
  }
  return { total, page, pageSize };
}

function readAdminResourcePayload(value: unknown): unknown {
  if (!isAdminResourceRecord(value)) {
    return value;
  }
  return "data" in value ? value.data : value;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isAdminResourceRecord(value: unknown): value is AdminResourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function adminResourceRecordKey(record: AdminResourceRecord, index: number): string {
  const id = record.id ?? record.uuid ?? record.skuId ?? record.orderId;
  return typeof id === "string" && id ? id : String(index);
}

function formatAdminResourceColumnCell(column: AdminResourceColumn, record: AdminResourceRecord): string {
  if (column.format) {
    return column.format(record[column.key], record);
  }
  return formatAdminResourceCell(record[column.key]);
}

function formatAdminResourceCell(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
