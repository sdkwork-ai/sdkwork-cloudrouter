use axum::http::HeaderMap;

pub(crate) fn authorized(headers: &HeaderMap, expected_token: &str) -> bool {
    let Some(value) = headers.get(axum::http::header::AUTHORIZATION) else {
        return false;
    };
    let Ok(value) = value.to_str() else {
        return false;
    };
    value.trim() == format!("Bearer {expected_token}")
}
