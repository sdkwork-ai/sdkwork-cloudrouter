import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeGrantAmount, type RechargeSettingsSnapshot } from '@sdkwork/clawroutes-pc-commons';
import {
  MembershipFormActions,
  MembershipFormFrame,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import {
  formatMembershipFormValidationError,
  parseRequiredMoneyAmountField,
  parseRequiredNonNegativeIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminRechargePackageItem,
  MembershipsAdminRechargePackageMutationInput,
} from '../membershipsService';

interface MembershipRechargePackageDrawerFormProps {
  mode: 'create' | 'edit';
  initialValue?: MembershipsAdminRechargePackageItem | null;
  settings: RechargeSettingsSnapshot;
  supportedCurrencyCodes: string[];
  onCancel: () => void;
  onSubmit: (input: MembershipsAdminRechargePackageMutationInput) => Promise<void>;
}

export function MembershipRechargePackageDrawerForm({
  mode,
  initialValue,
  settings,
  supportedCurrencyCodes,
  onCancel,
  onSubmit,
}: MembershipRechargePackageDrawerFormProps) {
  const { t } = useTranslation();
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount ?? '');
  const [currencyCode, setCurrencyCode] = useState(initialValue?.currencyCode ?? settings.baseCurrencyCode);
  const [bonusPoints, setBonusPoints] = useState(String(initialValue?.bonusPoints ?? 0));
  const [status, setStatus] = useState<'active' | 'inactive'>(initialValue?.status === 'inactive' ? 'inactive' : 'active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewGrantAmount = useMemo(() => {
    try {
      const normalizedPriceAmount = parseRequiredMoneyAmountField(
        priceAmount,
        t('admin.commerce.memberships.rechargePackages.form.priceAmount', 'Price amount'),
      );
      const normalizedBonusPoints = parseRequiredNonNegativeIntegerField(
        bonusPoints,
        t('admin.commerce.memberships.rechargePackages.form.bonusPoints', 'Bonus points'),
      );
      return computeGrantAmount(
        normalizedPriceAmount,
        currencyCode,
        normalizedBonusPoints,
        settings,
      );
    } catch {
      return 0;
    }
  }, [bonusPoints, currencyCode, priceAmount, settings, t]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        priceAmount: parseRequiredMoneyAmountField(priceAmount, t('admin.commerce.memberships.rechargePackages.form.priceAmount', 'Price amount')),
        currencyCode,
        bonusPoints: parseRequiredNonNegativeIntegerField(bonusPoints, t('admin.commerce.memberships.rechargePackages.form.bonusPoints', 'Bonus points')),
        status,
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t('admin.commerce.memberships.rechargePackages.form.error', 'Recharge package could not be saved'),
      ));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MembershipFormFrame error={error}>
      <MembershipTextField
        label={t('admin.commerce.memberships.rechargePackages.form.priceAmount', 'Price amount')}
        value={priceAmount}
        onChange={setPriceAmount}
        placeholder="10.00"
      />
      <MembershipSelectField
        label={t('admin.commerce.memberships.rechargePackages.form.currencyCode', 'Currency')}
        value={currencyCode}
        options={supportedCurrencyCodes.map((value) => ({ value }))}
        onChange={(value) => setCurrencyCode((value as string) || settings.baseCurrencyCode)}
      />
      <MembershipTextField
        label={t('admin.commerce.memberships.rechargePackages.form.bonusPoints', 'Bonus points')}
        value={bonusPoints}
        onChange={setBonusPoints}
        placeholder="0"
        type="number"
      />
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span>{t('admin.commerce.memberships.rechargeSettings.preview', 'Preview')}</span>
          <span className="font-semibold text-lobster-600 dark:text-lobster-300">
            {previewGrantAmount.toLocaleString()} pts
          </span>
        </div>
      </div>
      <MembershipSelectField
        label={t('admin.commerce.memberships.rechargePackages.form.status', 'Status')}
        value={status}
        options={[
          { value: 'active' },
          { value: 'inactive' },
        ]}
        onChange={(value) => setStatus(value as 'active' | 'inactive')}
      />
      <MembershipFormActions
        submitLabel={mode === 'edit'
          ? t('admin.commerce.memberships.rechargePackages.form.updateSubmit', 'Update Package')
          : t('admin.commerce.memberships.rechargePackages.form.submit', 'Create Package')}
        isSaving={isSaving}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </MembershipFormFrame>
  );
}
