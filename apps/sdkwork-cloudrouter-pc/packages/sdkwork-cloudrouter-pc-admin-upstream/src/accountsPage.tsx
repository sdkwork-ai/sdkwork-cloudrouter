import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ChevronRight, Edit3, Layers3, Plus, Power, PowerOff, RefreshCw, Settings2, Trash2, XCircle } from 'lucide-react';
import { SdkworkSearchableSelect } from '@sdkwork/appbase-pc-react';
import { AdminTableShell, BottomPagination, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { formatDecimalDisplay } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountRequest,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountGroup,
  UpstreamAccountVerification,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
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

function groupEntryClass(selected: boolean): string {
  return `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`;
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
  const [suppliers, setSuppliers] = useState<UpstreamSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamAccount | null | undefined>(undefined);
  const [selected, setSelected] = useState<UpstreamAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamAccount | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pageInfo, setPageInfo] = useState<{ totalItems?: string | number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountPage, supplierPage, groupPage] = await Promise.all([
        upstreamService.accounts.list({ page, pageSize, q: appliedQuery || undefined }),
        upstreamService.suppliers.list({ page: 1, pageSize: 200 }),
        upstreamService.accountGroups.list({ page: 1, pageSize: 200 }),
      ]);
      const memberPages = await Promise.all(groupPage.items.map((group) => upstreamService.accountGroups.listMembers(group.id)));
      const nextMemberships: Record<string, string[]> = {};
      groupPage.items.forEach((group, index) => {
        nextMemberships[group.id] = memberPages[index].map((member) => member.accountId);
      });
      setGroups(groupPage.items);
      setMemberships(nextMemberships);
      setItems(accountPage.items);
      setPageInfo(accountPage.pageInfo ?? null);
      setSuppliers(supplierPage.items);
      setSelectedKey((current) => current === null || current === UNGROUPED_KEY || groupPage.items.some((group) => group.id === current) ? current : null);
      setSelected((current) => current ? accountPage.items.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, pageSize, t]);

  useEffect(() => { void load(); }, [load]);

  const totalAccountCount = Number(pageInfo?.totalItems ?? items.length);
  const { visibleItems, ungroupedCount } = useMemo(() => {
    const groupedIds = new Set(Object.values(memberships).flat());
    // 计数针对当前服务端页（账号列表按页加载）；跨页统计需要服务端查询。
    const ungroupedCount = items.filter((item) => !groupedIds.has(item.id)).length;
    let visibleItems: UpstreamAccount[];
    if (selectedKey === null) {
      visibleItems = items;
    } else if (selectedKey === UNGROUPED_KEY) {
      visibleItems = items.filter((item) => !groupedIds.has(item.id));
    } else {
      const memberIds = new Set(memberships[selectedKey] ?? []);
      visibleItems = items.filter((item) => memberIds.has(item.id));
    }
    return { visibleItems, ungroupedCount };
  }, [items, memberships, selectedKey]);

  const filteredGroups = useMemo(() => {
    let next = typeFilter === 'all' ? groups : groups.filter((group) => group.groupType === typeFilter);
    if (hasMultiplierFilter(multiplierRange)) next = next.filter((group) => matchesMultiplierRange(group, multiplierRange));
    if (tagFilter.length > 0) next = next.filter((group) => matchesTagFilter(group, tagFilter));
    return next;
  }, [groups, typeFilter, multiplierRange, tagFilter]);

  const groupListFiltered = typeFilter !== 'all' || hasMultiplierFilter(multiplierRange) || tagFilter.length > 0;

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

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accounts.delete(deleteTarget);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
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

  return (
    <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <Layers3 className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.upstream.account.groups.title')}</h3>
        </header>
        <div className="border-b border-slate-200 px-4 py-2 dark:border-white/10">
          <GroupTypeFilter value={typeFilter} onChange={changeTypeFilter} />
          <TagFilter value={tagFilter} onChange={setTagFilter} className="mt-2" />
          <MultiplierRangeFilter value={multiplierRange} onChange={setMultiplierRange} className="mt-2" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button type="button" className={groupEntryClass(selectedKey === null)} onClick={() => setSelectedKey(null)}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t('admin.upstream.account.groups.all')}</span></span>
            <span className="shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: totalAccountCount })}</span>
          </button>
          <button type="button" className={groupEntryClass(selectedKey === UNGROUPED_KEY)} onClick={() => setSelectedKey(UNGROUPED_KEY)}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t('admin.upstream.account.groups.ungrouped')}</span></span>
            <span className="shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: ungroupedCount })}</span>
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
              <span className="shrink-0 text-xs text-slate-400">{t('admin.upstream.account.groups.accountCount', { count: memberships[group.id]?.length ?? 0 })}</span>
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
          <button type="button" className="shrink-0 text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400" onClick={() => setSelectedKey(null)}>{t('admin.upstream.account.groups.title')}</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {selectedKey === null ? (
            <span className="truncate font-medium text-slate-900 dark:text-white">{t('admin.upstream.account.groups.all')}</span>
          ) : selectedKey === UNGROUPED_KEY ? (
            <span className="truncate font-medium text-slate-900 dark:text-white">{t('admin.upstream.account.groups.ungrouped')}</span>
          ) : selectedGroup ? (
            <>
              <button type="button" className="shrink-0 text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400" onClick={() => { setTypeFilter(selectedGroup.groupType); setSelectedKey(null); }}>{t(`admin.upstream.accountGroup.groupType.${selectedGroup.groupType}`)}</button>
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
              {visibleItems.length === 0 ? <TableState loading={loading} empty={emptyText} colSpan={7} /> : visibleItems.map((account) => (
              <tr key={account.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(account)}><span className="block font-semibold text-slate-900 dark:text-white">{account.accountName}</span><span className="block font-mono text-xs text-slate-500">{account.accountCode}</span></button></td>
                <td className="px-4 py-3"><span className="font-medium">{supplierName(account.supplierId)}</span><span className="block text-xs text-slate-500">{account.supplierCode}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-xs">{account.authMethodCode}</span></td>
                <td className="px-4 py-3 font-mono">{formatDecimalDisplay(account.contractCostMultiplier)}</td>
                <td className="px-4 py-3"><span>{formatDecimalDisplay(account.quotaUsed, '0')} / {formatDecimalDisplay(account.quotaLimit)}</span><span className="block text-xs text-slate-500">{t('admin.upstream.account.table.rpm', { value: account.rpmLimit ?? '-' })}</span></td>
                <td className="px-4 py-3"><StatusBadge status={account.status} healthy={account.healthStatus} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">{account.status === 1 ? <button type="button" className={dangerButtonClass} onClick={() => void toggleAccountStatus(account)} title={t('admin.upstream.account.actions.disable')}><PowerOff className="h-4 w-4" /></button> : <button type="button" className={secondaryButtonClass} onClick={() => void toggleAccountStatus(account)} title={t('admin.upstream.account.actions.enable')}><Power className="h-4 w-4" /></button>}<button type="button" className={secondaryButtonClass} onClick={() => setSelected(account)} title={t('admin.upstream.account.actions.credentials')}><Settings2 className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(account)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(account)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
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
        {deleteTarget ? <ConfirmDialog title={t('admin.upstream.account.delete.title')} description={t('admin.upstream.account.delete.description', { name: deleteTarget.accountName })} confirmLabel={t('common.actions.delete')} tone="danger" isBusy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteAccount()} /> : null}
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
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [groupMissing, setGroupMissing] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    void Promise.all([
      upstreamService.suppliers.listAuthMethods(supplierId),
      upstreamService.suppliers.listEndpoints(supplierId),
    ]).then(([nextMethods, nextEndpoints]) => {
      setAuthMethods(nextMethods);
      setEndpoints(nextEndpoints);
      if (!account) {
        // 创建模式默认选中 APIKEY 认证方式（无则取首个）
        setAuthMethodCode((current) => current || (nextMethods.find((method) => method.authType === 'api_key')?.authMethodCode ?? nextMethods[0]?.authMethodCode ?? ''));
      }
    });
  }, [supplierId, account]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 新建账号必须归属某个账号分组
    if (!account && !groupId) {
      setGroupMissing(true);
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
              value={supplierId}
              onValueChange={(value) => setSupplierId(value)}
              options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.displayName, keywords: [supplier.supplierCode] }))}
              placeholder={t('admin.upstream.account.form.selectSupplier')}
              searchPlaceholder={t('admin.upstream.account.form.supplierSearch')}
              emptyText={t('admin.upstream.account.form.supplierEmpty')}
            />
          </RowField>
          <RowField label={t('admin.upstream.account.form.preferredBaseUrl')}><select name="preferredEndpointId" className={selectClass} defaultValue={account?.preferredEndpointId ?? ''}><option value="">{t('admin.upstream.account.form.automatic')}</option>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.endpointName} ({endpoint.baseUrl})</option>)}</select></RowField>
          <RowField label={t('admin.upstream.account.form.authMethod')} required><select name="authMethodCode" className={selectClass} value={authMethodCode} onChange={(event) => setAuthMethodCode(event.currentTarget.value)} required><option value="">{t('admin.upstream.account.form.selectMethod')}</option>{authMethods.map((method) => <option key={method.id} value={method.authMethodCode}>{method.authMethodName}</option>)}</select></RowField>
          {showApiKeyInput ? <RowField label={t('admin.upstream.account.form.apiKey')} required={!account}><div className="flex items-center gap-2"><input name="apiKey" type="password" autoComplete="new-password" className={inputClass} value={apiKeyInput} onChange={(event) => setApiKeyInput(event.currentTarget.value)} placeholder={account ? t('admin.upstream.account.form.apiKeyRotatePlaceholder') : t('admin.upstream.account.form.apiKeyPlaceholder')} required={!account} /></div></RowField> : null}
          {!account ? <RowField label={t('admin.upstream.account.form.accountGroup')} required>
            <div className="min-w-0">
              <SdkworkSearchableSelect
                value={groupId}
                onValueChange={(value) => { setGroupId(value); setGroupMissing(false); }}
                options={groups.map((group) => ({ value: group.id, label: resolveGroupDisplayName(group, i18n.language), keywords: [group.groupCode, ...(group.tags ?? [])] }))}
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
      {createOpen ? <Modal title={t('admin.upstream.account.credentials.createTitle')} busy={busy} submitLabel={t('admin.upstream.account.credentials.store')} onSubmit={createCredential} onClose={() => setCreateOpen(false)}><div className="grid gap-4"><Field label={t('admin.upstream.account.credentials.name')} required><input name="credentialName" className={inputClass} required /></Field><Field label={t('admin.upstream.account.credentials.secret')} required hint={t('admin.upstream.account.credentials.secretHint')}><input name="secret" type="password" autoComplete="new-password" className={inputClass} required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t('admin.upstream.common.fields.priority')}><input name="priority" type="number" min="0" className={inputClass} defaultValue="100" /></Field><Field label={t('admin.upstream.account.credentials.expiresAt')}><input name="expiresAt" type="datetime-local" className={inputClass} /></Field></div></div></Modal> : null}
    </SidePanel>
  );
}

function createAccountInput(form: FormData, t: TranslationFunction): CreateUpstreamAccountRequest {
  const apiKey = optional(form, 'apiKey');
  return {
    accountName: required(form, 'accountName', t('admin.upstream.account.form.accountName'), t),
    supplierId: required(form, 'supplierId', t('admin.upstream.account.form.supplier'), t),
    authMethodCode: required(form, 'authMethodCode', t('admin.upstream.account.form.authMethod'), t),
    preferredEndpointId: optional(form, 'preferredEndpointId'),
    contractCostMultiplier: required(form, 'contractCostMultiplier', t('admin.upstream.account.form.contractCostMultiplier'), t),
    quotaLimit: optional(form, 'quotaLimit'),
    rpmLimit: optional(form, 'rpmLimit'),
    timeoutMs: numeric(form, 'timeoutMs', 120000, t('admin.upstream.account.form.timeoutMs'), t),
    status: numeric(form, 'status', 1),
    ...(apiKey ? { apiKey } : {}),
  };
}

function updateAccountInput(form: FormData, t: TranslationFunction): UpdateUpstreamAccountRequest {
  return {
    accountName: required(form, 'accountName', t('admin.upstream.account.form.accountName'), t),
    supplierId: required(form, 'supplierId', t('admin.upstream.account.form.supplier'), t),
    authMethodCode: required(form, 'authMethodCode', t('admin.upstream.account.form.authMethod'), t),
    preferredEndpointId: optional(form, 'preferredEndpointId'),
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
