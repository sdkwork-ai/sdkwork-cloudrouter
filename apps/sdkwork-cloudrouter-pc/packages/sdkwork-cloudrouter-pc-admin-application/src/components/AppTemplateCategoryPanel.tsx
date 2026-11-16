import { useEffect, useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Input,
  StatusBadge,
  StatusNotice,
  type StatusBadgeVariant,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { TemplateCategoryFormDrawer } from "./TemplateCategoryFormDrawer";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  getDeployAppTemplateService,
  isDeployAppTemplateUnavailable,
} from "../services/deploy-app-templates";
import type { DeployAppTemplateService } from "../types/deploy-app-templates";
import {
  DeployTemplateAdminServiceError,
  getDeployTemplateAdminService,
  isDeployTemplateAdminForbidden,
  isDeployTemplateAdminUnavailable,
  type DeployTemplateAdminService,
  type DeployTemplateCategory,
} from "../services/deploy-template-admin";

/** Template taxonomy with backend-admin CRUD. */
export function AppTemplateCategoryPanel({
  canWrite = isApplicationCenterActionAllowed("templateCategoryWrite"),
  fallbackService,
  messages,
  service: injectedService,
}: {
  messages: ApplicationCatalogMessages;
  service?: DeployTemplateAdminService;
  /** Read-only fallback used when the backend-admin surface is unavailable. */
  fallbackService?: Pick<DeployAppTemplateService, "listCategories">;
  /** Test/host seam: defaults to the action permission resolution. */
  canWrite?: boolean;
}) {
  const copy = messages.templateCategories;
  const service = useMemo(
    () => injectedService ?? getDeployTemplateAdminService(),
    [injectedService],
  );
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    items: readonly DeployTemplateCategory[];
    error?: unknown;
    readOnly?: boolean;
  }>({ status: "loading", items: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [formTarget, setFormTarget] = useState<{ category?: DeployTemplateCategory }>();
  const [deleteTarget, setDeleteTarget] = useState<DeployTemplateCategory>();
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState<unknown>();
  const [notice, setNotice] = useState<string>();
  const writable = canWrite && !state.readOnly;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    void service.listCategories().then(
      (items) => {
        if (!cancelled) {
          setState({ status: "ready", items });
        }
      },
      async (error: unknown) => {
        // Keep the taxonomy readable when the Deploy backend URL is missing:
        // the app-plane catalog still lists categories, so operators can
        // classify templates even though maintenance is unavailable.
        if (isDeployTemplateAdminUnavailable(error)) {
          try {
            const fallback = fallbackService ?? getDeployAppTemplateService();
            const items = await fallback.listCategories();
            if (!cancelled) {
              setState({
                status: "ready",
                readOnly: true,
                items: items.map((item) => ({
                  id: item.id,
                  categoryKey: item.categoryKey,
                  displayName: item.displayName,
                  ...(item.description ? { description: item.description } : {}),
                  ...(item.parentId ? { parentId: item.parentId } : {}),
                  sortOrder: item.sortOrder ?? 0,
                  status: item.status === "DISABLED" ? "DISABLED" : "ACTIVE",
                })),
              });
            }
            return;
          } catch {
            // Fall through to the reported error.
          }
        }
        if (!cancelled) {
          setState({ status: "error", items: [], error });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fallbackService, reloadToken, service]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) {
      return state.items;
    }
    return state.items.filter((item) =>
      [item.displayName, item.categoryKey, item.id]
        .some((value) => value.toLocaleLowerCase().includes(needle)));
  }, [query, state.items]);

  const byId = useMemo(
    () => new Map(state.items.map((item) => [item.id, item])),
    [state.items],
  );

  const failure = state.error ? resolveFailure(state.error, messages) : undefined;

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setDialogError(undefined);
    try {
      await service.deleteCategory(deleteTarget.id);
      setDeleteTarget(undefined);
      setNotice(messages.templateCategories.form.saved);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setDialogError(error);
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<DeployTemplateCategory>[]>(() => [
    {
      id: "category",
      header: copy.columns.category,
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
            {item.displayName}
          </p>
          <p className="truncate font-mono text-xs text-[var(--sdk-color-text-muted)]">
            {item.categoryKey}
          </p>
        </div>
      ),
    },
    {
      id: "parent",
      header: copy.columns.parent,
      cell: (item) => (item.parentId ? byId.get(item.parentId)?.displayName ?? item.parentId : copy.rootParent),
    },
    {
      id: "status",
      header: copy.columns.status,
      cell: (item) => (
        <StatusBadge
          label={copy.statuses[item.status]}
          status={item.status}
          variant={statusVariant(item)}
        />
      ),
    },
    {
      id: "sortOrder",
      header: copy.columns.sortOrder,
      cell: (item) => String(item.sortOrder ?? 0),
    },
  ], [byId, copy]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
            <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
            {messages.refresh}
          </Button>
          {writable ? (
            <Button
              onClick={() => {
                setNotice(undefined);
                setFormTarget({});
              }}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {copy.create}
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {state.readOnly ? <StatusNotice tone="default">{copy.readonlyNotice}</StatusNotice> : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full max-w-72">
          <span className="sr-only">{copy.columns.category}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={copy.columns.category}
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.columns.category}
            value={query}
          />
        </label>
        <p className="text-xs text-[var(--sdk-color-text-muted)]">
          {copy.countTemplate.replace("{count}", String(filtered.length))}
        </p>
      </div>

      {failure ? (
        <StatusNotice tone="danger">
          <span className="flex flex-wrap items-center gap-3">
            <span>{failure}</span>
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
        loading={state.status === "loading"}
        rowActions={writable ? (item) => (
          <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              onClick={() => {
                setNotice(undefined);
                setFormTarget({ category: item });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil className="h-3.5 w-3.5" />
              {copy.editAction}
            </Button>
            <Button
              onClick={() => {
                setDialogError(undefined);
                setDeleteTarget(item);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {copy.deleteAction}
            </Button>
          </div>
        ) : undefined}
        rowActionsLabel={copy.columns.actions}
        rows={[...filtered]}
        slotProps={{
          footer: { className: "shrink-0" },
          surface: { className: "flex min-h-0 flex-1 flex-col" },
          viewport: { className: "min-h-0 flex-1" },
        }}
        stickyHeader
      />

      {filtered.length === 0 && state.status === "ready" ? (
        <p className="flex items-center gap-2 text-xs text-[var(--sdk-color-text-muted)]">
          <FolderTree className="h-3.5 w-3.5" />
          {copy.emptyDescription}
        </p>
      ) : null}

      {formTarget ? (
        <TemplateCategoryFormDrawer
          categories={state.items}
          {...(formTarget.category ? { category: formTarget.category } : {})}
          messages={messages}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => {
            setNotice(messages.templateCategories.form.saved);
            setReloadToken((token) => token + 1);
          }}
          service={service}
        />
      ) : null}

      <ConfirmDialog
        closeOnConfirm={false}
        confirmLabel={deleting ? copy.delete.deleting : copy.delete.confirm}
        confirmLoading={deleting}
        description={(
          <span className="space-y-2">
            <span className="block">{copy.delete.description}</span>
            {dialogError ? (
              <span className="block font-medium text-[var(--sdk-color-state-danger)]">
                {deleteError(dialogError, messages)}
              </span>
            ) : null}
          </span>
        )}
        onConfirm={() => {
          void confirmDelete();
        }}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(undefined);
            setDialogError(undefined);
          }
        }}
        open={Boolean(deleteTarget)}
        title={copy.delete.title.replace("{name}", deleteTarget?.displayName ?? "")}
        tone="danger"
      />
    </section>
  );
}

function statusVariant(category: DeployTemplateCategory): StatusBadgeVariant {
  return category.status === "ACTIVE" ? "success" : "secondary";
}

function resolveFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isDeployTemplateAdminForbidden(error)) {
    return messages.templateCategories.forbidden;
  }
  if (isDeployTemplateAdminUnavailable(error)) {
    return messages.templateCategories.unavailable;
  }
  return messages.templateCategories.loadError;
}

function deleteError(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isDeployTemplateAdminForbidden(error)) {
    return messages.templateCategories.delete.forbidden;
  }
  if (isDeployTemplateAdminUnavailable(error)) {
    return messages.templateCategories.form.unavailable;
  }
  if (error instanceof DeployTemplateAdminServiceError && error.kind === "conflict") {
    return messages.templateCategories.delete.blockedChildren;
  }
  return messages.templateCategories.delete.error;
}
