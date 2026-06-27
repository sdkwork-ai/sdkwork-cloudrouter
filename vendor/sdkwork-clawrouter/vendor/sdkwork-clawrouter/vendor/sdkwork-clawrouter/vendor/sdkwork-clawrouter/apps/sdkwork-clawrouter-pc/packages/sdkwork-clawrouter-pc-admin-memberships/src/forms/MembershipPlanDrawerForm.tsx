import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  MembershipFormActions,
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import {
  formatMembershipFormValidationError,
  parseOptionalNonNegativeIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminPlanBenefitInput,
  MembershipsAdminPlanItem,
  MembershipsAdminPlanMutationInput,
} from '../membershipsService';

interface MembershipPlanDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPlanItem | null;
  onCancel: () => void;
  onSubmit: (input: MembershipsAdminPlanMutationInput) => Promise<void>;
}

type MembershipPlanBenefitFormValue = Omit<MembershipsAdminPlanBenefitInput, 'usageLimit'> & {
  usageLimitText: string;
};

const baseBenefitTypeOptions = [
  { value: 'quota', label: 'Quota' },
  { value: 'feature', label: 'Feature' },
  { value: 'discount', label: 'Discount' },
  { value: 'service', label: 'Service' },
];

export function MembershipPlanDrawerForm({
  mode,
  initialValue,
  onCancel,
  onSubmit,
}: MembershipPlanDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [rank, setRank] = useState(String(initialValue?.rank ?? 0));
  const [status, setStatus] = useState<'active' | 'inactive' | 'disabled'>(
    initialValue?.status === 'inactive' || initialValue?.status === 'disabled'
      ? initialValue.status
      : 'active',
  );
  const [benefits, setBenefits] = useState<MembershipPlanBenefitFormValue[]>(
    initialValue?.benefits?.length
      ? initialValue.benefits.map(toMembershipPlanBenefitFormValue)
      : [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        code: mode === 'edit' && (initialValue?.planNo || initialValue?.levelCode)
          ? initialValue.planNo || initialValue.levelCode
          : buildMembershipPlanCode(name),
        name,
        rank: parseOptionalNonNegativeIntegerField(rank, t('admin.commerce.memberships.plans.form.rank', 'Rank')),
        status,
        benefits: benefits
          .filter((benefit) => benefit.name.trim())
          .map(toMembershipPlanBenefitInput),
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t('admin.commerce.memberships.plans.form.error', 'Membership plan could not be saved'),
      ));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MembershipFormFrame error={error}>
      <MembershipTextField label={t('admin.commerce.memberships.plans.form.name', 'Name')} value={name} onChange={setName} placeholder={t('admin.commerce.memberships.plans.form.namePlaceholder', 'Gold Member')} />
      <div className="grid grid-cols-2 gap-4">
        <MembershipTextField label={t('admin.commerce.memberships.plans.form.rank', 'Rank')} value={rank} onChange={setRank} placeholder="0" />
        <MembershipSelectField
          label={t('admin.commerce.memberships.plans.form.status', 'Status')}
          value={status}
          options={[
            { value: 'active' },
            { value: 'inactive' },
            { value: 'disabled' },
          ]}
          onChange={(value) => setStatus(value as 'active' | 'inactive' | 'disabled')}
        />
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.commerce.memberships.plans.form.benefits', 'Benefits')}</span>
          <button
            type="button"
            onClick={() => setBenefits((current) => [...current, { name: '', benefitKey: '', type: 'quota', usageLimitText: '' }])}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.plans.form.addBenefit', 'Add')}
          </button>
        </div>
        <div className="flex flex-col gap-3 p-3">
          {benefits.length === 0 ? (
            <p className="text-sm text-slate-400">{t('admin.commerce.memberships.plans.form.noBenefits', 'No benefits')}</p>
          ) : benefits.map((benefit, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-100 p-3 dark:border-white/5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setBenefits((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={t('admin.commerce.memberships.plans.form.removeBenefit', 'Remove benefit')}
                  title={t('admin.commerce.memberships.plans.form.removeBenefit', 'Remove benefit')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.benefitName', 'Name')} value={benefit.name} onChange={(value) => updateBenefit(index, { name: value })} />
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.benefitKey', 'Benefit key')} value={benefit.benefitKey ?? ''} onChange={(value) => updateBenefit(index, { benefitKey: value })} />
              <MembershipSelectField
                label={t('admin.commerce.memberships.plans.form.benefitType', 'Type')}
                value={benefit.type ?? 'quota'}
                options={benefitTypeOptions(benefit.type)}
                onChange={(value) => updateBenefit(index, { type: value || 'quota' })}
              />
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.usageLimit', 'Usage limit')} value={benefit.usageLimitText} onChange={(value) => updateBenefit(index, { usageLimitText: value })} />
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.description', 'Description')} value={benefit.description ?? ''} onChange={(value) => updateBenefit(index, { description: value })} />
            </div>
          ))}
        </div>
      </div>
      <MembershipFormActions
        submitLabel={mode === 'edit'
          ? t('admin.commerce.memberships.plans.form.updateSubmit', 'Update Level')
          : t('admin.commerce.memberships.plans.form.submit', 'Create Level')}
        isSaving={isSaving}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </MembershipFormFrame>
  );

  function updateBenefit(index: number, patch: Partial<MembershipPlanBenefitFormValue>) {
    setBenefits((current) => current.map((benefit, itemIndex) => (
      itemIndex === index ? { ...benefit, ...patch } : benefit
    )));
  }

  function toMembershipPlanBenefitInput(benefit: MembershipPlanBenefitFormValue): MembershipsAdminPlanBenefitInput {
    const { usageLimitText, ...input } = benefit;
    return {
      ...input,
      usageLimit: parseOptionalNonNegativeIntegerField(
        usageLimitText,
        t('admin.commerce.memberships.plans.form.usageLimit', 'Usage limit'),
      ),
    };
  }
}

function toMembershipPlanBenefitFormValue(
  benefit: MembershipsAdminPlanBenefitInput,
): MembershipPlanBenefitFormValue {
  const { usageLimit, ...input } = benefit;
  return {
    ...input,
    usageLimitText: usageLimit === undefined ? '' : String(usageLimit),
  };
}

function buildMembershipPlanCode(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = Date.now().toString(36).slice(-6);
  return `membership-${normalizedName || 'plan'}-${suffix}`;
}

function benefitTypeOptions(currentType: string | undefined): Array<{ value: string; label: string }> {
  const normalizedCurrentType = currentType?.trim() ?? '';
  if (!normalizedCurrentType || baseBenefitTypeOptions.some((option) => option.value === normalizedCurrentType)) {
    return baseBenefitTypeOptions;
  }
  return [...baseBenefitTypeOptions, { value: normalizedCurrentType, label: normalizedCurrentType }];
}
