import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { usePluginsAdminLocale } from '@sdkwork/plugins-pc-admin';
import {
  createPluginCategory,
  deletePluginCategory,
  listPluginCategories,
  movePluginCategory,
  updatePluginCategory,
  type CreatePluginCategoryCommand,
  type PluginCategoryRecord,
  type UpdatePluginCategoryCommand,
} from '@sdkwork/plugins-pc-admin/pluginsAdminService';
import { getCloudRouterDriveImageService } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  DriveUploadImage,
  type DriveUploadImageProps,
} from 'sdkwork-drive-pc-upload-image';

const PAGE_SIZE = 20;
const MAX_DEPTH = 5;
const CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,127}$/;
const STATUS_OPTIONS = ['draft', 'active', 'disabled', 'archived'] as const;
const STATUS_TABS = ['all', 'active', 'draft', 'disabled', 'archived'] as const;
type StatusTab = (typeof STATUS_TABS)[number];
type UploadValue = NonNullable<DriveUploadImageProps['value']>;

const COPY = {
  en: {
    title: 'Plugin Categories',
    description:
      'Curate the multi-level plugin marketplace taxonomy with tags, attributes, logos and sibling ordering.',
    create: 'New category',
    refresh: 'Refresh',
    search: 'Search categories',
    searchPlaceholder: 'name, code, tag, attribute',
    all: 'All',
    loading: 'Loading categories…',
    empty: 'No plugin categories yet',
    emptyFiltered: 'No categories match the current filters',
    clearFilters: 'Clear filters',
    total: (count: number) => `${count} ${count === 1 ? 'category' : 'categories'}`,
    table: {
      category: 'Category',
      code: 'Code',
      parent: 'Parent',
      tags: 'Tags',
      attributes: 'Attributes',
      sort: 'Sort',
      status: 'Status',
      actions: 'Actions',
      topLevel: 'Top level',
      child: 'Child',
      none: '—',
      moreTags: (count: number) => `+${count}`,
      attributeCount: (count: number) => `${count} ${count === 1 ? 'attribute' : 'attributes'}`,
    },
    actions: {
      edit: 'Edit',
      addChild: 'Add child',
      delete: 'Delete',
      enable: 'Enable',
      disable: 'Disable',
      moveUp: 'Move up',
      moveDown: 'Move down',
      expand: 'Expand',
      collapse: 'Collapse',
    },
    status: {
      draft: 'Draft',
      active: 'Active',
      disabled: 'Disabled',
      archived: 'Archived',
      deleted: 'Deleted',
    },
    confirmDelete: (name: string, code: string) =>
      `Delete category “${name}” (${code})? It is soft-deleted; categories with children or filed plugins cannot be deleted.`,
    notices: {
      created: (name: string) => `Category “${name}” created`,
      updated: (name: string) => `Category “${name}” updated`,
      deleted: (name: string) => `Category “${name}” deleted`,
      status: (name: string, status: string) => `Category “${name}” is now ${status}`,
      moved: (name: string) => `Category “${name}” reordered`,
    },
    drawer: {
      createTitle: 'Create category',
      createSubtitle: 'Leave the parent empty for a top-level category.',
      editTitle: (name: string) => `Edit ${name}`,
      code: 'Category code',
      codeHint: 'Lowercase letters, digits, hyphen or underscore; 2-128 characters.',
      codeImmutable: 'The category code is the registry key and cannot be changed.',
      name: 'Name',
      description: 'Description',
      parent: 'Parent category',
      parentNone: 'None (top level)',
      parentHint: 'A category cannot be placed under itself or one of its descendants.',
      sortOrder: 'Sort order',
      sortHint: 'Lower values appear first among siblings.',
      status: 'Status',
      logo: 'Logo',
      logoHint: 'Uploaded to sdkwork-drive and stored as a drive reference.',
      tags: 'Tags',
      tagsHint: 'Up to 20 tags, each up to 64 characters.',
      tagPlaceholder: 'Add a tag and press Enter',
      addTag: 'Add',
      removeTag: 'Remove tag',
      attributes: 'Attributes',
      attributesHint: 'Up to 50 key/value pairs.',
      attributeKey: 'Key',
      attributeValue: 'Value',
      addAttribute: 'Add attribute',
      removeAttribute: 'Remove attribute',
      emptyAttributes: 'No attributes yet.',
      cancel: 'Cancel',
      create: 'Create',
      save: 'Save',
      saving: 'Saving…',
      errors: {
        codeRequired: 'Enter a category code.',
        codeInvalid: 'Use lowercase letters, digits, hyphen or underscore.',
        nameRequired: 'Enter a category name.',
        sortInvalid: 'Sort order must be a whole number.',
        attributeKey: 'Every attribute needs a key.',
      },
    },
    pagination: {
      previous: 'Previous page',
      next: 'Next page',
      showing: (start: number, end: number, total: number) => `${start}-${end} of ${total}`,
      page: (page: number, totalPages: number) => `Page ${page} / ${totalPages}`,
    },
    logoCopy: {
      pickImage: 'Upload logo',
      removeImage: 'Remove logo',
      uploading: 'Uploading…',
      uploadFailed: 'Upload failed',
    },
  },
  zh: {
    title: '插件分类管理',
    description: '维护多级插件市场分类，支持标签、属性、Logo 与同级排序。',
    create: '新建分类',
    refresh: '刷新',
    search: '搜索分类',
    searchPlaceholder: '名称、编码、标签、属性',
    all: '全部',
    loading: '正在加载分类…',
    empty: '暂无插件分类',
    emptyFiltered: '没有符合当前筛选条件的分类',
    clearFilters: '清除筛选',
    total: (count: number) => `共 ${count} 个分类`,
    table: {
      category: '分类',
      code: '编码',
      parent: '父分类',
      tags: '标签',
      attributes: '属性',
      sort: '排序',
      status: '状态',
      actions: '操作',
      topLevel: '顶级',
      child: '子级',
      none: '—',
      moreTags: (count: number) => `+${count}`,
      attributeCount: (count: number) => `${count} 个属性`,
    },
    actions: {
      edit: '编辑',
      addChild: '新建子分类',
      delete: '删除',
      enable: '启用',
      disable: '停用',
      moveUp: '上移',
      moveDown: '下移',
      expand: '展开',
      collapse: '收起',
    },
    status: {
      draft: '草稿',
      active: '启用',
      disabled: '停用',
      archived: '已归档',
      deleted: '已删除',
    },
    confirmDelete: (name: string, code: string) =>
      `确定删除分类“${name}”（${code}）吗？记录将被软删除；含子分类或已归档插件的分类不能删除。`,
    notices: {
      created: (name: string) => `分类“${name}”已创建`,
      updated: (name: string) => `分类“${name}”已更新`,
      deleted: (name: string) => `分类“${name}”已删除`,
      status: (name: string, status: string) => `分类“${name}”已切换为“${status}”`,
      moved: (name: string) => `分类“${name}”排序已调整`,
    },
    drawer: {
      createTitle: '新建分类',
      createSubtitle: '父分类留空即为顶级分类。',
      editTitle: (name: string) => `编辑 ${name}`,
      code: '分类编码',
      codeHint: '小写字母、数字、连字符或下划线；2-128 个字符。',
      codeImmutable: '分类编码是注册表主键，创建后不可修改。',
      name: '名称',
      description: '描述',
      parent: '父分类',
      parentNone: '无（顶级分类）',
      parentHint: '不能把分类放在它自己或它的后代下面。',
      sortOrder: '排序值',
      sortHint: '数值越小越靠前（同级内）。',
      status: '状态',
      logo: 'Logo',
      logoHint: '上传到 sdkwork-drive，并以 drive 引用保存。',
      tags: '标签',
      tagsHint: '最多 20 个标签，每个不超过 64 个字符。',
      tagPlaceholder: '输入标签后回车',
      addTag: '添加',
      removeTag: '移除标签',
      attributes: '属性',
      attributesHint: '最多 50 个键值对。',
      attributeKey: '键',
      attributeValue: '值',
      addAttribute: '添加属性',
      removeAttribute: '删除属性',
      emptyAttributes: '还没有属性。',
      cancel: '取消',
      create: '创建',
      save: '保存',
      saving: '保存中…',
      errors: {
        codeRequired: '请输入分类编码。',
        codeInvalid: '请使用小写字母、数字、连字符或下划线。',
        nameRequired: '请输入分类名称。',
        sortInvalid: '排序值必须是整数。',
        attributeKey: '每个属性都需要键。',
      },
    },
    pagination: {
      previous: '上一页',
      next: '下一页',
      showing: (start: number, end: number, total: number) => `${start}-${end} / ${total}`,
      page: (page: number, totalPages: number) => `第 ${page} / ${totalPages} 页`,
    },
    logoCopy: {
      pickImage: '上传 Logo',
      removeImage: '移除 Logo',
      uploading: '上传中…',
      uploadFailed: '上传失败',
    },
  },
} as const;

type EditorState = { mode: 'create'; parentId: string } | { mode: 'edit'; record: PluginCategoryRecord };

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function compareSiblings(left: PluginCategoryRecord, right: PluginCategoryRecord): number {
  return (
    left.sortOrder - right.sortOrder || left.categoryCode.localeCompare(right.categoryCode)
  );
}

function depthOf(
  categoryId: string | undefined,
  byId: Map<string, PluginCategoryRecord>,
): number {
  let depth = 0;
  let cursor = categoryId;
  const seen = new Set<string>();
  while (cursor && cursor !== '0' && !seen.has(cursor)) {
    seen.add(cursor);
    const record = byId.get(cursor);
    if (!record) break;
    depth += 1;
    cursor = record.parentId && record.parentId !== '0' ? record.parentId : undefined;
  }
  return depth;
}

function collectDescendants(
  rootId: string | undefined,
  childrenByParent: Map<string, PluginCategoryRecord[]>,
): Set<string> {
  const descendants = new Set<string>();
  if (!rootId) return descendants;
  const frontier = [rootId];
  while (frontier.length > 0) {
    const current = frontier.pop();
    if (!current) continue;
    for (const child of childrenByParent.get(current) ?? []) {
      if (descendants.has(child.id)) continue;
      descendants.add(child.id);
      frontier.push(child.id);
    }
  }
  return descendants;
}

function avatarTone(code: string): string {
  const tones = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
  ];
  let hash = 0;
  for (const char of code) hash = (hash + char.charCodeAt(0)) % tones.length;
  return tones[hash] ?? tones[0]!;
}

type TreeRow = {
  record: PluginCategoryRecord;
  depth: number;
  hasChildren: boolean;
  childCount: number;
};

export function PluginCategoriesAdminPage() {
  const locale = usePluginsAdminLocale();
  const copy = COPY[locale];
  const [records, setRecords] = useState<PluginCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PluginCategoryRecord | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const collected: PluginCategoryRecord[] = [];
      for (let current = 1; current <= 10; current += 1) {
        const response = await listPluginCategories({ page: current, pageSize: 200 });
        collected.push(...response.items);
        const total = Number.parseInt(String(response.pageInfo?.totalItems ?? collected.length), 10);
        if (response.items.length === 0 || !Number.isFinite(total) || collected.length >= total) {
          break;
        }
      }
      setRecords(collected);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedRecords = useMemo(
    () =>
      records
        .filter((record) => record.lifecycleStatus !== 'deleted')
        .sort(compareSiblings),
    [records],
  );

  const byId = useMemo(() => {
    const map = new Map<string, PluginCategoryRecord>();
    for (const record of orderedRecords) map.set(record.id, record);
    return map;
  }, [orderedRecords]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, PluginCategoryRecord[]>();
    for (const record of orderedRecords) {
      const parent = record.parentId && record.parentId !== '0' ? record.parentId : '0';
      const siblings = map.get(parent) ?? [];
      siblings.push(record);
      map.set(parent, siblings);
    }
    for (const siblings of map.values()) siblings.sort(compareSiblings);
    return map;
  }, [orderedRecords]);

  const statusCounts = useMemo(() => {
    const counts: Record<Exclude<StatusTab, 'all'>, number> = {
      active: 0,
      draft: 0,
      disabled: 0,
      archived: 0,
    };
    for (const record of orderedRecords) {
      if (record.lifecycleStatus in counts) {
        counts[record.lifecycleStatus as Exclude<StatusTab, 'all'>] += 1;
      }
    }
    return counts;
  }, [orderedRecords]);

  const filtersActive = query.trim().length > 0 || statusFilter !== 'all';

  const visibleIds = useMemo(() => {
    if (!filtersActive) return new Set(orderedRecords.map((record) => record.id));
    const keyword = query.trim().toLowerCase();
    const matches = orderedRecords.filter((record) => {
      if (statusFilter !== 'all' && record.lifecycleStatus !== statusFilter) return false;
      if (!keyword) return true;
      const parentName =
        record.parentId && record.parentId !== '0'
          ? byId.get(record.parentId)?.name ?? ''
          : '';
      const attributeText = Object.entries(record.attributes ?? {})
        .map(([key, value]) => `${key} ${value}`)
        .join(' ');
      return [
        record.name,
        record.categoryCode,
        record.description ?? '',
        parentName,
        (record.tags ?? []).join(' '),
        attributeText,
      ].some((value) => value.toLowerCase().includes(keyword));
    });
    const visible = new Set<string>();
    for (const match of matches) {
      visible.add(match.id);
      let cursor: string | undefined = match.parentId;
      const seen = new Set<string>();
      while (cursor && cursor !== '0' && !seen.has(cursor)) {
        seen.add(cursor);
        visible.add(cursor);
        cursor = byId.get(cursor)?.parentId;
      }
    }
    return visible;
  }, [byId, filtersActive, orderedRecords, query, statusFilter]);

  const rows = useMemo<TreeRow[]>(() => {
    const result: TreeRow[] = [];
    const visit = (record: PluginCategoryRecord, depth: number) => {
      const children = (childrenByParent.get(record.id) ?? []).filter((child) =>
        visibleIds.has(child.id),
      );
      result.push({
        record,
        depth,
        hasChildren: children.length > 0,
        childCount: (childrenByParent.get(record.id) ?? []).length,
      });
      if (!filtersActive && collapsed.has(record.id)) return;
      for (const child of children) visit(child, depth + 1);
    };
    const roots = orderedRecords
      .filter(
        (record) =>
          visibleIds.has(record.id) &&
          (!record.parentId || record.parentId === '0' || !byId.has(record.parentId)),
      )
      .sort(compareSiblings);
    for (const root of roots) visit(root, 0);
    return result;
  }, [byId, childrenByParent, collapsed, filtersActive, orderedRecords, visibleIds]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>, message: string): Promise<boolean> => {
      setError(null);
      setNotice(null);
      setSaving(true);
      try {
        await action();
        setNotice(message);
        await load(true);
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const toggleStatus = (record: PluginCategoryRecord) => {
    const next = record.lifecycleStatus === 'active' ? 'disabled' : 'active';
    void runAction(
      () => updatePluginCategory(record.categoryCode, { lifecycleStatus: next }),
      copy.notices.status(record.name, copy.status[next]),
    );
  };

  const move = (record: PluginCategoryRecord, direction: 'up' | 'down') => {
    void runAction(
      () => movePluginCategory(record.categoryCode, direction),
      copy.notices.moved(record.name),
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    void runAction(
      () => deletePluginCategory(target.categoryCode),
      copy.notices.deleted(target.name),
    ).then((succeeded) => {
      if (succeeded) setDeleteTarget(null);
    });
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setPage(1);
  };

  const statusTabs: { value: StatusTab; label: string; count: number }[] = [
    { value: 'all', label: copy.all, count: orderedRecords.length },
    ...(['active', 'draft', 'disabled', 'archived'] as const).map((status) => ({
      value: status as StatusTab,
      label: copy.status[status],
      count: statusCounts[status],
    })),
  ];

  return (
    <section className="embedded-fill-page">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">{copy.title}</h1>
          <p className="admin-page-header__description">{copy.description}</p>
        </div>
        <div className="admin-page-header__actions">
          <button
            className="admin-button admin-button--secondary"
            disabled={loading || saving}
            onClick={() => void load()}
            type="button"
          >
            {copy.refresh}
          </button>
          <button
            className="admin-button admin-button--primary"
            disabled={saving}
            onClick={() => setEditor({ mode: 'create', parentId: '0' })}
            type="button"
          >
            {copy.create}
          </button>
        </div>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="admin-alert admin-alert--success" role="status">
          {notice}
        </div>
      ) : null}

      <div className="data-surface">
        <div className="admin-list-toolbar">
          <div className="admin-list-toolbar__filters">
            <label className="admin-field admin-field--search">
              <span className="admin-field__label">{copy.search}</span>
              <input
                className="admin-control"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={copy.searchPlaceholder}
                value={query}
              />
            </label>
            <div className="admin-field">
              <span className="admin-field__label">{copy.table.status}</span>
              <div className="flex flex-wrap gap-1" role="group" aria-label={copy.table.status}>
                {statusTabs.map((tab) => (
                  <button
                    aria-pressed={statusFilter === tab.value}
                    className={`admin-button ${
                      statusFilter === tab.value
                        ? 'admin-button--primary'
                        : 'admin-button--secondary'
                    }`}
                    key={tab.value}
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    type="button"
                  >
                    {tab.label}
                    <span className="ml-1 tabular-nums">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="admin-list-toolbar__actions text-xs text-slate-500">
            {copy.total(orderedRecords.length)}
            {filtersActive ? (
              <button
                className="admin-button admin-button--ghost"
                onClick={clearFilters}
                type="button"
              >
                {copy.clearFilters}
              </button>
            ) : null}
          </div>
        </div>

        <div className="table-frame">
          {loading ? (
            <div className="admin-list-state" aria-busy="true">
              {copy.loading}
            </div>
          ) : orderedRecords.length === 0 ? (
            <div className="admin-list-state">
              <span>{copy.empty}</span>
              <button
                className="admin-button admin-button--primary"
                onClick={() => setEditor({ mode: 'create', parentId: '0' })}
                type="button"
              >
                {copy.create}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="admin-list-state">
              <span>{copy.emptyFiltered}</span>
              <button className="admin-button admin-button--secondary" onClick={clearFilters} type="button">
                {copy.clearFilters}
              </button>
            </div>
          ) : (
            <table className="admin-list-table">
              <thead>
                <tr>
                  <th>{copy.table.category}</th>
                  <th>{copy.table.code}</th>
                  <th>{copy.table.parent}</th>
                  <th>{copy.table.tags}</th>
                  <th>{copy.table.attributes}</th>
                  <th>{copy.table.sort}</th>
                  <th>{copy.table.status}</th>
                  <th className="text-right">{copy.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ record, depth, hasChildren, childCount }) => {
                  const siblings =
                    childrenByParent.get(
                      record.parentId && record.parentId !== '0' ? record.parentId : '0',
                    ) ?? [];
                  const siblingIndex = siblings.findIndex(
                    (candidate) => candidate.categoryCode === record.categoryCode,
                  );
                  const tags = record.tags ?? [];
                  const attributes = Object.keys(record.attributes ?? {}).length;
                  const parent =
                    record.parentId && record.parentId !== '0'
                      ? byId.get(record.parentId)
                      : undefined;
                  return (
                    <tr key={record.id}>
                      <td>
                        <div
                          className="flex items-start gap-2"
                          style={{ paddingLeft: depth > 0 ? '1.1rem' : undefined }}
                        >
                          {hasChildren ? (
                            <button
                              aria-label={
                                collapsed.has(record.id)
                                  ? copy.actions.expand
                                  : copy.actions.collapse
                              }
                              className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
                              onClick={() =>
                                setCollapsed((current) => {
                                  const next = new Set(current);
                                  if (next.has(record.id)) next.delete(record.id);
                                  else next.add(record.id);
                                  return next;
                                })
                              }
                              type="button"
                            >
                              {collapsed.has(record.id) ? '▸' : '▾'}
                            </button>
                          ) : (
                            <span aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
                          )}
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarTone(record.categoryCode)}`}
                          >
                            {record.name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="admin-list-table__primary">{record.name}</span>
                              {depth > 0 ? (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                  {copy.table.child}
                                </span>
                              ) : null}
                              {childCount > 0 ? (
                                <span className="text-[11px] text-slate-400">
                                  {childCount} {copy.table.child}
                                </span>
                              ) : null}
                            </div>
                            {record.description ? (
                              <p className="admin-list-table__secondary mt-0.5 line-clamp-2 max-w-md">
                                {record.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="font-mono text-xs">{record.categoryCode}</code>
                      </td>
                      <td className="text-xs">
                        {parent ? parent.name : copy.table.topLevel}
                      </td>
                      <td>
                        {tags.length === 0 ? (
                          <span className="text-xs text-slate-400">{copy.table.none}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 2).map((tag) => (
                              <span
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                                key={tag}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 2 ? (
                              <span className="text-[11px] text-slate-400">
                                {copy.table.moreTags(tags.length - 2)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="text-xs">
                        {attributes === 0
                          ? copy.table.none
                          : copy.table.attributeCount(attributes)}
                      </td>
                      <td className="tabular-nums">{record.sortOrder}</td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            record.lifecycleStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600 ring-slate-200'
                          }`}
                        >
                          {copy.status[record.lifecycleStatus] ?? record.lifecycleStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            className="admin-button admin-button--secondary"
                            disabled={saving}
                            onClick={() => setEditor({ mode: 'edit', record })}
                            type="button"
                          >
                            {copy.actions.edit}
                          </button>
                          {depth < MAX_DEPTH - 1 ? (
                            <button
                              className="admin-button admin-button--secondary"
                              disabled={saving}
                              onClick={() => setEditor({ mode: 'create', parentId: record.id })}
                              type="button"
                            >
                              {copy.actions.addChild}
                            </button>
                          ) : null}
                          <button
                            className="admin-button admin-button--secondary"
                            disabled={saving}
                            onClick={() => toggleStatus(record)}
                            type="button"
                          >
                            {record.lifecycleStatus === 'active'
                              ? copy.actions.disable
                              : copy.actions.enable}
                          </button>
                          <button
                            aria-label={copy.actions.moveUp}
                            className="admin-button admin-button--ghost"
                            disabled={saving || siblingIndex <= 0}
                            onClick={() => move(record, 'up')}
                            title={copy.actions.moveUp}
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            aria-label={copy.actions.moveDown}
                            className="admin-button admin-button--ghost"
                            disabled={saving || siblingIndex < 0 || siblingIndex >= siblings.length - 1}
                            onClick={() => move(record, 'down')}
                            title={copy.actions.moveDown}
                            type="button"
                          >
                            ↓
                          </button>
                          <button
                            className="admin-button admin-button--danger"
                            disabled={saving}
                            onClick={() => setDeleteTarget(record)}
                            type="button"
                          >
                            {copy.actions.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 ? (
          <div className="admin-list-footer">
            <span className="text-xs">
              {copy.pagination.showing(
                (currentPage - 1) * PAGE_SIZE + 1,
                Math.min(currentPage * PAGE_SIZE, rows.length),
                rows.length,
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{copy.pagination.page(currentPage, totalPages)}</span>
              <button
                aria-label={copy.pagination.previous}
                className="admin-button admin-button--secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                ←
              </button>
              <button
                aria-label={copy.pagination.next}
                className="admin-button admin-button--secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                type="button"
              >
                →
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {editor ? (
        <CategoryDrawer
          categories={orderedRecords}
          key={editor.mode === 'edit' ? `edit:${editor.record.id}` : `create:${editor.parentId}`}
          locale={locale}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            void load(true);
          }}
          parentId={editor.mode === 'create' ? editor.parentId : '0'}
          record={editor.mode === 'edit' ? editor.record : null}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          cancelLabel={copy.drawer.cancel}
          confirmLabel={copy.actions.delete}
          description={copy.confirmDelete(deleteTarget.name, deleteTarget.categoryCode)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title={copy.actions.delete}
        />
      ) : null}
    </section>
  );
}

function CategoryDrawer({
  record,
  categories,
  parentId: initialParentId,
  locale,
  onClose,
  onSaved,
}: {
  record: PluginCategoryRecord | null;
  categories: readonly PluginCategoryRecord[];
  parentId: string;
  locale: 'en' | 'zh';
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const copy = COPY[locale];
  const [code, setCode] = useState(record?.categoryCode ?? '');
  const [name, setName] = useState(record?.name ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [parentId, setParentId] = useState(
    record?.parentId && record.parentId !== '0' ? record.parentId : initialParentId,
  );
  const [sortOrder, setSortOrder] = useState(() => {
    if (record) return String(record.sortOrder);
    const siblings = categories.filter(
      (category) => (category.parentId || '0') === (initialParentId || '0'),
    );
    return String(
      Math.max(0, siblings.reduce((max, item) => Math.max(max, item.sortOrder), -10) + 10),
    );
  });
  const [status, setStatus] = useState<string>(record?.lifecycleStatus ?? 'active');
  const [iconRef, setIconRef] = useState(record?.iconRef ?? '');
  const [tags, setTags] = useState<string[]>([...(record?.tags ?? [])]);
  const [tagDraft, setTagDraft] = useState('');
  const [attributes, setAttributes] = useState<{ id: number; key: string; value: string }[]>(() =>
    Object.entries(record?.attributes ?? {}).map(([key, value], index) => ({
      id: index + 1,
      key,
      value,
    })),
  );
  const [attributeSeq, setAttributeSeq] = useState(
    () => Object.keys(record?.attributes ?? {}).length + 1,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const logoService = useMemo(
    () => getCloudRouterDriveImageService('admin-category-icon'),
    [],
  );
  const logoValue = useMemo<UploadValue | null>(
    () => (iconRef ? { source: 'drive', uri: iconRef, metadata: {} } : null),
    [iconRef],
  );

  const byId = useMemo(() => {
    const map = new Map<string, PluginCategoryRecord>();
    for (const category of categories) map.set(category.id, category);
    return map;
  }, [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, PluginCategoryRecord[]>();
    for (const category of categories) {
      const parent = category.parentId && category.parentId !== '0' ? category.parentId : '0';
      const siblings = map.get(parent) ?? [];
      siblings.push(category);
      map.set(parent, siblings);
    }
    return map;
  }, [categories]);
  const excluded = useMemo(() => {
    const set = collectDescendants(record?.id, childrenByParent);
    if (record) set.add(record.id);
    return set;
  }, [childrenByParent, record]);
  const parentOptions = useMemo(
    () =>
      categories
        .filter((category) => !excluded.has(category.id))
        .map((category) => ({ id: category.id, name: category.name, depth: depthOf(category.id, byId) }))
        .filter((option) => option.depth < MAX_DEPTH - 1)
        .sort((left, right) => left.depth - right.depth || left.name.localeCompare(right.name)),
    [byId, categories, excluded],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  const addTag = () => {
    const value = tagDraft.trim();
    if (!value) return;
    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === value.toLowerCase()) ? current : [...current, value],
    );
    setTagDraft('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const normalizedCode = code.trim();
    if (!record && !CODE_PATTERN.test(normalizedCode)) {
      setFormError(normalizedCode ? copy.drawer.errors.codeInvalid : copy.drawer.errors.codeRequired);
      return;
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
      setFormError(copy.drawer.errors.nameRequired);
      return;
    }
    const parsedSortOrder = Number.parseInt(sortOrder, 10);
    if (!Number.isInteger(parsedSortOrder)) {
      setFormError(copy.drawer.errors.sortInvalid);
      return;
    }
    const attributeMap: Record<string, string> = {};
    for (const row of attributes) {
      const key = row.key.trim();
      if (!key) {
        if (row.value.trim()) {
          setFormError(copy.drawer.errors.attributeKey);
          return;
        }
        continue;
      }
      attributeMap[key] = row.value.trim();
    }
    const normalizedDescription = description.trim();
    setSubmitting(true);
    try {
      if (record) {
        const command: UpdatePluginCategoryCommand = {
          name: normalizedName,
          description: normalizedDescription,
          parentId: parentId || '0',
          sortOrder: parsedSortOrder,
          lifecycleStatus: status as UpdatePluginCategoryCommand['lifecycleStatus'],
          tags,
          attributes: attributeMap,
          ...(iconRef ? { iconRef } : { iconRef: '' }),
        };
        await updatePluginCategory(record.categoryCode, command);
        onSaved(copy.notices.updated(normalizedName));
      } else {
        const command: CreatePluginCategoryCommand = {
          categoryCode: normalizedCode,
          name: normalizedName,
          ...(normalizedDescription ? { description: normalizedDescription } : {}),
          parentId: parentId || '0',
          sortOrder: parsedSortOrder,
          lifecycleStatus: status as CreatePluginCategoryCommand['lifecycleStatus'],
          tags,
          attributes: attributeMap,
          ...(iconRef ? { iconRef } : {}),
        };
        await createPluginCategory(command);
        onSaved(copy.notices.created(normalizedName));
      }
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={copy.drawer.cancel}
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={() => {
          if (!submitting) onClose();
        }}
        tabIndex={-1}
        type="button"
      />
      <form
        className="relative flex h-full w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl"
        onSubmit={submit}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              {record ? copy.drawer.editTitle(record.name) : copy.drawer.createTitle}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {record ? record.categoryCode : copy.drawer.createSubtitle}
            </p>
          </div>
          <button
            aria-label={copy.drawer.cancel}
            className="rounded p-1 text-lg text-zinc-400 hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {formError ? (
            <p
              className="rounded border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-zinc-300">{copy.drawer.code}</span>
              <input
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 disabled:opacity-60"
                disabled={Boolean(record)}
                onChange={(event) => setCode(event.target.value)}
                value={code}
              />
              <small className="text-xs text-zinc-500">
                {record ? copy.drawer.codeImmutable : copy.drawer.codeHint}
              </small>
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-zinc-300">{copy.drawer.name}</span>
              <input
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-zinc-300">{copy.drawer.description}</span>
              <textarea
                className="min-h-20 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">{copy.drawer.parent}</span>
              <select
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                onChange={(event) => setParentId(event.target.value)}
                value={parentId}
              >
                <option value="0">{copy.drawer.parentNone}</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${'· '.repeat(option.depth)}${option.name}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">{copy.drawer.sortOrder}</span>
              <input
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                inputMode="numeric"
                onChange={(event) => setSortOrder(event.target.value)}
                value={sortOrder}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">{copy.drawer.status}</span>
              <select
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {copy.status[option]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">{copy.drawer.logo}</span>
              <DriveUploadImage
                accept={['image/']}
                appResourceId={() => record?.id ?? (code.trim() || null)}
                copy={copy.logoCopy}
                onChange={(value) => setIconRef(value?.uri ?? '')}
                service={logoService}
                shape="rounded"
                sizePx={56}
                value={logoValue}
              />
              <small className="text-xs text-zinc-500">{copy.drawer.logoHint}</small>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-300">{copy.drawer.tags}</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
                  key={tag}
                >
                  {tag}
                  <button
                    aria-label={`${copy.drawer.removeTag}: ${tag}`}
                    className="text-zinc-500 hover:text-zinc-200"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder={copy.drawer.tagPlaceholder}
                value={tagDraft}
              />
              <button className="admin-button admin-button--secondary" onClick={addTag} type="button">
                {copy.drawer.addTag}
              </button>
            </div>
            <small className="text-xs text-zinc-500">{copy.drawer.tagsHint}</small>
          </div>

          <div className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-300">{copy.drawer.attributes}</span>
            {attributes.length === 0 ? (
              <small className="text-xs text-zinc-500">{copy.drawer.emptyAttributes}</small>
            ) : null}
            {attributes.map((row) => (
              <div className="flex items-center gap-2" key={row.id}>
                <input
                  className="min-w-28 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-100"
                  onChange={(event) =>
                    setAttributes((current) =>
                      current.map((item) =>
                        item.id === row.id ? { ...item, key: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder={copy.drawer.attributeKey}
                  value={row.key}
                />
                <input
                  className="min-w-36 flex-[2] rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-100"
                  onChange={(event) =>
                    setAttributes((current) =>
                      current.map((item) =>
                        item.id === row.id ? { ...item, value: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder={copy.drawer.attributeValue}
                  value={row.value}
                />
                <button
                  aria-label={copy.drawer.removeAttribute}
                  className="admin-button admin-button--ghost"
                  onClick={() =>
                    setAttributes((current) => current.filter((item) => item.id !== row.id))
                  }
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="admin-button admin-button--secondary justify-self-start"
              onClick={() => {
                setAttributes((current) => [
                  ...current,
                  { id: attributeSeq, key: '', value: '' },
                ]);
                setAttributeSeq((value) => value + 1);
              }}
              type="button"
            >
              {copy.drawer.addAttribute}
            </button>
            <small className="text-xs text-zinc-500">{copy.drawer.attributesHint}</small>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button
            className="admin-button admin-button--secondary"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            {copy.drawer.cancel}
          </button>
          <button className="admin-button admin-button--primary" disabled={submitting} type="submit">
            {submitting ? copy.drawer.saving : record ? copy.drawer.save : copy.drawer.create}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        aria-labelledby="plugin-category-delete-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        role="alertdialog"
      >
        <h2 className="text-base font-semibold text-zinc-100" id="plugin-category-delete-title">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="admin-button admin-button--secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="admin-button admin-button--danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
