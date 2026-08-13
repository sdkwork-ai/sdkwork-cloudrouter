import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommunityFormFrame,
  CommunityTextAreaField,
  CommunityTextField,
} from '../components/CommunityFormControls';
import type {
  CommunityAdminTierItem,
  CommunityAdminTierMutationInput,
} from '../communityService';

interface TierDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: CommunityAdminTierItem | null;
  onSubmit: (input: CommunityAdminTierMutationInput) => Promise<void>;
}

function parseOptionalNonNegativeInt(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseRequiredMoney(value: string): number {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('price must be a non-negative amount');
  }
  return Math.round(parsed * 100) / 100;
}

function splitBenefits(value: string): string[] {
  return value
    .split(/\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function TierDrawerForm({ mode, initialValue, onSubmit }: TierDrawerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [price, setPrice] = useState(initialValue ? String(initialValue.price) : '');
  const [durationDays, setDurationDays] = useState(initialValue?.durationDays ?? '');
  const [lifetimePrice, setLifetimePrice] = useState(
    initialValue?.lifetimePrice === undefined ? '' : String(initialValue.lifetimePrice),
  );
  const [benefits, setBenefits] = useState((initialValue?.benefits ?? []).join('\n'));
  const [agentLevel, setAgentLevel] = useState(initialValue?.agentLevel ?? '');
  const [sortOrder, setSortOrder] = useState(initialValue?.sortOrder ?? '0');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseRequiredMoney(price),
        durationDays: parseOptionalNonNegativeInt(durationDays),
        lifetimePrice: parseOptionalNonNegativeInt(lifetimePrice),
        benefits: splitBenefits(benefits),
        agentLevel: agentLevel.trim() || undefined,
        sortOrder: parseOptionalNonNegativeInt(sortOrder),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.community.tiers.form.error', 'Membership tier could not be saved'),
      );
    }
  };

  return (
    <CommunityFormFrame error={error} formId="community-tier-form" onSubmit={handleSubmit}>
      <CommunityTextField
        label={t('admin.community.tiers.form.name', 'Tier name')}
        value={name}
        onChange={setName}
        placeholder={t('admin.community.tiers.form.namePlaceholder', 'e.g. Premium Member')}
      />
      <CommunityTextAreaField
        label={t('admin.community.tiers.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
      <div className="grid grid-cols-2 gap-4">
        <CommunityTextField
          label={t('admin.community.tiers.form.price', 'Price (CNY)')}
          value={price}
          onChange={setPrice}
          type="number"
          step="0.01"
        />
        <CommunityTextField
          label={t('admin.community.tiers.form.durationDays', 'Duration (days)')}
          value={durationDays}
          onChange={setDurationDays}
          type="number"
          hint={t('admin.community.tiers.form.durationHint', 'e.g. 365 for yearly')}
        />
      </div>
      <CommunityTextField
        label={t('admin.community.tiers.form.lifetimePrice', 'Lifetime price (CNY)')}
        value={lifetimePrice}
        onChange={setLifetimePrice}
        type="number"
        step="0.01"
      />
      <CommunityTextAreaField
        label={t('admin.community.tiers.form.benefits', 'Benefits')}
        value={benefits}
        onChange={setBenefits}
        rows={5}
        hint={t('admin.community.tiers.form.benefitsHint', 'One benefit per line')}
      />
      <div className="grid grid-cols-2 gap-4">
        <CommunityTextField
          label={t('admin.community.tiers.form.agentLevel', 'Agent level')}
          value={agentLevel}
          onChange={setAgentLevel}
        />
        <CommunityTextField
          label={t('admin.community.tiers.form.sortOrder', 'Sort order')}
          value={sortOrder}
          onChange={setSortOrder}
          type="number"
        />
      </div>
      {mode === 'edit' ? (
        <p className="text-xs text-slate-400">
          {t('admin.community.tiers.form.editHint', 'Price and duration changes apply to new purchases.')}
        </p>
      ) : null}
    </CommunityFormFrame>
  );
}
