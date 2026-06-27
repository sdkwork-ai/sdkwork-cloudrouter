use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::Value;

use crate::domain::DomainResult;

pub type CourseReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;
pub type CourseCommandFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CourseSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CourseQuery {
    pub level: Option<i64>,
    pub category: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub size: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CourseInstructor {
    pub name: String,
    pub avatar: Value,
    pub title: String,
    pub bio: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseEngagement {
    pub views: i64,
    pub likes: i64,
    pub saves: i64,
    pub shares: i64,
    pub discussions: i64,
    pub students_count: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseCategoryItem {
    pub id: String,
    pub code: String,
    pub name: String,
    pub label: String,
    pub description: String,
    pub icon_key: String,
    pub sort_weight: i64,
    pub course_count: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseLessonItem {
    pub id: String,
    pub lesson_id: i64,
    pub lesson_no: i64,
    pub number: i64,
    pub title: String,
    pub description: String,
    pub video: Value,
    pub external_bvid: String,
    pub source_provider: String,
    pub duration_seconds: i64,
    pub duration_text: String,
    pub content: String,
    pub sort_order: i64,
    pub free_preview: bool,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseSectionItem {
    pub id: String,
    pub section_id: i64,
    pub section_no: i64,
    pub title: String,
    pub description: String,
    pub sort_order: i64,
    pub lesson_count: i64,
    pub duration_seconds: i64,
    pub lessons: Vec<CourseLessonItem>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CourseItem {
    pub id: String,
    pub content_id: i64,
    pub course_code: String,
    pub title: String,
    pub description: String,
    pub thumbnail: Value,
    pub instructor: CourseInstructor,
    pub duration_text: String,
    pub lessons_count: i64,
    pub rating_score: f64,
    pub students_count: i64,
    pub level: i64,
    pub level_label: String,
    pub category: String,
    pub category_label: String,
    pub tags: Vec<String>,
    pub external_bvid: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price_amount: Option<String>,
    pub currency: String,
    pub is_collection: bool,
    pub published_at: String,
    pub comment_count: i64,
    pub engagement: CourseEngagement,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CourseDetail {
    #[serde(flatten)]
    pub course: CourseItem,
    pub sections: Vec<CourseSectionItem>,
    pub related_courses: Vec<CourseItem>,
    pub source: CourseOverviewSource,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseOverviewStats {
    pub total_courses: i64,
    pub total_lessons: i64,
    pub total_students: i64,
    pub total_categories: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseOverviewSource {
    pub source_label: String,
    pub source_description: String,
    pub source_tables: Vec<String>,
    pub observed_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CourseOverview {
    pub stats: CourseOverviewStats,
    pub source: CourseOverviewSource,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateCourseApplicationCommand {
    pub subject: CourseSubject,
    pub uuid: String,
    pub title: String,
    pub category: String,
    pub description: String,
    pub source_provider: String,
    pub external_bvid: Option<String>,
    pub video: Option<Value>,
    pub contact_name: Option<String>,
    pub contact_email: Option<String>,
    pub notes: Option<String>,
    pub submitted_at: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CourseApplicationItem {
    pub id: String,
    pub application_id: i64,
    pub title: String,
    pub category: String,
    pub description: String,
    pub source_provider: String,
    pub external_bvid: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video: Option<Value>,
    pub contact_name: String,
    pub contact_email: String,
    pub status: String,
    pub submitted_at: String,
}

pub trait CourseReadStore {
    fn load_courses<'a>(
        &'a self,
        query: CourseQuery,
        subject: Option<CourseSubject>,
    ) -> CourseReadFuture<'a, Vec<CourseItem>>;

    fn load_course_detail<'a>(
        &'a self,
        course_id: String,
        subject: Option<CourseSubject>,
    ) -> CourseReadFuture<'a, Option<CourseDetail>>;

    fn load_categories<'a>(
        &'a self,
        subject: Option<CourseSubject>,
    ) -> CourseReadFuture<'a, Vec<CourseCategoryItem>>;

    fn load_overview<'a>(
        &'a self,
        subject: Option<CourseSubject>,
    ) -> CourseReadFuture<'a, CourseOverview>;
}

pub trait CourseApplicationCommandStore {
    fn create_course_application<'a>(
        &'a self,
        command: CreateCourseApplicationCommand,
    ) -> CourseCommandFuture<'a, CourseApplicationItem>;
}
