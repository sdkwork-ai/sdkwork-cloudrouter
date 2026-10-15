import {
  isRecord,
  readBoolean,
  readNumber,
  readRequiredApiItem,
  readRequiredApiItems,
  readString,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/api-result';
import { getSdkworkCourseBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

export interface CourseAdminPageInfo {
  mode: 'offset' | 'cursor';
  page?: number;
  pageSize?: number;
  totalItems?: string;
  totalPages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface CourseAdminPage<T> {
  items: T[];
  pageInfo: CourseAdminPageInfo;
}

/** Shared list query shape; every course backend list operation accepts exactly these filters. */
export interface CourseAdminListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CourseAdminCourseItem {
  id: string;
  courseCode: string;
  title: string;
  subtitle?: string;
  status: string;
  studentsCount: number;
  lessonsCount: number;
  categoryName?: string;
  instructorName?: string;
  updatedAt: string;
}

export interface CourseAdminCourseMutationInput {
  title: string;
  subtitle?: string;
  description?: string;
}

export interface CourseAdminCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  sortOrder: number;
}

export interface CourseAdminCategoryMutationInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface CourseAdminInstructorItem {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  status: string;
  courseCount: number;
  studentCount: number;
}

export interface CourseAdminInstructorMutationInput {
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface CourseAdminOfferingItem {
  id: string;
  courseId: string;
  title: string;
  status: string;
  capacity: number;
  enrolledCount: number;
  startAt?: string;
  endAt?: string;
}

export interface CourseAdminOfferingMutationInput {
  title: string;
  capacity?: number;
  startAt?: string;
  endAt?: string;
}

export interface CourseAdminSectionItem {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  lessonCount: number;
  sortWeight: number;
  status: string;
}

export interface CourseAdminSectionMutationInput {
  title: string;
  description?: string;
}

export interface CourseAdminLessonItem {
  id: string;
  courseId: string;
  sectionId?: string;
  title: string;
  kind: string;
  durationSeconds: number;
  freePreview: boolean;
  status: string;
  externalSourceId?: string;
  sourceProvider?: string;
}

export interface CourseAdminLessonMutationInput {
  title: string;
  sectionId?: string;
  description?: string;
  kind?: string;
  freePreview?: boolean;
  externalSourceId?: string;
  sourceProvider?: string;
}

export interface CourseAdminResourceItem {
  id: string;
  lessonId: string;
  resourceRole: string;
  resourceKind: string;
  fileName?: string;
  driveResourceId?: string;
  mimeType?: string;
  status: string;
}

export interface CourseAdminResourceMutationInput {
  resourceRole: string;
  resourceKind: string;
  driveResourceId: string;
  fileName?: string;
  mimeType?: string;
}

export interface CourseAdminLiveSessionItem {
  id: string;
  courseId: string;
  title: string;
  status: string;
  instructorName?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  playbackUrl?: string;
}

export interface CourseAdminLiveSessionMutationInput {
  courseId: string;
  title: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  instructorId?: string;
}

export interface CourseAdminEnrollmentItem {
  id: string;
  courseId: string;
  courseTitle?: string;
  userId: string;
  userName?: string;
  status: string;
  source: string;
  enrolledAt: string;
}

export interface CourseAdminEnrollmentGrantInput {
  courseId: string;
  userId: string;
  source?: string;
  remark?: string;
}

export interface CourseAdminProgressItem {
  id: string;
  enrollmentId: string;
  courseId: string;
  userId: string;
  status: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastStudiedAt?: string;
}

export interface CourseAdminApplicationItem {
  id: string;
  courseId: string;
  courseTitle?: string;
  applicantName: string;
  applicantContact?: string;
  status: string;
  remark?: string;
  submittedAt: string;
}

export type CourseAdminApplicationReviewDecision = 'approved' | 'rejected';

export interface CourseAdminApplicationReviewInput {
  decision: CourseAdminApplicationReviewDecision;
  remark?: string;
}

export interface CourseAdminCommentItem {
  id: string;
  courseId: string;
  lessonId?: string;
  authorName: string;
  body: string;
  moderationState: string;
  createdAt: string;
}

export type CourseAdminCommentModerationState = 'visible' | 'hidden' | 'rejected';

export interface CourseAdminReactionItem {
  id: string;
  targetType: string;
  targetId: string;
  reaction: string;
  count: number;
  updatedAt: string;
}

export interface CourseAdminReportOverview {
  courseCount: number;
  publishedCourseCount: number;
  studentCount: number;
  enrollmentCount: number;
  liveSessionCount: number;
  completionRate: number;
}

export interface CourseAdminReportRow {
  id: string;
  label: string;
  primaryValue: number;
  secondaryValue: number;
  status: string;
  period?: string;
}

export interface CourseAdminAuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  operatorName?: string;
  status: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminCourses(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminCourseItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courses.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Courses could not be loaded').map(normalizeCourse),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function fetchCourseAdminCourseOptions(limit = 200): Promise<CourseAdminCourseItem[]> {
  const result = await getSdkworkCourseBackendSdkClient().courses.list({ pageSize: requiredPageSize(limit) });
  return readRequiredApiItems(result, 'Courses could not be loaded').map(normalizeCourse);
}

export async function createCourseAdminCourse(
  input: CourseAdminCourseMutationInput,
): Promise<CourseAdminCourseItem> {
  const result = await getSdkworkCourseBackendSdkClient().courses.create({
    title: requiredCourseText(input.title, 'course title'),
    subtitle: optionalText(input.subtitle),
    description: optionalText(input.description),
    tags: [],
  });
  return normalizeCourse(readRequiredApiItem(result, 'Course could not be created'));
}

export async function updateCourseAdminCourse(
  courseId: string,
  input: CourseAdminCourseMutationInput,
): Promise<CourseAdminCourseItem> {
  const result = await getSdkworkCourseBackendSdkClient().courses.update(
    requiredCourseText(courseId, 'courseId'),
    {
      title: requiredCourseText(input.title, 'course title'),
      subtitle: optionalText(input.subtitle),
      description: optionalText(input.description),
    },
  );
  return normalizeCourse(readRequiredApiItem(result, 'Course could not be updated'));
}

export async function publishCourseAdminCourse(courseId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courses.publish(requiredCourseText(courseId, 'courseId'), {});
}

export async function unpublishCourseAdminCourse(courseId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courses.unpublish(requiredCourseText(courseId, 'courseId'), {});
}

export async function deleteCourseAdminCourse(courseId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courses.delete(requiredCourseText(courseId, 'courseId'));
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminCategories(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminCategoryItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseCategories.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course categories could not be loaded').map(normalizeCategory),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function createCourseAdminCategory(
  input: CourseAdminCategoryMutationInput,
): Promise<CourseAdminCategoryItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseCategories.create({
    name: requiredCourseText(input.name, 'category name'),
    slug: optionalText(input.slug),
    description: optionalText(input.description),
  });
  return normalizeCategory(readRequiredApiItem(result, 'Course category could not be created'));
}

export async function updateCourseAdminCategory(
  categoryId: string,
  input: CourseAdminCategoryMutationInput,
): Promise<CourseAdminCategoryItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseCategories.update(
    requiredCourseText(categoryId, 'categoryId'),
    {
      name: requiredCourseText(input.name, 'category name'),
      slug: optionalText(input.slug),
      description: optionalText(input.description),
    },
  );
  return normalizeCategory(readRequiredApiItem(result, 'Course category could not be updated'));
}

export async function deleteCourseAdminCategory(categoryId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseCategories.delete(
    requiredCourseText(categoryId, 'categoryId'),
  );
}

/* ------------------------------------------------------------------ */
/* Instructors                                                         */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminInstructors(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminInstructorItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseInstructors.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course instructors could not be loaded').map(normalizeInstructor),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function createCourseAdminInstructor(
  input: CourseAdminInstructorMutationInput,
): Promise<CourseAdminInstructorItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseInstructors.create({
    name: requiredCourseText(input.name, 'instructor name'),
    title: optionalText(input.title),
    bio: optionalText(input.bio),
    avatarUrl: optionalText(input.avatarUrl),
  });
  return normalizeInstructor(readRequiredApiItem(result, 'Course instructor could not be created'));
}

export async function updateCourseAdminInstructor(
  instructorId: string,
  input: CourseAdminInstructorMutationInput,
): Promise<CourseAdminInstructorItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseInstructors.update(
    requiredCourseText(instructorId, 'instructorId'),
    {
      name: requiredCourseText(input.name, 'instructor name'),
      title: optionalText(input.title),
      bio: optionalText(input.bio),
      avatarUrl: optionalText(input.avatarUrl),
    },
  );
  return normalizeInstructor(readRequiredApiItem(result, 'Course instructor could not be updated'));
}

export async function updateCourseAdminInstructorStatus(
  instructorId: string,
  status: string,
): Promise<CourseAdminInstructorItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseInstructors.status.update(
    requiredCourseText(instructorId, 'instructorId'),
    { status: requiredCourseText(status, 'status') },
  );
  return normalizeInstructor(readRequiredApiItem(result, 'Course instructor status could not be updated'));
}

/* ------------------------------------------------------------------ */
/* Offerings                                                           */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminOfferings(
  courseId: string,
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminOfferingItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseOfferings.list(
    requiredCourseText(courseId, 'courseId'),
    buildListQuery(params),
  );
  return {
    items: readRequiredApiItems(result, 'Course offerings could not be loaded').map(normalizeOffering),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function createCourseAdminOffering(
  courseId: string,
  input: CourseAdminOfferingMutationInput,
): Promise<CourseAdminOfferingItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseOfferings.create(
    requiredCourseText(courseId, 'courseId'),
    {
      title: requiredCourseText(input.title, 'offering title'),
      capacity: optionalNumber(input.capacity),
      startAt: optionalText(input.startAt),
      endAt: optionalText(input.endAt),
    },
  );
  return normalizeOffering(readRequiredApiItem(result, 'Course offering could not be created'));
}

export async function updateCourseAdminOffering(
  offeringId: string,
  input: CourseAdminOfferingMutationInput,
): Promise<CourseAdminOfferingItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseOfferings.update(
    requiredCourseText(offeringId, 'offeringId'),
    {
      title: requiredCourseText(input.title, 'offering title'),
      capacity: optionalNumber(input.capacity),
      startAt: optionalText(input.startAt),
      endAt: optionalText(input.endAt),
    },
  );
  return normalizeOffering(readRequiredApiItem(result, 'Course offering could not be updated'));
}

export async function publishCourseAdminOffering(offeringId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseOfferings.publish(
    requiredCourseText(offeringId, 'offeringId'),
    {},
  );
}

export async function closeCourseAdminOffering(offeringId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseOfferings.close(
    requiredCourseText(offeringId, 'offeringId'),
    {},
  );
}

export async function deleteCourseAdminOffering(offeringId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseOfferings.delete(
    requiredCourseText(offeringId, 'offeringId'),
  );
}

/* ------------------------------------------------------------------ */
/* Sections and lessons                                                */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminSections(courseId: string): Promise<CourseAdminSectionItem[]> {
  const result = await getSdkworkCourseBackendSdkClient().courseSections.list(
    requiredCourseText(courseId, 'courseId'),
    { pageSize: 200 },
  );
  return readRequiredApiItems(result, 'Course sections could not be loaded').map(normalizeSection);
}

export async function createCourseAdminSection(
  courseId: string,
  input: CourseAdminSectionMutationInput,
): Promise<CourseAdminSectionItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseSections.create(
    requiredCourseText(courseId, 'courseId'),
    {
      title: requiredCourseText(input.title, 'section title'),
      description: optionalText(input.description),
    },
  );
  return normalizeSection(readRequiredApiItem(result, 'Course section could not be created'));
}

export async function updateCourseAdminSection(
  sectionId: string,
  input: CourseAdminSectionMutationInput,
): Promise<CourseAdminSectionItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseSections.update(
    requiredCourseText(sectionId, 'sectionId'),
    {
      title: requiredCourseText(input.title, 'section title'),
      description: optionalText(input.description),
    },
  );
  return normalizeSection(readRequiredApiItem(result, 'Course section could not be updated'));
}

export async function deleteCourseAdminSection(sectionId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseSections.delete(requiredCourseText(sectionId, 'sectionId'));
}

export async function fetchCourseAdminLessons(
  courseId: string,
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminLessonItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseLessons.list(
    requiredCourseText(courseId, 'courseId'),
    { ...buildListQuery(params), pageSize: params.pageSize ?? 200 },
  );
  return {
    items: readRequiredApiItems(result, 'Course lessons could not be loaded').map(normalizeLesson),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function createCourseAdminLesson(
  courseId: string,
  input: CourseAdminLessonMutationInput,
): Promise<CourseAdminLessonItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseLessons.create(
    requiredCourseText(courseId, 'courseId'),
    {
      title: requiredCourseText(input.title, 'lesson title'),
      sectionId: optionalText(input.sectionId),
      description: optionalText(input.description),
      freePreview: input.freePreview ?? false,
      lessonKind: optionalText(input.kind) ?? 'vod_video',
      externalSourceId: optionalText(input.externalSourceId),
      sourceProvider: optionalText(input.sourceProvider),
    },
  );
  return normalizeLesson(readRequiredApiItem(result, 'Course lesson could not be created'));
}

export async function updateCourseAdminLesson(
  lessonId: string,
  input: CourseAdminLessonMutationInput,
): Promise<CourseAdminLessonItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseLessons.update(
    requiredCourseText(lessonId, 'lessonId'),
    {
      title: requiredCourseText(input.title, 'lesson title'),
      sectionId: optionalText(input.sectionId),
      description: optionalText(input.description),
      freePreview: input.freePreview ?? false,
      lessonKind: optionalText(input.kind),
      externalSourceId: optionalText(input.externalSourceId),
      sourceProvider: optionalText(input.sourceProvider),
    },
  );
  return normalizeLesson(readRequiredApiItem(result, 'Course lesson could not be updated'));
}

export async function deleteCourseAdminLesson(lessonId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLessons.delete(requiredCourseText(lessonId, 'lessonId'));
}

/* ------------------------------------------------------------------ */
/* Lesson resources                                                    */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminResources(lessonId: string): Promise<CourseAdminResourceItem[]> {
  const result = await getSdkworkCourseBackendSdkClient().courseResources.list(
    requiredCourseText(lessonId, 'lessonId'),
    { pageSize: 200 },
  );
  return readRequiredApiItems(result, 'Course resources could not be loaded').map(normalizeResource);
}

export async function createCourseAdminResource(
  lessonId: string,
  input: CourseAdminResourceMutationInput,
): Promise<CourseAdminResourceItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseResources.create(
    requiredCourseText(lessonId, 'lessonId'),
    buildResourceBody(input),
  );
  return normalizeResource(readRequiredApiItem(result, 'Course resource could not be created'));
}

export async function updateCourseAdminResource(
  resourceRefId: string,
  input: CourseAdminResourceMutationInput,
): Promise<CourseAdminResourceItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseResources.update(
    requiredCourseText(resourceRefId, 'resourceRefId'),
    buildResourceBody(input),
  );
  return normalizeResource(readRequiredApiItem(result, 'Course resource could not be updated'));
}

export async function deleteCourseAdminResource(resourceRefId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseResources.delete(
    requiredCourseText(resourceRefId, 'resourceRefId'),
  );
}

/* ------------------------------------------------------------------ */
/* Live sessions                                                       */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminLiveSessions(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminLiveSessionItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseLiveSessions.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Live sessions could not be loaded').map(normalizeLiveSession),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function createCourseAdminLiveSession(
  input: CourseAdminLiveSessionMutationInput,
): Promise<CourseAdminLiveSessionItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseLiveSessions.create(
    buildLiveSessionBody(input),
  );
  return normalizeLiveSession(readRequiredApiItem(result, 'Live session could not be created'));
}

export async function updateCourseAdminLiveSession(
  liveSessionId: string,
  input: CourseAdminLiveSessionMutationInput,
): Promise<CourseAdminLiveSessionItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseLiveSessions.update(
    requiredCourseText(liveSessionId, 'liveSessionId'),
    buildLiveSessionBody(input),
  );
  return normalizeLiveSession(readRequiredApiItem(result, 'Live session could not be updated'));
}

export async function startCourseAdminLiveSession(liveSessionId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLiveSessions.start(
    requiredCourseText(liveSessionId, 'liveSessionId'),
    {},
  );
}

export async function endCourseAdminLiveSession(liveSessionId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLiveSessions.end(
    requiredCourseText(liveSessionId, 'liveSessionId'),
    {},
  );
}

export async function cancelCourseAdminLiveSession(liveSessionId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLiveSessions.cancel(
    requiredCourseText(liveSessionId, 'liveSessionId'),
    {},
  );
}

export async function publishCourseAdminLiveReplay(
  liveSessionId: string,
  playbackUrl: string,
): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLiveSessions.replay.publish(
    requiredCourseText(liveSessionId, 'liveSessionId'),
    { playbackUrl: requiredCourseText(playbackUrl, 'playbackUrl') },
  );
}

/* ------------------------------------------------------------------ */
/* Enrollments, progress and lesson-progress repair                    */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminEnrollments(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminEnrollmentItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseEnrollments.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course enrollments could not be loaded').map(normalizeEnrollment),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function grantCourseAdminEnrollment(
  input: CourseAdminEnrollmentGrantInput,
): Promise<CourseAdminEnrollmentItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseEnrollments.create({
    courseId: requiredCourseText(input.courseId, 'courseId'),
    userId: requiredCourseText(input.userId, 'userId'),
    source: optionalText(input.source) ?? 'admin_grant',
    remark: optionalText(input.remark),
  });
  return normalizeEnrollment(readRequiredApiItem(result, 'Course enrollment could not be granted'));
}

export async function revokeCourseAdminEnrollment(enrollmentId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseEnrollments.revoke(
    requiredCourseText(enrollmentId, 'enrollmentId'),
    {},
  );
}

export async function fetchCourseAdminProgress(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminProgressItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseProgress.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course progress could not be loaded').map(normalizeProgress),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

/** Repairs a single lesson progress record (mark complete / reset completion). */
export async function repairCourseAdminLessonProgress(
  lessonProgressId: string,
  input: { completed: boolean; progressPercent?: number },
): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseLessonProgress.update(
    requiredCourseText(lessonProgressId, 'lessonProgressId'),
    {
      completed: input.completed,
      progressPercent: input.progressPercent ?? (input.completed ? 100 : 0),
    },
  );
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminApplications(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminApplicationItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseApplications.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course applications could not be loaded').map(normalizeApplication),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function reviewCourseAdminApplication(
  applicationId: string,
  input: CourseAdminApplicationReviewInput,
): Promise<CourseAdminApplicationItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseApplications.update(
    requiredCourseText(applicationId, 'applicationId'),
    { decision: input.decision, remark: optionalText(input.remark) },
  );
  return normalizeApplication(readRequiredApiItem(result, 'Course application could not be reviewed'));
}

export async function convertCourseAdminApplication(
  applicationId: string,
): Promise<CourseAdminApplicationItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseApplications.convert(
    requiredCourseText(applicationId, 'applicationId'),
    {},
  );
  return normalizeApplication(readRequiredApiItem(result, 'Course application could not be converted'));
}

/* ------------------------------------------------------------------ */
/* Comments and reactions                                              */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminComments(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminCommentItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseComments.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course comments could not be loaded').map(normalizeComment),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function moderateCourseAdminComment(
  commentId: string,
  state: CourseAdminCommentModerationState,
): Promise<CourseAdminCommentItem> {
  const result = await getSdkworkCourseBackendSdkClient().courseComments.update(
    requiredCourseText(commentId, 'commentId'),
    { moderationState: state },
  );
  return normalizeComment(readRequiredApiItem(result, 'Course comment could not be moderated'));
}

export async function deleteCourseAdminComment(commentId: string): Promise<void> {
  await getSdkworkCourseBackendSdkClient().courseComments.delete(requiredCourseText(commentId, 'commentId'));
}

export async function fetchCourseAdminReactions(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminReactionItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseReactions.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course reactions could not be loaded').map(normalizeReaction),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

/* ------------------------------------------------------------------ */
/* Reports and audit logs                                              */
/* ------------------------------------------------------------------ */

export async function fetchCourseAdminReportOverview(): Promise<CourseAdminReportOverview> {
  const result = await getSdkworkCourseBackendSdkClient().courseReports.overview.retrieve();
  const item = isRecord(result) ? result : {};
  return {
    courseCount: readNumber(item, 'courseCount', 0),
    publishedCourseCount: readNumber(item, 'publishedCourseCount', 0),
    studentCount: readNumber(item, 'studentCount', 0),
    enrollmentCount: readNumber(item, 'enrollmentCount', 0),
    liveSessionCount: readNumber(item, 'liveSessionCount', 0),
    completionRate: readNumber(item, 'completionRate', 0),
  };
}

export async function fetchCourseAdminLearningReport(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminReportRow>> {
  const result = await getSdkworkCourseBackendSdkClient().courseReports.learning.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Learning report could not be loaded').map(normalizeReportRow),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function fetchCourseAdminLiveSessionReport(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminReportRow>> {
  const result = await getSdkworkCourseBackendSdkClient().courseReports.liveSessions.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Live session report could not be loaded').map(normalizeReportRow),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

export async function fetchCourseAdminAuditLogs(
  params: CourseAdminListParams = {},
): Promise<CourseAdminPage<CourseAdminAuditLogItem>> {
  const result = await getSdkworkCourseBackendSdkClient().courseAuditLogs.list(buildListQuery(params));
  return {
    items: readRequiredApiItems(result, 'Course audit logs could not be loaded').map(normalizeAuditLog),
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}

/** Full audit-log record for the detail drawer; payload fields are backend-owned. */
export async function fetchCourseAdminAuditLogDetail(
  auditLogId: string,
): Promise<ApiRecord> {
  const result = await getSdkworkCourseBackendSdkClient().courseAuditLogs.retrieve(
    requiredCourseText(auditLogId, 'auditLogId'),
  );
  return asApiRecord(result);
}

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */

function normalizePageInfo(pageInfo: unknown): CourseAdminPageInfo {
  const record = isRecord(pageInfo) ? (pageInfo as ApiRecord) : {};
  const mode = readString(record, 'mode') === 'cursor' ? 'cursor' as const : 'offset' as const;
  const totalItems = readString(record, 'totalItems').trim();
  const nextCursor = readString(record, 'nextCursor').trim();
  return {
    mode,
    page: optionalNumber(record['page']),
    pageSize: optionalNumber(record['pageSize']),
    totalItems: totalItems || undefined,
    totalPages: optionalNumber(record['totalPages']),
    nextCursor: nextCursor || null,
    hasMore: typeof record['hasMore'] === 'boolean' ? record['hasMore'] : undefined,
  };
}

function normalizeCourse(value: unknown): CourseAdminCourseItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'courseId'], 'Course id is required'),
    courseCode: readString(item, 'courseCode') || readString(item, 'code'),
    title: readString(item, 'title') || readString(item, 'name'),
    subtitle: optionalText(readString(item, 'subtitle')),
    status: readString(item, 'status') || 'draft',
    studentsCount: readNumber(item, 'studentsCount', 0),
    lessonsCount: readNumber(item, 'lessonsCount', 0),
    categoryName: optionalText(readString(item, 'categoryName') || readString(item, 'category')),
    instructorName: optionalText(readString(item, 'instructorName') || readString(item, 'instructor')),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeCategory(value: unknown): CourseAdminCategoryItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'categoryId'], 'Course category id is required'),
    name: readString(item, 'name') || readString(item, 'title'),
    slug: readString(item, 'slug') || readString(item, 'code'),
    description: optionalText(readString(item, 'description')),
    status: readString(item, 'status') || 'active',
    sortOrder: readNumber(item, 'sortOrder', 0),
  };
}

function normalizeInstructor(value: unknown): CourseAdminInstructorItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'instructorId'], 'Course instructor id is required'),
    name: readString(item, 'name') || readString(item, 'title'),
    title: optionalText(readString(item, 'title')),
    bio: optionalText(readString(item, 'bio')),
    avatarUrl: optionalText(readString(item, 'avatarUrl')),
    status: readString(item, 'status') || 'active',
    courseCount: readNumber(item, 'courseCount', 0),
    studentCount: readNumber(item, 'studentCount', 0),
  };
}

function normalizeOffering(value: unknown): CourseAdminOfferingItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'offeringId'], 'Course offering id is required'),
    courseId: readString(item, 'courseId'),
    title: readString(item, 'title') || readString(item, 'name'),
    status: readString(item, 'status') || 'draft',
    capacity: readNumber(item, 'capacity', 0),
    enrolledCount: readNumber(item, 'enrolledCount', 0),
    startAt: optionalText(readString(item, 'startAt')),
    endAt: optionalText(readString(item, 'endAt')),
  };
}

function normalizeSection(value: unknown): CourseAdminSectionItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'sectionId'], 'Course section id is required'),
    courseId: readString(item, 'courseId'),
    title: readString(item, 'title') || readString(item, 'name'),
    description: optionalText(readString(item, 'description')),
    lessonCount: readNumber(item, 'lessonCount', 0),
    sortWeight: readNumber(item, 'sortWeight', readNumber(item, 'sortOrder', 0)),
    status: readString(item, 'status') || 'active',
  };
}

function normalizeLesson(value: unknown): CourseAdminLessonItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'lessonId'], 'Course lesson id is required'),
    courseId: readString(item, 'courseId'),
    sectionId: optionalText(readString(item, 'sectionId')),
    title: readString(item, 'title') || readString(item, 'name'),
    kind: readString(item, 'kind') || readString(item, 'lessonKind') || 'vod_video',
    durationSeconds: readNumber(item, 'durationSeconds', 0),
    freePreview: readBoolean(item, 'freePreview'),
    status: readString(item, 'status') || 'draft',
    externalSourceId: optionalText(readString(item, 'externalSourceId')),
    sourceProvider: optionalText(readString(item, 'sourceProvider')),
  };
}

function normalizeResource(value: unknown): CourseAdminResourceItem {
  const item = asApiRecord(value);
  const snapshot = readMediaSnapshot(item);
  return {
    id: requireRecordString(item, ['id', 'resourceRefId'], 'Course resource id is required'),
    lessonId: readString(item, 'lessonId'),
    resourceRole: readString(item, 'resourceRole') || readString(item, 'resource_role') || 'attachment',
    resourceKind: readString(item, 'resourceKind') || readString(item, 'resource_kind') || 'drive',
    fileName: optionalText(readString(item, 'fileName') || readString(snapshot, 'fileName')),
    driveResourceId: optionalText(readString(item, 'driveResourceId') || readString(snapshot, 'driveResourceId')),
    mimeType: optionalText(readString(item, 'mimeType') || readString(snapshot, 'mimeType')),
    status: readString(item, 'status') || 'active',
  };
}

/** Resource snapshots arrive either as an object or as a JSON string. */
function readMediaSnapshot(item: ApiRecord): ApiRecord {
  const raw = item['mediaResourceSnapshot'] ?? item['media_resource_snapshot'];
  if (isRecord(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeLiveSession(value: unknown): CourseAdminLiveSessionItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'liveSessionId'], 'Live session id is required'),
    courseId: readString(item, 'courseId'),
    title: readString(item, 'title') || readString(item, 'name'),
    status: readString(item, 'status') || 'scheduled',
    instructorName: optionalText(readString(item, 'instructorName')),
    scheduledStartAt: optionalText(readString(item, 'scheduledStartAt')),
    scheduledEndAt: optionalText(readString(item, 'scheduledEndAt')),
    playbackUrl: optionalText(readString(item, 'playbackUrl')),
  };
}

function normalizeEnrollment(value: unknown): CourseAdminEnrollmentItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'enrollmentId'], 'Course enrollment id is required'),
    courseId: readString(item, 'courseId'),
    courseTitle: optionalText(readString(item, 'courseTitle')),
    userId: readString(item, 'userId'),
    userName: optionalText(readString(item, 'userName')),
    status: readString(item, 'status') || 'active',
    source: readString(item, 'source') || 'admin_grant',
    enrolledAt: readString(item, 'enrolledAt'),
  };
}

function normalizeProgress(value: unknown): CourseAdminProgressItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'progressId', 'enrollmentId'], 'Course progress id is required'),
    enrollmentId: readString(item, 'enrollmentId'),
    courseId: readString(item, 'courseId'),
    userId: readString(item, 'userId'),
    status: readString(item, 'status') || 'in_progress',
    progressPercent: readNumber(item, 'progressPercent', 0),
    completedLessons: readNumber(item, 'completedLessons', 0),
    totalLessons: readNumber(item, 'totalLessons', 0),
    lastStudiedAt: optionalText(readString(item, 'lastStudiedAt')),
  };
}

function normalizeApplication(value: unknown): CourseAdminApplicationItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'applicationId'], 'Course application id is required'),
    courseId: readString(item, 'courseId'),
    courseTitle: optionalText(readString(item, 'courseTitle')),
    applicantName: readString(item, 'applicantName') || readString(item, 'userName'),
    applicantContact: optionalText(readString(item, 'applicantContact') || readString(item, 'contact')),
    status: readString(item, 'status') || 'pending',
    remark: optionalText(readString(item, 'remark')),
    submittedAt: readString(item, 'submittedAt') || readString(item, 'createdAt'),
  };
}

function normalizeComment(value: unknown): CourseAdminCommentItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'commentId'], 'Course comment id is required'),
    courseId: readString(item, 'courseId'),
    lessonId: optionalText(readString(item, 'lessonId')),
    authorName: readString(item, 'authorName') || readString(item, 'userName'),
    body: readString(item, 'body') || readString(item, 'content'),
    moderationState: readString(item, 'moderationState') || readString(item, 'status') || 'visible',
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizeReaction(value: unknown): CourseAdminReactionItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'reactionId'], 'Course reaction id is required'),
    targetType: readString(item, 'targetType') || 'course',
    targetId: readString(item, 'targetId'),
    reaction: readString(item, 'reaction') || readString(item, 'kind'),
    count: readNumber(item, 'count', 0),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeReportRow(value: unknown): CourseAdminReportRow {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'courseId', 'liveSessionId'], 'Report row id is required'),
    label: readString(item, 'title') || readString(item, 'name') || readString(item, 'label'),
    primaryValue: readNumber(item, 'studentCount', readNumber(item, 'viewerCount', 0)),
    secondaryValue: readNumber(item, 'completionRate', readNumber(item, 'durationMinutes', 0)),
    status: readString(item, 'status') || 'active',
    period: optionalText(readString(item, 'period')),
  };
}

function normalizeAuditLog(value: unknown): CourseAdminAuditLogItem {
  const item = asApiRecord(value);
  return {
    id: requireRecordString(item, ['id', 'auditLogId'], 'Course audit log id is required'),
    action: readString(item, 'action') || readString(item, 'event'),
    resource: readString(item, 'resource') || readString(item, 'resourceType'),
    resourceId: optionalText(readString(item, 'resourceId')),
    operatorName: optionalText(readString(item, 'operatorName') || readString(item, 'operatorId')),
    status: readString(item, 'status') || 'succeeded',
    createdAt: readString(item, 'createdAt'),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function asApiRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function requireRecordString(
  record: ApiRecord,
  keys: readonly string[],
  message: string,
): string {
  for (const key of keys) {
    const value = readString(record, key).trim();
    if (value) {
      return value;
    }
  }
  throw new Error(message);
}

function buildListQuery(params: CourseAdminListParams): {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} {
  return {
    q: optionalText(params.q),
    status: optionalText(params.status),
    page: optionalNumber(params.page),
    pageSize: optionalNumber(params.pageSize),
  };
}

function buildResourceBody(input: CourseAdminResourceMutationInput): Record<string, unknown> {
  const driveResourceId = requiredCourseText(input.driveResourceId, 'drive resource id');
  return {
    drive_resource_id: driveResourceId,
    resource_role: requiredCourseText(input.resourceRole, 'resource role'),
    resource_kind: requiredCourseText(input.resourceKind, 'resource kind'),
    mime_type: optionalText(input.mimeType),
    media_resource_snapshot: JSON.stringify({
      provider: 'drive',
      driveResourceId,
      fileName: optionalText(input.fileName),
      mimeType: optionalText(input.mimeType),
    }),
  };
}

function buildLiveSessionBody(input: CourseAdminLiveSessionMutationInput): Record<string, unknown> {
  return {
    courseId: requiredCourseText(input.courseId, 'courseId'),
    title: requiredCourseText(input.title, 'live session title'),
    scheduledStartAt: optionalText(input.scheduledStartAt),
    scheduledEndAt: optionalText(input.scheduledEndAt),
    instructorId: optionalText(input.instructorId),
  };
}

function requiredCourseText(value: string | undefined, fieldName: string): string {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    throw new Error(`Course admin ${fieldName} is required`);
  }
  return normalized;
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = (value ?? '').trim();
  return normalized || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function requiredPageSize(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    return 100;
  }
  return value;
}
