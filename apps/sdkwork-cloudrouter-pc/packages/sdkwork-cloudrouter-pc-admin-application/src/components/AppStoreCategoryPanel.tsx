import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FolderTree,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
  type StatusBadgeVariant,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { AppStoreCategoryFormDrawer } from "../components/AppStoreCategoryFormDrawer";
import {
  getAppStoreCategoryService,
  isAppStoreCategoryForbidden,
  isAppStoreCategoryUnavailable,
  nextCategoryStatus,
  resolveCategoryDisplayName,
} from "../services/appstore-categories";
import { sortCategories } from "../services/appstore-category-form";
import type {
  AppStoreCategory,
  AppStoreCategoryService,
  AppStoreCategoryStatus,
} from "../types/appstore-categories";

interface CategoryListState {
  status: "loading" | "ready" | "error";
  items: readonly AppStoreCategory[];
  hasMore: boolean;
  nextCursor?: string;
  error?: unknown;
}

const CATEGORY_PAGE_SIZE = 100;
const STATUS_FILTER_ALL = "all";

/**
 * App Store category management inside the App Center.
 *
 * The operator contract exposes a cursor-paged list plus create/update. The
 * panel keeps the loaded page, resolves display names in the active locale,
 * and models "delete" as the contract's soft-delete status transition.
 */
export function AppStoreCategoryPanel({
  messages,
  service,
}: {
  messages: ApplicationCatalogMessages;
  /** Test/extension seam: override the App Store category transport. */
  service?: AppStoreCategoryService;
}) {
  const { i18n } = useTranslation();
  const copy = messages.categories;
  const locale = i18n.language || "zh-CN";
  const resolvedService = service ?? getAppStoreCategoryService();
  const [state, setState] = useState<CategoryListState>({ hasMore: false, items: [], status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<unknown>();
  const [deletingCategory, setDeletingCategory] = useState<AppStoreCategory>();
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>();
  const [formTarget, setFormTarget] = useState<{ category?: AppStoreCategory }>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [], hasMore: false });
    void (async () => {
      try {
        const page = await resolvedService.list({ pageSize: CATEGORY_PAGE_SIZE });
        if (!cancelled) {
          setState({
            status: "ready",
            items: page.items,
            hasMore: page.hasMore,
            ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", items: [], hasMore: false, error });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, resolvedService]);

  const loadMore = async () => {
    if (!state.nextCursor || state.status === "loading") {
      return;
    }
    setBusyId("__load-more__");
    try {
      const page = await resolvedService.list({
        cursor: state.nextCursor,
        pageSize: CATEGORY_PAGE_SIZE,
      });
      setState((current) => ({
        ...current,
        items: dedupeById([...current.items, ...page.items]),
        hasMore: page.hasMore,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : { nextCursor: undefined }),
      }));
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyId(undefined);
    }
  };

  const applyLifecycle = async (category: AppStoreCategory) => {
    const next = nextCategoryStatus(category.status);
    setBusyId(category.id);
    setActionError(undefined);
    try {
      const updated = await resolvedService.update(category.id, { status: next });
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === category.id
            ? (updated ?? { ...item, status: next })
            : item),
      }));
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyId(undefined);
    }
  };

  const confirmDelete = async () => {
    const category = deletingCategory;
    if (!category) {
      return;
    }
    setDeletePending(true);
    setDeleteBlocked(false);
    setDeleteError(undefined);
    try {
      await resolvedService.update(category.id, { status: "deleted" });
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== category.id),
      }));
      setDeletingCategory(undefined);
    } catch (error) {
      setDeleteError(error);
    } finally {
      setDeletePending(false);
    }
  };

  const handleSaved = (saved?: AppStoreCategory) => {
    setFormTarget(undefined);
    if (saved) {
      setState((current) => ({
        ...current,
        items: dedupeById([...current.items.filter((item) => item.id !== saved.id), saved]),
      }));
    } else {
      setReloadToken((token) => token + 1);
    }
  };

  const categoriesById = useMemo(
    () => new Map(state.items.map((category) => [category.id, category])),
    [state.items],
  );

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = state.items.filter((category) => {
      if (statusFilter !== STATUS_FILTER_ALL && category.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystacks = [
        category.code,
        category.id,
        ...category.localizations.flatMap((entry) => [entry.displayName, entry.description ?? ""]),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
    return sortCategories(filtered, locale);
  }, [locale, query, state.items, statusFilter]);

  const parentName = (category: AppStoreCategory): string => {
    if (!category.parentId) {
      return copy.rootParent;
    }
    const parent = categoriesById.get(category.parentId);
    if (!parent) {
      return truncateId(category.parentId);
    }
    return resolveCategoryDisplayName(parent, locale) ?? parent.code;
  };

  const hasChildren = (category: AppStoreCategory): boolean =>
    state.items.some((item) => item.parentId === category.id);

  const columns = useMemo<DataTableColumn<AppStoreCategory>[]>(() => [
    {
      cell: (category) => {
        const name = resolveCategoryDisplayName(category, locale);
        return (
          <div className="min-w-0">
            <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
              {name ?? category.code}
            </div>
            <div className="truncate font-mono text-xs text-[var(--sdk-color-text-muted)]">
              {category.code}
            </div>
          </div>
        );
      },
      header: copy.columns.category,
      id: "category",
    },
    {
      cell: (category) => (
        <span className="truncate text-sm text-[var(--sdk-color-text-secondary)]">
          {parentName(category)}
        </span>
      ),
      header: copy.columns.parent,
      id: "parent",
    },
    {
      cell: (category) => (
        <StatusBadge
          label={copy.statuses[category.status]}
          showIcon
          status={category.status}
          variant={categoryStatusVariant(category.status)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (category) => (
        <span className="tabular-nums text-sm text-[var(--sdk-color-text-secondary)]">
          {category.sortOrder}
        </span>
      ),
      header: copy.columns.sortOrder,
      id: "sortOrder",
    },
    {
      cell: (category) => (category.updatedAt ? formatDateTime(category.updatedAt) : "-"),
      header: copy.columns.updatedAt,
      id: "updatedAt",
    },
  ], [copy, locale, categoriesById]);

  const busy = state.status === "loading";
  const actionFailure = actionError
    ? categoryFailureMessage(actionError, copy, messages)
    : undefined;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <FolderTree className="h-4 w-4" />
            {copy.title}
          </h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative w-full max-w-64 sm:w-64">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]"
            />
            <Input
              aria-label={copy.searchPlaceholder}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              value={query}
            />
          </label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger aria-label={copy.columns.status} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>{copy.filterAll}</SelectItem>
              <SelectItem value="active">{copy.statuses.active}</SelectItem>
              <SelectItem value="inactive">{copy.statuses.inactive}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={busy}
            onClick={() => setReloadToken((token) => token + 1)}
            type="button"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {copy.refresh}
          </Button>
          <Button onClick={() => setFormTarget({})} type="button">
            <Plus className="h-4 w-4" />
            {copy.create}
          </Button>
        </div>
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{categoryFailureMessage(state.error, copy, messages)}</span>
            <Button onClick={() => setReloadToken((token) => token + 1)} size="sm" type="button" variant="outline">
              {copy.retry}
            </Button>
          </span>
        </StatusNotice>
      ) : null}

      {actionFailure ? (
        <StatusNotice tone="danger">{actionFailure}</StatusNotice>
      ) : null}

      {deleteBlocked ? (
        <StatusNotice tone="warning">{copy.delete.blockedChildren}</StatusNotice>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--sdk-color-text-muted)]">
          {template(copy.countTemplate, { count: String(visibleItems.length) })}
        </p>
        {state.hasMore ? (
          <Button
            disabled={busyId === "__load-more__"}
            onClick={() => void loadMore()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {busyId === "__load-more__" ? copy.loadingMore : copy.loadMore}
          </Button>
        ) : null}
      </div>

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        emptyDescription={copy.emptyDescription}
        emptyTitle={copy.emptyTitle}
        getRowId={(category) => category.id}
        loading={state.status === "loading"}
        rowActions={(category) => {
          const rowBusy = busyId === category.id;
          const inactive = category.status === "inactive";
          return (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                disabled={rowBusy}
                onClick={() => setFormTarget({ category })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="h-3.5 w-3.5" />
                {copy.actions.edit}
              </Button>
              <Button
                disabled={rowBusy}
                onClick={() => void applyLifecycle(category)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Power className="h-3.5 w-3.5" />
                {rowBusy
                  ? copy.actions.applying
                  : inactive ? copy.actions.activate : copy.actions.deactivate}
              </Button>
              <Button
                disabled={rowBusy}
                onClick={() => {
                  setActionError(undefined);
                  if (hasChildren(category)) {
                    setDeleteBlocked(true);
                    return;
                  }
                  setDeleteBlocked(false);
                  setDeleteError(undefined);
                  setDeletingCategory(category);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {copy.actions.delete}
              </Button>
            </div>
          );
        }}
        rowActionsLabel={copy.columns.actions}
        rows={[...visibleItems]}
        slotProps={{
          footer: { className: "shrink-0" },
          surface: { className: "flex min-h-0 flex-1 flex-col" },
          viewport: { className: "min-h-0 flex-1" },
        }}
        stickyHeader
      />

      {formTarget ? (
        <AppStoreCategoryFormDrawer
          categories={state.items}
          category={formTarget.category}
          messages={messages}
          onClose={() => setFormTarget(undefined)}
          onSaved={handleSaved}
          service={resolvedService}
        />
      ) : null}

      <ConfirmDialog
        cancelLabel={copy.delete.cancel}
        closeOnConfirm={false}
        confirmLabel={deletePending ? copy.delete.deleting : copy.delete.confirm}
        confirmLoading={deletePending}
        description={(
          <span className="space-y-2">
            <span className="block">{copy.delete.description}</span>
            {deleteError ? (
              <span className="block font-medium text-[var(--sdk-color-state-danger)]">
                {categoryFailureMessage(deleteError, copy, messages)}
              </span>
            ) : null}
          </span>
        )}
        onConfirm={() => {
          if (!deletePending && deletingCategory) {
            void confirmDelete();
          }
        }}
        onOpenChange={(open) => {
          if (!open && !deletePending) {
            setDeletingCategory(undefined);
            setDeleteError(undefined);
          }
        }}
        open={Boolean(deletingCategory)}
        title={template(copy.delete.title, {
          name: deletingCategory
            ? resolveCategoryDisplayName(deletingCategory, locale) ?? deletingCategory.code
            : "",
        })}
        tone="danger"
      />

    </section>
  );
}

function dedupeById(items: readonly AppStoreCategory[]): AppStoreCategory[] {
  const seen = new Map<string, AppStoreCategory>();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return [...seen.values()];
}

function categoryStatusVariant(status: AppStoreCategoryStatus): StatusBadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "warning";
    case "deleted":
      return "secondary";
    default:
      return "default";
  }
}

function categoryFailureMessage(
  error: unknown,
  copy: ApplicationCatalogMessages["categories"],
  messages: ApplicationCatalogMessages,
): string {
  if (isAppStoreCategoryForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreCategoryUnavailable(error)) {
    return copy.unavailable;
  }
  return messages.loadError;
}

function truncateId(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 8)}…`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function template(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}
