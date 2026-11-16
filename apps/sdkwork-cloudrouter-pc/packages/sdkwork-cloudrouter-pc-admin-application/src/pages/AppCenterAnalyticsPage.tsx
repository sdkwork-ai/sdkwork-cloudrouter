import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, RefreshCw } from "lucide-react";
import { Button, StatusNotice } from "@sdkwork/ui-pc-react";

import { useApplicationCatalogMessages } from "../i18n";
import {
  loadAppCenterAnalytics,
  type AppCenterAnalyticsResult,
} from "../services/app-center-analytics";
import { getDeployAppTemplateService } from "../services/deploy-app-templates";
import { getDeployTemplateAdminService } from "../services/deploy-template-admin";
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
      templates: getDeployAppTemplateService(),
      templateAdmin: getDeployTemplateAdminService(),
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
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <BarChart3 className="h-4 w-4" />
            {copy.title}
          </h2>
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

      {state.status === "loading" ? (
        <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
          {copy.loading}
        </p>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="danger">{copy.loadError}</StatusNotice>
      ) : null}

      {result && result.failures.length > 0 ? (
        <StatusNotice tone="warning">
          {copy.inaccessible}{" "}
          {result.failures.map((failure) => copy.failureSource[failure.source]).join("、")}
        </StatusNotice>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label={copy.kpi.pendingTemplates} value={snapshot.templatesByStatus.PENDING_REVIEW} to="/admin/applications/template-reviews" />
            <Kpi label={copy.kpi.pendingModeration} value={snapshot.moderationPending} to="/admin/applications/moderation" />
            <Kpi label={copy.kpi.publishers} value={snapshot.publishersTotal} to="/admin/applications/publishers" />
            <Kpi label={copy.kpi.listings} value={snapshot.listingsTotal} to="/admin/applications/listings" />
            <Kpi label={copy.kpi.collections} value={snapshot.collectionsTotal} to="/admin/applications/collections" />
            <Kpi label={copy.kpi.templateCategories} value={snapshot.templateCategoriesTotal} to="/admin/applications/template-categories" />
          </div>

          <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
            <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.structureTitle}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "DISABLED"] as const).map((status) => (
                <div
                  className="flex items-center justify-between rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-2 text-sm"
                  key={status}
                >
                  <span className="text-[var(--sdk-color-text-secondary)]">{messages.templates.statuses[status]}</span>
                  <span className="font-semibold text-[var(--sdk-color-text-primary)]">
                    {snapshot.templatesByStatus[status]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
            <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.quickTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <QuickLink to="/admin/applications/template-reviews" label={copy.kpi.pendingTemplates} />
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
      className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4 transition-colors hover:border-[var(--sdk-color-brand-primary)]"
      to={to}
    >
      <p className="text-xs text-[var(--sdk-color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">{value}</p>
    </Link>
  );
}

function QuickLink({ label, to }: { label: string; to: string }) {
  return (
    <Link
      className="inline-flex items-center gap-1 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-1.5 text-sm text-[var(--sdk-color-text-secondary)] transition-colors hover:border-[var(--sdk-color-brand-primary)]"
      to={to}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
