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
import { AppPublisherVerifyDrawer } from "./AppPublisherVerifyDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import {
  getAppStorePublisherService,
  isAppStorePublisherForbidden,
  isAppStorePublisherUnavailable,
} from "../services/appstore-publishers";
import type { AppStorePublisher, AppStorePublisherService } from "../types/appstore-publishers";

export interface AppPublishersPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStorePublisherService;
}

type LoadState =
  | { status: "loading"; items: readonly AppStorePublisher[] }
  | { status: "ready"; items: readonly AppStorePublisher[] }
  | { status: "error"; items: readonly AppStorePublisher[]; error: unknown };

/**
 * App Store publisher administration inside the App Center.
 *
 * The list is cursor-paginated (`nextCursor` + `hasMore`), so the footer prints
 * how many publishers are loaded and offers "load more" rather than a page
 * number it cannot compute. Verification decisions open the shared drawer and
 * reload the first page so the badge the operator just changed is the badge the
 * table shows.
 */
export function AppPublishersPanel({ messages, service: injectedService }: AppPublishersPanelProps) {
  const copy = messages.publishers;
  const service = useMemo(
    () => injectedService ?? getAppStorePublisherService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [verifyTarget, setVerifyTarget] = useState<AppStorePublisher>();
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

  const columns = useMemo<DataTableColumn<AppStorePublisher>[]>(() => [
    {
      cell: (publisher) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
            {publisher.displayName}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
            {publisher.publisherId}
          </div>
        </div>
      ),
      header: copy.columns.publisher,
      id: "publisher",
    },
    {
      cell: (publisher) => publisher.publisherType ?? "—",
      header: copy.columns.type,
      id: "type",
    },
    {
      cell: (publisher) => (
        <StatusBadge
          label={publisherStatusLabel(publisher.status, copy)}
          status={publisher.status ?? "unknown"}
          variant={publisher.status === "ACTIVE" || publisher.status === "active" ? "success" : "secondary"}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (publisher) => (
        <StatusBadge
          label={verificationStatusLabel(publisher.verificationStatus, copy)}
          status={publisher.verificationStatus ?? "unknown"}
          variant={verificationVariant(publisher.verificationStatus)}
        />
      ),
      header: copy.columns.verification,
      id: "verification",
    },
    {
      cell: (publisher) => (
        <div className="min-w-0">
          <div className="truncate">{publisher.supportEmail ?? "—"}</div>
          {publisher.websiteUrl ? (
            <div className="truncate text-xs">{publisher.websiteUrl}</div>
          ) : null}
        </div>
      ),
      header: copy.columns.contact,
      id: "contact",
    },
    {
      cell: (publisher) => formatDateTime(publisher.createdAt),
      header: copy.columns.createdAt,
      id: "createdAt",
    },
  ], [copy]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="publishers">
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
        getRowId={(publisher) => publisher.publisherId}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(publisher) => (
          needsVerification(publisher.verificationStatus) ? (
            <Button
              onClick={() => {
                setNotice(undefined);
                setVerifyTarget(publisher);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.verifyAction}
            </Button>
          ) : (
            <span className="text-xs text-[var(--sdk-color-text-muted)]">—</span>
          )
        )}
        rowActionsLabel={copy.columns.actions}
        rows={[...state.items]}
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {verifyTarget ? (
        <AppPublisherVerifyDrawer
          messages={messages}
          onClose={() => setVerifyTarget(undefined)}
          onVerified={() => {
            setNotice(messages.publishers.dialog.success);
            refresh();
          }}
          publisher={verifyTarget}
          service={service}
        />
      ) : null}
    </section>
  );
}

function verificationVariant(
  status: string | undefined,
): "success" | "warning" | "danger" | "default" | "secondary" {
  if (status === "APPROVED" || status === "VERIFIED" || status === "approved") {
    return "success";
  }
  if (status === "REJECTED" || status === "rejected") {
    return "danger";
  }
  return status === "PENDING" || status === "pending" ? "warning" : "secondary";
}

function publisherStatusLabel(
  status: string | undefined,
  copy: ApplicationCatalogMessages["publishers"],
): string {
  const known = copy.statuses[status as keyof ApplicationCatalogMessages["publishers"]["statuses"]];
  return known ?? status ?? copy.statuses.UNKNOWN;
}

function verificationStatusLabel(
  status: string | undefined,
  copy: ApplicationCatalogMessages["publishers"],
): string {
  const known = copy.verificationStatuses[
    status as keyof ApplicationCatalogMessages["publishers"]["verificationStatuses"]
  ];
  return known ?? status ?? copy.verificationStatuses.UNKNOWN;
}

function needsVerification(status: string | undefined): boolean {
  return status !== "APPROVED" && status !== "VERIFIED" && status !== "approved" && status !== "verified";
}

function errorMessage(error: unknown, copy: ApplicationCatalogMessages["publishers"]): string {
  if (isAppStorePublisherForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStorePublisherUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}
