use axum::http::header;
use axum::http::HeaderMap;

use super::{InvocationError, InvocationErrorKind};

pub(super) fn multipart_boundary(headers: &HeaderMap) -> Option<String> {
    let content_type = headers.get(header::CONTENT_TYPE)?.to_str().ok()?;
    for parameter in content_type.split(';').skip(1) {
        let Some((name, value)) = parameter.trim().split_once('=') else {
            continue;
        };
        if name.trim().eq_ignore_ascii_case("boundary") {
            let value = unquote_header_parameter_value(value.trim()).trim();
            if !value.is_empty() {
                return Some(value.to_owned());
            }
        }
    }
    None
}

pub(super) fn request_content_type_is_multipart_form(headers: &HeaderMap) -> bool {
    request_content_type(headers)
        .and_then(|value| {
            value
                .split(';')
                .next()
                .map(|media_type| media_type.trim() == "multipart/form-data")
        })
        .unwrap_or(false)
}

pub(super) fn require_multipart_boundary(headers: &HeaderMap) -> Result<String, InvocationError> {
    multipart_boundary(headers)
        .ok_or_else(|| invalid_request("multipart/form-data boundary is required"))
}

pub(super) fn optional_model_from_multipart_form(
    headers: &HeaderMap,
    body: &[u8],
) -> Result<Option<String>, InvocationError> {
    let boundary = require_multipart_boundary(headers)?;
    let Some(range) = multipart_field_value_range(body, boundary.as_bytes(), "model") else {
        return Ok(None);
    };
    let value = String::from_utf8_lossy(&body[range.start..range.end]);
    require_non_blank_model(&value).map(Some)
}

pub(super) fn rewrite_multipart_model(
    headers: &HeaderMap,
    body: &[u8],
    provider_model: &str,
) -> Result<Vec<u8>, InvocationError> {
    let boundary = require_multipart_boundary(headers)?;
    let range = multipart_field_value_range(body, boundary.as_bytes(), "model")
        .ok_or_else(|| invalid_request("model is required"))?;
    let mut rewritten = Vec::with_capacity(
        body.len()
            .saturating_sub(range.end.saturating_sub(range.start))
            + provider_model.len(),
    );
    rewritten.extend_from_slice(&body[..range.start]);
    rewritten.extend_from_slice(provider_model.as_bytes());
    rewritten.extend_from_slice(&body[range.end..]);
    Ok(rewritten)
}

pub(super) fn require_non_blank_model(value: &str) -> Result<String, InvocationError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(invalid_request("model must not be blank"));
    }
    Ok(value.to_owned())
}

fn multipart_field_value_range(
    body: &[u8],
    boundary: &[u8],
    field_name: &str,
) -> Option<std::ops::Range<usize>> {
    if body.is_empty() || boundary.is_empty() || field_name.is_empty() {
        return None;
    }
    let marker = multipart_boundary_marker(boundary);
    let mut search_start = 0usize;
    while let Some(relative_start) = find_bytes(&body[search_start..], &marker) {
        let boundary_start = search_start + relative_start;
        let mut cursor = boundary_start + marker.len();
        if body.get(cursor..cursor + 2) == Some(b"--") {
            return None;
        }
        if body.get(cursor..cursor + 2) != Some(b"\r\n") {
            search_start = cursor;
            continue;
        }
        cursor += 2;
        let headers_end = cursor + find_bytes(&body[cursor..], b"\r\n\r\n")?;
        let headers = String::from_utf8_lossy(&body[cursor..headers_end]);
        let value_start = headers_end + 4;
        let boundary_prefix = multipart_next_boundary_prefix(boundary);
        let relative_value_end = find_bytes(&body[value_start..], &boundary_prefix)?;
        let value_end = value_start + relative_value_end;
        if multipart_headers_contain_field_name(&headers, field_name) {
            return Some(value_start..value_end);
        }
        search_start = value_end + 2;
    }
    None
}

fn multipart_boundary_marker(boundary: &[u8]) -> Vec<u8> {
    let mut marker = Vec::with_capacity(boundary.len() + 2);
    marker.extend_from_slice(b"--");
    marker.extend_from_slice(boundary);
    marker
}

fn multipart_next_boundary_prefix(boundary: &[u8]) -> Vec<u8> {
    let mut marker = Vec::with_capacity(boundary.len() + 4);
    marker.extend_from_slice(b"\r\n--");
    marker.extend_from_slice(boundary);
    marker
}

fn multipart_headers_contain_field_name(headers: &str, field_name: &str) -> bool {
    headers
        .lines()
        .filter_map(|line| line.split_once(':'))
        .any(|(name, value)| {
            name.trim().eq_ignore_ascii_case("content-disposition")
                && multipart_content_disposition_name(value)
                    .map(|name| name == field_name)
                    .unwrap_or(false)
        })
}

fn multipart_content_disposition_name(value: &str) -> Option<String> {
    let mut parameters = value.split(';');
    if !parameters
        .next()
        .map(|disposition| disposition.trim().eq_ignore_ascii_case("form-data"))
        .unwrap_or(false)
    {
        return None;
    }
    for parameter in parameters {
        let Some((name, value)) = parameter.trim().split_once('=') else {
            continue;
        };
        if name.trim().eq_ignore_ascii_case("name") {
            return Some(unquote_header_parameter_value(value.trim()).to_owned());
        }
    }
    None
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() {
        return Some(0);
    }
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn request_content_type(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.trim().to_ascii_lowercase())
}

fn unquote_header_parameter_value(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
        .unwrap_or(value)
}

fn invalid_request(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::InvalidRequest, message)
}
