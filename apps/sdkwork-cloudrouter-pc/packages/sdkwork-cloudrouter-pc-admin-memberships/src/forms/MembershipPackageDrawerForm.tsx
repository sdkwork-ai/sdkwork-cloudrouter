import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SdkworkBaseDataCurrencySelect } from '@sdkwork/appbase-pc-react';
import {
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import { membershipStatusLabel } from '../components/MembershipStatusBadge';
import {
  formatMembershipFormValidationError,
  parseRequiredDiscountField,
  parseRequiredMoneyAmountField,
  parseRequiredPositiveIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminPackageGroup,
  MembershipsAdminPackageItem,
  MembershipsAdminPackageMutationInput,
  MembershipsAdminPlanItem,
} from '../membershipsService';

// Base-data currency options (sdkwork-appbase base_currency) with a minimal
// fallback set so the select keeps working during a base-data outage.
const fallbackCurrencyCodeOptions = [
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
] as const;

const baseDurationDayValues = ['1', '7', '30', '90', '365'];

interface MembershipPackageDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPackageItem | null;
  groups: MembershipsAdminPackageGroup[];
  plans: MembershipsAdminPlanItem[];
  defaultGroupId?: string | null;
  groupPagination?: MembershipReferencePagination;
  planPagination?: MembershipReferencePagination;
  translationKeyPrefix?: string;
  onSubmit: (input: MembershipsAdminPackageMutationInput) => Promise<void>;
}

interface MembershipReferencePagination {
  page: number;
  hasNextPage: boolean;
  isLoading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export function MembershipPackageDrawerForm({
  mode,
  initialValue,
  groups,
  plans,
  defaultGroupId,
  groupPagination,
  planPagination,
  translationKeyPrefix = 'admin.commerce.memberships.packages',
  onSubmit,
}: MembershipPackageDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [packageGroupId, setPackageGroupId] = useState(initialValue?.groupId ?? defaultGroupId ?? groups[0]?.id ?? '');
  const [planId, setPlanId] = useState(initialValue?.planId ?? plans[0]?.id ?? '');
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount ?? '');
  const [currencyCode, setCurrencyCode] = useState(normalizeCurrencyCodeValue(initialValue?.currencyCode));
  const [durationDays, setDurationDays] = useState(String(initialValue?.durationDays ?? 30));
  const [discount, setDiscount] = useState(String(initialValue?.discount ?? 100));
  const [status, setStatus] = useState<'active' | 'inactive' | 'disabled'>(
    initialValue?.status === 'inactive' || initialValue?.status === 'disabled'
      ? initialValue.status
      : 'active',
  );
  const [error, setError] = useState<string | null>(null);
  const durationDayOptions = includeCurrentOption(
    membershipDurationDayOptions(t, translationKeyPrefix),
    durationDays,
    t(`${translationKeyPrefix}.form.durationOptionDays`, '{{days}} days', { days: durationDays }),
  );
  const groupOptions = includeCurrentOption(
    groups.map((group) => ({ value: group.id, label: group.name })),
    packageGroupId,
  );
  const planOptions = includeCurrentOption(
    plans.map((plan) => ({ value: plan.id, label: plan.name })),
    planId,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        code: mode === 'edit' && initialValue?.packageNo ? initialValue.packageNo : buildMembershipPackageCode(name),
        packageGroupId,
        planId,
        name,
        priceAmount: parseRequiredMoneyAmountField(priceAmount, t(`${translationKeyPrefix}.form.price`, 'Price')),
        currencyCode,
        durationDays: parseRequiredPositiveIntegerField(durationDays, t(`${translationKeyPrefix}.form.duration`, 'Duration days')),
        discount: parseRequiredDiscountField(discount, t(`${translationKeyPrefix}.form.discount`, 'Discount')),
        status,
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t(`${translationKeyPrefix}.form.error`, 'Membership package could not be saved'),
      ));
    }
  };

  return (
    <MembershipFormFrame
      error={error}
      formId="membership-package-form"
      onSubmit={handleSubmit}
    >
      <MembershipTextField label={t(`${translationKeyPrefix}.form.name`, 'Package Name')} value={name} onChange={setName} placeholder={t(`${translationKeyPrefix}.form.namePlaceholder`, 'Monthly Pro')} />
      <MembershipSelectField
        label={t(`${translationKeyPrefix}.form.group`, 'Package Group')}
        value={packageGroupId}
        placeholder={t(`${translationKeyPrefix}.form.selectGroup`, 'Select group')}
        options={groupOptions}
        onChange={setPackageGroupId}
      />
      {groupPagination ? (
        <MembershipReferencePageControls
          pagination={groupPagination}
          previousLabel={t('common.pagination.previous', 'Previous page')}
          nextLabel={t('common.pagination.next', 'Next page')}
          pageLabel={t('admin.commerce.memberships.pagination.page', 'Page {{page}}', { page: groupPagination.page })}
        />
      ) : null}
      <MembershipSelectField
        label={t(`${translationKeyPrefix}.form.plan`, 'Plan')}
        value={planId}
        placeholder={t(`${translationKeyPrefix}.form.selectPlan`, 'Select plan')}
        options={planOptions}
        onChange={setPlanId}
      />
      {planPagination ? (
        <MembershipReferencePageControls
          pagination={planPagination}
          previousLabel={t('common.pagination.previous', 'Previous page')}
          nextLabel={t('common.pagination.next', 'Next page')}
          pageLabel={t('admin.commerce.memberships.pagination.page', 'Page {{page}}', { page: planPagination.page })}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <MembershipTextField label={t(`${translationKeyPrefix}.form.price`, 'Price')} value={priceAmount} onChange={setPriceAmount} placeholder="69.90" />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t(`${translationKeyPrefix}.form.currency`, 'Currency')}
          </span>
          <SdkworkBaseDataCurrencySelect
            emptyText={t(`${translationKeyPrefix}.form.currencyEmpty`, 'No matching currency')}
            fallbackOptions={fallbackCurrencyCodeOptions}
            searchPlaceholder={t(`${translationKeyPrefix}.form.currencySearch`, 'Search currency by code or name')}
            value={currencyCode}
            onValueChange={(value) => setCurrencyCode(normalizeCurrencyCodeValue(value))}
          />
        </label>
      </div>
      <MembershipTextField
        label={t(`${translationKeyPrefix}.form.discount`, 'Discount')}
        hint={t(`${translationKeyPrefix}.form.discountHint`, 'Discount rate percentage: 100 means no discount, 90 means pay 90% of the price.')}
        value={discount}
        onChange={setDiscount}
        placeholder="100"
        type="number"
      />
      <div className="grid grid-cols-2 gap-4">
        <MembershipSelectField
          label={t(`${translationKeyPrefix}.form.duration`, 'Duration days')}
          value={durationDays}
          options={durationDayOptions}
          onChange={(value) => setDurationDays(value || '30')}
        />
        <MembershipSelectField
          label={t(`${translationKeyPrefix}.form.status`, 'Status')}
          value={status}
          options={[
            { value: 'active', label: membershipStatusLabel('active', t) },
            { value: 'inactive', label: membershipStatusLabel('inactive', t) },
            { value: 'disabled', label: membershipStatusLabel('disabled', t) },
          ]}
          onChange={(value) => setStatus(value as 'active' | 'inactive' | 'disabled')}
        />
      </div>
    </MembershipFormFrame>
  );
}

function MembershipReferencePageControls({
  pagination,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  pagination: MembershipReferencePagination;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        aria-label={previousLabel}
        title={previousLabel}
        disabled={pagination.isLoading || pagination.page <= 1}
        onClick={pagination.onPreviousPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-16 text-center text-xs text-slate-500 dark:text-slate-400">
        {pageLabel}
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        title={nextLabel}
        disabled={pagination.isLoading || !pagination.hasNextPage}
        onClick={pagination.onNextPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function buildMembershipPackageCode(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = Date.now().toString(36).slice(-6);
  return `membership-${normalizedName || 'package'}-${suffix}`;
}

function normalizeCurrencyCodeValue(value: string | undefined): string {
  const normalized = value?.trim().toUpperCase() ?? '';
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'CNY';
}

function includeCurrentOption(
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  currentLabel = currentValue,
): Array<{ value: string; label: string }> {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }
  return [...options, { value: currentValue, label: currentLabel }];
}

function membershipDurationDayOptions(
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
  translationKeyPrefix: string,
): Array<{ value: string; label: string }> {
  return baseDurationDayValues.map((value) => ({
    value,
    label: t(`${translationKeyPrefix}.form.durationOptionDays`, '{{days}} days', { days: value }),
  }));
}
