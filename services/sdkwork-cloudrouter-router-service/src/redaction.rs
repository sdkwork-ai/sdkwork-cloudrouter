//! Shared credential redaction for error messages.
//!
//! Single source of truth for masking `sk-<token>`, `sp-<token>`, and
//! `Bearer <token>` material before it reaches API clients. Both the
//! invocation pipeline (`response_normalization`) and the gateway HTTP layer
//! (`invocation_http`) must use this function so redaction behavior cannot
//! drift between paths.

use sdkwork_cloudrouter_security::REDACTED;

/// Gateway API key prefixes that must be redacted wherever they appear.
/// `sk-` identifies standard gateway API keys; `sp-` identifies platform
/// keys issued through the same gateway key authority.
const GATEWAY_KEY_PREFIXES: [&str; 2] = ["sk-", "sp-"];

/// Redact credential-like material from error messages before they are
/// returned to API clients.
///
/// Scans for common credential patterns — `sk-`/`sp-` prefixed gateway API
/// keys and `Bearer` authorization tokens — and replaces the secret portion
/// with the `[REDACTED]` sentinel so that no raw credential material leaks
/// through error responses, audit records, or traces.
pub fn redact_sensitive_tokens(message: &str) -> String {
    let mut result = message.to_owned();
    for prefix in GATEWAY_KEY_PREFIXES {
        result = redact_prefixed_tokens(&result, prefix);
    }
    redact_bearer_tokens(&result)
}

/// Replace `<prefix><token>` patterns (case-insensitive, 8+ alphanumeric
/// chars) with `<prefix>[REDACTED]`.
fn redact_prefixed_tokens(input: &str, prefix: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let prefix_bytes = prefix.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        // Check for the prefix (case-insensitive) at current position.
        if i + prefix_bytes.len() <= bytes.len()
            && bytes[i..i + prefix_bytes.len()]
                .iter()
                .zip(prefix_bytes)
                .all(|(left, right)| left.eq_ignore_ascii_case(right))
        {
            // Count alphanumeric chars after the prefix.
            let token_start = i + prefix_bytes.len();
            let mut token_end = token_start;
            while token_end < bytes.len() && bytes[token_end].is_ascii_alphanumeric() {
                token_end += 1;
            }
            if token_end - token_start >= 8 {
                result.push_str(prefix);
                result.push_str(REDACTED);
                i = token_end;
                continue;
            }
        }
        result.push(bytes[i] as char);
        i += 1;
    }
    result
}

/// Replace `Bearer <token>` patterns (case-insensitive, 8+ token chars)
/// with `Bearer [REDACTED]`.
fn redact_bearer_tokens(input: &str) -> String {
    let lower = input.to_ascii_lowercase();
    let mut result = String::with_capacity(input.len());
    let bearer = "bearer ";
    let mut last_end = 0;
    let mut search = 0;
    while let Some(pos) = lower[search..].find(bearer) {
        let abs = search + pos;
        result.push_str(&input[last_end..abs]);
        let token_start = abs + bearer.len();
        let token_end = input[token_start..]
            .find(|c: char| !c.is_ascii_alphanumeric() && c != '.' && c != '-' && c != '_')
            .map(|rel| token_start + rel)
            .unwrap_or(input.len());
        if token_end - token_start >= 8 {
            result.push_str("Bearer ");
            result.push_str(REDACTED);
        } else {
            result.push_str(&input[abs..token_end]);
        }
        last_end = token_end;
        search = token_end;
    }
    result.push_str(&input[last_end..]);
    result
}

#[cfg(test)]
mod tests {
    use super::redact_sensitive_tokens;

    #[test]
    fn redacts_long_sk_tokens_and_bearer_credentials() {
        assert_eq!(
            "sk-[REDACTED]",
            redact_sensitive_tokens("upstream rejected sk-abcdefghijklmnop secret")
                .split_whitespace()
                .find(|word| word.starts_with("sk-"))
                .unwrap()
        );
        assert!(
            redact_sensitive_tokens("auth failed: Bearer eyJhbGciOiJIUzI1NiJ9.token.value")
                .contains("Bearer [REDACTED]"),
            "long bearer credentials must be redacted"
        );
    }

    #[test]
    fn redacts_sp_prefixed_gateway_keys() {
        assert_eq!(
            "sp-[REDACTED]",
            redact_sensitive_tokens("rejected sp-abcdefghijklmnop secret")
                .split_whitespace()
                .find(|word| word.starts_with("sp-"))
                .unwrap()
        );
        assert!(
            !redact_sensitive_tokens("sp-abcdefghijklmnop").contains("abcdefghijklmnop"),
            "the raw sp- token body must never survive redaction"
        );
        assert!(
            redact_sensitive_tokens("upstream echoed SP-QWERTYUIOPASDFGHJK raw")
                .contains("sp-[REDACTED]"),
            "sp- keys must be redacted case-insensitively (prefix normalized)"
        );
        assert!(
            !redact_sensitive_tokens("upstream echoed SP-QWERTYUIOPASDFGHJK raw")
                .contains("QWERTYUIOPASDFGHJK"),
            "uppercase sp- token body must never survive redaction"
        );
    }

    #[test]
    fn redacts_multiple_prefixes_in_one_message() {
        let redacted = redact_sensitive_tokens(
            "sk-abcdefghijklmnop and sp-qrstuvwxyzabcd both leaked",
        );
        assert!(!redacted.contains("abcdefghijklmnop"), "sk- token must be redacted");
        assert!(!redacted.contains("qrstuvwxyzabcd"), "sp- token must be redacted");
        assert!(redacted.contains("sk-[REDACTED]") && redacted.contains("sp-[REDACTED]"));
    }

    #[test]
    fn keeps_short_sk_prefixes_and_plain_text() {
        assert_eq!("sk-abc", redact_sensitive_tokens("sk-abc"));
        assert_eq!("sp-abc", redact_sensitive_tokens("sp-abc"));
        assert_eq!(
            "provider returned status 500",
            redact_sensitive_tokens("provider returned status 500")
        );
    }
}
