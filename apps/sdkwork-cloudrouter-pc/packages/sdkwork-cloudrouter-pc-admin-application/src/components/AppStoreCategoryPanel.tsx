import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderTree, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
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
export function AppStoreCategoryPanel({
  messages,
  service: injectedService,
}: {
  messages: ApplicationCatalogMessages;
  service?: AppStoreCategoryService;
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
          <Button disabled={state.status === "loading"} onClick={reload} type="button" variant="outline">
            <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
            {messages.refresh}
          </Button>
        </div>
      </header>

      <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.cascade.depthHint}</p>

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
      {actionFailure ? <StatusNotice tone="danger">{actionFailure}</StatusNotice> : null}
      {deleteBlocked ? <StatusNotice tone="warning">{copy.delete.blockedChildren}</StatusNotice> : null}

      <CascadeCategoryManager
        actions={{
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
        items={nodes}
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
        }}
        loading={state.status === "loading"}
        maxDepth={5}
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
