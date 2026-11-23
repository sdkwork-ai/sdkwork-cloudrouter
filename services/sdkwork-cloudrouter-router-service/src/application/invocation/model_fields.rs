//! One owner for the HTTP fields that carry a model id.
//!
//! Vendor protocols disagree on the field name: OpenAI chat/responses/images
//! use `model`, Kling uses `model_name`, ElevenLabs/MiniMax audio use
//! `model_id`, and some SDKs send the camel-case variants. Extraction and
//! outbound rewriting must therefore cover the same set, or a media/audio/
//! music call would route by the resolved model while still dialing the
//! client's spelling in the body.
//!
//! This module only implements the HTTP-shape mechanics. The model identity
//! policy (official vs relay vs explicit override) lives in
//! `domain::resolve_provider_model_id`.

#[cfg(test)]
use serde_json::Map;
use serde_json::Value;

use crate::domain::MODEL_REQUEST_FIELD_NAMES;

/// Returns the first model-bearing field value from a JSON object.
#[cfg(test)]
pub(super) fn model_field_value(object: &Map<String, Value>) -> Option<&str> {
    MODEL_REQUEST_FIELD_NAMES
        .iter()
        .find_map(|field| object.get(*field).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

/// Rewrites every model-bearing field present in a JSON object to
/// `provider_model`. Returns whether anything was rewritten.
pub(super) fn rewrite_json_model_fields(value: &mut Value, provider_model: &str) -> bool {
    let Some(object) = value.as_object_mut() else {
        return false;
    };
    let mut rewritten = false;
    for field in MODEL_REQUEST_FIELD_NAMES {
        if object.contains_key(field) {
            object.insert(field.to_owned(), Value::String(provider_model.to_owned()));
            rewritten = true;
        }
    }
    rewritten
}

/// Returns the first model-bearing query parameter value.
pub(super) fn model_query_value(query: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=')?;
        if MODEL_REQUEST_FIELD_NAMES
            .iter()
            .any(|field| decoded_query_component(name).eq_ignore_ascii_case(field))
        {
            let value = decoded_query_component(value);
            let value = value.trim();
            if !value.is_empty() {
                return Some(value.to_owned());
            }
        }
        None
    })
}

/// Rewrites every model-bearing query parameter, preserving its field name.
pub(super) fn rewrite_query_model_fields(
    query: Option<String>,
    provider_model: &str,
) -> Option<String> {
    let provider_model = provider_model.trim();
    if provider_model.is_empty() {
        return query;
    }
    query.map(|query| {
        query
            .split('&')
            .map(|part| {
                part.split_once('=')
                    .map(|(name, value)| {
                        let decoded_name = decoded_query_component(name);
                        if MODEL_REQUEST_FIELD_NAMES
                            .iter()
                            .any(|field| decoded_name.eq_ignore_ascii_case(field))
                            && !value.trim().is_empty()
                        {
                            format!(
                                "{}={}",
                                decoded_name,
                                percent_encode_query_component(provider_model)
                            )
                        } else {
                            part.to_owned()
                        }
                    })
                    .unwrap_or_else(|| part.to_owned())
            })
            .collect::<Vec<_>>()
            .join("&")
    })
}

fn percent_encode_query_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            encoded.push('%');
            encoded.push_str(&format!("{byte:02X}"));
        }
    }
    encoded
}

pub(super) fn decoded_query_component(value: &str) -> String {
    let mut output = Vec::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let Ok(hex) = std::str::from_utf8(&bytes[index + 1..index + 3]) {
                    if let Ok(byte) = u8::from_str_radix(hex, 16) {
                        output.push(byte);
                        index += 3;
                        continue;
                    }
                }
                output.push(bytes[index]);
                index += 1;
            }
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8(output).unwrap_or_else(|_| value.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extraction_covers_every_model_field_name() {
        for (field, value) in [
            ("model", "gpt-4o"),
            ("model_name", "kling-v3"),
            ("modelName", "kling-v3"),
            ("model_id", "eleven_multilingual_v2"),
            ("modelId", "eleven_multilingual_v2"),
        ] {
            let object = json!({ field: value });
            assert_eq!(
                Some(value),
                model_field_value(object.as_object().expect("object")),
                "field: {field}"
            );
        }
        assert_eq!(
            None,
            model_field_value(json!({"prompt": "x"}).as_object().expect("object"))
        );
    }

    #[test]
    fn rewrite_updates_every_model_field_present() {
        let mut body = json!({
            "model": "openai/gpt-4o",
            "model_name": "openai/gpt-4o",
            "model_id": "openai/gpt-4o",
            "prompt": "keep me"
        });
        assert!(rewrite_json_model_fields(&mut body, "gpt-4o"));
        assert_eq!("gpt-4o", body["model"]);
        assert_eq!("gpt-4o", body["model_name"]);
        assert_eq!("gpt-4o", body["model_id"]);
        assert_eq!("keep me", body["prompt"]);
        assert!(!rewrite_json_model_fields(
            &mut json!({"prompt": "x"}),
            "gpt-4o"
        ));
    }

    #[test]
    fn query_extraction_and_rewrite_cover_field_names_and_encoding() {
        assert_eq!(
            Some("openai/gpt-4o".to_owned()),
            model_query_value("model=openai%2Fgpt-4o")
        );
        assert_eq!(
            Some("eleven_multilingual_v2".to_owned()),
            model_query_value("model_id=eleven_multilingual_v2")
        );
        assert_eq!(
            Some("model_name=kling-v3&model_id=kling-v3&x=1".to_owned()),
            rewrite_query_model_fields(
                Some("model_name=kling-v3&model_id=kling-v3&x=1".to_owned()),
                "kling-v3"
            )
        );
        assert_eq!(
            Some("model=openai%2Fgpt-4o".to_owned()),
            rewrite_query_model_fields(Some("model=gpt-4o".to_owned()), "openai/gpt-4o")
        );
    }
}
