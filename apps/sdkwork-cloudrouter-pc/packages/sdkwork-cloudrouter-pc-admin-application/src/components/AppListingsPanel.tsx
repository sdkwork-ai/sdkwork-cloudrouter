import { useEffect, useMemo, useState } from "react";
import { Button, DataTable, type DataTableColumn, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import {
  AppCenterCursorFooter,
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
  appCenterTableSlots,
  cursorCountText,
} from "./AppCenterListShell";
import { AppListingDetailDrawer } from "./AppListingDetailDrawer";
import { AppListingVisibilityDrawer } from "./AppListingVisibilityDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import { listingStatusVariant, visibilityVariant } from "../services/appstore-listing-presentation";
import {
  getAppStoreListingService,
  isAppStoreListingForbidden,
  isAppStoreListingUnavailable,
} from "../services/appstore-listings";
import type { AppStoreListing, AppStoreListingService } from "../types/appstore-listings";

export interface AppListingsPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStoreListingService;
}

type LoadState =
  | { status: "loading"; items: readonly AppStoreListing[] }
  | { status: "ready"; items: readonly AppStoreListing[] }
  | { status: "error"; items: readonly AppStoreListing[]; error: unknown };

/**
 * App Store listing administration inside the App Center.
 *
 * The list is cursor-paginated. Publishing state and storefront visibility are
 * two separate facets, so they get two badges and two row commands: reading the
 * detail, and changing what the storefront shows.
 */
export function AppListingsPanel({ messages, service: injectedService }: AppListingsPanelProps) {
  const copy = messages.listings;
  const service = useMemo(
    () => injectedService ?? getAppStoreListingService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [visibilityTarget, setVisibilityTarget] = useState<AppStoreListing>();
  const [detailTarget, setDetailTarget] = useState<AppStoreListing>();
  const [notice, setNotice] = useState<string>();

  const refresh = () => setReloadToken((token) => token + 1);

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

  const columns = useMemo<DataTableColumn<AppStoreListing>[]>(() => [
    {
      cell: (listing) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
            {listing.displayName}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
            {listing.listingCode ?? listing.listingId}
          </div>
        </div>
      ),
      header: copy.columns.listing,
      id: "listing",
    },
    {
      cell: (listing) => listing.publisherName ?? listing.publisherId ?? "—",
      header: copy.columns.publisher,
      id: "publisher",
    },
    {
      cell: (listing) => (
        <StatusBadge
          label={statusLabel(listing.listingStatus, copy)}
          status={listing.listingStatus}
          variant={listingStatusVariant(listing.listingStatus)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (listing) => (
        <StatusBadge
          label={visibilityLabel(listing.storefrontVisibility, copy)}
          status={listing.storefrontVisibility ?? "unknown"}
          variant={visibilityVariant(listing.storefrontVisibility)}
        />
      ),
      header: copy.columns.visibility,
      id: "visibility",
    },
    {
      cell: (listing) => listing.categoryCode ?? "—",
      header: copy.columns.category,
      id: "category",
    },
    {
      cell: (listing) => listing.platform ?? "—",
      header: copy.columns.platform,
      id: "platform",
    },
    {
      cell: (listing) => listing.latestReleaseVersion ?? "—",
      header: copy.columns.version,
      id: "version",
    },
    {
      cell: (listing) => (formatDateTime(listing.updatedAt)),
      header: copy.columns.updatedAt,
      id: "updatedAt",
    },
  ], [copy]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="listings">
      <AppCenterListHeader
        actions={(
          <AppCenterRefreshButton busy={busy} label={copy.refresh} onRefresh={refresh} />
        )}
        description={copy.description}
        title={copy.title}
      />

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      {state.status === "error" ? (
        <AppCenterLoadFailure
          message={errorMessage(state.error, copy)}
          onRetry={refresh}
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
        getRowId={(listing) => listing.listingId}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(listing) => (
          <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              onClick={() => {
                setNotice(undefined);
                setDetailTarget(listing);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {copy.detailAction}
            </Button>
            <Button
              onClick={() => {
                setNotice(undefined);
                setVisibilityTarget(listing);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.visibilityAction}
            </Button>
          </div>
        )}
        rowActionsLabel={copy.columns.actions}
        rows={[...state.items]}
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {visibilityTarget ? (
        <AppListingVisibilityDrawer
          listing={visibilityTarget}
          messages={messages}
          onClose={() => setVisibilityTarget(undefined)}
          onSaved={() => {
            setNotice(messages.listings.dialog.success);
            refresh();
          }}
          service={service}
        />
      ) : null}

      {detailTarget ? (
        <AppListingDetailDrawer
          listing={detailTarget}
          messages={messages}
          onClose={() => setDetailTarget(undefined)}
          service={service}
        />
      ) : null}
    </section>
  );
}

function visibilityLabel(
  visibility: string | undefined,
  copy: ApplicationCatalogMessages["listings"],
): string {
  const known = copy.visibility[visibility as keyof ApplicationCatalogMessages["listings"]["visibility"]];
  return known ?? copy.visibility.unknown;
}

function statusLabel(
  status: string | undefined,
  copy: ApplicationCatalogMessages["listings"],
): string {
  const known = copy.statuses[status as keyof ApplicationCatalogMessages["listings"]["statuses"]];
  return known ?? status ?? copy.statuses.UNKNOWN;
}

function errorMessage(error: unknown, copy: ApplicationCatalogMessages["listings"]): string {
  if (isAppStoreListingForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreListingUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}

