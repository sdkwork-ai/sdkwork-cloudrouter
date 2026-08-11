import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Trash2 } from 'lucide-react';
import { SdkworkSearchableSelect } from '@sdkwork/appbase-pc-react';
import { formatMoneyDigits } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import {
  defaultRechargeSettings,
  listRechargeCurrencyCodes,
  normalizeRechargeSettings,
  resolveProblemMessage,
  safeComputeGrantAmount,
  type RechargeSettingsSnapshot,
} from '@sdkwork/cloudroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipFormError, MembershipTextField } from '../components/MembershipFormControls';
import { MembershipTablePanel } from '../components/MembershipPageControls';
import {
  fetchMembershipAdminExchangeRules,
  fetchMembershipAdminRechargeSettings,
  updateMembershipAdminExchangeRule,
  updateMembershipAdminRechargeSettings,
  type TokenBankAdminExchangeRuleItem,
} from '../membershipsService';

const WITHDRAWAL_SOURCE_ASSET = 'POINTS';
const WITHDRAWAL_TARGET_ASSET = 'CASH';

export function TokenBankRatesPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [settingsDraft, setSettingsDraft] = useState<RechargeSettingsSnapshot>(() => defaultRechargeSettings());
  const [withdrawalRule, setWithdrawalRule] = useState<TokenBankAdminExchangeRuleItem | null>(null);
  const [withdrawalRateDraft, setWithdrawalRateDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingWithdrawal, setIsSavingWithdrawal] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [addCurrencyError, setAddCurrencyError] = useState<string | null>(null);
  const [previewAmount, setPreviewAmount] = useState('10');
  const [previewCurrencyCode, setPreviewCurrencyCode] = useState('CNY');

  const normalizedDraft = useMemo(
    () => normalizeRechargeSettings(settingsDraft),
    [settingsDraft],
  );

  const supportedCurrencyCodes = useMemo(
    () => listRechargeCurrencyCodes(normalizedDraft),
    [normalizedDraft],
  );

  const visibleCurrencyCodes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toUpperCase();
    return supportedCurrencyCodes.filter((currencyCode) => currencyCode.includes(normalizedSearch));
  }, [searchTerm, supportedCurrencyCodes]);

  const previewGrantAmount = useMemo(() => safeComputeGrantAmount(
    previewAmount,
    previewCurrencyCode,
    0,
    normalizedDraft,
  ), [normalizedDraft, previewAmount, previewCurrencyCode]);

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedSettings, loadedRules] = await Promise.all([
        fetchMembershipAdminRechargeSettings(),
        fetchMembershipAdminExchangeRules({
          sourceAssetType: WITHDRAWAL_SOURCE_ASSET,
          targetAssetType: WITHDRAWAL_TARGET_ASSET,
        }),
      ]);
      const rule = loadedRules.find((item) => (
        item.sourceAssetType === WITHDRAWAL_SOURCE_ASSET && item.targetAssetType === WITHDRAWAL_TARGET_ASSET
      )) ?? null;
      setSettingsDraft(loadedSettings);
      setWithdrawalRule(rule);
      setWithdrawalRateDraft(rule?.rate ?? '10');
      setPreviewCurrencyCode(loadedSettings.baseCurrencyCode);
    } catch (loadError) {
      setError(resolveProblemMessage(loadError, t, t('admin.commerce.memberships.tokenBankRates.error', 'Token Bank points and rates could not be loaded')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const handleCurrencyRateChange = useCallback((currencyCode: string, value: string) => {
    setSettingsDraft((current) => ({
      ...current,
      currencyToCnyRates: {
        ...current.currencyToCnyRates,
        [currencyCode]: value,
      },
    }));
  }, []);

  const handleRemoveCurrency = useCallback((currencyCode: string) => {
    if (currencyCode === normalizedDraft.baseCurrencyCode) {
      return;
    }
    setSettingsDraft((current) => {
      const nextRates = { ...current.currencyToCnyRates };
      delete nextRates[currencyCode];
      return { ...current, currencyToCnyRates: nextRates };
    });
  }, [normalizedDraft.baseCurrencyCode]);

  const handleAddCurrency = useCallback(() => {
    setAddCurrencyError(null);
    const normalizedCode = newCurrencyCode.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }
    if (!/^[A-Z]{3}$/.test(normalizedCode)) {
      setAddCurrencyError(t('admin.commerce.memberships.tokenBankRates.rates.currencyCodeInvalid', 'Currency code must match ^[A-Z]{3}$'));
      return;
    }
    if (normalizedDraft.currencyToCnyRates[normalizedCode] !== undefined) {
      setAddCurrencyError(t('admin.commerce.memberships.tokenBankRates.rates.currencyExists', '{{currencyCode}} already exists', { currencyCode: normalizedCode }));
      return;
    }
    setSettingsDraft((current) => ({
      ...current,
      currencyToCnyRates: {
        ...current.currencyToCnyRates,
        [normalizedCode]: '1',
      },
    }));
    setNewCurrencyCode('');
  }, [newCurrencyCode, normalizedDraft.currencyToCnyRates, t]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      let normalized: RechargeSettingsSnapshot;
      try {
        normalized = normalizeRechargeSettings(settingsDraft);
      } catch (validationError) {
        setSettingsError(validationError instanceof Error
          ? validationError.message
          : t('admin.commerce.memberships.tokenBankRates.saveError', 'Token Bank points and rates could not be saved'));
        return;
      }
      const updated = await updateMembershipAdminRechargeSettings({
        baseCurrencyCode: normalized.baseCurrencyCode,
        basePointsPerCny: normalized.basePointsPerCny,
        currencyToCnyRates: normalized.currencyToCnyRates,
      });
      setSettingsDraft(updated);
      setPreviewCurrencyCode(updated.baseCurrencyCode);
    } catch (saveError) {
      setSettingsError(saveError instanceof Error
        ? saveError.message
        : t('admin.commerce.memberships.tokenBankRates.saveError', 'Token Bank points and rates could not be saved'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveWithdrawal = async () => {
    setIsSavingWithdrawal(true);
    setWithdrawalError(null);
    try {
      const updated = await updateMembershipAdminExchangeRule({
        sourceAssetType: WITHDRAWAL_SOURCE_ASSET,
        targetAssetType: WITHDRAWAL_TARGET_ASSET,
        rate: withdrawalRateDraft,
      });
      setWithdrawalRule(updated);
      setWithdrawalRateDraft(updated.rate);
    } catch (saveError) {
      setWithdrawalError(saveError instanceof Error
        ? saveError.message
        : t('admin.commerce.memberships.tokenBankRates.withdrawal.error', 'Withdrawal rate could not be saved'));
    } finally {
      setIsSavingWithdrawal(false);
    }
  };

  return (
    <MembershipAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={loadConfiguration}
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('admin.commerce.memberships.tokenBankRates.title', 'Token Bank Points & Rates')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.commerce.memberships.tokenBankRates.desc', 'Maintain the per-currency points conversion and exchange rates that determine Token Bank credits for recharge and withdrawal.')}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t('admin.commerce.memberships.tokenBankRates.baseSection.title', 'Base Conversion')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t('admin.commerce.memberships.tokenBankRates.baseSection.desc', 'Base currency and points granted per base currency unit.')}
                  </p>
                </div>

                {settingsError ? <MembershipFormError message={settingsError} /> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('admin.commerce.memberships.rechargeSettings.baseCurrencyCode', 'Base currency')}
                    </span>
                    <SdkworkSearchableSelect
                      emptyText={t('admin.commerce.memberships.rechargeSettings.currencyEmpty', 'No matching currency')}
                      options={supportedCurrencyCodes.map((value) => ({ value, label: value }))}
                      searchPlaceholder={t('admin.commerce.memberships.rechargeSettings.currencySearch', 'Search currency by code')}
                      value={normalizedDraft.baseCurrencyCode}
                      onValueChange={(value) => setSettingsDraft((current) => ({ ...current, baseCurrencyCode: value || 'CNY' }))}
                    />
                  </label>
                  <MembershipTextField
                    label={t('admin.commerce.memberships.tokenBankRates.basePointsPerUnit', 'Points per {{currencyCode}} unit', { currencyCode: normalizedDraft.baseCurrencyCode })}
                    value={normalizedDraft.basePointsPerCny}
                    onChange={(value) => setSettingsDraft((current) => ({ ...current, basePointsPerCny: value }))}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <div className="flex shrink-0 flex-col gap-3 p-5 pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t('admin.commerce.memberships.tokenBankRates.rates.title', 'Per-Currency Exchange Rates')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t('admin.commerce.memberships.tokenBankRates.rates.desc', 'Rate of each currency to the base currency; points per unit are computed from the base conversion.')}
                  </p>
                </div>
                <label className="block w-full sm:w-56">
                  <span className="sr-only">{t('admin.commerce.memberships.tokenBankRates.rates.search', 'Search currency')}</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('admin.commerce.memberships.tokenBankRates.rates.search', 'Search currency')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-4 min-h-40 flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#111]">
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.tokenBankRates.rates.currency', 'Currency')}</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.tokenBankRates.rates.rateToBase', 'Rate to {{baseCurrencyCode}}', { baseCurrencyCode: normalizedDraft.baseCurrencyCode })}</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.tokenBankRates.rates.pointsPerUnit', 'Points per unit')}</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCurrencyCodes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                          {t('admin.commerce.memberships.tokenBankRates.rates.empty', 'No matching currencies')}
                        </td>
                      </tr>
                    ) : visibleCurrencyCodes.map((currencyCode) => {
                      const rate = normalizedDraft.currencyToCnyRates[currencyCode] ?? '';
                      const perUnitPoints = safeComputeGrantAmount('1', currencyCode, 0, normalizedDraft);
                      const isBaseCurrency = currencyCode === normalizedDraft.baseCurrencyCode;
                      return (
                        <tr key={currencyCode} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-slate-900 dark:text-white">{currencyCode}</span>
                            {isBaseCurrency ? (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                {t('admin.commerce.memberships.tokenBankRates.rates.baseCurrency', 'Base')}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              value={rate}
                              onChange={(event) => handleCurrencyRateChange(currencyCode, event.target.value)}
                              inputMode="decimal"
                              className="w-28 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-white/5 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-lobster-600 dark:text-lobster-300">
                            {t('admin.commerce.memberships.pointsCount', '{{points}} pts', { points: formatMoneyDigits(perUnitPoints, 'USD', displayLocale, 'decimal', 0, 0) ?? '0' })}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              disabled={isBaseCurrency}
                              onClick={() => handleRemoveCurrency(currencyCode)}
                              aria-label={t('admin.commerce.memberships.tokenBankRates.rates.remove', 'Remove')}
                              title={t('admin.commerce.memberships.tokenBankRates.rates.remove', 'Remove')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex shrink-0 flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  {addCurrencyError ? (
                    <div className="mb-2 text-xs text-red-600 dark:text-red-400">{addCurrencyError}</div>
                  ) : null}
                  <MembershipTextField
                    label={t('admin.commerce.memberships.tokenBankRates.rates.addCurrency', 'Add currency')}
                    value={newCurrencyCode}
                    onChange={setNewCurrencyCode}
                    placeholder="EUR"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCurrency}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <Plus className="h-4 w-4" />
                  {t('admin.commerce.memberships.tokenBankRates.rates.addCurrency', 'Add currency')}
                </button>
              </div>

              <div className="mt-4 flex shrink-0 justify-end border-t border-slate-200 px-5 pb-5 pt-4 dark:border-white/10">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => void handleSaveSettings()}
                  className="inline-flex items-center gap-2 rounded-lg bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {t('admin.commerce.memberships.tokenBankRates.save', 'Save Changes')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <MembershipTablePanel className="p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('admin.commerce.memberships.tokenBankRates.preview.title', 'Grant Preview')}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('admin.commerce.memberships.tokenBankRates.preview.hint', 'Enter an amount to preview the credited Token Bank points.')}
              </p>
              <div className="mt-4 space-y-3">
                <MembershipTextField
                  label={t('admin.commerce.memberships.tokenBankRates.preview.amount', 'Amount')}
                  value={previewAmount}
                  onChange={setPreviewAmount}
                  placeholder="10"
                  type="number"
                />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('admin.commerce.memberships.tokenBankRates.preview.currency', 'Currency')}
                  </span>
                  <SdkworkSearchableSelect
                    emptyText={t('admin.commerce.memberships.rechargeSettings.currencyEmpty', 'No matching currency')}
                    options={supportedCurrencyCodes.map((value) => ({ value, label: value }))}
                    searchPlaceholder={t('admin.commerce.memberships.rechargeSettings.currencySearch', 'Search currency by code')}
                    value={previewCurrencyCode}
                    onValueChange={(value) => setPreviewCurrencyCode(value || normalizedDraft.baseCurrencyCode)}
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.commerce.memberships.tokenBankRates.preview.grant', 'Credited points')}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-lobster-600 dark:text-lobster-300">
                    {formatMoneyDigits(previewGrantAmount, 'USD', displayLocale, 'decimal', 0, 0) ?? '0'}
                  </div>
                </div>
              </div>
            </MembershipTablePanel>

            <MembershipTablePanel className="p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('admin.commerce.memberships.tokenBankRates.withdrawal.title', 'Withdrawal Rate')}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('admin.commerce.memberships.tokenBankRates.withdrawal.desc', 'Points required to withdraw one cash unit (POINTS to CASH).')}
              </p>
              {withdrawalRule ? (
                <p className="mt-2 text-xs text-slate-400">
                  {t('admin.commerce.memberships.tokenBankRates.withdrawal.ruleNo', 'Rule {{ruleNo}}', { ruleNo: withdrawalRule.id })}
                </p>
              ) : null}
              {withdrawalError ? (
                <div className="mt-3"><MembershipFormError message={withdrawalError} /></div>
              ) : null}
              <div className="mt-4 space-y-3">
                <MembershipTextField
                  label={t('admin.commerce.memberships.tokenBankRates.withdrawal.rateLabel', 'Points per cash unit')}
                  value={withdrawalRateDraft}
                  onChange={setWithdrawalRateDraft}
                  placeholder="10"
                />
                <button
                  type="button"
                  disabled={isSavingWithdrawal}
                  onClick={() => void handleSaveWithdrawal()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <Save className="h-4 w-4" />
                  {t('admin.commerce.memberships.tokenBankRates.withdrawal.save', 'Save Withdrawal Rate')}
                </button>
              </div>
            </MembershipTablePanel>
          </div>
        </div>
      </div>
    </MembershipAdminPageShell>
  );
}
