import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import { membershipStatusLabel } from '../components/MembershipStatusBadge';
import { membershipCategoryLabel } from '../components/MembershipCategoryBadge';
import { membershipAudienceLabel } from '../components/MembershipAudienceBadge';
import {
  formatMembershipFormValidationError,
  parseOptionalNonNegativeIntegerField,
  parseRequiredPositiveIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminAudience,
  MembershipsAdminCategory,
  MembershipsAdminPackageGroup,
  MembershipsAdminPackageGroupMutationInput,
} from '../membershipsService';

type MembershipPackageGroupBillingCycle = 'once' | 'day' | 'week' | 'month' | 'quarter' | 'year';

const billingCycleDurationDays: Record<MembershipPackageGroupBillingCycle, string> = {
  once: '30',
  day: '1',
  week: '7',
  month: '30',
  quarter: '90',
  year: '365',
};

const baseDurationDayValues = ['1', '7', '30', '90', '365'];

interface MembershipPackageGroupDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPackageGroup | null;
  onSubmit: (input: MembershipsAdminPackageGroupMutationInput) => Promise<void>;
}

export function MembershipPackageGroupDrawerForm({
  mode,
  initialValue,
  onSubmit,
}: MembershipPackageGroupDrawerFormProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<MembershipsAdminCategory>(
    initialValue?.category === 'community' ? 'community' : 'token',
  );
  const [audience, setAudience] = useState<MembershipsAdminAudience>(
    initialValue?.audience === 'team' ? 'team' : 'personal',
  );
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
  const [error, setError] = useState<string | null>(null);
  const billingCycleOptions = [
    { value: 'once', label: t('admin.commerce.memberships.groups.form.billingCycle.once', 'One-time') },
    { value: 'day', label: t('admin.commerce.memberships.groups.form.billingCycle.day', 'Daily') },
    { value: 'week', label: t('admin.commerce.memberships.groups.form.billingCycle.week', 'Weekly') },
    { value: 'month', label: t('admin.commerce.memberships.groups.form.billingCycle.month', 'Monthly') },
    { value: 'quarter', label: t('admin.commerce.memberships.groups.form.billingCycle.quarter', 'Quarterly') },
    { value: 'year', label: t('admin.commerce.memberships.groups.form.billingCycle.year', 'Yearly') },
  ] satisfies Array<{ value: MembershipPackageGroupBillingCycle; label: string }>;
  const durationDayOptions = includeCurrentOption(
    membershipDurationDayOptions(t),
    durationDays,
    t('admin.commerce.memberships.groups.form.durationOptionDays', '{{days}} days', { days: durationDays }),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        category,
        audience,
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
    }
  };

  return (
    <MembershipFormFrame
      error={error}
      formId="membership-package-group-form"
      onSubmit={handleSubmit}
    >
      <MembershipTextField label={t('admin.commerce.memberships.groups.form.name', 'Group Name')} value={name} onChange={setName} placeholder={t('admin.commerce.memberships.groups.form.namePlaceholder', 'Monthly packages')} />
      <MembershipSelectField
        label={t('admin.commerce.memberships.category.label', 'Category')}
        value={category}
        options={[
          { value: 'token', label: membershipCategoryLabel('token', t) },
          { value: 'community', label: membershipCategoryLabel('community', t) },
        ]}
        onChange={(value) => setCategory(value as MembershipsAdminCategory)}
      />
      <MembershipSelectField
        label={t('admin.commerce.memberships.audience.label', 'Audience')}
        value={audience}
        options={[
          { value: 'personal', label: membershipAudienceLabel('personal', t) },
          { value: 'team', label: membershipAudienceLabel('team', t) },
        ]}
        onChange={(value) => setAudience(value === 'team' ? 'team' : 'personal')}
      />
      <p className="-mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        {t(
          'admin.commerce.memberships.groups.form.audienceHint',
          'Packages in this group inherit the audience; it must match the audience of the plans they sell.',
        )}
      </p>
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
            { value: 'active', label: membershipStatusLabel('active', t) },
            { value: 'inactive', label: membershipStatusLabel('inactive', t) },
            { value: 'disabled', label: membershipStatusLabel('disabled', t) },
          ]}
          onChange={(value) => setStatus(value as 'active' | 'inactive' | 'disabled')}
        />
      </div>
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
    case 'once':
    case 'day':
    case 'week':
    case 'month':
    case 'quarter':
    case 'year':
      return value;
    // Legacy admin forms persisted the retired `one_time` spelling.
    case 'one_time':
      return 'once';
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

function membershipDurationDayOptions(
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
): Array<{ value: string; label: string }> {
  return baseDurationDayValues.map((value) => ({
    value,
    label: t('admin.commerce.memberships.groups.form.durationOptionDays', '{{days}} days', { days: value }),
  }));
}
