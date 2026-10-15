import { CourseApplicationsPage } from './pages/CourseApplicationsPage';
import { CourseAuditLogsPage } from './pages/CourseAuditLogsPage';
import { CourseCatalogPage } from './pages/CourseCatalogPage';
import { CourseCategoriesPage } from './pages/CourseCategoriesPage';
import { CourseCommentsPage } from './pages/CourseCommentsPage';
import { CourseContentPage } from './pages/CourseContentPage';
import { CourseEnrollmentsPage } from './pages/CourseEnrollmentsPage';
import { CourseInstructorsPage } from './pages/CourseInstructorsPage';
import { CourseLiveSessionsPage } from './pages/CourseLiveSessionsPage';
import { CourseOfferingsPage } from './pages/CourseOfferingsPage';
import { CourseOverviewPage } from './pages/CourseOverviewPage';
import { CourseProgressPage } from './pages/CourseProgressPage';
import { CourseReportsPage } from './pages/CourseReportsPage';

export type CourseAdminSectionId =
  | 'overview'
  | 'courses'
  | 'categories'
  | 'instructors'
  | 'offerings'
  | 'content'
  | 'liveSessions'
  | 'enrollments'
  | 'progress'
  | 'applications'
  | 'comments'
  | 'reports'
  | 'auditLogs';

type CourseAdminProps = { sectionId?: string };

function resolveCourseSectionId(sectionId?: string): CourseAdminSectionId {
  if (
    sectionId === 'courses'
    || sectionId === 'categories'
    || sectionId === 'instructors'
    || sectionId === 'offerings'
    || sectionId === 'content'
    || sectionId === 'liveSessions'
    || sectionId === 'enrollments'
    || sectionId === 'progress'
    || sectionId === 'applications'
    || sectionId === 'comments'
    || sectionId === 'reports'
    || sectionId === 'auditLogs'
  ) {
    return sectionId;
  }
  return 'overview';
}

/** 课程中心 (Course Center) admin module. */
export function CourseAdmin({ sectionId }: CourseAdminProps = {}) {
  const activeSection = resolveCourseSectionId(sectionId);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {activeSection === 'overview' ? (
        <CourseOverviewPage />
      ) : activeSection === 'courses' ? (
        <CourseCatalogPage />
      ) : activeSection === 'categories' ? (
        <CourseCategoriesPage />
      ) : activeSection === 'instructors' ? (
        <CourseInstructorsPage />
      ) : activeSection === 'offerings' ? (
        <CourseOfferingsPage />
      ) : activeSection === 'content' ? (
        <CourseContentPage />
      ) : activeSection === 'liveSessions' ? (
        <CourseLiveSessionsPage />
      ) : activeSection === 'enrollments' ? (
        <CourseEnrollmentsPage />
      ) : activeSection === 'progress' ? (
        <CourseProgressPage />
      ) : activeSection === 'applications' ? (
        <CourseApplicationsPage />
      ) : activeSection === 'comments' ? (
        <CourseCommentsPage />
      ) : activeSection === 'reports' ? (
        <CourseReportsPage />
      ) : (
        <CourseAuditLogsPage />
      )}
    </div>
  );
}

export default CourseAdmin;
