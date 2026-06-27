import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MembershipFormActions,
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import {
  formatMembershipFormValidationError,
  parseRequiredMoneyAmountField,
  parseRequiredPositiveIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminPackageGroup,
  MembershipsAdminPackageItem,
  MembershipsAdminPackageMutationInput,
  MembershipsAdminPlanItem,
} from '../membershipsService';

const baseCurrencyCodeOptions = [
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
];

const baseDurationDayOptions = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '365 days' },
];

interface MembershipPackageDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPackageItem | null;
  groups: MembershipsAdminPackageGroup[];
  plans: MembershipsAdminPlanItem[];
  defaultGroupId?: string | null;
  translationKeyPrefix?: string;
  onCancel: () => void;
  onSubmit: (input: MembershipsAdminPackageMutationInput) => Promise<void>;
}

export function MembershipPackageDrawerForm({
  mode,
  initialValue,
  groups,
  plans,
  defaultGroupId,
  translationKeyPrefix = 'admin.commerce.memberships.packages',
  onCancel,
  onSubmit,
}: MembershipPackageDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [packageGroupId, setPackageGroupId] = useState(initialValue?.groupId ?? defaultGroupId ?? groups[0]?.id ?? '');
  const [planId, setPlanId] = useState(initialValue?.planId ?? plans[0]?.id ?? '');
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount ?? '');
  const [currencyCode, setCurrencyCode] = useState(normalizeCurrencyCodeValue(initialValue?.currencyCode));
  const [durationDays, setDurationDays] = useState(String(initialValue?.durationDays ?? 30));
  const [status, setStatus] = useState<'active' | 'inactive' | 'disabled'>(
    initialValue?.status === 'inactive' || initialValue?.status === 'disabled'
      ? initialValue.status
      : 'active',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currencyCodeOptions = includeCurrentOption(baseCurrencyCodeOptions, currencyCode);
  const durationDayOptions = includeCurrentOption(
    baseDurationDayOptions,
    durationDays,
    t(`${translationKeyPrefix}.form.durationOptionDays`, '{{days}} days', { days: durationDays }),
  );

  const handleSubmit = async () => {
    setIsSaving(true);
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
        status,
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t(`${translationKeyPrefix}.form.error`, 'Membership package could not be saved'),
      ));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MembershipFormFrame error={error}>
      <MembershipTextField label={t(`${translationKeyPrefix}.form.name`, 'Package Name')} value={name} onChange={setName} placeholder={t(`${translationKeyPrefix}.form.namePlaceholder`, 'Monthly Pro')} />
      <MembershipSelectField
        label={t(`${translationKeyPrefix}.form.group`, 'Package Group')}
        value={packageGroupId}
        placeholder={t(`${translationKeyPrefix}.form.selectGroup`, 'Select group')}
        options={groups.map((group) => ({ value: group.id, label: group.name }))}
        onChange={setPackageGroupId}
      />
      <MembershipSelectField
        label={t(`${translationKeyPrefix}.form.plan`, 'Plan')}
        value={planId}
        placeholder={t(`${translationKeyPrefix}.form.selectPlan`, 'Select plan')}
        options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
        onChange={setPlanId}
      />
      <div className="grid grid-cols-2 gap-4">
        <MembershipTextField label={t(`${translationKeyPrefix}.form.price`, 'Price')} value={priceAmount} onChange={setPriceAmount} placeholder="69.90" />
        <MembershipSelectField
          label={t(`${translationKeyPrefix}.form.currency`, 'Currency')}
          value={currencyCode}
          options={currencyCodeOptions}
          onChange={(value) => setCurrencyCode(normalizeCurrencyCodeValue(value))}
        />
      </div>
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
            { value: 'active' },
            { value: 'inactive' },
            { value: 'disabled' },
          ]}
          onChange={(value) => setStatus(value as 'active' | 'inactive' | 'disabled')}
        />
      </div>
      <MembershipFormActions
        submitLabel={mode === 'edit'
          ? t(`${translationKeyPrefix}.form.updateSubmit`, 'Update Package')
          : t(`${translationKeyPrefix}.form.submit`, 'Create Package')}
        isSaving={isSaving}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </MembershipFormFrame>
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
