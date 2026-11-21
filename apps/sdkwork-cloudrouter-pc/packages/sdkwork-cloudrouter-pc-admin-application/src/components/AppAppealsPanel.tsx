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
import { AppAppealDecisionDrawer } from "./AppAppealDecisionDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import {
  getAppStoreModerationService,
  isAppStoreModerationForbidden,
  isAppStoreModerationUnavailable,
} from "../services/appstore-moderation";
import type {
  AppStoreModerationAppeal,
  AppStoreModerationService,
} from "../types/appstore-moderation";

const APPEAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const ALL_STATUSES = "all";

export interface AppAppealsPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStoreModerationService;
}

type LoadState =
  | { status: "loading"; items: readonly AppStoreModerationAppeal[] }
  | { status: "ready"; items: readonly AppStoreModerationAppeal[] }
  | { status: "error"; items: readonly AppStoreModerationAppeal[]; error: unknown };

/**
 * Moderation appeal workbench.
 *
 * An appeal is only decidable while it is pending, so the row command appears
 * for exactly those rows; the status filter is a server facet in the header row
 * and every decision reloads the queue so the badge matches the backend.
 */
export function AppAppealsPanel({ messages, service: injectedService }: AppAppealsPanelProps) {
  const copy = messages.appeals;
  const service = useMemo(
    () => injectedService ?? getAppStoreModerationService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [decideTarget, setDecideTarget] = useState<AppStoreModerationAppeal>();
  const [notice, setNotice] = useState<string>();

  const refresh = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    if (!service.listAppeals) {
      setState({ status: "error", items: [], error: new Error("appeals unavailable") });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", items: [] });
    setNextCursor(undefined);
    setHasMore(false);
    setTotal(undefined);
    void service.listAppeals({
      ...(statusFilter !== ALL_STATUSES ? { status: statusFilter } : {}),
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
    if (!nextCursor || loadingMore || !service.listAppeals) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await service.listAppeals({
        ...(statusFilter !== ALL_STATUSES ? { status: statusFilter } : {}),
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

  const columns = useMemo<DataTableColumn<AppStoreModerationAppeal>[]>(() => [
    {
      cell: (appeal) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">
            {appeal.listingName ?? appeal.listingId ?? appeal.appealId}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
            {appeal.appealId}
          </div>
        </div>
      ),
      header: copy.columns.appeal,
      id: "appeal",
    },
    {
      cell: (appeal) => (
        <span className="font-mono text-xs">{appeal.reviewId ?? "—"}</span>
      ),
      header: copy.columns.review,
      id: "review",
    },
    {
      cell: (appeal) => (
        <span className="line-clamp-2 max-w-[280px]">{appeal.appealReason || "—"}</span>
      ),
      header: copy.columns.reason,
      id: "reason",
    },
    {
      cell: (appeal) => (
        <StatusBadge
          label={statusLabel(appeal.appealStatus, messages)}
          status={appeal.appealStatus}
          variant={appealStatusVariant(appeal.appealStatus)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (appeal) => (formatDateTime(appeal.submittedAt)),
      header: copy.columns.submittedAt,
      id: "submittedAt",
    },
    {
      cell: (appeal) => (formatDateTime(appeal.decidedAt)),
      header: copy.columns.decidedAt,
      id: "decidedAt",
    },
  ], [copy, messages]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="appeals">
      <AppCenterListHeader
        actions={(
          <AppCenterRefreshButton busy={busy} label={copy.refresh} onRefresh={refresh} />
        )}
        description={copy.description}
        title={copy.title}
        toolbar={(
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger aria-label={copy.filters.status} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>{copy.filters.all}</SelectItem>
              {APPEAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status, messages)}
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
        getRowId={(appeal) => appeal.appealId}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(appeal) => (
          service.decideAppeal && isPending(appeal.appealStatus) ? (
            <Button
              onClick={() => {
                setNotice(undefined);
                setDecideTarget(appeal);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {copy.decideAction}
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

      {decideTarget ? (
        <AppAppealDecisionDrawer
          appeal={decideTarget}
          messages={messages}
          onClose={() => setDecideTarget(undefined)}
          onDecided={() => {
            setNotice(messages.appeals.dialog.success);
            refresh();
          }}
          service={service}
        />
      ) : null}
    </section>
  );
}

function isPending(status: string): boolean {
  return status.toUpperCase() === "PENDING";
}

function statusLabel(status: string, messages: ApplicationCatalogMessages): string {
  const known = messages.appeals.statuses[
    status as keyof ApplicationCatalogMessages["appeals"]["statuses"]
  ];
  return known ?? messages.appeals.statuses.UNKNOWN;
}

function appealStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "default" | "secondary" {
  const normalized = status.toUpperCase();
  if (normalized === "APPROVED") {
    return "success";
  }
  if (normalized === "REJECTED") {
    return "danger";
  }
  return normalized === "PENDING" ? "warning" : "secondary";
}

function errorMessage(error: unknown, copy: ApplicationCatalogMessages["appeals"]): string {
  if (isAppStoreModerationForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreModerationUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}

