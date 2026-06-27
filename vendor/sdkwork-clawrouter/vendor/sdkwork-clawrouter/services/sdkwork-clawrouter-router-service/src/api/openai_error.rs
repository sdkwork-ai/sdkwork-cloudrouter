use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;

use crate::api::openai_contract::{OpenAiErrorBody, OpenAiErrorEnvelope};

pub(super) fn openai_error(
    status: StatusCode,
    code: &'static str,
    error_type: &'static str,
    message: impl ToString,
) -> Response {
    (
        status,
        Json(OpenAiErrorEnvelope {
            error: OpenAiErrorBody {
                message: message.to_string(),
                error_type: error_type.to_owned(),
                param: None,
                code: code.to_owned(),
                extra: Default::default(),
            },
        }),
    )
        .into_response()
}
