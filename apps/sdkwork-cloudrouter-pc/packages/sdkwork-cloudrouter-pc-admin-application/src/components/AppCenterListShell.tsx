import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import {
  Button,
  StatusNotice,
  type DataTableSlotProps,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { templateMessage } from "../services/message-template";

/**
 * Shared list chrome for every App Center list.
 *
 * The App Center hosts a dozen independent lists (deploy apps, store listings,
 * publishers, moderation queues, scaffolds, categories). Every one of them is a
 * server-filtered, server-paged query, so they all render the same three
 * regions:
 *
 * 1. one header row — the list title on the left, and the search box, filters,
 *    and the refresh action on the right. Controls never stack into their own
 *    block above the table, because that pushes the table below the fold and
 *    turns each panel into a slightly different layout;
 * 2. one `DataTable`, which owns loading, empty, and sticky-header behaviour
 *    with the design-system tokens;
 * 3. one footer bar that prints the result total next to the page control
 *    (page numbers for offset lists, "load more" for cursor lists).
 *
 * Keeping those regions here is what stops a panel from inventing its own
 * spacing, its own action cluster, or a second empty state.
 */

/** One header row: the title block on the left, list controls on the right. */
export function AppCenterListHeader({
  actions,
  description,
  title,
  toolbar,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Filters and search for this list, rendered before the actions. */
  toolbar?: ReactNode;
  /** Refresh and similar page-level commands for this list. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{title}</h2>
        {description ? <p className="text-sm text-[var(--sdk-color-text-muted)]">{description}</p> : null}
      </div>
      {toolbar || actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2" data-app-center-toolbar>
          {toolbar}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** The refresh command every list header exposes. */
export function AppCenterRefreshButton({
  busy,
  label,
  onRefresh,
}: {
  busy: boolean;
  label: ReactNode;
  onRefresh: () => void;
}) {
  return (
    <Button
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onRefresh}
      type="button"
      variant="outline"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );
}

/** The result total a list footer prints, in one styled span. */
export function AppCenterCountLabel({ text }: { text: string }) {
  return (
    <span className="text-xs font-medium text-[var(--sdk-color-text-muted)]" data-app-center-count>
      {text}
    </span>
  );
}

/**
 * Table slot props every App Center list shares.
 *
 * The table fills the remaining panel height and scrolls its own viewport, and
 * the footer shell drops its rule and padding so the caller-owned footer bar
 * (pagination or "load more") draws exactly one.
 */
export function appCenterTableSlots(): DataTableSlotProps {
  return {
    footer: { className: "shrink-0 border-t-0 p-0" },
    surface: { className: "flex min-h-0 flex-1 flex-col" },
    viewport: { className: "min-h-0 flex-1" },
  };
}

/**
 * Footer bar for a cursor-paginated list.
 *
 * The backend publishes `nextCursor`/`hasMore` and usually no total, so the bar
 * prints how many rows are loaded and offers one "load more" command. It mirrors
 * `BottomPagination`'s bar so an offset list and a cursor list end the same way.
 */
export function AppCenterCursorFooter({
  countText,
  hasMore,
  loadMoreLabel,
  loading,
  loadingLabel,
  onLoadMore,
}: {
  countText: string;
  hasMore: boolean;
  loadMoreLabel: ReactNode;
  loading: boolean;
  loadingLabel: ReactNode;
  onLoadMore: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10"
      data-app-center-cursor-footer
    >
      <AppCenterCountLabel text={countText} />
      {hasMore ? (
        <Button
          aria-busy={loading || undefined}
          disabled={loading}
          onClick={onLoadMore}
          size="sm"
          type="button"
          variant="outline"
        >
          {loading ? loadingLabel : loadMoreLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Footer bar for a list that answers in one response.
 *
 * Curated collections (featured slots, category trees) are bounded by product
 * rule, so they have nothing to page through — but they still end in the same
 * bar and print the same total, so a reader never wonders where the count went.
 */
export function AppCenterSummaryFooter({ countText }: { countText: string }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10"
      data-app-center-summary-footer
    >
      <AppCenterCountLabel text={countText} />
    </div>
  );
}

/** The failure notice plus retry action every list needs. */
export function AppCenterLoadFailure({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: ReactNode;
}) {
  return (
    <StatusNotice tone="danger">
      <span className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          {retryLabel}
        </Button>
      </span>
    </StatusNotice>
  );
}

/**
 * Footer text for a cursor list: the loaded rows, plus the server total when the
 * backend reports one.
 */
export function cursorCountText(
  messages: ApplicationCatalogMessages,
  loaded: number,
  total?: number,
): string {
  const copy = messages.pagination;
  if (total === undefined) {
    return templateMessage(copy.loadedTemplate, { count: String(loaded) });
  }
  return templateMessage(copy.loadedOfTotalTemplate, {
    loaded: String(loaded),
    total: String(total),
  });
}
