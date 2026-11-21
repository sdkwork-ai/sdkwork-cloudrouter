import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button, DataTable, type DataTableColumn, StatusBadge, StatusNotice } from "@sdkwork/ui-pc-react";

import {
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
  AppCenterSummaryFooter,
  appCenterTableSlots,
} from "./AppCenterListShell";
import { AppFeaturedSlotDrawer } from "./AppFeaturedSlotDrawer";
import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import { templateMessage } from "../services/message-template";
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

/**
 * App Store featured-slot administration inside the App Center.
 *
 * Featured placements are a curated, bounded set (each slot is one editorial
 * position), so the panel reads the whole catalog once and the footer only
 * prints the total. Both the create and the edit command end in the same drawer,
 * one seeded with an empty slot.
 */
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

  const refresh = (success?: string) => {
    if (success) {
      setNotice(success);
    } else {
      setNotice(undefined);
    }
    setReloadToken((token) => token + 1);
  };

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

  const columns = useMemo<DataTableColumn<AppStoreFeaturedSlot>[]>(() => [
    {
      cell: (slot) => (
        <span className="font-mono text-xs font-medium text-[var(--sdk-color-text-primary)]">
          {slot.slotCode}
        </span>
      ),
      header: copy.columns.slot,
      id: "slot",
    },
    {
      cell: (slot) => <span className="font-mono text-xs">{slot.listingId || "—"}</span>,
      header: copy.columns.listing,
      id: "listing",
    },
    {
      cell: (slot) => (
        <StatusBadge
          label={statusLabel(slot.status, copy)}
          status={slot.status ?? "unknown"}
          variant={featuredStatusVariant(slot.status)}
        />
      ),
      header: copy.columns.status,
      id: "status",
    },
    {
      cell: (slot) => (
        slot.startsAt || slot.endsAt
          ? `${formatDateTime(slot.startsAt)} → ${formatDateTime(slot.endsAt)}`
          : "—"
      ),
      header: copy.columns.window,
      id: "window",
    },
    {
      cell: (slot) => slot.audienceScope ?? "—",
      header: copy.columns.audience,
      id: "audience",
    },
    {
      cell: (slot) => slot.platformScope ?? "—",
      header: copy.columns.platform,
      id: "platform",
    },
  ], [copy]);

  const busy = state.status === "loading";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" data-app-center-panel="featured">
      <AppCenterListHeader
        actions={(
          <>
            <AppCenterRefreshButton busy={busy} label={copy.refresh} onRefresh={() => refresh()} />
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
          </>
        )}
        description={copy.description}
        title={copy.title}
      />

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      {state.status === "error" ? (
        <AppCenterLoadFailure
          message={errorMessage(state.error, copy)}
          onRetry={() => refresh()}
          retryLabel={copy.retry}
        />
      ) : null}

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        emptyDescription={copy.emptyDescription}
        emptyTitle={copy.emptyTitle}
        footer={(
          <AppCenterSummaryFooter
            countText={templateMessage(messages.pagination.totalTemplate, {
              count: String(state.items.length),
            })}
          />
        )}
        getRowId={(slot) => slot.slotCode}
        loading={busy}
        loadingLabel={copy.loading}
        rowActions={(slot) => (
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
        )}
        rowActionsLabel={copy.columns.actions}
        rows={[...state.items]}
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {editTarget ? (
        <AppFeaturedSlotDrawer
          messages={messages}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => refresh(messages.featured.dialog.success)}
          service={service}
          slot={editTarget}
        />
      ) : null}

      {createOpen ? (
        <AppFeaturedSlotDrawer
          isNew
          messages={messages}
          onClose={() => setCreateOpen(false)}
          onSaved={() => refresh(messages.featured.dialog.success)}
          service={service}
          slot={{ listingId: "", slotCode: "", status: "SCHEDULED" }}
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

