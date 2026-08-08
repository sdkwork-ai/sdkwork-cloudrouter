import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { MarketingDrawer, MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  MarketingService,
  type ReferralStrategy,
  type ReferralStrategyMutation,
  type ReferralStrategyRewardTarget,
  type ReferralStrategyRewardType,
  type ReferralStrategyStatus,
} from '../marketingService';

const REWARD_TYPE_OPTIONS: Array<{ value: ReferralStrategyRewardType, labelKey: string }> = [
  { value: 'POINTS', labelKey: 'admin.marketing.referralStrategies.rewardType.points' },
  { value: 'CASH', labelKey: 'admin.marketing.referralStrategies.rewardType.cash' },
  { value: 'COUPON', labelKey: 'admin.marketing.referralStrategies.rewardType.coupon' },
];

const REWARD_TARGET_OPTIONS: Array<{ value: ReferralStrategyRewardTarget, labelKey: string }> = [
  { value: 'INVITER', labelKey: 'admin.marketing.referralStrategies.rewardTarget.inviter' },
  { value: 'INVITEE', labelKey: 'admin.marketing.referralStrategies.rewardTarget.invitee' },
];

interface ReferralStrategyFormValues {
  name: string;
  description: string;
  status: ReferralStrategyStatus;
  rewardType: ReferralStrategyRewardType;
  rewardValue: string;
  rewardTarget: ReferralStrategyRewardTarget;
  triggerEvent: string;
  maxRewardsPerInviter: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: ReferralStrategyFormValues = {
  name: '',
  description: '',
  status: 'disabled',
  rewardType: 'POINTS',
  rewardValue: '',
  rewardTarget: 'INVITER',
  triggerEvent: 'REGISTER',
  maxRewardsPerInviter: '0',
  startsAt: '',
  endsAt: '',
};

function toFormValues(record: ReferralStrategy): ReferralStrategyFormValues {
  return {
    name: record.name,
    description: record.description,
    status: record.status,
    rewardType: record.rewardType,
    rewardValue: record.rewardValue,
    rewardTarget: record.rewardTarget,
    triggerEvent: record.triggerEvent,
    maxRewardsPerInviter: record.maxRewardsPerInviter === '0' ? '0' : record.maxRewardsPerInviter,
    startsAt: toDatetimeLocal(record.startsAt),
    endsAt: toDatetimeLocal(record.endsAt),
  };
}

function toMutation(values: ReferralStrategyFormValues): ReferralStrategyMutation {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    status: values.status,
    rewardType: values.rewardType,
    rewardValue: values.rewardValue.trim(),
    rewardTarget: values.rewardTarget,
    triggerEvent: values.triggerEvent,
    maxRewardsPerInviter: Number(values.maxRewardsPerInviter || '0'),
    startsAt: values.startsAt ? toIsoString(values.startsAt) : undefined,
    endsAt: values.endsAt ? toIsoString(values.endsAt) : undefined,
  };
}

function toDatetimeLocal(value: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (item: number) => String(item).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoString(datetimeLocal: string): string {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date time value');
  }
  return date.toISOString();
}

export function ReferralStrategiesPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralStrategy | null>(null);
  const [form, setForm] = useState<ReferralStrategyFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: ReferralStrategy) => {
    setEditing(record);
    setForm(toFormValues(record));
    setFormError(null);
    setDrawerOpen(true);
  };

  const saveStrategy = async () => {
    if (!form.name.trim()) {
      setFormError(t('admin.marketing.referralStrategies.errors.nameRequired', 'Strategy name is required'));
      return;
    }
    if (!form.rewardValue.trim()) {
      setFormError(t('admin.marketing.referralStrategies.errors.rewardValueRequired', 'Reward value is required'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await MarketingService.updateReferralStrategy(editing.id, toMutation(form));
      } else {
        await MarketingService.createReferralStrategy(toMutation(form));
      }
      setDrawerOpen(false);
      refresh();
    } catch (error) {
      setFormError(resolveProblemMessage(error, t, t('admin.marketing.referralStrategies.errors.saveFallback', 'Failed to save referral strategy')));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (record: ReferralStrategy) => {
    const nextStatus: ReferralStrategyStatus = record.status === 'active' ? 'disabled' : 'active';
    try {
      await MarketingService.updateReferralStrategyStatus(record.id, nextStatus);
      refresh();
    } catch (error) {
      window.alert(error instanceof Error
        ? error.message
        : t('admin.marketing.referralStrategies.errors.saveFallback', 'Failed to save referral strategy'));
    }
  };

  const deleteStrategy = async (record: ReferralStrategy) => {
    if (!window.confirm(t('admin.marketing.referralStrategies.confirmDelete', 'Delete this referral strategy?'))) {
      return;
    }
    try {
      await MarketingService.deleteReferralStrategy(record.id);
      refresh();
    } catch (error) {
      window.alert(error instanceof Error
        ? error.message
        : t('admin.marketing.referralStrategies.errors.deleteFallback', 'Failed to delete referral strategy'));
    }
  };

  const columns: MarketingColumn<ReferralStrategy>[] = [
    { key: 'name', label: t('admin.marketing.referralStrategies.col.name', 'Name') },
    { key: 'rewardType', label: t('admin.marketing.referralStrategies.col.rewardType', 'Reward Type') },
    { key: 'rewardValue', label: t('admin.marketing.referralStrategies.col.rewardValue', 'Reward Value') },
    { key: 'rewardTarget', label: t('admin.marketing.referralStrategies.col.rewardTarget', 'Reward Target') },
    { key: 'triggerEvent', label: t('admin.marketing.referralStrategies.col.triggerEvent', 'Trigger') },
    {
      key: 'status',
      label: t('admin.marketing.referralStrategies.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          activeLabel={t('admin.marketing.referralStrategies.status.active', 'Active')}
          inactiveLabel={t('admin.marketing.referralStrategies.status.disabled', 'Disabled')}
        />
      ),
    },
    { key: 'updatedAt', label: t('admin.marketing.referralStrategies.col.updatedAt', 'Updated At'), align: 'right' },
  ];

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.referralStrategies.title', 'Invitation Marketing Strategies')}
        description={t('admin.marketing.referralStrategies.desc', 'Configure rewards granted to inviters or invitees when a referral registration happens. Reward granting is a follow-up phase; strategies are recorded with a reward status marker.')}
        load={(params) => MarketingService.fetchReferralStrategies({
          page: params.page,
          pageSize: params.pageSize,
          status: params.status,
          q: params.q,
        })}
        columns={columns}
        showStatusFilter
        refreshKey={refreshKey}
        searchPlaceholder={t('admin.marketing.referralStrategies.search', 'Search by strategy name')}
        toolbarActions={(
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.marketing.referralStrategies.actions.create', 'New Strategy')}
          </button>
        )}
        rowActions={(record) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => void toggleStatus(record)}
              className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {record.status === 'active'
                ? t('admin.marketing.referralStrategies.actions.disable', 'Disable')
                : t('admin.marketing.referralStrategies.actions.enable', 'Enable')}
            </button>
            <button
              type="button"
              onClick={() => openEdit(record)}
              className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Pencil className="h-3 w-3" />
              {t('admin.marketing.referralStrategies.actions.edit', 'Edit')}
            </button>
            <button
              type="button"
              onClick={() => void deleteStrategy(record)}
              className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
              {t('common.actions.delete', 'Delete')}
            </button>
          </div>
        )}
      />
      <MarketingDrawer
        title={editing
          ? t('admin.marketing.referralStrategies.drawer.editTitle', 'Edit Referral Strategy')
          : t('admin.marketing.referralStrategies.drawer.createTitle', 'New Referral Strategy')}
        description={t('admin.marketing.referralStrategies.drawer.desc', 'Reward configuration for invite-code registrations.')}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-5">
          {formError ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {formError}
            </div>
          ) : null}
          <TextField
            label={t('admin.marketing.referralStrategies.fields.name', 'Name')}
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            placeholder={t('admin.marketing.referralStrategies.placeholders.name', 'e.g. Invite Bonus 200 Points')}
          />
          <TextField
            label={t('admin.marketing.referralStrategies.fields.description', 'Description')}
            value={form.description}
            onChange={(description) => setForm((current) => ({ ...current, description }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label={t('admin.marketing.referralStrategies.fields.rewardType', 'Reward Type')}
              value={form.rewardType}
              onChange={(rewardType) => setForm((current) => ({ ...current, rewardType: rewardType as ReferralStrategyRewardType }))}
              options={REWARD_TYPE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            />
            <TextField
              label={t('admin.marketing.referralStrategies.fields.rewardValue', 'Reward Value')}
              value={form.rewardValue}
              onChange={(rewardValue) => setForm((current) => ({ ...current, rewardValue }))}
              placeholder={t('admin.marketing.referralStrategies.placeholders.rewardValue', 'Points / amount / coupon id')}
            />
            <SelectField
              label={t('admin.marketing.referralStrategies.fields.rewardTarget', 'Reward Target')}
              value={form.rewardTarget}
              onChange={(rewardTarget) => setForm((current) => ({ ...current, rewardTarget: rewardTarget as ReferralStrategyRewardTarget }))}
              options={REWARD_TARGET_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            />
            <TextField
              label={t('admin.marketing.referralStrategies.fields.maxRewardsPerInviter', 'Max Rewards per Inviter')}
              value={form.maxRewardsPerInviter}
              onChange={(maxRewardsPerInviter) => setForm((current) => ({ ...current, maxRewardsPerInviter }))}
              placeholder="0 = unlimited"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label={t('admin.marketing.referralStrategies.fields.startsAt', 'Starts At')}
              value={form.startsAt}
              onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))}
              type="datetime-local"
            />
            <TextField
              label={t('admin.marketing.referralStrategies.fields.endsAt', 'Ends At')}
              value={form.endsAt}
              onChange={(endsAt) => setForm((current) => ({ ...current, endsAt }))}
              type="datetime-local"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('admin.marketing.referralStrategies.fields.status', 'Enabled')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.status === 'active'}
              onClick={() => setForm((current) => ({
                ...current,
                status: current.status === 'active' ? 'disabled' : 'active',
              }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStrategy()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.actions.save', 'Save')}
            </button>
          </div>
        </div>
      </MarketingDrawer>
    </>
  );
}

function TextField({
  label,
  onChange,
  value,
  placeholder,
  type = 'text',
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string, label: string }>;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
