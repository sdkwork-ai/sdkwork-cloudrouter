import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ChevronRight, Edit3, Eye, EyeOff, Layers3, Plus, Power, PowerOff, RefreshCw, Search, Settings2, SlidersHorizontal, Trash2, X, XCircle } from 'lucide-react';
import { SdkworkSearchableSelect } from '@sdkwork/appbase-pc-react';
import { AdminTableShell, BottomPagination, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { formatDecimalDisplay } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountRequest,
  LlmProtocolConfig,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountGroup,
  UpstreamAccountVerification,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpoint,
  UpdateUpstreamAccountRequest,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { ResourcePicker, emptyResourceSelection, toEntitlements, toSelection, type ResourceSelection } from './resourcePicker';
import { upstreamService } from './upstreamService';
import {
  dangerButtonClass,
  EMPTY_MULTIPLIER_RANGE,
  errorMessage,
  errorMessageI18n,
  Field,
  GroupTypeFilter,
  type GroupTypeFilterValue,
  hasMultiplierFilter,
  InlineError,
  inputClass,
  matchesMultiplierRange,
  matchesTagFilter,
  Modal,
  MultiplierRangeFilter,
  type MultiplierRangeValue,
  primaryButtonClass,
  resolveGroupDisplayName,
  SearchBox,
  secondaryButtonClass,
  Section,
  selectClass,
  SidePanel,
  StatusBadge,
  TableState,
  TagBadge,
  TagFilter,
  UpstreamPageShell,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

/** 左侧分组列表的「未分组」虚拟条目 key（null 表示「全部账号」） */
const UNGROUPED_KEY = '__ungrouped__';

/** 供应商未配置认证方式时一键播种的默认认证方式（与供应商页默认模板一致） */
const DEFAULT_ACCOUNT_AUTH_METHOD: UpstreamSupplierAuthMethodInput = {
  authMethodCode: 'api-key',
  authMethodName: 'API Key',
  authType: 'api_key',
  priority: 100,
  status: 1,
  configSchema: {},
  runtimeAuthConfig: { credentialTransport: 'bearer', credentialParameter: null, defaultHeaders: {} },
};

/** 账号级协议 Base URL 覆盖行：勾选 = 覆盖供应商配置；未勾选 = 继承供应商配置 */
interface ProtocolOverride {
  enabled: boolean;
  baseUrl: string;
}

/** 仅提交勾选且已填写的协议覆盖（留空行视为继承供应商，不提交） */
function enabledProtocolConfigs(overrides: Record<string, ProtocolOverride>): LlmProtocolConfig[] {
  return Object.entries(overrides)
    .filter(([, entry]) => entry.enabled && entry.baseUrl.trim() !== '')
    .map(([protocolCode, entry]) => ({ protocolCode: protocolCode as LlmProtocolConfig['protocolCode'], baseUrl: entry.baseUrl.trim() }));
}

function parseProtocolConfigs(form: FormData): LlmProtocolConfig[] {
  const raw = String(form.get('protocols') ?? '[]').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LlmProtocolConfig =>
      typeof item === 'object' && item !== null
      && typeof (item as LlmProtocolConfig).protocolCode === 'string'
      && typeof (item as LlmProtocolConfig).baseUrl === 'string');
  } catch {
    return [];
  }
}

/** 新建账号默认认证方式：优先标准 API Key（code api-key），其次任意 api_key 类型，再取首个 */
function defaultAuthMethodCode(methods: UpstreamSupplierAuthMethod[]): string {
  return methods.find((method) => method.authMethodCode === 'api-key')?.authMethodCode
    ?? methods.find((method) => method.authType === 'api_key')?.authMethodCode
    ?? methods[0]?.authMethodCode
    ?? '';
}

function groupEntryClass(selected: boolean): string {
  return `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? 'bg-lobster-50 dark:bg-lobster-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`;
}

function iconToolClass(active: boolean): string {
  return `flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200'}`;
}

export function UpstreamAccountAdmin() {
  return (
    <UpstreamPageShell>
      <AccountAdminPanel />
    </UpstreamPageShell>
  );
}

export function AccountAdminPanel() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<UpstreamAccount[]>([]);
  const [groups, setGroups] = useState<UpstreamAccountGroup[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string[]>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<GroupTypeFilterValue>('all');
  const [multiplierRange, setMultiplierRange] = useState<MultiplierRangeValue>(EMPTY_MULTIPLIER_RANGE);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [groupQuery, setGroupQuery] = useState('');
  const [suppliers, setSuppliers] = useState<UpstreamSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamAccount | null | undefined>(undefined);
  const [selected, setSelected] = useState<UpstreamAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamAccount | null>(null);
  const [deleteTargetGroups, setDeleteTargetGroups] = useState<UpstreamAccountGroup[]>([]);
  const [groupsChecking, setGroupsChecking] = useState(false);
  const [removeFromGroups, setRemoveFromGroups] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pageInfo, setPageInfo] = useState<{ totalItems?: string | number } | null>(null);

  const selectedKeyRef = useRef<string | null>(null);
  useEffect(() => { selectedKeyRef.current = selectedKey; }, [selectedKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountPage, supplierPage, groupPage] = await Promise.all([
        upstreamService.accounts.list({ page, pageSize, q: appliedQuery || undefined }),
        upstreamService.suppliers.list({ page: 1, pageSize: 200 }),
        upstreamService.accountGroups.list({ page: 1, pageSize: 200 }),
      ]);
      setGroups(groupPage.items);
      setItems(accountPage.items);
      setPageInfo(accountPage.pageInfo ?? null);
      setSuppliers(supplierPage.items);
      setSelectedKey((current) => current === null || current === UNGROUPED_KEY || groupPage.items.some((group) => group.id === current) ? current : null);
      setSelected((current) => current ? accountPage.items.find((item) => item.id === current.id) ?? null : null);
      // 只保留仍存在的分组成员缓存；当前选中分组的成员由下方懒加载 effect 在 load 后重新拉取，保证数据新鲜。
      // 不在此处批量查询所有分组成员，避免一次进入页面发出上百个成员请求。
      setMemberships((current) => {
        const known = new Set(groupPage.items.map((group) => group.id));
        const selected = selectedKeyRef.current;
        const next: Record<string, string[]> = {};
        for (const [groupId, memberIds] of Object.entries(current)) {
          if (known.has(groupId) && groupId !== selected) next[groupId] = memberIds;
        }
        return next;
      });
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, pageSize, t]);

  useEffect(() => { void load(); }, [load]);

  // 成员关系只按需加载：选中某个分组时才查询该分组成员；「未分组」视图首次选中时一次性补全缺失分组并缓存。
  useEffect(() => {
    let cancelled = false;
    if (selectedKey === null) {
      setMembersLoading(false);
      return;
    }
    const targets: UpstreamAccountGroup[] = [];
    if (selectedKey === UNGROUPED_KEY) {
      targets.push(...groups.filter((group) => !(group.id in memberships)));
    } else {
      const group = groups.find((item) => item.id === selectedKey);
      if (group && !(selectedKey in memberships)) targets.push(group);
    }
    if (targets.length === 0) {
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    Promise.all(targets.map((group) => upstreamService.accountGroups.listMembers(group.id)))
      .then((pages) => {
        if (cancelled) return;
        setMemberships((current) => {
          const next = { ...current };
          targets.forEach((group, index) => { next[group.id] = pages[index].map((member) => member.accountId); });
          return next;
        });
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedKey, groups, memberships, t]);

  const totalAccountCount = Number(pageInfo?.totalItems ?? items.length);
  const { visibleItems, ungroupedCount } = useMemo(() => {
    const groupedIds = new Set(Object.values(memberships).flat());
    // 计数针对当前服务端页（账号列表按页加载）；跨页统计需要服务端查询。
    const ungroupedCount = items.filter((item) => !groupedIds.has(item.id)).length;
    let visibleItems: UpstreamAccount[];
    if (selectedKey === null) {
      visibleItems = items;
    } else if (selectedKey === UNGROUPED_KEY) {
      // 补全成员关系期间不展示不完整的过滤结果，由 TableState 显示加载态
      visibleItems = membersLoading ? [] : items.filter((item) => !groupedIds.has(item.id));
    } else {
      const memberIds = new Set(memberships[selectedKey] ?? []);
      visibleItems = items.filter((item) => memberIds.has(item.id));
    }
    return { visibleItems, ungroupedCount };
  }, [items, memberships, selectedKey, membersLoading]);

  const filteredGroups = useMemo(() => {
    let next = typeFilter === 'all' ? groups : groups.filter((group) => group.groupType === typeFilter);
    if (hasMultiplierFilter(multiplierRange)) next = next.filter((group) => matchesMultiplierRange(group, multiplierRange));
    if (tagFilter.length > 0) next = next.filter((group) => matchesTagFilter(group, tagFilter));
    if (groupQuery.trim() !== '') {
      const q = groupQuery.trim().toLowerCase();
      next = next.filter((group) => resolveGroupDisplayName(group, i18n.language).toLowerCase().includes(q) || group.groupCode.toLowerCase().includes(q));
    }
    return next;
  }, [groups, typeFilter, multiplierRange, tagFilter, groupQuery, i18n.language]);

  const groupListFiltered = typeFilter !== 'all' || hasMultiplierFilter(multiplierRange) || tagFilter.length > 0 || groupQuery.trim() !== '';
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (tagFilter.length > 0 ? 1 : 0) + (hasMultiplierFilter(multiplierRange) ? 1 : 0);

  const changeTypeFilter = (next: GroupTypeFilterValue) => {
    setTypeFilter(next);
    // 当前选中分组不属于新类型时回退到「全部账号」
    if (selectedKey !== null && selectedKey !== UNGROUPED_KEY) {
      const group = groups.find((item) => item.id === selectedKey);
      if (group && next !== 'all' && group.groupType !== next) setSelectedKey(null);
    }
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>, selection: ResourceSelection, apiKeyMasked: string, groupId: string) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const saveResources = async (account: UpstreamAccount) => {
        // 仅在选择了资源时替换，避免资源目录加载失败时意外清空既有绑定
        if (selection.resourceCodes.length === 0 && selection.resourceGroupCodes.length === 0) return;
        await upstreamService.accounts.replaceResources(account, { items: toEntitlements(selection) });
      };
      const joinGroup = async (account: UpstreamAccount) => {
        // 创建模式选中分组时，将新账号加入该分组（全量替换成员列表）
        const group = groups.find((item) => item.id === groupId);
        if (!group) return;
        const members = await upstreamService.accountGroups.listMembers(group.id);
        const existing = members.map(({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }) => ({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }));
        if (existing.some((member) => member.accountId === account.id)) return;
        await upstreamService.accountGroups.replaceMembers(group, { items: [...existing, { accountId: account.id, priority: 100, routingWeight: 100, enabled: true, status: 1 }] });
      };
      if (editing) {
        const updated = await upstreamService.accounts.update(editing, updateAccountInput(form, t));
        // 编辑模式：输入了新密钥（不同于已录入掩码）时为账号创建新凭据
        const apiKey = String(form.get('apiKey') ?? '').trim();
        if (apiKey && apiKey !== apiKeyMasked) {
          await upstreamService.accounts.createCredential(updated.id, {
            credentialName: 'primary',
            secret: apiKey,
            priority: 100,
          });
        }
        await saveResources(updated);
      } else {
        const created = await upstreamService.accounts.create(createAccountInput(form, t));
        try {
          await joinGroup(created);
          await saveResources(created);
        } catch (cause) {
          // 账号已创建但分组/资源保存失败：打开右侧详情提示重试
          setEditing(undefined);
          setSelected(created);
          setError(t('admin.upstream.account.errors.resourcesNotSaved'));
          await load();
          return;
        }
      }
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  // 打开删除确认弹窗前补齐未加载的分组成员，定位该账号所属的分组（懒加载缓存之外的部分按需查询一次）
  const openDeleteDialog = async (account: UpstreamAccount) => {
    setDeleteTarget(account);
    setRemoveFromGroups(true);
    setDeleteTargetGroups([]);
    setGroupsChecking(true);
    try {
      const missing = groups.filter((group) => !(group.id in memberships));
      const pages = await Promise.all(missing.map((group) => upstreamService.accountGroups.listMembers(group.id)));
      const nextMemberships = { ...memberships };
      missing.forEach((group, index) => { nextMemberships[group.id] = pages[index].map((member) => member.accountId); });
      setMemberships(nextMemberships);
      setDeleteTargetGroups(groups.filter((group) => (nextMemberships[group.id] ?? []).includes(account.id)));
    } catch {
      // 分组检查失败时仍可删除：后端会以 40901 兜底并展示专门提示
      setDeleteTargetGroups([]);
    } finally {
      setGroupsChecking(false);
    }
  };

  // 从所属分组中移除账号（全量替换成员列表，保留其余成员的配置）
  const removeAccountFromGroups = async (account: UpstreamAccount, accountGroups: UpstreamAccountGroup[]) => {
    await Promise.all(accountGroups.map(async (group) => {
      const members = await upstreamService.accountGroups.listMembers(group.id);
      const remaining = members
        .filter((member) => member.accountId !== account.id)
        .map(({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }) => ({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }));
      await upstreamService.accountGroups.replaceMembers(group, { items: remaining });
    }));
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      if (removeFromGroups && deleteTargetGroups.length > 0) {
        await removeAccountFromGroups(deleteTarget, deleteTargetGroups);
      }
      await upstreamService.accounts.delete(deleteTarget);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      // 并发场景下账号仍属于分组（缓存/检查过期）时，显示专门提示而非通用冲突文案
      const problem = (cause as { problem?: { code?: number | string } } | undefined)?.problem;
      setError(problem?.code === 40901
        ? t('admin.upstream.account.errors.deleteInGroup')
        : errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const toggleAccountStatus = async (account: UpstreamAccount) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await upstreamService.accounts.update(account, { status: account.status === 1 ? 0 : 1 });
      setItems((current) => current.map((item) => item.id === account.id ? updated : item));
      setSelected((current) => current?.id === account.id ? updated : current);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const supplierName = (supplierId: string) => suppliers.find((item) => item.id === supplierId)?.displayName ?? supplierId;

  const selectedGroup = groups.find((group) => group.id === selectedKey) ?? null;
  const contextName = selectedKey === null
    ? t('admin.upstream.account.groups.all')
    : selectedKey === UNGROUPED_KEY
      ? t('admin.upstream.account.groups.ungrouped')
      : selectedGroup ? resolveGroupDisplayName(selectedGroup, i18n.language) : '';
  const emptyText = selectedKey === UNGROUPED_KEY
    ? t('admin.upstream.account.groups.ungroupedEmpty')
    : selectedKey !== null
      ? t('admin.upstream.account.groups.groupEmpty')
      : t('admin.upstream.account.empty');
  // 分组徽标只在对应成员已按需加载后显示，避免为显示计数而批量查询所有分组
  const allMembershipsLoaded = groups.every((group) => group.id in memberships);

  return (
    <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
          <Layers3 className="h-4 w-4 shrink-0 text-slate-400" />
          {groupSearchOpen ? (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={groupQuery} onChange={(event) => setGroupQuery(event.currentTarget.value)} placeholder={t('admin.upstream.accountGroup.search.placeholder')} className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white" />
              {groupQuery.trim() !== '' ? <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setGroupQuery('')} title={t('common.actions.clear')}><X className="h-3.5 w-3.5" /></button> : null}
            </div>
          ) : (
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{t('admin.upstream.account.groups.title')}</h3>
          )}
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" className={iconToolClass(groupSearchOpen || groupQuery.trim() !== '')} onClick={() => setGroupSearchOpen((current) => !current)} title={t('common.actions.search')} aria-label={t('common.actions.search')} aria-expanded={groupSearchOpen}><Search className="h-4 w-4" /></button>
            <div className="relative">
              <button type="button" className={iconToolClass(filterPanelOpen || activeFilterCount > 0)} onClick={() => setFilterPanelOpen((current) => !current)} title={t('admin.upstream.account.groups.filter')} aria-label={t('admin.upstream.account.groups.filter')} aria-expanded={filterPanelOpen}><SlidersHorizontal className="h-4 w-4" />{activeFilterCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lobster-600 px-0.5 text-[9px] font-semibold text-white">{activeFilterCount}</span> : null}</button>
              {filterPanelOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterPanelOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                    <GroupTypeFilter value={typeFilter} onChange={changeTypeFilter} />
                    <TagFilter value={tagFilter} onChange={setTagFilter} className="mt-3" />
                    <MultiplierRangeFilter value={multiplierRange} onChange={setMultiplierRange} className="mt-3" />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button type="button" className={groupEntryClass(selectedKey === null)} onClick={() => setSelectedKey(null)}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t('admin.upstream.account.groups.all')}</span></span>
            <span className="shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: totalAccountCount })}</span>
          </button>
          <button type="button" className={groupEntryClass(selectedKey === UNGROUPED_KEY)} onClick={() => setSelectedKey(UNGROUPED_KEY)}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t('admin.upstream.account.groups.ungrouped')}</span></span>
            {allMembershipsLoaded ? <span className="shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: ungroupedCount })}</span> : null}
          </button>
          <div className="my-2 border-t border-slate-200 dark:border-white/10" />
          {filteredGroups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t(groupListFiltered ? 'admin.upstream.accountGroup.filter.empty' : 'admin.upstream.account.groups.empty')}</p>
          ) : filteredGroups.map((group) => (
            <button key={group.id} type="button" className={groupEntryClass(selectedKey === group.id)} onClick={() => setSelectedKey(group.id)}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{resolveGroupDisplayName(group, i18n.language)}</span>
                <span className="block truncate font-mono text-xs text-slate-400">{group.groupCode}</span>
                {group.tags && group.tags.length > 0 ? <span className="mt-0.5 flex flex-wrap gap-1">{group.tags.map((tag) => <TagBadge key={tag} tag={tag} small />)}</span> : null}
                <span className="block truncate font-mono text-xs text-slate-400">{t('admin.upstream.accountGroup.table.costMultiplier')} ×{formatDecimalDisplay(group.costMultiplier)} · {t('admin.upstream.accountGroup.table.saleMultiplier')} ×{formatDecimalDisplay(group.saleMultiplier)}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">{memberships[group.id] ? t('admin.upstream.account.groups.accountCount', { count: memberships[group.id].length }) : null}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={query} placeholder={t('admin.upstream.account.search.placeholder')} onChange={setQuery} onSubmit={setAppliedQuery} />
          <div className="flex gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('common.actions.refresh')}</button>
            <button type="button" className={primaryButtonClass} onClick={() => setEditing(null)} disabled={suppliers.length === 0 || groups.length === 0}><Plus className="h-4 w-4" />{t('admin.upstream.account.actions.new')}</button>
          </div>
        </div>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label={t('admin.upstream.account.groups.title')}>
          <button type="button" className="shrink-0 text-slate-500 transition-colors hover:text-lobster-600 dark:text-slate-400 dark:hover:text-lobster-400" onClick={() => setSelectedKey(null)}>{t('admin.upstream.account.groups.title')}</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {selectedKey === null ? (
            <span className="truncate font-medium text-slate-900 dark:text-white">{t('admin.upstream.account.groups.all')}</span>
          ) : selectedKey === UNGROUPED_KEY ? (
            <span className="truncate font-medium text-slate-900 dark:text-white">{t('admin.upstream.account.groups.ungrouped')}</span>
          ) : selectedGroup ? (
            <>
              <button type="button" className="shrink-0 text-slate-500 transition-colors hover:text-lobster-600 dark:text-slate-400 dark:hover:text-lobster-400" onClick={() => { setTypeFilter(selectedGroup.groupType); setSelectedKey(null); }}>{t(`admin.upstream.accountGroup.groupType.${selectedGroup.groupType}`)}</button>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate font-medium text-slate-900 dark:text-white">{contextName}</span>
            </>
          ) : null}
          <span className="ml-1 shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: visibleItems.length })}</span>
        </nav>
        <InlineError message={error} />
        <AdminTableShell>
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400">
              <tr><th className="px-4 py-3">{t('admin.upstream.account.table.account')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.supplier')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.authentication')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.costMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.quota')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.status')}</th><th className="px-4 py-3 text-right">{t('admin.upstream.account.table.actions')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {visibleItems.length === 0 ? <TableState loading={loading || membersLoading} empty={emptyText} colSpan={7} /> : visibleItems.map((account) => (
              <tr key={account.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(account)}><span className="block font-semibold text-slate-900 dark:text-white">{account.accountName}</span><span className="block font-mono text-xs text-slate-500">{account.accountCode}</span></button></td>
                <td className="px-4 py-3"><span className="font-medium">{supplierName(account.supplierId)}</span><span className="block text-xs text-slate-500">{account.supplierCode}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-xs">{account.authMethodCode}</span></td>
                <td className="px-4 py-3 font-mono">{formatDecimalDisplay(account.contractCostMultiplier)}</td>
                <td className="px-4 py-3"><span>{formatDecimalDisplay(account.quotaUsed, '0')} / {formatDecimalDisplay(account.quotaLimit)}</span><span className="block text-xs text-slate-500">{t('admin.upstream.account.table.rpm', { value: account.rpmLimit ?? '-' })}</span></td>
                <td className="px-4 py-3"><StatusBadge status={account.status} healthy={account.healthStatus} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">{account.status === 1 ? <button type="button" className={dangerButtonClass} onClick={() => void toggleAccountStatus(account)} title={t('admin.upstream.account.actions.disable')}><PowerOff className="h-4 w-4" /></button> : <button type="button" className={secondaryButtonClass} onClick={() => void toggleAccountStatus(account)} title={t('admin.upstream.account.actions.enable')}><Power className="h-4 w-4" /></button>}<button type="button" className={secondaryButtonClass} onClick={() => setSelected(account)} title={t('admin.upstream.account.actions.credentials')}><Settings2 className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(account)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => void openDeleteDialog(account)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        </AdminTableShell>
        {pageInfo ? (
          <BottomPagination
            hasNextPage={Number(pageInfo.totalItems ?? 0) > page * pageSize}
            itemCount={visibleItems.length}
            nextLabel={t('common.pagination.next', 'Next page')}
            onNextPage={() => setPage((current) => current + 1)}
            onPageSizeChange={(nextPageSize) => { setPage(1); setPageSize(nextPageSize); }}
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            pageLabel={t('common.pagination.page', 'Page {page}')}
            pageSize={pageSize}
            pageSizeLabel={t('common.pagination.rows', 'Rows')}
            pageSizeOptions={[20, 50, 100]}
            previousLabel={t('common.pagination.previous', 'Previous page')}
            showingLabel={t('common.pagination.showing', 'Showing')}
          />
        ) : null}
        {editing !== undefined ? <AccountModal account={editing} suppliers={suppliers} groups={groups} initialGroupId={selectedKey !== null && selectedKey !== UNGROUPED_KEY ? selectedKey : null} busy={busy} onSubmit={submitAccount} onClose={() => setEditing(undefined)} /> : null}
        {selected ? <AccountCredentials account={selected} supplier={suppliers.find((item) => item.id === selected.supplierId) ?? null} onClose={() => setSelected(null)} onAccountChanged={(account) => { setSelected(account); setItems((current) => current.map((item) => item.id === account.id ? account : item)); }} /> : null}
        {deleteTarget ? <ConfirmDialog
          title={t('admin.upstream.account.delete.title')}
          description={deleteTargetGroups.length > 0
            ? t('admin.upstream.account.delete.inGroups', {
                count: deleteTargetGroups.length,
                names: deleteTargetGroups.map((group) => resolveGroupDisplayName(group, i18n.language)).join(i18n.language.toLowerCase().startsWith('zh') ? '、' : ', '),
              })
            : t('admin.upstream.account.delete.description', { name: deleteTarget.accountName })}
          confirmLabel={t('common.actions.delete')}
          confirmDisabled={groupsChecking || (deleteTargetGroups.length > 0 && !removeFromGroups)}
          tone="danger"
          isBusy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteAccount()}
        >
          {groupsChecking ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.upstream.common.status.loading')}</p>
          ) : deleteTargetGroups.length > 0 ? (
            <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-lobster-600" checked={removeFromGroups} onChange={(event) => setRemoveFromGroups(event.currentTarget.checked)} />
              <span>{t('admin.upstream.account.delete.removeFromGroups', { count: deleteTargetGroups.length })}</span>
            </label>
          ) : null}
        </ConfirmDialog> : null}
      </div>
    </div>
  );
}

function RowField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-right text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required ? <span className="ml-1 text-red-500">*</span> : null}</span>
      {children}
    </div>
  );
}

function AccountModal({ account, suppliers, groups, initialGroupId, busy, onSubmit, onClose }: { account: UpstreamAccount | null; suppliers: UpstreamSupplier[]; groups: UpstreamAccountGroup[]; initialGroupId: string | null; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, selection: ResourceSelection, apiKeyMasked: string, groupId: string) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [supplierId, setSupplierId] = useState(account?.supplierId ?? suppliers[0]?.id ?? '');
  const [groupId, setGroupId] = useState(initialGroupId ?? '');
  const [authMethods, setAuthMethods] = useState<UpstreamSupplierAuthMethod[]>([]);
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpoint[]>([]);
  const [authMethodCode, setAuthMethodCode] = useState(account?.authMethodCode ?? '');
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [selection, setSelection] = useState<ResourceSelection>(emptyResourceSelection());
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [preferredEndpointId, setPreferredEndpointId] = useState('');
  const [preferredEndpointStale, setPreferredEndpointStale] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [groupMissing, setGroupMissing] = useState(false);
  const [seedingAuth, setSeedingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  // Base URL 配置区：账号级默认地址 + 各 LLM 协议独立覆盖（账号配置优先于供应商配置）
  const [defaultBaseUrl, setDefaultBaseUrl] = useState(account?.defaultBaseUrl ?? '');
  const [protocolOverrides, setProtocolOverrides] = useState<Record<string, ProtocolOverride>>({});
  const [protocolUrlError, setProtocolUrlError] = useState(false);

  // 供应商/账号切换时同步协议覆盖区：账号覆盖是相对供应商的配置，
  // 仅保留与当前供应商协议匹配的覆盖行；编辑模式回填账号自身配置，其余继承供应商
  useEffect(() => {
    const supplier = suppliers.find((item) => item.id === supplierId) ?? null;
    const supplierProtocols = supplier?.protocols ?? [];
    const accountIsCurrent = !!account && account.supplierId === supplierId;
    setProtocolUrlError(false);
    setProtocolOverrides((current) => {
      const next: Record<string, ProtocolOverride> = {};
      for (const protocol of supplierProtocols) {
        const accountOverride = accountIsCurrent
          ? (account?.protocols ?? []).find((item) => item.protocolCode === protocol.protocolCode)
          : undefined;
        const previous = current[protocol.protocolCode];
        next[protocol.protocolCode] = {
          enabled: accountOverride ? true : (previous?.enabled ?? false),
          baseUrl: accountOverride?.baseUrl ?? previous?.baseUrl ?? protocol.baseUrl,
        };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, account]);

  // 账号默认 Base URL 是账号级配置（与供应商选择无关）：仅在切换编辑目标时回填，
  // 不随供应商切换清除，也不覆盖创建模式下的用户输入
  useEffect(() => {
    if (account) setDefaultBaseUrl(account?.defaultBaseUrl ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    if (!supplierId) return;
    void Promise.all([
      upstreamService.suppliers.listAuthMethods(supplierId),
      upstreamService.suppliers.listEndpoints(supplierId),
    ]).then(([nextMethods, nextEndpoints]) => {
      setAuthMethods(nextMethods);
      setEndpoints(nextEndpoints);
      // 编辑模式：端点加载完成后回填当前首选端点；该端点已停用/不存在时回退为「自动选择」并提示，
      // 保存时提交 null，由后端清除失效绑定（更新语义：缺省=保持、null=清除、id=设置）。
      if (account) {
        const current = account.preferredEndpointId ?? '';
        const currentStillActive = current !== '' && nextEndpoints.some((endpoint) => endpoint.id === current && endpoint.status === 1);
        // 仅在未切换供应商、而当前首选端点已停用/删除时提示；切换供应商属于正常重绑流程，不提示
        setPreferredEndpointStale(current !== '' && !currentStillActive && account.supplierId === supplierId);
        setPreferredEndpointId((previous) => {
          if (previous !== '' && nextEndpoints.some((endpoint) => endpoint.id === previous && endpoint.status === 1)) return previous;
          return currentStillActive ? current : '';
        });
      }
      // 创建模式：默认选中 API Key（优先 code api-key，其次 api_key 类型）；切换供应商时重置选择，
      // 避免残留上一供应商的认证方式
      if (!account) {
        setAuthMethodCode(defaultAuthMethodCode(nextMethods));
      }
    });
  }, [supplierId, account]);

  // 供应商未配置认证方式时一键播种默认 API Key 认证方式（后端验证/运行时按 auth_method_code
  // 关联供应商认证方式，供应商侧必须存在对应配置）
  const seedDefaultAuthMethod = async () => {
    const supplier = suppliers.find((item) => item.id === supplierId);
    if (!supplier) return;
    setSeedingAuth(true);
    setAuthError(null);
    try {
      await upstreamService.suppliers.replaceAuthMethods(supplier, { items: [DEFAULT_ACCOUNT_AUTH_METHOD] });
      const nextMethods = await upstreamService.suppliers.listAuthMethods(supplier.id);
      setAuthMethods(nextMethods);
      setAuthMethodCode(defaultAuthMethodCode(nextMethods));
    } catch (cause) {
      setAuthError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setSeedingAuth(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      upstreamService.fetchResourceCatalog(),
      account ? upstreamService.accounts.listResources(account.id) : Promise.resolve([]),
      account ? upstreamService.accounts.listCredentials(account.id, { page: 1, pageSize: 200 }) : Promise.resolve([]),
    ])
      .then(([nextCatalog, items, credentials]) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        if (account) {
          setSelection(toSelection(items.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status }))));
          const activeCredential = credentials.find((credential) => credential.isActive) ?? credentials[0] ?? null;
          setApiKeyMasked(activeCredential?.maskedLabel ?? '');
          setApiKeyInput(activeCredential?.maskedLabel ?? '');
        }
      })
      .catch((cause) => {
        if (!cancelled) setCatalog(null);
      })
      .finally(() => {
        if (!cancelled) setResourcesLoading(false);
      });
    return () => { cancelled = true; };
  }, [account]);

  const selectedAuthMethod = authMethods.find((method) => method.authMethodCode === authMethodCode) ?? null;
  // 认证方式为 APIKEY 时显示 API Key 输入：创建模式必填，编辑模式仅展示掩码提示，
  // 输入新值表示轮换密钥，留空表示保持当前密钥（写后只读，无法查看明文）。
  const showApiKeyInput = selectedAuthMethod?.authType === 'api_key';
  const selectedSupplier = suppliers.find((item) => item.id === supplierId) ?? null;
  const protocolRows = (selectedSupplier?.protocols ?? []).map((protocol) => ({
    protocolCode: protocol.protocolCode,
    enabled: protocolOverrides[protocol.protocolCode]?.enabled ?? false,
    baseUrl: protocolOverrides[protocol.protocolCode]?.baseUrl ?? protocol.baseUrl,
  }));
  const setProtocolOverride = (protocolCode: string, enabled: boolean) => {
    setProtocolOverrides((current) => ({ ...current, [protocolCode]: { enabled, baseUrl: current[protocolCode]?.baseUrl ?? '' } }));
    setProtocolUrlError(false);
  };
  const setProtocolOverrideBaseUrl = (protocolCode: string, baseUrl: string) => {
    setProtocolOverrides((current) => ({ ...current, [protocolCode]: { enabled: current[protocolCode]?.enabled ?? false, baseUrl } }));
    setProtocolUrlError(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 新建账号必须归属某个账号分组
    if (!account && !groupId) {
      setGroupMissing(true);
      return;
    }
    // 已勾选的协议覆盖必须填写 Base URL（留空视为继承供应商，不提交）
    if (protocolRows.some((row) => row.enabled && !row.baseUrl.trim())) {
      setProtocolUrlError(true);
      return;
    }
    onSubmit(event, selection, apiKeyMasked, groupId);
  };

  return (
    <Modal title={account ? t('admin.upstream.account.form.editTitle') : t('admin.upstream.account.form.createTitle')} busy={busy} submitLabel={account ? t('common.actions.saveChanges') : t('admin.upstream.account.form.createAction')} size="xl" fillHeight maxHeightClass="max-h-[80vh]" onSubmit={handleSubmit} onClose={onClose}>
      <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-3 lg:min-h-0 lg:overflow-y-auto">
          <RowField label={t('admin.upstream.account.form.accountName')} required><input name="accountName" className={inputClass} defaultValue={account?.accountName} required /></RowField>
          <RowField label={t('admin.upstream.account.form.supplier')} required>
            <input type="hidden" name="supplierId" value={supplierId} />
            <SdkworkSearchableSelect
              className="h-9"
              value={supplierId}
              onValueChange={(value) => setSupplierId(value)}
              options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.displayName, keywords: [supplier.supplierCode] }))}
              placeholder={t('admin.upstream.account.form.selectSupplier')}
              searchPlaceholder={t('admin.upstream.account.form.supplierSearch')}
              emptyText={t('admin.upstream.account.form.supplierEmpty')}
            />
          </RowField>
          <RowField label={t('admin.upstream.account.form.defaultBaseUrl')}>
            <div className="min-w-0">
              <input name="defaultBaseUrl" className={inputClass} placeholder={selectedSupplier?.defaultBaseUrl ?? 'https://api.example.com/v1'} value={defaultBaseUrl} onChange={(event) => setDefaultBaseUrl(event.currentTarget.value)} />
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.account.form.defaultBaseUrlHint')}</p>
            </div>
          </RowField>
          <div className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.upstream.account.form.protocols.title')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.account.form.protocols.description')}</p>
            </div>
            {protocolRows.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.upstream.account.form.protocols.none')}</p> : protocolRows.map((row) => (
              <div key={row.protocolCode} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <input type="checkbox" aria-label={t('admin.upstream.account.form.protocols.override')} checked={row.enabled} onChange={(event) => setProtocolOverride(row.protocolCode, event.currentTarget.checked)} className="h-4 w-4 accent-lobster-600" />
                <div className="min-w-0">
                  <span className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{row.protocolCode}</span>
                  <input className={inputClass} value={row.baseUrl} disabled={!row.enabled} onChange={(event) => setProtocolOverrideBaseUrl(row.protocolCode, event.currentTarget.value)} placeholder="https://api.example.com/v1" />
                </div>
              </div>
            ))}
            {protocolUrlError ? <p className="text-xs text-red-500">{t('admin.upstream.account.form.protocols.baseUrlRequired')}</p> : null}
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.account.form.baseUrlPriority.hint')}</p>
          </div>
          {/* 编辑模式且账号供应商不在列表中（无法展示协议行）时提交空串，
              更新请求据此省略 protocols 字段（缺省=保持），避免意外清除既有协议覆盖 */}
          <input type="hidden" name="protocols" value={account && !selectedSupplier ? '' : JSON.stringify(enabledProtocolConfigs(protocolOverrides))} />
          {account ? <RowField label={t('admin.upstream.account.form.preferredBaseUrl')}><div className="min-w-0"><select name="preferredEndpointId" className={selectClass} value={preferredEndpointId} onChange={(event) => setPreferredEndpointId(event.currentTarget.value)}><option value="">{t('admin.upstream.account.form.automatic')}</option>{endpoints.filter((endpoint) => endpoint.status === 1).map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.endpointName} ({endpoint.baseUrl})</option>)}</select>{preferredEndpointStale ? <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('admin.upstream.account.errors.preferredEndpointStale')}</p> : null}</div></RowField> : null}
          <RowField label={t('admin.upstream.account.form.authMethod')} required>
            <div className="min-w-0">
              <select name="authMethodCode" className={selectClass} value={authMethodCode} onChange={(event) => setAuthMethodCode(event.currentTarget.value)} required disabled={authMethods.length === 0}><option value="">{t('admin.upstream.account.form.selectMethod')}</option>{authMethods.map((method) => <option key={method.id} value={method.authMethodCode}>{method.authMethodName}</option>)}</select>
              {authMethods.length === 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs text-amber-600 dark:text-amber-400">{t('admin.upstream.account.errors.authMethodMissing')}</span>
                  <button type="button" className="text-xs font-medium text-lobster-600 hover:underline dark:text-lobster-400" onClick={() => void seedDefaultAuthMethod()} disabled={seedingAuth}>{t('admin.upstream.account.actions.seedAuthMethod')}</button>
                </div>
              ) : null}
              {authError ? <p className="mt-1 text-xs text-red-500">{authError}</p> : null}
            </div>
          </RowField>
          {showApiKeyInput ? <RowField label={t('admin.upstream.account.form.apiKey')} required={!account}><div className="relative min-w-0 flex-1"><input name="apiKey" type={showApiKey ? 'text' : 'password'} autoComplete="new-password" className={`${inputClass} pr-10`} value={apiKeyInput} onChange={(event) => setApiKeyInput(event.currentTarget.value)} placeholder={account ? t('admin.upstream.account.form.apiKeyRotatePlaceholder') : t('admin.upstream.account.form.apiKeyPlaceholder')} required={!account} /><button type="button" title={showApiKey ? t('admin.upstream.account.form.hideApiKey') : t('admin.upstream.account.form.showApiKey')} aria-label={showApiKey ? t('admin.upstream.account.form.hideApiKey') : t('admin.upstream.account.form.showApiKey')} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200" onClick={() => setShowApiKey((current) => !current)}>{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></RowField> : null}
          {!account ? <RowField label={t('admin.upstream.account.form.accountGroup')} required>
            <div className="min-w-0">
              <SdkworkSearchableSelect
                className="h-9"
                value={groupId}
                onValueChange={(value) => { setGroupId(value); setGroupMissing(false); }}
                options={groups.map((group) => ({ value: group.id, label: `${resolveGroupDisplayName(group, i18n.language)} ×${formatDecimalDisplay(group.saleMultiplier)}`, keywords: [group.groupCode, ...(group.tags ?? [])] }))}
                placeholder={t('admin.upstream.account.form.selectGroup')}
                searchPlaceholder={t('admin.upstream.account.form.groupSearch')}
                emptyText={t('admin.upstream.account.form.groupEmpty')}
                clearable={false}
              />
              {groupMissing ? <p className="mt-1 text-xs text-red-500">{t('admin.upstream.account.errors.groupRequired')}</p> : null}
            </div>
          </RowField> : null}
          <RowField label={t('admin.upstream.account.form.contractCostMultiplier')} required><input name="contractCostMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={formatDecimalDisplay(account?.contractCostMultiplier, '1')} required /></RowField>
          <RowField label={t('admin.upstream.account.form.quotaLimit')}><input name="quotaLimit" type="number" min="0" step="0.000001" className={inputClass} defaultValue={formatDecimalDisplay(account?.quotaLimit, '')} /></RowField>
          <RowField label={t('admin.upstream.account.form.rpmLimit')}><input name="rpmLimit" type="number" min="0" step="1" className={inputClass} defaultValue={account?.rpmLimit ?? ''} /></RowField>
          <RowField label={t('admin.upstream.account.form.timeoutMs')}><input name="timeoutMs" type="number" min="100" max="600000" className={inputClass} defaultValue={account?.timeoutMs ?? 120000} /></RowField>
          <RowField label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={account?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></RowField>
        </div>
        <div className="flex min-h-0 flex-col gap-3 border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="mb-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.account.form.resources.title')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.account.form.resources.description')}</p>
          </div>
          {catalog ? (
            <ResourcePicker
              resources={catalog.resources}
              resourceGroups={catalog.resourceGroups}
              selection={selection}
              onChange={setSelection}
              flat
              className="flex min-h-0 flex-1 flex-col"
              listClassName="min-h-0 max-h-72 flex-1 lg:max-h-none"
            />
          ) : resourcesLoading ? (
            <p className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">{t('admin.upstream.common.status.loading')}</p>
          ) : (
            <p className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">{t('admin.upstream.common.errors.operationFailed')}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AccountCredentials({ account, supplier, onAccountChanged, onClose }: { account: UpstreamAccount; supplier: UpstreamSupplier | null; onAccountChanged: (account: UpstreamAccount) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<UpstreamAccountCredential[]>([]);
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpoint[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resourcesBusy, setResourcesBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [verification, setVerification] = useState<UpstreamAccountVerification | null>(null);
  const [credentialId, setCredentialId] = useState('');
  const [endpointId, setEndpointId] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCredentials, nextEndpoints, nextResources, nextCatalog] = await Promise.all([
        upstreamService.accounts.listCredentials(account.id, { page: 1, pageSize: 200 }),
        upstreamService.suppliers.listEndpoints(account.supplierId),
        upstreamService.accounts.listResources(account.id),
        upstreamService.fetchResourceCatalog(),
      ]);
      setCredentials(nextCredentials);
      setEndpoints(nextEndpoints);
      setResources(nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status })));
      setCatalog(nextCatalog);
      setCredentialId((current) => current || nextCredentials[0]?.id || '');
      setEndpointId((current) => current || account.preferredEndpointId || nextEndpoints[0]?.id || '');
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [account.id, account.preferredEndpointId, account.supplierId, t]);

  useEffect(() => { void load(); }, [load]);

  const createCredential = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await upstreamService.accounts.createCredential(account.id, {
        credentialName: required(form, 'credentialName', t('admin.upstream.account.credentials.name'), t),
        secret: required(form, 'secret', t('admin.upstream.account.credentials.secret'), t),
        expiresAt: optional(form, 'expiresAt'),
        priority: numeric(form, 'priority', 100),
      });
      setCreateOpen(false);
      await load();
      onAccountChanged(await upstreamService.accounts.retrieve(account.id));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const deleteCredential = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accounts.deleteCredential(account.id, id);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setVerification(null);
    try {
      setVerification(await upstreamService.accounts.verify(account.id, {
        credentialId: credentialId || undefined,
        endpointId: endpointId || undefined,
        timeoutMs: account.timeoutMs ?? undefined,
      }));
      onAccountChanged(await upstreamService.accounts.retrieve(account.id));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const resourceSelection: ResourceSelection = toSelection(resources);
  const setResourceSelection = (next: ResourceSelection) => {
    setResources(toEntitlements(next));
  };
  const removeResource = (index: number) => {
    setResources((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };
  const resourceLabel = (item: UpstreamResourceEntitlementInput) => {
    const code = item.resourceCode ?? item.resourceGroupCode ?? '';
    const resource = catalog?.resources.find((entry) => entry.resourceCode === code);
    const group = catalog?.resourceGroups.find((entry) => entry.groupCode === code);
    return resource?.displayName ?? group?.groupName ?? code;
  };

  const saveResources = async () => {
    setResourcesBusy(true);
    setError(null);
    try {
      const items = toEntitlements(resourceSelection);
      await upstreamService.accounts.replaceResources(account, { items });
      setResources(items);
      setResourcePickerOpen(false);
      onAccountChanged(await upstreamService.accounts.retrieve(account.id));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setResourcesBusy(false);
    }
  };

  return (
    <SidePanel title={account.accountName} subtitle={`${supplier?.displayName ?? account.supplierCode} / ${account.authMethodCode}`} onClose={onClose}>
      <div className="grid gap-6">
        <InlineError message={error} />
        <Section title={t('admin.upstream.account.credentials.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t('admin.upstream.account.credentials.add')}</button>}>
          <div className="grid gap-2">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-white/10">
                <div className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{credential.credentialName}</span><span className="block truncate font-mono text-xs text-slate-500">{credential.maskedLabel ?? credential.credentialVersion}</span></div>
                <div className="flex items-center gap-2"><StatusBadge status={credential.status} /><button type="button" className={dangerButtonClass} onClick={() => void deleteCredential(credential.id)} disabled={busy}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            {!loading && credentials.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.account.credentials.empty')}</p> : null}
          </div>
        </Section>
        <Section title={t('admin.upstream.account.resources.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setResourcePickerOpen((current) => !current)}><Plus className="h-4 w-4" />{t('admin.upstream.account.resources.add')}</button>}>
          <div className="grid gap-3">
            {resourcePickerOpen && catalog ? (
              <ResourcePicker resources={catalog.resources} resourceGroups={catalog.resourceGroups} selection={resourceSelection} onChange={setResourceSelection} />
            ) : null}
            {resources.length === 0 && !resourcePickerOpen ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.account.resources.empty')}</p> : null}
            <div className="flex flex-wrap gap-2">
              {resources.map((resource, index) => (
                <span key={`${resource.resourceCode ?? resource.resourceGroupCode}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 dark:border-white/10 dark:bg-white/5">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-700 dark:text-slate-200">{resourceLabel(resource)}</span>
                    <span className="block truncate font-mono text-[10px] text-slate-400">{resource.resourceCode ?? resource.resourceGroupCode}</span>
                  </span>
                  <button type="button" title={t('common.actions.delete')} className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" onClick={() => removeResource(index)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <button type="button" className={primaryButtonClass} disabled={resourcesBusy} onClick={() => void saveResources()}>{t('admin.upstream.account.resources.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.account.verification.title')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('admin.upstream.account.verification.credential')}><select className={selectClass} value={credentialId} onChange={(event) => setCredentialId(event.currentTarget.value)}><option value="">{t('admin.upstream.account.form.automatic')}</option>{credentials.map((credential) => <option key={credential.id} value={credential.id}>{credential.credentialName}</option>)}</select></Field>
            <Field label={t('admin.upstream.common.fields.baseUrl')}><select className={selectClass} value={endpointId} onChange={(event) => setEndpointId(event.currentTarget.value)}><option value="">{t('admin.upstream.account.form.automatic')}</option>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.endpointName}</option>)}</select></Field>
            <button type="button" className={`${primaryButtonClass} sm:col-span-2`} onClick={() => void verify()} disabled={busy || credentials.length === 0}>{t('admin.upstream.account.verification.verify')}</button>
            {verification ? <div className={`flex items-start gap-2 rounded-md border px-3 py-3 text-sm sm:col-span-2 ${verification.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'}`}>{verification.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}<div><span className="font-semibold">{verification.message}</span><span className="block text-xs opacity-80">{t('admin.upstream.account.verification.resultMeta', { status: verification.statusCode ?? '-', latency: verification.latencyMs })}</span></div></div> : null}
          </div>
        </Section>
      </div>
      {createOpen ? <Modal title={t('admin.upstream.account.credentials.createTitle')} busy={busy} submitLabel={t('admin.upstream.account.credentials.store')} onSubmit={createCredential} onClose={() => setCreateOpen(false)}><div className="grid gap-4"><Field label={t('admin.upstream.account.credentials.name')} required><input name="credentialName" className={inputClass} required /></Field><Field label={t('admin.upstream.account.credentials.secret')} required hint={t('admin.upstream.account.credentials.secretHint')}><div className="relative"><input name="secret" type={showSecret ? 'text' : 'password'} autoComplete="new-password" className={`${inputClass} pr-10`} required /><button type="button" title={showSecret ? t('admin.upstream.account.credentials.hideSecret') : t('admin.upstream.account.credentials.showSecret')} aria-label={showSecret ? t('admin.upstream.account.credentials.hideSecret') : t('admin.upstream.account.credentials.showSecret')} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200" onClick={() => setShowSecret((current) => !current)}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t('admin.upstream.common.fields.priority')}><input name="priority" type="number" min="0" className={inputClass} defaultValue="100" /></Field><Field label={t('admin.upstream.account.credentials.expiresAt')}><input name="expiresAt" type="datetime-local" className={inputClass} /></Field></div></div></Modal> : null}
    </SidePanel>
  );
}

function createAccountInput(form: FormData, t: TranslationFunction): CreateUpstreamAccountRequest {
  const apiKey = optional(form, 'apiKey');
  const defaultBaseUrl = optional(form, 'defaultBaseUrl');
  const protocols = parseProtocolConfigs(form);
  return {
    accountName: required(form, 'accountName', t('admin.upstream.account.form.accountName'), t),
    supplierId: required(form, 'supplierId', t('admin.upstream.account.form.supplier'), t),
    authMethodCode: required(form, 'authMethodCode', t('admin.upstream.account.form.authMethod'), t),
    contractCostMultiplier: required(form, 'contractCostMultiplier', t('admin.upstream.account.form.contractCostMultiplier'), t),
    quotaLimit: optional(form, 'quotaLimit'),
    rpmLimit: optional(form, 'rpmLimit'),
    timeoutMs: numeric(form, 'timeoutMs', 120000, t('admin.upstream.account.form.timeoutMs'), t),
    status: numeric(form, 'status', 1),
    ...(defaultBaseUrl ? { defaultBaseUrl } : {}),
    ...(protocols.length > 0 ? { protocols } : {}),
    ...(apiKey ? { apiKey } : {}),
  };
}

function updateAccountInput(form: FormData, t: TranslationFunction): UpdateUpstreamAccountRequest {
  // protocols 字段为空串 = 协议区不可用（账号供应商不在列表中），省略字段（缺省=保持），
  // 避免意外清除既有协议覆盖；非空 JSON（含 '[]'）按正常更新语义提交
  const protocolsRaw = String(form.get('protocols') ?? '').trim();
  const protocols = protocolsRaw ? parseProtocolConfigs(form) : undefined;
  return {
    accountName: required(form, 'accountName', t('admin.upstream.account.form.accountName'), t),
    supplierId: required(form, 'supplierId', t('admin.upstream.account.form.supplier'), t),
    authMethodCode: required(form, 'authMethodCode', t('admin.upstream.account.form.authMethod'), t),
    preferredEndpointId: optional(form, 'preferredEndpointId'),
    // 更新语义：空串 = 清除账号默认地址（继承供应商）；空数组 = 清除协议覆盖（继承供应商）
    defaultBaseUrl: optional(form, 'defaultBaseUrl') ?? '',
    ...(protocols !== undefined ? { protocols } : {}),
    contractCostMultiplier: required(form, 'contractCostMultiplier', t('admin.upstream.account.form.contractCostMultiplier'), t),
    quotaLimit: optional(form, 'quotaLimit'),
    rpmLimit: optional(form, 'rpmLimit'),
    timeoutMs: numeric(form, 'timeoutMs', 120000, t('admin.upstream.account.form.timeoutMs'), t),
    status: numeric(form, 'status', 1),
  };
}

function required(form: FormData, key: string, field: string, t: TranslationFunction): string {
  const value = String(form.get(key) ?? '').trim();
  if (!value) throw new Error(t('admin.upstream.common.validation.required', { field }));
  return value;
}

function optional(form: FormData, key: string): string | null {
  return String(form.get(key) ?? '').trim() || null;
}

function numeric(form: FormData, key: string, fallback: number, field?: string, t?: TranslationFunction): number {
  const raw = String(form.get(key) ?? '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(t && field ? t('admin.upstream.common.validation.numeric', { field }) : key);
  return value;
}
