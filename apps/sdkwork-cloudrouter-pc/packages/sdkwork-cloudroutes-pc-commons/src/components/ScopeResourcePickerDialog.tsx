import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, RefreshCw, Search, X } from "lucide-react";

/**
 * Generic, scope-aware resource picker dialog.
 *
 * The picker is domain-agnostic: callers describe one or more **scope sources**
 * (personal, organization, tenant), each with a cursor-paged loader, and the
 * dialog owns tabbing, debounced server search, incremental loading, selection,
 * and accessibility. It is safe for large catalogs because it never requires a
 * full list: every scope loads one page at a time and searches server-side.
 *
 * Selection modes:
 * - `single` (default): at most one item, across every scope.
 * - `multiple`: any number of items, remembered across scope switches.
 *
 * The component owns no copy and no data fetching strategy beyond the loader
 * contract; callers keep both (`COMPONENT_SPEC.md`, `APP_PC_ARCHITECTURE_SPEC.md`).
 */
export type ScopeResourceScope = "personal" | "organization" | "tenant";

export type ScopeResourceSelectionMode = "single" | "multiple";

export interface ScopeResourcePickerItem {
  id: string;
  scope: ScopeResourceScope;
  label: string;
  description?: string;
  /** Secondary identifier, e.g. an AppID or account number. */
  meta?: string;
  /** Short status chip rendered at the trailing edge. */
  badge?: string;
  badgeTone?: "default" | "success" | "warning" | "danger" | "secondary";
  /** Disabled rows stay visible so the reason can be read. */
  disabled?: boolean;
  /** Domain payload passed through untouched; the dialog never inspects it. */
  payload?: unknown;
}

export interface ScopeResourcePickerQuery {
  search: string;
  /** Opaque continuation token returned by the previous page. */
  cursor?: string;
  pageSize: number;
}

export interface ScopeResourcePickerPage {
  items: readonly ScopeResourcePickerItem[];
  hasMore: boolean;
  nextCursor?: string;
}

/** One tab of the dialog. */
export interface ScopeResourcePickerSource {
  scope: ScopeResourceScope;
  label: string;
  description?: string;
  load(query: ScopeResourcePickerQuery): Promise<ScopeResourcePickerPage>;
}

export interface ScopeResourcePickerLabels {
  title: string;
  description?: string;
  searchPlaceholder: string;
  loading: string;
  empty: string;
  emptySearch: string;
  error: string;
  retry: string;
  cancel: string;
  confirm: string;
  loadMore: string;
  scopeLabel: string;
  listLabel: string;
  close: string;
  /** e.g. `Selected 2` */
  selectedCount: (count: number) => string;
}

export interface ScopeResourcePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default `single`. */
  mode?: ScopeResourceSelectionMode;
  sources: readonly ScopeResourcePickerSource[];
  /** Current bindings, used to seed the selection every time the dialog opens. */
  initialSelection: readonly ScopeResourcePickerItem[];
  labels: ScopeResourcePickerLabels;
  onConfirm: (selection: readonly ScopeResourcePickerItem[]) => void;
  pageSize?: number;
  searchDebounceMs?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 300;

export function ScopeResourcePickerDialog({
  initialSelection,
  labels,
  mode = "single",
  onConfirm,
  onOpenChange,
  open,
  pageSize = DEFAULT_PAGE_SIZE,
  searchDebounceMs = DEFAULT_DEBOUNCE_MS,
  sources,
}: ScopeResourcePickerDialogProps) {
  const firstScope = initialSelection[0]?.scope ?? sources[0]?.scope ?? "tenant";
  const [activeScope, setActiveScope] = useState<ScopeResourceScope>(firstScope);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<readonly ScopeResourcePickerItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>();
  const [reloadToken, setReloadToken] = useState(0);
  const [selected, setSelected] = useState<ReadonlyMap<string, ScopeResourcePickerItem>>(new Map());
  const requestSeq = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(initialSelection);
  selectionRef.current = initialSelection;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  const activeSource = useMemo(
    () => sources.find((source) => source.scope === activeScope) ?? sources[0],
    [activeScope, sources],
  );

  // Reset lookups before each show; selection comes from the caller's current bindings.
  // Sources are read through a ref so a caller re-render that recreates the array
  // cannot silently clear a selection the operator is editing.
  useEffect(() => {
    if (!open) {
      return;
    }
    const initialScope = selectionRef.current[0]?.scope ?? sourcesRef.current[0]?.scope ?? "tenant";
    setActiveScope(initialScope);
    setSearchInput("");
    setSearch("");
    setItems([]);
    setHasMore(false);
    setNextCursor(undefined);
    setError(undefined);
    setSelected(new Map(selectionRef.current.map((item) => [item.id, item])));
    setReloadToken(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open is the only reset trigger
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), searchDebounceMs);
    return () => clearTimeout(timer);
  }, [searchInput, searchDebounceMs]);

  useEffect(() => {
    if (!open) {
      return;
    }
    searchInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  // A page load that yields no rows for the active scope continues to the next
  // page, so a scope filter applied after the API page never strands the user on
  // an empty view while more rows exist.
  useEffect(() => {
    if (!open || !activeSource) {
      return;
    }
    const seq = ++requestSeq.current;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void (async () => {
      try {
        let page = await activeSource.load({ search, pageSize });
        let attempts = 0;
        while (page.items.length === 0 && page.hasMore && page.nextCursor && attempts < 3) {
          attempts += 1;
          page = await activeSource.load({ search, cursor: page.nextCursor, pageSize });
        }
        if (cancelled || seq !== requestSeq.current) {
          return;
        }
        setItems(page.items);
        setHasMore(page.hasMore);
        setNextCursor(page.nextCursor);
      } catch (nextError) {
        if (!cancelled && seq === requestSeq.current) {
          setError(nextError);
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled && seq === requestSeq.current) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSource, open, pageSize, reloadToken, search]);

  const loadMore = async () => {
    if (!activeSource || !hasMore || !nextCursor || loadingMore) {
      return;
    }
    const seq = requestSeq.current;
    setLoadingMore(true);
    try {
      const page = await activeSource.load({ search, cursor: nextCursor, pageSize });
      if (seq !== requestSeq.current) {
        return;
      }
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (nextError) {
      if (seq === requestSeq.current) {
        setError(nextError);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (item: ScopeResourcePickerItem) => {
    if (item.disabled) {
      return;
    }
    setSelected((current) => {
      const next = new Map(current);
      if (mode === "single") {
        next.clear();
        next.set(item.id, item);
        return next;
      }
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const confirm = () => {
    onConfirm([...selected.values()]);
    onOpenChange(false);
  };

  const isSelected = (item: ScopeResourcePickerItem) => selected.has(item.id);
  const showEmpty = !loading && !error && items.length === 0;
  const confirmDisabled = mode === "single" && selected.size === 0;

  if (!open) {
    return null;
  }

  // The picker must be a viewport-centered modal, not a descendant of the
  // integration Drawer: the drawer's translated surface creates a containing
  // block, so `position: fixed` inside it would be drawer-relative. Portal to
  // body keeps the overlay and sizing relative to the screen.
  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        aria-label={labels.title}
        aria-modal="true"
        className="flex h-[60vh] max-h-[calc(100vh-2rem)] min-h-[min(420px,86vh)] w-[60vw] max-w-[calc(100vw-2rem)] min-w-[min(560px,92vw)] flex-col overflow-hidden rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-2xl"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--sdk-color-border-default)] p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{labels.title}</h3>
            {labels.description ? (
              <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{labels.description}</p>
            ) : null}
          </div>
          <button
            aria-label={labels.close}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sdk-radius-control)] text-[var(--sdk-color-text-muted)] transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-brand-primary)]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        {sources.length > 1 ? (
          <div
            aria-label={labels.scopeLabel}
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--sdk-color-border-default)] px-4 py-2"
            role="tablist"
          >
            {sources.map((source) => {
              const active = source.scope === activeScope;
              return (
                <button
                  aria-selected={active}
                  className={`shrink-0 rounded-[var(--sdk-radius-control)] px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                      : "text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]"
                  }`}
                  key={source.scope}
                  onClick={() => setActiveScope(source.scope)}
                  role="tab"
                  title={source.description}
                  type="button"
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="shrink-0 border-b border-[var(--sdk-color-border-default)] px-5 py-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]"
            />
            <input
              aria-label={labels.searchPlaceholder}
              className="h-10 w-full rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] pl-9 pr-3 text-sm text-[var(--sdk-color-text-primary)] outline-none placeholder:text-[var(--sdk-color-text-muted)] focus:border-[var(--sdk-color-brand-primary)]"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              ref={searchInputRef}
              type="search"
              value={searchInput}
            />
          </div>
        </div>

        <div
          aria-label={labels.listLabel}
          aria-multiselectable={mode === "multiple" ? true : undefined}
          className="min-h-0 flex-1 overflow-y-auto p-2"
          role="listbox"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--sdk-color-text-muted)]" role="status">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {labels.loading}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center" role="alert">
              <p className="text-sm text-[var(--sdk-color-state-danger)]">{labels.error}</p>
              <button
                className="inline-flex items-center gap-1.5 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-1.5 text-sm font-medium"
                onClick={() => setReloadToken((token) => token + 1)}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                {labels.retry}
              </button>
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex h-full items-center justify-center p-10 text-center text-sm text-[var(--sdk-color-text-muted)]">
              {search ? labels.emptySearch : labels.empty}
            </div>
          ) : null}

          {!loading && !error
            ? items.map((item) => {
                const active = isSelected(item);
                return (
                  <button
                    aria-disabled={item.disabled ? true : undefined}
                    aria-selected={active}
                    className={`flex w-full items-start gap-3 rounded-[var(--sdk-radius-control)] px-3 py-2.5 text-left transition-colors ${
                      item.disabled
                        ? "cursor-not-allowed opacity-55"
                        : active
                          ? "bg-[var(--sdk-color-brand-primary-soft)]"
                          : "hover:bg-[var(--sdk-color-surface-panel-muted)]"
                    }`}
                    disabled={item.disabled}
                    key={`${item.scope}:${item.id}`}
                    onClick={() => toggle(item)}
                    onDoubleClick={() => {
                      if (mode === "single" && !item.disabled) {
                        onConfirm([item]);
                        onOpenChange(false);
                      }
                    }}
                    role="option"
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                        mode === "single" ? "rounded-full" : "rounded-[4px]"
                      } ${
                        active
                          ? "border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary)] text-white"
                          : "border-[var(--sdk-color-border-default)] bg-transparent"
                      }`}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full bg-[var(--sdk-color-surface-panel-muted)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-muted)]">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block truncate text-xs text-[var(--sdk-color-text-muted)]">
                          {item.description}
                        </span>
                      ) : null}
                      {item.meta ? (
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                          {item.meta}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            : null}

          {!loading && !error && hasMore ? (
            <div className="flex justify-center p-3">
              <button
                className="inline-flex items-center gap-1.5 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-1.5 text-sm font-medium"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                type="button"
              >
                {loadingMore ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
                {labels.loadMore}
              </button>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--sdk-color-border-default)] px-5 py-3">
          <span className="text-xs text-[var(--sdk-color-text-muted)]">
            {mode === "multiple" ? labels.selectedCount(selected.size) : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-1.5 text-sm font-medium"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              {labels.cancel}
            </button>
            <button
              className="rounded-[var(--sdk-radius-control)] bg-[var(--sdk-color-brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={confirmDisabled}
              onClick={confirm}
              type="button"
            >
              {labels.confirm}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}
