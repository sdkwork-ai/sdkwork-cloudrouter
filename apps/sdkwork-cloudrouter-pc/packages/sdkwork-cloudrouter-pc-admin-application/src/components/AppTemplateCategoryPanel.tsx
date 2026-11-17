import { useEffect, useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, StatusNotice } from "@sdkwork/ui-pc-react";
import {
  CascadeCategoryManager,
  type CascadeCategoryNode,
} from "@sdkwork/cloudroutes-pc-commons";

import type { ApplicationCatalogMessages } from "../i18n";
import { TemplateCategoryFormDrawer } from "./TemplateCategoryFormDrawer";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  getDeployAppTemplateService,
  isDeployAppTemplateUnavailable,
} from "../services/deploy-app-templates";
import {
  DeployTemplateAdminServiceError,
  getDeployTemplateAdminService,
  isDeployTemplateAdminForbidden,
  isDeployTemplateAdminUnavailable,
  type DeployTemplateAdminService,
  type DeployTemplateCategory,
} from "../services/deploy-template-admin";
import type { DeployAppTemplateService } from "../types/deploy-app-templates";

interface CategoryNode extends CascadeCategoryNode {
  id: string;
  displayName: string;
}

/**
 * Template taxonomy as a five-column cascade.
 *
 * The Deploy backend owns the hierarchy; the app-plane category list is used as
 * a read-only fallback when that backend is unavailable. CRUD actions are
 * injected per node and per column, so any category level can be created,
 * edited, disabled, or deleted from the cascade.
 */
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
  const [formTarget, setFormTarget] = useState<{ category?: DeployTemplateCategory; parentId?: string }>();
  const [deleteTarget, setDeleteTarget] = useState<DeployTemplateCategory>();
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState<unknown>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    // Preserve the current tree during reload so the cascade keeps its
    // selected parent and the newly created child appears in the next column.
    setState((current) => ({ ...current, status: "loading" }));
    void service.listCategories().then(
      (items) => {
        if (!cancelled) {
          setState({ status: "ready", items });
        }
      },
      async (error: unknown) => {
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

  const writable = canWrite && !state.readOnly;
  const byId = useMemo(() => new Map(state.items.map((item) => [item.id, item])), [state.items]);
  const nodes = useMemo<CategoryNode[]>(() => state.items.map((item) => ({
    id: item.id,
    ...(item.parentId ? { parentId: item.parentId } : {}),
    displayName: item.displayName,
    secondary: `${item.categoryKey} · ${copy.statuses[item.status]}`,
    sortOrder: item.sortOrder,
    status: item.status,
  })), [copy.statuses, state.items]);

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

  const cascadeLabels = messages.categories.cascade;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--sdk-color-text-primary)]">
            <FolderTree className="h-4 w-4" />
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
          <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
          {messages.refresh}
        </Button>
      </header>

      <p className="text-xs text-[var(--sdk-color-text-muted)]">{cascadeLabels.depthHint}</p>

      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {state.readOnly ? <StatusNotice tone="default">{copy.readonlyNotice}</StatusNotice> : null}
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

      <CascadeCategoryManager
        actions={{
          create: (level, parent) => {
            if (!writable) {
              return null;
            }
            if (level === 1) {
              return (
                <Button onClick={() => setFormTarget({})} size="sm" type="button" variant="ghost">
                  <Plus className="h-3.5 w-3.5" />
                  {cascadeLabels.addRoot}
                </Button>
              );
            }
            if (!parent) {
              return null;
            }
            return (
              <Button
                onClick={() => setFormTarget({ parentId: parent.id })}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Plus className="h-3.5 w-3.5" />
                {cascadeLabels.addChild}
              </Button>
            );
          },
          node: (node, level) => {
            if (!writable) {
              return null;
            }
            const category = byId.get(node.id);
            if (!category) {
              return null;
            }
            return (
              <div className="flex items-center gap-0.5">
                {level < 5 ? (
                  <Button
                    aria-label={`${cascadeLabels.addChild} ${node.displayName}`}
                    onClick={() => setFormTarget({ parentId: category.id })}
                    size="sm"
                    title={cascadeLabels.addChild}
                    type="button"
                    variant="ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  aria-label={`${copy.form.editTitle} ${node.displayName}`}
                  onClick={() => setFormTarget({ category })}
                  size="sm"
                  title={copy.form.editTitle}
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`${copy.deleteAction} ${node.displayName}`}
                  onClick={() => {
                    setDialogError(undefined);
                    setDeleteTarget(category);
                  }}
                  size="sm"
                  title={copy.deleteAction}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          },
        }}
        items={nodes}
        labels={{
          columnTitles: [
            cascadeLabels.level1,
            cascadeLabels.level2,
            cascadeLabels.level3,
            cascadeLabels.level4,
            cascadeLabels.level5,
          ],
          empty: cascadeLabels.empty,
          emptyColumn: cascadeLabels.emptyColumn,
          loading: cascadeLabels.loading,
          selectHint: cascadeLabels.selectHint,
        }}
        loading={state.status === "loading"}
        maxDepth={5}
      />

      {formTarget ? (
        <TemplateCategoryFormDrawer
          categories={state.items}
          {...(formTarget.category ? { category: formTarget.category } : {})}
          {...(formTarget.parentId ? { initialParentId: formTarget.parentId } : {})}
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
        title={copy.delete.title}
        tone="danger"
      />
    </section>
  );
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
