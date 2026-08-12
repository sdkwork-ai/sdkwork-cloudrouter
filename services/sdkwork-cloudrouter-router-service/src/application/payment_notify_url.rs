//! Payment notify URL validation.
//!
//! The intent creation API accepts an explicit client-provided `notifyUrl`
//! override which is passed through to the provider adapter. Standard notify
//! URL construction is owned by the order gateway checkout
//! (`ORDER_PAYMENT_WEBHOOK_BASE_URL` in sdkwork-payment), so this module only
//! validates the client-supplied value before it reaches the adapter.

use url::Url;

/// Maximum length of a client-provided notify URL override.
pub const MAX_PAYMENT_NOTIFY_URL_LEN: usize = 2_048;

/// Validates a client-provided notify URL override: absolute http/https,
/// bounded length, visible ASCII, and no fragment. Query strings are allowed
/// so merchants can attach receiver routing parameters.
pub fn validate_payment_notify_url(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("payment notify_url must not be blank".to_owned());
    }
    if value.chars().count() > MAX_PAYMENT_NOTIFY_URL_LEN {
        return Err(format!(
            "payment notify_url length must not exceed {MAX_PAYMENT_NOTIFY_URL_LEN} characters"
        ));
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("payment notify_url must contain only visible ASCII characters".to_owned());
    }
    let parsed = value
        .parse::<Url>()
        .map_err(|error| format!("payment notify_url is not a valid URL: {error}"))?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("payment notify_url must be an absolute http or https URL".to_owned());
    }
    if parsed.fragment().is_some() {
        return Err("payment notify_url must not include a fragment".to_owned());
    }
    Ok(value.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn notify_url_validation_accepts_absolute_http_urls_with_query() {
        assert_eq!(
            "https://receiver.example.com/pay/hook?org=42",
            validate_payment_notify_url("https://receiver.example.com/pay/hook?org=42").unwrap()
        );
    }

    #[test]
    fn notify_url_validation_rejects_relative_fragment_and_blank_urls() {
        for value in [
            "",
            "   ",
            "/relative/path",
            "ftp://host/x",
            "https://host/x#frag",
        ] {
            assert!(
                validate_payment_notify_url(value).is_err(),
                "notify URL {value:?} must be rejected"
            );
        }
    }
}
