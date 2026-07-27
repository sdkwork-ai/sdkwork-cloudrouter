import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import { MembershipTablePanel } from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import {
  fetchMembershipAdminEntitlements,
  type MembershipsAdminRecord,
} from '../membershipsService';

interface MembershipEntitlementsPageProps {
  loadEntitlements?: typeof fetchMembershipAdminEntitlements;
}

export function MembershipEntitlementsPage({
  loadEntitlements = fetchMembershipAdminEntitlements,
}: MembershipEntitlementsPageProps) {
  const { t } = useTranslation();
  const [entitlements, setEntitlements] = useState<MembershipsAdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setEntitlements(await loadEntitlements());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.entitlements.error', 'Entitlements could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [loadEntitlements, t]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <MembershipAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={loadRecords}
    >
      <MembershipTablePanel>
        {entitlements.length === 0 ? (
          <MembershipEmptyState title={t('admin.commerce.memberships.entitlements.empty', 'No entitlement records')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.entitlements.table.entitlement', 'Entitlement')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.entitlements.table.plan', 'Plan')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.entitlements.table.benefit', 'Benefit')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.entitlements.table.quota', 'Quota')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.entitlements.table.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {entitlements.map((item, index) => (
                <tr key={recordText(item, ['id', 'entitlement_no']) || index} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{recordText(item, ['entitlement_no', 'id'])}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{recordText(item, ['plan_id', 'plan_no'])}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{recordText(item, ['benefit_code', 'benefitKey'])}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{recordText(item, ['quota_amount', 'quotaAmount'])}</td>
                  <td className="px-4 py-2.5"><MembershipStatusBadge status={recordText(item, ['status'])} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </MembershipTablePanel>
    </MembershipAdminPageShell>
  );
}

function recordText(record: MembershipsAdminRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}
