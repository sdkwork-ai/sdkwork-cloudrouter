//! Validation for configured outbound HTTP targets.
//!
//! This module validates URL syntax and obvious unsafe destinations before a
//! caller serializes or forwards a provider credential. It deliberately does
//! not claim to solve DNS rebinding: production callers still need a resolver
//! and egress policy that validate the address selected at connection time.

use url::{Host, Url};

/// Controls the target types that an outbound client may use.
///
/// Production rejects cleartext HTTP, literal IP destinations, and names that
/// conventionally resolve inside a local or cluster network. Development is
/// intentionally explicit and permits local HTTP endpoints for test fixtures
/// and desktop development while retaining syntax and credential checks.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum OutboundTargetPolicy {
    #[default]
    Production,
    Development,
}

#[derive(Debug, thiserror::Error, Clone, PartialEq, Eq)]
pub enum OutboundTargetValidationError {
    #[error("outbound target URL is invalid")]
    InvalidUrl,
    #[error("outbound target must use HTTPS")]
    HttpsRequired,
    #[error("outbound target has no host")]
    MissingHost,
    #[error("outbound target must not include userinfo")]
    UserinfoForbidden,
    #[error("outbound target must not include a fragment")]
    FragmentForbidden,
    #[error("production outbound target must not use an IP literal")]
    IpLiteralForbidden,
    #[error("outbound target must not use an unspecified IP address")]
    UnspecifiedIpForbidden,
    #[error("production outbound target host is reserved for local or internal networking")]
    InternalHostForbidden,
    #[error("configured outbound base URL must not include a query string")]
    BaseUrlQueryForbidden,
}

/// Validates a complete outbound request URL.
///
/// Request URLs may contain a query string because provider authentication can
/// legitimately be transported in a generated query parameter. Configure the
/// base URL through [`validate_outbound_base_url`] to reject static queries.
pub fn validate_outbound_url(
    value: &str,
    policy: OutboundTargetPolicy,
) -> Result<Url, OutboundTargetValidationError> {
    let url = Url::parse(value.trim()).map_err(|_| OutboundTargetValidationError::InvalidUrl)?;
    validate_url(&url, policy)?;
    Ok(url)
}

/// Validates a configured provider or adapter base URL.
pub fn validate_outbound_base_url(
    value: &str,
    policy: OutboundTargetPolicy,
) -> Result<Url, OutboundTargetValidationError> {
    let url = validate_outbound_url(value, policy)?;
    if url.query().is_some() {
        return Err(OutboundTargetValidationError::BaseUrlQueryForbidden);
    }
    Ok(url)
}

fn validate_url(
    url: &Url,
    policy: OutboundTargetPolicy,
) -> Result<(), OutboundTargetValidationError> {
    match url.scheme() {
        "https" => {}
        "http" if policy == OutboundTargetPolicy::Development => {}
        _ => return Err(OutboundTargetValidationError::HttpsRequired),
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(OutboundTargetValidationError::UserinfoForbidden);
    }
    if url.fragment().is_some() {
        return Err(OutboundTargetValidationError::FragmentForbidden);
    }

    match url.host() {
        Some(Host::Domain(host)) => {
            if policy == OutboundTargetPolicy::Production && is_internal_host(host) {
                return Err(OutboundTargetValidationError::InternalHostForbidden);
            }
        }
        Some(Host::Ipv4(address)) => {
            if address.is_unspecified() {
                return Err(OutboundTargetValidationError::UnspecifiedIpForbidden);
            }
            if policy == OutboundTargetPolicy::Production {
                return Err(OutboundTargetValidationError::IpLiteralForbidden);
            }
        }
        Some(Host::Ipv6(address)) => {
            if address.is_unspecified() {
                return Err(OutboundTargetValidationError::UnspecifiedIpForbidden);
            }
            if policy == OutboundTargetPolicy::Production {
                return Err(OutboundTargetValidationError::IpLiteralForbidden);
            }
        }
        None => return Err(OutboundTargetValidationError::MissingHost),
    }
    Ok(())
}

fn is_internal_host(host: &str) -> bool {
    let host = host.trim_end_matches('.').to_ascii_lowercase();
    host == "localhost"
        || host == "localhost.localdomain"
        || host == "metadata.google.internal"
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
        || host.ends_with(".cluster.local")
        || !host.contains('.')
}

#[cfg(test)]
mod tests {
    use super::{
        validate_outbound_base_url, validate_outbound_url, OutboundTargetPolicy,
        OutboundTargetValidationError,
    };

    #[test]
    fn production_accepts_public_https_domain() {
        let url = validate_outbound_base_url(
            "https://api.openai.com/v1",
            OutboundTargetPolicy::Production,
        )
        .unwrap();

        assert_eq!("https", url.scheme());
        assert_eq!(Some("api.openai.com"), url.host_str());
    }

    #[test]
    fn production_rejects_cleartext_and_internal_destinations() {
        for value in [
            "http://api.openai.com/v1",
            "https://localhost/v1",
            "https://provider.internal/v1",
            "https://relay.svc.cluster.local/v1",
            "https://metadata.google.internal/computeMetadata/v1",
            "https://127.0.0.1/v1",
            "https://[::1]/v1",
            "https://169.254.169.254/latest/meta-data",
        ] {
            assert!(
                validate_outbound_url(value, OutboundTargetPolicy::Production).is_err(),
                "{value} should be rejected"
            );
        }
    }

    #[test]
    fn development_allows_explicit_local_http_but_not_url_credentials() {
        validate_outbound_base_url(
            "http://127.0.0.1:8080/provider",
            OutboundTargetPolicy::Development,
        )
        .unwrap();
        assert_eq!(
            Err(OutboundTargetValidationError::UserinfoForbidden),
            validate_outbound_url(
                "http://token@example.test/v1",
                OutboundTargetPolicy::Development,
            )
        );
    }

    #[test]
    fn configured_base_url_rejects_static_query_and_fragment() {
        assert_eq!(
            Err(OutboundTargetValidationError::BaseUrlQueryForbidden),
            validate_outbound_base_url(
                "https://api.openai.com/v1?api_key=secret",
                OutboundTargetPolicy::Production,
            )
        );
        assert_eq!(
            Err(OutboundTargetValidationError::FragmentForbidden),
            validate_outbound_base_url(
                "https://api.openai.com/v1#fragment",
                OutboundTargetPolicy::Production,
            )
        );
    }
}
