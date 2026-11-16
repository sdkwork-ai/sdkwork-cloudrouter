import { useEffect, useMemo, useState } from "react";
import { FileClock, RefreshCw } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import { AppAppealDecisionDrawer } from "./AppAppealDecisionDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
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

/** Moderation appeal workbench. */
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [decideTarget, setDecideTarget] = useState<AppStoreModerationAppeal>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!service.listAppeals) {
      setState({ status: "error", items: [], error: new Error("appeals unavailable") });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", items: [] });
    setNextCursor(undefined);
    setHasMore(false);
    void service.listAppeals({
      ...(statusFilter !== ALL_STATUSES ? { status: statusFilter } : {}),
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
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <FileClock className="h-4 w-4" />
            {copy.title}
          </h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
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
      </header>

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      {state.status === "error" ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{errorMessage(state.error, copy)}</span>
            <Button onClick={() => setReloadToken((token) => token + 1)} size="sm" type="button" variant="outline">
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
          <FileClock className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.appeal}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.review}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.reason}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.submittedAt}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.decidedAt}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((appeal) => (
                <tr key={appeal.appealId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">
                      {appeal.listingName ?? appeal.listingId ?? appeal.appealId}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                      {appeal.appealId}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--sdk-color-text-muted)]">
                    {appeal.reviewId ?? "—"}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-[var(--sdk-color-text-secondary)]">
                    <span className="line-clamp-2">{appeal.appealReason || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={statusLabel(appeal.appealStatus, messages)}
                      status={appeal.appealStatus}
                      variant={appealStatusVariant(appeal.appealStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {appeal.submittedAt ? formatDate(appeal.submittedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {appeal.decidedAt ? formatDate(appeal.decidedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {service.decideAppeal && isPending(appeal.appealStatus) ? (
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
                    )}
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

      {decideTarget ? (
        <AppAppealDecisionDrawer
          appeal={decideTarget}
          messages={messages}
          onClose={() => setDecideTarget(undefined)}
          onDecided={() => {
            setNotice(messages.appeals.dialog.success);
            setReloadToken((token) => token + 1);
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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
