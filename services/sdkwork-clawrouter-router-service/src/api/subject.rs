use axum::response::{IntoResponse, Response};
use sdkwork_claw_http::TrustedRequestSubjectError;

use crate::api::response::problem_from_wire_code;

pub(crate) fn unauthorized_subject_response() -> Response {
    problem_from_wire_code(
        "4010",
        TrustedRequestSubjectError::MissingExtension.to_string(),
    )
    .into_response()
}
