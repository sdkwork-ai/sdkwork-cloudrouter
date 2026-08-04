import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  marketingSelectClassName,
  MarketingField,
  MarketingFormActions,
  MarketingFormSection,
} from '../components/MarketingFormControls';

export interface DistributionTaskCreateDrawerFormProps {
  isSaving: boolean;
  error: string | null;
  stockOptions: { id: string; label: string }[];
  onCancel: () => void;
  onSubmit: (stockId: string, ownerUserIds: string[]) => void;
}

export function DistributionTaskCreateDrawerForm({
  isSaving,
  error,
  stockOptions,
  onCancel,
  onSubmit,
}: DistributionTaskCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [stockId, setStockId] = useState(stockOptions[0]?.id ?? '');
  const [userIdsText, setUserIdsText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId && stockOptions[0]) {
      setStockId(stockOptions[0].id);
    }
  }, [stockId, stockOptions]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ownerUserIds = userIdsText
      .split(/[\s,，;；]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!stockId || ownerUserIds.length === 0) {
      setValidationError(t('admin.marketing.distribution.form.required', 'Stock and at least one user id are required'));
      return;
    }
    if (ownerUserIds.length > 200) {
      setValidationError(t('admin.marketing.distribution.form.tooMany', 'At most 200 user ids per task'));
      return;
    }
    if (new Set(ownerUserIds).size !== ownerUserIds.length) {
      setValidationError(t('admin.marketing.distribution.form.duplicate', 'User ids must be unique'));
      return;
    }
    onSubmit(stockId, ownerUserIds);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.distribution.form.basic', 'Distribution Settings')}>
        <MarketingField label={t('admin.marketing.distribution.form.stock', 'Coupon Stock')} required>
          <select value={stockId} onChange={(event) => setStockId(event.target.value)} className={marketingSelectClassName}>
            {stockOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </MarketingField>
        <MarketingField
          label={t('admin.marketing.distribution.form.userIds', 'User Ids')}
          required
          hint={t('admin.marketing.distribution.form.userIdsHint', 'Separate ids by comma, space or newline (max 200)')}
        >
          <textarea
            value={userIdsText}
            onChange={(event) => setUserIdsText(event.target.value)}
            className="h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            placeholder="1001, 1002, 1003"
          />
        </MarketingField>
      </MarketingFormSection>

      {validationError || error ? (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {validationError ?? error}
        </p>
      ) : null}

      <div className="mt-auto">
        <MarketingFormActions
          isSaving={isSaving}
          submitLabel={t('admin.marketing.distribution.form.create', 'Send Coupons')}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}
