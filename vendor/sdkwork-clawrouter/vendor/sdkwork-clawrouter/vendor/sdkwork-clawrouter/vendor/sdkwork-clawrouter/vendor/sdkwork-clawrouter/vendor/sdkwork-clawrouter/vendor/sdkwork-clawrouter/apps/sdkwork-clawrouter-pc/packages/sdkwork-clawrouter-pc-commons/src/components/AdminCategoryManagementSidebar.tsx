import React, { useMemo } from 'react';
import { ChevronRight, Edit2, Folder, FolderPlus, FolderTree, Loader2, Trash2 } from 'lucide-react';
import type { AdminCategoryOption } from '../admin-category-types';

export type AdminCategoryTreeNode = AdminCategoryOption & {
  children: AdminCategoryTreeNode[];
  depth: number;
};

export interface AdminCategoryManagementSidebarLabels {
  addChild: string;
  all: string;
  create: string;
  delete: string;
  edit: string;
  empty: string;
  loading: string;
  selected: string;
  title: string;
  total: string;
}

export interface AdminCategoryManagementSidebarProps {
  categories: readonly AdminCategoryOption[];
  dataAttribute?: string;
  labels: AdminCategoryManagementSidebarLabels;
  loading?: boolean;
  onCreateChild: (category: AdminCategoryOption) => void;
  onCreateRoot: () => void;
  onDeleteCategory: (category: AdminCategoryOption) => void;
  onEditCategory: (category: AdminCategoryOption) => void;
  onSelect: (categoryId: string) => void;
  readOnly?: boolean;
  selectedCategoryId: string;
  usageCountByCategoryId?: ReadonlyMap<string, number>;
}

export function AdminCategoryManagementSidebar({
  categories,
  dataAttribute,
  labels,
  loading = false,
  readOnly = false,
  onCreateChild,
  onCreateRoot,
  onDeleteCategory,
  onEditCategory,
  onSelect,
  selectedCategoryId,
  usageCountByCategoryId,
}: AdminCategoryManagementSidebarProps) {
  const tree = useMemo(() => buildAdminCategoryTree(categories), [categories]);
  const selectedCategory = selectedCategoryId ? categories.find((item) => item.id === selectedCategoryId) : undefined;
  const totalUsage = useMemo(() => {
    if (!usageCountByCategoryId) {
      return 0;
    }
    let total = 0;
    for (const count of usageCountByCategoryId.values()) {
      total += count;
    }
    return total;
  }, [usageCountByCategoryId]);
  const rootProps = dataAttribute ? { [`data-${dataAttribute}`]: true } : undefined;

  return (
    <aside
      {...rootProps}
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <FolderTree className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <span>{labels.title}</span>
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {labels.selected.replace('{{name}}', selectedCategory?.name || labels.all)}
          </div>
        </div>
        <IconButton
          icon={<FolderPlus className="h-4 w-4" />}
          onClick={onCreateRoot}
          title={labels.create}
        />
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        <button
          className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
            !selectedCategoryId
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]'
          }`}
          onClick={() => onSelect('')}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate font-semibold">{labels.all}</span>
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
            {totalUsage}
          </span>
        </button>

        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {labels.loading}
          </div>
        ) : tree.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-white/10">
            {labels.empty}
          </div>
        ) : (
          tree.map((node) => (
            <AdminCategoryTreeItem
              key={node.id}
              labels={labels}
              node={node}
              onCreateChild={onCreateChild}
              onDeleteCategory={onDeleteCategory}
              onEditCategory={onEditCategory}
              onSelect={onSelect}
              selectedCategoryId={selectedCategoryId}
              usageCountByCategoryId={usageCountByCategoryId}
            />
          ))
        )}
      </div>
      <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10">
        {labels.total.replace('{{count}}', String(categories.length))}
      </div>
    </aside>
  );
}

function AdminCategoryTreeItem({
  labels,
  node,
  onCreateChild,
  onDeleteCategory,
  onEditCategory,
  onSelect,
  selectedCategoryId,
  usageCountByCategoryId,
}: {
  labels: AdminCategoryManagementSidebarLabels;
  node: AdminCategoryTreeNode;
  onCreateChild: (category: AdminCategoryOption) => void;
  onDeleteCategory: (category: AdminCategoryOption) => void;
  onEditCategory: (category: AdminCategoryOption) => void;
  onSelect: (categoryId: string) => void;
  selectedCategoryId: string;
  usageCountByCategoryId?: ReadonlyMap<string, number>;
}) {
  const isSelected = selectedCategoryId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg py-1.5 pl-2 pr-1 transition-colors ${
          isSelected
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100'
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]'
        }`}
        style={{ marginLeft: `${node.depth * 14}px` }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node.id)}
          type="button"
        >
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 ${node.children.length > 0 ? '' : 'opacity-0'}`} />
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-semibold">{node.name}</span>
          {!node.visible || node.status < 1 ? (
            <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500 dark:bg-white/10">
              {node.status}
            </span>
          ) : null}
        </button>
        <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
          {usageCountByCategoryId?.get(node.id) ?? 0}
        </span>
        <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton icon={<FolderPlus className="h-3.5 w-3.5" />} onClick={() => onCreateChild(node)} title={labels.addChild} />
          <IconButton icon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => onEditCategory(node)} title={labels.edit} />
          <IconButton danger icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDeleteCategory(node)} title={labels.delete} />
        </div>
      </div>
      {node.children.map((child) => (
        <AdminCategoryTreeItem
          key={child.id}
          labels={labels}
          node={child}
          onCreateChild={onCreateChild}
          onDeleteCategory={onDeleteCategory}
          onEditCategory={onEditCategory}
          onSelect={onSelect}
          selectedCategoryId={selectedCategoryId}
          usageCountByCategoryId={usageCountByCategoryId}
        />
      ))}
    </div>
  );
}

function IconButton({
  danger = false,
  icon,
  onClick,
  title,
}: {
  danger?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {icon}
    </button>
  );
}

export function buildAdminCategoryTree(categories: readonly AdminCategoryOption[]): AdminCategoryTreeNode[] {
  const nodes = new Map<string, AdminCategoryTreeNode>();
  const parentById = new Map<string, string | null>();
  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [], depth: 0 });
    parentById.set(category.id, category.parentId);
  }

  const roots: AdminCategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.parentId;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (!parent || parentId === node.id || hasCategoryParentCycle(node.id, parentId, parentById)) {
      roots.push(node);
      continue;
    }
    parent.children.push(node);
  }

  const sortAndDepth = (items: AdminCategoryTreeNode[], depth: number) => {
    items.sort(compareCategoryNodes);
    for (const item of items) {
      item.depth = depth;
      sortAndDepth(item.children, depth + 1);
    }
  };
  sortAndDepth(roots, 0);
  return roots;
}

function hasCategoryParentCycle(categoryId: string, parentId: string | null, parentById: Map<string, string | null>): boolean {
  let current = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === categoryId || visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}

function compareCategoryNodes(left: AdminCategoryTreeNode, right: AdminCategoryTreeNode): number {
  if (right.sortWeight !== left.sortWeight) {
    return right.sortWeight - left.sortWeight;
  }
  const nameOrder = left.name.localeCompare(right.name);
  return nameOrder || left.id.localeCompare(right.id);
}
