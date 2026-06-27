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
  parseOptionalNonNegativeIntegerField,
  parseRequiredPositiveIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminPackageGroup,
  MembershipsAdminPackageGroupMutationInput,
} from '../membershipsService';

type MembershipPackageGroupBillingCycle = 'one_time' | 'day' | 'week' | 'month' | 'quarter' | 'year';

const billingCycleDurationDays: Record<MembershipPackageGroupBillingCycle, string> = {
  one_time: '30',
  day: '1',
  week: '7',
  month: '30',
  quarter: '90',
  year: '365',
};

const baseDurationDayOptions = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '365 days' },
];

interface MembershipPackageGroupDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPackageGroup | null;
  onCancel: () => void;
  onSubmit: (input: MembershipsAdminPackageGroupMutationInput) => Promise<void>;
}

export function MembershipPackageGroupDrawerForm({
  mode,
  initialValue,
  onCancel,
  onSubmit,
}: MembershipPackageGroupDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [billingCycle, setBillingCycle] = useState<MembershipPackageGroupBillingCycle>(
    normalizeBillingCycle(initialValue?.billingCycle),
  );
  const [durationDays, setDurationDays] = useState(String(initialValue?.durationDays ?? 30));
  const [sortWeight, setSortWeight] = useState(String(initialValue?.sortWeight ?? 0));
  const [status, setStatus] = useState<'active' | 'inactive' | 'disabled'>(
    initialValue?.status === 'inactive' || initialValue?.status === 'disabled'
      ? initialValue.status
      : 'active',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const billingCycleOptions = [
    { value: 'one_time', label: t('admin.commerce.memberships.groups.form.billingCycle.oneTime', 'One-time') },
    { value: 'day', label: t('admin.commerce.memberships.groups.form.billingCycle.day', 'Daily') },
    { value: 'week', label: t('admin.commerce.memberships.groups.form.billingCycle.week', 'Weekly') },
    { value: 'month', label: t('admin.commerce.memberships.groups.form.billingCycle.month', 'Monthly') },
    { value: 'quarter', label: t('admin.commerce.memberships.groups.form.billingCycle.quarter', 'Quarterly') },
    { value: 'year', label: t('admin.commerce.memberships.groups.form.billingCycle.year', 'Yearly') },
  ] satisfies Array<{ value: MembershipPackageGroupBillingCycle; label: string }>;
  const durationDayOptions = includeCurrentOption(
    baseDurationDayOptions,
    durationDays,
    t('admin.commerce.memberships.groups.form.durationOptionDays', '{{days}} days', { days: durationDays }),
  );

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        code: mode === 'edit' && initialValue?.code ? initialValue.code : buildPackageGroupCode(name),
        name,
        description,
        billingCycle,
        durationDays: parseRequiredPositiveIntegerField(durationDays, t('admin.commerce.memberships.groups.form.duration', 'Duration days')),
        sortWeight: parseOptionalNonNegativeIntegerField(sortWeight, t('admin.commerce.memberships.groups.form.sortWeight', 'Sort weight')),
        status,
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t('admin.commerce.memberships.groups.form.error', 'Package group could not be saved'),
      ));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MembershipFormFrame error={error}>
      <MembershipTextField label={t('admin.commerce.memberships.groups.form.name', 'Group Name')} value={name} onChange={setName} placeholder={t('admin.commerce.memberships.groups.form.namePlaceholder', 'Monthly packages')} />
      <MembershipTextField label={t('admin.commerce.memberships.groups.form.description', 'Description')} value={description} onChange={setDescription} />
      <div className="grid grid-cols-2 gap-4">
        <MembershipSelectField
          label={t('admin.commerce.memberships.groups.form.billingCycle', 'Billing cycle')}
          value={billingCycle}
          options={billingCycleOptions}
          onChange={(value) => handleBillingCycleChange(normalizeBillingCycle(value))}
        />
        <MembershipSelectField
          label={t('admin.commerce.memberships.groups.form.duration', 'Duration days')}
          value={durationDays}
          options={durationDayOptions}
          onChange={(value) => setDurationDays(value || billingCycleDurationDays[billingCycle])}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MembershipTextField label={t('admin.commerce.memberships.groups.form.sortWeight', 'Sort weight')} value={sortWeight} onChange={setSortWeight} />
        <MembershipSelectField
          label={t('admin.commerce.memberships.groups.form.status', 'Status')}
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
          ? t('admin.commerce.memberships.groups.form.updateSubmit', 'Update Group')
          : t('admin.commerce.memberships.groups.form.submit', 'Create Group')}
        isSaving={isSaving}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </MembershipFormFrame>
  );

  function handleBillingCycleChange(value: MembershipPackageGroupBillingCycle) {
    setBillingCycle(value);
    setDurationDays(billingCycleDurationDays[value]);
  }
}

function buildPackageGroupCode(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = Date.now().toString(36).slice(-6);
  return `membership-${normalizedName || 'group'}-${suffix}`;
}

function normalizeBillingCycle(value: string | undefined): MembershipPackageGroupBillingCycle {
  switch (value) {
    case 'one_time':
    case 'day':
    case 'week':
    case 'month':
    case 'quarter':
    case 'year':
      return value;
    default:
      return 'month';
  }
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
