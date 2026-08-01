import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomPagination } from '@sdkwork/clawroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipTablePanel,
  hasNextMembershipPage,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import {
  fetchMembershipAdminEntitlements,
  type MembershipsAdminPageInfo,
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<MembershipsAdminPageInfo | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadEntitlements({ page, pageSize });
      setEntitlements(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.entitlements.error', 'Entitlements could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [loadEntitlements, page, pageSize, t]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <MembershipAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={loadRecords}
    >
      <MembershipTablePanel
        footer={(
          <BottomPagination
            disabled={isLoading}
            hasNextPage={hasNextMembershipPage(pageInfo, page, entitlements.length, pageSize)}
            itemCount={entitlements.length}
            nextLabel={t('common.pagination.next', 'Next page')}
            onNextPage={() => setPage((current) => current + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            }}
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            pageLabel={membershipPageLabel(t('common.pagination.page', 'Page'), page, pageInfo)}
            pageSize={pageSize}
            pageSizeLabel={t('common.pagination.rows', 'Rows')}
            pageSizeOptions={[20, 50, 100]}
            previousLabel={t('common.pagination.previous', 'Previous page')}
            showingLabel={t('common.pagination.showing', 'Showing')}
          />
        )}
      >
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
