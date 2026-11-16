import { useEffect, useMemo, useState } from "react";
import { ListChecks, RefreshCw } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import { AppModerationDecisionDrawer } from "./AppModerationDecisionDrawer";
import { AppModerationReviewDrawer } from "./AppModerationReviewDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
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

/** App Store moderation queue inside the App Center. */
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [decisionTarget, setDecisionTarget] = useState<AppStoreModerationQueueItem>();
  const [detailTarget, setDetailTarget] = useState<AppStoreModerationQueueItem>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    setNextCursor(undefined);
    setHasMore(false);
    void service.listQueue({
      ...(statusFilter && statusFilter !== ALL_STATUS_FILTER ? { reviewStatus: statusFilter } : {}),
      pageSize: 50,
    }).then(
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
      setState((current) => ({
        status: "ready",
        items: [...current.items, ...page.items],
      }));
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
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.title}</h2>
        <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block text-[var(--sdk-color-text-muted)]">{copy.filters.status}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label={copy.filters.status}>
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
          </label>
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
      </div>

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
          <ListChecks className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.emptyTitle}
          </h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.listing}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.submissionType}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.assignee}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.submittedAt}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((item) => (
                <tr key={item.reviewId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{item.listingName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                      {item.reviewId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-secondary)]">
                    {submissionTypeLabel(item.submissionType, copy)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={statusLabel(item.reviewStatus, copy)}
                      status={item.reviewStatus}
                      variant={statusVariant(item.reviewStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {item.assignedTo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {item.submittedAt ? formatDate(item.submittedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasMore && state.status !== "error" ? (
        <div className="flex justify-center">
          <Button
            disabled={loadingMore}
            onClick={() => void loadMore()}
            type="button"
            variant="outline"
          >
            {copy.loadMore}
          </Button>
        </div>
      ) : null}

      {decisionTarget ? (
        <AppModerationDecisionDrawer
          item={decisionTarget}
          messages={messages}
          onAssigned={() => setReloadToken((token) => token + 1)}
          onClose={() => setDecisionTarget(undefined)}
          onDecided={() => {
            setNotice(messages.moderation.decision.success);
            setReloadToken((token) => token + 1);
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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
