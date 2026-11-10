import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  findDuplicateCustomCouponCodeIndex,
  isValidCustomCouponCode,
  parseCustomCouponCodes,
  type CodeBatchCodeSource,
  type CodeBatchCreateFormValues,
} from '../marketingService';
import {
  marketingInputClassName,
  marketingSelectClassName,
  MarketingField,
  MarketingFormSection,
} from '../components/MarketingFormControls';

export interface CodeBatchCreateDrawerFormProps {
  error: string | null;
  stockOptions: { id: string; label: string }[];
  onSubmit: (values: CodeBatchCreateFormValues) => void;
}

export function CodeBatchCreateDrawerForm({
  error,
  stockOptions,
  onSubmit,
}: CodeBatchCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [stockId, setStockId] = useState(stockOptions[0]?.id ?? '');
  const [codeType, setCodeType] = useState('PUBLIC');
  const [codeSource, setCodeSource] = useState<CodeBatchCodeSource>('generated');
  const [quantity, setQuantity] = useState('');
  const [customCodesText, setCustomCodesText] = useState('');
  const [maxClaims, setMaxClaims] = useState(1);
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

  const isCustomSource = codeSource === 'custom';
  // 录入区始终是单个字符串；这里仅在渲染时派生数量展示与校验，不保存派生状态。
  const customCodes = parseCustomCouponCodes(customCodesText);
  const requestedQuantity = isCustomSource ? String(customCodes.length) : quantity;

  const handleCodeSourceChange = (value: string) => {
    const nextSource: CodeBatchCodeSource = value === 'custom' ? 'custom' : 'generated';
    setCodeSource(nextSource);
    // 自定义券码与多次兑换互斥：后端拒绝 customCodes 搭配 maxClaims !== 1。
    if (nextSource === 'custom') {
      setMaxClaims(1);
    }
    setValidationError(null);
  };

  const handleMaxClaimsChange = (value: string) => {
    const parsed = Number(value);
    setMaxClaims(Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1);
    setValidationError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!stockId) {
      setValidationError(t('admin.marketing.batch.form.required'));
      return;
    }
    if (isCustomSource) {
      if (customCodes.length === 0) {
        setValidationError(t('admin.marketing.batch.form.customRequired'));
        return;
      }
      const invalidIndex = customCodes.findIndex((code) => !isValidCustomCouponCode(code));
      if (invalidIndex >= 0) {
        setValidationError(t('admin.marketing.batch.form.customInvalid', {
          line: String(invalidIndex + 1),
          code: customCodes[invalidIndex],
        }));
        return;
      }
      const duplicateIndex = findDuplicateCustomCouponCodeIndex(customCodes);
      if (duplicateIndex >= 0) {
        setValidationError(t('admin.marketing.batch.form.customDuplicate', {
          code: customCodes[duplicateIndex],
        }));
        return;
      }
    } else if (!quantity) {
      setValidationError(t('admin.marketing.batch.form.required'));
      return;
    }
    onSubmit({
      stockId,
      codeType,
      codeSource,
      // 自定义券码时数量恒等于券码行数，两者不可能不一致。
      quantity: requestedQuantity,
      customCodes: isCustomSource ? customCodes : undefined,
      maxClaims: isCustomSource ? 1 : maxClaims,
      codeLength,
      codePrefix,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  return (
    <form id="codeBatchCreateForm" onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.batch.form.basic', 'Batch Settings')}>
        <MarketingField label={t('admin.marketing.batch.form.stock', 'Coupon Stock')} required>
          <select
            value={stockId}
            onChange={(event) => setStockId(event.target.value)}
            className={marketingSelectClassName}
          >
            {stockOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.codeType', 'Code Type')} required>
          <select value={codeType} onChange={(event) => setCodeType(event.target.value)} className={marketingSelectClassName}>
            <option value="PUBLIC">{t('admin.marketing.enums.codeType.PUBLIC', 'Public')}</option>
            <option value="PRIVATE">{t('admin.marketing.enums.codeType.PRIVATE', 'Private')}</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.batch.form.codeSource')} required>
          <select
            value={codeSource}
            onChange={(event) => handleCodeSourceChange(event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="generated">{t('admin.marketing.batch.form.codeSource.generated')}</option>
            <option value="custom">{t('admin.marketing.batch.form.codeSource.custom')}</option>
          </select>
        </MarketingField>
        {isCustomSource ? (
          <MarketingField
            label={t('admin.marketing.batch.form.customQuantity')}
            hint={t('admin.marketing.batch.form.customQuantityHint')}
          >
            <input
              type="text"
              value={requestedQuantity}
              readOnly
              className={`${marketingInputClassName} cursor-not-allowed opacity-60`}
            />
          </MarketingField>
        ) : (
          <MarketingField label={t('admin.marketing.batch.form.quantity', 'Quantity')} required>
            <input
              type="text"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.batch.form.quantityPlaceholder', '1 - 5000')}
            />
          </MarketingField>
        )}
        {isCustomSource ? (
          <MarketingField
            label={t('admin.marketing.batch.form.customCodes')}
            required
            className="sm:col-span-2"
            hint={t('admin.marketing.batch.form.customCodesHint')}
          >
            <textarea
              id="codeBatchCustomCodes"
              value={customCodesText}
              onChange={(event) => {
                setCustomCodesText(event.target.value.toUpperCase());
                setValidationError(null);
              }}
              rows={8}
              spellCheck={false}
              className="min-h-32 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-700 placeholder:font-sans placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              placeholder={t('admin.marketing.batch.form.customCodesPlaceholder')}
            />
          </MarketingField>
        ) : null}
        {isCustomSource ? null : (
          <>
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
                placeholder={t('admin.marketing.batch.form.codePrefixPlaceholder', 'e.g. WELCOME')}
              />
            </MarketingField>
          </>
        )}
        <MarketingField
          label={t('admin.marketing.batch.form.maxClaims')}
          hint={t('admin.marketing.batch.form.maxClaimsHint')}
        >
          <input
            type="number"
            min={1}
            step={1}
            value={isCustomSource ? 1 : maxClaims}
            onChange={(event) => handleMaxClaimsChange(event.target.value)}
            disabled={isCustomSource}
            className={`${marketingInputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
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
    </form>
  );
}
