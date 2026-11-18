import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useInRouterContext } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, FolderTree, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Input, StatusNotice } from "@sdkwork/ui-pc-react";
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
import {
  buildTemplateCategoryExport,
  downloadJsonDocument,
} from "../services/category-export";
import {
  planCategoryImport,
  type CategoryImportPlan,
} from "../services/category-import";

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
export interface AppTemplateCategoryPanelProps {
  messages: ApplicationCatalogMessages;
  service?: DeployTemplateAdminService;
  /** Read-only fallback used when the backend-admin surface is unavailable. */
  fallbackService?: Pick<DeployAppTemplateService, "listCategories">;
  /** Test/host seam: defaults to the action permission resolution. */
  canWrite?: boolean;
}

/**
 * Template taxonomy as a five-column cascade.
 *
 * The router-aware wrapper deep-links `?category=<id>`; the panel itself stays
 * usable outside a router (tests, embedded consoles).
 */
export function AppTemplateCategoryPanel(props: AppTemplateCategoryPanelProps) {
  const inRouter = useInRouterContext();
  return inRouter
    ? <RouterConnectedTemplateCategoryPanel {...props} />
    : <AppTemplateCategoryPanelContent {...props} />;
}

function RouterConnectedTemplateCategoryPanel(props: AppTemplateCategoryPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get("category") ?? undefined;
  const onCategorySelect = useCallback((id: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("category", id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  return (
    <AppTemplateCategoryPanelContent
      {...props}
      onCategorySelect={onCategorySelect}
      selectedCategoryId={selectedCategoryId}
    />
  );
}

function AppTemplateCategoryPanelContent({
  canWrite = isApplicationCenterActionAllowed("templateCategoryWrite"),
  fallbackService,
  messages,
  onCategorySelect,
  selectedCategoryId,
  service: injectedService,
}: AppTemplateCategoryPanelProps & {
  selectedCategoryId?: string;
  onCategorySelect?: (id: string) => void;
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
  const [actionError, setActionError] = useState<unknown>();
  const [notice, setNotice] = useState<string>();
  const [selectedPath, setSelectedPath] = useState<readonly CategoryNode[]>([]);
  const [locateQuery, setLocateQuery] = useState("");
  const [locatePath, setLocatePath] = useState<readonly string[]>([]);
  const [locateKey, setLocateKey] = useState(0);
  const [locateMiss, setLocateMiss] = useState(false);
  const [importPlan, setImportPlan] = useState<CategoryImportPlan>();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const importErrorMessage = (code: keyof ApplicationCatalogMessages["categories"]["importErrors"]): string =>
    messages.categories.importErrors[code] ?? messages.categories.importInvalid;

  const handleImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setImportError(undefined);
    try {
      const plan = planCategoryImport(
        JSON.parse(await file.text()) as unknown,
        "template-categories",
        state.items.map((category) => category.categoryKey),
      );
      if (plan.errors.length > 0) {
        setImportError(plan.errors.map(importErrorMessage).join(" "));
        return;
      }
      if (plan.items.length === 0) {
        setImportError(messages.categories.importInvalid);
        return;
      }
      setImportPlan(plan);
    } catch {
      setImportError(messages.categories.importInvalid);
    }
  };

  const runImport = async () => {
    if (!importPlan) {
      return;
    }
    setImporting(true);
    setImportError(undefined);
    const idByCode = new Map<string, string>();
    const createdIds: string[] = [];
    try {
      for (const item of importPlan.items) {
        const created = await service.createCategory({
          categoryKey: item.code,
          displayName: item.name,
          ...(item.parentCode && idByCode.has(item.parentCode)
            ? { parentId: idByCode.get(item.parentCode) }
            : {}),
          sortOrder: item.sortOrder,
          status: item.status === "disabled" ? "DISABLED" : "ACTIVE",
        });
        if (created?.id) {
          idByCode.set(item.code, created.id);
          createdIds.push(created.id);
        }
      }
      setImportPlan(undefined);
      setNotice(messages.categories.importSuccess);
      setReloadToken((token) => token + 1);
    } catch (error) {
      // Compensate deepest-first so a parent is never deleted before children.
      for (const id of [...createdIds].reverse()) {
        try {
          await service.deleteCategory(id);
        } catch {
          // Keep the original failure; a stuck rollback is reported below.
        }
      }
      setActionError(error);
      setImportError(messages.categories.importFailed);
      setReloadToken((token) => token + 1);
    } finally {
      setImporting(false);
    }
  };

  const failure = state.error ? resolveFailure(state.error, messages) : undefined;

  const initialPathIds = useMemo(
    () => buildPathIds(selectedCategoryId, state.items),
    [selectedCategoryId, state.items],
  );

  const handleSelect = useCallback((_node: CategoryNode, path: readonly CategoryNode[]) => {
    setSelectedPath(path);
    const id = path[path.length - 1]?.id;
    if (id) {
      onCategorySelect?.(id);
    }
  }, [onCategorySelect]);

  const locate = () => {
    const needle = locateQuery.trim().toLocaleLowerCase();
    if (!needle) {
      setLocateMiss(false);
      return;
    }
    const match = state.items.find((item) =>
      item.displayName.toLocaleLowerCase().includes(needle)
      || item.categoryKey.toLocaleLowerCase().includes(needle));
    if (!match) {
      setLocateMiss(true);
      return;
    }
    const path: string[] = [];
    let current: DeployTemplateCategory | undefined = match;
    while (current) {
      path.unshift(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    setLocatePath(path);
    setLocateKey((key) => key + 1);
    setLocateMiss(false);
  };

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

  const moveSibling = async (category: DeployTemplateCategory, direction: "up" | "down") => {
    const siblings = state.items
      .filter((item) => (item.parentId ?? "") === (category.parentId ?? ""))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.categoryKey.localeCompare(right.categoryKey));
    const index = siblings.findIndex((item) => item.id === category.id);
    const target = siblings[index + (direction === "up" ? -1 : 1)];
    if (!target) {
      return;
    }
    try {
      if (target.sortOrder === category.sortOrder) {
        await service.updateCategory(category.id, {
          categoryKey: category.categoryKey,
          displayName: category.displayName,
          sortOrder: category.sortOrder + (direction === "up" ? -1 : 1),
        });
      } else {
        await service.updateCategory(category.id, {
          categoryKey: category.categoryKey,
          displayName: category.displayName,
          sortOrder: target.sortOrder,
        });
        await service.updateCategory(target.id, {
          categoryKey: target.categoryKey,
          displayName: target.displayName,
          sortOrder: category.sortOrder,
        });
      }
      setActionError(undefined);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setActionError(error);
    }
  };

  const reorderSiblings = async (
    dragged: CategoryNode,
    target: CategoryNode,
    position: "before" | "after",
  ) => {
    const draggedCategory = byId.get(dragged.id);
    const targetCategory = byId.get(target.id);
    if (
      !draggedCategory
      || !targetCategory
      || (draggedCategory.parentId ?? "") !== (targetCategory.parentId ?? "")
    ) {
      return;
    }
    const siblings = state.items
      .filter((item) => (item.parentId ?? "") === (draggedCategory.parentId ?? ""))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.categoryKey.localeCompare(right.categoryKey))
      .filter((item) => item.id !== draggedCategory.id);
    const targetIndex = siblings.findIndex((item) => item.id === targetCategory.id);
    if (targetIndex < 0) {
      return;
    }
    siblings.splice(targetIndex + (position === "after" ? 1 : 0), 0, draggedCategory);
    try {
      for (const [index, sibling] of siblings.entries()) {
        const sortOrder = (index + 1) * 10;
        if (sibling.sortOrder !== sortOrder) {
          await service.updateCategory(sibling.id, {
            categoryKey: sibling.categoryKey,
            displayName: sibling.displayName,
            sortOrder,
          });
        }
      }
      setActionError(undefined);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setActionError(error);
      setReloadToken((token) => token + 1);
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
        <div className="flex items-center gap-2">
          <input
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              void handleImportFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            ref={importInputRef}
            type="file"
          />
          <Button onClick={() => importInputRef.current?.click()} type="button" variant="outline">
            {messages.categories.importAction}
          </Button>
          <Button
            disabled={state.items.length === 0}
            onClick={() => {
              const document = buildTemplateCategoryExport(state.items);
              downloadJsonDocument(
                document,
                `template-categories-${new Date().toISOString().slice(0, 10)}.json`,
              );
            }}
            type="button"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            {messages.categories.exportAction}
          </Button>
          <Button
            disabled={state.status === "loading"}
            onClick={() => setReloadToken((token) => token + 1)}
            type="button"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
            {messages.refresh}
          </Button>
        </div>
      </header>

      <p className="text-xs text-[var(--sdk-color-text-muted)]">{cascadeLabels.depthHint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={cascadeLabels.locatePlaceholder}
            className="pl-9"
            onChange={(event) => setLocateQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                locate();
              }
            }}
            placeholder={cascadeLabels.locatePlaceholder}
            value={locateQuery}
          />
        </div>
        <Button onClick={locate} size="sm" type="button" variant="outline">
          {cascadeLabels.locateAction}
        </Button>
        {locateMiss ? (
          <span className="text-xs text-[var(--sdk-color-state-danger)]">{cascadeLabels.locateEmpty}</span>
        ) : null}
      </div>

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
      {actionError ? (
        <StatusNotice tone="danger">{messages.templateCategories.loadError}</StatusNotice>
      ) : null}
      {importError ? <StatusNotice tone="danger">{importError}</StatusNotice> : null}

      {selectedPath.length > 0 ? (
        <p className="truncate text-xs text-[var(--sdk-color-text-muted)]" aria-label={copy.title}>
          {selectedPath.map((node) => node.displayName).join(" → ")}
        </p>
      ) : null}

      <CascadeCategoryManager
        actions={{
          reorder: (dragged, target, position) => {
            void reorderSiblings(dragged, target, position);
          },
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
                <Button
                  aria-label={`${cascadeLabels.moveUp} ${node.displayName}`}
                  onClick={() => void moveSibling(category, "up")}
                  size="sm"
                  title={cascadeLabels.moveUp}
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`${cascadeLabels.moveDown} ${node.displayName}`}
                  onClick={() => void moveSibling(category, "down")}
                  size="sm"
                  title={cascadeLabels.moveDown}
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
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
        initialPathIds={locatePath.length > 0 ? locatePath : initialPathIds}
        items={nodes}
        key={locateKey}
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
          dragHint: cascadeLabels.dragHint,
        }}
        loading={state.status === "loading"}
        maxDepth={5}
        onSelect={handleSelect}
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
        confirmLabel={importing ? messages.categories.importing : messages.categories.importConfirm}
        confirmLoading={importing}
        description={messages.categories.importDescription.replace("{count}", String(importPlan?.items.length ?? 0))}
        onConfirm={() => {
          void runImport();
        }}
        onOpenChange={(open) => {
          if (!open && !importing) {
            setImportPlan(undefined);
            setImportError(undefined);
          }
        }}
        open={Boolean(importPlan)}
        title={messages.categories.importTitle}
      />

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

/** Ancestor-first ids for a deep link such as `?category=<id>`. */
function buildPathIds(
  categoryId: string | undefined,
  categories: readonly DeployTemplateCategory[],
): readonly string[] {
  if (!categoryId) {
    return [];
  }
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
