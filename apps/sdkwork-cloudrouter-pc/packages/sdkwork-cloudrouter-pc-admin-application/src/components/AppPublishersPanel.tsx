import { useEffect, useMemo, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { Button, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import { AppPublisherVerifyDrawer } from "./AppPublisherVerifyDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
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

/** App Store publisher administration inside the App Center. */
export function AppPublishersPanel({ messages, service: injectedService }: AppPublishersPanelProps) {
  const copy = messages.publishers;
  const service = useMemo(
    () => injectedService ?? getAppStorePublisherService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [verifyTarget, setVerifyTarget] = useState<AppStorePublisher>();
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
          <Building2 className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.publisher}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.type}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.verification}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.contact}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.createdAt}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((publisher) => (
                <tr key={publisher.publisherId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{publisher.displayName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                      {publisher.publisherId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-secondary)]">
                    {publisher.publisherType ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={publisherStatusLabel(publisher.status, copy)}
                      status={publisher.status ?? "unknown"}
                      variant={publisher.status === "ACTIVE" || publisher.status === "active" ? "success" : "secondary"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={verificationStatusLabel(publisher.verificationStatus, copy)}
                      status={publisher.verificationStatus ?? "unknown"}
                      variant={verificationVariant(publisher.verificationStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    <div>{publisher.supportEmail ?? "—"}</div>
                    {publisher.websiteUrl ? (
                      <div className="truncate text-xs">{publisher.websiteUrl}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {publisher.createdAt ? formatDate(publisher.createdAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {needsVerification(publisher.verificationStatus) ? (
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

      {verifyTarget ? (
        <AppPublisherVerifyDrawer
          messages={messages}
          onClose={() => setVerifyTarget(undefined)}
          onVerified={() => {
            setNotice(messages.publishers.dialog.success);
            setReloadToken((token) => token + 1);
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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
