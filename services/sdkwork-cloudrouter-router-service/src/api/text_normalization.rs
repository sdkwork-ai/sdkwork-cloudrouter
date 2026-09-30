//! Single authority for request-body text field normalization in the API layer.
//!
//! Two genuinely distinct validation policies exist across the API surface and are
//! keyed by their error-type family (the axis that actually differs):
//!
//! * [`normalize_visible_ascii_optional`] — trims, rejects control characters via a
//!   visible-ASCII (`0x20..=0x7e`) check, and reports an [`ApiResponseError`].
//!   Used by the admin CRUD surfaces that echo the normalized value back in a
//!   problem response.
//! * [`normalize_trimmed_optional`] — trims only (no visible-ASCII restriction) and
//!   reports a bare `String` message so the caller can lift it into its own
//!   command-build error type. Used by the app-runtime / app-chat surfaces.
//!
//! Both policies share the same contract for the empty case: an absent, empty or
//! whitespace-only input normalizes to `None`; a length overflow is a validation
//! error carrying the offending field name and limit.

use crate::api::response::{bad_request, ApiResponseError};

/// Decodes a JSON request body, naming the entity in every failure message.
///
/// An all-whitespace (or empty) body is reported as `"{entity_name} request body
/// is required"`; any decode failure as `"invalid {entity_name} request body: ..."`.
/// Single authority for that convention across the API modules, so the error text
/// stays uniform for every admin/app surface.
pub(crate) fn parse_json_body<T>(body: &[u8], entity_name: &str) -> Result<T, String>
where
    T: for<'de> serde::Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(format!("{entity_name} request body is required"));
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid {entity_name} request body: {error}"))
}

/// Normalizes an optional text field with the visible-ASCII policy.
///
/// Returns `Ok(None)` for an absent, empty or whitespace-only value. When the
/// trimmed value exceeds `max_len` characters, or contains any byte outside the
/// printable ASCII range, returns a `4001` problem response as an error.
pub(crate) fn normalize_visible_ascii_optional(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, ApiResponseError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(bad_request(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        ))
        .into());
    }
    Ok(Some(value.to_owned()))
}

/// Normalizes a required text field with the visible-ASCII policy.
///
/// Delegates to [`normalize_visible_ascii_optional`] and rejects the empty case
/// with a `"{field_name} is required"` problem response.
pub(crate) fn normalize_visible_ascii_required(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, ApiResponseError> {
    normalize_visible_ascii_optional(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")).into())
}

/// Normalizes an optional text field with the trim-only policy.
///
/// Returns `Ok(None)` for an absent, empty or whitespace-only value. When the
/// trimmed value exceeds `max_len` characters, returns an error carrying the
/// offending field name and limit as a plain message.
pub(crate) fn normalize_trimmed_optional(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
}

/// Normalizes a required text field with the trim-only policy.
///
/// Delegates to [`normalize_trimmed_optional`] and rejects the empty case with a
/// `"{field} is required"` message.
pub(crate) fn normalize_trimmed_required(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<String, String> {
    normalize_trimmed_optional(value, field, max_len)?.ok_or_else(|| format!("{field} is required"))
}
