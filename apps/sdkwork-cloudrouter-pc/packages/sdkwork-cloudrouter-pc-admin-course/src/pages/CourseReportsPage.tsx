import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import { CourseTablePanel } from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  fetchCourseAdminLearningReport,
  fetchCourseAdminLiveSessionReport,
  fetchCourseAdminReportOverview,
  type CourseAdminReportOverview,
  type CourseAdminReportRow,
} from '../courseService';
import { formatCourseCount, formatCoursePercent } from '../courseFormat';
import { useCourseAdminList, type CourseAdminListController } from '../useCourseAdminList';

type CourseReportKind = 'learning' | 'live';

function courseReportTabClassName(isActive: boolean): string {
  if (isActive) {
    return 'inline-flex items-center gap-1 rounded-md border border-transparent bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700';
  }
  return 'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10';
}

interface CourseReportStatCardProps {
  label: string;
  value: string;
}

function CourseReportStatCard({ label, value }: CourseReportStatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function CourseReportsPage() {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState<CourseReportKind>('learning');
  const [overview, setOverview] = useState<CourseAdminReportOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadOverview = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCourseAdminReportOverview();
      if (requestId === requestIdRef.current) {
        setOverview(result);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(
          loadError,
          t,
          t('admin.course.reports.error', 'Course reports could not be loaded'),
        ));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadOverview();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadOverview]);

  return (
    <CourseAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadOverview()}
      actions={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveReport('learning')}
            aria-pressed={activeReport === 'learning'}
            className={courseReportTabClassName(activeReport === 'learning')}
          >
            {t('admin.course.reports.tab.learning', 'Learning report')}
          </button>
          <button
            type="button"
            onClick={() => setActiveReport('live')}
            aria-pressed={activeReport === 'live'}
            className={courseReportTabClassName(activeReport === 'live')}
          >
            {t('admin.course.reports.tab.live', 'Live session report')}
          </button>
        </div>
      )}
    >
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('admin.course.reports.overviewTitle', 'Report overview')}
        </h3>
        {overview ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CourseReportStatCard
              label={t('admin.course.reports.courseCount', 'Courses')}
              value={formatCourseCount(overview.courseCount)}
            />
            <CourseReportStatCard
              label={t('admin.course.reports.publishedCourseCount', 'Published courses')}
              value={formatCourseCount(overview.publishedCourseCount)}
            />
            <CourseReportStatCard
              label={t('admin.course.reports.studentCount', 'Learners')}
              value={formatCourseCount(overview.studentCount)}
            />
            <CourseReportStatCard
              label={t('admin.course.reports.enrollmentCount', 'Enrollments')}
              value={formatCourseCount(overview.enrollmentCount)}
            />
            <CourseReportStatCard
              label={t('admin.course.reports.liveSessionCount', 'Live sessions')}
              value={formatCourseCount(overview.liveSessionCount)}
            />
            <CourseReportStatCard
              label={t('admin.course.reports.completionRate', 'Completion rate')}
              value={formatCoursePercent(overview.completionRate)}
            />
          </div>
        ) : null}
      </div>

      {activeReport === 'learning' ? <CourseLearningReportTable /> : <CourseLiveSessionReportTable />}
    </CourseAdminPageShell>
  );
}

function CourseLearningReportTable() {
  const { t } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminLearningReport,
    t('admin.course.reports.error', 'Course reports could not be loaded'),
  );

  return (
    <CourseReportTable
      list={list}
      labelHeader={t('admin.course.reports.column.label', 'Course')}
      primaryHeader={t('admin.course.reports.column.primary', 'Learners')}
      secondaryHeader={t('admin.course.reports.column.secondary', 'Completion rate')}
    />
  );
}

function CourseLiveSessionReportTable() {
  const { t } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminLiveSessionReport,
    t('admin.course.reports.error', 'Course reports could not be loaded'),
  );

  return (
    <CourseReportTable
      list={list}
      labelHeader={t('admin.course.reports.column.liveLabel', 'Live session')}
      primaryHeader={t('admin.course.reports.column.livePrimary', 'Viewers')}
      secondaryHeader={t('admin.course.reports.column.liveSecondary', 'Duration (min)')}
    />
  );
}

interface CourseReportTableProps {
  list: CourseAdminListController<CourseAdminReportRow>;
  labelHeader: string;
  primaryHeader: string;
  secondaryHeader: string;
}

/** Report table shell; loading and errors stay on the page-level overview surface. */
function CourseReportTable({ list, labelHeader, primaryHeader, secondaryHeader }: CourseReportTableProps) {
  const { t } = useTranslation();

  return (
    <CourseAdminPageShell
      isLoading={false}
      error={null}
      onRefresh={() => void list.reload()}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={[]}
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
          <CourseEmptyState title={t('admin.course.reports.empty', 'No report rows yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{labelHeader}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{primaryHeader}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{secondaryHeader}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.reports.column.period', 'Period')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.reports.column.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{row.label}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(row.primaryValue)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCoursePercent(row.secondaryValue)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{row.period ?? '-'}</td>
                  <td className="px-4 py-2.5"><CourseStatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CourseTablePanel>
    </CourseAdminPageShell>
  );
}
