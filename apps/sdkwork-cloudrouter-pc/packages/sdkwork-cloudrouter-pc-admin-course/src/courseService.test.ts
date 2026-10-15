import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSdkworkCourseBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import {
  closeCourseAdminOffering,
  convertCourseAdminApplication,
  createCourseAdminCategory,
  createCourseAdminCourse,
  createCourseAdminLesson,
  createCourseAdminResource,
  deleteCourseAdminComment,
  fetchCourseAdminApplications,
  fetchCourseAdminAuditLogDetail,
  fetchCourseAdminCourses,
  fetchCourseAdminLessons,
  fetchCourseAdminProgress,
  fetchCourseAdminReportOverview,
  grantCourseAdminEnrollment,
  moderateCourseAdminComment,
  publishCourseAdminCourse,
  repairCourseAdminLessonProgress,
  reviewCourseAdminApplication,
  revokeCourseAdminEnrollment,
  updateCourseAdminInstructorStatus,
} from './courseService';

vi.mock('@sdkwork/cloudroutes-pc-commons/sdk-clients', () => ({
  getSdkworkCourseBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getSdkworkCourseBackendSdkClient);

function createBackendSdkMock() {
  return {
    courseCategories: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseInstructors: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      status: { update: vi.fn() },
    },
    courses: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      publish: vi.fn(),
      unpublish: vi.fn(),
    },
    courseOfferings: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      publish: vi.fn(),
      close: vi.fn(),
    },
    courseSections: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseLessons: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseResources: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseLiveSessions: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
      cancel: vi.fn(),
      replay: { create: vi.fn(), publish: vi.fn() },
    },
    courseEnrollments: {
      list: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn(),
    },
    courseProgress: {
      list: vi.fn(),
      retrieve: vi.fn(),
    },
    courseLessonProgress: {
      update: vi.fn(),
    },
    courseComments: {
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseReactions: {
      list: vi.fn(),
    },
    courseApplications: {
      list: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      convert: vi.fn(),
    },
    courseReports: {
      overview: { retrieve: vi.fn() },
      learning: { list: vi.fn() },
      liveSessions: { list: vi.fn() },
    },
    courseAuditLogs: {
      list: vi.fn(),
      retrieve: vi.fn(),
    },
  };
}

type BackendSdkMock = ReturnType<typeof createBackendSdkMock>;

let sdkMock: BackendSdkMock;

function envelopePage(items: unknown[]) {
  return {
    items,
    pageInfo: {
      mode: 'offset',
      page: 1,
      pageSize: 20,
      totalItems: String(items.length),
      totalPages: 1,
      hasMore: false,
    },
  };
}

function envelopeItem(item: unknown) {
  return { item };
}

beforeEach(() => {
  sdkMock = createBackendSdkMock();
  mockedGetBackendClient.mockReset();
  mockedGetBackendClient.mockReturnValue(sdkMock as unknown as ReturnType<typeof getSdkworkCourseBackendSdkClient>);
});

describe('course admin service', () => {
  it('lists courses and forwards the list query', async () => {
    sdkMock.courses.list.mockResolvedValue(envelopePage([{
      id: 'c-1',
      courseCode: 'CRS-1',
      title: 'Cloud Router 101',
      status: 'published',
      studentsCount: '12',
      lessonsCount: 4,
      categoryName: 'Platform',
      instructorName: 'Alice',
      updatedAt: '2026-02-01T00:00:00Z',
    }]));

    const page = await fetchCourseAdminCourses({ q: 'router', status: 'published', page: 2, pageSize: 10 });

    expect(sdkMock.courses.list).toHaveBeenCalledWith({
      q: 'router',
      status: 'published',
      page: 2,
      pageSize: 10,
    });
    expect(page.items[0]).toMatchObject({
      id: 'c-1',
      courseCode: 'CRS-1',
      title: 'Cloud Router 101',
      studentsCount: 12,
      lessonsCount: 4,
    });
    expect(page.pageInfo.totalPages).toBe(1);
  });

  it('creates a course with the command body expected by the course backend', async () => {
    sdkMock.courses.create.mockResolvedValue(envelopeItem({ id: 'c-2', title: 'New course' }));

    const course = await createCourseAdminCourse({
      title: '  New course  ',
      subtitle: '  Intro ',
      description: ' ',
    });

    expect(sdkMock.courses.create).toHaveBeenCalledWith({
      title: 'New course',
      subtitle: 'Intro',
      description: undefined,
      tags: [],
    });
    expect(course.id).toBe('c-2');
  });

  it('rejects a course payload without a title before calling the SDK', async () => {
    await expect(createCourseAdminCourse({ title: '   ' })).rejects.toThrow(/course title is required/u);
    expect(sdkMock.courses.create).not.toHaveBeenCalled();
  });

  it('publishes and closes lifecycle resources through command operations', async () => {
    sdkMock.courses.publish.mockResolvedValue({ accepted: true });
    sdkMock.courseOfferings.close.mockResolvedValue({ accepted: true });

    await publishCourseAdminCourse('c-1');
    await closeCourseAdminOffering('o-1');

    expect(sdkMock.courses.publish).toHaveBeenCalledWith('c-1', {});
    expect(sdkMock.courseOfferings.close).toHaveBeenCalledWith('o-1', {});
  });

  it('creates categories with the authoritative field names', async () => {
    sdkMock.courseCategories.create.mockResolvedValue(envelopeItem({ id: 'cat-1', name: 'Platform' }));

    await createCourseAdminCategory({ name: ' Platform ', slug: 'platform', description: '' });

    expect(sdkMock.courseCategories.create).toHaveBeenCalledWith({
      name: 'Platform',
      slug: 'platform',
      description: undefined,
    });
  });

  it('toggles instructor status through the status sub-resource', async () => {
    sdkMock.courseInstructors.status.update.mockResolvedValue(envelopeItem({
      id: 'i-1',
      name: 'Alice',
      status: 'disabled',
    }));

    const instructor = await updateCourseAdminInstructorStatus('i-1', 'disabled');

    expect(sdkMock.courseInstructors.status.update).toHaveBeenCalledWith('i-1', { status: 'disabled' });
    expect(instructor.status).toBe('disabled');
  });

  it('lists lessons for a parent course and maps lesson kind', async () => {
    sdkMock.courseLessons.list.mockResolvedValue(envelopePage([{
      id: 'l-1',
      courseId: 'c-1',
      sectionId: 's-1',
      title: 'Intro',
      kind: 'article',
      durationSeconds: 615,
      freePreview: true,
      status: 'published',
    }]));

    const page = await fetchCourseAdminLessons('c-1');

    expect(sdkMock.courseLessons.list).toHaveBeenCalledWith('c-1', { pageSize: 200 });
    expect(page.items[0]).toMatchObject({
      id: 'l-1',
      kind: 'article',
      durationSeconds: 615,
      freePreview: true,
    });
  });

  it('creates a lesson with lessonKind and free preview flags', async () => {
    sdkMock.courseLessons.create.mockResolvedValue(envelopeItem({ id: 'l-2', title: 'Live intro' }));

    await createCourseAdminLesson('c-1', {
      title: 'Live intro',
      sectionId: 's-1',
      kind: 'live_session',
      freePreview: true,
      externalSourceId: 'BV1',
      sourceProvider: 'bilibili',
    });

    expect(sdkMock.courseLessons.create).toHaveBeenCalledWith('c-1', {
      title: 'Live intro',
      sectionId: 's-1',
      description: undefined,
      freePreview: true,
      lessonKind: 'live_session',
      externalSourceId: 'BV1',
      sourceProvider: 'bilibili',
    });
  });

  it('creates lesson resources with the snake_case drive contract', async () => {
    sdkMock.courseResources.create.mockResolvedValue(envelopeItem({
      id: 'r-1',
      lessonId: 'l-1',
      resourceRole: 'attachment',
      resourceKind: 'drive',
    }));

    await createCourseAdminResource('l-1', {
      driveResourceId: 'drv-1',
      resourceRole: 'attachment',
      resourceKind: 'drive',
      fileName: 'slides.pdf',
      mimeType: 'application/pdf',
    });

    expect(sdkMock.courseResources.create).toHaveBeenCalledWith('l-1', {
      drive_resource_id: 'drv-1',
      resource_role: 'attachment',
      resource_kind: 'drive',
      mime_type: 'application/pdf',
      media_resource_snapshot: JSON.stringify({
        provider: 'drive',
        driveResourceId: 'drv-1',
        fileName: 'slides.pdf',
        mimeType: 'application/pdf',
      }),
    });
  });

  it('grants and revokes enrollments', async () => {
    sdkMock.courseEnrollments.create.mockResolvedValue(envelopeItem({
      id: 'e-1',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'active',
    }));
    sdkMock.courseEnrollments.revoke.mockResolvedValue({ accepted: true });

    const enrollment = await grantCourseAdminEnrollment({ courseId: 'c-1', userId: 'u-1' });
    await revokeCourseAdminEnrollment('e-1');

    expect(sdkMock.courseEnrollments.create).toHaveBeenCalledWith({
      courseId: 'c-1',
      userId: 'u-1',
      source: 'admin_grant',
      remark: undefined,
    });
    expect(enrollment.status).toBe('active');
    expect(sdkMock.courseEnrollments.revoke).toHaveBeenCalledWith('e-1', {});
  });

  it('repairs lesson progress with a completion flag', async () => {
    sdkMock.courseLessonProgress.update.mockResolvedValue({ id: 'lp-1' });

    await repairCourseAdminLessonProgress('lp-1', { completed: true });

    expect(sdkMock.courseLessonProgress.update).toHaveBeenCalledWith('lp-1', {
      completed: true,
      progressPercent: 100,
    });
  });

  it('lists progress rows and normalizes the completion counters', async () => {
    sdkMock.courseProgress.list.mockResolvedValue(envelopePage([{
      id: 'p-1',
      enrollmentId: 'e-1',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'in_progress',
      progressPercent: 42,
      completedLessons: '3',
      totalLessons: '8',
    }]));

    const page = await fetchCourseAdminProgress();

    expect(page.items[0]).toMatchObject({
      id: 'p-1',
      progressPercent: 42,
      completedLessons: 3,
      totalLessons: 8,
    });
  });

  it('reviews and converts applications', async () => {
    sdkMock.courseApplications.list.mockResolvedValue(envelopePage([{
      id: 'a-1',
      courseId: 'c-1',
      applicantName: 'Bob',
      status: 'pending',
      submittedAt: '2026-03-01T00:00:00Z',
    }]));
    sdkMock.courseApplications.update.mockResolvedValue(envelopeItem({
      id: 'a-1',
      status: 'approved',
    }));
    sdkMock.courseApplications.convert.mockResolvedValue(envelopeItem({
      id: 'a-1',
      status: 'converted',
    }));

    const page = await fetchCourseAdminApplications({ status: 'pending' });
    const approved = await reviewCourseAdminApplication('a-1', { decision: 'approved', remark: 'ok' });
    const converted = await convertCourseAdminApplication('a-1');

    expect(page.items[0].applicantName).toBe('Bob');
    expect(sdkMock.courseApplications.update).toHaveBeenCalledWith('a-1', {
      decision: 'approved',
      remark: 'ok',
    });
    expect(sdkMock.courseApplications.convert).toHaveBeenCalledWith('a-1', {});
    expect(approved.status).toBe('approved');
    expect(converted.status).toBe('converted');
  });

  it('moderates and deletes comments', async () => {
    sdkMock.courseComments.update.mockResolvedValue(envelopeItem({
      id: 'cm-1',
      courseId: 'c-1',
      authorName: 'Bob',
      body: 'spam',
      moderationState: 'hidden',
      createdAt: '2026-03-02T00:00:00Z',
    }));
    sdkMock.courseComments.delete.mockResolvedValue(undefined);

    const comment = await moderateCourseAdminComment('cm-1', 'hidden');
    await deleteCourseAdminComment('cm-1');

    expect(sdkMock.courseComments.update).toHaveBeenCalledWith('cm-1', { moderationState: 'hidden' });
    expect(comment.moderationState).toBe('hidden');
    expect(sdkMock.courseComments.delete).toHaveBeenCalledWith('cm-1');
  });

  it('reads the report overview payload', async () => {
    sdkMock.courseReports.overview.retrieve.mockResolvedValue({
      courseCount: 12,
      publishedCourseCount: 9,
      studentCount: '340',
      enrollmentCount: 410,
      liveSessionCount: 6,
      completionRate: 0.62,
    });

    const overview = await fetchCourseAdminReportOverview();

    expect(overview).toEqual({
      courseCount: 12,
      publishedCourseCount: 9,
      studentCount: 340,
      enrollmentCount: 410,
      liveSessionCount: 6,
      completionRate: 0.62,
    });
  });

  it('reads a full audit log record for the detail drawer', async () => {
    sdkMock.courseAuditLogs.retrieve.mockResolvedValue({
      id: 'al-1',
      action: 'course.published',
      resource: 'courses',
      resourceId: 'c-1',
    });

    const detail = await fetchCourseAdminAuditLogDetail('al-1');

    expect(sdkMock.courseAuditLogs.retrieve).toHaveBeenCalledWith('al-1');
    expect(detail.action).toBe('course.published');
  });

  it('never falls back to raw HTTP for any course admin operation', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile(
      new URL('./courseService.ts', import.meta.url),
      'utf8',
    ));

    expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|authorization/iu);
    expect(source).toMatch(/getSdkworkCourseBackendSdkClient\(\)/u);
  });
});
