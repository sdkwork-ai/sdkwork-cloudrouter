import { useEffect, useMemo, useState } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { Button, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import { AppListingDetailDrawer } from "./AppListingDetailDrawer";
import { AppListingVisibilityDrawer } from "./AppListingVisibilityDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
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

/** App Store listing visibility administration inside the App Center. */
export function AppListingsPanel({ messages, service: injectedService }: AppListingsPanelProps) {
  const copy = messages.listings;
  const service = useMemo(
    () => injectedService ?? getAppStoreListingService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [visibilityTarget, setVisibilityTarget] = useState<AppStoreListing>();
  const [detailTarget, setDetailTarget] = useState<AppStoreListing>();
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

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.title}</h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <Button
          disabled={state.status === "loading"}
          onClick={() => setReloadToken((token) => token + 1)}
          type="button"
          variant="outline"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} />
          {copy.refresh}
        </Button>
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
          <Globe className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.listing}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.publisher}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.visibility}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.category}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.platform}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.version}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.updatedAt}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((listing) => (
                <tr key={listing.listingId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{listing.displayName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                      {listing.listingCode ?? listing.listingId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-secondary)]">
                    {listing.publisherName ?? listing.publisherId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={statusLabel(listing.listingStatus, copy)}
                      status={listing.listingStatus}
                      variant={listingStatusVariant(listing.listingStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={visibilityLabel(listing.storefrontVisibility, copy)}
                      status={listing.storefrontVisibility ?? "unknown"}
                      variant={visibilityVariant(listing.storefrontVisibility)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">{listing.categoryCode ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">{listing.platform ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {listing.latestReleaseVersion ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {listing.updatedAt ? formatDate(listing.updatedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
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

      {visibilityTarget ? (
        <AppListingVisibilityDrawer
          listing={visibilityTarget}
          messages={messages}
          onClose={() => setVisibilityTarget(undefined)}
          onSaved={() => {
            setNotice(messages.listings.dialog.success);
            setReloadToken((token) => token + 1);
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

function listingStatusVariant(
  status: string | undefined,
): "success" | "warning" | "danger" | "default" | "secondary" {
  const normalized = status?.toUpperCase();
  if (normalized === "PUBLISHED" || normalized === "ACTIVE") {
    return "success";
  }
  if (normalized === "SUSPENDED") {
    return "danger";
  }
  return normalized === "DRAFT" ? "warning" : "secondary";
}

function visibilityVariant(
  visibility: string | undefined,
): "success" | "warning" | "danger" | "default" {
  if (visibility === "VISIBLE") {
    return "success";
  }
  if (visibility === "DELISTED") {
    return "danger";
  }
  return visibility === "HIDDEN" || visibility === "REGION_RESTRICTED" ? "warning" : "default";
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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
