use axum::http::{HeaderName, HeaderValue};
use serde_json::{Map, Value};

use super::{DomainError, DomainResult, ProviderAuthHeader, ProviderAuthProfile};

const MAX_RUNTIME_AUTH_CONFIG_BYTES: usize = 16 * 1024;
const MAX_DEFAULT_HEADERS: usize = 32;
const MAX_PARAMETER_NAME_LENGTH: usize = 128;
const MAX_HEADER_VALUE_LENGTH: usize = 2048;

pub fn canonical_upstream_runtime_auth_config(
    auth_type: &str,
    value: &Value,
) -> DomainResult<Value> {
    let encoded =
        serde_json::to_vec(value).map_err(|_| runtime_config_error("must be valid JSON"))?;
    if encoded.len() > MAX_RUNTIME_AUTH_CONFIG_BYTES {
        return Err(runtime_config_error(format!(
            "must not exceed {MAX_RUNTIME_AUTH_CONFIG_BYTES} bytes"
        )));
    }
    let object = value
        .as_object()
        .ok_or_else(|| runtime_config_error("must be a JSON object"))?;
    reject_unknown_fields(object)?;

    let credential_transport = required_string(object, "credentialTransport")?.to_ascii_lowercase();
    if !matches!(
        credential_transport.as_str(),
        "bearer" | "header" | "query" | "provider_adapter"
    ) {
        return Err(runtime_config_error(
            "credentialTransport must be bearer, header, query, or provider_adapter",
        ));
    }
    validate_auth_type_transport(auth_type, &credential_transport)?;

    let mut credential_parameter = optional_string(object, "credentialParameter")?;
    match credential_transport.as_str() {
        "header" => {
            let parameter = credential_parameter.as_deref().ok_or_else(|| {
                runtime_config_error("credentialParameter is required for header transport")
            })?;
            credential_parameter = Some(validate_header_name(parameter, "credentialParameter")?);
        }
        "query" => {
            let parameter = credential_parameter.as_deref().ok_or_else(|| {
                runtime_config_error("credentialParameter is required for query transport")
            })?;
            validate_query_parameter_name(parameter)?;
        }
        _ if credential_parameter.is_some() => {
            return Err(runtime_config_error(
                "credentialParameter is allowed only for header or query transport",
            ));
        }
        _ => {}
    }

    let default_headers = canonical_default_headers(object.get("defaultHeaders"))?;
    if let Some(parameter) = credential_parameter.as_deref() {
        if default_headers.contains_key(&parameter.to_ascii_lowercase()) {
            return Err(runtime_config_error(
                "defaultHeaders must not override credentialParameter",
            ));
        }
    }

    let adapter_scheme = optional_string(object, "adapterScheme")?;
    let adapter_options = canonical_adapter_options(object.get("adapterOptions"))?;
    if credential_transport == "provider_adapter" {
        let scheme = adapter_scheme.as_deref().ok_or_else(|| {
            runtime_config_error("adapterScheme is required for provider_adapter transport")
        })?;
        validate_code(scheme, "adapterScheme")?;
    } else if adapter_scheme.is_some() || adapter_options.is_some() {
        return Err(runtime_config_error(
            "adapterScheme and adapterOptions require provider_adapter transport",
        ));
    }

    let mut canonical = Map::new();
    canonical.insert(
        "credentialTransport".to_owned(),
        Value::String(credential_transport),
    );
    if let Some(parameter) = credential_parameter {
        canonical.insert("credentialParameter".to_owned(), Value::String(parameter));
    }
    canonical.insert("defaultHeaders".to_owned(), Value::Object(default_headers));
    if let Some(scheme) = adapter_scheme {
        canonical.insert("adapterScheme".to_owned(), Value::String(scheme));
    }
    if let Some(options) = adapter_options {
        canonical.insert("adapterOptions".to_owned(), Value::Object(options));
    }
    Ok(Value::Object(canonical))
}

pub fn resolve_upstream_runtime_auth_profile(
    auth_type: &str,
    runtime_auth_config_json: &str,
) -> DomainResult<ProviderAuthProfile> {
    let value: Value = serde_json::from_str(runtime_auth_config_json)
        .map_err(|_| runtime_config_error("must be valid JSON"))?;
    let canonical = canonical_upstream_runtime_auth_config(auth_type, &value)?;
    let object = canonical
        .as_object()
        .ok_or_else(|| runtime_config_error("must be a JSON object"))?;
    let transport = required_string(object, "credentialTransport")?;
    if transport == "provider_adapter" {
        return Err(runtime_config_error(
            "provider_adapter transport requires a registered supplier adapter and cannot use the direct relay",
        ));
    }
    let parameter = optional_string(object, "credentialParameter")?;
    let mut profile = match transport.as_str() {
        "bearer" => ProviderAuthProfile::bearer(),
        "header" => ProviderAuthProfile::header(
            parameter.ok_or_else(|| runtime_config_error("credentialParameter is required"))?,
        ),
        "query" => ProviderAuthProfile::query(
            parameter.ok_or_else(|| runtime_config_error("credentialParameter is required"))?,
        ),
        _ => return Err(runtime_config_error("credentialTransport is not supported")),
    };
    profile.default_headers = object
        .get("defaultHeaders")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|headers| headers.iter())
        .map(|(name, value)| ProviderAuthHeader {
            name: name.clone(),
            value: value.as_str().unwrap_or_default().to_owned(),
        })
        .collect();
    profile
        .default_headers
        .sort_by(|left, right| left.name.cmp(&right.name));
    Ok(profile)
}

fn reject_unknown_fields(object: &Map<String, Value>) -> DomainResult<()> {
    for field in object.keys() {
        if !matches!(
            field.as_str(),
            "credentialTransport"
                | "credentialParameter"
                | "defaultHeaders"
                | "adapterScheme"
                | "adapterOptions"
        ) {
            return Err(runtime_config_error(format!(
                "contains unsupported field: {field}"
            )));
        }
    }
    Ok(())
}

fn validate_auth_type_transport(auth_type: &str, transport: &str) -> DomainResult<()> {
    let auth_type = auth_type.trim().to_ascii_lowercase();
    let valid = match auth_type.as_str() {
        "api_key" => matches!(transport, "bearer" | "header" | "query"),
        "bearer_token" => transport == "bearer",
        "oauth2_client_credentials" | "oauth2_authorization_code" => {
            transport == "provider_adapter"
        }
        "aws_sigv4" => transport == "provider_adapter",
        "custom" => matches!(
            transport,
            "bearer" | "header" | "query" | "provider_adapter"
        ),
        _ => false,
    };
    if valid {
        Ok(())
    } else {
        Err(runtime_config_error(format!(
            "credentialTransport {transport} is incompatible with authType {auth_type}"
        )))
    }
}

fn canonical_default_headers(value: Option<&Value>) -> DomainResult<Map<String, Value>> {
    let Some(value) = value else {
        return Ok(Map::new());
    };
    let headers = value
        .as_object()
        .ok_or_else(|| runtime_config_error("defaultHeaders must be a JSON object"))?;
    if headers.len() > MAX_DEFAULT_HEADERS {
        return Err(runtime_config_error(format!(
            "defaultHeaders must contain at most {MAX_DEFAULT_HEADERS} entries"
        )));
    }
    let mut canonical = Map::new();
    for (name, value) in headers {
        let name = validate_header_name(name, "defaultHeaders name")?;
        if is_sensitive_header_name(&name) {
            return Err(runtime_config_error(format!(
                "defaultHeaders must not contain credential-bearing header: {name}"
            )));
        }
        let value = value
            .as_str()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                runtime_config_error(format!("defaultHeaders.{name} must be a non-empty string"))
            })?;
        if value.len() > MAX_HEADER_VALUE_LENGTH || HeaderValue::from_str(value).is_err() {
            return Err(runtime_config_error(format!(
                "defaultHeaders.{name} is not a valid HTTP header value"
            )));
        }
        canonical.insert(name, Value::String(value.to_owned()));
    }
    Ok(canonical)
}

fn canonical_adapter_options(value: Option<&Value>) -> DomainResult<Option<Map<String, Value>>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let options = value
        .as_object()
        .ok_or_else(|| runtime_config_error("adapterOptions must be a JSON object"))?;
    reject_sensitive_option_fields(options, "adapterOptions")?;
    Ok(Some(options.clone()))
}

fn reject_sensitive_option_fields(object: &Map<String, Value>, path: &str) -> DomainResult<()> {
    for (name, value) in object {
        let normalized = name.to_ascii_lowercase().replace(['-', '_'], "");
        if [
            "secret",
            "password",
            "credential",
            "accesstoken",
            "refreshtoken",
            "apikey",
        ]
        .iter()
        .any(|marker| normalized.contains(marker))
        {
            return Err(runtime_config_error(format!(
                "{path}.{name} is sensitive and must be stored in ai_upstream_account_credential"
            )));
        }
        if let Some(nested) = value.as_object() {
            reject_sensitive_option_fields(nested, &format!("{path}.{name}"))?;
        }
    }
    Ok(())
}

fn required_string(object: &Map<String, Value>, field: &str) -> DomainResult<String> {
    optional_string(object, field)?
        .ok_or_else(|| runtime_config_error(format!("{field} is required")))
}

fn optional_string(object: &Map<String, Value>, field: &str) -> DomainResult<Option<String>> {
    let Some(value) = object.get(field) else {
        return Ok(None);
    };
    let value = value
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| runtime_config_error(format!("{field} must be a non-empty string")))?;
    if value.len() > MAX_PARAMETER_NAME_LENGTH {
        return Err(runtime_config_error(format!(
            "{field} must not exceed {MAX_PARAMETER_NAME_LENGTH} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn validate_header_name(value: &str, field: &str) -> DomainResult<String> {
    let normalized = value.trim().to_ascii_lowercase();
    HeaderName::from_bytes(normalized.as_bytes())
        .map_err(|_| runtime_config_error(format!("{field} must be a valid HTTP header name")))?;
    Ok(normalized)
}

fn validate_query_parameter_name(value: &str) -> DomainResult<()> {
    if value.is_empty()
        || value.len() > MAX_PARAMETER_NAME_LENGTH
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~'))
    {
        return Err(runtime_config_error(
            "credentialParameter must be a safe query parameter name",
        ));
    }
    Ok(())
}

fn validate_code(value: &str, field: &str) -> DomainResult<()> {
    if value.is_empty()
        || value.len() > 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_')
    {
        return Err(runtime_config_error(format!(
            "{field} must use lowercase snake_case and contain at most 64 characters"
        )));
    }
    Ok(())
}

fn is_sensitive_header_name(name: &str) -> bool {
    matches!(
        name,
        "authorization"
            | "proxy-authorization"
            | "cookie"
            | "set-cookie"
            | "x-api-key"
            | "api-key"
            | "x-goog-api-key"
            | "x-auth-token"
            | "x-access-token"
    )
}

fn runtime_config_error(message: impl Into<String>) -> DomainError {
    DomainError::new(format!(
        "ai_upstream_supplier_auth_method.runtime_auth_config {}",
        message.into()
    ))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{canonical_upstream_runtime_auth_config, resolve_upstream_runtime_auth_profile};
    use crate::domain::ProviderAuthType;

    #[test]
    fn resolves_explicit_header_transport_without_supplier_heuristics() {
        let profile = resolve_upstream_runtime_auth_profile(
            "api_key",
            r#"{"credentialTransport":"header","credentialParameter":"X-API-Key","defaultHeaders":{"anthropic-version":"2023-06-01"}}"#,
        )
        .unwrap();

        assert_eq!(ProviderAuthType::Header, profile.auth_type);
        assert_eq!(Some("x-api-key"), profile.name.as_deref());
        assert_eq!(1, profile.default_headers.len());
    }

    #[test]
    fn rejects_secret_material_from_non_sensitive_runtime_config() {
        let error = canonical_upstream_runtime_auth_config(
            "api_key",
            &json!({
                "credentialTransport": "bearer",
                "defaultHeaders": {"Authorization": "Bearer leaked"}
            }),
        )
        .unwrap_err();

        assert!(error.to_string().contains("credential-bearing header"));
    }

    #[test]
    fn requires_provider_adapter_for_aws_sigv4() {
        let config = canonical_upstream_runtime_auth_config(
            "aws_sigv4",
            &json!({
                "credentialTransport": "provider_adapter",
                "adapterScheme": "aws_sigv4",
                "adapterOptions": {"service": "bedrock", "region": "us-east-1"}
            }),
        )
        .unwrap();

        let error =
            resolve_upstream_runtime_auth_profile("aws_sigv4", &config.to_string()).unwrap_err();
        assert!(error.to_string().contains("registered supplier adapter"));
    }
}
