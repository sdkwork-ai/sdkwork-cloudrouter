import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

/**
 * Generic cascading category manager.
 *
 * Renders up to `maxDepth` columns (5 by default): the first column lists root
 * categories, each subsequent column lists the children of the node selected in
 * the previous column. The component owns layout, selection, and the cascade
 * state only; copy and CRUD actions are injected through slots so any catalog
 * (App Store categories, Deploy template categories, future taxonomies) can
 * reuse it without domain coupling.
 */
export interface CascadeCategoryNode {
  id: string;
  parentId?: string;
  displayName: string;
  /** Secondary line, e.g. the stable code. */
  secondary?: string;
  status?: string;
  sortOrder?: number;
}

export interface CascadeCategoryManagerLabels {
  /** Column headings; at least `maxDepth` entries. */
  columnTitles: readonly string[];
  loading: string;
  empty: string;
  emptyColumn: string;
  selectHint: string;
}

export interface CascadeCategoryManagerProps<T extends CascadeCategoryNode> {
  items: readonly T[];
  labels: CascadeCategoryManagerLabels;
  /** Maximum hierarchy depth; clamped to 1..5. Default 5. */
  maxDepth?: number;
  loading?: boolean;
  /** Initial selected path, used to restore selection after a reload. */
  initialPathIds?: readonly string[];
  onSelect?: (node: T, path: readonly T[]) => void;
  actions?: {
    /** Per-node actions (edit, delete, add child). */
    node?: (node: T, level: number) => ReactNode;
    /** Column-level create action, e.g. "new root" or "new child". */
    create?: (level: number, parent: T | undefined) => ReactNode;
  };
}

const DEFAULT_MAX_DEPTH = 5;

export function CascadeCategoryManager<T extends CascadeCategoryNode>({
  actions,
  initialPathIds,
  items,
  labels,
  loading = false,
  maxDepth = DEFAULT_MAX_DEPTH,
  onSelect,
}: CascadeCategoryManagerProps<T>) {
  const depth = Math.min(5, Math.max(1, maxDepth));
  const [selectedPath, setSelectedPath] = useState<readonly T[]>(() =>
    resolveInitialPath(items, initialPathIds));

  // Re-resolve the path after a reload (create/delete/rename) without losing
  // the operator's position when the nodes still exist.
  useEffect(() => {
    setSelectedPath((previous) => resolvePathByIds(items, previous.map((node) => node.id)));
  }, [items]);

  const byParent = useMemo(() => groupByParent(items), [items]);
  const roots = useMemo(
    () => sortNodes(items.filter((node) => !node.parentId || !findById(items, node.parentId))),
    [items],
  );

  const select = (node: T, level: number) => {
    const next = [...selectedPath.slice(0, level), node];
    setSelectedPath(next);
    onSelect?.(node, next);
  };

  const columns = Array.from({ length: depth }, (_, level) => {
    const parent = level === 0 ? undefined : selectedPath[level - 1];
    const nodes = level === 0
      ? roots
      : parent
        ? sortNodes(byParent.get(parent.id) ?? [])
        : [];
    return { level, nodes, parent };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-[var(--sdk-color-text-muted)]" role="status">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        {labels.loading}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-5 gap-3">
          {columns.map(({ level, nodes, parent }) => {
            const selected = selectedPath[level];
            return (
              <section
                aria-label={labels.columnTitles[level] ?? labels.columnTitles[0]}
                className="flex min-h-[420px] min-w-0 flex-col rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)]"
                key={level}
              >
                <header className="flex items-center justify-between gap-2 border-b border-[var(--sdk-color-border-default)] px-3 py-2">
                  <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--sdk-color-text-muted)]">
                    {labels.columnTitles[level] ?? `L${level + 1}`}
                  </h3>
                  {actions?.create ? actions.create(level + 1, parent) : null}
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-1.5" role="listbox">
                  {level > 0 && !parent ? (
                    <p className="p-3 text-xs text-[var(--sdk-color-text-muted)]">{labels.selectHint}</p>
                  ) : null}

                  {parent && nodes.length === 0 ? (
                    <p className="p-3 text-xs text-[var(--sdk-color-text-muted)]">{labels.emptyColumn}</p>
                  ) : null}

                  {level === 0 && nodes.length === 0 ? (
                    <p className="p-3 text-xs text-[var(--sdk-color-text-muted)]">{labels.empty}</p>
                  ) : null}

                  {nodes.map((node) => {
                    const active = selected?.id === node.id;
                    return (
                      <div
                        className={`group flex items-stretch gap-1 rounded-[var(--sdk-radius-control)] ${
                          active ? "bg-[var(--sdk-color-brand-primary-soft)]" : "hover:bg-[var(--sdk-color-surface-panel-muted)]"
                        }`}
                        key={node.id}
                      >
                        <button
                          aria-selected={active}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--sdk-radius-control)] px-2 py-2 text-left"
                          onClick={() => select(node, level)}
                          role="option"
                          type="button"
                        >
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm ${active ? "font-semibold text-[var(--sdk-color-brand-primary)]" : "text-[var(--sdk-color-text-primary)]"}`}>
                              {node.displayName}
                            </span>
                            {node.secondary ? (
                              <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--sdk-color-text-muted)]">
                                {node.secondary}
                              </span>
                            ) : null}
                          </span>
                          {level < depth - 1 ? (
                            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--sdk-color-text-muted)]" />
                          ) : null}
                        </button>
                        {actions?.node ? (
                          <div className="flex shrink-0 items-center pr-1">
                            {actions.node(node, level + 1)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function groupByParent<T extends CascadeCategoryNode>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!item.parentId) {
      continue;
    }
    const list = map.get(item.parentId) ?? [];
    list.push(item);
    map.set(item.parentId, list);
  }
  return map;
}

function sortNodes<T extends CascadeCategoryNode>(nodes: readonly T[]): T[] {
  return [...nodes].sort((left, right) =>
    (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
    || left.displayName.localeCompare(right.displayName)
    || left.id.localeCompare(right.id));
}

function findById<T extends CascadeCategoryNode>(items: readonly T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function resolvePathByIds<T extends CascadeCategoryNode>(
  items: readonly T[],
  ids: readonly string[] | undefined,
): readonly T[] {
  if (!ids?.length) {
    return [];
  }
  const path: T[] = [];
  for (const id of ids) {
    const node = findById(items, id);
    if (!node) {
      break;
    }
    const expectedParent = path[path.length - 1]?.id;
    if ((node.parentId ?? undefined) !== expectedParent) {
      break;
    }
    path.push(node);
  }
  return path;
}

function resolveInitialPath<T extends CascadeCategoryNode>(
  items: readonly T[],
  ids: readonly string[] | undefined,
): readonly T[] {
  return resolvePathByIds(items, ids);
}
