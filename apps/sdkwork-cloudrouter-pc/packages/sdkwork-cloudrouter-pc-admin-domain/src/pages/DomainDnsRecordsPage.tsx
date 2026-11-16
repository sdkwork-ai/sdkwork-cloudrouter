import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AdminTableShell,
  ConfirmDialog,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainField,
  DomainFormDialog,
  DomainIconButton,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainSecondaryButton,
  DomainSectionIntro,
  DomainSelect,
  DomainStateRows,
  DomainStatusPill,
  DomainTableHead,
  DomainTextInput,
} from '../components/domainUi';
import { domainCenterService } from '../domainService';
import { dnsRecordOwner, formatDomainDateTime, formatDomainCount } from '../domainFormat';
import { dnsRecordStatusLabel, dnsRecordStatusTone, translateDomainLabel } from '../domainLabels';
import type {
  DomainCenterSectionId,
  DomainDnsRecord,
  DomainDnsRecordType,
} from '../domainTypes';
import { useDomainZones } from '../hooks/useDomainResources';
import {
  DOMAIN_DNS_RECORD_TYPES,
  toDnsRecordInput,
  validateDnsRecordForm,
  type DomainDnsRecordForm,
  type DomainFieldErrors,
} from '../domainValidation';

const EMPTY_RECORD_FORM: DomainDnsRecordForm = {
  recordType: 'A',
  host: '',
  recordValue: '',
  ttlSeconds: '',
  priority: '',
  recordLine: '',
};

type RecordTypeFilter = DomainDnsRecordType | 'ALL';

export function DomainDnsRecordsPage({
  initialZoneId,
  onNavigate,
}: {
  initialZoneId?: string;
  onNavigate: (section: DomainCenterSectionId, zoneId?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const zones = useDomainZones();
  const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId ?? '');
  const [records, setRecords] = useState<DomainDnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [typeFilter, setTypeFilter] = useState<RecordTypeFilter>('ALL');
  const [hostSearch, setHostSearch] = useState('');
  const [editorState, setEditorState] = useState<
    { mode: 'create' } | { mode: 'edit'; record: DomainDnsRecord } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainDnsRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  useEffect(() => {
    if (selectedZoneId || zones.status !== 'ready') {
      return;
    }
    const first = zones.data.find((zone) => zone.scope === 'USER') ?? zones.data[0];
    if (first) {
      setSelectedZoneId(first.id);
    }
  }, [selectedZoneId, zones.data, zones.status]);

  useEffect(() => {
    if (!selectedZoneId) {
      setRecords([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    domainCenterService
      .listDnsRecords(selectedZoneId, {
        ...(typeFilter !== 'ALL' ? { recordType: typeFilter } : {}),
        ...(hostSearch.trim() ? { host: hostSearch.trim() } : {}),
      })
      .then((page) => {
        if (active) {
          setRecords(page.items);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedZoneId, typeFilter, reloadToken]);

  const selectedZone = zones.zoneById.get(selectedZoneId);
  const rows = useMemo(() => {
    const keyword = hostSearch.trim().toLowerCase();
    if (keyword.length === 0) {
      return records;
    }
    return records.filter((record) => {
      const owner = dnsRecordOwner(record, selectedZone?.apexHostname ?? '');
      return owner.toLowerCase().includes(keyword) || record.recordValue.toLowerCase().includes(keyword);
    });
  }, [records, hostSearch, selectedZone]);

  const sync = async () => {
    if (!selectedZoneId) {
      return;
    }
    setSyncing(true);
    setActionError(null);
    setSyncSummary(null);
    try {
      const result = await domainCenterService.syncDnsRecords(selectedZoneId);
      setSyncSummary(
        t('admin.domainCenter.dns.syncResult', '{{count}} records read from {{provider}} at {{time}}', {
          count: Number(formatDomainCount(result.recordCount)),
          provider: result.dnsProvider,
          time: formatDomainDateTime(result.syncedAt, locale),
        }),
      );
      setReloadToken((token) => token + 1);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.dns.errors.sync', 'DNS records could not be synced')),
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggleStatus = async (record: DomainDnsRecord) => {
    setBusyId(record.id);
    setActionError(null);
    try {
      const updated = await domainCenterService.setDnsRecordStatus(
        selectedZoneId,
        record.id,
        record.recordStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED',
      );
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.dns.errors.status', 'Record status could not be changed')),
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteRecord = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await domainCenterService.deleteDnsRecord(selectedZoneId, deleteTarget.id);
      setRecords((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.dns.errors.delete', 'DNS record could not be deleted')),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <DomainSectionIntro
        title={t('admin.domainCenter.dns.title', 'DNS resolution')}
        description={t(
          'admin.domainCenter.dns.description',
          'Resolution records are published through the zone\'s pinned cloud account. The table is a provider-side snapshot: sync to read the current inventory, then create, edit, pause, or delete a record through the same account.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={() => setReloadToken((token) => token + 1)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainSecondaryButton onClick={() => void sync()} disabled={!selectedZoneId || syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.dns.actions.sync', 'Sync from provider')}
            </DomainSecondaryButton>
            <DomainPrimaryButton onClick={() => setEditorState({ mode: 'create' })} disabled={!selectedZoneId}>
              <Plus className="h-4 w-4" />
              {t('admin.domainCenter.dns.actions.create', 'Add record')}
            </DomainPrimaryButton>
          </>
        }
      />

      {actionError ? <DomainInlineNotice tone="danger" title={actionError} /> : null}
      {syncSummary ? <DomainInlineNotice tone="success" title={syncSummary} /> : null}

      <AdminTableShell
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
              <div className="md:w-64">
                <DomainSelect
                  value={selectedZoneId}
                  onChange={setSelectedZoneId}
                  options={
                    zones.data.length === 0
                      ? [{ value: '', label: t('admin.domainCenter.dns.noZone', 'No root domain') }]
                      : zones.data.map((zone) => ({ value: zone.id, label: zone.apexHostname }))
                  }
                />
              </div>
              <DomainSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'ALL', label: t('admin.domainCenter.dns.filter.allTypes', 'All record types') },
                  ...DOMAIN_DNS_RECORD_TYPES.map((type) => ({ value: type, label: type })),
                ]}
              />
              <div className="relative min-w-0 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={hostSearch}
                  onChange={(event) => setHostSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.dns.search', 'Filter by host or value')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedZone
                ? t('admin.domainCenter.dns.zoneHint', '{{count}} records · {{apex}}', {
                    count: rows.length,
                    apex: selectedZone.apexHostname,
                  })
                : null}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.recordName', 'Record'),
              t('admin.domainCenter.columns.recordType', 'Type'),
              t('admin.domainCenter.columns.recordValue', 'Value'),
              t('admin.domainCenter.columns.ttl', 'TTL'),
              t('admin.domainCenter.columns.priority', 'Priority'),
              t('admin.domainCenter.columns.status', 'Status'),
              t('admin.domainCenter.columns.dnsProvider', 'Provider'),
              t('admin.domainCenter.columns.syncedAt', 'Synced'),
              t('admin.domainCenter.columns.actions', 'Actions'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {zones.status === 'error' ? (
              <DomainStateRows
                colSpan={9}
                kind="error"
                title={t('admin.domainCenter.dns.zoneLoadError', 'Root domains could not be loaded')}
                description={resolveProblemMessage(zones.error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={zones.reload}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : loading ? (
              <DomainStateRows
                colSpan={9}
                kind="loading"
                title={t('admin.domainCenter.dns.loading', 'Loading resolution records...')}
              />
            ) : error ? (
              <DomainStateRows
                colSpan={9}
                kind="error"
                title={t('admin.domainCenter.dns.loadError', 'Resolution records could not be loaded')}
                description={resolveProblemMessage(error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={() => setReloadToken((token) => token + 1)}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : !selectedZoneId ? (
              <DomainStateRows
                colSpan={9}
                kind="empty"
                title={t('admin.domainCenter.dns.emptyNoZone', 'Register a root domain first')}
                description={t('admin.domainCenter.dns.emptyNoZoneDesc', 'DNS records always belong to a registered root domain.')}
                action={{
                  label: t('admin.domainCenter.actions.addZone', 'Register root domain'),
                  onClick: () => onNavigate('zones'),
                }}
              />
            ) : rows.length === 0 ? (
              <DomainStateRows
                colSpan={9}
                kind="empty"
                title={t('admin.domainCenter.dns.empty', 'No resolution record')}
                description={t(
                  'admin.domainCenter.dns.emptyDesc',
                  'Sync the provider inventory, or add the first record for this zone.',
                )}
                action={{ label: t('admin.domainCenter.dns.actions.create', 'Add record'), onClick: () => setEditorState({ mode: 'create' }) }}
              />
            ) : (
              rows.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                      {record.host}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {dnsRecordOwner(record, selectedZone?.apexHostname ?? '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DomainStatusPill label={record.recordType} tone="info" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[360px] truncate font-mono text-[12px]" title={record.recordValue}>
                      {record.recordValue}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{record.ttlSeconds ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{record.priority ?? '—'}</td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={translateDomainLabel(t, dnsRecordStatusLabel(record.recordStatus))}
                      tone={dnsRecordStatusTone(record.recordStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>{record.dnsProvider}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {record.providerAccountId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDomainDateTime(record.syncedAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <DomainIconButton
                        label={record.recordStatus === 'ENABLED'
                          ? t('admin.domainCenter.actions.pause', 'Pause')
                          : t('admin.domainCenter.actions.resume', 'Resume')}
                        disabled={busyId === record.id}
                        onClick={() => void toggleStatus(record)}
                      >
                        <Power className="h-4 w-4" />
                      </DomainIconButton>
                      <DomainIconButton
                        label={t('common.actions.edit', 'Edit')}
                        onClick={() => setEditorState({ mode: 'edit', record })}
                      >
                        <Pencil className="h-4 w-4" />
                      </DomainIconButton>
                      <DomainIconButton
                        label={t('common.actions.delete', 'Delete')}
                        tone="danger"
                        disabled={busyId === record.id}
                        onClick={() => setDeleteTarget(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </DomainIconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {editorState ? (
        <DnsRecordDialog
          zoneId={selectedZoneId}
          state={editorState}
          onClose={() => setEditorState(null)}
          onSaved={() => {
            setEditorState(null);
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.domainCenter.dns.delete.title', 'Delete DNS record')}
          description={t(
            'admin.domainCenter.dns.delete.description',
            'Delete {{type}} {{host}}? The record is removed from the provider through the zone\'s cloud account.',
            { type: deleteTarget.recordType, host: deleteTarget.host },
          )}
          confirmLabel={t('common.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busyId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => void deleteRecord()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function DnsRecordDialog({
  zoneId,
  state,
  onClose,
  onSaved,
}: {
  zoneId: string;
  state: { mode: 'create' } | { mode: 'edit'; record: DomainDnsRecord };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DomainDnsRecordForm>(() =>
    state.mode === 'edit'
      ? {
          recordType: state.record.recordType as DomainDnsRecordType,
          host: state.record.host,
          recordValue: state.record.recordValue,
          ttlSeconds: state.record.ttlSeconds === undefined ? '' : String(state.record.ttlSeconds),
          priority: state.record.priority === undefined ? '' : String(state.record.priority),
          recordLine: state.record.recordLine ?? '',
        }
      : EMPTY_RECORD_FORM,
  );
  const [errors, setErrors] = useState<DomainFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nextErrors = validateDnsRecordForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const input = toDnsRecordInput(form);
      if (state.mode === 'create') {
        await domainCenterService.createDnsRecord(zoneId, input);
      } else {
        await domainCenterService.updateDnsRecord(zoneId, state.record.id, input);
      }
      onSaved();
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.dns.errors.save', 'DNS record could not be saved')),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DomainFormDialog
      wide
      busy={busy}
      onClose={onClose}
      title={state.mode === 'create'
        ? t('admin.domainCenter.dns.dialog.createTitle', 'Add DNS record')
        : t('admin.domainCenter.dns.dialog.editTitle', 'Edit DNS record')}
      description={t(
        'admin.domainCenter.dns.dialog.description',
        'The record is written to the zone\'s provider through its pinned cloud account. Verification and ACME TXT records are managed by the platform and should only be edited from their own surfaces.',
      )}
      footer={
        <>
          <DomainSecondaryButton onClick={onClose} disabled={busy}>
            {t('common.actions.cancel', 'Cancel')}
          </DomainSecondaryButton>
          <DomainPrimaryButton onClick={() => void submit()} disabled={busy}>
            {busy ? t('common.actions.saving', 'Saving...') : t('common.actions.save', 'Save')}
          </DomainPrimaryButton>
        </>
      }
    >
      {submitError ? <DomainInlineNotice tone="danger" title={submitError} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DomainField
          required
          label={t('admin.domainCenter.columns.recordType', 'Type')}
          error={errors.recordType ? t(errors.recordType, 'Invalid record type') : undefined}
        >
          <DomainSelect
            value={form.recordType}
            onChange={(value) => setForm((current) => ({ ...current, recordType: value }))}
            options={DOMAIN_DNS_RECORD_TYPES.map((type) => ({ value: type, label: type }))}
          />
        </DomainField>
        <DomainField
          required
          label={t('admin.domainCenter.columns.recordName', 'Host')}
          hint={t('admin.domainCenter.dns.fields.hostHint', '@ for apex, www, api.eu, or * for a wildcard')}
          error={errors.host ? t(errors.host, 'Invalid host') : undefined}
        >
          <DomainTextInput
            mono
            autoFocus
            disabled={busy}
            value={form.host}
            onChange={(value) => setForm((current) => ({ ...current, host: value }))}
            placeholder="@"
          />
        </DomainField>
        <DomainField
          required
          label={t('admin.domainCenter.columns.recordValue', 'Value')}
          hint={recordValueHint(t, form.recordType)}
          error={errors.recordValue ? t(errors.recordValue, 'Invalid record value') : undefined}
        >
          <DomainTextInput
            mono
            disabled={busy}
            value={form.recordValue}
            onChange={(value) => setForm((current) => ({ ...current, recordValue: value }))}
            placeholder={recordValuePlaceholder(form.recordType)}
          />
        </DomainField>
        <div className="grid grid-cols-2 gap-4">
          <DomainField
            label={t('admin.domainCenter.columns.ttl', 'TTL (seconds)')}
            hint={t('admin.domainCenter.dns.fields.ttlHint', '60–86400')}
            error={errors.ttlSeconds ? t(errors.ttlSeconds, 'Invalid TTL') : undefined}
          >
            <DomainTextInput
              mono
              inputMode="numeric"
              disabled={busy}
              value={form.ttlSeconds}
              onChange={(value) => setForm((current) => ({ ...current, ttlSeconds: value }))}
              placeholder="600"
            />
          </DomainField>
          <DomainField
            label={t('admin.domainCenter.columns.priority', 'Priority')}
            hint={form.recordType === 'MX' ? t('admin.domainCenter.dns.fields.priorityHint', 'Required for MX') : undefined}
            error={errors.priority ? t(errors.priority, 'Invalid priority') : undefined}
          >
            <DomainTextInput
              mono
              inputMode="numeric"
              disabled={busy || form.recordType !== 'MX'}
              value={form.priority}
              onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
              placeholder="10"
            />
          </DomainField>
        </div>
        <DomainField
          label={t('admin.domainCenter.dns.fields.recordLine', 'Resolution line')}
          hint={t('admin.domainCenter.dns.fields.recordLineHint', 'Optional provider line (e.g. default, telecom, unicom)')}
          error={errors.recordLine ? t(errors.recordLine, 'Line is too long') : undefined}
        >
          <DomainTextInput
            disabled={busy}
            value={form.recordLine}
            onChange={(value) => setForm((current) => ({ ...current, recordLine: value }))}
            placeholder={t('admin.domainCenter.dns.fields.recordLinePlaceholder', 'default')}
          />
        </DomainField>
      </div>
    </DomainFormDialog>
  );
}

function recordValueHint(
  t: (key: string, fallback: string) => string,
  type: DomainDnsRecordType,
): string {
  switch (type) {
    case 'A':
      return t('admin.domainCenter.dns.hints.a', 'IPv4 address, e.g. 203.0.113.10');
    case 'AAAA':
      return t('admin.domainCenter.dns.hints.aaaa', 'IPv6 address, e.g. 2001:db8::1');
    case 'CNAME':
      return t('admin.domainCenter.dns.hints.cname', 'Target hostname, e.g. app.example.com');
    case 'MX':
      return t('admin.domainCenter.dns.hints.mx', 'Mail hostname, with a priority above');
    case 'NS':
      return t('admin.domainCenter.dns.hints.ns', 'Name server hostname');
    case 'CAA':
      return t('admin.domainCenter.dns.hints.caa', '0 issue "letsencrypt.org"');
    default:
      return t('admin.domainCenter.dns.hints.txt', 'Free-form text, up to 2048 characters');
  }
}

function recordValuePlaceholder(type: DomainDnsRecordType): string {
  switch (type) {
    case 'A':
      return '203.0.113.10';
    case 'AAAA':
      return '2001:db8::1';
    case 'CNAME':
      return 'app.example.com';
    case 'MX':
      return 'mail.example.com';
    case 'NS':
      return 'ns1.example.com';
    case 'CAA':
      return '0 issue "letsencrypt.org"';
    default:
      return 'sdkwork-verification=...';
  }
}
