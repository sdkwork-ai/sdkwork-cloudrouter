import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  History,
  Pencil,
  Plus,
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
import { BottomPagination } from "@sdkwork/cloudroutes-pc-commons";

import {
  AppCenterCountLabel,
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterRefreshButton,
  appCenterTableSlots,
} from "./AppCenterListShell";
import type { ApplicationCatalogMessages } from "../i18n";
import { templateMessage } from "../services/message-template";
import { ApplicationScaffoldFormDrawer } from "./ApplicationScaffoldFormDrawer";
import { ApplicationScaffoldInstallDrawer } from "./ApplicationScaffoldInstallDrawer";
import { ApplicationScaffoldVersionsDrawer } from "./ApplicationScaffoldVersionsDrawer";
import { ScaffoldReviewDrawer } from "./ScaffoldReviewDrawer";
import { getApplicationScaffoldAdminService } from "../services/application-scaffold-admin";
import type { ApplicationScaffoldAdminService } from "../services/application-scaffold-admin";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  getApplicationScaffoldService,
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
} from "../services/application-scaffolds";
import type {
  DeployAppOption,
  ApplicationScaffold,
  ScaffoldCategory,
  ApplicationScaffoldPage,
  ApplicationScaffoldService,
  ApplicationScaffoldStatus,
} from "../types/application-scaffolds";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const STATUS_FILTER_ALL = "all";
const STATUS_FILTERS: readonly ApplicationScaffoldStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
];

type ListState = {
  status: "loading" | "ready" | "error";
  page?: ApplicationScaffoldPage;
  error?: unknown;
};

/**
 * App-scaffold catalog: list, search, status filter, pagination, and the
 * create/edit/versions/submit/delete commands.
 *
 * Server-side pagination and filtering keep the panel correct for large
 * catalogs; row commands reload the current page so the status badges stay
 * truthful.
 */
export function ApplicationScaffoldPanel({
  adminService,
  canReview = isApplicationCenterActionAllowed("scaffoldReview"),
  description,
  initialStatus,
  messages,
  service: injectedService,
  title,
}: {
  messages: ApplicationCatalogMessages;
  /** Test/extension seam: override the Deploy scaffold transport. */
  service?: ApplicationScaffoldService;
  /** Test/host seam: override the backend-admin review transport. */
  adminService?: ApplicationScaffoldAdminService;
  /** Test/host seam: defaults to the action permission resolution. */
  canReview?: boolean;
  /** Optional heading override for focused surfaces (e.g. the review queue). */
  title?: string;
  description?: string;
  /** Pre-filter the catalog, e.g. `PENDING_REVIEW` for the review queue. */
  initialStatus?: ApplicationScaffoldStatus;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language || "zh-CN";
  const copy = messages.scaffolds;
  const service = injectedService ?? getApplicationScaffoldService();
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [apps, setApps] = useState<readonly DeployAppOption[]>([]);
  const [categories, setCategories] = useState<readonly ScaffoldCategory[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? STATUS_FILTER_ALL);
  const [formTarget, setFormTarget] = useState<{ scaffold?: ApplicationScaffold }>();
  const [versionsTarget, setVersionsTarget] = useState<ApplicationScaffold>();
  const [reviewTarget, setReviewTarget] = useState<ApplicationScaffold>();
  const [deleteTarget, setDeleteTarget] = useState<ApplicationScaffold>();
  const [submitTarget, setSubmitTarget] = useState<ApplicationScaffold>();
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<unknown>();
  const [installTarget, setInstallTarget] = useState<ApplicationScaffold>();
  const [installNotice, setInstallNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void service.list({
      page,
      pageSize,
      ...(appliedSearch ? { keyword: appliedSearch } : {}),
      ...(statusFilter === STATUS_FILTER_ALL ? {} : { status: statusFilter as ApplicationScaffoldStatus }),
    }).then(
      (scaffolds) => {
        if (!cancelled) {
          setState({ status: "ready", page: scaffolds });
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

  const columns = useMemo<DataTableColumn<ApplicationScaffold>[]>(() => {
    const statusColumn: DataTableColumn<ApplicationScaffold> = {
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
        id: "scaffold",
        header: copy.columns.scaffold,
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
              {item.scaffoldKey}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        header: copy.columns.type,
        cell: (item) => (
          <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-xs text-[var(--sdk-color-text-secondary)]">
            {copy.types[item.scaffoldType]}
          </span>
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

  const canSubmit = (scaffold: ApplicationScaffold): boolean =>
    scaffold.status === "DRAFT" || scaffold.status === "REJECTED";

  // The install command is deliberately limited to free, published APP
  // scaffolds: paid scaffolds need the order/payment entitlement flow and
  // archive-backed scaffolds need artifact sharing.
  const canInstall = (scaffold: ApplicationScaffold): boolean =>
    scaffold.scaffoldType === "APP"
    && scaffold.pricingModel === "FREE"
    && scaffold.status === "PUBLISHED";

  const handleInstalled = (result: {
    appId: string;
    appName: string;
    deployApplicationId?: string;
  }) => {
    setInstallTarget(undefined);
    setInstallNotice(result.deployApplicationId
      ? copy.actions.installSucceededWithId
        .replace("{name}", result.appName)
        .replace("{id}", result.deployApplicationId)
      : copy.actions.installSucceeded.replace("{name}", result.appName));
    setReloadToken((token) => token + 1);
  };

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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3" data-app-center-panel="scaffolds">
      <AppCenterListHeader
        actions={(
          <>
            <AppCenterRefreshButton
              busy={busy}
              label={messages.refresh}
              onRefresh={() => setReloadToken((token) => token + 1)}
            />
            <Button onClick={() => setFormTarget({})} type="button">
              <Plus className="h-4 w-4" />
              {copy.create}
            </Button>
          </>
        )}
        description={description ?? copy.description}
        title={title ?? copy.title}
        toolbar={(
          <>
            <form
              className="relative w-full min-w-0 sm:w-64"
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
          </>
        )}
      />

      {installNotice ? <StatusNotice tone="success">{installNotice}</StatusNotice> : null}

      {loadFailure ? (
        <AppCenterLoadFailure
          message={loadFailure}
          onRetry={() => setReloadToken((token) => token + 1)}
          retryLabel={messages.retry}
        />
      ) : null}

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        emptyDescription={copy.emptyDescription}
        emptyTitle={copy.emptyTitle}
        footer={(
          <BottomPagination
            className="w-full"
            disabled={busy}
            hasNextPage={page * pageSize < total}
            itemCount={items.length}
            nextLabel={messages.pagination.next}
            onNextPage={() => setPage(page + 1)}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
            onPreviousPage={() => setPage(Math.max(1, page - 1))}
            page={page}
            pageLabel={templateMessage(messages.pagination.pageOfTemplate, {
              page: String(page),
              total: String(Math.max(1, Math.ceil(total / pageSize))),
            })}
            pageSize={pageSize}
            pageSizeLabel={messages.pagination.pageSizeLabel}
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            previousLabel={messages.pagination.previous}
            showingLabel={messages.pagination.showing}
            summary={(
              <AppCenterCountLabel
                text={templateMessage(copy.countTemplate, { count: String(total) })}
              />
            )}
          />
        )}
        getRowId={(item) => item.id}
        loading={busy && items.length === 0}
        rowActions={(item) => {
          return (
            <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
              <Button
                disabled={pending}
                onClick={() => setFormTarget({ scaffold: item })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="h-3.5 w-3.5" />
                {copy.actions.edit}
              </Button>
              {canInstall(item) ? (
                <Button
                  disabled={pending}
                  onClick={() => setInstallTarget(item)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download className="h-3.5 w-3.5" />
                  {copy.actions.install}
                </Button>
              ) : null}
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
        slotProps={appCenterTableSlots()}
        stickyHeader
      />

      {formTarget ? (
        <ApplicationScaffoldFormDrawer
          apps={apps}
          categories={categories}
          messages={messages}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => {
            setFormTarget(undefined);
            setReloadToken((token) => token + 1);
          }}
          service={service}
          {...(formTarget.scaffold ? { scaffold: formTarget.scaffold } : {})}
        />
      ) : null}

      {installTarget ? (
        <ApplicationScaffoldInstallDrawer
          messages={messages}
          onClose={() => setInstallTarget(undefined)}
          onInstalled={handleInstalled}
          scaffold={installTarget}
          service={service}
        />
      ) : null}

      {versionsTarget ? (
        <ApplicationScaffoldVersionsDrawer
          messages={messages}
          onClose={() => setVersionsTarget(undefined)}
          service={service}
          scaffold={versionsTarget}
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
        <ScaffoldReviewDrawer
          messages={messages}
          onClose={() => setReviewTarget(undefined)}
          onReviewed={() => {
            setReloadToken((token) => token + 1);
          }}
          service={adminService ?? getApplicationScaffoldAdminService()}
          scaffold={reviewTarget}
        />
      ) : null}
    </section>
  );
}

function statusVariant(status: ApplicationScaffoldStatus): StatusBadgeVariant {
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
  if (isApplicationScaffoldForbidden(error)) {
    return messages.scaffolds.forbidden;
  }
  if (isApplicationScaffoldUnavailable(error)) {
    return messages.scaffolds.unavailable;
  }
  return messages.scaffolds.loadError;
}

function resolveActionFailure(
  error: unknown,
  messages: ApplicationCatalogMessages,
  fallback: string,
): string {
  if (isApplicationScaffoldForbidden(error)) {
    return messages.scaffolds.forbidden;
  }
  if (isApplicationScaffoldUnavailable(error)) {
    return messages.scaffolds.unavailable;
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
