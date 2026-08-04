use serde_json::{Map, Number, Value};
use url::Url;

use crate::domain::{DomainError, DomainResult};

const SCHEMA_VERSION: u64 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ServiceNodeMetadata {
    pub deployment_profile: String,
    pub base_url: String,
    pub domains: Vec<String>,
    pub domain: String,
    pub remark: String,
}

impl ServiceNodeMetadata {
    pub(crate) fn from_map(metadata: &Map<String, Value>) -> Self {
        let deployment_profile = string_value(metadata, "deploymentProfile")
            .or_else(|| string_value(metadata, "deployment_profile"))
            .filter(|value| matches!(value.as_str(), "standalone" | "cloud"))
            .unwrap_or_else(|| "standalone".to_owned());
        let mut base_url = [
            "baseUrl",
            "base_url",
            "endpoint",
            "publicUrl",
            "public_url",
            "origin",
        ]
        .into_iter()
        .find_map(|key| string_value(metadata, key))
        .unwrap_or_default();
        let legacy_domain_value = string_value(metadata, "domain").unwrap_or_default();
        let legacy_domain = normalize_domain_alias(&legacy_domain_value);
        let mut domains = metadata
            .get("domains")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(normalize_domain_alias)
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>();
        if !legacy_domain.is_empty() && !domains.contains(&legacy_domain) {
            domains.insert(0, legacy_domain.clone());
        }
        if domains.is_empty() {
            if let Some(domain) = domain_from_base_url(&base_url) {
                domains.push(domain);
            }
        }
        let domain = domains.first().cloned().unwrap_or(legacy_domain);
        if base_url.is_empty() && !legacy_domain_value.is_empty() {
            base_url = match Url::parse(&legacy_domain_value) {
                Ok(url) if matches!(url.scheme(), "http" | "https") => {
                    url.to_string().trim_end_matches('/').to_owned()
                }
                _ if !domain.is_empty() => format!("https://{domain}/v1"),
                _ => String::new(),
            };
        }
        Self {
            deployment_profile,
            base_url,
            domains,
            domain,
            remark: string_value(metadata, "remark").unwrap_or_default(),
        }
    }

    pub(crate) fn public_urls(&self) -> Vec<String> {
        let mut urls = Vec::new();
        push_unique(&mut urls, self.base_url.clone());
        for domain in &self.domains {
            let alias = alias_url(&self.base_url, domain).unwrap_or_else(|| domain.clone());
            push_unique(&mut urls, alias);
        }
        urls.retain(|value| !value.is_empty());
        urls
    }
}

pub(crate) fn parse_metadata(value: &str) -> Map<String, Value> {
    match serde_json::from_str::<Value>(value).unwrap_or(Value::Object(Map::new())) {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

pub(crate) fn new_metadata(
    deployment_profile: &str,
    base_url: &str,
    domains: &[String],
    remark: &str,
) -> Map<String, Value> {
    let mut metadata = Map::new();
    apply_metadata_fields(
        &mut metadata,
        Some(deployment_profile),
        Some(base_url),
        Some(domains),
        Some(remark),
    );
    metadata
}

pub(crate) fn apply_metadata_fields(
    metadata: &mut Map<String, Value>,
    deployment_profile: Option<&str>,
    base_url: Option<&str>,
    domains: Option<&[String]>,
    remark: Option<&str>,
) {
    metadata.insert(
        "schemaVersion".to_owned(),
        Value::Number(Number::from(SCHEMA_VERSION)),
    );
    if let Some(deployment_profile) = deployment_profile {
        metadata.insert(
            "deploymentProfile".to_owned(),
            Value::String(deployment_profile.to_owned()),
        );
    }
    if let Some(base_url) = base_url {
        metadata.insert("baseUrl".to_owned(), Value::String(base_url.to_owned()));
    }
    if let Some(domains) = domains {
        metadata.insert(
            "domains".to_owned(),
            Value::Array(domains.iter().cloned().map(Value::String).collect()),
        );
        metadata.insert(
            "domain".to_owned(),
            Value::String(domains.first().cloned().unwrap_or_default()),
        );
    }
    if let Some(remark) = remark {
        metadata.insert("remark".to_owned(), Value::String(remark.to_owned()));
    }
}

pub(crate) fn serialize_metadata(metadata: Map<String, Value>) -> DomainResult<String> {
    serde_json::to_string(&Value::Object(metadata)).map_err(|error| {
        DomainError::new(format!(
            "failed to serialize service node metadata: {error}"
        ))
    })
}

fn string_value(metadata: &Map<String, Value>, key: &str) -> Option<String> {
    metadata
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn domain_from_base_url(base_url: &str) -> Option<String> {
    let parsed = Url::parse(base_url).ok()?;
    let host = parsed.host_str()?;
    let host = if host.contains(':') {
        format!("[{host}]")
    } else {
        host.to_owned()
    };
    Some(match parsed.port() {
        Some(port) => format!("{host}:{port}"),
        None => host,
    })
}

fn normalize_domain_alias(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        return String::new();
    }
    if let Some(domain) = domain_from_base_url(value) {
        return domain.to_ascii_lowercase();
    }
    value.trim_end_matches('/').to_ascii_lowercase()
}

fn alias_url(base_url: &str, domain: &str) -> Option<String> {
    let mut base = Url::parse(base_url).ok()?;
    let authority = Url::parse(&format!("{}://{domain}", base.scheme())).ok()?;
    base.set_host(authority.host_str()).ok()?;
    base.set_port(authority.port()).ok()?;
    let mut value = base.to_string();
    if base.path() == "/" {
        value.pop();
    } else {
        while value.ends_with('/') {
            value.pop();
        }
    }
    Some(value)
}

fn push_unique(values: &mut Vec<String>, value: String) {
    if !value.is_empty()
        && !values
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(&value))
    {
        values.push(value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_url_domain_is_upgraded_without_double_scheme() {
        let metadata = parse_metadata(
            r#"{"domain":"https://EDGE.EXAMPLE.COM/v1/","remark":"Legacy ingress"}"#,
        );

        let configuration = ServiceNodeMetadata::from_map(&metadata);

        assert_eq!("https://edge.example.com/v1", configuration.base_url);
        assert_eq!(vec!["edge.example.com"], configuration.domains);
        assert_eq!("edge.example.com", configuration.domain);
        assert_eq!("Legacy ingress", configuration.remark);
    }

    #[test]
    fn public_urls_reuse_base_scheme_port_and_path_for_aliases() {
        let metadata = parse_metadata(
            r#"{"deploymentProfile":"standalone","baseUrl":"http://127.0.0.1:8080/v1","domains":["127.0.0.1:8080","localhost:8080"]}"#,
        );

        let configuration = ServiceNodeMetadata::from_map(&metadata);

        assert_eq!(
            vec!["http://127.0.0.1:8080/v1", "http://localhost:8080/v1"],
            configuration.public_urls()
        );
    }
}
