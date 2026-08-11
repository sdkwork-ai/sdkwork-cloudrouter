import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeGrantAmount, type RechargeSettingsSnapshot } from '@sdkwork/cloudroutes-pc-commons';
import { formatMoneyDigits } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import { SdkworkSearchableSelect } from '@sdkwork/appbase-pc-react';
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
  parseRequiredNonNegativeIntegerField,
} from './membershipFormValues';
import type {
  MembershipsAdminRechargePackageItem,
  MembershipsAdminRechargePackageMutationInput,
} from '../membershipsService';

interface MembershipRechargePackageDrawerFormProps {
  initialValue?: MembershipsAdminRechargePackageItem | null;
  settings: RechargeSettingsSnapshot;
  supportedCurrencyCodes: string[];
  onSubmit: (input: MembershipsAdminRechargePackageMutationInput) => Promise<void>;
}

export function MembershipRechargePackageDrawerForm({
  initialValue,
  settings,
  supportedCurrencyCodes,
  onSubmit,
}: MembershipRechargePackageDrawerFormProps) {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount ?? '');
  const [currencyCode, setCurrencyCode] = useState(initialValue?.currencyCode ?? settings.baseCurrencyCode);
  const [bonusPoints, setBonusPoints] = useState(String(initialValue?.bonusPoints ?? 0));
  const [discount, setDiscount] = useState(String(initialValue?.discount ?? 100));
  const [status, setStatus] = useState<'active' | 'inactive'>(initialValue?.status === 'inactive' ? 'inactive' : 'active');
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        priceAmount: parseRequiredMoneyAmountField(priceAmount, t('admin.commerce.memberships.rechargePackages.form.priceAmount', 'Price amount')),
        currencyCode,
        bonusPoints: parseRequiredNonNegativeIntegerField(bonusPoints, t('admin.commerce.memberships.rechargePackages.form.bonusPoints', 'Bonus points')),
        discount: parseRequiredDiscountField(discount, t('admin.commerce.memberships.rechargePackages.form.discount', 'Discount')),
        status,
      });
    } catch (saveError) {
      setError(formatMembershipFormValidationError(
        saveError,
        t,
        t('admin.commerce.memberships.rechargePackages.form.error', 'Recharge package could not be saved'),
      ));
    }
  };

  return (
    <MembershipFormFrame
      error={error}
      formId="membership-recharge-package-form"
      onSubmit={handleSubmit}
    >
      <MembershipTextField
        label={t('admin.commerce.memberships.rechargePackages.form.priceAmount', 'Price amount')}
        value={priceAmount}
        onChange={setPriceAmount}
        placeholder="10.00"
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('admin.commerce.memberships.rechargePackages.form.currencyCode', 'Currency')}
        </span>
        <SdkworkSearchableSelect
          emptyText={t('admin.commerce.memberships.rechargePackages.form.currencyEmpty', 'No matching currency')}
          options={supportedCurrencyCodes.map((value) => ({ value, label: value }))}
          searchPlaceholder={t('admin.commerce.memberships.rechargePackages.form.currencySearch', 'Search currency by code')}
          value={currencyCode}
          onValueChange={(value) => setCurrencyCode(value || settings.baseCurrencyCode)}
        />
      </label>
      <MembershipTextField
        label={t('admin.commerce.memberships.rechargePackages.form.bonusPoints', 'Bonus points')}
        value={bonusPoints}
        onChange={setBonusPoints}
        placeholder="0"
        type="number"
      />
      <MembershipTextField
        label={t('admin.commerce.memberships.rechargePackages.form.discount', 'Discount')}
        hint={t('admin.commerce.memberships.rechargePackages.form.discountHint', 'Discount rate percentage: 100 means no discount, 90 means pay 90% of the price.')}
        value={discount}
        onChange={setDiscount}
        placeholder="100"
        type="number"
      />
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span>{t('admin.commerce.memberships.rechargeSettings.preview', 'Preview')}</span>
          <span className="font-semibold text-lobster-600 dark:text-lobster-300">
            {t('admin.commerce.memberships.pointsCount', '{{points}} pts', { points: formatMoneyDigits(previewGrantAmount, 'USD', displayLocale, 'decimal', 0, 0) ?? '0' })}
          </span>
        </div>
      </div>
      <MembershipSelectField
        label={t('admin.commerce.memberships.rechargePackages.form.status', 'Status')}
        value={status}
        options={[
          { value: 'active', label: membershipStatusLabel('active', t) },
          { value: 'inactive', label: membershipStatusLabel('inactive', t) },
        ]}
        onChange={(value) => setStatus(value as 'active' | 'inactive')}
      />
    </MembershipFormFrame>
  );
}
