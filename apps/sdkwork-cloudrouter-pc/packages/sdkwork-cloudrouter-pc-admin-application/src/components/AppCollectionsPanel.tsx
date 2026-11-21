import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button, DataTable, type DataTableColumn, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import {
  AppCenterCursorFooter,
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
  appCenterTableSlots,
  cursorCountText,
} from "./AppCenterListShell";
import { AppCollectionCreateDrawer } from "./AppCollectionCreateDrawer";
import { AppCollectionEditDrawer } from "./AppCollectionEditDrawer";
import { AppCollectionItemsDrawer } from "./AppCollectionItemsDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import {
  getAppStoreCollectionService,
  isAppStoreCollectionForbidden,
  isAppStoreCollectionUnavailable,
} from "../services/appstore-collections";
import type { AppStoreCollection, AppStoreCollectionService } from "../types/appstore-collections";

export interface AppCollectionsPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStoreCollectionService;
}

type LoadState =
  | { status: "loading"; items: readonly AppStoreCollection[] }
  | { status: "ready"; items: readonly AppStoreCollection[] }
  | { status: "error"; items: readonly AppStoreCollection[]; error: unknown };

/**
 * App Store editorial collections inside the App Center.
 *
 * Creating a collection is the primary command, so it sits in the header next to
 * refresh; the row commands edit the collection's metadata or its composure.
 * Every write reloads the first page so the table never shows a stale count.
 */
export function AppCollectionsPanel({ messages, service: injectedService }: AppCollectionsPanelProps) {
  const copy = messages.collections;
  const service = useMemo(
    () => injectedService ?? getAppStoreCollectionService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppStoreCollection>();
  const [itemsTarget, setItemsTarget] = useState<AppStoreCollection>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    setNextCursor(undefined);
    setHasMore(false);
    setTotal(undefined);
    void service.list({ pageSize: 50 }).then(
      (page) => {
        if (!cancelled) {
          setState({ status: "ready", items: page.items });
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
          setTotal(page.total);
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

  const loadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await service.list({ cursor: nextCursor, pageSize: 50 });
      setState((current) => ({ status: "ready", items: [...current.items, ...page.items] }));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setTotal((current) => page.total ?? current);
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error }));
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = (success?: string) => {
    if (success) {
      setNotice(success);
    } else {
      setNotice(undefined);
    }
    setReloadToken((token) => token + 1);
  };

  const columns = useMemo<DataTableColumn<AppStoreCollection>[]>(() => [
    {
      cell: (collection) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
            {collection.displayName ?? collection.collectionCode}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
            {collection.collectionCode}
          </div>
        </div>
      ),
      header: copy.columns.collection,
      id: "collection",
    },
    {
      cell: (collection) => typeLabel(collection.collectionType, copy),
      header: copy.columns.type,
      id: "type",
    },
    {
      cell: (collection) => audienceLabel(collection.audienceScope, copy),
      header: copy.columns.audience,
      id: "audience",
    },
    {
      cell: (collection) => (
        <StatusBadge
          label={statusLabel(collection.status, copy)}
          status={collection.status ?? "unknown"}
          variant={collectionStatusVariant(collection.status)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (collection) => collection.itemCount ?? "—",
      header: copy.columns.items,
      id: "items",
    },
    {
      cell: (collection) => collection.sortOrder ?? "—",
      header: copy.columns.sortOrder,
      id: "sortOrder",
    },
  ], [copy]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="collections">
      <AppCenterListHeader
        actions={(
          <>
            <AppCenterRefreshButton busy={busy} label={copy.refresh} onRefresh={() => refresh()} />
            <Button
              onClick={() => {
                setNotice(undefined);
                setCreateOpen(true);
              }}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {copy.createAction}
            </Button>
          </>
        )}
        description={copy.description}
        title={copy.title}
      />

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      {state.status === "error" ? (
        <AppCenterLoadFailure
          message={errorMessage(state.error, copy)}
          onRetry={() => refresh()}
          retryLabel={copy.retry}
        />
      ) : null}

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        emptyDescription={copy.emptyDescription}
        emptyTitle={copy.emptyTitle}
        footer={(
          <AppCenterCursorFooter
            countText={cursorCountText(messages, state.items.length, total)}
            hasMore={hasMore}
            loadMoreLabel={copy.loadMore}
            loading={loadingMore}
            loadingLabel={messages.pagination.loadingMore}
            onLoadMore={() => { void loadMore(); }}
          />
        )}
        getRowId={(collection) => collection.collectionId}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(collection) => (
          <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              onClick={() => {
                setNotice(undefined);
                setEditTarget(collection);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.editAction}
            </Button>
            <Button
              onClick={() => {
                setNotice(undefined);
                setItemsTarget(collection);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {copy.itemsAction}
            </Button>
          </div>
        )}
        rowActionsLabel={copy.columns.actions}
        rows={[...state.items]}
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {createOpen ? (
        <AppCollectionCreateDrawer
          messages={messages}
          onClose={() => setCreateOpen(false)}
          onCreated={() => refresh(messages.collections.create.success)}
          service={service}
        />
      ) : null}

      {editTarget ? (
        <AppCollectionEditDrawer
          collection={editTarget}
          messages={messages}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => refresh(messages.collections.edit.success)}
          service={service}
        />
      ) : null}

      {itemsTarget ? (
        <AppCollectionItemsDrawer
          collection={itemsTarget}
          messages={messages}
          onClose={() => setItemsTarget(undefined)}
          onSaved={() => refresh(messages.collections.items.success)}
          service={service}
        />
      ) : null}
    </section>
  );
}

function typeLabel(type: string | undefined, copy: ApplicationCatalogMessages["collections"]): string {
  const known = copy.types[type as keyof ApplicationCatalogMessages["collections"]["types"]];
  return known ?? copy.types.unknown;
}

function audienceLabel(
  audience: string | undefined,
  copy: ApplicationCatalogMessages["collections"],
): string {
  const known = copy.audiences[audience as keyof ApplicationCatalogMessages["collections"]["audiences"]];
  return known ?? copy.audiences.unknown;
}

function statusLabel(status: string | undefined, copy: ApplicationCatalogMessages["collections"]): string {
  const known = copy.statuses[status as keyof ApplicationCatalogMessages["collections"]["statuses"]];
  return known ?? copy.statuses.unknown;
}

function collectionStatusVariant(
  status: string | undefined,
): "success" | "warning" | "danger" | "default" | "secondary" {
  if (status === "ACTIVE") {
    return "success";
  }
  return status === "DRAFT" ? "warning" : "secondary";
}

function errorMessage(error: unknown, copy: ApplicationCatalogMessages["collections"]): string {
  if (isAppStoreCollectionForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreCollectionUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}
