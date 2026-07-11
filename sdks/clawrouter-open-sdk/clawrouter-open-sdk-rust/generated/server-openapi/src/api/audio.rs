use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{
    DeleteResult, OpenAiAudioTranscription, OpenAiAudioTranscriptionRequest,
    OpenAiAudioTranslation, OpenAiAudioTranslationRequest, OpenAiSpeechCreateRequest, OpenAiVoice,
    OpenAiVoiceConsent, OpenAiVoiceConsentCreateRequest, OpenAiVoiceConsentList,
    OpenAiVoiceCreateRequest, OpenAiVoiceList,
};

#[derive(Clone)]
pub struct AudioApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create speech
    pub async fn create_speech(
        &self,
        body: &OpenAiSpeechCreateRequest,
    ) -> Result<String, SdkworkError> {
        let path = ai_path(&"/audio/speech".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Create transcription
    pub async fn create_transcription(
        &self,
        body: &OpenAiAudioTranscriptionRequest,
    ) -> Result<OpenAiAudioTranscription, SdkworkError> {
        let path = ai_path(&"/audio/transcriptions".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Create translation
    pub async fn create_translation(
        &self,
        body: &OpenAiAudioTranslationRequest,
    ) -> Result<OpenAiAudioTranslation, SdkworkError> {
        let path = ai_path(&"/audio/translations".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// List voice consents
    pub async fn list_voice_consents(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiVoiceConsentList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page_size", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/audio/voice_consents".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create voice consent
    pub async fn create_voice_consent(
        &self,
        body: &OpenAiVoiceConsentCreateRequest,
    ) -> Result<OpenAiVoiceConsent, SdkworkError> {
        let path = ai_path(&"/audio/voice_consents".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete voice consent
    pub async fn delete_voice_consents(
        &self,
        consent_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/audio/voice_consents/{}",
            serialize_path_parameter(
                consent_id,
                PathParameterSpec::new("consent_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// List voices
    pub async fn list_voices(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiVoiceList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page_size", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/audio/voices".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create voice
    pub async fn create_voice(
        &self,
        body: &OpenAiVoiceCreateRequest,
    ) -> Result<OpenAiVoice, SdkworkError> {
        let path = ai_path(&"/audio/voices".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self {
            name,
            style,
            explode,
        }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() {
        "simple"
    } else {
        spec.style
    };
    match value {
        serde_json::Value::Array(values) => {
            serialize_path_array(spec.name, &values, style, spec.explode)
        }
        serde_json::Value::Object(values) => {
            serialize_path_object(spec.name, &values, style, spec.explode)
        }
        value => format!(
            "{}{}",
            path_primitive_prefix(spec.name, style),
            percent_encode(&primitive_to_string(&value))
        ),
    }
}

fn serialize_path_array(
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized
                .iter()
                .map(|item| format!(";{}={}", name, item))
                .collect::<Vec<_>>()
                .join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}

struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() {
        "form"
    } else {
        parameter.style
    };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(
            pairs,
            parameter.name,
            values,
            style,
            parameter.explode,
            parameter.allow_reserved,
        ),
        serde_json::Value::Object(values) if style == "deepObject" => {
            append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved)
        }
        serde_json::Value::Object(values) => append_object_parameter(
            pairs,
            parameter.name,
            values,
            style,
            parameter.explode,
            parameter.allow_reserved,
        ),
        value => pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&primitive_to_string(value), parameter.allow_reserved)
        )),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(primitive_to_string)
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!(
                "{}={}",
                percent_encode(name),
                encode_query_value(&item, allow_reserved)
            ));
        }
        return;
    }
    pairs.push(format!(
        "{}={}",
        percent_encode(name),
        encode_query_value(&serialized.join(","), allow_reserved)
    ));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!(
                "{}={}",
                percent_encode(key),
                encode_query_value(&primitive_to_string(value), allow_reserved)
            ));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!(
            "{}={}",
            percent_encode(name),
            encode_query_value(&serialized.join(","), allow_reserved)
        ));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!(
                "{}={}",
                percent_encode(&format!("{}[{}]", name, key)),
                encode_query_value(&primitive_to_string(value), allow_reserved)
            ));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"),
        ("%2F", "/"),
        ("%3F", "?"),
        ("%23", "#"),
        ("%5B", "["),
        ("%5D", "]"),
        ("%40", "@"),
        ("%21", "!"),
        ("%24", "$"),
        ("%26", "&"),
        ("%27", "'"),
        ("%28", "("),
        ("%29", ")"),
        ("%2A", "*"),
        ("%2B", "+"),
        ("%2C", ","),
        ("%3B", ";"),
        ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
