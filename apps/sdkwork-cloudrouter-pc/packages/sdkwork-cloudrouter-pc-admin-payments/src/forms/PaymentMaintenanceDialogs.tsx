/**
 * Payment maintenance dialogs.
 *
 * Create/edit forms for payment methods, channels, route rules, and
 * reconciliation runs, plus a shared confirmation dialog for destructive
 * operations (route rule delete, webhook replay). Mirrors the storage admin
 * dialog pattern: shared shell + field primitives + per-resource form state.
 */

import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X } from 'lucide-react';
import {
  SdkworkBaseDataCountrySelect,
  SdkworkBaseDataCurrencySelect,
} from '@sdkwork/appbase-pc-react';
import {
  readAdminResourceRecordList,
  type AdminResourceRecord,
} from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterPaymentBackendService } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import type { UpdatePaymentProviderRequest } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import type {
  CreatePaymentChannelCommand,
  CreatePaymentMethodCommand,
  CreateReconciliationRunCommand,
  CreateRouteRuleCommand,
  UpdatePaymentMethodCommand,
  UpdateRouteRuleCommand,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendBaseDataDictionariesList,
  backendPaymentsChannelsList,
  backendPaymentsMethodsList,
} from '../paymentsService';

// Built-in option constants. They act as the initial and fallback option set
// when the base-data dictionary service is unreachable, so the admin surface
// never blocks on a dependency (degraded but functional).
export const PROVIDER_CODES = ['stripe', 'alipay', 'wechat_pay', 'sandbox'] as const;
export const STATUS_OPTIONS = ['active', 'inactive', 'deprecated'] as const;
export const SCENE_OPTIONS = ['app', 'web', 'mini_program', 'api'] as const;
const SCOPE_OPTIONS = ['global', 'tenant', 'organization'] as const;
const RECONCILIATION_TYPE_OPTIONS = ['daily', 'weekly', 'monthly', 'manual', 'settlement'] as const;

// ---------------------------------------------------------------------------
// Form state shapes
// ---------------------------------------------------------------------------

export interface PaymentMethodFormValues {
  methodKey: string;
  displayName: string;
  providerCode: string;
  status: string;
  scope: string;
  currencyCode: string;
  countryCode: string;
  sortOrder: string;
}

export interface PaymentChannelFormValues {
  channelNo: string;
  channelName: string;
  providerAccountId: string;
  methodId: string;
  providerCode: string;
  sceneCode: string;
  currencyCode: string;
  countryCode: string;
  priority: string;
  sortOrder: string;
  status: string;
}

export interface RouteRuleFormValues {
  ruleNo: string;
  priority: string;
  purchaseType: string;
  countryCode: string;
  currencyCode: string;
  clientPlatform: string;
  amountMin: string;
  amountMax: string;
  userSegment: string;
  riskLevel: string;
  channelId: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface ReconciliationRunFormValues {
  providerCode: string;
  providerAccountId: string;
  reconciliationType: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
}

export function emptyMethodFormValues(): PaymentMethodFormValues {
  return {
    methodKey: '', displayName: '', providerCode: 'stripe', status: 'active', scope: 'global',
    currencyCode: '', countryCode: '', sortOrder: '',
  };
}

export function emptyChannelFormValues(): PaymentChannelFormValues {
  return {
    channelNo: '', channelName: '', providerAccountId: '', methodId: '', providerCode: 'stripe',
    sceneCode: 'web', currencyCode: '', countryCode: '', priority: '', sortOrder: '', status: 'active',
  };
}

export function emptyRouteRuleFormValues(): RouteRuleFormValues {
  return {
    ruleNo: '', priority: '', purchaseType: '', countryCode: '', currencyCode: '',
    clientPlatform: '', amountMin: '', amountMax: '', userSegment: '', riskLevel: '',
    channelId: '', status: 'active', startsAt: '', endsAt: '',
  };
}

export function emptyReconciliationRunFormValues(): ReconciliationRunFormValues {
  return {
    providerCode: 'stripe', providerAccountId: '', reconciliationType: 'daily',
    periodStart: '', periodEnd: '', currencyCode: '',
  };
}

// ---------------------------------------------------------------------------
// Record -> form values mapping (edit backfill)
// ---------------------------------------------------------------------------

export function methodFormValuesFromRecord(record: AdminResourceRecord): PaymentMethodFormValues {
  return {
    methodKey: readText(record.methodKey ?? record.id),
    displayName: readText(record.displayName),
    providerCode: readText(record.providerCode) || 'stripe',
    status: readText(record.status) || 'active',
    scope: readText(record.scope) || 'global',
    currencyCode: readText(record.currencyCode),
    countryCode: readText(record.countryCode),
    sortOrder: record.sortOrder === undefined ? '' : String(record.sortOrder),
  };
}

export function routeRuleFormValuesFromRecord(record: AdminResourceRecord): RouteRuleFormValues {
  return {
    ruleNo: readText(record.ruleNo ?? record.id),
    priority: record.priority === undefined ? '' : String(record.priority),
    purchaseType: readText(record.purchaseType),
    countryCode: readText(record.countryCode),
    currencyCode: readText(record.currencyCode),
    clientPlatform: readText(record.clientPlatform),
    amountMin: readText(record.amountMin),
    amountMax: readText(record.amountMax),
    userSegment: readText(record.userSegment),
    riskLevel: readText(record.riskLevel),
    channelId: readText(record.channelId),
    status: readText(record.status) || 'active',
    startsAt: toLocalInputValue(readText(record.startsAt)),
    endsAt: toLocalInputValue(readText(record.endsAt)),
  };
}

// ---------------------------------------------------------------------------
// Values -> command mapping
// ---------------------------------------------------------------------------

export function buildMethodCreateCommand(values: PaymentMethodFormValues): CreatePaymentMethodCommand {
  return {
    methodKey: values.methodKey.trim(),
    displayName: values.displayName.trim(),
    providerCode: values.providerCode as CreatePaymentMethodCommand['providerCode'],
    status: values.status as CreatePaymentMethodCommand['status'],
    scope: values.scope as CreatePaymentMethodCommand['scope'],
    currencyCode: optionalText(values.currencyCode),
    countryCode: optionalText(values.countryCode),
    sortOrder: optionalNumber(values.sortOrder),
  };
}

export function buildMethodUpdateCommand(values: PaymentMethodFormValues): UpdatePaymentMethodCommand {
  return {
    displayName: values.displayName.trim(),
    providerCode: values.providerCode as UpdatePaymentMethodCommand['providerCode'],
    status: values.status as UpdatePaymentMethodCommand['status'],
    currencyCode: optionalText(values.currencyCode),
    countryCode: optionalText(values.countryCode),
    sortOrder: optionalNumber(values.sortOrder),
  };
}

export function buildChannelCreateCommand(values: PaymentChannelFormValues): CreatePaymentChannelCommand {
  return {
    channelNo: values.channelNo.trim(),
    channelName: optionalText(values.channelName),
    providerAccountId: values.providerAccountId.trim(),
    methodId: values.methodId.trim(),
    providerCode: values.providerCode as CreatePaymentChannelCommand['providerCode'],
    sceneCode: values.sceneCode as CreatePaymentChannelCommand['sceneCode'],
    currencyCode: values.currencyCode.trim().toUpperCase(),
    countryCode: values.countryCode.trim().toUpperCase(),
    status: values.status as CreatePaymentChannelCommand['status'],
    priority: optionalNumber(values.priority),
    sortOrder: optionalNumber(values.sortOrder),
  };
}

export function buildRouteRuleCreateCommand(values: RouteRuleFormValues): CreateRouteRuleCommand {
  return {
    ruleNo: values.ruleNo.trim(),
    priority: optionalNumber(values.priority),
    purchaseType: optionalText(values.purchaseType),
    countryCode: optionalText(values.countryCode),
    currencyCode: optionalText(values.currencyCode),
    clientPlatform: optionalText(values.clientPlatform),
    amountMin: optionalText(values.amountMin),
    amountMax: optionalText(values.amountMax),
    userSegment: optionalText(values.userSegment),
    riskLevel: optionalText(values.riskLevel),
    channelId: values.channelId.trim(),
    status: values.status as CreateRouteRuleCommand['status'],
    startsAt: fromLocalInputValue(values.startsAt),
    endsAt: fromLocalInputValue(values.endsAt),
  };
}

export function buildRouteRuleUpdateCommand(values: RouteRuleFormValues): UpdateRouteRuleCommand {
  return {
    priority: optionalNumber(values.priority),
    purchaseType: optionalText(values.purchaseType),
    countryCode: optionalText(values.countryCode),
    currencyCode: optionalText(values.currencyCode),
    clientPlatform: optionalText(values.clientPlatform),
    amountMin: optionalText(values.amountMin),
    amountMax: optionalText(values.amountMax),
    userSegment: optionalText(values.userSegment),
    riskLevel: optionalText(values.riskLevel),
    channelId: optionalText(values.channelId),
    status: values.status as UpdateRouteRuleCommand['status'],
    startsAt: fromLocalInputValue(values.startsAt),
    endsAt: fromLocalInputValue(values.endsAt),
  };
}

export function buildReconciliationRunCreateCommand(values: ReconciliationRunFormValues): CreateReconciliationRunCommand {
  return {
    providerCode: values.providerCode as CreateReconciliationRunCommand['providerCode'],
    providerAccountId: values.providerAccountId.trim(),
    reconciliationType: values.reconciliationType as CreateReconciliationRunCommand['reconciliationType'],
    periodStart: new Date(values.periodStart).toISOString(),
    periodEnd: new Date(values.periodEnd).toISOString(),
    currencyCode: values.currencyCode.trim().toUpperCase(),
  };
}

// ---------------------------------------------------------------------------
// Shared dialog shell + field primitives
// ---------------------------------------------------------------------------

interface PaymentDialogProps {
  title: string;
  description?: string;
  saving: boolean;
  onClose(): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  children: ReactNode;
}

export function PaymentDialog({ title, description, saving, onClose, onSubmit, children }: PaymentDialogProps) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (!saving && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="payment-dialog-title"
        aria-modal="true"
        className="flex max-h-[min(880px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-dialog-title">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description ?? t('admin.commerce.payments.dialog.desc', 'Changes are validated and submitted through the payment backend management SDK.')}</p>
          </div>
          <button
            aria-label={t('admin.commerce.payments.dialog.close', 'Close')}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            {children}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
            <button
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              {t('admin.commerce.payments.dialog.cancel', 'Cancel')}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? t('admin.commerce.payments.dialog.saving', 'Saving...') : t('admin.commerce.payments.dialog.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface PaymentConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  processing: boolean;
  onClose(): void;
  onConfirm(): void;
}

export function PaymentConfirmDialog({ title, description, confirmLabel, processing, onClose, onConfirm }: PaymentConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (!processing && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="payment-confirm-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-confirm-title">{title}</h2>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{description}</div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            disabled={processing}
            onClick={onClose}
            type="button"
          >
            {t('admin.commerce.payments.dialog.cancel', 'Cancel')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            disabled={processing}
            onClick={onConfirm}
            type="button"
          >
            {processing ? t('admin.commerce.payments.dialog.saving', 'Saving...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TextField({ description, label, onChange, ...props }: { description?: string; label: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'>) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input {...props} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} />
      {description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}
    </label>
  );
}

type SelectOption = string | { label: string; value: string };

export function SelectField({ disabled, label, onChange, options, translateOptionPrefix, value }: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  translateOptionPrefix?: string;
  value: string;
}) {
  const { t } = useTranslation();
  const optionLabel = (option: SelectOption) => {
    if (typeof option !== 'string') {
      return option.label;
    }
    return translateOptionPrefix ? t(`${translateOptionPrefix}.${option}`, { defaultValue: option }) : option;
  };
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <select className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-white" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => typeof option === 'string'
          ? <option key={option} value={option}>{optionLabel(option)}</option>
          : <option key={option.value} value={option.value}>{optionLabel(option)}</option>)}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Option loaders (dropdowns that depend on other payment resources)
// ---------------------------------------------------------------------------

function useProviderAccountOptions() {
  const [options, setOptions] = useState<AdminResourceRecord[]>([]);
  useEffect(() => {
    let active = true;
    void getCloudRouterPaymentBackendService().providerAccounts.list()
      .then((result) => {
        if (active) setOptions(readAdminResourceRecordList(result));
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);
  return options;
}

// Provider account select label: locale display name first, then the canonical
// account name, then the machine account no. Locale maps are filled by payment
// locale seeds; operator-edited names come through the account update flow.
function providerAccountOptionLabel(
  account: AdminResourceRecord,
  language?: string,
): string {
  const i18nMap = account.accountNameI18n;
  const localized =
    typeof i18nMap === 'object' && i18nMap !== null && language
      ? (i18nMap as Record<string, unknown>)[language]
      : undefined;
  const name = String(localized ?? account.accountName ?? account.accountNo ?? '');
  const providerCode = account.providerCode ?? '';
  return providerCode ? `${name} (${providerCode})` : name;
}

function useMethodOptions() {
  const [options, setOptions] = useState<AdminResourceRecord[]>([]);
  useEffect(() => {
    let active = true;
    void backendPaymentsMethodsList()
      .then((result) => {
        if (active) setOptions(readAdminResourceRecordList(result));
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);
  return options;
}

function useChannelOptions() {
  const [options, setOptions] = useState<AdminResourceRecord[]>([]);
  useEffect(() => {
    let active = true;
    void backendPaymentsChannelsList()
      .then((result) => {
        if (active) setOptions(readAdminResourceRecordList(result));
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);
  return options;
}

// ---------------------------------------------------------------------------
// Base-data option loaders (currencies/countries/dictionary from the
// sdkwork-appbase base-data capability)
// ---------------------------------------------------------------------------

/**
 * Loads base-data records once. Returns `null` while loading or when the
 * base-data service is unreachable, so callers can degrade to the previous
 * free-text input (currencies/countries) or built-in constants (dictionary).
 * `load` must be referentially stable (useCallback) to avoid refetch loops.
 */
function useBaseDataRecords(load: () => Promise<unknown>): AdminResourceRecord[] | null {
  const [records, setRecords] = useState<AdminResourceRecord[] | null>(null);
  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (active) setRecords(readAdminResourceRecordList(result));
      })
      .catch((error) => {
        if (active) {
          console.warn('[base-data] options unavailable, falling back to built-in values', error);
          setRecords(null);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return records;
}

const ACTIVE_STATUS = 'active';

function useDictionaryRecords(typeCode: string): AdminResourceRecord[] | null {
  const load = useCallback(
    () => backendBaseDataDictionariesList({ typeCode, page: 1, pageSize: 200, status: ACTIVE_STATUS }),
    [typeCode],
  );
  return useBaseDataRecords(load);
}

function currencyOptionLabel(record: AdminResourceRecord): string {
  const code = String(record.code ?? '');
  const name = String(record.localizedName ?? record.name ?? '');
  return name ? `${code} - ${name}` : code;
}

function countryOptionLabel(record: AdminResourceRecord): string {
  const code = String(record.alpha2 ?? '');
  const name = String(record.name ?? '');
  return name ? `${code} - ${name}` : code;
}

function dictionaryOptionLabel(record: AdminResourceRecord): string {
  return String(record.localizedName ?? record.name ?? record.entryCode ?? '');
}

/** Dictionary-driven options with the built-in constants as fallback. */
function useDictionaryOptions(typeCode: string, fallback: readonly string[]): SelectOption[] {
  const records = useDictionaryRecords(typeCode);
  if (!records || records.length === 0) {
    return [...fallback];
  }
  return records.map((record) => ({
    label: dictionaryOptionLabel(record),
    value: String(record.entryCode ?? ''),
  }));
}

/**
 * Field label wrapper matching the dialog text/select field layout for the
 * shared searchable base-data selects (which do not render their own label).
 */
export function DialogFieldLabel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Method form
// ---------------------------------------------------------------------------

export interface MethodFormDialogProps {
  mode: 'create' | 'edit';
  initial?: PaymentMethodFormValues;
  saving: boolean;
  onClose(): void;
  onSubmit(values: PaymentMethodFormValues): void;
}

export function MethodFormDialog({ mode, initial, saving, onClose, onSubmit }: MethodFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<PaymentMethodFormValues>(() => initial ?? emptyMethodFormValues());
  const [error, setError] = useState<string | null>(null);
  const providerOptions = useDictionaryOptions('payment_provider', PROVIDER_CODES);
  const statusOptions = useDictionaryOptions('payment_status', STATUS_OPTIONS);
  const scopeOptions = useDictionaryOptions('payment_scope', SCOPE_OPTIONS);
  const set = <K extends keyof PaymentMethodFormValues>(key: K, value: PaymentMethodFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.methodKey.trim()) {
      setError(t('admin.commerce.payments.methods.form.methodKeyRequired', 'Method key is required.'));
      return;
    }
    if (!values.displayName.trim()) {
      setError(t('admin.commerce.payments.methods.form.displayNameRequired', 'Display name is required.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={mode === 'create' ? t('admin.commerce.payments.methods.create.title', 'Create payment method') : t('admin.commerce.payments.methods.edit.title', 'Edit payment method')}
    >
      <TextField disabled={mode === 'edit'} label={t('admin.commerce.payments.methods.form.methodKey', 'Method key')} required value={values.methodKey} onChange={(value) => set('methodKey', value)} />
      <TextField label={t('admin.commerce.payments.methods.form.displayName', 'Display name')} required value={values.displayName} onChange={(value) => set('displayName', value)} />
      <SelectField disabled={mode === 'edit'} label={t('admin.commerce.payments.methods.form.providerCode', 'Provider')} value={values.providerCode} onChange={(value) => set('providerCode', value)} options={providerOptions} />
      <SelectField label={t('admin.commerce.payments.methods.form.status', 'Status')} value={values.status} onChange={(value) => set('status', value)} options={statusOptions} translateOptionPrefix="admin.commerce.payments.value.status" />
      <SelectField label={t('admin.commerce.payments.methods.form.scope', 'Scope')} value={values.scope} onChange={(value) => set('scope', value)} options={scopeOptions} translateOptionPrefix="admin.commerce.payments.value.scope" />
      <DialogFieldLabel label={t('admin.commerce.payments.methods.form.currencyCode', 'Currency code')}>
        <SdkworkBaseDataCurrencySelect
          emptyText={t('admin.commerce.payments.form.currencyEmpty', 'No matching currency')}
          maxLength={3}
          placeholder="CNY"
          searchPlaceholder={t('admin.commerce.payments.form.currencySearch', 'Search currency by code or name')}
          value={values.currencyCode}
          onValueChange={(value) => set('currencyCode', value)}
        />
      </DialogFieldLabel>
      <DialogFieldLabel label={t('admin.commerce.payments.methods.form.countryCode', 'Country code')}>
        <SdkworkBaseDataCountrySelect
          emptyText={t('admin.commerce.payments.form.countryEmpty', 'No matching country')}
          maxLength={2}
          placeholder="CN"
          searchPlaceholder={t('admin.commerce.payments.form.countrySearch', 'Search country by code or name')}
          value={values.countryCode}
          onValueChange={(value) => set('countryCode', value)}
        />
      </DialogFieldLabel>
      <TextField label={t('admin.commerce.payments.methods.form.sortOrder', 'Sort order')} pattern="[0-9]*" type="number" value={values.sortOrder} onChange={(value) => set('sortOrder', value)} />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Provider form
// ---------------------------------------------------------------------------

export interface PaymentProviderFormValues {
  displayName: string;
  displayNameZhCN: string;
  displayNameEnUS: string;
  sortOrder: string;
  status: string;
  reason: string;
}

// Provider catalog statuses; `disabled` is the platform retirement state that
// the status toggle never targets directly (use the edit dialog for it).
const PROVIDER_STATUS_OPTIONS = ['active', 'inactive', 'disabled'] as const;
const PROVIDER_I18N_LOCALES = ['zh-CN', 'en-US'] as const;

export function emptyProviderFormValues(): PaymentProviderFormValues {
  return {
    displayName: '', displayNameZhCN: '', displayNameEnUS: '',
    sortOrder: '', status: 'active', reason: '',
  };
}

export function providerFormValuesFromRecord(record: AdminResourceRecord): PaymentProviderFormValues {
  const i18nMap = record.displayNameI18n;
  const readLocale = (key: string) =>
    typeof i18nMap === 'object' && i18nMap !== null
      ? String((i18nMap as Record<string, unknown>)[key] ?? '')
      : '';
  return {
    displayName: readText(record.displayName),
    displayNameZhCN: readLocale('zh-CN'),
    displayNameEnUS: readLocale('en-US'),
    sortOrder: record.sortOrder === undefined ? '' : String(record.sortOrder),
    status: readText(record.status) || 'active',
    reason: '',
  };
}

export function buildProviderUpdateCommand(values: PaymentProviderFormValues): UpdatePaymentProviderRequest {
  const displayNameI18n: Record<string, string> = {};
  for (const locale of PROVIDER_I18N_LOCALES) {
    const value = locale === 'zh-CN' ? values.displayNameZhCN : values.displayNameEnUS;
    if (value.trim()) {
      displayNameI18n[locale] = value.trim();
    }
  }
  const sortOrder = optionalNumber(values.sortOrder);
  return {
    ...(values.displayName.trim() ? { displayName: values.displayName.trim() } : {}),
    ...(Object.keys(displayNameI18n).length > 0 ? { displayNameI18n } : {}),
    // sortOrder 按 OpenAPI int64 安全策略以字符串传输（生成 SDK 类型为 string）。
    ...(sortOrder !== undefined ? { sortOrder: String(sortOrder) } : {}),
    status: values.status as UpdatePaymentProviderRequest['status'],
    reason: values.reason.trim(),
  };
}

export interface ProviderFormDialogProps {
  initial?: PaymentProviderFormValues;
  saving: boolean;
  onClose(): void;
  onSubmit(values: PaymentProviderFormValues): void;
}

export function ProviderFormDialog({ initial, saving, onClose, onSubmit }: ProviderFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<PaymentProviderFormValues>(() => initial ?? emptyProviderFormValues());
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PaymentProviderFormValues>(key: K, value: PaymentProviderFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.displayName.trim()) {
      setError(t('admin.commerce.payments.providers.form.displayNameRequired', 'Display name is required.'));
      return;
    }
    if (!values.reason.trim()) {
      setError(t('admin.commerce.payments.providers.form.reasonRequired', 'A reason is required for the audit trail.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={t('admin.commerce.payments.providers.edit.title', 'Edit payment provider')}
    >
      <TextField label={t('admin.commerce.payments.providers.form.displayName', 'Display name')} required value={values.displayName} onChange={(value) => set('displayName', value)} />
      <TextField label={t('admin.commerce.payments.providers.form.displayNameZhCN', 'Display name (zh-CN)')} value={values.displayNameZhCN} onChange={(value) => set('displayNameZhCN', value)} />
      <TextField label={t('admin.commerce.payments.providers.form.displayNameEnUS', 'Display name (en-US)')} value={values.displayNameEnUS} onChange={(value) => set('displayNameEnUS', value)} />
      <TextField label={t('admin.commerce.payments.providers.form.sortOrder', 'Sort order')} type="number" value={values.sortOrder} onChange={(value) => set('sortOrder', value)} />
      <SelectField label={t('admin.commerce.payments.providers.form.status', 'Status')} value={values.status} onChange={(value) => set('status', value)} options={PROVIDER_STATUS_OPTIONS} translateOptionPrefix="admin.commerce.payments.value.status" />
      <TextField
        description={t('admin.commerce.payments.providers.form.reasonDesc', 'Recorded in the audit trail for this change.')}
        label={t('admin.commerce.payments.providers.form.reason', 'Reason')}
        required
        value={values.reason}
        onChange={(value) => set('reason', value)}
      />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

export interface ProviderStatusDialogProps {
  provider: AdminResourceRecord;
  saving: boolean;
  onClose(): void;
  onSubmit(reason: string): void;
}

/**
 * Enable/disable confirmation for a payment provider. The target status is
 * derived from the current one (`active` → `inactive`, anything else →
 * `active`); `disabled` (platform retirement) is only reachable through the
 * edit dialog. A reason is mandatory so the mutation keeps an audit trail.
 */
export function ProviderStatusDialog({ provider, saving, onClose, onSubmit }: ProviderStatusDialogProps) {
  const { t } = useTranslation();
  const enabling = String(provider.status ?? '') !== 'active';
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const providerLabel = String(provider.displayName ?? provider.providerCode ?? provider.id ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError(t('admin.commerce.payments.providers.form.reasonRequired', 'A reason is required for the audit trail.'));
      return;
    }
    onSubmit(reason.trim());
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={enabling
        ? t('admin.commerce.payments.providers.enable.title', 'Enable payment provider')
        : t('admin.commerce.payments.providers.disable.title', 'Disable payment provider')}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
        {enabling
          ? t('admin.commerce.payments.providers.enable.desc', 'Provider {{provider}} will be re-enabled for new payments.', { provider: providerLabel })
          : t('admin.commerce.payments.providers.disable.desc', 'Provider {{provider}} will stop receiving new payments. Existing payments keep their lifecycle.', { provider: providerLabel })}
      </p>
      <TextField
        description={t('admin.commerce.payments.providers.form.reasonDesc', 'Recorded in the audit trail for this change.')}
        label={t('admin.commerce.payments.providers.form.reason', 'Reason')}
        required
        value={reason}
        onChange={setReason}
      />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Channel form
// ---------------------------------------------------------------------------

export interface ChannelFormDialogProps {
  mode?: 'create' | 'edit';
  initial?: PaymentChannelFormValues;
  saving: boolean;
  onClose(): void;
  onSubmit(values: PaymentChannelFormValues): void;
}

export function ChannelFormDialog({ mode = 'create', initial, saving, onClose, onSubmit }: ChannelFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<PaymentChannelFormValues>(() => initial ?? emptyChannelFormValues());
  const [error, setError] = useState<string | null>(null);
  const providerAccounts = useProviderAccountOptions();
  const methods = useMethodOptions();
  const providerOptions = useDictionaryOptions('payment_provider', PROVIDER_CODES);
  const sceneOptions = useDictionaryOptions('payment_scene', SCENE_OPTIONS);
  const statusOptions = useDictionaryOptions('payment_status', STATUS_OPTIONS);
  const set = <K extends keyof PaymentChannelFormValues>(key: K, value: PaymentChannelFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.channelNo.trim()) {
      setError(t('admin.commerce.payments.channels.form.channelNoRequired', 'Channel no is required.'));
      return;
    }
    if (!values.providerAccountId.trim()) {
      setError(t('admin.commerce.payments.channels.form.providerAccountRequired', 'Provider account is required.'));
      return;
    }
    if (!values.methodId.trim()) {
      setError(t('admin.commerce.payments.channels.form.methodRequired', 'Payment method is required.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={mode === 'create'
        ? t('admin.commerce.payments.channels.create.title', 'Create payment channel')
        : t('admin.commerce.payments.channels.edit.title', 'Edit payment channel')}
    >
      {/* Channel no identifies the routing channel and is immutable after creation. */}
      <TextField disabled={mode === 'edit'} label={t('admin.commerce.payments.channels.form.channelNo', 'Channel no')} required value={values.channelNo} onChange={(value) => set('channelNo', value)} />
      <TextField label={t('admin.commerce.payments.channels.form.channelName', 'Channel name')} value={values.channelName} onChange={(value) => set('channelName', value)} />
      <SelectField label={t('admin.commerce.payments.channels.form.providerAccountId', 'Provider account')} value={values.providerAccountId} onChange={(value) => set('providerAccountId', value)} options={providerAccounts.map((account) => ({ label: providerAccountOptionLabel(account, i18n.language), value: String(account.id ?? '') }))} />
      <SelectField label={t('admin.commerce.payments.channels.form.methodId', 'Payment method')} value={values.methodId} onChange={(value) => set('methodId', value)} options={methods.map((method) => ({ label: String(method.methodKey ?? method.id ?? ''), value: String(method.id ?? '') }))} />
      <SelectField label={t('admin.commerce.payments.channels.form.providerCode', 'Provider')} value={values.providerCode} onChange={(value) => set('providerCode', value)} options={providerOptions} />
      <SelectField label={t('admin.commerce.payments.channels.form.sceneCode', 'Scene')} value={values.sceneCode} onChange={(value) => set('sceneCode', value)} options={sceneOptions} translateOptionPrefix="admin.commerce.payments.value.scene" />
      <DialogFieldLabel label={t('admin.commerce.payments.channels.form.currencyCode', 'Currency code')}>
        <SdkworkBaseDataCurrencySelect
          emptyText={t('admin.commerce.payments.form.currencyEmpty', 'No matching currency')}
          maxLength={3}
          placeholder="CNY"
          searchPlaceholder={t('admin.commerce.payments.form.currencySearch', 'Search currency by code or name')}
          value={values.currencyCode}
          onValueChange={(value) => set('currencyCode', value)}
        />
      </DialogFieldLabel>
      <DialogFieldLabel label={t('admin.commerce.payments.channels.form.countryCode', 'Country code')}>
        <SdkworkBaseDataCountrySelect
          emptyText={t('admin.commerce.payments.form.countryEmpty', 'No matching country')}
          maxLength={2}
          placeholder="CN"
          searchPlaceholder={t('admin.commerce.payments.form.countrySearch', 'Search country by code or name')}
          value={values.countryCode}
          onValueChange={(value) => set('countryCode', value)}
        />
      </DialogFieldLabel>
      <TextField label={t('admin.commerce.payments.channels.form.priority', 'Priority')} type="number" value={values.priority} onChange={(value) => set('priority', value)} />
      <TextField label={t('admin.commerce.payments.channels.form.sortOrder', 'Sort order')} type="number" value={values.sortOrder} onChange={(value) => set('sortOrder', value)} />
      <SelectField label={t('admin.commerce.payments.channels.form.status', 'Status')} value={values.status} onChange={(value) => set('status', value)} options={statusOptions} translateOptionPrefix="admin.commerce.payments.value.status" />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Route rule form
// ---------------------------------------------------------------------------

export interface RouteRuleFormDialogProps {
  mode: 'create' | 'edit';
  initial?: RouteRuleFormValues;
  saving: boolean;
  onClose(): void;
  onSubmit(values: RouteRuleFormValues): void;
}

export function RouteRuleFormDialog({ mode, initial, saving, onClose, onSubmit }: RouteRuleFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<RouteRuleFormValues>(() => initial ?? emptyRouteRuleFormValues());
  const [error, setError] = useState<string | null>(null);
  const channels = useChannelOptions();
  const statusOptions = useDictionaryOptions('payment_status', STATUS_OPTIONS);
  const set = <K extends keyof RouteRuleFormValues>(key: K, value: RouteRuleFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.ruleNo.trim()) {
      setError(t('admin.commerce.payments.routeRules.form.ruleNoRequired', 'Rule no is required.'));
      return;
    }
    if (!values.channelId.trim()) {
      setError(t('admin.commerce.payments.routeRules.form.channelRequired', 'Channel is required.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={mode === 'create' ? t('admin.commerce.payments.routeRules.create.title', 'Create route rule') : t('admin.commerce.payments.routeRules.edit.title', 'Edit route rule')}
    >
      <TextField disabled={mode === 'edit'} label={t('admin.commerce.payments.routeRules.form.ruleNo', 'Rule no')} required value={values.ruleNo} onChange={(value) => set('ruleNo', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.priority', 'Priority')} type="number" value={values.priority} onChange={(value) => set('priority', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.purchaseType', 'Purchase type')} value={values.purchaseType} onChange={(value) => set('purchaseType', value)} />
      <DialogFieldLabel label={t('admin.commerce.payments.routeRules.form.countryCode', 'Country code')}>
        <SdkworkBaseDataCountrySelect
          emptyText={t('admin.commerce.payments.form.countryEmpty', 'No matching country')}
          maxLength={2}
          placeholder="CN"
          searchPlaceholder={t('admin.commerce.payments.form.countrySearch', 'Search country by code or name')}
          value={values.countryCode}
          onValueChange={(value) => set('countryCode', value)}
        />
      </DialogFieldLabel>
      <DialogFieldLabel label={t('admin.commerce.payments.routeRules.form.currencyCode', 'Currency code')}>
        <SdkworkBaseDataCurrencySelect
          emptyText={t('admin.commerce.payments.form.currencyEmpty', 'No matching currency')}
          maxLength={3}
          placeholder="CNY"
          searchPlaceholder={t('admin.commerce.payments.form.currencySearch', 'Search currency by code or name')}
          value={values.currencyCode}
          onValueChange={(value) => set('currencyCode', value)}
        />
      </DialogFieldLabel>
      <TextField label={t('admin.commerce.payments.routeRules.form.clientPlatform', 'Client platform')} value={values.clientPlatform} onChange={(value) => set('clientPlatform', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.amountMin', 'Amount min')} value={values.amountMin} onChange={(value) => set('amountMin', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.amountMax', 'Amount max')} value={values.amountMax} onChange={(value) => set('amountMax', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.userSegment', 'User segment')} value={values.userSegment} onChange={(value) => set('userSegment', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.riskLevel', 'Risk level')} value={values.riskLevel} onChange={(value) => set('riskLevel', value)} />
      <SelectField label={t('admin.commerce.payments.routeRules.form.channelId', 'Channel')} value={values.channelId} onChange={(value) => set('channelId', value)} options={channels.map((channel) => ({ label: String(channel.channelNo ?? channel.id ?? ''), value: String(channel.id ?? '') }))} />
      <SelectField label={t('admin.commerce.payments.routeRules.form.status', 'Status')} value={values.status} onChange={(value) => set('status', value)} options={statusOptions} translateOptionPrefix="admin.commerce.payments.value.status" />
      <TextField label={t('admin.commerce.payments.routeRules.form.startsAt', 'Starts at')} type="datetime-local" value={values.startsAt} onChange={(value) => set('startsAt', value)} />
      <TextField label={t('admin.commerce.payments.routeRules.form.endsAt', 'Ends at')} type="datetime-local" value={values.endsAt} onChange={(value) => set('endsAt', value)} />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Reconciliation run form
// ---------------------------------------------------------------------------

export interface ReconciliationRunFormDialogProps {
  saving: boolean;
  onClose(): void;
  onSubmit(values: ReconciliationRunFormValues): void;
}

export function ReconciliationRunFormDialog({ saving, onClose, onSubmit }: ReconciliationRunFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<ReconciliationRunFormValues>(emptyReconciliationRunFormValues);
  const [error, setError] = useState<string | null>(null);
  const providerAccounts = useProviderAccountOptions();
  const providerOptions = useDictionaryOptions('payment_provider', PROVIDER_CODES);
  const reconciliationTypeOptions = useDictionaryOptions('reconciliation_type', RECONCILIATION_TYPE_OPTIONS);
  const set = <K extends keyof ReconciliationRunFormValues>(key: K, value: ReconciliationRunFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.providerAccountId.trim() || !values.periodStart || !values.periodEnd || !values.currencyCode.trim()) {
      setError(t('admin.commerce.payments.reconciliationRuns.form.required', 'Provider, account, type, period, and currency are required.'));
      return;
    }
    if (new Date(values.periodEnd).getTime() <= new Date(values.periodStart).getTime()) {
      setError(t('admin.commerce.payments.reconciliationRuns.form.periodInvalid', 'Period end must be after period start.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog onClose={onClose} onSubmit={handleSubmit} saving={saving} title={t('admin.commerce.payments.reconciliationRuns.create.title', 'Create reconciliation run')}>
      <SelectField label={t('admin.commerce.payments.reconciliationRuns.form.providerCode', 'Provider')} value={values.providerCode} onChange={(value) => set('providerCode', value)} options={providerOptions} />
      <SelectField label={t('admin.commerce.payments.reconciliationRuns.form.providerAccountId', 'Provider account')} value={values.providerAccountId} onChange={(value) => set('providerAccountId', value)} options={providerAccounts.map((account) => ({ label: providerAccountOptionLabel(account, i18n.language), value: String(account.id ?? '') }))} />
      <SelectField label={t('admin.commerce.payments.reconciliationRuns.form.reconciliationType', 'Reconciliation type')} value={values.reconciliationType} onChange={(value) => set('reconciliationType', value)} options={reconciliationTypeOptions} translateOptionPrefix="admin.commerce.payments.value.reconciliationType" />
      <TextField label={t('admin.commerce.payments.reconciliationRuns.form.periodStart', 'Period start')} required type="datetime-local" value={values.periodStart} onChange={(value) => set('periodStart', value)} />
      <TextField label={t('admin.commerce.payments.reconciliationRuns.form.periodEnd', 'Period end')} required type="datetime-local" value={values.periodEnd} onChange={(value) => set('periodEnd', value)} />
      <DialogFieldLabel label={t('admin.commerce.payments.reconciliationRuns.form.currencyCode', 'Currency code')}>
        <SdkworkBaseDataCurrencySelect
          emptyText={t('admin.commerce.payments.form.currencyEmpty', 'No matching currency')}
          maxLength={3}
          placeholder="CNY"
          searchPlaceholder={t('admin.commerce.payments.form.currencySearch', 'Search currency by code or name')}
          value={values.currencyCode}
          onValueChange={(value) => set('currencyCode', value)}
        />
      </DialogFieldLabel>
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 md:col-span-2" role="alert">
      {message}
    </div>
  );
}

function readText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Build channel form values from a list row for the edit dialog. */
export function channelFormValuesFromRecord(record: AdminResourceRecord): PaymentChannelFormValues {
  return {
    channelNo: readText(record.channelNo ?? record.id),
    channelName: readText(record.channelName),
    providerAccountId: readText(record.providerAccountId),
    methodId: readText(record.methodId),
    providerCode: readText(record.providerCode),
    sceneCode: readText(record.sceneCode),
    currencyCode: readText(record.currencyCode),
    countryCode: readText(record.countryCode),
    priority: record.priority === undefined ? '' : String(record.priority),
    sortOrder: record.sortOrder === undefined ? '' : String(record.sortOrder),
    status: readText(record.status) || 'active',
  };
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function optionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toLocalInputValue(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
