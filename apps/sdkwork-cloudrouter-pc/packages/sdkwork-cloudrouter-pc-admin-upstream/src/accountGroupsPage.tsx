import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, Edit3, Plus, RefreshCw, ShieldOff, Star, Trash2 } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { formatDecimalDisplay } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountGroupRequest,
  UpstreamAccountGroup,
  UpstreamAccountGroupModelListEntry,
  UpstreamResourceCatalogResponse,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
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
  ModelAccessListEditor,
  MultiplierRangeFilter,
  type MultiplierRangeValue,
  normalizeModelList,
  primaryButtonClass,
  resolveGroupDisplayName,
  SearchBox,
  secondaryButtonClass,
  selectClass,
  StatusBadge,
  SUPPORTED_GROUP_TAGS,
  TableState,
  TagBadge,
  TagFilter,
  textAreaClass,
  UpstreamPageShell,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

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
  const [totalCount, setTotalCount] = useState(0);
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
  const [blacklistTarget, setBlacklistTarget] = useState<UpstreamAccountGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamAccountGroup | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<UpstreamAccountGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const groupPage = await upstreamService.accountGroups.list({ page: 1, pageSize: 200, q: appliedQuery || undefined });
      setItems(groupPage.items);
      setTotalCount(Number(groupPage.pageInfo?.totalItems ?? groupPage.items.length));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
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
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
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
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const setDefaultGroup = async () => {
    if (!defaultTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accountGroups.update(defaultTarget, { isDefault: true });
      setDefaultTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
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
                <td className="px-4 py-3"><span className="flex items-center gap-2"><span className="block font-semibold text-slate-900 dark:text-white">{resolveGroupDisplayName(group, i18n.language)}</span>{group.isDefault ? <span className="rounded-full bg-lobster-50 px-2 py-0.5 text-xs font-semibold text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">{t('admin.upstream.accountGroup.table.default')}</span> : null}</span><span className="block font-mono text-xs text-slate-500">{group.groupCode}</span></td>
                <td className="px-4 py-3"><div className="flex max-w-44 flex-wrap gap-1">{group.tags?.map((tag) => <TagBadge key={tag} tag={tag} small />)}</div></td>
                <td className="px-4 py-3">{labelStrategy(group.routingStrategy, t)}</td><td className="px-4 py-3">{labelFallback(group.fallbackMode, t)}</td><td className="px-4 py-3 font-mono">×{formatDecimalDisplay(group.costMultiplier)}</td><td className="px-4 py-3 font-mono">×{formatDecimalDisplay(group.saleMultiplier)}</td><td className="px-4 py-3"><StatusBadge status={group.status} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">{!group.isDefault ? <button type="button" className={secondaryButtonClass} onClick={() => setDefaultTarget(group)} title={t('admin.upstream.accountGroup.actions.setDefault')}><Star className="h-4 w-4" /></button> : null}<button type="button" className={dangerButtonClass} onClick={() => setBlacklistTarget(group)} title={t('admin.upstream.accountGroup.actions.modelBlacklist')}><ShieldOff className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setCopying(group)} title={t('admin.upstream.accountGroup.actions.copy')}><Copy className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(group)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(group)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalCount > items.length ? (
          <p className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
            {t('admin.upstream.common.truncated', 'Showing {{shown}} of {{total}} account groups; refine the search to reach the rest.', { shown: items.length, total: totalCount })}
          </p>
        ) : null}
      </AdminTableShell>
      {editing !== undefined ? <AccountGroupModal group={editing} busy={busy} onSubmit={submitGroup} onClose={() => setEditing(undefined)} /> : null}
      {copying ? <AccountGroupModal group={copying} copying busy={busy} onSubmit={submitGroup} onClose={() => setCopying(null)} /> : null}
      {blacklistTarget ? <GroupModelBlacklistModal group={blacklistTarget} onSaved={(group) => setItems((current) => current.map((item) => item.id === group.id ? group : item))} onClose={() => setBlacklistTarget(null)} /> : null}
      {deleteTarget ? <ConfirmDialog title={t('admin.upstream.accountGroup.delete.title')} description={t('admin.upstream.accountGroup.delete.description', { name: resolveGroupDisplayName(deleteTarget, i18n.language) })} confirmLabel={t('common.actions.delete')} tone="danger" isBusy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteGroup()} /> : null}
      {defaultTarget ? <ConfirmDialog title={t('admin.upstream.accountGroup.setDefault.title')} description={t('admin.upstream.accountGroup.setDefault.description', { name: resolveGroupDisplayName(defaultTarget, i18n.language) })} confirmLabel={t('admin.upstream.accountGroup.actions.setDefault')} isBusy={busy} onCancel={() => setDefaultTarget(null)} onConfirm={() => void setDefaultGroup()} /> : null}
    </div>
  );
}

function AccountGroupModal({ group, copying, busy, onSubmit, onClose }: { group: UpstreamAccountGroup | null; copying?: boolean; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<string[]>(group?.tags ?? []);
  // 模型黑白名单：创建/编辑/复制时可直接管理（结构 {vendorCode, models}，随主请求提交）
  const [modelBlacklist, setModelBlacklist] = useState<UpstreamAccountGroupModelListEntry[]>(() => group?.modelBlacklist ?? []);
  const [modelWhitelist, setModelWhitelist] = useState<UpstreamAccountGroupModelListEntry[]>(() => group?.modelWhitelist ?? []);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void upstreamService.fetchResourceCatalog()
      .then((value) => {
        if (!cancelled && value && Array.isArray(value.resources)) setCatalog(value);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // 黑白名单可选的 vendor 列表（含已配置但目录中已下线的 vendor）
  const availableVendors = useMemo(() => {
    const labels = new Map<string, string>();
    for (const resource of catalog?.resources.filter((entry) => entry.resourceType === 'vendor') ?? []) {
      if (resource.vendorCode) labels.set(resource.vendorCode, `${resource.displayName} (${resource.vendorCode})`);
    }
    for (const entry of [...modelBlacklist, ...modelWhitelist]) {
      if (entry.vendorCode && !labels.has(entry.vendorCode)) labels.set(entry.vendorCode, entry.vendorCode);
    }
    return [...labels.entries()].map(([vendorCode, label]) => ({ vendorCode, label }));
  }, [catalog, modelBlacklist, modelWhitelist]);

  return (
    <Modal title={group ? (copying ? t('admin.upstream.accountGroup.form.copyTitle') : t('admin.upstream.accountGroup.form.editTitle')) : t('admin.upstream.accountGroup.form.createTitle')} size="xl" fillHeight maxHeightClass="max-h-[80vh]" busy={busy} submitLabel={group ? (copying ? t('admin.upstream.accountGroup.form.copyAction') : t('common.actions.saveChanges')) : t('admin.upstream.accountGroup.form.createAction')} onSubmit={onSubmit} onClose={onClose}>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div className="grid min-w-0 content-start gap-4 overflow-y-auto p-5 sm:grid-cols-2">
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
                <button key={tag} type="button" className={`rounded-full transition ${selectedTags.includes(tag) ? 'ring-2 ring-lobster-500/60' : 'opacity-55 hover:opacity-100'}`} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}><TagBadge tag={tag} small /></button>
              ))}
              {selectedTags.length > 0 ? (
                <button type="button" className="ml-1 text-xs font-medium text-lobster-600 hover:underline dark:text-lobster-400" onClick={() => setSelectedTags([])}>{t('common.actions.clear')}</button>
              ) : null}
            </div>
          </Field></div>
          <div className="sm:col-span-2"><Field label={t('admin.upstream.common.fields.description')}><textarea name="description" className={textAreaClass} defaultValue={group?.description ?? ''} /></Field></div>
        </div>
        <div className="min-w-0 overflow-y-auto border-t border-slate-200 p-5 lg:border-l lg:border-t-0 dark:border-white/10">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.accountGroup.access.title')}</h3>
          <div className="grid gap-3">
            <input type="hidden" name="modelBlacklist" value={JSON.stringify(normalizeModelList(modelBlacklist))} />
            <input type="hidden" name="modelWhitelist" value={JSON.stringify(normalizeModelList(modelWhitelist))} />
            <ModelAccessListEditor
              title={t('admin.upstream.accountGroup.access.blacklistTitle')}
              hint={t('admin.upstream.accountGroup.access.blacklistHint')}
              entries={modelBlacklist}
              vendors={availableVendors}
              danger
              keyPrefix="admin.upstream.accountGroup.access"
              onEntriesChange={setModelBlacklist}
              t={t}
            />
            <ModelAccessListEditor
              title={t('admin.upstream.accountGroup.access.whitelistTitle')}
              hint={t('admin.upstream.accountGroup.access.whitelistHint')}
              entries={modelWhitelist}
              vendors={availableVendors}
              danger={false}
              keyPrefix="admin.upstream.accountGroup.access"
              onEntriesChange={setModelWhitelist}
              t={t}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GroupModelBlacklistModal({ group, onSaved, onClose }: { group: UpstreamAccountGroup; onSaved: (group: UpstreamAccountGroup) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  // 模型黑名单管理：配置 vendor + 对应模型黑名单（结构 {vendorCode, models}）
  const [entries, setEntries] = useState<UpstreamAccountGroupModelListEntry[]>(() => group.modelBlacklist ?? []);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void upstreamService.fetchResourceCatalog()
      .then((value) => {
        if (!cancelled && value && Array.isArray(value.resources)) setCatalog(value);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // 可选的 vendor 列表（含已配置但目录中已下线的 vendor）
  const availableVendors = useMemo(() => {
    const labels = new Map<string, string>();
    for (const resource of catalog?.resources.filter((entry) => entry.resourceType === 'vendor') ?? []) {
      if (resource.vendorCode) labels.set(resource.vendorCode, `${resource.displayName} (${resource.vendorCode})`);
    }
    for (const entry of entries) {
      if (entry.vendorCode && !labels.has(entry.vendorCode)) labels.set(entry.vendorCode, entry.vendorCode);
    }
    return [...labels.entries()].map(([vendorCode, label]) => ({ vendorCode, label }));
  }, [catalog, entries]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await upstreamService.accountGroups.update(group, { modelBlacklist: normalizeModelList(entries) });
      onSaved(updated);
      onClose();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={t('admin.upstream.accountGroup.modelBlacklist.title')}
      description={resolveGroupDisplayName(group, i18n.language)}
      busy={saving}
      submitLabel={t('admin.upstream.accountGroup.modelBlacklist.save')}
      onSubmit={save}
      onClose={onClose}
    >
      <div className="grid gap-3">
        <InlineError message={error} />
        <ModelAccessListEditor
          title={t('admin.upstream.accountGroup.access.blacklistTitle')}
          hint={t('admin.upstream.accountGroup.access.blacklistHint')}
          entries={entries}
          vendors={availableVendors}
          danger
          keyPrefix="admin.upstream.accountGroup.access"
          onEntriesChange={setEntries}
          t={t}
        />
      </div>
    </Modal>
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
    modelBlacklist: parseModelEntries(form, 'modelBlacklist'),
    modelWhitelist: parseModelEntries(form, 'modelWhitelist'),
  };
}

function parseModelEntries(form: FormData, key: string): CreateUpstreamAccountGroupRequest['modelBlacklist'] {
  const raw = String(form.get(key) ?? '[]').trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is { vendorCode: string; models: string[] } =>
      item !== null && typeof item === 'object'
      && typeof (item as { vendorCode?: unknown }).vendorCode === 'string'
      && Array.isArray((item as { models?: unknown }).models));
  } catch {
    return null;
  }
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
