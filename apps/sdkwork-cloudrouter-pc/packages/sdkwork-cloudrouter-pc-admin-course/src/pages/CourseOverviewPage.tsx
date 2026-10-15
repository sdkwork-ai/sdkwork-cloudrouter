import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import {
  fetchCourseAdminReportOverview,
  type CourseAdminReportOverview,
} from '../courseService';
import { formatCourseCount, formatCoursePercent } from '../courseFormat';

interface CourseStatCardProps {
  label: string;
  value: string;
}

function CourseStatCard({ label, value }: CourseStatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function CourseOverviewPage() {
  const { t } = useTranslation();
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
      if (requestId !== requestIdRef.current) {
        return;
      }
      setOverview(result);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(
          loadError,
          t,
          t('admin.course.overview.error', 'Course overview could not be loaded'),
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
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        {overview ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CourseStatCard
              label={t('admin.course.overview.courseCount', 'Courses')}
              value={formatCourseCount(overview.courseCount)}
            />
            <CourseStatCard
              label={t('admin.course.overview.publishedCourseCount', 'Published courses')}
              value={formatCourseCount(overview.publishedCourseCount)}
            />
            <CourseStatCard
              label={t('admin.course.overview.studentCount', 'Students')}
              value={formatCourseCount(overview.studentCount)}
            />
            <CourseStatCard
              label={t('admin.course.overview.enrollmentCount', 'Enrollments')}
              value={formatCourseCount(overview.enrollmentCount)}
            />
            <CourseStatCard
              label={t('admin.course.overview.liveSessionCount', 'Live sessions')}
              value={formatCourseCount(overview.liveSessionCount)}
            />
            <CourseStatCard
              label={t('admin.course.overview.completionRate', 'Completion rate')}
              value={formatCoursePercent(overview.completionRate)}
            />
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.course.overview.guideTitle', 'Getting started')}
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <li>{t('admin.course.overview.guideCourses', 'Create and publish courses from the Courses section.')}</li>
            <li>{t('admin.course.overview.guideContent', 'Build every course outline with sections, lessons and attachments under Course Content.')}</li>
            <li>{t('admin.course.overview.guideLiveSessions', 'Schedule live sessions under Live Sessions and publish the replay afterwards.')}</li>
          </ul>
        </div>
      </div>
    </CourseAdminPageShell>
  );
}
