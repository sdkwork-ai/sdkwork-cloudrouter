import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import { membershipStatusLabel } from '../components/MembershipStatusBadge';
import { membershipCategoryLabel } from '../components/MembershipCategoryBadge';
import { membershipAudienceLabel } from '../components/MembershipAudienceBadge';
import { MembershipBillingCycleChips, MembershipPurchaseModelBadge } from '../components/MembershipPurchaseModelBadge';
import {
  formatMembershipFormValidationError,
  parseOptionalNonNegativeIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminAudience,
  MembershipsAdminCategory,
  MembershipsAdminPlanBenefitInput,
  MembershipsAdminPlanItem,
  MembershipsAdminPlanMutationInput,
} from '../membershipsService';

interface MembershipPlanDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminPlanItem | null;
  /** Audience preselected on create so the new plan lands in the current view. */
  defaultAudience?: MembershipsAdminAudience;
  onSubmit: (input: MembershipsAdminPlanMutationInput) => Promise<void>;
}

// Stable React keys for editable benefit rows (survive middle-row removal).
let nextBenefitRowUid = 0;
function makeBenefitRowUid(): string {
  nextBenefitRowUid += 1;
  return `benefit-row-${nextBenefitRowUid}`;
}

type MembershipPlanBenefitFormValue = Omit<MembershipsAdminPlanBenefitInput, 'usageLimit'> & {
  usageLimitText: string;
  rowUid: string;
};

// Benefit type vocabulary aligned with the backend CHECK constraint
// (points | feature | queue | quota | service); `discount` was removed when
// the vocabulary was standardised and legacy values map to `service`.
type MembershipBenefitType = 'points' | 'feature' | 'queue' | 'quota' | 'service';

const baseBenefitTypeValues: MembershipBenefitType[] = ['quota', 'feature', 'points', 'queue', 'service'];

const AUDIENCE_OPTIONS: Array<{ value: MembershipsAdminAudience; hintKey: string; hintFallback: string }> = [
  {
    value: 'personal',
    hintKey: 'admin.commerce.memberships.audience.personalHint',
    hintFallback: 'Single account',
  },
  {
    value: 'team',
    hintKey: 'admin.commerce.memberships.audience.teamHint',
    hintFallback: 'Organization seats',
  },
];

/**
 * Create / edit form for a membership plan.
 *
 * Two classification decisions sit at the top because they drive everything
 * else: the audience (who can buy) and the plan family. The purchase model is
 * never edited here — it belongs to the packages that sell the plan, and the
 * form shows the current coverage read-only instead of offering a second,
 * divergent source of truth.
 */
export function MembershipPlanDrawerForm({
  mode,
  initialValue,
  defaultAudience = 'personal',
  onSubmit,
}: MembershipPlanDrawerFormProps) {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<MembershipsAdminAudience>(
    initialValue?.audience ?? defaultAudience,
  );
  const [category, setCategory] = useState<MembershipsAdminCategory>(
    initialValue?.category === 'community' ? 'community' : 'token',
  );
  const [name, setName] = useState(initialValue?.name ?? '');
  const [code, setCode] = useState(initialValue?.planNo ?? initialValue?.levelCode ?? '');
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
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  /**
   * Audience is immutable while the plan still has sellable packages: a package
   * inherits its audience from the billing-period group and must match its plan,
   * so flipping the plan would leave a price list that can no longer be edited.
   * The server refuses the change too; locking the control here explains why
   * instead of surfacing a failed save.
   */
  const audienceLocked = isEdit && (initialValue?.packageCount ?? 0) > 0;
  const resolvedCode = isEdit ? (initialValue?.planNo || initialValue?.levelCode || '') : (code.trim() || buildMembershipPlanCode(name));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        category,
        audience,
        code: resolvedCode,
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
    }
  };

  return (
    <MembershipFormFrame
      error={error}
      formId="membership-plan-form"
      onSubmit={handleSubmit}
    >
      <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
        <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          {t('admin.commerce.memberships.plans.form.audience', 'Audience')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((option) => {
            const isActive = audience === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                disabled={audienceLocked}
                onClick={() => setAudience(option.value)}
                className={[
                  'flex min-w-32 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
                  audienceLocked ? 'cursor-not-allowed opacity-60' : '',
                  isActive
                    ? 'border-lobster-500 bg-lobster-50/70 ring-1 ring-lobster-500/30 dark:border-lobster-400/60 dark:bg-lobster-500/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5',
                ].join(' ')}
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {membershipAudienceLabel(option.value, t)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t(option.hintKey, option.hintFallback)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {audienceLocked
            ? t(
              'admin.commerce.memberships.plans.form.audienceLocked',
              'The audience is locked while this plan still has sellable packages. Move or disable them in Plans & pricing first, then switch the audience.',
            )
            : t(
              'admin.commerce.memberships.plans.form.audienceHint',
              'Enterprise plans are bought by an organization and licensed per seat; changing this later does not migrate existing subscriptions.',
            )}
        </p>
      </fieldset>

      <MembershipTextField
        label={t('admin.commerce.memberships.plans.form.name', 'Name')}
        value={name}
        onChange={setName}
        placeholder={t('admin.commerce.memberships.plans.form.namePlaceholder', 'Gold Member')}
      />
      <MembershipTextField
        label={t('admin.commerce.memberships.plans.form.code', 'Code')}
        value={resolvedCode}
        onChange={isEdit ? () => undefined : setCode}
        hint={isEdit
          ? t('admin.commerce.memberships.plans.form.codeLocked', 'The code is the plan identity used by orders and entitlements.')
          : t('admin.commerce.memberships.plans.form.codeHint', 'Letters, numbers, - and _ only. Generated from the name when empty.')}
      />
      <MembershipSelectField
        label={t('admin.commerce.memberships.category.label', 'Category')}
        value={category}
        options={[
          { value: 'token', label: membershipCategoryLabel('token', t) },
          { value: 'community', label: membershipCategoryLabel('community', t) },
        ]}
        onChange={(value) => setCategory(value as MembershipsAdminCategory)}
      />
      <div className="grid grid-cols-2 gap-4">
        <MembershipTextField label={t('admin.commerce.memberships.plans.form.rank', 'Rank')} value={rank} onChange={setRank} placeholder="0" />
        <MembershipSelectField
          label={t('admin.commerce.memberships.plans.form.status', 'Status')}
          value={status}
          options={[
            { value: 'active', label: membershipStatusLabel('active', t) },
            { value: 'inactive', label: membershipStatusLabel('inactive', t) },
            { value: 'disabled', label: membershipStatusLabel('disabled', t) },
          ]}
          onChange={(value) => setStatus(value as 'active' | 'inactive' | 'disabled')}
        />
      </div>

      {isEdit ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {t('admin.commerce.memberships.plans.form.coverage', 'Sellable coverage')}
            </span>
            <MembershipPurchaseModelBadge billingCycles={initialValue?.billingCycles ?? []} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.commerce.memberships.plans.form.coveragePackages', '{{count}} packages', {
                count: initialValue?.packageCount ?? 0,
              })}
            </span>
          </div>
          <div className="mt-2">
            <MembershipBillingCycleChips billingCycles={initialValue?.billingCycles ?? []} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            {t(
              'admin.commerce.memberships.plans.form.coverageHint',
              'Purchase model and billing cycles come from the packages that sell this plan; manage them in Packages.',
            )}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.commerce.memberships.plans.form.benefits', 'Benefits')}</span>
          <button
            type="button"
            onClick={() => setBenefits((current) => [
              ...current,
              { name: '', benefitKey: '', type: 'quota', usageLimitText: '', rowUid: makeBenefitRowUid() },
            ])}
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
            <div key={benefit.rowUid} className="grid gap-2 rounded-lg border border-slate-100 p-3 dark:border-white/5">
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
                options={benefitTypeOptions(benefit.type, t)}
                onChange={(value) => updateBenefit(index, { type: value || 'quota' })}
              />
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.usageLimit', 'Usage limit')} value={benefit.usageLimitText} onChange={(value) => updateBenefit(index, { usageLimitText: value })} />
              <MembershipTextField label={t('admin.commerce.memberships.plans.form.description', 'Description')} value={benefit.description ?? ''} onChange={(value) => updateBenefit(index, { description: value })} />
            </div>
          ))}
        </div>
      </div>
    </MembershipFormFrame>
  );

  function updateBenefit(index: number, patch: Partial<MembershipPlanBenefitFormValue>) {
    setBenefits((current) => current.map((benefit, itemIndex) => (
      itemIndex === index ? { ...benefit, ...patch } : benefit
    )));
  }

  function toMembershipPlanBenefitInput(benefit: MembershipPlanBenefitFormValue): MembershipsAdminPlanBenefitInput {
    const { usageLimitText, rowUid: _rowUid, ...input } = benefit;
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
    rowUid: makeBenefitRowUid(),
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

function benefitTypeOptions(
  currentType: string | undefined,
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
): Array<{ value: string; label: string }> {
  const baseOptions = baseBenefitTypeValues.map((value) => ({
    value,
    label: t(`admin.commerce.memberships.plans.form.benefitType.${value}`, value),
  }));
  const normalizedCurrentType = currentType?.trim() ?? '';
  if (!normalizedCurrentType || baseOptions.some((option) => option.value === normalizedCurrentType)) {
    return baseOptions;
  }
  return [...baseOptions, { value: normalizedCurrentType, label: normalizedCurrentType }];
}
