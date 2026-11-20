import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  FolderTree,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Shapes,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  Button,
  StatusBadge,
  StatusNotice,
  type StatusBadgeVariant,
} from "@sdkwork/ui-pc-react";

import { useApplicationCatalogMessages } from "../i18n";
import {
  loadAppStoreApplications,
  loadDeployApplications,
  loadIamApplications,
  resolveApplicationCatalogContext,
} from "../services/application-catalog";
import { getApplicationScaffoldService } from "../services/application-scaffolds";
import { getAppStoreCategoryService } from "../services/appstore-categories";
import { getAppStoreModerationService } from "../services/appstore-moderation";
import type { ApplicationScaffold } from "../types/application-scaffolds";

interface OverviewData {
  iam: number;
  deploy: number;
  appStore: number;
  scaffolds: number;
  scaffoldCategories: number;
  storeCategories: number;
  pendingScaffolds: number;
  pendingModeration: number;
  recentScaffolds: readonly ApplicationScaffold[];
}

const EMPTY_DATA: OverviewData = {
  iam: 0,
  deploy: 0,
  appStore: 0,
  scaffolds: 0,
  scaffoldCategories: 0,
  storeCategories: 0,
  pendingScaffolds: 0,
  pendingModeration: 0,
  recentScaffolds: [],
};

/**
 * Application Center landing page.
 *
 * Aggregates the three application platforms and the scaffold catalog into one
 * operator overview, with quick links into each management surface. A failing
 * source degrades to an "unavailable" notice instead of blanking the page.
 */
export function AppCenterOverviewPage() {
  const messages = useApplicationCatalogMessages();
  const copy = messages.overview;
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [partialFailure, setPartialFailure] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPartialFailure(false);
    void (async () => {
      const scaffoldService = getApplicationScaffoldService();
      const results = await Promise.allSettled([
        resolveApplicationCatalogContext({}),
        scaffoldService.list({ page: 1, pageSize: 5 }),
        scaffoldService.listCategories(),
        getAppStoreCategoryService().list({ pageSize: 100 }),
        scaffoldService.list({ page: 1, pageSize: 1, status: "PENDING_REVIEW" }),
        getAppStoreModerationService().listQueue({ reviewStatus: "PENDING", pageSize: 50 }),
      ]);
      if (cancelled) {
        return;
      }
      const [
        contextResult,
        scaffoldResult,
        scaffoldCategoryResult,
        storeCategoryResult,
        pendingScaffoldResult,
        pendingModerationResult,
      ] = results;
      let failed = 0;
      const context = contextResult.status === "fulfilled" ? contextResult.value : undefined;
      let iam = 0;
      let deploy = 0;
      let appStore = 0;
      if (context) {
        const groups = await Promise.allSettled([
          loadIamApplications(context),
          loadDeployApplications(context),
          loadAppStoreApplications(context),
        ]);
        if (cancelled) {
          return;
        }
        if (groups[0].status === "fulfilled") {
          iam = groups[0].value.length;
        } else {
          failed += 1;
        }
        if (groups[1].status === "fulfilled") {
          deploy = groups[1].value.length;
        } else {
          failed += 1;
        }
        if (groups[2].status === "fulfilled") {
          appStore = groups[2].value.length;
        } else {
          failed += 1;
        }
      } else {
        failed += 1;
      }
      const scaffoldPage = scaffoldResult.status === "fulfilled" ? scaffoldResult.value : undefined;
      if (scaffoldResult.status !== "fulfilled") {
        failed += 1;
      }
      const scaffoldCategories = scaffoldCategoryResult.status === "fulfilled"
        ? scaffoldCategoryResult.value
        : undefined;
      if (scaffoldCategoryResult.status !== "fulfilled") {
        failed += 1;
      }
      const storeCategoryPage = storeCategoryResult.status === "fulfilled"
        ? storeCategoryResult.value
        : undefined;
      if (storeCategoryResult.status !== "fulfilled") {
        failed += 1;
      }
      const pendingScaffolds = pendingScaffoldResult.status === "fulfilled"
        ? pendingScaffoldResult.value.total
        : 0;
      if (pendingScaffoldResult.status !== "fulfilled") {
        failed += 1;
      }
      const pendingModeration = pendingModerationResult.status === "fulfilled"
        ? pendingModerationResult.value.total ?? pendingModerationResult.value.items.length
        : 0;
      if (pendingModerationResult.status !== "fulfilled") {
        failed += 1;
      }
      setData({
        iam,
        deploy,
        appStore,
        scaffolds: scaffoldPage?.total ?? 0,
        scaffoldCategories: scaffoldCategories?.length ?? 0,
        storeCategories: storeCategoryPage?.items.length ?? 0,
        pendingScaffolds,
        pendingModeration,
        recentScaffolds: scaffoldPage?.items.slice(0, 5) ?? [],
      });
      setPartialFailure(failed > 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const totalApplications = data.iam + data.deploy + data.appStore;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.title}</h1>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.description}</p>
        </div>
        <Button
          disabled={loading}
          onClick={() => setReloadToken((token) => token + 1)}
          type="button"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {messages.refresh}
        </Button>
      </header>

      {partialFailure ? <StatusNotice tone="warning">{copy.unavailable}</StatusNotice> : null}

      <section aria-label={copy.kpi.applications} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint={copy.kpiHint.applications}
          icon={<Boxes className="h-4 w-4" />}
          label={copy.kpi.applications}
          value={totalApplications}
        />
        <KpiCard
          hint={copy.kpiHint.scaffolds}
          icon={<Shapes className="h-4 w-4" />}
          label={copy.kpi.scaffolds}
          value={data.scaffolds}
        />
        <KpiCard
          hint={copy.kpiHint.categories}
          icon={<FolderTree className="h-4 w-4" />}
          label={copy.kpi.categories}
          value={data.scaffoldCategories}
        />
        <KpiCard
          hint={copy.kpiHint.storeCategories}
          icon={<Store className="h-4 w-4" />}
          label={copy.kpi.storeCategories}
          value={data.storeCategories}
        />
      </section>

      <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
        <h2 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.pendingTitle}</h2>
        {data.pendingScaffolds + data.pendingModeration === 0 ? (
          <p className="mt-2 text-sm text-[var(--sdk-color-text-muted)]">{copy.pendingEmpty}</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              className="flex items-center justify-between rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-2 text-sm transition-colors hover:border-[var(--sdk-color-brand-primary)]"
              to="/admin/applications/scaffold-reviews"
            >
              <span className="flex items-center gap-2 text-[var(--sdk-color-text-secondary)]">
                <ShieldCheck className="h-4 w-4" />
                {copy.pending.scaffolds}
              </span>
              <span className="font-semibold text-[var(--sdk-color-text-primary)]">{data.pendingScaffolds}</span>
            </Link>
            <Link
              className="flex items-center justify-between rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-2 text-sm transition-colors hover:border-[var(--sdk-color-brand-primary)]"
              to="/admin/applications/moderation"
            >
              <span className="flex items-center gap-2 text-[var(--sdk-color-text-secondary)]">
                <ShieldCheck className="h-4 w-4" />
                {copy.pending.moderation}
              </span>
              <span className="font-semibold text-[var(--sdk-color-text-primary)]">{data.pendingModeration}</span>
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.quickTitle}</h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.quickDescription}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink icon={<Boxes className="h-4 w-4" />} label={copy.quick.applications} to="/admin/applications/deploy" />
          <QuickLink icon={<ShieldCheck className="h-4 w-4" />} label={copy.quick.moderation} to="/admin/applications/moderation" />
          <QuickLink icon={<Store className="h-4 w-4" />} label={copy.quick.storeCategories} to="/admin/applications/categories" />
          <QuickLink icon={<Shapes className="h-4 w-4" />} label={copy.quick.scaffolds} to="/admin/applications/scaffolds" />
          <QuickLink icon={<FolderTree className="h-4 w-4" />} label={copy.quick.scaffoldCategories} to="/admin/applications/scaffold-categories" />
        </div>
      </section>

      <section className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <Layers className="h-4 w-4" />
            {copy.recentTitle}
          </h2>
          <Link
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sdk-color-brand-primary)]"
            to="/admin/applications/scaffolds"
          >
            {copy.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recentScaffolds.length === 0 ? (
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.recentEmpty}</p>
        ) : (
          <ul className="divide-y divide-[var(--sdk-color-border-default)]">
            {data.recentScaffolds.map((scaffold) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-2.5" key={scaffold.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                    {scaffold.displayName}
                  </p>
                  <p className="truncate font-mono text-xs text-[var(--sdk-color-text-muted)]">
                    {scaffold.scaffoldKey}
                  </p>
                </div>
                <StatusBadge
                  label={messages.scaffolds.statuses[scaffold.status]}
                  status={scaffold.status}
                  variant={scaffoldStatusVariant(scaffold.status)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  hint,
  icon,
  label,
  value,
}: {
  hint: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4">
      <div className="flex items-center justify-between gap-2 text-[var(--sdk-color-text-muted)]">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--sdk-color-text-muted)]">{hint}</p>
    </div>
  );
}

function QuickLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] px-3 py-2.5 text-sm font-medium text-[var(--sdk-color-text-primary)] transition-colors hover:border-[var(--sdk-color-brand-primary)]"
      to={to}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--sdk-color-text-muted)]" />
    </Link>
  );
}

function scaffoldStatusVariant(status: ApplicationScaffold["status"]): StatusBadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    case "DISABLED":
      return "secondary";
    default:
      return "default";
  }
}
