use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_http::{TrustedRequestSubject, TrustedRequestSubjectError};

use crate::api::response::PlusApiResult;

#[derive(Debug, Clone, Copy)]
pub struct AdminOperatorFields {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

pub fn admin_operator_fields(trusted: TrustedRequestSubject) -> AdminOperatorFields {
    AdminOperatorFields {
        tenant_id: trusted.tenant_id,
        organization_id: trusted.organization_id,
        operator_id: trusted.operator_id,
        operator_type: trusted.operator_type,
    }
}

pub fn map_optional_app_user_subject<T>(
    subject: Option<TrustedRequestSubject>,
    require_subject: bool,
    map: impl FnOnce(TrustedRequestSubject) -> T,
) -> Result<Option<T>, Response> {
    match optional_subject_or_unauthorized(subject, require_subject)? {
        Some(subject) => Ok(Some(map(subject))),
        None => Ok(None),
    }
}

pub(crate) fn unauthorized_subject_response() -> Response {
    PlusApiResult::error(
            "4010",
            TrustedRequestSubjectError::MissingExtension.to_string(),
        )).into_response()
}

pub fn required_subject(
    subject: Option<TrustedRequestSubject>,
) -> Result<TrustedRequestSubject, Response> {
    subject.ok_or_else(unauthorized_subject_response)
}

pub fn optional_subject_or_unauthorized(
    subject: Option<TrustedRequestSubject>,
    require_subject: bool,
) -> Result<Option<TrustedRequestSubject>, Response> {
    match subject {
        Some(subject) => Ok(Some(subject)),
        None if require_subject => Err(unauthorized_subject_response()),
        None => Ok(None),
    }
}
