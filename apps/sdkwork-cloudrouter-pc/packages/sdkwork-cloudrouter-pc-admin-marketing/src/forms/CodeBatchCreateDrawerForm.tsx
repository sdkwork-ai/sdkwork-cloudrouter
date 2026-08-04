import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CodeBatchCreateFormValues } from '../marketingService';
import {
  marketingInputClassName,
  marketingSelectClassName,
  MarketingField,
  MarketingFormActions,
  MarketingFormSection,
} from '../components/MarketingFormControls';

export interface CodeBatchCreateDrawerFormProps {
  isSaving: boolean;
  error: string | null;
  stockOptions: { id: string; label: string }[];
  onCancel: () => void;
  onSubmit: (values: CodeBatchCreateFormValues) => void;
}

export function CodeBatchCreateDrawerForm({
  isSaving,
  error,
  stockOptions,
  onCancel,
  onSubmit,
}: CodeBatchCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [stockId, setStockId] = useState(stockOptions[0]?.id ?? '');
  const [codeType, setCodeType] = useState('PUBLIC');
  const [quantity, setQuantity] = useState('');
  const [codeLength, setCodeLength] = useState(16);
  const [codePrefix, setCodePrefix] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!stockId && stockOptions[0]) {
      setStockId(stockOptions[0].id);
    }
  }, [stockId, stockOptions]);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!stockId || !quantity) {
      setValidationError(t('admin.marketing.batch.form.required', 'Stock and quantity are required'));
      return;
    }
    onSubmit({
      stockId,
      codeType,
      quantity,
      codeLength,
      codePrefix,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.batch.form.basic', 'Batch Settings')}>
        <MarketingField label={t('admin.marketing.batch.form.stock', 'Coupon Stock')} required>
          <select value={stockId} onChange={(event) => setStockId(event.target.value)} className={marketingSelectClassName}>
            {stockOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.codeType', 'Code Type')} required>
          <select value={codeType} onChange={(event) => setCodeType(event.target.value)} className={marketingSelectClassName}>
            <option value="PUBLIC">PUBLIC</option>
            <option value="PRIVATE">PRIVATE</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.quantity', 'Quantity')} required>
          <input
            type="text"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={marketingInputClassName}
            placeholder="1 - 5000"
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.codeLength', 'Code Length')}>
          <input
            type="number"
            min={12}
            max={32}
            value={codeLength}
            onChange={(event) => setCodeLength(Number(event.target.value))}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.codePrefix', 'Code Prefix')} hint={t('admin.marketing.batch.form.prefixHint', 'Prefix must leave at least 8 random characters')}>
          <input
            type="text"
            value={codePrefix}
            onChange={(event) => setCodePrefix(event.target.value.toUpperCase())}
            className={marketingInputClassName}
            placeholder="e.g. WELCOME"
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.startsAt', 'Codes Valid From')}>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.expiresAt', 'Codes Valid Until')}>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className={marketingInputClassName}
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
          submitLabel={t('admin.marketing.batch.form.create', 'Generate Batch')}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}
