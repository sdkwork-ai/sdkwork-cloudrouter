import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { formatMoney, formatMoneyDigits } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import { BottomPagination, computeDiscountedAmount, defaultRechargeSettings, listRechargeCurrencyCodes, resolveProblemMessage, type RechargeSettingsSnapshot } from '@sdkwork/cloudroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import { MembershipFormActions } from '../components/MembershipFormControls';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
  hasNextMembershipPage,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipRechargePackageDrawerForm } from '../forms/MembershipRechargePackageDrawerForm';
import {
  createMembershipAdminRechargePackage,
  deleteMembershipAdminRechargePackage,
  fetchMembershipAdminRechargePackages,
  fetchMembershipAdminRechargeSettings,
  updateMembershipAdminRechargePackage,
  type MembershipsAdminPageInfo,
  type MembershipsAdminRechargePackageItem,
  type MembershipsAdminRechargePackageMutationInput,
} from '../membershipsService';
import { formatMembershipDateTime } from '../membershipFormat';

export function MembershipRechargePackagesPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [packages, setPackages] = useState<MembershipsAdminRechargePackageItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<MembershipsAdminRechargePackageItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [settings, setSettings] = useState<RechargeSettingsSnapshot>(() => defaultRechargeSettings());
  const requestIdRef = useRef(0);

  const supportedCurrencyCodes = useMemo(
    () => listRechargeCurrencyCodes(settings),
    [settings],
  );

  const loadRechargePackages = useCallback(async (requestedPage: number, requestedPageSize: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMembershipAdminRechargePackages({
        page: requestedPage,
        pageSize: requestedPageSize,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setPackages(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(loadError, t, t('admin.commerce.memberships.rechargePackages.error', 'Recharge packages could not be loaded')));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  // The package list only depends on `recharges.packages`; the settings feed
  // the drawer's live grant preview and are refreshed in the background with
  // a default fallback so a settings failure never blocks the catalog.
  const loadDrawerSettings = useCallback(async () => {
    try {
      setSettings(await fetchMembershipAdminRechargeSettings());
    } catch {
      // fall back to defaultRechargeSettings for the preview
    }
  }, []);

  useEffect(() => {
    void loadRechargePackages(page, pageSize);
    void loadDrawerSettings();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadRechargePackages, loadDrawerSettings, page, pageSize]);

  const openCreateDrawer = () => {
    setEditingPackage(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MembershipsAdminRechargePackageItem) => {
    setEditingPackage(item);
    setIsDrawerOpen(true);
  };

  const handleSavePackage = async (input: MembershipsAdminRechargePackageMutationInput) => {
    setIsSaving(true);
    try {
      if (editingPackage) {
        await updateMembershipAdminRechargePackage(editingPackage.id, input);
      } else {
        await createMembershipAdminRechargePackage(input);
      }
      setIsDrawerOpen(false);
      setEditingPackage(null);
      await loadRechargePackages(page, pageSize);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackage = async (item: MembershipsAdminRechargePackageItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.rechargePackages.deleteConfirmNamed', 'Delete recharge package {{name}}?', { name: item.name || item.packageNo }))) {
      return;
    }
    await deleteMembershipAdminRechargePackage(item.id);
    await loadRechargePackages(page, pageSize);
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={() => loadRechargePackages(page, pageSize)}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.rechargePackages.add', 'Add')}
          </button>
        )}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.memberships.rechargePackages.title', 'Recharge Packages')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.memberships.rechargePackages.desc', 'Maintain point recharge packages used by member purchases and wallet top-ups.')}
            </p>
          </div>

          <MembershipTablePanel
            footer={(
              <BottomPagination
                disabled={isLoading}
                hasNextPage={hasNextMembershipPage(pageInfo, page, packages.length, pageSize)}
                itemCount={packages.length}
                nextLabel={t('common.pagination.next', 'Next page')}
                onNextPage={() => setPage((current) => current + 1)}
                onPageSizeChange={(nextPageSize) => {
                  setPage(1);
                  setPageSize(nextPageSize);
                }}
                onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
                page={page}
                pageLabel={membershipPageLabel(t, page, pageInfo)}
                pageSize={pageSize}
                pageSizeLabel={t('common.pagination.rows', 'Rows')}
                pageSizeOptions={[20, 50, 100]}
                previousLabel={t('common.pagination.previous', 'Previous page')}
                showingLabel={t('common.pagination.showing', 'Showing')}
              />
            )}
          >
            {packages.length === 0 ? (
              <MembershipEmptyState title={t('admin.commerce.memberships.rechargePackages.empty', 'No recharge packages')} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.package', 'Package')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.price', 'Price')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.discount', 'Discount')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.discountedPrice', 'Discounted Price')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.bonus', 'Bonus')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.rechargeSettings.preview', 'Preview')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.status', 'Status')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.rechargePackages.table.updated', 'Updated')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">{item.name || item.packageNo}</div>
                        <div className="text-xs text-slate-400">{item.packageNo}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(item.priceAmount, { currency: item.currencyCode, locale: displayLocale, mode: 'symbol' }) ?? `${item.priceAmount} ${item.currencyCode}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {t('admin.commerce.memberships.discountPercent', '{{discount}}%', { discount: item.discount })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                        {formatMoney(computeDiscountedAmount(item.priceAmount, item.discount), { currency: item.currencyCode, locale: displayLocale, mode: 'symbol' }) ?? `${computeDiscountedAmount(item.priceAmount, item.discount)} ${item.currencyCode}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {t('admin.commerce.memberships.pointsCount', '{{points}} pts', { points: item.bonusPoints })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-lobster-600 dark:text-lobster-300">
                        {t('admin.commerce.memberships.pointsCount', '{{points}} pts', { points: formatMoneyDigits(item.grantAmount, 'USD', displayLocale, 'decimal', 0, 0) ?? '0' })}
                      </td>
                      <td className="px-4 py-2.5"><MembershipStatusBadge status={item.status} /></td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatMembershipDateTime(item.updatedAt, displayLocale)}</td>
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
            )}
          </MembershipTablePanel>
        </div>
      </MembershipAdminPageShell>

      <MembershipDrawer
        title={editingPackage
          ? t('admin.commerce.memberships.rechargePackages.editTitle', 'Edit Recharge Package')
          : t('admin.commerce.memberships.rechargePackages.addTitle', 'Add Recharge Package')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        footer={(
          <MembershipFormActions
            submitLabel={editingPackage
              ? t('admin.commerce.memberships.rechargePackages.form.updateSubmit', 'Update Package')
              : t('admin.commerce.memberships.rechargePackages.form.submit', 'Create Package')}
            isSaving={isSaving}
            submitFormId="membership-recharge-package-form"
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      >
        <MembershipRechargePackageDrawerForm
          initialValue={editingPackage}
          settings={settings}
          supportedCurrencyCodes={supportedCurrencyCodes}
          onSubmit={handleSavePackage}
        />
      </MembershipDrawer>
    </>
  );
}
