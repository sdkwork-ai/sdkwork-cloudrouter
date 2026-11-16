import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus, Sparkles } from "lucide-react";
import { Button, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import { AppFeaturedSlotDrawer } from "./AppFeaturedSlotDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import {
  getAppStoreFeaturedSlotService,
  isAppStoreFeaturedSlotForbidden,
  isAppStoreFeaturedSlotUnavailable,
} from "../services/appstore-featured";
import type { AppStoreFeaturedSlot, AppStoreFeaturedSlotService } from "../types/appstore-featured";

export interface AppFeaturedSlotsPanelProps {
  messages: ApplicationCatalogMessages;
  service?: AppStoreFeaturedSlotService;
}

type LoadState =
  | { status: "loading"; items: readonly AppStoreFeaturedSlot[] }
  | { status: "ready"; items: readonly AppStoreFeaturedSlot[] }
  | { status: "error"; items: readonly AppStoreFeaturedSlot[]; error: unknown };

/** App Store featured-slot administration inside the App Center. */
export function AppFeaturedSlotsPanel({
  messages,
  service: injectedService,
}: AppFeaturedSlotsPanelProps) {
  const copy = messages.featured;
  const service = useMemo(
    () => injectedService ?? getAppStoreFeaturedSlotService(),
    [injectedService],
  );
  const [state, setState] = useState<LoadState>({ status: "loading", items: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [editTarget, setEditTarget] = useState<AppStoreFeaturedSlot>();
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    void service.list().then(
      (page) => {
        if (!cancelled) {
          setState({ status: "ready", items: page.items });
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
          <Sparkles className="mx-auto h-8 w-8 text-[var(--sdk-color-text-muted)]" />
          <h3 className="mt-3 text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyDescription}</p>
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-left text-xs uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">{copy.columns.slot}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.listing}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.status}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.window}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.audience}</th>
                <th className="px-4 py-2.5 font-medium">{copy.columns.platform}</th>
                <th className="px-4 py-2.5 text-right font-medium">{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-default)]">
              {state.items.map((slot) => (
                <tr key={slot.slotCode}>
                  <td className="px-4 py-3 font-medium text-[var(--sdk-color-text-primary)]">
                    {slot.slotCode}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--sdk-color-text-secondary)]">
                    {slot.listingId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={statusLabel(slot.status, copy)}
                      status={slot.status ?? "unknown"}
                      variant={featuredStatusVariant(slot.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">
                    {slot.startsAt || slot.endsAt
                      ? `${formatInstant(slot.startsAt)} → ${formatInstant(slot.endsAt)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">{slot.audienceScope ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--sdk-color-text-muted)]">{slot.platformScope ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      onClick={() => {
                        setNotice(undefined);
                        setEditTarget(slot);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {copy.editAction}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editTarget ? (
        <AppFeaturedSlotDrawer
          messages={messages}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => {
            setNotice(messages.featured.dialog.success);
            setReloadToken((token) => token + 1);
          }}
          service={service}
          slot={editTarget}
        />
      ) : null}

      {createOpen ? (
        <AppFeaturedSlotDrawer
          isNew
          messages={messages}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setNotice(messages.featured.dialog.success);
            setReloadToken((token) => token + 1);
          }}
          service={service}
          slot={{ slotCode: "", listingId: "", status: "SCHEDULED" }}
        />
      ) : null}
    </section>
  );
}

function statusLabel(
  status: string | undefined,
  copy: ApplicationCatalogMessages["featured"],
): string {
  const known = copy.dialog.statuses[
    status as keyof ApplicationCatalogMessages["featured"]["dialog"]["statuses"]
  ];
  return known ?? status ?? "—";
}

function featuredStatusVariant(
  status: string | undefined,
): "success" | "warning" | "danger" | "default" | "secondary" {
  if (status === "ACTIVE") {
    return "success";
  }
  return status === "SCHEDULED" ? "warning" : "secondary";
}

function errorMessage(error: unknown, copy: ApplicationCatalogMessages["featured"]): string {
  if (isAppStoreFeaturedSlotForbidden(error)) {
    return copy.forbidden;
  }
  if (isAppStoreFeaturedSlotUnavailable(error)) {
    return copy.unavailable;
  }
  return copy.loadError;
}

function formatInstant(value: string | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
