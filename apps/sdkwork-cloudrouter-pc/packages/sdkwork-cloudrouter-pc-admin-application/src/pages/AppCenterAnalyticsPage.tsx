import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3 } from "lucide-react";
import { StatusNotice } from "@sdkwork/ui-pc-react";

import {
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
} from "../components/AppCenterListShell";
import { useApplicationCatalogMessages } from "../i18n";
import {
  loadAppCenterAnalytics,
  type AppCenterAnalyticsResult,
} from "../services/app-center-analytics";
import { getApplicationScaffoldService } from "../services/application-scaffolds";
import { getApplicationScaffoldAdminService } from "../services/application-scaffold-admin";
import { getAppStoreModerationService } from "../services/appstore-moderation";
import { getAppStorePublisherService } from "../services/appstore-publishers";
import { getAppStoreListingService } from "../services/appstore-listings";
import { getAppStoreCollectionService } from "../services/appstore-collections";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; result: AppCenterAnalyticsResult }
  | { status: "error" };

/** Operations snapshot for the App Center. */
export function AppCenterAnalyticsPage() {
  const messages = useApplicationCatalogMessages();
  const copy = messages.analytics;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void loadAppCenterAnalytics({
      scaffolds: getApplicationScaffoldService(),
      scaffoldAdmin: getApplicationScaffoldAdminService(),
      moderation: getAppStoreModerationService(),
      publishers: getAppStorePublisherService(),
      listings: getAppStoreListingService(),
      collections: getAppStoreCollectionService(),
    }).then(
      (result) => {
        if (!cancelled) {
          setState({ status: "ready", result });
        }
      },
      () => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const result = state.status === "ready" ? state.result : undefined;
  const snapshot = result?.snapshot;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
      <AppCenterListHeader
        actions={(
          <AppCenterRefreshButton
            busy={state.status === "loading"}
            label={copy.refresh}
            onRefresh={() => setReloadToken((token) => token + 1)}
          />
        )}
        description={copy.description}
        title={(
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {copy.title}
          </span>
        )}
      />

      {state.status === "error" ? (
        <AppCenterLoadFailure
          message={copy.loadError}
          onRetry={() => setReloadToken((token) => token + 1)}
          retryLabel={messages.retry}
        />
      ) : null}

      {result && result.failures.length > 0 ? (
        <StatusNotice tone="warning">
          {copy.inaccessible}{" "}
          {result.failures.map((failure) => copy.failureSource[failure.source]).join(", ")}
        </StatusNotice>
      ) : null}

      {state.status === "loading" && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-app-center-analytics-loading>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4"
              key={index}
            >
              <span className="sr-only">{copy.loading}</span>
              <span className="block h-3 w-24 animate-pulse rounded bg-[var(--sdk-color-surface-panel-muted)]" />
              <span className="mt-2 block h-7 w-12 animate-pulse rounded bg-[var(--sdk-color-surface-panel-muted)]" />
            </div>
          ))}
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label={copy.kpi.pendingScaffolds} value={snapshot.scaffoldsByStatus.PENDING_REVIEW} to="/admin/applications/scaffold-reviews" />
            <Kpi label={copy.kpi.pendingModeration} value={snapshot.moderationPending} to="/admin/applications/moderation" />
            <Kpi label={copy.kpi.publishers} value={snapshot.publishersTotal} to="/admin/applications/publishers" />
            <Kpi label={copy.kpi.listings} value={snapshot.listingsTotal} to="/admin/applications/listings" />
            <Kpi label={copy.kpi.collections} value={snapshot.collectionsTotal} to="/admin/applications/collections" />
            <Kpi label={copy.kpi.scaffoldCategories} value={snapshot.scaffoldCategoriesTotal} to="/admin/applications/scaffold-categories" />
          </div>

          <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
            <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.structureTitle}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "DISABLED"] as const).map((status) => (
                <div
                  className="flex items-center justify-between rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-2 text-sm"
                  key={status}
                >
                  <span className="text-[var(--sdk-color-text-secondary)]">{messages.scaffolds.statuses[status]}</span>
                  <span className="font-semibold text-[var(--sdk-color-text-primary)]">
                    {snapshot.scaffoldsByStatus[status]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
            <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.quickTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <QuickLink to="/admin/applications/scaffold-reviews" label={copy.kpi.pendingScaffolds} />
              <QuickLink to="/admin/applications/moderation" label={copy.kpi.pendingModeration} />
              <QuickLink to="/admin/applications/publishers" label={copy.kpi.publishers} />
              <QuickLink to="/admin/applications/featured" label={messages.featured.title} />
              <QuickLink to="/admin/applications/collections" label={copy.kpi.collections} />
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function Kpi({ label, to, value }: { label: string; to: string; value: number }) {
  return (
    <Link
      className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4 transition-colors hover:border-[var(--sdk-color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]"
      to={to}
    >
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">{value}</p>
    </Link>
  );
}

function QuickLink({ label, to }: { label: string; to: string }) {
  return (
    <Link
      className="inline-flex items-center gap-1 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-1.5 text-sm text-[var(--sdk-color-text-secondary)] transition-colors hover:border-[var(--sdk-color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]"
      to={to}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
