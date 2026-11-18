import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useInRouterContext } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, FolderTree, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Input,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import {
  CascadeCategoryManager,
  type CascadeCategoryNode,
} from "@sdkwork/cloudroutes-pc-commons";

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
import {
  buildAppStoreCategoryExport,
  downloadJsonDocument,
} from "../services/category-export";
import {
  planCategoryImport,
  type CategoryImportPlan,
} from "../services/category-import";
import type {
  AppStoreCategory,
  AppStoreCategoryService,
} from "../types/appstore-categories";

const PAGE_SIZE = 200;

interface CategoryNode extends CascadeCategoryNode {
  id: string;
  displayName: string;
}

/**
 * App Store category management as a five-column cascade.
 *
 * The left column is the level-1 taxonomy; each following column shows the
 * children of the previous selection. Per-node and per-column action slots
 * cover create/edit/lifecycle/delete for any category and its children.
 */
export interface AppStoreCategoryPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStoreCategoryService;
}

/**
 * App Store category management as a five-column cascade.
 *
 * The router-aware wrapper deep-links `?category=<id>`; the panel itself stays
 * usable outside a router (tests, embedded consoles).
 */
export function AppStoreCategoryPanel(props: AppStoreCategoryPanelProps) {
  const inRouter = useInRouterContext();
  return inRouter
    ? <RouterConnectedAppStoreCategoryPanel {...props} />
    : <AppStoreCategoryPanelContent {...props} />;
}

function RouterConnectedAppStoreCategoryPanel(props: AppStoreCategoryPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get("category") ?? undefined;
  const onCategorySelect = useCallback((id: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("category", id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  return (
    <AppStoreCategoryPanelContent
      {...props}
      onCategorySelect={onCategorySelect}
      selectedCategoryId={selectedCategoryId}
    />
  );
}

function AppStoreCategoryPanelContent({
  messages,
  onCategorySelect,
  selectedCategoryId,
  service: injectedService,
}: AppStoreCategoryPanelProps & {
  selectedCategoryId?: string;
  onCategorySelect?: (id: string) => void;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language || "zh-CN";
  const copy = messages.categories;
  const service = injectedService ?? getAppStoreCategoryService();
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    items: readonly AppStoreCategory[];
    hasMore?: boolean;
    error?: unknown;
  }>({ status: "loading", items: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [formTarget, setFormTarget] = useState<{ category?: AppStoreCategory; parentId?: string }>();
  const [deletingCategory, setDeletingCategory] = useState<AppStoreCategory>();
  const [deletePending, setDeletePending] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>();
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<unknown>();
  const [notice, setNotice] = useState<string>();
  const [selectedPath, setSelectedPath] = useState<readonly CategoryNode[]>([]);
  const [locateQuery, setLocateQuery] = useState("");
  const [locatePath, setLocatePath] = useState<readonly string[]>([]);
  const [locateKey, setLocateKey] = useState(0);
  const [locateMiss, setLocateMiss] = useState(false);
  const [importPlan, setImportPlan] = useState<CategoryImportPlan>();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Keep the current tree while refreshing; clearing it would reset the
    // cascade selection and hide a just-created child.
    setState((current) => ({ ...current, status: "loading" }));
    void service.list({ pageSize: PAGE_SIZE }).then(
      (page) => {
        if (!cancelled) {
          setState({
            status: "ready",
            items: sortCategories(page.items, locale),
            hasMore: page.hasMore,
          });
          setNextCursor(page.nextCursor);
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", items: [], error });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken, service]);

  const categoriesById = useMemo(
    () => new Map(state.items.map((category) => [category.id, category])),
    [state.items],
  );

  const nodes = useMemo<CategoryNode[]>(() => state.items.map((category) => ({
    id: category.id,
    ...(category.parentId ? { parentId: category.parentId } : {}),
    displayName: resolveCategoryDisplayName(category, locale) ?? category.code,
    secondary: `${category.code} · ${copy.statuses[category.status]}`,
    sortOrder: category.sortOrder,
    status: category.status,
  })), [copy.statuses, locale, state.items]);

  const hasChildren = (category: AppStoreCategory): boolean =>
    state.items.some((item) => item.parentId === category.id);

  const initialPathIds = useMemo(
    () => buildPathIds(selectedCategoryId, state.items),
    [selectedCategoryId, state.items],
  );

  const handleSelect = useCallback((_node: CategoryNode, path: readonly CategoryNode[]) => {
    setSelectedPath(path);
    const id = path[path.length - 1]?.id;
    if (id) {
      onCategorySelect?.(id);
    }
  }, [onCategorySelect]);

  const locate = () => {
    const needle = locateQuery.trim().toLocaleLowerCase();
    if (!needle) {
      setLocateMiss(false);
      return;
    }
    const match = state.items.find((category) =>
      (resolveCategoryDisplayName(category, locale) ?? category.code).toLocaleLowerCase().includes(needle)
      || category.code.toLocaleLowerCase().includes(needle));
    if (!match) {
      setLocateMiss(true);
      return;
    }
    const path: string[] = [];
    let current: AppStoreCategory | undefined = match;
    while (current) {
      path.unshift(current.id);
      current = current.parentId ? categoriesById.get(current.parentId) : undefined;
    }
    setLocatePath(path);
    setLocateKey((key) => key + 1);
    setLocateMiss(false);
  };

  const reload = () => setReloadToken((token) => token + 1);

  const loadMore = async () => {
    if (!state.hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await service.list({
        pageSize: PAGE_SIZE,
        ...(nextCursor ? { cursor: nextCursor } : {}),
      });
      // Merge by id; the cascade must stay one coherent tree.
      setState((current) => {
        const merged = new Map(current.items.map((item) => [item.id, item]));
        for (const item of page.items) {
          merged.set(item.id, item);
        }
        return {
          status: "ready",
          items: sortCategories([...merged.values()], locale),
          hasMore: page.hasMore,
        };
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error }));
    } finally {
      setLoadingMore(false);
    }
  };

  const applyLifecycle = async (category: AppStoreCategory) => {
    setBusyId(category.id);
    setActionError(undefined);
    try {
      await service.update(category.id, { status: nextCategoryStatus(category.status) });
      reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyId(undefined);
    }
  };

  /** Swap with the adjacent sibling by trading sortOrder values. */
  const moveSibling = async (category: AppStoreCategory, direction: "up" | "down") => {
    const siblings = state.items
      .filter((item) => (item.parentId ?? "") === (category.parentId ?? ""))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
    const index = siblings.findIndex((item) => item.id === category.id);
    const target = siblings[index + (direction === "up" ? -1 : 1)];
    if (!target) {
      return;
    }
    setBusyId(category.id);
    setActionError(undefined);
    try {
      if (target.sortOrder === category.sortOrder) {
        await service.update(category.id, {
          sortOrder: category.sortOrder + (direction === "up" ? -1 : 1),
        });
      } else {
        await service.update(category.id, { sortOrder: target.sortOrder });
        await service.update(target.id, { sortOrder: category.sortOrder });
      }
      reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyId(undefined);
    }
  };

  /** Drag-and-drop reorder: reindex the whole sibling group to keep gaps. */
  const reorderSiblings = async (
    dragged: CategoryNode,
    target: CategoryNode,
    position: "before" | "after",
  ) => {
    const draggedCategory = categoriesById.get(dragged.id);
    const targetCategory = categoriesById.get(target.id);
    if (
      !draggedCategory
      || !targetCategory
      || (draggedCategory.parentId ?? "") !== (targetCategory.parentId ?? "")
    ) {
      return;
    }
    const siblings = state.items
      .filter((item) => (item.parentId ?? "") === (draggedCategory.parentId ?? ""))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code))
      .filter((item) => item.id !== draggedCategory.id);
    const targetIndex = siblings.findIndex((item) => item.id === targetCategory.id);
    if (targetIndex < 0) {
      return;
    }
    siblings.splice(targetIndex + (position === "after" ? 1 : 0), 0, draggedCategory);
    setBusyId(draggedCategory.id);
    setActionError(undefined);
    try {
      for (const [index, sibling] of siblings.entries()) {
        const sortOrder = (index + 1) * 10;
        if (sibling.sortOrder !== sortOrder) {
          await service.update(sibling.id, { sortOrder });
        }
      }
      reload();
    } catch (error) {
      setActionError(error);
      reload();
    } finally {
      setBusyId(undefined);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCategory) {
      return;
    }
    setDeletePending(true);
    setDeleteError(undefined);
    try {
      await service.update(deletingCategory.id, { status: "deleted" });
      setDeletingCategory(undefined);
      reload();
    } catch (error) {
      setDeleteError(error);
    } finally {
      setDeletePending(false);
    }
  };

  const importErrorMessage = (code: keyof ApplicationCatalogMessages["categories"]["importErrors"]): string =>
    copy.importErrors[code] ?? copy.importInvalid;

  const handleImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setImportError(undefined);
    try {
      const plan = planCategoryImport(
        JSON.parse(await file.text()) as unknown,
        "appstore-categories",
        state.items.map((category) => category.code),
      );
      if (plan.errors.length > 0) {
        setImportError(plan.errors.map(importErrorMessage).join(" "));
        return;
      }
      if (plan.items.length === 0) {
        setImportError(copy.importInvalid);
        return;
      }
      setImportPlan(plan);
    } catch {
      setImportError(copy.importInvalid);
    }
  };

  const runImport = async () => {
    if (!importPlan) {
      return;
    }
    setImporting(true);
    setImportError(undefined);
    const idByCode = new Map<string, string>();
    const createdIds: string[] = [];
    try {
      for (const item of importPlan.items) {
        const created = await service.create({
          code: item.code,
          ...(item.parentCode && idByCode.has(item.parentCode)
            ? { parentId: idByCode.get(item.parentCode) }
            : {}),
          level: item.depth,
          sortOrder: item.sortOrder,
          localizations: item.localizations ?? [{ locale: "zh-CN", displayName: item.name }],
        });
        idByCode.set(item.code, created.id);
        createdIds.push(created.id);
        if (item.status === "inactive") {
          await service.update(created.id, { status: "inactive" });
        }
      }
      setImportPlan(undefined);
      setNotice(copy.importSuccess);
      reload();
    } catch (error) {
      // Compensate deepest-first so parents are never deleted before children.
      for (const id of [...createdIds].reverse()) {
        try {
          await service.update(id, { status: "deleted" });
        } catch {
          // Keep the original failure; a stuck rollback is reported below.
        }
      }
      setActionError(error);
      setImportError(copy.importFailed);
      reload();
    } finally {
      setImporting(false);
    }
  };

  const failure = state.error ? categoryFailureMessage(state.error, copy, messages) : undefined;
  const actionFailure = actionError ? categoryFailureMessage(actionError, copy, messages) : undefined;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <FolderTree className="h-4 w-4" />
            {copy.title}
          </h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              void handleImportFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            ref={importInputRef}
            type="file"
          />
          <Button
            onClick={() => importInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {copy.importAction}
          </Button>
          <Button
            disabled={state.items.length === 0}
            onClick={() => {
              const document = buildAppStoreCategoryExport(
                state.items,
                (category) => resolveCategoryDisplayName(category, locale) ?? category.code,
              );
              downloadJsonDocument(
                document,
                `appstore-categories-${new Date().toISOString().slice(0, 10)}.json`,
              );
            }}
            type="button"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            {copy.exportAction}
          </Button>
          <Button disabled={state.status === "loading"} onClick={reload} type="button" variant="outline">
            <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
            {messages.refresh}
          </Button>
        </div>
      </header>

      <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.cascade.depthHint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={copy.cascade.locatePlaceholder}
            className="pl-9"
            onChange={(event) => setLocateQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                locate();
              }
            }}
            placeholder={copy.cascade.locatePlaceholder}
            value={locateQuery}
          />
        </div>
        <Button onClick={locate} size="sm" type="button" variant="outline">
          {copy.cascade.locateAction}
        </Button>
        {locateMiss ? (
          <span className="text-xs text-[var(--sdk-color-state-danger)]">{copy.cascade.locateEmpty}</span>
        ) : null}
      </div>

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {failure ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{failure}</span>
            <Button onClick={reload} size="sm" type="button" variant="outline">
              {messages.retry}
            </Button>
          </span>
        </StatusNotice>
      ) : null}
      {importError ? <StatusNotice tone="danger">{importError}</StatusNotice> : null}
      {actionFailure ? <StatusNotice tone="danger">{actionFailure}</StatusNotice> : null}
      {deleteBlocked ? <StatusNotice tone="warning">{copy.delete.blockedChildren}</StatusNotice> : null}

      {selectedPath.length > 0 ? (
        <p className="truncate text-xs text-[var(--sdk-color-text-muted)]" aria-label={copy.columns.category}>
          {selectedPath.map((node) => node.displayName).join(" → ")}
        </p>
      ) : null}

      <CascadeCategoryManager
        actions={{
          reorder: (dragged, target, position) => {
            void reorderSiblings(dragged, target, position);
          },
          create: (level, parent) => {
            if (level === 1) {
              return (
                <Button
                  onClick={() => setFormTarget({})}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {copy.cascade.addRoot}
                </Button>
              );
            }
            if (!parent) {
              return null;
            }
            return (
              <Button
                onClick={() => setFormTarget({ parentId: parent.id })}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Plus className="h-3.5 w-3.5" />
                {copy.cascade.addChild}
              </Button>
            );
          },
          node: (node, level) => {
            const category = categoriesById.get(node.id);
            if (!category) {
              return null;
            }
            const rowBusy = busyId === category.id;
            const inactive = category.status === "inactive";
            return (
              <div className="flex items-center gap-0.5" data-application-row-actions>
                <Button
                  aria-label={`${copy.cascade.moveUp} ${node.displayName}`}
                  disabled={rowBusy}
                  onClick={() => void moveSibling(category, "up")}
                  size="sm"
                  title={copy.cascade.moveUp}
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`${copy.cascade.moveDown} ${node.displayName}`}
                  disabled={rowBusy}
                  onClick={() => void moveSibling(category, "down")}
                  size="sm"
                  title={copy.cascade.moveDown}
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {level < 5 ? (
                  <Button
                    aria-label={`${copy.cascade.addChild} ${node.displayName}`}
                    disabled={rowBusy}
                    onClick={() => setFormTarget({ parentId: category.id })}
                    size="sm"
                    title={copy.cascade.addChild}
                    type="button"
                    variant="ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  aria-label={`${copy.actions.edit} ${node.displayName}`}
                  disabled={rowBusy}
                  onClick={() => setFormTarget({ category })}
                  size="sm"
                  title={copy.actions.edit}
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`${inactive ? copy.actions.activate : copy.actions.deactivate} ${node.displayName}`}
                  disabled={rowBusy}
                  onClick={() => void applyLifecycle(category)}
                  size="sm"
                  title={inactive ? copy.actions.activate : copy.actions.deactivate}
                  type="button"
                  variant="ghost"
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`${copy.actions.delete} ${node.displayName}`}
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
                  title={copy.actions.delete}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          },
        }}
        initialPathIds={locatePath.length > 0 ? locatePath : initialPathIds}
        items={nodes}
        key={locateKey}
        labels={{
          columnTitles: [
            copy.cascade.level1,
            copy.cascade.level2,
            copy.cascade.level3,
            copy.cascade.level4,
            copy.cascade.level5,
          ],
          empty: copy.cascade.empty,
          emptyColumn: copy.cascade.emptyColumn,
          loading: copy.cascade.loading,
          selectHint: copy.cascade.selectHint,
          dragHint: copy.cascade.dragHint,
        }}
        loading={state.status === "loading"}
        maxDepth={5}
        onSelect={handleSelect}
      />

      {state.hasMore && nextCursor ? (
        <div className="flex justify-center">
          <Button disabled={loadingMore} onClick={() => void loadMore()} size="sm" type="button" variant="ghost">
            {loadingMore ? copy.loadingMore : copy.loadMore}
          </Button>
        </div>
      ) : null}

      {formTarget ? (
        <AppStoreCategoryFormDrawer
          categories={state.items}
          {...(formTarget.category ? { category: formTarget.category } : {})}
          {...(formTarget.parentId ? { initialParentId: formTarget.parentId } : {})}
          messages={messages}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => {
            setFormTarget(undefined);
            setNotice(copy.form.saved);
            reload();
          }}
          service={service}
        />
      ) : null}

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={importing ? copy.importing : copy.importConfirm}
        confirmLoading={importing}
        description={copy.importDescription.replace("{count}", String(importPlan?.items.length ?? 0))}
        onConfirm={() => {
          void runImport();
        }}
        onOpenChange={(open) => {
          if (!open && !importing) {
            setImportPlan(undefined);
            setImportError(undefined);
          }
        }}
        open={Boolean(importPlan)}
        title={copy.importTitle}
      />

      <ConfirmDialog
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
          void confirmDelete();
        }}
        onOpenChange={(open) => {
          if (!open && !deletePending) {
            setDeletingCategory(undefined);
            setDeleteError(undefined);
          }
        }}
        open={Boolean(deletingCategory)}
        title={copy.delete.title}
        tone="danger"
      />
    </section>
  );
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

/** Ancestor-first ids for a deep link such as `?category=<id>`. */
function buildPathIds(
  categoryId: string | undefined,
  categories: readonly AppStoreCategory[],
): readonly string[] {
  if (!categoryId) {
    return [];
  }
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
