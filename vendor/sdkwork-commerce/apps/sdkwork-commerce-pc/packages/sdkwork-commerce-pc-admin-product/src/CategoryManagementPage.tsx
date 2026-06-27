import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Edit3, MoreHorizontal, Plus, RefreshCw, Rocket, Trash2, X } from 'lucide-react';
import { BusinessStatePanel } from './commerce-admin-primitives';
import { readApiData, readApiItems } from './commerce-api-result';
import {
  createCommerceCategory,
  deleteCommerceCategory,
  initializeCommerceCategorySeeds,
  listCommerceCategories,
  updateCommerceCategory,
} from './catalogService';

type CategoryStatus = 'active' | 'inactive' | 'archived';
type CategoryModalMode = 'create' | 'edit';
type CategoryMoveDirection = 'up' | 'down';

export type CategoryRecord = {
  id: string;
  categoryNo: string;
  parentId: string | null;
  name: string;
  path: string;
  levelNo: number;
  status: CategoryStatus;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryTreeNode = CategoryRecord & {
  children: CategoryTreeNode[];
};

type CategoryColumnModel = {
  title: string;
  parentId: string | null;
  nodes: CategoryTreeNode[];
};

type CategoryFormState = {
  id?: string;
  categoryNo: string;
  parentId: string;
  name: string;
  status: CategoryStatus;
  sortOrder: string;
};

type CategoryModalState = {
  open: boolean;
  mode: CategoryModalMode;
  parentId: string | null;
  record: CategoryRecord | null;
};

type CategoryContextMenuState = {
  record: CategoryTreeNode;
  x: number;
  y: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

type SeedSummary = {
  dataset: string;
  targetTable: string;
  requested: number;
  upserted: number;
  skipped: number;
  installDefaultEnabled: boolean;
  configKey: string;
};

type CategoryListState = {
  loading: boolean;
  error: string | null;
  records: CategoryRecord[];
};

type CategoryMessage = {
  tone: 'success' | 'error';
  text: string;
};

export const CATEGORY_SEED_DATASETS = ['product'] as const;
const CATEGORY_LIST_PAGE_SIZE = 200;
const MAX_CATEGORY_LIST_PAGES = 50;

const EMPTY_FORM: CategoryFormState = {
  categoryNo: '',
  parentId: '',
  name: '',
  status: 'active',
  sortOrder: '0',
};

const INITIAL_STATE: CategoryListState = {
  loading: true,
  error: null,
  records: [],
};

const CLOSED_MODAL: CategoryModalState = {
  open: false,
  mode: 'create',
  parentId: null,
  record: null,
};

export function CategoryManagementPage() {
  const [state, setState] = useState<CategoryListState>(INITIAL_STATE);
  const [activePathIds, setActivePathIds] = useState<string[]>([]);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [modal, setModal] = useState<CategoryModalState>(CLOSED_MODAL);
  const [contextMenu, setContextMenu] = useState<CategoryContextMenuState | null>(null);
  const [seedSummaries, setSeedSummaries] = useState<SeedSummary[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<CategoryMessage | null>(null);

  const tree = useMemo(() => buildCategoryTree(state.records), [state.records]);
  const columns = useMemo(() => buildCategoryColumns(activePathIds, tree), [activePathIds, tree]);
  const seedSummaryText = useMemo(() => summarizeSeedResults(seedSummaries), [seedSummaries]);

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    setActivePathIds((current) => normalizeActivePathIds(current, tree));
  }, [tree]);

  async function loadCategories() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({
        loading: false,
        error: null,
        records: await loadAllCategoryRecords(),
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error && error.message ? error.message : '分类数据加载失败',
        records: [],
      });
    }
  }

  async function handleSeedInitialize() {
    setSeedLoading(true);
    setMessage(null);
    try {
      const result = await initializeCommerceCategorySeeds({
        datasets: [...CATEGORY_SEED_DATASETS],
        mode: 'admin_button',
      });
      const summaries = readSeedSummaries(result);
      setSeedSummaries(summaries);
      setMessage({ tone: 'success', text: summarizeSeedResults(summaries) || '分类初始化完成。' });
      await loadCategories();
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error && error.message ? error.message : '分类初始化失败',
      });
    } finally {
      setSeedLoading(false);
    }
  }

  function openCategoryModal(mode: CategoryModalMode, record?: CategoryRecord | null, parentId?: string | null) {
    const nextRecord = record ?? null;
    setModal({ open: true, mode, record: nextRecord, parentId: parentId ?? nextRecord?.parentId ?? null });
    setForm(nextRecord ? readCategoryForm(nextRecord) : createCategoryForm(parentId ?? null, state.records));
    setMessage(null);
  }

  function closeCategoryModal() {
    setModal(CLOSED_MODAL);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage({ tone: 'error', text: '分类名称必填。' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const categoryNo = form.categoryNo.trim() || generateCategoryNo(state.records);
    const payload = {
      categoryNo,
      parentId: form.parentId.trim() || null,
      name: form.name.trim(),
      status: form.status,
      sortOrder: String(Number.parseInt(form.sortOrder, 10) || 0),
    };
    try {
      if (form.id) {
        await updateCommerceCategory(form.id, payload);
        setMessage({ tone: 'success', text: '分类已更新。' });
      } else {
        await createCommerceCategory(payload);
        setMessage({ tone: 'success', text: '分类已创建。' });
      }
      closeCategoryModal();
      await loadCategories();
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error && error.message ? error.message : '分类保存失败',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: CategoryRecord) {
    setMessage(null);
    try {
      await deleteCommerceCategory(record.id);
      setActivePathIds((current) => current.filter((id) => id !== record.id));
      setMessage({ tone: 'success', text: '分类已归档。' });
      await loadCategories();
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error && error.message ? error.message : '分类删除失败，可能仍有子分类或商品。',
      });
    }
  }

  function selectCategory(node: CategoryTreeNode, depth: number) {
    setContextMenu(null);
    setActivePathIds((current) => [...current.slice(0, depth), node.id]);
  }

  function openCategoryContextMenu(
    event: React.MouseEvent,
    record: CategoryTreeNode,
    canMoveUp: boolean,
    canMoveDown: boolean,
  ) {
    event.preventDefault();
    setActivePathIds(findCategoryPathIds(record.id, tree));
    setContextMenu({ record, x: event.clientX, y: event.clientY, canMoveUp, canMoveDown });
  }

  async function handleCategoryMove(record: CategoryRecord, direction: CategoryMoveDirection) {
    const siblingRecords = state.records
      .filter((item) => (item.parentId ?? null) === (record.parentId ?? null))
      .sort(compareCategorySiblings);
    const currentIndex = siblingRecords.findIndex((item) => item.id === record.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetRecord = siblingRecords[targetIndex];
    if (currentIndex < 0 || !targetRecord) {
      return;
    }

    const previousRecords = state.records;
    setMessage(null);
    setContextMenu(null);
    setState((current) => ({
      ...current,
      records: applyCategoryMoveLocally(current.records, record, targetRecord),
    }));
    try {
      await moveCategorySortOrder(record, targetRecord);
    } catch (error) {
      setState((current) => ({ ...current, records: previousRecords }));
      setMessage({
        tone: 'error',
        text: error instanceof Error && error.message ? error.message : '分类排序更新失败',
      });
    }
  }

  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 px-5 pb-6 pt-4 text-slate-900 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-slate-100"
      data-admin-category-management-page
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#171717]"
        data-admin-category-scroll-shell
      >
        <CategorySeedInitializePanel
          seedLoading={seedLoading}
          seedSummaryText={seedSummaryText}
          onCreateRoot={() => openCategoryModal('create', null, null)}
          onRefresh={() => void loadCategories()}
          onSeedInitialize={() => void handleSeedInitialize()}
        />

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
            }`}
            data-admin-category-message
          >
            {message.text}
          </div>
        ) : null}

        <div
          className="grid min-h-0 flex-1 overflow-hidden gap-3 lg:grid-cols-1"
          data-admin-category-cascade-manager
        >
          <CategoryTreeTable
            activePathIds={activePathIds}
            columns={columns}
            error={state.error}
            loading={state.loading}
            tree={tree}
            onCreateChild={(parentId) => openCategoryModal('create', null, parentId)}
            onLoadCategories={() => void loadCategories()}
            onMove={(record, direction) => void handleCategoryMove(record, direction)}
            onOpenContextMenu={openCategoryContextMenu}
            onSelect={selectCategory}
          />
        </div>
      </div>

      {contextMenu ? (
        <CategoryContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateChild={(record) => {
            setContextMenu(null);
            openCategoryModal('create', null, record.id);
          }}
          onDelete={(record) => {
            setContextMenu(null);
            void handleDelete(record);
          }}
          onEdit={(record) => {
            setContextMenu(null);
            openCategoryModal('edit', record);
          }}
          onMove={(record, direction) => void handleCategoryMove(record, direction)}
        />
      ) : null}

      {modal.open ? (
        <CategoryMutationModal
          form={form}
          mode={modal.mode}
          records={state.records}
          saving={saving}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onClose={closeCategoryModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

function CategorySeedInitializePanel({
  onCreateRoot,
  onRefresh,
  onSeedInitialize,
  seedLoading,
  seedSummaryText,
}: {
  seedLoading: boolean;
  seedSummaryText: string;
  onCreateRoot: () => void;
  onRefresh: () => void;
  onSeedInitialize: () => void;
}) {
  return (
    <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]" data-admin-category-toolbar>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCreateRoot}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-lobster-300 hover:text-lobster-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lobster-500/40"
          data-admin-category-create-button
        >
          <Plus className="h-4 w-4" />
          新增分类
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {seedSummaryText ? (
            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10" data-admin-category-seed-summary>
              {seedSummaryText}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-lobster-300 hover:text-lobster-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lobster-500/40"
            data-admin-category-refresh
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
          <button
            type="button"
            disabled={seedLoading}
            onClick={onSeedInitialize}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lobster-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lobster-500 dark:hover:bg-lobster-400"
            data-admin-category-initialize-button
          >
            {seedLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {seedLoading ? '初始化中' : '初始化数据'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryTreeTable({
  activePathIds,
  columns,
  error,
  loading,
  onCreateChild,
  onLoadCategories,
  onMove,
  onOpenContextMenu,
  onSelect,
  tree,
}: {
  activePathIds: string[];
  columns: CategoryColumnModel[];
  error: string | null;
  loading: boolean;
  tree: CategoryTreeNode[];
  onCreateChild: (parentId: string | null) => void;
  onLoadCategories: () => void;
  onMove: (record: CategoryRecord, direction: CategoryMoveDirection) => void;
  onOpenContextMenu: (event: React.MouseEvent, record: CategoryTreeNode, canMoveUp: boolean, canMoveDown: boolean) => void;
  onSelect: (node: CategoryTreeNode, depth: number) => void;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#111111]">
      {loading ? (
        <BusinessStatePanel kind="loading" title="分类加载中..." />
      ) : error ? (
        <BusinessStatePanel kind="error" title="分类加载失败" description={error} onRetry={onLoadCategories} />
      ) : tree.length === 0 ? (
        <BusinessStatePanel kind="empty" title="暂无分类" description="点击初始化数据或新增分类。" />
      ) : (
        <CategoryCascadeColumns
          activePathIds={activePathIds}
          columns={columns}
          onCreateChild={onCreateChild}
          onMove={onMove}
          onOpenContextMenu={onOpenContextMenu}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function CategoryCascadeColumns({
  activePathIds,
  columns,
  onCreateChild,
  onMove,
  onOpenContextMenu,
  onSelect,
}: {
  activePathIds: string[];
  columns: CategoryColumnModel[];
  onCreateChild: (parentId: string | null) => void;
  onMove: (record: CategoryRecord, direction: CategoryMoveDirection) => void;
  onOpenContextMenu: (event: React.MouseEvent, record: CategoryTreeNode, canMoveUp: boolean, canMoveDown: boolean) => void;
  onSelect: (node: CategoryTreeNode, depth: number) => void;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-x-auto" data-admin-category-cascade-columns>
      {columns.map((column, depth) => (
        <div
          key={`${column.parentId ?? 'root'}-${depth}`}
          className="flex min-h-0 w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white last:border-r-0 dark:border-white/10 dark:bg-[#171717]"
          data-admin-category-cascade-column
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{column.title}</span>
            <button
              type="button"
              onClick={() => onCreateChild(column.parentId)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10"
              data-admin-category-column-create={column.parentId ?? 'root'}
            >
              <Plus className="h-3.5 w-3.5" />
              新增
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {column.nodes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500">
                暂无下级分类
              </div>
            ) : (
              column.nodes.map((node, index) => {
                const active = activePathIds[depth] === node.id;
                const canMoveUp = index > 0;
                const canMoveDown = index < column.nodes.length - 1;
                return (
                  <div
                    key={node.id}
                    className={`group mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-lobster-50 text-lobster-700 ring-1 ring-lobster-200 dark:bg-lobster-500/10 dark:text-lobster-200 dark:ring-lobster-500/30'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                    }`}
                    onContextMenu={(event) => onOpenContextMenu(event, node, canMoveUp, canMoveDown)}
                    data-admin-category-cascade-node={node.id}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(node, depth)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-medium">{node.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{node.categoryNo}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" data-admin-category-hover-actions>
                      <CategoryInlineMoveButton
                        label="上移"
                        disabled={!canMoveUp}
                        onClick={() => onMove(node, 'up')}
                        dataAttribute="data-admin-category-inline-move-up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </CategoryInlineMoveButton>
                      <CategoryInlineMoveButton
                        label="下移"
                        disabled={!canMoveDown}
                        onClick={() => onMove(node, 'down')}
                        dataAttribute="data-admin-category-inline-move-down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </CategoryInlineMoveButton>
                      <button
                        type="button"
                        aria-label="更多分类操作"
                        title="更多分类操作"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenContextMenu(event, node, canMoveUp, canMoveDown);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-lobster-200 hover:bg-lobster-50 hover:text-lobster-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10 dark:hover:text-lobster-200"
                        data-admin-category-more-action
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        {node.children.length}
                      </span>
                      {node.children.length > 0 ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryInlineMoveButton({
  children,
  dataAttribute,
  disabled = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  dataAttribute: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  const dataProps = { [dataAttribute]: true };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-lobster-200 hover:bg-lobster-50 hover:text-lobster-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:bg-lobster-500/10 dark:hover:text-lobster-200"
      {...dataProps}
    >
      {children}
    </button>
  );
}

function CategoryContextMenu({
  menu,
  onClose,
  onCreateChild,
  onDelete,
  onEdit,
  onMove,
}: {
  menu: CategoryContextMenuState;
  onClose: () => void;
  onCreateChild: (record: CategoryTreeNode) => void;
  onDelete: (record: CategoryTreeNode) => void;
  onEdit: (record: CategoryTreeNode) => void;
  onMove: (record: CategoryTreeNode, direction: CategoryMoveDirection) => void;
}) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="fixed z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]"
        style={{ left: menu.x, top: menu.y }}
        data-admin-category-context-menu
        onClick={(event) => event.stopPropagation()}
      >
        <CategoryContextMenuItem
          label="新增下级"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onCreateChild(menu.record)}
          dataAttribute="data-admin-category-action-create-child"
        />
        <CategoryContextMenuItem
          label="编辑分类"
          icon={<Edit3 className="h-3.5 w-3.5" />}
          onClick={() => onEdit(menu.record)}
          dataAttribute="data-admin-category-action-edit"
        />
        <CategoryContextMenuItem
          label="上移"
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          disabled={!menu.canMoveUp}
          onClick={() => onMove(menu.record, 'up')}
          dataAttribute="data-admin-category-action-move-up"
        />
        <CategoryContextMenuItem
          label="下移"
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          disabled={!menu.canMoveDown}
          onClick={() => onMove(menu.record, 'down')}
          dataAttribute="data-admin-category-action-move-down"
        />
        <div className="my-1 h-px bg-slate-100 dark:bg-white/10" />
        <CategoryContextMenuItem
          label="删除分类"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          tone="danger"
          onClick={() => onDelete(menu.record)}
          dataAttribute="data-admin-category-action-delete"
        />
      </div>
    </div>
  );
}

function CategoryContextMenuItem({
  dataAttribute,
  disabled = false,
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  dataAttribute: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const dataProps = { [dataAttribute]: true };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
      }`}
      {...dataProps}
    >
      {icon}
      {label}
    </button>
  );
}

function CategoryMutationModal({
  form,
  mode,
  records,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: CategoryFormState;
  mode: CategoryModalMode;
  records: CategoryRecord[];
  saving: boolean;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm dark:bg-black/60" data-admin-category-create-modal>
      <form
        onSubmit={onSubmit}
        className="flex max-h-[calc(100vh-48px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{mode === 'edit' ? '编辑分类' : '新增分类'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">选择父级后即可在级联列中看到层级位置。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2">
          <CategoryGeneratedNoField value={form.categoryNo} />
          <CategoryInput label="分类名称" value={form.name} onChange={(name) => onChange({ name })} placeholder="休闲零食" />
          <CategoryParentCascader
            currentCategoryId={form.id}
            records={records}
            value={form.parentId}
            onChange={(parentId) => onChange({ parentId })}
          />
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            状态
            <select
              value={form.status}
              onChange={(event) => onChange({ status: readCategoryStatus(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-lobster-400 focus:ring-4 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <CategoryInput label="排序" value={form.sortOrder} onChange={(sortOrder) => onChange({ sortOrder })} placeholder="100" />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-lobster-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-admin-category-modal-submit
          >
            {mode === 'edit' ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? '保存中' : mode === 'edit' ? '保存修改' : '创建分类'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CategoryGeneratedNoField({ value }: { value: string }) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      分类编号
      <div className="mt-1 flex items-center gap-2">
        <input
          value={value}
          readOnly
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          data-admin-category-generated-no
        />
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          自动生成
        </span>
      </div>
    </label>
  );
}

function CategoryParentCascader({
  currentCategoryId,
  onChange,
  records,
  value,
}: {
  currentCategoryId?: string;
  records: CategoryRecord[];
  value: string;
  onChange: (parentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const excludedIds = useMemo(() => collectUnavailableParentIds(records, currentCategoryId), [records, currentCategoryId]);
  const selectableTree = useMemo(
    () => buildCategoryTree(records.filter((record) => !excludedIds.has(record.id))),
    [records, excludedIds],
  );
  const activePathIds = useMemo(() => findCategoryPathIds(value, selectableTree), [selectableTree, value]);
  const columns = useMemo(() => buildCategoryParentColumns(activePathIds, selectableTree), [activePathIds, selectableTree]);
  const selectedPathLabel = useMemo(() => formatCategoryPathLabel(activePathIds, selectableTree), [activePathIds, selectableTree]);

  function selectParent(node: CategoryTreeNode) {
    onChange(node.id);
    if (node.children.length === 0) {
      setOpen(false);
    }
  }

  return (
    <div className="md:col-span-2" data-admin-category-parent-cascader>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">父级分类</label>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-medium text-slate-400 transition hover:text-red-500"
          >
            清空父级
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition hover:border-lobster-300 focus:border-lobster-400 focus:ring-4 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white dark:hover:border-lobster-500/40"
        data-admin-category-parent-trigger
      >
        <span className={selectedPathLabel ? 'truncate' : 'truncate text-slate-400 dark:text-slate-500'}>
          {selectedPathLabel || '无父级分类'}
        </span>
        <ChevronDownIcon open={open} />
      </button>
      {open ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
          {columns.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">暂无可选父级分类</div>
          ) : (
            <div className="flex max-h-64 overflow-x-auto" data-admin-category-parent-columns>
              {columns.map((column, depth) => (
                <div
                  key={`${column.parentId ?? 'root'}-${depth}`}
                  className="w-56 shrink-0 border-r border-slate-200 last:border-r-0 dark:border-white/10"
                  data-admin-category-parent-column
                >
                  <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                    {column.title}
                  </div>
                  <div className="max-h-52 overflow-y-auto p-2">
                    {column.nodes.map((node) => {
                      const active = activePathIds[depth] === node.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => selectParent(node)}
                          className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            active
                              ? 'bg-lobster-50 text-lobster-700 ring-1 ring-lobster-200 dark:bg-lobster-500/10 dark:text-lobster-200 dark:ring-lobster-500/30'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                          }`}
                          data-admin-category-parent-node={node.id}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{node.name}</span>
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{node.categoryNo}</span>
                          </span>
                          {node.children.length > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end border-t border-slate-200 px-3 py-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
            >
              完成
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
    />
  );
}

function CategoryInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lobster-400 focus:ring-4 focus:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white dark:placeholder:text-slate-500"
      />
    </label>
  );
}

export function buildCategoryRows(records: CategoryRecord[]): CategoryRecord[] {
  return [...records].sort((left, right) => {
    const levelDelta = left.levelNo - right.levelNo;
    if (levelDelta !== 0 && left.parentId === right.parentId) {
      return levelDelta;
    }
    const leftPath = left.path || left.categoryNo;
    const rightPath = right.path || right.categoryNo;
    return leftPath.localeCompare(rightPath, 'zh-Hans-CN');
  });
}

export function buildCategoryTree(records: CategoryRecord[]): CategoryTreeNode[] {
  const nodeById = new Map<string, CategoryTreeNode>();
  for (const record of records) {
    nodeById.set(record.id, { ...record, children: [] });
  }

  const roots: CategoryTreeNode[] = [];
  for (const node of nodeById.values()) {
    if (node.parentId && nodeById.has(node.parentId)) {
      nodeById.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortCategoryTreeNodes(roots);
  return roots;
}

export function buildCategoryColumns(activePathIds: string[], tree: CategoryTreeNode[]): CategoryColumnModel[] {
  const columns: CategoryColumnModel[] = [];
  let nodes = tree;
  let parentId: string | null = null;

  for (let depth = 0; nodes.length > 0; depth += 1) {
    columns.push({ title: categoryColumnTitle(depth), parentId, nodes });
    const activeNode = nodes.find((node) => node.id === activePathIds[depth]);
    if (!activeNode) {
      break;
    }
    parentId = activeNode.id;
    nodes = activeNode.children;
  }

  return columns;
}

function categoryColumnTitle(depth: number): string {
  if (depth === 0) {
    return '一级分类';
  }
  if (depth === 1) {
    return '二级分类';
  }
  if (depth === 2) {
    return '三级分类';
  }
  return `${depth + 1} 级分类`;
}

function createCategoryForm(parentId: string | null, records: CategoryRecord[]): CategoryFormState {
  return {
    ...EMPTY_FORM,
    categoryNo: generateCategoryNo(records),
    parentId: parentId ?? '',
  };
}

function readCategoryForm(record: CategoryRecord): CategoryFormState {
  return {
    id: record.id,
    categoryNo: record.categoryNo,
    parentId: record.parentId ?? '',
    name: record.name,
    status: record.status,
    sortOrder: String(record.sortOrder),
  };
}

function normalizeActivePathIds(activePathIds: string[], tree: CategoryTreeNode[]): string[] {
  if (tree.length === 0) {
    return [];
  }
  if (activePathIds.length === 0) {
    return [tree[0].id];
  }

  const nextPath: string[] = [];
  let nodes = tree;
  for (const activeId of activePathIds) {
    const node = nodes.find((item) => item.id === activeId);
    if (!node) {
      break;
    }
    nextPath.push(node.id);
    nodes = node.children;
  }
  return nextPath.length > 0 ? nextPath : [tree[0].id];
}

function sortCategoryTreeNodes(nodes: CategoryTreeNode[]) {
  nodes.sort(compareCategorySiblings);
  for (const node of nodes) {
    sortCategoryTreeNodes(node.children);
  }
}

function compareCategorySiblings(left: CategoryRecord, right: CategoryRecord): number {
  const sortDelta = left.sortOrder - right.sortOrder;
  if (sortDelta !== 0) {
    return sortDelta;
  }
  return left.name.localeCompare(right.name, 'zh-Hans-CN');
}

async function moveCategorySortOrder(record: CategoryRecord, targetRecord: CategoryRecord): Promise<void> {
  await Promise.all([
    updateCommerceCategory(record.id, createCategorySortPayload(record, targetRecord.sortOrder)),
    updateCommerceCategory(targetRecord.id, createCategorySortPayload(targetRecord, record.sortOrder)),
  ]);
}

function applyCategoryMoveLocally(
  records: CategoryRecord[],
  record: CategoryRecord,
  targetRecord: CategoryRecord,
): CategoryRecord[] {
  const currentRecord = records.find((item) => item.id === record.id);
  const currentTargetRecord = records.find((item) => item.id === targetRecord.id);
  if (!currentRecord || !currentTargetRecord) {
    return records;
  }

  return records.map((item) => {
    if (item.id === currentRecord.id) {
      return { ...item, sortOrder: currentTargetRecord.sortOrder };
    }
    if (item.id === currentTargetRecord.id) {
      return { ...item, sortOrder: currentRecord.sortOrder };
    }
    return item;
  });
}

function createCategorySortPayload(record: CategoryRecord, sortOrder: number) {
  return {
    categoryNo: record.categoryNo,
    parentId: record.parentId,
    name: record.name,
    status: record.status,
    sortOrder: String(sortOrder),
  };
}

export function generateCategoryNo(records: CategoryRecord[], now = new Date()): string {
  const timestampPart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
    String(now.getMilliseconds()).padStart(3, '0'),
  ].join('');
  const prefix = `CAT-${timestampPart}`;
  const existingNos = new Set(records.map((record) => record.categoryNo));
  let sequence = 1;

  let nextNo = `${prefix}-${randomCategoryNoSegment()}-${String(sequence).padStart(2, '0')}`;
  while (existingNos.has(nextNo)) {
    sequence += 1;
    nextNo = `${prefix}-${randomCategoryNoSegment()}-${String(sequence).padStart(2, '0')}`;
  }
  return nextNo;
}

function randomCategoryNoSegment(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
}

export function buildCategoryParentColumns(activePathIds: string[], tree: CategoryTreeNode[]): CategoryColumnModel[] {
  return buildCategoryColumns(activePathIds, tree);
}

export function findCategoryPathIds(categoryId: string, tree: CategoryTreeNode[]): string[] {
  if (!categoryId) {
    return [];
  }
  for (const node of tree) {
    const childPath = findCategoryPathIds(categoryId, node.children);
    if (node.id === categoryId) {
      return [node.id];
    }
    if (childPath.length > 0) {
      return [node.id, ...childPath];
    }
  }
  return [];
}

function formatCategoryPathLabel(pathIds: string[], tree: CategoryTreeNode[]): string {
  if (pathIds.length === 0) {
    return '';
  }
  const names: string[] = [];
  let nodes = tree;
  for (const id of pathIds) {
    const node = nodes.find((item) => item.id === id);
    if (!node) {
      break;
    }
    names.push(node.name);
    nodes = node.children;
  }
  return names.join(' / ');
}

function collectUnavailableParentIds(records: CategoryRecord[], categoryId?: string): Set<string> {
  const unavailableIds = new Set<string>();
  if (!categoryId) {
    return unavailableIds;
  }
  unavailableIds.add(categoryId);
  const tree = buildCategoryTree(records);
  const path = findCategoryPathIds(categoryId, tree);
  let nodes = tree;
  let targetNode: CategoryTreeNode | null = null;
  for (const id of path) {
    targetNode = nodes.find((node) => node.id === id) ?? null;
    if (!targetNode) {
      return unavailableIds;
    }
    nodes = targetNode.children;
  }
  if (targetNode) {
    collectCategoryDescendantIds(targetNode, unavailableIds);
  }
  return unavailableIds;
}

function collectCategoryDescendantIds(node: CategoryTreeNode, ids: Set<string>) {
  for (const child of node.children) {
    ids.add(child.id);
    collectCategoryDescendantIds(child, ids);
  }
}

function summarizeSeedResults(summaries: SeedSummary[]): string {
  if (summaries.length === 0) {
    return '';
  }
  const requested = summaries.reduce((total, item) => total + item.requested, 0);
  const upserted = summaries.reduce((total, item) => total + item.upserted, 0);
  return `已初始化 ${summaries.length} 组数据，写入 ${upserted}/${requested}`;
}

function readCategoryStatus(value: unknown): CategoryStatus {
  return value === 'active' || value === 'inactive' || value === 'archived' ? value : 'active';
}

export function readCategoryRecords(result: unknown): CategoryRecord[] {
  return readApiItems(result)
    .map((item) => item as Partial<CategoryRecord>)
    .filter((item) => typeof item.id === 'string' && typeof item.categoryNo === 'string' && typeof item.name === 'string')
    .map((item) => ({
      id: String(item.id),
      categoryNo: String(item.categoryNo),
      parentId: typeof item.parentId === 'string' ? item.parentId : null,
      name: String(item.name),
      path: typeof item.path === 'string' ? item.path : String(item.categoryNo),
      levelNo: typeof item.levelNo === 'number' ? item.levelNo : Number(item.levelNo ?? 0) || 0,
      status: readCategoryStatus(item.status),
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : Number(item.sortOrder ?? 0) || 0,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    }));
}

export async function loadAllCategoryRecords(): Promise<CategoryRecord[]> {
  const records: CategoryRecord[] = [];
  const firstResult = await listCommerceCategories({ page: '1', pageSize: String(CATEGORY_LIST_PAGE_SIZE) });
  records.push(...readCategoryRecords(firstResult));
  const total = readCategoryTotal(firstResult);

  if (records.length < CATEGORY_LIST_PAGE_SIZE || (total !== null && records.length >= total)) {
    return records;
  }

  for (let page = 2; page <= MAX_CATEGORY_LIST_PAGES; page += 1) {
    const result = await listCommerceCategories({ page: String(page), pageSize: String(CATEGORY_LIST_PAGE_SIZE) });
    const pageRecords = readCategoryRecords(result);
    records.push(...pageRecords);

    if (pageRecords.length < CATEGORY_LIST_PAGE_SIZE || (total !== null && records.length >= total)) {
      break;
    }
  }

  return records;
}

export function readCategoryTotal(result: unknown): number | null {
  const data = readApiData(result);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  return readNonNegativeInteger(record.total ?? record.totalCount ?? record.total_count);
}

export function readSeedSummaries(result: unknown): SeedSummary[] {
  return readApiItems(result).map((item) => {
    const summary = item as Partial<SeedSummary>;
    return {
      dataset: String(summary.dataset ?? ''),
      targetTable: String(summary.targetTable ?? ''),
      requested: Number(summary.requested ?? 0) || 0,
      upserted: Number(summary.upserted ?? 0) || 0,
      skipped: Number(summary.skipped ?? 0) || 0,
      installDefaultEnabled: Boolean(summary.installDefaultEnabled),
      configKey: String(summary.configKey ?? ''),
    };
  });
}

function readNonNegativeInteger(value: unknown): number | null {
  const numberValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.trunc(numberValue) : null;
}
