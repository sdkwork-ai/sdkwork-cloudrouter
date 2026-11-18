import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import {
  Button,
  Dialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
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
const CATEGORY_LEVEL_PAGE_SIZE = 200;

const CATEGORY_STATUSES = ['active', 'inactive'] as const;

type CategoryDialogState =
  | { mode: 'create'; parent: Category | null }
  | { mode: 'edit'; category: Category };

interface CategoryLevel {
  parent: Category | null;
  items: readonly Category[];
  loading: boolean;
  truncated: boolean;
}

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Lazy category cascade.
 *
 * The taxonomy is deep (the seeded retail taxonomy is four to five levels) and
 * can be large, so the page never loads the whole tree: the first column is the
 * root set (`root_only=true`) and every deeper column is one `parent_id` query
 * issued when the operator opens that branch. Each level is capped by the list
 * contract's 200-row page, and the UI states when a level was truncated instead
 * of silently hiding rows.
 */
export function CategoryTreePage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [roots, setRoots] = useState<readonly Category[]>([]);
  const [rootsTruncated, setRootsTruncated] = useState(false);
  const [children, setChildren] = useState<Record<string, readonly Category[]>>({});
  const [truncated, setTruncated] = useState<Record<string, boolean>>({});
  const [loadingLevels, setLoadingLevels] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProductCenterError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedPath, setSelectedPath] = useState<readonly Category[]>([]);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const loadLevel = useCallback(async (parent: Category | null): Promise<readonly Category[]> => {
    const key = parent?.id ?? '';
    setLoadingLevels((current) => ({ ...current, [key]: true }));
    try {
      const page = await resolved.listCategories({
        page: 1,
        pageSize: CATEGORY_LEVEL_PAGE_SIZE,
        ...(parent ? { parentId: parent.id } : { rootOnly: true }),
      });
      if (parent) {
        setChildren((current) => ({ ...current, [parent.id]: page.items }));
        setTruncated((current) => ({ ...current, [parent.id]: page.pageInfo.hasNextPage }));
      } else {
        setRoots(page.items);
        setRootsTruncated(page.pageInfo.hasNextPage);
      }
      return page.items;
    } finally {
      setLoadingLevels((current) => ({ ...current, [key]: false }));
    }
  }, [resolved]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    resolved.listCategories({ page: 1, pageSize: CATEGORY_LEVEL_PAGE_SIZE, rootOnly: true }).then(
      (page) => {
        if (!active) {
          return;
        }
        setRoots(page.items);
        setRootsTruncated(page.pageInfo.hasNextPage);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setRoots([]);
        setError(describeProductCenterError(loadError));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [reloadToken, resolved]);

  const levels = useMemo<CategoryLevel[]>(() => {
    const result: CategoryLevel[] = [{
      parent: null,
      items: roots,
      loading: Boolean(loadingLevels['']),
      truncated: rootsTruncated,
    }];
    for (const node of selectedPath) {
      const cached = children[node.id];
      if (cached === undefined) {
        break;
      }
      result.push({
        parent: node,
        items: cached,
        loading: Boolean(loadingLevels[node.id]),
        truncated: Boolean(truncated[node.id]),
      });
      if (cached.length === 0) {
        break;
      }
    }
    return result;
  }, [children, loadingLevels, roots, rootsTruncated, selectedPath, truncated]);

  const selected = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null;

  const categoryName = useCallback(
    (id: string | null | undefined) => (
      id ? findCategory(roots, children, id)?.name ?? id : '—'
    ),
    [children, roots],
  );

  const selectNode = (level: number, node: Category) => {
    setSelectedPath((previous) => [...previous.slice(0, level), node]);
    if (children[node.id] === undefined) {
      void loadLevel(node).catch((loadError: unknown) => {
        setActionError(describeProductCenterError(loadError).message);
      });
    }
  };

  /** Re-reads the level a mutation belongs to, keeping the operator in place. */
  const refreshLevel = async (parent: Category | null) => {
    await loadLevel(parent);
    if (parent) {
      setSelectedPath((previous) => previous);
    }
    reload();
  };

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
      await refreshLevel(parent);
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
      await refreshLevel(parentOf(selectedPath, target));
    });
  };

  const removeCategory = (category: Category) => {
    setActionError(null);
    resolved.deleteCategory(category.id, category.version).then(
      async () => {
        setNotice(t('admin.productCenter.toast.deleted', 'Deleted'));
        setDeleting(null);
        setSelectedPath((previous) => previous.filter((node) => node.id !== category.id));
        setChildren((current) => {
          const next = { ...current };
          delete next[category.id];
          return next;
        });
        await refreshLevel(parentOf(selectedPath, category));
      },
      (deleteError: unknown) => {
        setDeleting(null);
        setActionError(describeProductCenterError(deleteError).message);
      },
    );
  };

  const renderLevel = (level: CategoryLevel, index: number) => {
    const columnTitle = [
      t('admin.productCenter.categoryTree.level1', 'Level 1'),
      t('admin.productCenter.categoryTree.level2', 'Level 2'),
      t('admin.productCenter.categoryTree.level3', 'Level 3'),
      t('admin.productCenter.categoryTree.level4', 'Level 4'),
      t('admin.productCenter.categoryTree.level5', 'Level 5'),
    ][Math.min(index, 4)];

    return (
      <section
        className="flex min-h-0 w-full min-w-[210px] flex-1 flex-col rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717]"
        key={level.parent?.id ?? 'root'}
      >
        <header className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
          {columnTitle}
          {level.parent ? <span className="ml-1 font-normal text-slate-400">· {level.parent.name}</span> : null}
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-1">
          {level.loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : level.items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {t('admin.productCenter.categoryTree.emptyColumn', 'Select a parent to see its children')}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {level.items.map((node) => {
                const active = selectedPath[index]?.id === node.id;
                return (
                  <li key={node.id}>
                    <div
                      className={`group flex items-center gap-1 rounded px-1.5 py-1 text-sm ${
                        active
                          ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/15 dark:text-lobster-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                      }`}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-1 text-left"
                        onClick={() => selectNode(index, node)}
                        type="button"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 shrink-0 text-slate-400 ${active ? 'rotate-90' : ''}`}
                        />
                        <span className="truncate">{node.name}</span>
                      </button>
                      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          aria-label={t('admin.productCenter.categoryTree.addChild', 'New child category')}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          onClick={() => setDialog({ mode: 'create', parent: node })}
                          type="button"
                        >
                          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label={t('admin.productCenter.actions.edit', 'Edit')}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          onClick={() => setDialog({ mode: 'edit', category: node })}
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {level.truncated ? (
            <p className="px-2 pt-2 text-center text-[11px] text-amber-600 dark:text-amber-400">
              {t('admin.productCenter.categoryTree.truncated', 'This level has more rows than one page; narrow it with a search in the list view.')}
            </p>
          ) : null}
        </div>
      </section>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <>
            <Button onClick={() => setDialog({ mode: 'create', parent: null })} variant="secondary">
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.categoryTree.addRoot', 'New root category')}
            </Button>
            <Button onClick={reload} variant="secondary">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.refresh', 'Refresh')}
            </Button>
          </>
        }
        description={t('admin.productCenter.categoryTree.description', 'Browse the taxonomy level by level; every level is a real parent/child relation in the catalog.')}
        title={t('admin.productCenter.categoryTree.title', 'Category Tree')}
      />

      {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
      {actionError ? <Notice onDismiss={() => setActionError(null)} tone="error">{actionError}</Notice> : null}

      {loading ? (
        <Panel><LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} /></Panel>
      ) : error ? (
        <Panel>
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
        </Panel>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto">
            {levels.map((level, index) => renderLevel(level, index))}
          </div>

          <Panel
            actions={
              selected ? (
                <>
                  <Button onClick={() => setDialog({ mode: 'create', parent: selected })} variant="secondary">
                    <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                    {t('admin.productCenter.categoryTree.addChild', 'New child category')}
                  </Button>
                  <Button onClick={() => setDialog({ mode: 'edit', category: selected })} variant="secondary">
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    {t('admin.productCenter.actions.edit', 'Edit')}
                  </Button>
                  <Button onClick={() => setDeleting(selected)} variant="danger">
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {t('admin.productCenter.actions.delete', 'Delete')}
                  </Button>
                </>
              ) : null
            }
            title={t('admin.productCenter.categoryTree.selectedTitle', 'Selected category')}
          >
            {selected ? (
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.productCenter.categories.column.name', 'Category')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{selected.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.productCenter.categories.column.categoryNo', 'Category no.')}
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-800 dark:text-slate-100">{selected.categoryNo}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.productCenter.categoryTree.parent', 'Parent')}
                  </dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                    {selected.parentId
                      ? categoryName(selected.parentId)
                      : t('admin.productCenter.categories.root', 'Root')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.productCenter.detail.section.status', 'Status')}
                  </dt>
                  <dd className="mt-0.5">
                    <StatusBadge
                      label={t(`admin.productCenter.status.${selected.status}`, selected.status)}
                      value={selected.status}
                    />
                  </dd>
                </div>
                <div className="md:col-span-4">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.productCenter.categoryTree.path', 'Path')}
                  </dt>
                  <dd className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {selectedPath.map((category) => category.name).join(' / ')}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {t('admin.productCenter.categoryTree.noSelection', 'Select a category in the tree to inspect it.')}
              </p>
            )}
          </Panel>
        </>
      )}

      <RecordFormDialog
        fields={createFields}
        initialValues={{}}
        onClose={() => setDialog(null)}
        onSubmit={submitCreate}
        open={dialog?.mode === 'create'}
        title={dialog?.mode === 'create' && dialog.parent
          ? `${t('admin.productCenter.categoryTree.addChild', 'New child category')} · ${dialog.parent.name}`
          : t('admin.productCenter.categoryTree.addRoot', 'New root category')}
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
    </div>
  );
}

function findCategory(
  roots: readonly Category[],
  children: Record<string, readonly Category[]>,
  id: string,
): Category | undefined {
  const root = roots.find((category) => category.id === id);
  if (root) {
    return root;
  }
  for (const items of Object.values(children)) {
    const match = items.find((category) => category.id === id);
    if (match) {
      return match;
    }
  }
  return undefined;
}

/** Parent node of `category` inside the current selection path, or null for a root. */
function parentOf(path: readonly Category[], category: Category): Category | null {
  const index = path.findIndex((node) => node.id === category.id);
  if (index <= 0) {
    return null;
  }
  return path[index - 1] ?? null;
}
