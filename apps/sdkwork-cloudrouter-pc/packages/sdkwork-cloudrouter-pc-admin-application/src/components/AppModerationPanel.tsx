import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  type DataTableColumn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import {
  AppCenterCursorFooter,
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
  appCenterTableSlots,
  cursorCountText,
} from "./AppCenterListShell";
import { AppModerationDecisionDrawer } from "./AppModerationDecisionDrawer";
import { AppModerationReviewDrawer } from "./AppModerationReviewDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import {
  getAppStoreModerationService,
  isAppStoreModerationForbidden,
  isAppStoreModerationUnavailable,
} from "../services/appstore-moderation";
import type {
  AppStoreModerationQueueItem,
  AppStoreModerationService,
} from "../types/appstore-moderation";

export interface AppModerationPanelProps {
  messages: ApplicationCatalogMessages;
  /** Injected for tests; defaults to the App Store backend service. */
  service?: AppStoreModerationService;
}

const REVIEW_STATUS_FILTERS = [
  "PENDING",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
] as const;

const ALL_STATUS_FILTER = "all";

type LoadState =
  | { status: "loading"; items: readonly AppStoreModerationQueueItem[] }
  | { status: "ready"; items: readonly AppStoreModerationQueueItem[] }
  | { status: "error"; items: readonly AppStoreModerationQueueItem[]; error: unknown };

/**
 * App Store moderation queue inside the App Center.
 *
 * The status filter is a server facet, so it sits in the header row next to
 * refresh and re-queries the first page: a queue whose filter only trimmed the
 * rows already loaded would hide every pending submission on page 2.
 */
export function AppModerationPanel({ messages, service: injectedService }: AppModerationPanelProps) {
  const copy = messages.moderation;
  const service = useMemo(
    () => injectedService ?? getAppStoreModerationService(),
    [injectedService],
  );
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [decisionTarget, setDecisionTarget] = useState<AppStoreModerationQueueItem>();
  const [detailTarget, setDetailTarget] = useState<AppStoreModerationQueueItem>();
  const [notice, setNotice] = useState<string>();

  const refresh = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    setNextCursor(undefined);
    setHasMore(false);
    setTotal(undefined);
    void service.listQueue({
      ...(statusFilter && statusFilter !== ALL_STATUS_FILTER ? { reviewStatus: statusFilter } : {}),
      pageSize: 50,
    }).then(
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
  }, [reloadToken, service, statusFilter]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await service.listQueue({
        ...(statusFilter && statusFilter !== ALL_STATUS_FILTER ? { reviewStatus: statusFilter } : {}),
        cursor: nextCursor,
        pageSize: 50,
      });
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

  const columns = useMemo<DataTableColumn<AppStoreModerationQueueItem>[]>(() => [
    {
      cell: (item) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
            {item.listingName}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
            {item.reviewId}
          </div>
        </div>
      ),
      header: copy.columns.listing,
      id: "listing",
    },
    {
      cell: (item) => submissionTypeLabel(item.submissionType, copy),
      header: copy.columns.submissionType,
      id: "submissionType",
    },
    {
      cell: (item) => (
        <StatusBadge
          label={statusLabel(item.reviewStatus, copy)}
          status={item.reviewStatus}
          variant={statusVariant(item.reviewStatus)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (item) => item.assignedTo ?? "—",
      header: copy.columns.assignee,
      id: "assignee",
    },
    {
      cell: (item) => (formatDateTime(item.submittedAt)),
      header: copy.columns.submittedAt,
      id: "submittedAt",
    },
  ], [copy]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="moderation">
      <AppCenterListHeader
        actions={(
          <AppCenterRefreshButton busy={busy} label={copy.refresh} onRefresh={refresh} />
        )}
        description={copy.description}
        title={copy.title}
        toolbar={(
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label={copy.filters.status} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_FILTER}>{copy.filters.all}</SelectItem>
              {REVIEW_STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status, copy)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        getRowId={(item) => item.reviewId}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(item) => (
          <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              onClick={() => {
                setNotice(undefined);
                setDetailTarget(item);
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
                setDecisionTarget(item);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.reviewAction}
            </Button>
          </div>
        )}
        rowActionsLabel={copy.columns.actions}
        rows={[...state.items]}
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {decisionTarget ? (
        <AppModerationDecisionDrawer
          item={decisionTarget}
          messages={messages}
          onAssigned={refresh}
          onClose={() => setDecisionTarget(undefined)}
          onDecided={() => {
            setNotice(messages.moderation.decision.success);
            refresh();
          }}
          service={service}
        />
      ) : null}

      {detailTarget ? (
        <AppModerationReviewDrawer
          item={detailTarget}
          messages={messages}
          onClose={() => setDetailTarget(undefined)}
          service={service}
        />
      ) : null}
    </section>
  );
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" | "secondary" {
  if (status === "APPROVED") {
    return "success";
  }
  if (status === "REJECTED") {
    return "danger";
  }
  if (status === "CHANGES_REQUESTED") {
    return "warning";
  }
  return status === "IN_REVIEW" ? "default" : "secondary";
}

function statusLabel(
  status: string,
  copy: ApplicationCatalogMessages["moderation"],
): string {
  const known = copy.statuses[status as keyof ApplicationCatalogMessages["moderation"]["statuses"]];
  return known ?? copy.statuses.unknown;
}

function submissionTypeLabel(
  type: string,
  copy: ApplicationCatalogMessages["moderation"],
): string {
  const known = copy.submissionTypes[type as keyof ApplicationCatalogMessages["moderation"]["submissionTypes"]];
  return known ?? copy.submissionTypes.unknown;
}

function errorMessage(
  error: unknown,
  copy: ApplicationCatalogMessages["moderation"],
): string {
  if (isAppStoreModerationForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreModerationUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}

