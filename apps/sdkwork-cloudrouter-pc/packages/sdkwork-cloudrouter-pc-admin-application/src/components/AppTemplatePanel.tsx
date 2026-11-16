import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
  type StatusBadgeVariant,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { AppTemplateFormDrawer } from "./AppTemplateFormDrawer";
import { AppTemplateVersionsDrawer } from "./AppTemplateVersionsDrawer";
import { TemplateReviewDrawer } from "./TemplateReviewDrawer";
import { getDeployTemplateAdminService } from "../services/deploy-template-admin";
import type { DeployTemplateAdminService } from "../services/deploy-template-admin";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  getDeployAppTemplateService,
  isDeployAppTemplateForbidden,
  isDeployAppTemplateUnavailable,
} from "../services/deploy-app-templates";
import type {
  DeployAppOption,
  DeployAppTemplate,
  DeployAppTemplateCategory,
  DeployAppTemplatePage,
  DeployAppTemplateService,
  DeployAppTemplateStatus,
} from "../types/deploy-app-templates";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const STATUS_FILTER_ALL = "all";
const STATUS_FILTERS: readonly DeployAppTemplateStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
];

type ListState = {
  status: "loading" | "ready" | "error";
  page?: DeployAppTemplatePage;
  error?: unknown;
};

/**
 * App-template catalog: list, search, status filter, pagination, and the
 * create/edit/versions/submit/delete commands.
 *
 * Server-side pagination and filtering keep the panel correct for large
 * catalogs; row commands reload the current page so the status badges stay
 * truthful.
 */
export function AppTemplatePanel({
  adminService,
  canReview = isApplicationCenterActionAllowed("templateReview"),
  description,
  initialStatus,
  messages,
  service: injectedService,
  title,
}: {
  messages: ApplicationCatalogMessages;
  /** Test/extension seam: override the Deploy template transport. */
  service?: DeployAppTemplateService;
  /** Test/host seam: override the backend-admin review transport. */
  adminService?: DeployTemplateAdminService;
  /** Test/host seam: defaults to the action permission resolution. */
  canReview?: boolean;
  /** Optional heading override for focused surfaces (e.g. the review queue). */
  title?: string;
  description?: string;
  /** Pre-filter the catalog, e.g. `PENDING_REVIEW` for the review queue. */
  initialStatus?: DeployAppTemplateStatus;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language || "zh-CN";
  const copy = messages.templates;
  const service = injectedService ?? getDeployAppTemplateService();
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [apps, setApps] = useState<readonly DeployAppOption[]>([]);
  const [categories, setCategories] = useState<readonly DeployAppTemplateCategory[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? STATUS_FILTER_ALL);
  const [formTarget, setFormTarget] = useState<{ template?: DeployAppTemplate }>();
  const [versionsTarget, setVersionsTarget] = useState<DeployAppTemplate>();
  const [reviewTarget, setReviewTarget] = useState<DeployAppTemplate>();
  const [deleteTarget, setDeleteTarget] = useState<DeployAppTemplate>();
  const [submitTarget, setSubmitTarget] = useState<DeployAppTemplate>();
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void service.list({
      page,
      pageSize,
      ...(appliedSearch ? { keyword: appliedSearch } : {}),
      ...(statusFilter === STATUS_FILTER_ALL ? {} : { status: statusFilter as DeployAppTemplateStatus }),
    }).then(
      (templates) => {
        if (!cancelled) {
          setState({ status: "ready", page: templates });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", error });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [appliedSearch, page, pageSize, reloadToken, service, statusFilter]);

  // The pickers are an authoring aid, not a list dependency: a failing app or
  // category read leaves the list usable and the create form explains the gap.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([service.listApps(), service.listCategories()]).then(
      ([appOptions, categoryOptions]) => {
        if (!cancelled) {
          setApps(appOptions);
          setCategories(categoryOptions);
        }
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken, service]);

  const items = state.page?.items ?? [];
  const total = state.page?.total ?? 0;
  const busy = state.status === "loading";
  const loadFailure = state.error ? resolveLoadFailure(state.error, messages) : undefined;

  const columns = useMemo<DataTableColumn<DeployAppTemplate>[]>(() => {
    const statusColumn: DataTableColumn<DeployAppTemplate> = {
      id: "status",
      header: copy.columns.status,
      cell: (item) => (
        <StatusBadge
          label={copy.statuses[item.status]}
          status={item.status}
          variant={statusVariant(item.status)}
        />
      ),
    };
    return [
      {
        id: "template",
        header: copy.columns.template,
        cell: (item) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                {item.displayName}
              </p>
              {item.isFeatured ? (
                <span className="shrink-0 rounded-full bg-[var(--sdk-color-brand-primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--sdk-color-brand-primary)]">
                  {copy.featuredBadge}
                </span>
              ) : null}
            </div>
            <p className="truncate font-mono text-xs text-[var(--sdk-color-text-muted)]">
              {item.templateKey}
            </p>
          </div>
        ),
      },
      statusColumn,
      {
        id: "visibility",
        header: copy.columns.visibility,
        cell: (item) => copy.visibility[item.visibility],
      },
      {
        id: "pricing",
        header: copy.columns.pricing,
        cell: (item) => (
          <div className="min-w-0">
            <p className="text-sm">{copy.pricing[item.pricingModel]}</p>
            {item.pricingModel === "PAID" ? (
              <p className="text-xs text-[var(--sdk-color-text-muted)]">
                {formatPrice(item.currency, item.priceMinor, locale)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "installs",
        header: copy.columns.installs,
        cell: (item) => <span className="tabular-nums">{item.installCount}</span>,
      },
      {
        id: "updatedAt",
        header: copy.columns.updatedAt,
        cell: (item) => formatDate(item.updatedAt, locale),
      },
    ];
  }, [copy, locale]);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const canSubmit = (template: DeployAppTemplate): boolean =>
    template.status === "DRAFT" || template.status === "REJECTED";

  const confirmDelete = async () => {
    if (!deleteTarget || pending) {
      return;
    }
    setPending(true);
    setDialogError(undefined);
    try {
      await service.remove(deleteTarget.id);
      setDeleteTarget(undefined);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setDialogError(error);
    } finally {
      setPending(false);
    }
  };

  const confirmSubmit = async () => {
    if (!submitTarget || pending) {
      return;
    }
    setPending(true);
    setDialogError(undefined);
    try {
      await service.submit(submitTarget.id);
      setSubmitTarget(undefined);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setDialogError(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{title ?? copy.title}</h2>
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{description ?? copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={busy} onClick={() => setReloadToken((token) => token + 1)} type="button" variant="outline">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {messages.refresh}
          </Button>
          <Button onClick={() => setFormTarget({})} type="button">
            <Plus className="h-4 w-4" />
            {copy.create}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          className="relative w-full max-w-72"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <span className="sr-only">{copy.searchPlaceholder}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={copy.searchPlaceholder}
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            value={search}
          />
        </form>
        <Select
          onValueChange={(value) => {
            setPage(1);
            setStatusFilter(value);
          }}
          value={statusFilter}
        >
          <SelectTrigger aria-label={copy.statusFilter} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>{copy.statusAll}</SelectItem>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {copy.statuses[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--sdk-color-text-muted)]">
          {copy.countTemplate.replace("{count}", String(total))}
        </p>
      </div>

      {loadFailure ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{loadFailure}</span>
            <Button onClick={() => setReloadToken((token) => token + 1)} size="sm" type="button" variant="outline">
              {messages.retry}
            </Button>
          </span>
        </StatusNotice>
      ) : null}

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        emptyDescription={copy.emptyDescription}
        emptyTitle={copy.emptyTitle}
        getRowId={(item) => item.id}
        loading={busy && items.length === 0}
        pagination={{
          mode: "server",
          page,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          rowCount: total,
          onPageChange: (next) => setPage(next),
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
        rowActions={(item) => {
          return (
            <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
              <Button
                disabled={pending}
                onClick={() => setFormTarget({ template: item })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="h-3.5 w-3.5" />
                {copy.actions.edit}
              </Button>
              <Button
                disabled={pending}
                onClick={() => setVersionsTarget(item)}
                size="sm"
                type="button"
                variant="outline"
              >
                <History className="h-3.5 w-3.5" />
                {copy.actions.versions}
              </Button>
              {canReview ? (
                <Button
                  disabled={pending}
                  onClick={() => setReviewTarget(item)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {copy.review.action}
                </Button>
              ) : null}
              {canSubmit(item) ? (
                <Button
                  disabled={pending}
                  onClick={() => {
                    setDialogError(undefined);
                    setSubmitTarget(item);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Send className="h-3.5 w-3.5" />
                  {copy.actions.submit}
                </Button>
              ) : null}
              <Button
                disabled={pending}
                onClick={() => {
                  setDialogError(undefined);
                  setDeleteTarget(item);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {copy.actions.delete}
              </Button>
            </div>
          );
        }}
        rowActionsLabel={copy.columns.actions}
        rows={[...items]}
        slotProps={{
          footer: { className: "shrink-0" },
          surface: { className: "flex min-h-0 flex-1 flex-col" },
          viewport: { className: "min-h-0 flex-1" },
        }}
        stickyHeader
      />

      {formTarget ? (
        <AppTemplateFormDrawer
          apps={apps}
          categories={categories}
          messages={messages}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => {
            setFormTarget(undefined);
            setReloadToken((token) => token + 1);
          }}
          service={service}
          {...(formTarget.template ? { template: formTarget.template } : {})}
        />
      ) : null}

      {versionsTarget ? (
        <AppTemplateVersionsDrawer
          messages={messages}
          onClose={() => setVersionsTarget(undefined)}
          service={service}
          template={versionsTarget}
        />
      ) : null}

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={pending ? copy.actions.deleting : copy.actions.delete}
        confirmLoading={pending}
        description={(
          <span className="space-y-2">
            <span className="block">{copy.actions.deleteDescription}</span>
            {dialogError ? (
              <span className="block font-medium text-[var(--sdk-color-state-danger)]">
                {resolveActionFailure(dialogError, messages, copy.actions.deleteError)}
              </span>
            ) : null}
          </span>
        )}
        onConfirm={() => {
          void confirmDelete();
        }}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setDeleteTarget(undefined);
            setDialogError(undefined);
          }
        }}
        open={Boolean(deleteTarget)}
        title={copy.actions.deleteTitle.replace("{name}", deleteTarget?.displayName ?? "")}
        tone="danger"
      />

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={pending ? copy.actions.submitting : copy.actions.submit}
        confirmLoading={pending}
        description={(
          <span className="space-y-2">
            <span className="block">{copy.actions.submitDescription}</span>
            {dialogError ? (
              <span className="block font-medium text-[var(--sdk-color-state-danger)]">
                {resolveActionFailure(dialogError, messages, copy.actions.submitError)}
              </span>
            ) : null}
          </span>
        )}
        onConfirm={() => {
          void confirmSubmit();
        }}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setSubmitTarget(undefined);
            setDialogError(undefined);
          }
        }}
        open={Boolean(submitTarget)}
        title={copy.actions.submitTitle.replace("{name}", submitTarget?.displayName ?? "")}
      />

      {reviewTarget ? (
        <TemplateReviewDrawer
          messages={messages}
          onClose={() => setReviewTarget(undefined)}
          onReviewed={() => {
            setReloadToken((token) => token + 1);
          }}
          service={adminService ?? getDeployTemplateAdminService()}
          template={reviewTarget}
        />
      ) : null}
    </section>
  );
}

function statusVariant(status: DeployAppTemplateStatus): StatusBadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    case "DISABLED":
      return "secondary";
    case "DRAFT":
    default:
      return "default";
  }
}

function resolveLoadFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isDeployAppTemplateForbidden(error)) {
    return messages.templates.forbidden;
  }
  if (isDeployAppTemplateUnavailable(error)) {
    return messages.templates.unavailable;
  }
  return messages.templates.loadError;
}

function resolveActionFailure(
  error: unknown,
  messages: ApplicationCatalogMessages,
  fallback: string,
): string {
  if (isDeployAppTemplateForbidden(error)) {
    return messages.templates.forbidden;
  }
  if (isDeployAppTemplateUnavailable(error)) {
    return messages.templates.unavailable;
  }
  return fallback;
}

function formatPrice(currency: string, priceMinor: string, locale: string): string {
  const amount = Number(priceMinor);
  if (!Number.isFinite(amount) || amount < 0) {
    return `${currency} ${priceMinor}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "CNY",
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${priceMinor}`;
  }
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
