import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/api-result';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import { CourseFormFrame } from '../components/CourseFormControls';
import { CourseTableActions, CourseTablePanel, CourseTextActionButton } from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  fetchCourseAdminAuditLogDetail,
  fetchCourseAdminAuditLogs,
  type CourseAdminAuditLogItem,
} from '../courseService';
import { formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_AUDIT_STATUS_OPTIONS = ['succeeded', 'failed'];

export function CourseAuditLogsPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminAuditLogs,
    t('admin.course.audit.error', 'Course audit logs could not be loaded'),
  );
  const [detailLog, setDetailLog] = useState<CourseAdminAuditLogItem | null>(null);
  const [detail, setDetail] = useState<ApiRecord | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const detailRequestIdRef = useRef(0);

  const closeDetailDrawer = () => {
    detailRequestIdRef.current += 1;
    setDetailLog(null);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(false);
  };

  const handleOpenDetail = async (log: CourseAdminAuditLogItem) => {
    const requestId = ++detailRequestIdRef.current;
    setDetailLog(log);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const record = await fetchCourseAdminAuditLogDetail(log.id);
      if (requestId === detailRequestIdRef.current) {
        setDetail(record);
      }
    } catch (loadError) {
      if (requestId === detailRequestIdRef.current) {
        setDetailError(resolveProblemMessage(
          loadError,
          t,
          t('admin.course.audit.detailError', 'Audit log detail could not be loaded'),
        ));
      }
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setIsDetailLoading(false);
      }
    }
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={COURSE_AUDIT_STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`admin.course.status.${value}`, value),
        }))}
      />

      <CourseTablePanel footer={(
        <CoursePagination
          page={list.page}
          pageSize={list.pageSize}
          itemCount={list.items.length}
          pageInfo={list.pageInfo}
          onPageChange={list.setPage}
        />
      )}
      >
        {list.items.length === 0 ? (
          <CourseEmptyState title={t('admin.course.audit.empty', 'No audit logs yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.action', 'Action')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.resource', 'Resource')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.resourceId', 'Resource id')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.operator', 'Operator')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.created', 'Created')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.audit.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.audit.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{log.action}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{log.resource}</td>
                  <td className="px-4 py-2.5 text-slate-500">{log.resourceId || t('admin.course.audit.emptyField', '-')}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{log.operatorName ?? t('admin.course.audit.emptyField', '-')}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(log.createdAt, i18n.language)}</td>
                  <td className="px-4 py-2.5"><CourseStatusBadge status={log.status} /></td>
                  <td className="px-4 py-2.5">
                    <CourseTableActions>
                      <CourseTextActionButton
                        label={t('admin.course.audit.detail', 'Detail')}
                        onClick={() => void handleOpenDetail(log)}
                      />
                    </CourseTableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CourseTablePanel>

      <CourseDrawer
        title={t('admin.course.audit.detailTitle', 'Audit log detail')}
        description={detailLog?.resource}
        isOpen={detailLog !== null}
        onClose={closeDetailDrawer}
      >
        {isDetailLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.course.audit.detailLoading', 'Loading audit log...')}
          </p>
        ) : (
          <CourseFormFrame error={detailError}>
            {detail && Object.keys(detail).length > 0 ? (
              <dl className="flex flex-col gap-3">
                {Object.entries(detail).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,180px)_1fr] gap-3">
                    <dt className="break-words text-xs font-medium text-slate-500">{key}</dt>
                    <dd className="break-words text-sm text-slate-700 dark:text-slate-200">
                      {stringifyCourseAuditValue(value, t('admin.course.audit.emptyField', '-'))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <CourseEmptyState title={t('admin.course.audit.detailEmpty', 'No detail fields returned')} />
            )}
          </CourseFormFrame>
        )}
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

/** Audit payload fields are backend-owned, so nested values fall back to their JSON form. */
function stringifyCourseAuditValue(value: unknown, emptyText: string): string {
  if (value === null || value === undefined) {
    return emptyText;
  }
  if (typeof value === 'string') {
    return value.trim() || emptyText;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? emptyText;
    } catch {
      return emptyText;
    }
  }
  return String(value);
}
