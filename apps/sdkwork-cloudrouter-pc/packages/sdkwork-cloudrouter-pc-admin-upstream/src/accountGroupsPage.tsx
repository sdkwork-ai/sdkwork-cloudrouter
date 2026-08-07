import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, Edit3, Plus, RefreshCw, Route, Settings2, Trash2 } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { formatDecimalDisplay } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountGroupRequest,
  UpstreamAccount,
  UpstreamAccountGroup,
  UpstreamAccountGroupMemberInput,
  UpstreamAccountGroupRouteExplanation,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlementInput,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { ResourcePicker, toEntitlements, toSelection } from './resourcePicker';
import { upstreamService } from './upstreamService';
import {
  dangerButtonClass,
  EMPTY_MULTIPLIER_RANGE,
  errorMessage,
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
  SUPPORTED_GROUP_TAGS,
  TableState,
  TagBadge,
  TagFilter,
  textAreaClass,
  UpstreamPageShell,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const emptyMember = (accountId = ''): UpstreamAccountGroupMemberInput => ({ accountId, enabled: true, priority: 100, routingWeight: 100, status: 1 });
const emptyDenyResource = (): UpstreamResourceEntitlementInput => ({ resourceCode: '', resourceGroupCode: '', grantType: 'deny', priority: 100, status: 1 });

export function UpstreamAccountGroupAdmin() {
  return (
    <UpstreamPageShell>
      <AccountGroupAdminPanel />
    </UpstreamPageShell>
  );
}

export function AccountGroupAdminPanel() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<UpstreamAccountGroup[]>([]);
  const [accounts, setAccounts] = useState<UpstreamAccount[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<GroupTypeFilterValue>('all');
  const [multiplierRange, setMultiplierRange] = useState<MultiplierRangeValue>(EMPTY_MULTIPLIER_RANGE);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamAccountGroup | null | undefined>(undefined);
  const [copying, setCopying] = useState<UpstreamAccountGroup | null>(null);
  const [selected, setSelected] = useState<UpstreamAccountGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamAccountGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupPage, accountPage] = await Promise.all([
        upstreamService.accountGroups.list({ page: 1, pageSize: 200, q: appliedQuery || undefined }),
        upstreamService.accounts.list({ page: 1, pageSize: 200 }),
      ]);
      setItems(groupPage.items);
      setAccounts(accountPage.items);
      setSelected((current) => current ? groupPage.items.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, t]);

  useEffect(() => { void load(); }, [load]);

  const submitGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input = groupInput(new FormData(event.currentTarget), t);
      if (editing) {
        await upstreamService.accountGroups.update(editing, input);
        setEditing(undefined);
      } else {
        await upstreamService.accountGroups.create(input);
        setCopying(null);
      }
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const deleteGroup = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accountGroups.delete(deleteTarget);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const visibleItems = useMemo(() => {
    let next = typeFilter === 'all' ? items : items.filter((group) => group.groupType === typeFilter);
    if (hasMultiplierFilter(multiplierRange)) next = next.filter((group) => matchesMultiplierRange(group, multiplierRange));
    if (tagFilter.length > 0) next = next.filter((group) => matchesTagFilter(group, tagFilter));
    return next;
  }, [items, typeFilter, multiplierRange, tagFilter]);

  const listFiltered = typeFilter !== 'all' || hasMultiplierFilter(multiplierRange) || tagFilter.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} placeholder={t('admin.upstream.accountGroup.search.placeholder')} onChange={setQuery} onSubmit={setAppliedQuery} />
        <div className="flex gap-2"><button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('common.actions.refresh')}</button><button type="button" className={primaryButtonClass} onClick={() => setEditing(null)}><Plus className="h-4 w-4" />{t('admin.upstream.accountGroup.actions.new')}</button></div>
      </div>
      <GroupTypeFilter value={typeFilter} onChange={setTypeFilter} />
      <TagFilter value={tagFilter} onChange={setTagFilter} />
      <MultiplierRangeFilter value={multiplierRange} onChange={setMultiplierRange} />
      <InlineError message={error} />
      <AdminTableShell>
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400"><tr><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.group')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.tags')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.routingStrategy')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.fallback')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.costMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.saleMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.status')}</th><th className="px-4 py-3 text-right">{t('admin.upstream.accountGroup.table.actions')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {visibleItems.length === 0 ? <TableState loading={loading} empty={t(listFiltered ? 'admin.upstream.accountGroup.filter.empty' : 'admin.upstream.accountGroup.empty')} colSpan={8} /> : visibleItems.map((group) => (
              <tr key={group.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(group)}><span className="block font-semibold text-slate-900 dark:text-white">{resolveGroupDisplayName(group, i18n.language)}</span><span className="block font-mono text-xs text-slate-500">{group.groupCode}</span></button></td>
                <td className="px-4 py-3"><div className="flex max-w-44 flex-wrap gap-1">{group.tags?.map((tag) => <TagBadge key={tag} tag={tag} small />)}</div></td>
                <td className="px-4 py-3">{labelStrategy(group.routingStrategy, t)}</td><td className="px-4 py-3">{labelFallback(group.fallbackMode, t)}</td><td className="px-4 py-3 font-mono">{formatDecimalDisplay(group.costMultiplier)}</td><td className="px-4 py-3 font-mono">{formatDecimalDisplay(group.saleMultiplier)}</td><td className="px-4 py-3"><StatusBadge status={group.status} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" className={secondaryButtonClass} onClick={() => setSelected(group)} title={t('admin.upstream.common.actions.configure')}><Settings2 className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setCopying(group)} title={t('admin.upstream.accountGroup.actions.copy')}><Copy className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(group)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(group)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
      {editing !== undefined ? <AccountGroupModal group={editing} busy={busy} onSubmit={submitGroup} onClose={() => setEditing(undefined)} /> : null}
      {copying ? <AccountGroupModal group={copying} copying busy={busy} onSubmit={submitGroup} onClose={() => setCopying(null)} /> : null}
      {selected ? <AccountGroupConfiguration group={selected} accounts={accounts} onChanged={(group) => { setSelected(group); setItems((current) => current.map((item) => item.id === group.id ? group : item)); }} onClose={() => setSelected(null)} /> : null}
      {deleteTarget ? <ConfirmDialog title={t('admin.upstream.accountGroup.delete.title')} description={t('admin.upstream.accountGroup.delete.description', { name: resolveGroupDisplayName(deleteTarget, i18n.language) })} confirmLabel={t('common.actions.delete')} tone="danger" isBusy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteGroup()} /> : null}
    </div>
  );
}

function AccountGroupModal({ group, copying, busy, onSubmit, onClose }: { group: UpstreamAccountGroup | null; copying?: boolean; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<string[]>(group?.tags ?? []);
  return (
    <Modal title={group ? (copying ? t('admin.upstream.accountGroup.form.copyTitle') : t('admin.upstream.accountGroup.form.editTitle')) : t('admin.upstream.accountGroup.form.createTitle')} busy={busy} submitLabel={group ? (copying ? t('admin.upstream.accountGroup.form.copyAction') : t('common.actions.saveChanges')) : t('admin.upstream.accountGroup.form.createAction')} onSubmit={onSubmit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        {group && !copying ? <Field label={t('admin.upstream.accountGroup.form.groupCode')} required><input name="groupCode" className={inputClass} defaultValue={group.groupCode} disabled required /></Field> : null}
        <Field label={t('admin.upstream.accountGroup.form.groupName')} required><input name="groupName" className={inputClass} defaultValue={group ? (copying ? `${resolveGroupDisplayName(group, i18n.language)}${t('admin.upstream.accountGroup.form.copyNameSuffix')}` : resolveGroupDisplayName(group, i18n.language)) : ''} required /></Field>
        <Field label={t('admin.upstream.accountGroup.form.groupType')}><select name="groupType" className={selectClass} defaultValue={group?.groupType ?? 'mixed'}><option value="mixed">{t('admin.upstream.accountGroup.groupType.mixed')}</option><option value="llm">{t('admin.upstream.accountGroup.groupType.llm')}</option><option value="image">{t('admin.upstream.accountGroup.groupType.image')}</option><option value="video">{t('admin.upstream.accountGroup.groupType.video')}</option><option value="audio">{t('admin.upstream.accountGroup.groupType.audio')}</option><option value="music">{t('admin.upstream.accountGroup.groupType.music')}</option><option value="other">{t('admin.upstream.accountGroup.groupType.other')}</option></select></Field>
        <Field label={t('admin.upstream.common.fields.environment')}><select name="environment" className={selectClass} defaultValue={group?.environment ?? 1}><option value="1">{t('admin.upstream.common.environment.production')}</option><option value="2">{t('admin.upstream.common.environment.sandbox')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.routingStrategy')}><select name="routingStrategy" className={selectClass} defaultValue={group?.routingStrategy ?? 'weighted'}><option value="weighted">{t('admin.upstream.accountGroup.strategy.weighted')}</option><option value="round_robin">{t('admin.upstream.accountGroup.strategy.roundRobin')}</option><option value="least_latency">{t('admin.upstream.accountGroup.strategy.leastLatency')}</option><option value="least_cost">{t('admin.upstream.accountGroup.strategy.leastCost')}</option><option value="failover">{t('admin.upstream.accountGroup.strategy.failover')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.fallbackMode')}><select name="fallbackMode" className={selectClass} defaultValue={group?.fallbackMode ?? 'cross_supplier'}><option value="none">{t('admin.upstream.accountGroup.fallback.none')}</option><option value="sequential">{t('admin.upstream.accountGroup.fallback.sequential')}</option><option value="same_supplier">{t('admin.upstream.accountGroup.fallback.sameSupplier')}</option><option value="cross_supplier">{t('admin.upstream.accountGroup.fallback.crossSupplier')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.costMultiplier')} required><input name="costMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={formatDecimalDisplay(group?.costMultiplier, '1')} required /></Field>
        <Field label={t('admin.upstream.accountGroup.form.saleMultiplier')} required><input name="saleMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={formatDecimalDisplay(group?.saleMultiplier, '1')} required /></Field>
        <Field label={t('admin.upstream.common.fields.priority')}><input name="priority" type="number" min="0" className={inputClass} defaultValue={group?.priority ?? 100} /></Field>
        <Field label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={group?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></Field>
        <div className="sm:col-span-2"><Field label={t('admin.upstream.accountGroup.form.tags')}>
          <input type="hidden" name="tags" value={JSON.stringify(selectedTags)} />
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_GROUP_TAGS.map((tag) => (
              <button key={tag} type="button" className={`rounded-full transition ${selectedTags.includes(tag) ? 'ring-2 ring-indigo-500/60' : 'opacity-55 hover:opacity-100'}`} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}><TagBadge tag={tag} small /></button>
            ))}
            {selectedTags.length > 0 ? (
              <button type="button" className="ml-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setSelectedTags([])}>{t('common.actions.clear')}</button>
            ) : null}
          </div>
        </Field></div>
        <div className="sm:col-span-2"><Field label={t('admin.upstream.common.fields.description')}><textarea name="description" className={textAreaClass} defaultValue={group?.description ?? ''} /></Field></div>
      </div>
    </Modal>
  );
}

function AccountGroupConfiguration({ group, accounts, onChanged, onClose }: { group: UpstreamAccountGroup; accounts: UpstreamAccount[]; onChanged: (group: UpstreamAccountGroup) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [members, setMembers] = useState<UpstreamAccountGroupMemberInput[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<UpstreamAccountGroupRouteExplanation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMembers, nextResources, nextCatalog] = await Promise.all([
        upstreamService.accountGroups.listMembers(group.id),
        upstreamService.accountGroups.listResources(group.id),
        upstreamService.fetchResourceCatalog(),
      ]);
      setMembers(nextMembers.map(({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }) => ({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status })));
      setResources(nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status })));
      setCatalog(nextCatalog);
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [group.id, t]);

  useEffect(() => { void load(); }, [load]);

  const save = async (section: 'members' | 'resources') => {
    setBusySection(section);
    setError(null);
    try {
      if (section === 'members') await upstreamService.accountGroups.replaceMembers(group, { items: members });
      else await upstreamService.accountGroups.replaceResources(group, { items: resources });
      const refreshed = await upstreamService.accountGroups.retrieve(group.id);
      onChanged(refreshed);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusySection(null);
    }
  };

  const denyResources = resources.filter((resource) => resource.grantType === 'deny');
  const resourceSelection = toSelection(resources.filter((resource) => resource.grantType !== 'deny'));
  const setResourceSelection = (next: ReturnType<typeof toSelection>) => {
    setResources([...toEntitlements(next), ...denyResources]);
  };
  const removeResource = (index: number) => {
    setResources((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };
  const resourceLabel = (item: UpstreamResourceEntitlementInput) => {
    const code = item.resourceCode ?? item.resourceGroupCode ?? '';
    const resource = catalog?.resources.find((entry) => entry.resourceCode === code);
    const groupEntry = catalog?.resourceGroups.find((entry) => entry.groupCode === code);
    return resource?.displayName ?? groupEntry?.groupName ?? code;
  };

  const explain = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusySection('explain');
    setError(null);
    setExplanation(null);
    try {
      const form = new FormData(event.currentTarget);
      setExplanation(await upstreamService.accountGroups.explain(group.id, {
        apiKeyId: required(form, 'apiKeyId', t('admin.upstream.accountGroup.explain.apiKeyId'), t),
        resourceCode: required(form, 'resourceCode', t('admin.upstream.common.fields.resourceCode'), t),
        model: optional(form, 'model'),
        catalogKey: optional(form, 'catalogKey'),
        capability: optional(form, 'capability'),
        apiCode: optional(form, 'apiCode'),
      }));
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusySection(null);
    }
  };

  return (
    <SidePanel title={resolveGroupDisplayName(group, i18n.language)} subtitle={`${labelStrategy(group.routingStrategy, t)} / ${labelFallback(group.fallbackMode, t)}`} onClose={onClose}>
      <div className="grid gap-6">
        <InlineError message={error} />
        <Section title={t('admin.upstream.accountGroup.members.title')} action={<button type="button" className={secondaryButtonClass} disabled={accounts.length === 0} onClick={() => setMembers((current) => [...current, emptyMember(accounts.find((account) => !current.some((member) => member.accountId === account.id))?.id)])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-2">
            {members.map((member, index) => (
              <div key={`${member.accountId}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-[1fr_100px_100px_140px_40px]">
                <select aria-label={t('admin.upstream.accountGroup.members.account')} className={selectClass} value={member.accountId} onChange={(event) => setMembers(updateAt(members, index, { accountId: event.currentTarget.value }))}><option value="">{t('admin.upstream.accountGroup.members.selectAccount')}</option>{accounts.map((account) => <option key={account.id} value={account.id} disabled={members.some((item, itemIndex) => itemIndex !== index && item.accountId === account.id)}>{account.accountName} ({account.supplierCode})</option>)}</select>
                <input aria-label={t('admin.upstream.common.fields.priority')} title={t('admin.upstream.common.fields.priority')} type="number" min="0" className={inputClass} value={member.priority ?? 100} onChange={(event) => setMembers(updateAt(members, index, { priority: Number(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.common.fields.weight')} title={t('admin.upstream.common.fields.weight')} type="number" min="0" className={inputClass} value={member.routingWeight ?? 100} onChange={(event) => setMembers(updateAt(members, index, { routingWeight: Number(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.accountGroup.members.costOverride')} title={t('admin.upstream.accountGroup.members.costOverride')} type="number" min="0" step="0.000001" placeholder={t('admin.upstream.accountGroup.members.costOverridePlaceholder')} className={inputClass} value={formatDecimalDisplay(member.costMultiplierOverride, '')} onChange={(event) => setMembers(updateAt(members, index, { costMultiplierOverride: event.currentTarget.value.trim() || null }))} />
                <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setMembers(removeAt(members, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!loading && members.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.accountGroup.members.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null || members.some((member) => !member.accountId)} onClick={() => void save('members')}>{t('admin.upstream.accountGroup.members.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.accountGroup.resources.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setResourcePickerOpen((current) => !current)}><Plus className="h-4 w-4" />{t('admin.upstream.accountGroup.resources.add')}</button>}>
          <div className="grid gap-3">
            {resourcePickerOpen && catalog ? (
              <ResourcePicker resources={catalog.resources} resourceGroups={catalog.resourceGroups} selection={resourceSelection} onChange={setResourceSelection} />
            ) : null}
            {resources.length === 0 && !resourcePickerOpen ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.accountGroup.resources.empty')}</p> : null}
            <div className="flex flex-wrap gap-2">
              {resources.filter((resource) => resource.grantType !== 'deny').map((resource) => (
                <span key={`${resource.resourceCode ?? resource.resourceGroupCode}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 dark:border-white/10 dark:bg-white/5">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-700 dark:text-slate-200">{resourceLabel(resource)}</span>
                    <span className="block truncate font-mono text-[10px] text-slate-400">{resource.resourceCode ?? resource.resourceGroupCode}</span>
                  </span>
                  <button type="button" title={t('common.actions.delete')} className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" onClick={() => removeResource(resources.indexOf(resource))}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            {denyResources.length > 0 ? (
              <div className="grid gap-2 rounded-md border border-red-200 bg-red-50/40 p-3 dark:border-red-500/20 dark:bg-red-500/5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">{t('admin.upstream.accountGroup.resources.denyTitle')}</span>
                  <button type="button" className={secondaryButtonClass} onClick={() => setResources((current) => [...current, emptyDenyResource()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>
                </div>
                {denyResources.map((resource, index) => (
                  <div key={`deny-${resource.resourceCode}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_40px]">
                    <input aria-label={t('admin.upstream.common.fields.resourceCode')} placeholder={t('admin.upstream.common.fields.resourceCode')} className={inputClass} value={resource.resourceCode ?? ''} onChange={(event) => setResources(updateAt(resources, resources.indexOf(resource), { resourceCode: event.currentTarget.value.trim() || null }))} />
                    <input aria-label={t('admin.upstream.common.fields.resourceGroupCode')} placeholder={t('admin.upstream.common.fields.resourceGroupCode')} className={inputClass} value={resource.resourceGroupCode ?? ''} onChange={(event) => setResources(updateAt(resources, resources.indexOf(resource), { resourceGroupCode: event.currentTarget.value.trim() || null }))} />
                    <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setResources(removeAt(resources, resources.indexOf(resource)))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            ) : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('resources')}>{t('admin.upstream.accountGroup.resources.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.accountGroup.explain.title')}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={explain}>
            <Field label={t('admin.upstream.accountGroup.explain.apiKeyId')} required><input name="apiKeyId" className={inputClass} required /></Field><Field label={t('admin.upstream.common.fields.resourceCode')} required><input name="resourceCode" className={inputClass} required /></Field><Field label={t('admin.upstream.accountGroup.explain.model')}><input name="model" className={inputClass} /></Field><Field label={t('admin.upstream.accountGroup.explain.catalogKey')}><input name="catalogKey" className={inputClass} /></Field><Field label={t('admin.upstream.accountGroup.explain.capability')}><input name="capability" className={inputClass} placeholder="chat" /></Field><Field label={t('admin.upstream.accountGroup.explain.apiCode')}><input name="apiCode" className={inputClass} placeholder="chat.completions" /></Field>
            <button type="submit" className={`${primaryButtonClass} sm:col-span-2`} disabled={busySection !== null}><Route className="h-4 w-4" />{t('admin.upstream.accountGroup.explain.action')}</button>
          </form>
          {explanation ? <div className={`mt-3 rounded-md border p-3 text-sm ${explanation.ready ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'}`}><div className="font-semibold text-slate-900 dark:text-white">{explanation.ready ? t('admin.upstream.accountGroup.explain.ready') : t('admin.upstream.accountGroup.explain.blocked')} / {t('admin.upstream.accountGroup.explain.candidates', { count: explanation.candidateCount })}</div><div className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-300">{explanation.selectedCandidates.map((candidate, index) => <div key={`${candidate.accountId}-${index}`} className="font-mono">{t('admin.upstream.accountGroup.explain.candidate', { supplier: candidate.supplierCode, accountId: candidate.accountId, model: candidate.providerModel ?? '-' })}</div>)}{explanation.blockedReasons.map((issue, index) => <div key={`${issue.code}-${index}`} className="text-red-600 dark:text-red-300">{issue.code}: {issue.message}</div>)}</div></div> : null}
        </Section>
      </div>
    </SidePanel>
  );
}

function groupInput(form: FormData, t: TranslationFunction): CreateUpstreamAccountGroupRequest {
  const groupCode = optional(form, 'groupCode');
  return {
    ...(groupCode ? { groupCode } : {}),
    groupName: required(form, 'groupName', t('admin.upstream.accountGroup.form.groupName'), t),
    groupType: required(form, 'groupType', t('admin.upstream.accountGroup.form.groupType'), t) as CreateUpstreamAccountGroupRequest['groupType'],
    environment: numeric(form, 'environment', 1),
    routingStrategy: required(form, 'routingStrategy', t('admin.upstream.accountGroup.form.routingStrategy'), t) as CreateUpstreamAccountGroupRequest['routingStrategy'],
    fallbackMode: required(form, 'fallbackMode', t('admin.upstream.accountGroup.form.fallbackMode'), t) as CreateUpstreamAccountGroupRequest['fallbackMode'],
    costMultiplier: required(form, 'costMultiplier', t('admin.upstream.accountGroup.form.costMultiplier'), t),
    saleMultiplier: required(form, 'saleMultiplier', t('admin.upstream.accountGroup.form.saleMultiplier'), t),
    priority: numeric(form, 'priority', 100),
    status: numeric(form, 'status', 1),
    description: optional(form, 'description'),
    tags: parseTags(form),
  };
}

function parseTags(form: FormData): CreateUpstreamAccountGroupRequest['tags'] {
  const raw = String(form.get('tags') ?? '[]').trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') as CreateUpstreamAccountGroupRequest['tags'] : null;
  } catch {
    return null;
  }
}

function labelStrategy(value: UpstreamAccountGroup['routingStrategy'], t: TranslationFunction): string {
  const keys: Record<UpstreamAccountGroup['routingStrategy'], string> = {
    weighted: 'admin.upstream.accountGroup.strategy.weighted',
    round_robin: 'admin.upstream.accountGroup.strategy.roundRobin',
    least_latency: 'admin.upstream.accountGroup.strategy.leastLatency',
    least_cost: 'admin.upstream.accountGroup.strategy.leastCost',
    failover: 'admin.upstream.accountGroup.strategy.failover',
  };
  return t(keys[value]);
}

function labelFallback(value: UpstreamAccountGroup['fallbackMode'], t: TranslationFunction): string {
  const keys: Record<UpstreamAccountGroup['fallbackMode'], string> = {
    none: 'admin.upstream.accountGroup.fallback.none',
    sequential: 'admin.upstream.accountGroup.fallback.sequential',
    same_supplier: 'admin.upstream.accountGroup.fallback.sameSupplier',
    cross_supplier: 'admin.upstream.accountGroup.fallback.crossSupplier',
  };
  return t(keys[value]);
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
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
