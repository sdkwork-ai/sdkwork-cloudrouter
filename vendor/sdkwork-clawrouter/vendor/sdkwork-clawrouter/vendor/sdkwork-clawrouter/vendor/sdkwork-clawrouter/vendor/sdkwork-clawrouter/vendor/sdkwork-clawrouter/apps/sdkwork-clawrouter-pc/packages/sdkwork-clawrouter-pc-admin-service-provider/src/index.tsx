import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  Filter,
  Handshake,
  KeyRound,
  LayoutDashboard,
  Network,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  DEFAULT_SERVICE_PROVIDER_PAGE_PARAMS,
  backendServiceProviderAdjustmentsList,
  backendServiceProviderAuditEventsList,
  backendServiceProviderBindingsList,
  backendServiceProviderContractsList,
  backendServiceProviderDashboardRetrieve,
  backendServiceProviderDownstreamCreate,
  backendServiceProviderDownstreamsList,
  backendServiceProviderMembersList,
  backendServiceProviderPricingRuleCreate,
  backendServiceProviderPricingRuleUpdate,
  backendServiceProviderPricingRulesList,
  backendServiceProviderReconciliationRunsList,
  backendServiceProviderRelationsList,
  backendServiceProviderRiskEventsList,
  backendServiceProviderStatementsList,
  backendServiceProviderUsageList,
  backendServiceProviderWalletAccountsList,
  backendServiceProvidersList,
  type ServiceProviderListParams,
} from './serviceProviderService';
import {
  DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM,
  DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
  DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM,
  SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES,
  type ServiceProviderDownstreamFormState,
  type ServiceProviderPricingRuleCreateFormState,
  type ServiceProviderPricingRuleUpdateFormState,
  toServiceProviderDownstreamCreateRequest,
  toServiceProviderPricingRuleCreateRequest,
  toServiceProviderPricingRuleUpdateCommand,
} from './serviceProviderForms';

export type ServiceProviderAdminSectionId =
  | 'dashboard'
  | 'providers'
  | 'relations'
  | 'downstreams'
  | 'members'
  | 'bindings'
  | 'contracts'
  | 'pricing'
  | 'usage'
  | 'wallet'
  | 'statements'
  | 'reconciliation'
  | 'adjustments'
  | 'risk'
  | 'audit';

type ServiceProviderAdminGroup = string;

type ServiceProviderAdminProps = {
  sectionId?: string;
};

type ServiceProviderPricingRuleMode = 'create' | 'update';

type ServiceProviderChainFilters = {
  providerId: string;
  sellerProviderId: string;
  buyerProviderId: string;
  edgeId: string;
};

type ServiceProviderSectionActions = {
  onOpenDownstreamForm: () => void;
  onOpenPricingRuleForm: () => void;
};

const DEFAULT_SECTION_ID: ServiceProviderAdminSectionId = 'dashboard';
const DEFAULT_SERVICE_PROVIDER_CHAIN_FILTERS: ServiceProviderChainFilters = {
  providerId: '',
  sellerProviderId: '',
  buyerProviderId: '',
  edgeId: '',
};

export function ServiceProviderAdmin({ sectionId }: ServiceProviderAdminProps) {
  const { t } = useTranslation();
  const activeSectionId = resolveServiceProviderSectionId(sectionId);
  const [chainFilterDraft, setChainFilterDraft] = useState<ServiceProviderChainFilters>(
    DEFAULT_SERVICE_PROVIDER_CHAIN_FILTERS,
  );
  const [chainFilters, setChainFilters] = useState<ServiceProviderChainFilters>(
    DEFAULT_SERVICE_PROVIDER_CHAIN_FILTERS,
  );
  const [downstreamFormOpen, setDownstreamFormOpen] = useState(false);
  const [downstreamForm, setDownstreamForm] = useState<ServiceProviderDownstreamFormState>(
    DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM,
  );
  const [downstreamSaving, setDownstreamSaving] = useState(false);
  const [downstreamFeedback, setDownstreamFeedback] = useState<ServiceProviderAdminFeedback>(null);
  const [pricingRuleFormOpen, setPricingRuleFormOpen] = useState(false);
  const [pricingRuleMode, setPricingRuleMode] = useState<ServiceProviderPricingRuleMode>('create');
  const [pricingRuleCreateForm, setPricingRuleCreateForm] = useState<ServiceProviderPricingRuleCreateFormState>(
    DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM,
  );
  const [pricingRuleUpdateForm, setPricingRuleUpdateForm] = useState<ServiceProviderPricingRuleUpdateFormState>(
    DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM,
  );
  const [pricingRuleSaving, setPricingRuleSaving] = useState(false);
  const [pricingRuleFeedback, setPricingRuleFeedback] = useState<ServiceProviderAdminFeedback>(null);

  const openDownstreamForm = useCallback(() => {
    setDownstreamForm({ ...DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM });
    setDownstreamFeedback(null);
    setDownstreamFormOpen(true);
  }, []);

  const openPricingRuleForm = useCallback(() => {
    setPricingRuleMode('create');
    setPricingRuleCreateForm({ ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM });
    setPricingRuleUpdateForm({ ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM });
    setPricingRuleFeedback(null);
    setPricingRuleFormOpen(true);
  }, []);

  const serviceProviderListParams = useMemo(
    () => buildServiceProviderListParams(chainFilters),
    [chainFilters],
  );

  const sections = useMemo(
    () => buildServiceProviderSections(
      t,
      { onOpenDownstreamForm: openDownstreamForm, onOpenPricingRuleForm: openPricingRuleForm },
      serviceProviderListParams,
    ),
    [openDownstreamForm, openPricingRuleForm, serviceProviderListParams, t],
  );

  const applyChainFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChainFilters(chainFilterDraft);
  };

  const clearChainFilters = () => {
    setChainFilterDraft(DEFAULT_SERVICE_PROVIDER_CHAIN_FILTERS);
    setChainFilters(DEFAULT_SERVICE_PROVIDER_CHAIN_FILTERS);
  };

  const submitDownstreamForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDownstreamSaving(true);
    setDownstreamFeedback(null);
    try {
      const response = await backendServiceProviderDownstreamCreate(
        toServiceProviderDownstreamCreateRequest(downstreamForm),
      );
      setDownstreamFeedback({
        kind: 'success',
        message: t('admin.serviceProvider.downstreams.saveSuccess', 'Downstream provider accepted: {{id}}', {
          id: readServiceProviderMutationId(response),
        }),
      });
      setDownstreamForm({ ...DEFAULT_SERVICE_PROVIDER_DOWNSTREAM_FORM });
    } catch (error) {
      setDownstreamFeedback({
        kind: 'error',
        message: error instanceof Error && error.message
          ? error.message
          : t('admin.serviceProvider.downstreams.saveError', 'Downstream provider could not be saved.'),
      });
    } finally {
      setDownstreamSaving(false);
    }
  };

  const submitPricingRuleForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPricingRuleSaving(true);
    setPricingRuleFeedback(null);
    try {
      const response = pricingRuleMode === 'create'
        ? await backendServiceProviderPricingRuleCreate(
          toServiceProviderPricingRuleCreateRequest(pricingRuleCreateForm),
        )
        : await submitPricingRuleUpdate(pricingRuleUpdateForm);
      setPricingRuleFeedback({
        kind: 'success',
        message: t('admin.serviceProvider.pricing.saveSuccess', 'Pricing rule accepted: {{id}}', {
          id: readServiceProviderMutationId(response),
        }),
      });
      setPricingRuleCreateForm({ ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_CREATE_FORM });
      setPricingRuleUpdateForm({ ...DEFAULT_SERVICE_PROVIDER_PRICING_RULE_UPDATE_FORM });
    } catch (error) {
      setPricingRuleFeedback({
        kind: 'error',
        message: error instanceof Error && error.message
          ? error.message
          : t('admin.serviceProvider.pricing.saveError', 'Pricing rule could not be saved.'),
      });
    } finally {
      setPricingRuleSaving(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-service-provider="commercial-center">
        <form
          className="shrink-0 border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
          data-admin-service-provider-chain-filters
          onSubmit={applyChainFilters}
        >
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <ServiceProviderChainFilterInput
              label={t('admin.serviceProvider.filter.providerId', 'Provider ID')}
              onChange={(providerId) => setChainFilterDraft((current) => ({ ...current, providerId }))}
              value={chainFilterDraft.providerId}
            />
            <ServiceProviderChainFilterInput
              label={t('admin.serviceProvider.filter.sellerProviderId', 'Seller ID')}
              onChange={(sellerProviderId) => setChainFilterDraft((current) => ({ ...current, sellerProviderId }))}
              value={chainFilterDraft.sellerProviderId}
            />
            <ServiceProviderChainFilterInput
              label={t('admin.serviceProvider.filter.buyerProviderId', 'Buyer ID')}
              onChange={(buyerProviderId) => setChainFilterDraft((current) => ({ ...current, buyerProviderId }))}
              value={chainFilterDraft.buyerProviderId}
            />
            <ServiceProviderChainFilterInput
              label={t('admin.serviceProvider.filter.edgeId', 'Edge ID')}
              onChange={(edgeId) => setChainFilterDraft((current) => ({ ...current, edgeId }))}
              value={chainFilterDraft.edgeId}
            />
            <div className="flex gap-2">
              <button
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                type="submit"
              >
                <Filter className="h-4 w-4" />
                {t('admin.action.apply', 'Apply')}
              </button>
              <button
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                onClick={clearChainFilters}
                type="button"
              >
                <X className="h-4 w-4" />
                {t('admin.action.clear', 'Clear')}
              </button>
            </div>
          </div>
        </form>
        <div className="min-h-0 flex-1 overflow-hidden">
          <AdminResourceCenter<ServiceProviderAdminSectionId, ServiceProviderAdminGroup>
            activeSectionId={activeSectionId}
            emptyDescription={t('admin.serviceProvider.empty.desc', 'Create provider hierarchy records or adjust the current filters.')}
            emptyTitle={t('admin.serviceProvider.empty.title', 'No service provider records')}
            errorTitle={t('admin.serviceProvider.error.title', 'Service provider data could not be loaded')}
            initialSectionId={DEFAULT_SECTION_ID}
            loadingTitle={t('admin.serviceProvider.loading', 'Loading service provider records...')}
            sections={sections}
            showSectionNavigation={false}
            tableViewportDataAttribute="admin-service-provider-table"
          />
        </div>
      </div>
      {downstreamFormOpen && (
        <div data-admin-service-provider-form="downstream">
          <ServiceProviderModalForm
            cancelLabel={t('admin.action.cancel', 'Cancel')}
            dataAttribute="downstream"
            feedback={downstreamFeedback}
            onCancel={() => setDownstreamFormOpen(false)}
            onSubmit={submitDownstreamForm}
            saving={downstreamSaving}
            savingLabel={t('admin.action.saving', 'Saving...')}
            saveLabel={t('admin.serviceProvider.downstreams.save', 'Save downstream')}
            title={t('admin.serviceProvider.downstreams.formTitle', 'Add downstream provider')}
          >
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.sellerProviderId', 'Seller provider ID')}
              onChange={(sellerProviderId) => setDownstreamForm((current) => ({ ...current, sellerProviderId }))}
              required
              value={downstreamForm.sellerProviderId}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.providerNo', 'Provider No')}
              onChange={(providerNo) => setDownstreamForm((current) => ({ ...current, providerNo }))}
              required
              value={downstreamForm.providerNo}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.displayName', 'Display name')}
              onChange={(displayName) => setDownstreamForm((current) => ({ ...current, displayName }))}
              required
              value={downstreamForm.displayName}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.providerType', 'Provider type')}
              onChange={(providerType) => setDownstreamForm((current) => ({ ...current, providerType }))}
              value={downstreamForm.providerType}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.defaultCurrency', 'Currency')}
              onChange={(defaultCurrency) => setDownstreamForm((current) => ({ ...current, defaultCurrency }))}
              value={downstreamForm.defaultCurrency}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.settlementMode', 'Settlement mode')}
              onChange={(settlementMode) => setDownstreamForm((current) => ({ ...current, settlementMode }))}
              value={downstreamForm.settlementMode}
            />
            <ServiceProviderAdminInput
              label={t('admin.serviceProvider.form.pricePlanCode', 'Price plan code')}
              onChange={(pricePlanCode) => setDownstreamForm((current) => ({ ...current, pricePlanCode }))}
              value={downstreamForm.pricePlanCode}
            />
            <ServiceProviderAdminInput
              inputMode="decimal"
              label={t('admin.serviceProvider.form.defaultMultiplier', 'Official price multiplier')}
              onChange={(defaultMultiplier) => setDownstreamForm((current) => ({ ...current, defaultMultiplier }))}
              value={downstreamForm.defaultMultiplier}
            />
          </ServiceProviderModalForm>
        </div>
      )}
      {pricingRuleFormOpen && (
        <div data-admin-service-provider-form="pricing-rule">
          <ServiceProviderModalForm
            cancelLabel={t('admin.action.cancel', 'Cancel')}
            dataAttribute="pricing-rule"
            feedback={pricingRuleFeedback}
            onCancel={() => setPricingRuleFormOpen(false)}
            onSubmit={submitPricingRuleForm}
            saving={pricingRuleSaving}
            savingLabel={t('admin.action.saving', 'Saving...')}
            saveLabel={pricingRuleMode === 'create'
              ? t('admin.serviceProvider.pricing.createSave', 'Create rule')
              : t('admin.serviceProvider.pricing.updateSave', 'Update rule')}
            title={t('admin.serviceProvider.pricing.formTitle', 'Maintain billable point')}
            toolbar={(
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                {(['create', 'update'] as const).map((mode) => (
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pricingRuleMode === mode
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-[#1e1e1e] dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    key={mode}
                    onClick={() => {
                      setPricingRuleMode(mode);
                      setPricingRuleFeedback(null);
                    }}
                    type="button"
                  >
                    {mode === 'create'
                      ? t('admin.serviceProvider.pricing.modeCreate', 'Create')
                      : t('admin.serviceProvider.pricing.modeUpdate', 'Update')}
                  </button>
                ))}
              </div>
            )}
          >
            {pricingRuleMode === 'create' ? (
              <ServiceProviderPricingRuleCreateFields
                form={pricingRuleCreateForm}
                onChange={(patch) => setPricingRuleCreateForm((current) => ({ ...current, ...patch }))}
                t={t}
              />
            ) : (
              <ServiceProviderPricingRuleUpdateFields
                form={pricingRuleUpdateForm}
                onChange={(patch) => setPricingRuleUpdateForm((current) => ({ ...current, ...patch }))}
                t={t}
              />
            )}
          </ServiceProviderModalForm>
        </div>
      )}
    </>
  );
}

type ServiceProviderAdminFeedback = {
  kind: 'success' | 'error';
  message: string;
} | null;

type ServiceProviderModalFormProps = {
  cancelLabel: string;
  children: React.ReactNode;
  dataAttribute: string;
  feedback: ServiceProviderAdminFeedback;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  savingLabel: string;
  saveLabel: string;
  title: string;
  toolbar?: React.ReactNode;
};

function ServiceProviderModalForm({
  cancelLabel,
  children,
  dataAttribute,
  feedback,
  onCancel,
  onSubmit,
  saving,
  savingLabel,
  saveLabel,
  title,
  toolbar,
}: ServiceProviderModalFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
        data-admin-service-provider-form={dataAttribute}
        onSubmit={onSubmit}
        role="dialog"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          {toolbar}
        </div>
        <div className="grid min-h-0 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          {children}
        </div>
        {feedback && (
          <div className="px-5 pb-4">
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
            }`}>
              {feedback.message}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function ServiceProviderPricingRuleCreateFields({
  form,
  onChange,
  t,
}: {
  form: ServiceProviderPricingRuleCreateFormState;
  onChange: (patch: Partial<ServiceProviderPricingRuleCreateFormState>) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const handleResourceCategoryChange = (resourceCategory: string) => {
    const category = SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES.find(
      (item) => item.id === resourceCategory,
    );
    if (!category) {
      return;
    }
    onChange({
      resourceCategory: category.id,
      billingMeterCode: category.defaultBillingMeterCode,
      tokenKind: category.defaultTokenKind,
      unitSize: category.defaultUnitSize,
    });
  };

  return (
    <>
      <ServiceProviderAdminSelect
        dataAttribute="pricing-resource-category"
        label={t('admin.serviceProvider.form.resourceCategory', 'Resource category')}
        onChange={handleResourceCategoryChange}
        options={SERVICE_PROVIDER_PRICE_RESOURCE_CATEGORIES.map((category) => ({
          label: t(`admin.serviceProvider.pricing.resourceCategory.${category.id}`),
          value: category.id,
        }))}
        value={form.resourceCategory}
      />
      <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        {t('admin.serviceProvider.pricing.methodHint.specifiedUnitPrice', 'Persist a concrete access cost for the selected resource category, meter, and optional model/API resource. Official-price multipliers are configured on the upstream account or sales price group.')}
      </div>
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.sellerProviderId', 'Seller provider ID')} onChange={(sellerProviderId) => onChange({ sellerProviderId })} required value={form.sellerProviderId} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.buyerProviderId', 'Buyer provider ID')} onChange={(buyerProviderId) => onChange({ buyerProviderId })} required value={form.buyerProviderId} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.edgeId', 'Edge ID')} onChange={(edgeId) => onChange({ edgeId })} value={form.edgeId} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.pricePlanId', 'Price plan ID')} onChange={(pricePlanId) => onChange({ pricePlanId })} value={form.pricePlanId} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.catalogKey', 'Catalog key')} onChange={(catalogKey) => onChange({ catalogKey })} value={form.catalogKey} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.model', 'Model')} onChange={(model) => onChange({ model })} value={form.model} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.billingMeterCode', 'Billing meter')} onChange={(billingMeterCode) => onChange({ billingMeterCode })} required value={form.billingMeterCode} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.tokenKind', 'Token kind')} onChange={(tokenKind) => onChange({ tokenKind })} value={form.tokenKind} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.unitPrice', 'Unit price')} onChange={(unitPrice) => onChange({ unitPrice })} required value={form.unitPrice} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.unitSize', 'Unit size')} onChange={(unitSize) => onChange({ unitSize })} required value={form.unitSize} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.minimumCharge', 'Minimum charge')} onChange={(minimumCharge) => onChange({ minimumCharge })} required value={form.minimumCharge} />
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.currency', 'Currency')} onChange={(currency) => onChange({ currency })} value={form.currency} />
      <ServiceProviderAdminInput inputMode="numeric" label={t('admin.serviceProvider.form.priority', 'Priority')} onChange={(priority) => onChange({ priority })} value={form.priority} />
    </>
  );
}

function ServiceProviderPricingRuleUpdateFields({
  form,
  onChange,
  t,
}: {
  form: ServiceProviderPricingRuleUpdateFormState;
  onChange: (patch: Partial<ServiceProviderPricingRuleUpdateFormState>) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <>
      <ServiceProviderAdminInput label={t('admin.serviceProvider.form.ruleId', 'Rule ID')} onChange={(ruleId) => onChange({ ruleId })} required value={form.ruleId} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.unitPrice', 'Unit price')} onChange={(unitPrice) => onChange({ unitPrice })} value={form.unitPrice} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.unitSize', 'Unit size')} onChange={(unitSize) => onChange({ unitSize })} value={form.unitSize} />
      <ServiceProviderAdminInput inputMode="decimal" label={t('admin.serviceProvider.form.minimumCharge', 'Minimum charge')} onChange={(minimumCharge) => onChange({ minimumCharge })} value={form.minimumCharge} />
      <ServiceProviderAdminInput inputMode="numeric" label={t('admin.serviceProvider.form.priority', 'Priority')} onChange={(priority) => onChange({ priority })} value={form.priority} />
      <ServiceProviderAdminSelect
        label={t('admin.serviceProvider.form.status', 'Status')}
        onChange={(status) => onChange({ status })}
        options={['', 'active', 'inactive', 'suspended']}
        value={form.status}
      />
    </>
  );
}

function ServiceProviderAdminInput({
  inputMode,
  label,
  onChange,
  required = false,
  value,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function ServiceProviderChainFilterInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-xs">
      <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ServiceProviderAdminSelect({
  dataAttribute,
  label,
  onChange,
  options,
  value,
}: {
  dataAttribute?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        data-admin-service-provider-pricing-resource-category={dataAttribute === 'pricing-resource-category' ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <option key={optionValue || 'blank'} value={optionValue}>
              {optionLabel || '-'}
            </option>
          );
        })}
      </select>
    </label>
  );
}

async function submitPricingRuleUpdate(form: ServiceProviderPricingRuleUpdateFormState) {
  const command = toServiceProviderPricingRuleUpdateCommand(form);
  return backendServiceProviderPricingRuleUpdate(command.ruleId, command.input);
}

function readServiceProviderMutationId(result: unknown): string {
  const data = readServiceProviderPayload(result);
  if (!isServiceProviderRecord(data)) {
    return 'accepted';
  }
  const payload = isServiceProviderRecord(data.item) ? data.item : data;
  const id = payload.id ?? payload.providerNo ?? payload.edgeId ?? payload.pricePlanId;
  return typeof id === 'string' && id.trim() ? id.trim() : 'accepted';
}

function readServiceProviderPayload(value: unknown): unknown {
  if (!isServiceProviderRecord(value)) {
    return value;
  }
  return 'data' in value ? value.data : value;
}

function isServiceProviderRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveServiceProviderSectionId(sectionId: string | undefined): ServiceProviderAdminSectionId {
  if (
    sectionId === 'dashboard'
    || sectionId === 'providers'
    || sectionId === 'relations'
    || sectionId === 'downstreams'
    || sectionId === 'members'
    || sectionId === 'bindings'
    || sectionId === 'contracts'
    || sectionId === 'pricing'
    || sectionId === 'usage'
    || sectionId === 'wallet'
    || sectionId === 'statements'
    || sectionId === 'reconciliation'
    || sectionId === 'adjustments'
    || sectionId === 'risk'
    || sectionId === 'audit'
  ) {
    return sectionId;
  }
  return DEFAULT_SECTION_ID;
}

function buildServiceProviderListParams(filters: ServiceProviderChainFilters): ServiceProviderListParams {
  const params: ServiceProviderListParams = { ...DEFAULT_SERVICE_PROVIDER_PAGE_PARAMS };
  const providerId = normalizeChainFilterValue(filters.providerId);
  const sellerProviderId = normalizeChainFilterValue(filters.sellerProviderId);
  const buyerProviderId = normalizeChainFilterValue(filters.buyerProviderId);
  const edgeId = normalizeChainFilterValue(filters.edgeId);
  if (providerId) {
    params.providerId = providerId;
  }
  if (sellerProviderId) {
    params.sellerProviderId = sellerProviderId;
  }
  if (buyerProviderId) {
    params.buyerProviderId = buyerProviderId;
  }
  if (edgeId) {
    params.edgeId = edgeId;
  }
  return params;
}

function normalizeChainFilterValue(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function buildServiceProviderSections(
  t: ReturnType<typeof useTranslation>['t'],
  actions: ServiceProviderSectionActions,
  serviceProviderListParams: ServiceProviderListParams,
): AdminResourceSection<ServiceProviderAdminSectionId, ServiceProviderAdminGroup>[] {
  return [
    {
      id: 'dashboard',
      title: t('admin.serviceProvider.dashboard.title', 'Operating Dashboard'),
      description: t('admin.serviceProvider.dashboard.desc', 'Income, expense, margin, usage, exposure, and downstream risk metrics.'),
      icon: <LayoutDashboard className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.operations', 'Operations'),
      load: () => backendServiceProviderDashboardRetrieve(serviceProviderListParams),
      columns: [
        { key: 'metric', label: t('admin.col.metric', 'Metric') },
        { key: 'value', label: t('admin.col.value', 'Value'), align: 'right' },
      ],
      searchFields: ['metric', 'value', 'status'],
    },
    {
      id: 'providers',
      title: t('admin.serviceProvider.providers.title', 'Provider Registry'),
      description: t('admin.serviceProvider.providers.desc', 'Commercial service-provider subjects, status, owner, risk level, and operating summary.'),
      icon: <Handshake className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.operations', 'Operations'),
      load: () => backendServiceProvidersList(serviceProviderListParams),
      columns: [
        { key: 'providerNo', label: t('admin.col.providerNo', 'Provider No') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'providerType', label: t('admin.col.type', 'Type') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'riskLevel', label: t('admin.col.risk', 'Risk') },
      ],
      searchFields: ['providerNo', 'displayName', 'providerType', 'status', 'riskLevel'],
    },
    {
      id: 'relations',
      title: t('admin.serviceProvider.relations.title', 'Hierarchy Relations'),
      description: t('admin.serviceProvider.relations.desc', 'Direct seller-buyer edges and closure paths for permission and chain retrieval.'),
      icon: <Network className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.operations', 'Operations'),
      load: () => backendServiceProviderRelationsList(serviceProviderListParams),
      columns: [
        { key: 'edgeNo', label: t('admin.col.edge', 'Edge') },
        { key: 'sellerProviderId', label: t('admin.col.seller', 'Seller') },
        { key: 'buyerProviderId', label: t('admin.col.buyer', 'Buyer') },
        { key: 'settlementMode', label: t('admin.col.settlementMode', 'Settlement') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['edgeNo', 'sellerProviderId', 'buyerProviderId', 'settlementMode', 'status'],
    },
    {
      id: 'downstreams',
      title: t('admin.serviceProvider.downstreams.title', 'Downstream Providers'),
      description: t('admin.serviceProvider.downstreams.desc', 'Direct and descendant providers, usage, income, cost, and margin contribution.'),
      icon: <Users className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.operations', 'Operations'),
      load: () => backendServiceProviderDownstreamsList(serviceProviderListParams),
      action: { label: t('admin.serviceProvider.downstreams.addAction', 'Add downstream'), onClick: actions.onOpenDownstreamForm },
      columns: [
        { key: 'providerNo', label: t('admin.col.providerNo', 'Provider No') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'requestCount', label: t('admin.col.requests', 'Requests'), align: 'right' },
        { key: 'incomeAmount', label: t('admin.col.income', 'Income'), align: 'right' },
        { key: 'marginAmount', label: t('admin.col.margin', 'Margin'), align: 'right' },
      ],
      searchFields: ['providerNo', 'displayName', 'status'],
    },
    {
      id: 'members',
      title: t('admin.serviceProvider.members.title', 'Members & Roles'),
      description: t('admin.serviceProvider.members.desc', 'Provider-scoped owner, admin, finance, operator, and viewer assignments.'),
      icon: <UserCog className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.governance', 'Governance'),
      load: () => backendServiceProviderMembersList(serviceProviderListParams),
      columns: [
        { key: 'serviceProviderId', label: t('admin.col.provider', 'Provider') },
        { key: 'memberUserId', label: t('admin.col.user', 'User') },
        { key: 'roleCode', label: t('admin.col.role', 'Role') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['serviceProviderId', 'memberUserId', 'roleCode', 'status'],
    },
    {
      id: 'bindings',
      title: t('admin.serviceProvider.bindings.title', 'Access Bindings'),
      description: t('admin.serviceProvider.bindings.desc', 'API key, channel group, user, organization, and tenant ownership resolution.'),
      icon: <KeyRound className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.governance', 'Governance'),
      load: () => backendServiceProviderBindingsList(serviceProviderListParams),
      columns: [
        { key: 'serviceProviderId', label: t('admin.col.provider', 'Provider') },
        { key: 'subjectType', label: t('admin.col.subjectType', 'Subject Type') },
        { key: 'subjectId', label: t('admin.col.subject', 'Subject') },
        { key: 'bindingPriority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['serviceProviderId', 'subjectType', 'subjectId', 'subjectCode', 'status'],
    },
    {
      id: 'contracts',
      title: t('admin.serviceProvider.contracts.title', 'Contracts & Settlement Rules'),
      description: t('admin.serviceProvider.contracts.desc', 'Bilateral contracts, versions, finance profile, payment terms, and settlement modes.'),
      icon: <FileText className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.governance', 'Governance'),
      load: () => backendServiceProviderContractsList(serviceProviderListParams),
      columns: [
        { key: 'contractNo', label: t('admin.col.contract', 'Contract') },
        { key: 'sellerProviderId', label: t('admin.col.seller', 'Seller') },
        { key: 'buyerProviderId', label: t('admin.col.buyer', 'Buyer') },
        { key: 'settlementMode', label: t('admin.col.settlementMode', 'Settlement') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['contractNo', 'sellerProviderId', 'buyerProviderId', 'settlementMode', 'status'],
    },
    {
      id: 'pricing',
      title: t('admin.serviceProvider.pricing.title', 'Rates & Billable Points'),
      description: t('admin.serviceProvider.pricing.desc', 'Default edge rates and exact token, request, image, audio, and video billable-point rules.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.governance', 'Governance'),
      load: () => backendServiceProviderPricingRulesList(serviceProviderListParams),
      action: { label: t('admin.serviceProvider.pricing.maintainAction', 'Maintain billable point'), onClick: actions.onOpenPricingRuleForm },
      columns: [
        { key: 'planCode', label: t('admin.col.plan', 'Plan') },
        { key: 'model', label: t('admin.col.model', 'Model') },
        { key: 'billingMeterCode', label: t('admin.col.meter', 'Meter') },
        { key: 'tokenKind', label: t('admin.col.tokenKind', 'Token Kind') },
        { key: 'unitPrice', label: t('admin.col.unitPrice', 'Unit Price'), align: 'right' },
        { key: 'currency', label: t('admin.col.currency', 'Currency') },
      ],
      searchFields: ['planCode', 'catalogKey', 'model', 'billingMeterCode', 'tokenKind', 'currency'],
    },
    {
      id: 'usage',
      title: t('admin.serviceProvider.usage.title', 'Usage Chain'),
      description: t('admin.serviceProvider.usage.desc', 'Request-level seller-buyer edge facts with quantity, unit price, charge, and settlement status.'),
      icon: <Activity className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.finance', 'Finance'),
      load: () => backendServiceProviderUsageList(serviceProviderListParams),
      columns: [
        { key: 'usageFactId', label: t('admin.col.usage', 'Usage') },
        { key: 'sellerProviderId', label: t('admin.col.seller', 'Seller') },
        { key: 'buyerProviderId', label: t('admin.col.buyer', 'Buyer') },
        { key: 'billingMeterCode', label: t('admin.col.meter', 'Meter') },
        { key: 'chargeAmount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currency', label: t('admin.col.currency', 'Currency') },
      ],
      searchFields: ['usageFactId', 'sellerProviderId', 'buyerProviderId', 'billingMeterCode', 'tokenKind', 'currency'],
    },
    {
      id: 'wallet',
      title: t('admin.serviceProvider.wallet.title', 'Wallet & Credit'),
      description: t('admin.serviceProvider.wallet.desc', 'Balance, frozen amount, credit limit, used exposure, overdue amount, and suspension thresholds.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.finance', 'Finance'),
      load: () => backendServiceProviderWalletAccountsList(serviceProviderListParams),
      columns: [
        { key: 'serviceProviderId', label: t('admin.col.provider', 'Provider') },
        { key: 'balanceAmount', label: t('admin.col.balance', 'Balance'), align: 'right' },
        { key: 'creditLimitAmount', label: t('admin.col.creditLimit', 'Credit Limit'), align: 'right' },
        { key: 'exposureAmount', label: t('admin.col.exposure', 'Exposure'), align: 'right' },
        { key: 'currency', label: t('admin.col.currency', 'Currency') },
      ],
      searchFields: ['serviceProviderId', 'currency', 'riskStatus'],
    },
    {
      id: 'statements',
      title: t('admin.serviceProvider.statements.title', 'Statements'),
      description: t('admin.serviceProvider.statements.desc', 'Bilateral seller-buyer statements, payable, receivable, payment status, and invoice binding.'),
      icon: <ClipboardList className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.finance', 'Finance'),
      load: () => backendServiceProviderStatementsList(serviceProviderListParams),
      columns: [
        { key: 'statementNo', label: t('admin.col.statement', 'Statement') },
        { key: 'period', label: t('admin.col.period', 'Period') },
        { key: 'sellerProviderId', label: t('admin.col.seller', 'Seller') },
        { key: 'buyerProviderId', label: t('admin.col.buyer', 'Buyer') },
        { key: 'receivableAmount', label: t('admin.col.receivable', 'Receivable'), align: 'right' },
        { key: 'paymentStatus', label: t('admin.col.paymentStatus', 'Payment') },
      ],
      searchFields: ['statementNo', 'period', 'sellerProviderId', 'buyerProviderId', 'paymentStatus'],
    },
    {
      id: 'reconciliation',
      title: t('admin.serviceProvider.reconciliation.title', 'Reconciliation'),
      description: t('admin.serviceProvider.reconciliation.desc', 'Upstream invoice imports, internal usage matching, statement matching, and difference resolution.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.finance', 'Finance'),
      load: () => backendServiceProviderReconciliationRunsList(serviceProviderListParams),
      columns: [
        { key: 'runNo', label: t('admin.col.run', 'Run') },
        { key: 'scopeType', label: t('admin.col.scope', 'Scope') },
        { key: 'matchedCount', label: t('admin.col.matched', 'Matched'), align: 'right' },
        { key: 'mismatchCount', label: t('admin.col.mismatch', 'Mismatch'), align: 'right' },
        { key: 'differenceAmount', label: t('admin.col.difference', 'Difference'), align: 'right' },
      ],
      searchFields: ['runNo', 'scopeType', 'status'],
    },
    {
      id: 'adjustments',
      title: t('admin.serviceProvider.adjustments.title', 'Adjustments & Disputes'),
      description: t('admin.serviceProvider.adjustments.desc', 'Refund, credit, debit, correction, and dispute-hold records without mutating original facts.'),
      icon: <FileText className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.finance', 'Finance'),
      load: () => backendServiceProviderAdjustmentsList(serviceProviderListParams),
      columns: [
        { key: 'adjustmentNo', label: t('admin.col.adjustment', 'Adjustment') },
        { key: 'adjustmentType', label: t('admin.col.type', 'Type') },
        { key: 'sellerProviderId', label: t('admin.col.seller', 'Seller') },
        { key: 'buyerProviderId', label: t('admin.col.buyer', 'Buyer') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'approvalStatus', label: t('admin.col.approval', 'Approval') },
      ],
      searchFields: ['adjustmentNo', 'adjustmentType', 'sellerProviderId', 'buyerProviderId', 'approvalStatus'],
    },
    {
      id: 'risk',
      title: t('admin.serviceProvider.risk.title', 'Risk Control'),
      description: t('admin.serviceProvider.risk.desc', 'Low balance, credit exposure, margin inversion, overdue, and abnormal traffic risk events.'),
      icon: <ShieldAlert className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.control', 'Control'),
      load: () => backendServiceProviderRiskEventsList(serviceProviderListParams),
      columns: [
        { key: 'serviceProviderId', label: t('admin.col.provider', 'Provider') },
        { key: 'riskStatus', label: t('admin.col.risk', 'Risk') },
        { key: 'exposureAmount', label: t('admin.col.exposure', 'Exposure'), align: 'right' },
        { key: 'overdueAmount', label: t('admin.col.overdue', 'Overdue'), align: 'right' },
        { key: 'currency', label: t('admin.col.currency', 'Currency') },
      ],
      searchFields: ['serviceProviderId', 'riskStatus', 'currency'],
    },
    {
      id: 'audit',
      title: t('admin.serviceProvider.audit.title', 'Audit Log'),
      description: t('admin.serviceProvider.audit.desc', 'Hierarchy, pricing, contract, settlement, adjustment, and suspension operation audit trail.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.serviceProvider.group.control', 'Control'),
      load: () => backendServiceProviderAuditEventsList(serviceProviderListParams),
      columns: [
        { key: 'action', label: t('admin.col.action', 'Action') },
        { key: 'operatorId', label: t('admin.col.operator', 'Operator') },
        { key: 'targetType', label: t('admin.col.targetType', 'Target Type') },
        { key: 'targetId', label: t('admin.col.target', 'Target') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
      ],
      searchFields: ['action', 'operatorId', 'targetType', 'targetId', 'createdAt'],
    },
  ];
}
