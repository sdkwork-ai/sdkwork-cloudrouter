import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderTree, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { CascadeCategoryManager, type CascadeCategoryNode } from '@sdkwork/cloudroutes-pc-commons/components/CascadeCategoryManager';

import {
  Button,
  Dialog,
  ErrorState,
  LoadingState,
  Notice,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { requireString, type ProductCenterPageProps } from './resourcePage.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type Category,
  type ProductCenterError,
} from '../productCenterService.ts';

/** The list contract caps `page_size` at 200; one level is fetched per page. */
const CATEGORY_PAGE_SIZE = 200;
/** Safety bound for one level; the cascade never renders an unbounded set. */
const CATEGORY_LEVEL_LIMIT = 5000;

const CATEGORY_STATUSES = ['active', 'inactive'] as const;

interface CategoryNode extends CascadeCategoryNode {
  raw: Category;
}

type CategoryDialogState =
  | { mode: 'create'; parent: Category | null }
  | { mode: 'edit'; category: Category };

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mergeById(base: readonly Category[], extra: readonly Category[]): Category[] {
  const merged = new Map(base.map((category) => [category.id, category]));
  for (const category of extra) {
    merged.set(category.id, category);
  }
  return [...merged.values()];
}

/**
 * Category cascade.
 *
 * Mirrors the Application Center taxonomy manager: five columns, per-column
 * create actions and per-row create/edit/lifecycle/delete actions. The data is
 * loaded one level at a time — the first column is `root_only=true`, and a
 * deeper column is fetched with `parent_id` the first time its branch is opened,
 * so a large catalog never ships the whole taxonomy to the browser.
 */
export function CategoryTreePage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [items, setItems] = useState<readonly Category[]>([]);
  const [loadedParents, setLoadedParents] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProductCenterError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const fetchLevel = useCallback(async (parentId?: string): Promise<Category[]> => {
    const collected: Category[] = [];
    let page = 1;
    for (;;) {
      const result = await resolved.listCategories({
        page,
        pageSize: CATEGORY_PAGE_SIZE,
        ...(parentId ? { parentId } : { rootOnly: true }),
      });
      collected.push(...result.items);
      if (!result.pageInfo.hasNextPage || collected.length >= CATEGORY_LEVEL_LIMIT) {
        return collected;
      }
      page += 1;
    }
  }, [resolved]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setLoadedParents([]);
    fetchLevel().then(
      (roots) => {
        if (!active) {
          return;
        }
        setItems(roots);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setItems([]);
        setError(describeProductCenterError(loadError));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [fetchLevel, reloadToken]);

  /** Refreshes the root level and every level the operator has already opened. */
  const refreshTree = useCallback(async (extraParents: readonly string[] = []) => {
    const parents = [...new Set([...loadedParents, ...extraParents])];
    const roots = await fetchLevel();
    let next = roots;
    for (const parentId of parents) {
      next = mergeById(next, await fetchLevel(parentId));
    }
    setItems(next);
    setLoadedParents(parents);
  }, [fetchLevel, loadedParents]);

  const reload = () => setReloadToken((token) => token + 1);

  const loadChildren = useCallback(async (parent: Category) => {
    setActionError(null);
    try {
      const children = await fetchLevel(parent.id);
      setItems((current) => mergeById(current, children));
      setLoadedParents((current) => (current.includes(parent.id) ? current : [...current, parent.id]));
    } catch (loadError: unknown) {
      setActionError(describeProductCenterError(loadError).message);
    }
  }, [fetchLevel]);

  const nodes = useMemo<CategoryNode[]>(() => items.map((category) => ({
    id: category.id,
    ...(category.parentId ? { parentId: category.parentId } : {}),
    displayName: category.name,
    secondary: `${category.categoryNo} · ${t(`admin.productCenter.status.${category.status}`, category.status)}`,
    sortOrder: Number(category.sortOrder) || 0,
    status: category.status,
    raw: category,
  })), [items, t]);

  const categoriesById = useMemo(
    () => new Map(items.map((category) => [category.id, category])),
    [items],
  );

  const labels = useMemo(() => ({
    columnTitles: [
      t('admin.productCenter.categoryTree.level1', 'Level 1'),
      t('admin.productCenter.categoryTree.level2', 'Level 2'),
      t('admin.productCenter.categoryTree.level3', 'Level 3'),
      t('admin.productCenter.categoryTree.level4', 'Level 4'),
      t('admin.productCenter.categoryTree.level5', 'Level 5'),
    ],
    empty: t('admin.productCenter.categoryTree.empty', 'No category yet'),
    emptyColumn: t('admin.productCenter.categoryTree.emptyColumn', 'No child category under this category'),
    loading: t('admin.productCenter.state.loading', 'Loading…'),
    selectHint: t('admin.productCenter.categoryTree.selectHint', 'Select a parent on the left first'),
  }), [t]);

  const createFields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'categoryNo',
      label: t('admin.productCenter.categories.field.categoryNo', 'Category no.'),
      kind: 'text',
      required: true,
    },
    {
      name: 'name',
      label: t('admin.productCenter.categories.field.name', 'Name'),
      kind: 'text',
      required: true,
    },
    { name: 'sortOrder', label: t('admin.productCenter.categories.field.sortOrder', 'Sort order'), kind: 'number' },
  ], [t]);

  const editFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'name', label: t('admin.productCenter.categories.field.name', 'Name'), kind: 'text', required: true },
    { name: 'sortOrder', label: t('admin.productCenter.categories.field.sortOrder', 'Sort order'), kind: 'number' },
    {
      name: 'status',
      label: t('admin.productCenter.categories.field.status', 'Status'),
      kind: 'select',
      options: CATEGORY_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  const submitCreate = (values: Record<string, string | boolean>) => {
    if (!dialog || dialog.mode !== 'create') {
      return Promise.resolve();
    }
    const parent = dialog.parent;
    return resolved.createCategory({
      categoryNo: requireString(values, 'categoryNo'),
      name: requireString(values, 'name'),
      ...(parent ? { parentId: parent.id } : {}),
      ...(optionalString(values, 'sortOrder') ? { sortOrder: optionalString(values, 'sortOrder') } : {}),
    }).then(async () => {
      setNotice(t('admin.productCenter.toast.created', 'Created'));
      await refreshTree(parent ? [parent.id] : []);
    });
  };

  const submitEdit = (values: Record<string, string | boolean>) => {
    if (!dialog || dialog.mode !== 'edit') {
      return Promise.resolve();
    }
    const target = dialog.category;
    return resolved.updateCategory(target.id, target.version, {
      name: requireString(values, 'name'),
      sortOrder: optionalString(values, 'sortOrder'),
      status: values.status === 'inactive' ? 'inactive' : 'active',
    }).then(async () => {
      setNotice(t('admin.productCenter.toast.saved', 'Saved'));
      await refreshTree();
    });
  };

  const toggleStatus = async (category: Category) => {
    setBusyId(category.id);
    setActionError(null);
    try {
      await resolved.updateCategory(category.id, category.version, {
        status: category.status === 'active' ? 'inactive' : 'active',
      });
      setNotice(t('admin.productCenter.toast.saved', 'Saved'));
      await refreshTree();
    } catch (toggleError: unknown) {
      setActionError(describeProductCenterError(toggleError).message);
    } finally {
      setBusyId(undefined);
    }
  };

  const removeCategory = (category: Category) => {
    setActionError(null);
    resolved.deleteCategory(category.id, category.version).then(
      async () => {
        setNotice(t('admin.productCenter.toast.deleted', 'Deleted'));
        setDeleting(null);
        setLoadedParents((current) => current.filter((parentId) => parentId !== category.id));
        await refreshTree();
      },
      (deleteError: unknown) => {
        setDeleting(null);
        setActionError(describeProductCenterError(deleteError).message);
      },
    );
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <FolderTree aria-hidden="true" className="h-5 w-5" />
            {t('admin.productCenter.categoryTree.title', 'Category Tree')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.categoryTree.description', 'Browse the taxonomy level by level; every level is a real parent/child relation in the catalog.')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={reload} variant="secondary">
            <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.productCenter.actions.refresh', 'Refresh')}
          </Button>
        </div>
      </header>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('admin.productCenter.categoryTree.depthHint', 'Up to 5 levels are supported.')}
      </p>

      {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
      {actionError ? <Notice onDismiss={() => setActionError(null)} tone="error">{actionError}</Notice> : null}

      {loading ? (
        <LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} />
      ) : error ? (
        <ErrorState
          code={error.code}
          codeLabel={t('admin.productCenter.error.code', 'Error code')}
          message={error.message}
          onRetry={reload}
          retryLabel={t('admin.productCenter.actions.retry', 'Retry')}
          title={t('admin.productCenter.state.error', 'The request failed')}
          traceId={error.traceId}
          traceLabel={t('admin.productCenter.error.traceId', 'Trace id')}
        />
      ) : (
        <CascadeCategoryManager<CategoryNode>
          actions={{
            create: (level, parent) => {
              if (level === 1) {
                return (
                  <ColumnCreateAction
                    label={t('admin.productCenter.categoryTree.addRoot', 'New level-1 category')}
                    onClick={() => setDialog({ mode: 'create', parent: null })}
                  />
                );
              }
              if (!parent) {
                return null;
              }
              return (
                <ColumnCreateAction
                  label={t('admin.productCenter.categoryTree.addChild', 'New child category')}
                  onClick={() => setDialog({ mode: 'create', parent: parent.raw })}
                />
              );
            },
            node: (node, level) => {
              const category = categoriesById.get(node.id);
              if (!category) {
                return null;
              }
              const rowBusy = busyId === category.id;
              const inactive = category.status === 'inactive';
              const addChildLabel = t('admin.productCenter.categoryTree.addChild', 'New child category');
              const editLabel = t('admin.productCenter.actions.edit', 'Edit');
              const lifecycleLabel = inactive
                ? t('admin.productCenter.categoryTree.action.enable', 'Enable')
                : t('admin.productCenter.categoryTree.action.disable', 'Disable');
              const deleteLabel = t('admin.productCenter.actions.delete', 'Delete');
              return (
                <div className="flex items-center gap-0.5">
                  {level < 5 ? (
                    <RowAction
                      disabled={rowBusy}
                      label={`${addChildLabel} ${node.displayName}`}
                      onClick={() => setDialog({ mode: 'create', parent: category })}
                      title={addChildLabel}
                    >
                      <Plus aria-hidden="true" className="h-3 w-3" />
                    </RowAction>
                  ) : null}
                  <RowAction
                    disabled={rowBusy}
                    label={`${editLabel} ${node.displayName}`}
                    onClick={() => setDialog({ mode: 'edit', category })}
                    title={editLabel}
                  >
                    <Pencil aria-hidden="true" className="h-3 w-3" />
                  </RowAction>
                  <RowAction
                    disabled={rowBusy}
                    label={`${lifecycleLabel} ${node.displayName}`}
                    onClick={() => void toggleStatus(category)}
                    title={lifecycleLabel}
                  >
                    <Power aria-hidden="true" className="h-3 w-3" />
                  </RowAction>
                  <RowAction
                    disabled={rowBusy}
                    label={`${deleteLabel} ${node.displayName}`}
                    onClick={() => {
                      setActionError(null);
                      if (!category.isLeaf) {
                        setActionError(t(
                          'admin.productCenter.categoryTree.hasChildren',
                          'This category still has children; remove or disable them first.',
                        ));
                        return;
                      }
                      setDeleting(category);
                    }}
                    title={deleteLabel}
                  >
                    <Trash2 aria-hidden="true" className="h-3 w-3" />
                  </RowAction>
                </div>
              );
            },
          }}
          items={nodes}
          labels={labels}
          maxDepth={5}
          onSelect={(node) => {
            if (node.raw.isLeaf || loadedParents.includes(node.raw.id)) {
              return;
            }
            void loadChildren(node.raw);
          }}
        />
      )}

      <RecordFormDialog
        fields={createFields}
        initialValues={{}}
        onClose={() => setDialog(null)}
        onSubmit={submitCreate}
        open={dialog?.mode === 'create'}
        title={dialog?.mode === 'create' && dialog.parent
          ? `${t('admin.productCenter.categoryTree.addChild', 'New child category')} · ${dialog.parent.name}`
          : t('admin.productCenter.categoryTree.addRoot', 'New level-1 category')}
      />

      <RecordFormDialog
        fields={editFields}
        initialValues={dialog?.mode === 'edit' ? {
          name: dialog.category.name,
          sortOrder: dialog.category.sortOrder,
          status: dialog.category.status,
        } : {}}
        onClose={() => setDialog(null)}
        onSubmit={submitEdit}
        open={dialog?.mode === 'edit'}
        title={t('admin.productCenter.categories.editTitle', 'Edit category')}
      />

      <Dialog
        footer={
          <>
            <Button onClick={() => setDeleting(null)} variant="secondary">
              {t('admin.productCenter.actions.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => deleting && removeCategory(deleting)} variant="danger">
              {t('admin.productCenter.actions.delete', 'Delete')}
            </Button>
          </>
        }
        onClose={() => setDeleting(null)}
        open={deleting !== null}
        title={t('admin.productCenter.actions.confirmDelete', 'Delete this record?')}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{deleting?.name}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('admin.productCenter.categoryTree.deleteHint', 'A category with live children or products cannot be deleted; the backend answers with a conflict.')}
        </p>
      </Dialog>
    </section>
  );
}

/** Compact per-column create action, matching the Application Center cascade. */
function ColumnCreateAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      onClick={onClick}
      type="button"
    >
      <Plus aria-hidden="true" className="h-3 w-3" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** Compact icon-only row action, so the row label keeps its space. */
function RowAction({
  children,
  disabled = false,
  label,
  onClick,
  title,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={label}
      className="rounded p-0 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}
