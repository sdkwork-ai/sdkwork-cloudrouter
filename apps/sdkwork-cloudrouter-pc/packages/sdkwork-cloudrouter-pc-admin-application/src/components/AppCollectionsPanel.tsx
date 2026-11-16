import { useEffect, useMemo, useState } from "react";
import { FolderHeart, Plus, RefreshCw } from "lucide-react";
import { Button, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

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

/** App Store editorial collections inside the App Center. */
export function AppCollectionsPanel({ messages, service: injectedService }: AppCollectionsPanelProps) {
  const copy = messages.collections;
  const service = useMemo(
    () => injectedService ?? getAppStoreCollectionService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
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
    void service.list({ pageSize: 50 }).then(
      (page) => {
        if (!cancelled) {
          setState({ status: "ready", items: page.items });
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
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
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error }));
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = (success?: string) => {
    if (success) {
      setNotice(success);
    }
    setReloadToken((token) => token + 1);
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.title}</h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={state.status === "loading"}
            onClick={() => setReloadToken((token) => token + 1)}
            type="button"
            variant="outline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} />
            {copy.refresh}
          </Button>
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
        </div>
      </header>

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      {state.status === "error" ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{errorMessage(state.error, copy)}</span>
            <Button
              onClick={() => setReloadToken((token) => token + 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.retry}
            </Button>
          </span>
        </StatusNotice>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
          {copy.loading}
        </p>
      ) : null}

      {state.status === "ready" && state.items.length === 0 ? (
        <div className="rounded-[var(--sdk-radius-card)] border border-dashed border-[var(--sdk-color-border-default)] p-10 text-center">
          <FolderHeart className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.collection}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.type}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.audience}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.items}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.sortOrder}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((collection) => (
                <tr key={collection.collectionId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">
                      {collection.displayName ?? collection.collectionCode}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                      {collection.collectionCode}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-secondary)]">
                    {typeLabel(collection.collectionType, copy)}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {audienceLabel(collection.audienceScope, copy)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={statusLabel(collection.status, copy)}
                      status={collection.status ?? "unknown"}
                      variant={collectionStatusVariant(collection.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {collection.itemCount ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {collection.sortOrder ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasMore && state.status !== "error" ? (
        <div className="flex justify-center">
          <Button disabled={loadingMore} onClick={() => void loadMore()} type="button" variant="outline">
            {copy.loadMore}
          </Button>
        </div>
      ) : null}

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
