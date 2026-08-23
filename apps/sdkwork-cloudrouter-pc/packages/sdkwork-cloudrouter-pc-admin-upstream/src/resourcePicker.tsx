import { useMemo, useState } from 'react';
import { CheckSquare, Search, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  UpstreamResourceCatalogItem,
  UpstreamResourceGroupCatalogItem,
  UpstreamResourceEntitlementInput,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { inputClass } from './components';

export interface ResourceSelection {
  resourceCodes: string[];
  resourceGroupCodes: string[];
}

export const emptyResourceSelection = (): ResourceSelection => ({ resourceCodes: [], resourceGroupCodes: [] });

/** 把选择集展开为 allow 授权条目（priority 100 / status 1）。 */
export function toEntitlements(selection: ResourceSelection): UpstreamResourceEntitlementInput[] {
  return [
    ...selection.resourceCodes.map((resourceCode) => ({ resourceCode, grantType: 'allow' as const, priority: 100, status: 1 })),
    ...selection.resourceGroupCodes.map((resourceGroupCode) => ({ resourceGroupCode, grantType: 'allow' as const, priority: 100, status: 1 })),
  ];
}

/** 从授权条目恢复选择集（deny 等非 allow 条目被忽略）。 */
export function toSelection(items: UpstreamResourceEntitlementInput[]): ResourceSelection {
  return {
    resourceCodes: items.filter((item) => item.resourceCode).map((item) => item.resourceCode as string),
    resourceGroupCodes: items.filter((item) => item.resourceGroupCode).map((item) => item.resourceGroupCode as string),
  };
}

type ResourceTypeFilter = 'all' | 'api_endpoint' | 'modality' | 'vendor';

const resourceTypes: ResourceTypeFilter[] = ['all', 'api_endpoint', 'modality', 'vendor'];

/** 读取资源的路由类型（模型类 / API 资源类），对应后端 `ai_resource.route_kind`。 */
export type RouteKindValue = 'model' | 'api';

export function readRouteKind(resource: UpstreamResourceCatalogItem): RouteKindValue | null {
  const value = (resource as { routeKind?: string }).routeKind;
  return value === 'model' || value === 'api' ? value : null;
}

/** 路由类型徽标：模型类（model）走模型→vendor 解析，API 类（api）走资源直配。 */
export function RouteKindBadge({ kind }: { kind: RouteKindValue | null }) {
  if (kind === null) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${
        kind === 'model'
          ? 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30'
          : 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30'
      }`}
    >
      {kind === 'model' ? '模型类' : 'API类'}
    </span>
  );
}

export function ResourcePicker({
  resources = [],
  resourceGroups = [],
  selection,
  onChange,
  className,
  listClassName,
  flat = false,
  fixedTab,
}: {
  resources: UpstreamResourceCatalogItem[];
  resourceGroups: UpstreamResourceGroupCatalogItem[];
  selection: ResourceSelection;
  onChange: (next: ResourceSelection) => void;
  /** 附加到容器根节点的样式；默认空 */
  className?: string;
  /** 覆盖资源列表滚动区的样式（如 max-h、flex 撑满）；默认空 */
  listClassName?: string;
  /** 扁平无边框变体，用于嵌入弹窗等平铺场景；默认 false */
  flat?: boolean;
  /** 固定单视图（隐藏内部 Tab 栏），由外层提供 Tab；默认 null 使用内部 Tab */
  fixedTab?: 'resources' | 'groups';
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'resources' | 'groups'>(fixedTab ?? 'groups');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('all');

  const activeTab = fixedTab ?? tab;
  const setActiveTab = (next: 'resources' | 'groups') => {
    if (fixedTab) return;
    setTab(next);
  };

  const selectedCount = selection.resourceCodes.length;
  const selectedGroupCount = selection.resourceGroupCodes.length;

  const toggleResource = (code: string) => {
    const selected = new Set(selection.resourceCodes);
    if (selected.has(code)) {
      selected.delete(code);
    } else {
      selected.add(code);
    }
    onChange({ ...selection, resourceCodes: [...selected] });
  };

  const toggleGroup = (code: string) => {
    const selected = new Set(selection.resourceGroupCodes);
    if (selected.has(code)) {
      selected.delete(code);
    } else {
      selected.add(code);
    }
    onChange({ ...selection, resourceGroupCodes: [...selected] });
  };

  const toggleVendor = (vendorCode: string) => {
    const group = resources.filter((resource) => resource.vendorCode === vendorCode);
    const codes = group.map((resource) => resource.resourceCode);
    const selected = new Set(selection.resourceCodes);
    const allSelected = codes.every((code) => selected.has(code));
    codes.forEach((code) => (allSelected ? selected.delete(code) : selected.add(code)));
    onChange({ ...selection, resourceCodes: [...selected] });
  };

  const clearSelection = () => {
    onChange(emptyResourceSelection());
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredResources = useMemo(() => {
    return resources
      .filter((resource) => typeFilter === 'all' || resource.resourceType === typeFilter)
      .filter((resource) => {
        if (!normalizedQuery) return true;
        return resource.resourceCode.toLowerCase().includes(normalizedQuery)
          || resource.displayName.toLowerCase().includes(normalizedQuery)
          || (resource.apiEndpointCode ?? '').toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => (a.sortOrder === null ? Number.MAX_SAFE_INTEGER : Number(a.sortOrder)) - (b.sortOrder === null ? Number.MAX_SAFE_INTEGER : Number(b.sortOrder)));
  }, [resources, typeFilter, normalizedQuery]);

  const filteredGroups = useMemo(() => {
    return resourceGroups
      .filter((group) => {
        if (!normalizedQuery) return true;
        return group.groupCode.toLowerCase().includes(normalizedQuery)
          || group.groupName.toLowerCase().includes(normalizedQuery)
          || (group.description ?? '').toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => (a.sortOrder === null ? Number.MAX_SAFE_INTEGER : Number(a.sortOrder)) - (b.sortOrder === null ? Number.MAX_SAFE_INTEGER : Number(b.sortOrder)));
  }, [resourceGroups, normalizedQuery]);

  const vendorGroups = useMemo(() => {
    const grouped = new Map<string, UpstreamResourceCatalogItem[]>();
    for (const resource of filteredResources) {
      const key = resource.vendorCode ?? '';
      const items = grouped.get(key) ?? [];
      items.push(resource);
      grouped.set(key, items);
    }
    return [...grouped.entries()];
  }, [filteredResources]);

  const vendorDisplayName = (vendorCode: string | null): string => {
    if (!vendorCode) return t('admin.upstream.supplier.resources.other');
    const vendorResource = resources.find((resource) => resource.resourceCode === `vendor.${vendorCode}`);
    return vendorResource?.displayName ?? vendorCode;
  };

  return (
    <div className={`overflow-hidden ${flat ? '' : 'rounded-md border border-slate-200 dark:border-white/10'} ${className ?? ''}`}>
      <div className={`flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-white/10 ${flat ? '' : 'bg-slate-50/60 dark:bg-white/[0.03]'}`}>
        {fixedTab ? null : (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${activeTab === 'groups' ? 'bg-lobster-600 text-white' : 'text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10'}`}
            >
              {t('admin.upstream.supplier.resources.tab.groups')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${activeTab === 'resources' ? 'bg-lobster-600 text-white' : 'text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10'}`}
            >
              {t('admin.upstream.supplier.resources.tab.resources')}
            </button>
          </div>
        )}
        {selectedCount + selectedGroupCount > 0 ? (
          <button type="button" onClick={clearSelection} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 dark:text-red-300">
            <X className="h-3.5 w-3.5" />
            {t('admin.upstream.supplier.resources.clear')}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 border-b border-slate-200 p-2 dark:border-white/10">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={t('admin.upstream.supplier.resources.search.placeholder')} className={`${inputClass} pl-9`} />
        </div>
        {activeTab === 'resources' ? (
          <div className="flex flex-wrap gap-1.5">
            {resourceTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${typeFilter === type ? 'bg-lobster-50 text-lobster-700 ring-1 ring-inset ring-lobster-200 dark:bg-lobster-500/10 dark:text-lobster-300 dark:ring-lobster-500/30' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}
              >
                {t(`admin.upstream.supplier.resources.filter.${type}`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className={`overflow-x-hidden overflow-y-auto ${listClassName ?? 'max-h-64'}`}>
        {activeTab === 'resources' ? (
          vendorGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.supplier.resources.empty')}</p>
          ) : (
            <div className="grid gap-3 p-3">
              {vendorGroups.map(([vendorCode, items]) => (
                <div key={vendorCode} className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {vendorDisplayName(vendorCode)}
                      {vendorCode ? <span className="ml-1.5 font-mono font-normal normal-case text-slate-400 dark:text-slate-500">{vendorCode}</span> : null}
                    </span>
                    {vendorCode ? (
                      <button type="button" onClick={() => toggleVendor(vendorCode)} className="shrink-0 text-xs font-medium text-lobster-600 hover:text-lobster-700 dark:text-lobster-300">
                        {items.every((resource) => selection.resourceCodes.includes(resource.resourceCode))
                          ? t('admin.upstream.supplier.resources.deselectAll')
                          : t('admin.upstream.supplier.resources.selectAll')}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    {items.map((resource) => {
                      const selected = selection.resourceCodes.includes(resource.resourceCode);
                      return (
                        <label key={resource.resourceCode} className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 transition ${selected ? 'border-lobster-300 bg-lobster-50/70 dark:border-lobster-500/40 dark:bg-lobster-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleResource(resource.resourceCode)} className="h-4 w-4 shrink-0 accent-lobster-600" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="min-w-0 truncate font-mono text-xs text-slate-800 dark:text-slate-100">{resource.resourceCode}</span>
                              <RouteKindBadge kind={readRouteKind(resource)} />
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{resource.displayName}</span>
                          </span>
                          {selected ? <CheckSquare className="h-4 w-4 shrink-0 text-lobster-600 dark:text-lobster-300" /> : <Square className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredGroups.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.supplier.resources.groups.empty')}</p>
        ) : (
          <div className="grid gap-1 p-3">
            {filteredGroups.map((group) => {
              const selected = selection.resourceGroupCodes.includes(group.groupCode);
              return (
                <label key={group.groupCode} className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 transition ${selected ? 'border-lobster-300 bg-lobster-50/70 dark:border-lobster-500/40 dark:bg-lobster-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleGroup(group.groupCode)} className="h-4 w-4 shrink-0 accent-lobster-600" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{group.groupName}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">{group.resourceCount}</span>
                    </span>
                    <span className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">{group.groupCode}</span>
                    {group.description ? <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">{group.description}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <div className={`flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 dark:border-white/10 ${flat ? '' : 'bg-slate-50/60 dark:bg-white/[0.03]'}`}>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('admin.upstream.supplier.resources.selected', { resources: selectedCount, groups: selectedGroupCount })}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{t('admin.upstream.supplier.resources.hint')}</span>
      </div>
    </div>
  );
}
