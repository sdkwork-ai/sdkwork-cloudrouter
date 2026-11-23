use axum::http::header;
use axum::http::HeaderMap;

use super::{InvocationError, InvocationErrorKind};
use crate::domain::MODEL_REQUEST_FIELD_NAMES;

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
    for field in MODEL_REQUEST_FIELD_NAMES {
        let Some(range) = multipart_field_value_range(body, boundary.as_bytes(), field) else {
            continue;
        };
        let value = String::from_utf8_lossy(&body[range.start..range.end]);
        return require_non_blank_model(&value).map(Some);
    }
    Ok(None)
}

/// Rewrites every model-bearing multipart text field (`model`, `model_name`,
/// `model_id`, …) to the resolved provider model. A vendor-native audio/image
/// edit call may carry the model under a vendor-specific field name; rewriting
/// only `model` would leave the client's spelling on the wire.
pub(super) fn rewrite_multipart_model(
    headers: &HeaderMap,
    body: &[u8],
    provider_model: &str,
) -> Result<Vec<u8>, InvocationError> {
    let boundary = require_multipart_boundary(headers)?;
    let mut ranges = Vec::new();
    for field in MODEL_REQUEST_FIELD_NAMES {
        ranges.extend(multipart_field_value_ranges(
            body,
            boundary.as_bytes(),
            field,
        ));
    }
    if ranges.is_empty() {
        return Err(invalid_request("model is required"));
    }
    ranges.sort_by_key(|range| range.start);
    let mut rewritten = Vec::with_capacity(
        body.len()
            + ranges
                .len()
                .saturating_mul(provider_model.len().saturating_sub(1)),
    );
    let mut cursor = 0usize;
    for range in ranges {
        if range.start < cursor {
            continue;
        }
        rewritten.extend_from_slice(&body[cursor..range.start]);
        rewritten.extend_from_slice(provider_model.as_bytes());
        cursor = range.end;
    }
    rewritten.extend_from_slice(&body[cursor..]);
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
    multipart_field_value_ranges(body, boundary, field_name)
        .into_iter()
        .next()
}

fn multipart_field_value_ranges(
    body: &[u8],
    boundary: &[u8],
    field_name: &str,
) -> Vec<std::ops::Range<usize>> {
    let mut ranges = Vec::new();
    if body.is_empty() || boundary.is_empty() || field_name.is_empty() {
        return ranges;
    }
    let marker = multipart_boundary_marker(boundary);
    let mut search_start = 0usize;
    while let Some(relative_start) = find_bytes(&body[search_start..], &marker) {
        let boundary_start = search_start + relative_start;
        let mut cursor = boundary_start + marker.len();
        if body.get(cursor..cursor + 2) == Some(b"--") {
            break;
        }
        if body.get(cursor..cursor + 2) != Some(b"\r\n") {
            search_start = cursor;
            continue;
        }
        cursor += 2;
        let Some(relative_headers_end) = find_bytes(&body[cursor..], b"\r\n\r\n") else {
            break;
        };
        let headers_end = cursor + relative_headers_end;
        let headers = String::from_utf8_lossy(&body[cursor..headers_end]);
        let value_start = headers_end + 4;
        let boundary_prefix = multipart_next_boundary_prefix(boundary);
        let Some(relative_value_end) = find_bytes(&body[value_start..], &boundary_prefix) else {
            break;
        };
        let value_end = value_start + relative_value_end;
        if multipart_headers_contain_field_name(&headers, field_name) {
            ranges.push(value_start..value_end);
        }
        search_start = value_end + 2;
    }
    ranges
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
                    .map(|name| name.eq_ignore_ascii_case(field_name))
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

#[cfg(test)]
mod tests {
    use super::*;

    fn multipart_headers(boundary: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary={boundary}")
                .parse()
                .expect("content type"),
        );
        headers
    }

    fn multipart_body(boundary: &str, fields: &[(&str, &str)]) -> Vec<u8> {
        let mut body = String::new();
        for (name, value) in fields {
            body.push_str(&format!(
                "--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n"
            ));
        }
        body.push_str(&format!("--{boundary}--\r\n"));
        body.into_bytes()
    }

    #[test]
    fn extracts_model_from_vendor_native_field_names() {
        for field in ["model", "model_name", "model_id"] {
            let headers = multipart_headers("test-boundary");
            let body = multipart_body("test-boundary", &[(field, "eleven_multilingual_v2")]);
            assert_eq!(
                Some("eleven_multilingual_v2".to_owned()),
                optional_model_from_multipart_form(&headers, &body).expect("model"),
                "field: {field}"
            );
        }
    }

    #[test]
    fn rewrites_every_model_bearing_field() {
        let headers = multipart_headers("test-boundary");
        let body = multipart_body(
            "test-boundary",
            &[
                ("model", "openai/gpt-image-2"),
                ("model_id", "openai/gpt-image-2"),
                ("prompt", "keep"),
            ],
        );
        let rewritten =
            rewrite_multipart_model(&headers, &body, "gpt-image-2").expect("rewritten body");
        let text = String::from_utf8(rewritten).expect("utf8");
        assert!(!text.contains("openai/"));
        assert_eq!(2, text.matches("gpt-image-2").count());
        assert!(text.contains("keep"));
    }

    #[test]
    fn missing_model_field_is_an_invalid_request() {
        let headers = multipart_headers("test-boundary");
        let body = multipart_body("test-boundary", &[("prompt", "x")]);
        assert!(rewrite_multipart_model(&headers, &body, "gpt-4o").is_err());
    }
}
