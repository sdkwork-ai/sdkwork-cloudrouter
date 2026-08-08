import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingDrawer } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { MarketingValueBadge, marketingEnumLabel, type MarketingBadgeTone } from '../components/MarketingValueBadge';
import { MarketingField, MarketingFormSection, marketingInputClassName, marketingSelectClassName } from '../components/MarketingFormControls';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  backendPromotionCampaignsList,
  buildCampaignRequest,
  campaignRecordToFormValues,
  createPromotionCampaign,
  deletePromotionCampaign,
  updatePromotionCampaign,
  type CampaignFormValues,
} from '../marketingService';

/** 活动生命周期状态 → 徽章色调；状态值已统一小写。 */
const campaignStatusTone: Record<string, MarketingBadgeTone> = {
  draft: 'default',
  scheduled: 'info',
  active: 'success',
  paused: 'warning',
  ended: 'default',
  cancelled: 'danger',
  archived: 'default',
};

const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'ended', 'cancelled', 'archived'];

export function CampaignsPage() {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialValue, setInitialValue] = useState<Partial<CampaignFormValues> | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((current) => current + 1);

  const openCreateDrawer = (initial?: Partial<CampaignFormValues>, campaignId?: string) => {
    setSaveError(null);
    setInitialValue(initial);
    setEditingId(campaignId ?? null);
    setIsDrawerOpen(true);
  };

  const handleCreate = async (values: CampaignFormValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        await updatePromotionCampaign(editingId, buildCampaignRequest(values));
      } else {
        await createPromotionCampaign(buildCampaignRequest(values));
      }
      setIsDrawerOpen(false);
      setInitialValue(undefined);
      setEditingId(null);
      refresh();
    } catch (createError) {
      setSaveError(resolveProblemMessage(createError, t, t('admin.marketing.campaigns.createError', 'Failed to save campaign')));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: ApiRecord) => {
    const campaignId = String(record['id']);
    const name = String(record['displayName'] ?? campaignId);
    const status = String(record['status'] ?? '');
    if (status !== 'draft') {
      window.alert(t('admin.marketing.campaigns.deleteDraftOnly', 'Only draft campaigns can be deleted.'));
      return;
    }
    if (!window.confirm(t('admin.marketing.campaigns.deleteConfirm', 'Delete campaign {{name}}? This cannot be undone.', { name }))) {
      return;
    }
    try {
      await deletePromotionCampaign(campaignId);
      refresh();
    } catch (deleteError) {
      window.alert(resolveProblemMessage(deleteError, t, t('admin.marketing.campaigns.deleteError', 'Failed to delete campaign')));
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'campaignNo', label: t('admin.col.campaignNo', 'Campaign No') },
    { key: 'displayName', label: t('admin.col.name', 'Name') },
    { key: 'channelScope', label: t('admin.marketing.campaigns.channel', 'Channel'), render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.channelScope', t) },
    { key: 'audienceScope', label: t('admin.col.audience', 'Audience'), render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.audience', t) },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingValueBadge
          label={marketingEnumLabel(value, 'admin.marketing.enums.campaignStatus', t)}
          tone={campaignStatusTone[String(value ?? '').toLowerCase()] ?? 'default'}
        />
      ),
    },
    { key: 'startsAt', label: t('admin.col.starts', 'Starts') },
    { key: 'endsAt', label: t('admin.col.ends', 'Ends') },
    { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
  ];

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.campaigns.title', 'Campaigns')}
        description={t('admin.marketing.campaigns.desc', 'Marketing campaigns group coupon offers with scheduling and audience targeting.')}
        load={backendPromotionCampaignsList}
        columns={columns}
        refreshKey={refreshKey}
        searchPlaceholder={t('admin.marketing.campaigns.search', 'Search by name or campaign no')}
        emptyTitle={t('admin.marketing.campaigns.empty', 'No campaigns yet. Create your first campaign to group coupon offers.')}
        toolbarActions={(
          <button
            type="button"
            onClick={() => openCreateDrawer()}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.marketing.campaigns.create', 'Create Campaign')}
          </button>
        )}
        rowActions={(record) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openCreateDrawer(campaignRecordToFormValues(record), String(record['id']))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              {t('common.actions.edit', 'Edit')}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(record)}
              className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-white/5 dark:text-red-400"
            >
              {t('common.actions.delete', 'Delete')}
            </button>
          </div>
        )}
      />

      <MarketingDrawer
        title={t('admin.marketing.campaigns.form.title', 'Campaign')}
        description={initialValue
          ? t('admin.marketing.campaigns.form.editSubtitle', 'Adjust the campaign schedule, targeting, and status.')
          : t('admin.marketing.campaigns.form.subtitle', 'Group coupon offers under a campaign with schedule and audience targeting.')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        side="left"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              form="campaignCreateForm"
              disabled={isSaving}
              className="rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:opacity-50"
            >
              {isSaving
                ? t('common.actions.saving', 'Saving...')
                : t('admin.marketing.campaigns.form.save', 'Save Campaign')}
            </button>
          </div>
        )}
      >
        <CampaignCreateDrawerForm
          error={saveError}
          initialValue={initialValue}
          onSubmit={(values) => void handleCreate(values)}
        />
      </MarketingDrawer>
    </>
  );
}

interface CampaignCreateDrawerFormProps {
  error: string | null;
  initialValue?: Partial<CampaignFormValues>;
  onSubmit: (values: CampaignFormValues) => void;
}

function CampaignCreateDrawerForm({ error, initialValue, onSubmit }: CampaignCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CampaignFormValues>({
    displayName: initialValue?.displayName ?? '',
    description: initialValue?.description ?? '',
    channelScope: initialValue?.channelScope ?? 'ALL',
    audienceScope: initialValue?.audienceScope ?? 'ALL',
    startsAt: initialValue?.startsAt ?? '',
    endsAt: initialValue?.endsAt ?? '',
    status: initialValue?.status ?? 'draft',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.displayName.trim() || !values.startsAt) {
      setValidationError(t('admin.marketing.campaigns.form.required', 'Name and start time are required'));
      return;
    }
    if (values.endsAt && values.startsAt && new Date(values.endsAt) < new Date(values.startsAt)) {
      setValidationError(t('admin.marketing.coupon.form.endsBeforeStarts', 'End time must not be earlier than start time'));
      return;
    }
    onSubmit(values);
  };

  return (
    <form id="campaignCreateForm" onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.campaigns.form.basic', 'Basic Information')}>
        <MarketingField label={t('admin.marketing.campaigns.form.name', 'Campaign Name')} required>
          <input
            type="text"
            value={values.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.campaigns.form.status', 'Status')} required>
          <select
            value={values.status}
            onChange={(event) => update('status', event.target.value)}
            className={marketingSelectClassName}
          >
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {marketingEnumLabel(status, 'admin.marketing.enums.campaignStatus', t)}
              </option>
            ))}
          </select>
        </MarketingField>
        <MarketingField
          label={t('admin.marketing.campaigns.form.description', 'Description')}
          className="sm:col-span-2"
        >
          <textarea
            value={values.description ?? ''}
            onChange={(event) => update('description', event.target.value)}
            className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </MarketingField>
      </MarketingFormSection>

      <MarketingFormSection title={t('admin.marketing.campaigns.form.schedule', 'Schedule & Audience')}>
        <MarketingField label={t('admin.marketing.campaigns.form.channel', 'Channel Scope')} required>
          <select
            value={values.channelScope}
            onChange={(event) => update('channelScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">{t('admin.marketing.enums.channelScope.ALL', 'All channels')}</option>
            <option value="PC">{t('admin.marketing.enums.channelScope.PC', 'PC')}</option>
            <option value="MOBILE">{t('admin.marketing.enums.channelScope.MOBILE', 'Mobile')}</option>
            <option value="API">{t('admin.marketing.enums.channelScope.API', 'API')}</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.campaigns.form.audience', 'Audience Scope')} required>
          <select
            value={values.audienceScope}
            onChange={(event) => update('audienceScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">{t('admin.marketing.enums.audience.ALL', 'All users')}</option>
            <option value="NEW_USER">{t('admin.marketing.enums.audience.NEW_USER', 'New users')}</option>
            <option value="RETURNING_USER">{t('admin.marketing.enums.audience.RETURNING_USER', 'Returning users')}</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.startsAt', 'Starts At')} required>
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) => update('startsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.endsAt', 'Ends At')}>
          <input
            type="datetime-local"
            value={values.endsAt ?? ''}
            onChange={(event) => update('endsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
      </MarketingFormSection>

      {validationError || error ? (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {validationError ?? error}
        </p>
      ) : null}
    </form>
  );
}
