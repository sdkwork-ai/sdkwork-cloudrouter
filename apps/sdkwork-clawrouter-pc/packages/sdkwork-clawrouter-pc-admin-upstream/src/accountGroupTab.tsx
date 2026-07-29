import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, Plus, RefreshCw, Route, Settings2, Trash2 } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountGroupRequest,
  UpstreamAccount,
  UpstreamAccountGroup,
  UpstreamAccountGroupMemberInput,
  UpstreamAccountGroupRouteExplanation,
  UpstreamResourceEntitlementInput,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import {
  dangerButtonClass,
  errorMessage,
  Field,
  InlineError,
  inputClass,
  Modal,
  primaryButtonClass,
  SearchBox,
  secondaryButtonClass,
  Section,
  selectClass,
  SidePanel,
  StatusBadge,
  TableState,
  textAreaClass,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const emptyMember = (accountId = ''): UpstreamAccountGroupMemberInput => ({ accountId, enabled: true, priority: 100, routingWeight: 100, status: 1 });
const emptyResource = (): UpstreamResourceEntitlementInput => ({ resourceCode: '', resourceGroupCode: '', grantType: 'allow', priority: 100, status: 1 });

export function AccountGroupTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpstreamAccountGroup[]>([]);
  const [accounts, setAccounts] = useState<UpstreamAccount[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamAccountGroup | null | undefined>(undefined);
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
      if (editing) await upstreamService.accountGroups.update(editing, input);
      else await upstreamService.accountGroups.create(input);
      setEditing(undefined);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} placeholder={t('admin.upstream.accountGroup.search.placeholder')} onChange={setQuery} onSubmit={() => setAppliedQuery(query.trim())} />
        <div className="flex gap-2"><button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('common.actions.refresh')}</button><button type="button" className={primaryButtonClass} onClick={() => setEditing(null)}><Plus className="h-4 w-4" />{t('admin.upstream.accountGroup.actions.new')}</button></div>
      </div>
      <InlineError message={error} />
      <AdminTableShell>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400"><tr><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.group')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.routingStrategy')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.fallback')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.costMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.saleMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.accountGroup.table.status')}</th><th className="px-4 py-3 text-right">{t('admin.upstream.accountGroup.table.actions')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.length === 0 ? <TableState loading={loading} empty={t('admin.upstream.accountGroup.empty')} colSpan={7} /> : items.map((group) => (
              <tr key={group.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(group)}><span className="block font-semibold text-slate-900 dark:text-white">{group.groupName}</span><span className="block font-mono text-xs text-slate-500">{group.groupCode}</span></button></td>
                <td className="px-4 py-3">{labelStrategy(group.routingStrategy, t)}</td><td className="px-4 py-3">{labelFallback(group.fallbackMode, t)}</td><td className="px-4 py-3 font-mono">{group.costMultiplier}</td><td className="px-4 py-3 font-mono">{group.saleMultiplier}</td><td className="px-4 py-3"><StatusBadge status={group.status} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" className={secondaryButtonClass} onClick={() => setSelected(group)} title={t('admin.upstream.common.actions.configure')}><Settings2 className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(group)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(group)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
      {editing !== undefined ? <AccountGroupModal group={editing} busy={busy} onSubmit={submitGroup} onClose={() => setEditing(undefined)} /> : null}
      {selected ? <AccountGroupConfiguration group={selected} accounts={accounts} onChanged={(group) => { setSelected(group); setItems((current) => current.map((item) => item.id === group.id ? group : item)); }} onClose={() => setSelected(null)} /> : null}
      {deleteTarget ? <ConfirmDialog title={t('admin.upstream.accountGroup.delete.title')} description={t('admin.upstream.accountGroup.delete.description', { name: deleteTarget.groupName })} confirmLabel={t('common.actions.delete')} tone="danger" isBusy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteGroup()} /> : null}
    </div>
  );
}

function AccountGroupModal({ group, busy, onSubmit, onClose }: { group: UpstreamAccountGroup | null; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal title={group ? t('admin.upstream.accountGroup.form.editTitle') : t('admin.upstream.accountGroup.form.createTitle')} busy={busy} submitLabel={group ? t('common.actions.saveChanges') : t('admin.upstream.accountGroup.form.createAction')} onSubmit={onSubmit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.upstream.accountGroup.form.groupCode')} required><input name="groupCode" className={inputClass} defaultValue={group?.groupCode} disabled={Boolean(group)} required /></Field>
        <Field label={t('admin.upstream.accountGroup.form.groupName')} required><input name="groupName" className={inputClass} defaultValue={group?.groupName} required /></Field>
        <Field label={t('admin.upstream.accountGroup.form.groupType')}><input name="groupType" className={inputClass} defaultValue={group?.groupType ?? 'standard'} /></Field>
        <Field label={t('admin.upstream.common.fields.environment')}><select name="environment" className={selectClass} defaultValue={group?.environment ?? 1}><option value="1">{t('admin.upstream.common.environment.production')}</option><option value="2">{t('admin.upstream.common.environment.sandbox')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.routingStrategy')}><select name="routingStrategy" className={selectClass} defaultValue={group?.routingStrategy ?? 'weighted'}><option value="weighted">{t('admin.upstream.accountGroup.strategy.weighted')}</option><option value="round_robin">{t('admin.upstream.accountGroup.strategy.roundRobin')}</option><option value="least_latency">{t('admin.upstream.accountGroup.strategy.leastLatency')}</option><option value="least_cost">{t('admin.upstream.accountGroup.strategy.leastCost')}</option><option value="failover">{t('admin.upstream.accountGroup.strategy.failover')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.fallbackMode')}><select name="fallbackMode" className={selectClass} defaultValue={group?.fallbackMode ?? 'cross_supplier'}><option value="none">{t('admin.upstream.accountGroup.fallback.none')}</option><option value="sequential">{t('admin.upstream.accountGroup.fallback.sequential')}</option><option value="same_supplier">{t('admin.upstream.accountGroup.fallback.sameSupplier')}</option><option value="cross_supplier">{t('admin.upstream.accountGroup.fallback.crossSupplier')}</option></select></Field>
        <Field label={t('admin.upstream.accountGroup.form.costMultiplier')} required><input name="costMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={group?.costMultiplier ?? '1'} required /></Field>
        <Field label={t('admin.upstream.accountGroup.form.saleMultiplier')} required><input name="saleMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={group?.saleMultiplier ?? '1'} required /></Field>
        <Field label={t('admin.upstream.common.fields.priority')}><input name="priority" type="number" min="0" className={inputClass} defaultValue={group?.priority ?? 100} /></Field>
        <Field label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={group?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></Field>
        <div className="sm:col-span-2"><Field label={t('admin.upstream.common.fields.description')}><textarea name="description" className={textAreaClass} defaultValue={group?.description ?? ''} /></Field></div>
      </div>
    </Modal>
  );
}

function AccountGroupConfiguration({ group, accounts, onChanged, onClose }: { group: UpstreamAccountGroup; accounts: UpstreamAccount[]; onChanged: (group: UpstreamAccountGroup) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<UpstreamAccountGroupMemberInput[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<UpstreamAccountGroupRouteExplanation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMembers, nextResources] = await Promise.all([
        upstreamService.accountGroups.listMembers(group.id),
        upstreamService.accountGroups.listResources(group.id),
      ]);
      setMembers(nextMembers.map(({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status }) => ({ accountId, costMultiplierOverride, enabled, priority, routingWeight, status })));
      setResources(nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status })));
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
    <SidePanel title={group.groupName} subtitle={`${labelStrategy(group.routingStrategy, t)} / ${labelFallback(group.fallbackMode, t)}`} onClose={onClose}>
      <div className="grid gap-6">
        <InlineError message={error} />
        <Section title={t('admin.upstream.accountGroup.members.title')} action={<button type="button" className={secondaryButtonClass} disabled={accounts.length === 0} onClick={() => setMembers((current) => [...current, emptyMember(accounts.find((account) => !current.some((member) => member.accountId === account.id))?.id)])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-2">
            {members.map((member, index) => (
              <div key={`${member.accountId}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-[1fr_100px_100px_140px_40px]">
                <select aria-label={t('admin.upstream.accountGroup.members.account')} className={selectClass} value={member.accountId} onChange={(event) => setMembers(updateAt(members, index, { accountId: event.currentTarget.value }))}><option value="">{t('admin.upstream.accountGroup.members.selectAccount')}</option>{accounts.map((account) => <option key={account.id} value={account.id} disabled={members.some((item, itemIndex) => itemIndex !== index && item.accountId === account.id)}>{account.accountName} ({account.supplierCode})</option>)}</select>
                <input aria-label={t('admin.upstream.common.fields.priority')} title={t('admin.upstream.common.fields.priority')} type="number" min="0" className={inputClass} value={member.priority ?? 100} onChange={(event) => setMembers(updateAt(members, index, { priority: Number(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.common.fields.weight')} title={t('admin.upstream.common.fields.weight')} type="number" min="0" className={inputClass} value={member.routingWeight ?? 100} onChange={(event) => setMembers(updateAt(members, index, { routingWeight: Number(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.accountGroup.members.costOverride')} title={t('admin.upstream.accountGroup.members.costOverride')} type="number" min="0" step="0.000001" placeholder={t('admin.upstream.accountGroup.members.costOverridePlaceholder')} className={inputClass} value={member.costMultiplierOverride ?? ''} onChange={(event) => setMembers(updateAt(members, index, { costMultiplierOverride: event.currentTarget.value.trim() || null }))} />
                <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setMembers(removeAt(members, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!loading && members.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.accountGroup.members.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null || members.some((member) => !member.accountId)} onClick={() => void save('members')}>{t('admin.upstream.accountGroup.members.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.accountGroup.resources.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setResources((current) => [...current, emptyResource()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-2">
            {resources.map((resource, index) => (
              <div key={`${resource.resourceCode}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-[1fr_1fr_120px_40px]">
                <input aria-label={t('admin.upstream.common.fields.resourceCode')} placeholder={t('admin.upstream.common.fields.resourceCode')} className={inputClass} value={resource.resourceCode ?? ''} onChange={(event) => setResources(updateAt(resources, index, { resourceCode: event.currentTarget.value.trim() || null }))} />
                <input aria-label={t('admin.upstream.common.fields.resourceGroupCode')} placeholder={t('admin.upstream.common.fields.resourceGroupCode')} className={inputClass} value={resource.resourceGroupCode ?? ''} onChange={(event) => setResources(updateAt(resources, index, { resourceGroupCode: event.currentTarget.value.trim() || null }))} />
                <select aria-label={t('admin.upstream.common.grant.label')} className={selectClass} value={resource.grantType ?? 'allow'} onChange={(event) => setResources(updateAt(resources, index, { grantType: event.currentTarget.value as 'allow' | 'deny' }))}><option value="allow">{t('admin.upstream.common.grant.allow')}</option><option value="deny">{t('admin.upstream.common.grant.deny')}</option></select>
                <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setResources(removeAt(resources, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!loading && resources.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.accountGroup.resources.empty')}</p> : null}
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
  return {
    groupCode: required(form, 'groupCode', t('admin.upstream.accountGroup.form.groupCode'), t),
    groupName: required(form, 'groupName', t('admin.upstream.accountGroup.form.groupName'), t),
    groupType: optional(form, 'groupType'),
    environment: numeric(form, 'environment', 1),
    routingStrategy: required(form, 'routingStrategy', t('admin.upstream.accountGroup.form.routingStrategy'), t) as CreateUpstreamAccountGroupRequest['routingStrategy'],
    fallbackMode: required(form, 'fallbackMode', t('admin.upstream.accountGroup.form.fallbackMode'), t) as CreateUpstreamAccountGroupRequest['fallbackMode'],
    costMultiplier: required(form, 'costMultiplier', t('admin.upstream.accountGroup.form.costMultiplier'), t),
    saleMultiplier: required(form, 'saleMultiplier', t('admin.upstream.accountGroup.form.saleMultiplier'), t),
    priority: numeric(form, 'priority', 100),
    status: numeric(form, 'status', 1),
    description: optional(form, 'description'),
  };
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
