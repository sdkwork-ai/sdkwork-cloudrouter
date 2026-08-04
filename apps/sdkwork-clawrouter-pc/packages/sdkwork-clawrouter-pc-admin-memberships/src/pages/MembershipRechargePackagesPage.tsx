import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { formatMoney, formatMoneyDigits } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import {
  MembershipFormError,
  MembershipSelectField,
  MembershipTextField,
} from '../components/MembershipFormControls';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipRechargePackageDrawerForm } from '../forms/MembershipRechargePackageDrawerForm';
import {
  createMembershipAdminRechargePackage,
  deleteMembershipAdminRechargePackage,
  fetchMembershipAdminRechargePackages,
  fetchMembershipAdminRechargeSettings,
  updateMembershipAdminRechargePackage,
  updateMembershipAdminRechargeSettings,
  type MembershipsAdminRechargePackageItem,
  type MembershipsAdminRechargePackageMutationInput,
  type MembershipsAdminRechargeSettingsItem,
} from '../membershipsService';
import {
  computeGrantAmount,
  listRechargeCurrencyCodes,
  normalizeRechargeSettings,
} from '@sdkwork/clawroutes-pc-commons';

type RechargeSettingsDraft = {
  baseCurrencyCode: string;
  basePointsPerCny: string;
  currencyToCnyRates: Record<string, string>;
};

export function MembershipRechargePackagesPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [packages, setPackages] = useState<MembershipsAdminRechargePackageItem[]>([]);
  const [settings, setSettings] = useState<MembershipsAdminRechargeSettingsItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<MembershipsAdminRechargePackageItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RechargeSettingsDraft>({
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: {
      CNY: '1',
      USD: '7',
    },
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');

  const normalizedSettings = useMemo(
    () => normalizeRechargeSettings({
      baseCurrencyCode: settingsDraft.baseCurrencyCode,
      basePointsPerCny: settingsDraft.basePointsPerCny,
      currencyToCnyRates: settingsDraft.currencyToCnyRates,
    }),
    [settingsDraft],
  );

  const supportedCurrencyCodes = useMemo(
    () => listRechargeCurrencyCodes(normalizedSettings),
    [normalizedSettings],
  );

  const previewExamples = useMemo(() => ([
    ...supportedCurrencyCodes.slice(0, 3).map((currencyCode) => ({
      amount: currencyCode === 'USD' ? '20' : '5',
      currencyCode,
    })),
  ].map((item) => ({
    ...item,
    grantAmount: computeGrantAmount(item.amount, item.currencyCode, 0, normalizedSettings),
  }))), [normalizedSettings, supportedCurrencyCodes]);

  const loadRechargeConfiguration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedPackages, loadedSettings] = await Promise.all([
        fetchMembershipAdminRechargePackages(),
        fetchMembershipAdminRechargeSettings(),
      ]);
      setPackages(loadedPackages);
      setSettings(loadedSettings);
      setSettingsDraft({
        baseCurrencyCode: loadedSettings.baseCurrencyCode,
        basePointsPerCny: loadedSettings.basePointsPerCny,
        currencyToCnyRates: loadedSettings.currencyToCnyRates,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.rechargePackages.error', 'Recharge packages could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRechargeConfiguration();
  }, [loadRechargeConfiguration]);

  const openCreateDrawer = () => {
    setEditingPackage(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MembershipsAdminRechargePackageItem) => {
    setEditingPackage(item);
    setIsDrawerOpen(true);
  };

  const handleSavePackage = async (input: MembershipsAdminRechargePackageMutationInput) => {
    if (editingPackage) {
      await updateMembershipAdminRechargePackage(editingPackage.id, input);
    } else {
      await createMembershipAdminRechargePackage(input);
    }
    setIsDrawerOpen(false);
    setEditingPackage(null);
    await loadRechargeConfiguration();
  };

  const handleDeletePackage = async (item: MembershipsAdminRechargePackageItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.rechargePackages.deleteConfirmNamed', 'Delete recharge package {{name}}?', { name: item.name || item.packageNo }))) {
      return;
    }
    await deleteMembershipAdminRechargePackage(item.id);
    await loadRechargeConfiguration();
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const updated = await updateMembershipAdminRechargeSettings({
        baseCurrencyCode: settingsDraft.baseCurrencyCode,
        basePointsPerCny: settingsDraft.basePointsPerCny,
        currencyToCnyRates: settingsDraft.currencyToCnyRates,
      });
      setSettings(updated);
      setSettingsDraft({
        baseCurrencyCode: updated.baseCurrencyCode,
        basePointsPerCny: updated.basePointsPerCny,
        currencyToCnyRates: updated.currencyToCnyRates,
      });
      await loadRechargeConfiguration();
    } catch (saveError) {
      setSettingsError(saveError instanceof Error
        ? saveError.message
        : t('admin.commerce.memberships.rechargeSettings.error', 'Recharge settings could not be saved'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCurrencyRateChange = useCallback((currencyCode: string, value: string) => {
    setSettingsDraft((current) => ({
      ...current,
      currencyToCnyRates: {
        ...current.currencyToCnyRates,
        [currencyCode]: value,
      },
    }));
  }, []);

  const handleAddCurrency = useCallback(() => {
    const normalizedCode = newCurrencyCode.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }
    setSettingsDraft((current) => ({
      ...current,
      currencyToCnyRates: {
        ...current.currencyToCnyRates,
        [normalizedCode]: current.currencyToCnyRates[normalizedCode] || '1',
      },
    }));
    setNewCurrencyCode('');
  }, [newCurrencyCode]);

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={loadRechargeConfiguration}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.rechargePackages.add', 'Add')}
          </button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="lg:col-span-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.memberships.rechargePackages.title', 'Recharge Packages')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.memberships.rechargePackages.desc', 'Maintain point recharge packages used by member purchases and wallet top-ups.')}
            </p>
          </div>

          <MembershipTablePanel className="overflow-visible p-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('admin.commerce.memberships.rechargeSettings.title', 'Recharge Settings')}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('admin.commerce.memberships.rechargeSettings.desc', 'Maintain the base points ratio and cross-currency conversion used by recharge packages and custom amounts.')}
                </p>
              </div>

              {settingsError ? <MembershipFormError message={settingsError} /> : null}

              <MembershipSelectField
                label={t('admin.commerce.memberships.rechargeSettings.baseCurrencyCode', 'Base currency')}
                value={settingsDraft.baseCurrencyCode}
                options={supportedCurrencyCodes.map((value) => ({ value }))}
                onChange={(value) => setSettingsDraft((current) => ({ ...current, baseCurrencyCode: (value as string) || 'CNY' }))}
              />
              <MembershipTextField
                label={t('admin.commerce.memberships.rechargeSettings.basePointsPerCny', 'Base points per CNY')}
                value={settingsDraft.basePointsPerCny}
                onChange={(value) => setSettingsDraft((current) => ({ ...current, basePointsPerCny: value }))}
                placeholder="10"
              />

              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('admin.commerce.memberships.rechargeSettings.currencyRates', 'Currency to CNY rates')}
                </div>
                <div className="grid gap-3">
                  {Object.entries(settingsDraft.currencyToCnyRates).map(([currencyCode, rate]) => (
                    <MembershipTextField
                      key={currencyCode}
                      label={t(
                        'admin.commerce.memberships.rechargeSettings.currencyRateLabel',
                        '{{currencyCode}} to CNY',
                        { currencyCode },
                      )}
                      value={rate}
                      onChange={(value) => handleCurrencyRateChange(currencyCode, value)}
                      placeholder={currencyCode === 'CNY' ? '1' : '7'}
                    />
                  ))}
                </div>
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <MembershipTextField
                      label={t('admin.commerce.memberships.rechargeSettings.addCurrency', 'Add currency')}
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
                    {t('admin.commerce.memberships.rechargeSettings.addCurrency', 'Add currency')}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('admin.commerce.memberships.rechargeSettings.preview', 'Preview')}
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {previewExamples.map((item) => (
                    <div key={`${item.currencyCode}-${item.amount}`} className="flex items-center justify-between gap-4">
                      <span>
                        {formatMoney(item.amount, { currency: item.currencyCode, locale: displayLocale, mode: 'symbol' }) ?? `${item.currencyCode} ${item.amount}`}
                      </span>
                      <span className="font-semibold text-lobster-600 dark:text-lobster-300">
                        {formatMoneyDigits(item.grantAmount, 'USD', displayLocale, 'decimal', 0, 0)} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingSettings}
                onClick={() => void handleSaveSettings()}
                className="inline-flex items-center gap-2 rounded-lg bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {t('admin.commerce.memberships.rechargeSettings.submit', 'Save Settings')}
              </button>
            </div>
          </MembershipTablePanel>

          <MembershipTablePanel>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.package', 'Package')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.price', 'Price')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.bonus', 'Bonus')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargeSettings.preview', 'Preview')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.updated', 'Updated')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t('admin.commerce.memberships.rechargePackages.empty', 'No recharge packages')}
                    </td>
                  </tr>
                ) : packages.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{item.name || item.packageNo}</div>
                      <div className="text-xs text-slate-400">{item.packageNo}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(item.priceAmount, { currency: item.currencyCode, locale: displayLocale, mode: 'symbol' }) ?? `${item.priceAmount} ${item.currencyCode}`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{item.bonusPoints}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-lobster-600 dark:text-lobster-300">
                      {formatMoneyDigits(item.grantAmount, 'USD', displayLocale, 'decimal', 0, 0)}
                    </td>
                    <td className="px-4 py-2.5"><MembershipStatusBadge status={item.status} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{item.updatedAt}</td>
                    <td className="px-4 py-2.5">
                      <MembershipTableActions>
                        <MembershipIconActionButton label={t('admin.commerce.memberships.rechargePackages.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(item)} />
                        <MembershipIconActionButton label={t('admin.commerce.memberships.rechargePackages.delete', 'Delete')} icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void handleDeletePackage(item)} />
                      </MembershipTableActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MembershipTablePanel>
        </div>
      </MembershipAdminPageShell>

        <MembershipDrawer
          title={editingPackage
            ? t('admin.commerce.memberships.rechargePackages.editTitle', 'Edit Recharge Package')
            : t('admin.commerce.memberships.rechargePackages.addTitle', 'Add Recharge Package')}
          isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <MembershipRechargePackageDrawerForm
          mode={editingPackage ? 'edit' : 'create'}
          initialValue={editingPackage}
          settings={settings ?? normalizedSettings}
          supportedCurrencyCodes={supportedCurrencyCodes}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSavePackage}
        />
      </MembershipDrawer>
    </>
  );
}
