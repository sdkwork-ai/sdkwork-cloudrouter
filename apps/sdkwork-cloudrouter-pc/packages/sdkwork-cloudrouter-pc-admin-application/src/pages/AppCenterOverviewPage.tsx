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
import { getDeployAppTemplateService } from "../services/deploy-app-templates";
import { getAppStoreCategoryService } from "../services/appstore-categories";
import { getAppStoreModerationService } from "../services/appstore-moderation";
import type { DeployAppTemplate } from "../types/deploy-app-templates";

interface OverviewData {
  iam: number;
  deploy: number;
  appStore: number;
  templates: number;
  templateCategories: number;
  storeCategories: number;
  pendingTemplates: number;
  pendingModeration: number;
  recentTemplates: readonly DeployAppTemplate[];
}

const EMPTY_DATA: OverviewData = {
  iam: 0,
  deploy: 0,
  appStore: 0,
  templates: 0,
  templateCategories: 0,
  storeCategories: 0,
  pendingTemplates: 0,
  pendingModeration: 0,
  recentTemplates: [],
};

/**
 * Application Center landing page.
 *
 * Aggregates the three application platforms and the template catalog into one
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
      const templateService = getDeployAppTemplateService();
      const results = await Promise.allSettled([
        resolveApplicationCatalogContext({}),
        templateService.list({ page: 1, pageSize: 5 }),
        templateService.listCategories(),
        getAppStoreCategoryService().list({ pageSize: 100 }),
        templateService.list({ page: 1, pageSize: 1, status: "PENDING_REVIEW" }),
        getAppStoreModerationService().listQueue({ reviewStatus: "PENDING", pageSize: 50 }),
      ]);
      if (cancelled) {
        return;
      }
      const [
        contextResult,
        templateResult,
        templateCategoryResult,
        storeCategoryResult,
        pendingTemplateResult,
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
      const templatePage = templateResult.status === "fulfilled" ? templateResult.value : undefined;
      if (templateResult.status !== "fulfilled") {
        failed += 1;
      }
      const templateCategories = templateCategoryResult.status === "fulfilled"
        ? templateCategoryResult.value
        : undefined;
      if (templateCategoryResult.status !== "fulfilled") {
        failed += 1;
      }
      const storeCategoryPage = storeCategoryResult.status === "fulfilled"
        ? storeCategoryResult.value
        : undefined;
      if (storeCategoryResult.status !== "fulfilled") {
        failed += 1;
      }
      const pendingTemplates = pendingTemplateResult.status === "fulfilled"
        ? pendingTemplateResult.value.total
        : 0;
      if (pendingTemplateResult.status !== "fulfilled") {
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
        templates: templatePage?.total ?? 0,
        templateCategories: templateCategories?.length ?? 0,
        storeCategories: storeCategoryPage?.items.length ?? 0,
        pendingTemplates,
        pendingModeration,
        recentTemplates: templatePage?.items.slice(0, 5) ?? [],
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
          hint={copy.kpiHint.templates}
          icon={<Shapes className="h-4 w-4" />}
          label={copy.kpi.templates}
          value={data.templates}
        />
        <KpiCard
          hint={copy.kpiHint.categories}
          icon={<FolderTree className="h-4 w-4" />}
          label={copy.kpi.categories}
          value={data.templateCategories}
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
        {data.pendingTemplates + data.pendingModeration === 0 ? (
          <p className="mt-2 text-sm text-[var(--sdk-color-text-muted)]">{copy.pendingEmpty}</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              className="flex items-center justify-between rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] px-3 py-2 text-sm transition-colors hover:border-[var(--sdk-color-brand-primary)]"
              to="/admin/applications/template-reviews"
            >
              <span className="flex items-center gap-2 text-[var(--sdk-color-text-secondary)]">
                <ShieldCheck className="h-4 w-4" />
                {copy.pending.templates}
              </span>
              <span className="font-semibold text-[var(--sdk-color-text-primary)]">{data.pendingTemplates}</span>
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
          <QuickLink icon={<Boxes className="h-4 w-4" />} label={copy.quick.applications} to="/admin/applications/iam" />
          <QuickLink icon={<ShieldCheck className="h-4 w-4" />} label={copy.quick.moderation} to="/admin/applications/moderation" />
          <QuickLink icon={<Store className="h-4 w-4" />} label={copy.quick.storeCategories} to="/admin/applications/categories" />
          <QuickLink icon={<Shapes className="h-4 w-4" />} label={copy.quick.templates} to="/admin/applications/templates" />
          <QuickLink icon={<FolderTree className="h-4 w-4" />} label={copy.quick.templateCategories} to="/admin/applications/template-categories" />
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
            to="/admin/applications/templates"
          >
            {copy.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recentTemplates.length === 0 ? (
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.recentEmpty}</p>
        ) : (
          <ul className="divide-y divide-[var(--sdk-color-border-default)]">
            {data.recentTemplates.map((template) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-2.5" key={template.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                    {template.displayName}
                  </p>
                  <p className="truncate font-mono text-xs text-[var(--sdk-color-text-muted)]">
                    {template.templateKey}
                  </p>
                </div>
                <StatusBadge
                  label={messages.templates.statuses[template.status]}
                  status={template.status}
                  variant={templateStatusVariant(template.status)}
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

function templateStatusVariant(status: DeployAppTemplate["status"]): StatusBadgeVariant {
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
