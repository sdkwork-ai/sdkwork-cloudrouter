//! Shared credential redaction for error messages.
//!
//! Single source of truth for masking `sk-<token>` and `Bearer <token>`
//! material before it reaches API clients. Both the invocation pipeline
//! (`response_normalization`) and the gateway HTTP layer (`invocation_http`)
//! must use this function so redaction behavior cannot drift between paths.

use sdkwork_cloudrouter_security::REDACTED;

/// Redact credential-like material from error messages before they are
/// returned to API clients.
///
/// Scans for common credential patterns — `sk-` prefixed API keys and
/// `Bearer` authorization tokens — and replaces the secret portion with the
/// `[REDACTED]` sentinel so that no raw credential material leaks through
/// error responses.
pub fn redact_sensitive_tokens(message: &str) -> String {
    let result = redact_sk_prefix_tokens(message);
    redact_bearer_tokens(&result)
}

/// Replace `sk-<token>` patterns (case-insensitive, 8+ alphanumeric chars)
/// with `sk-[REDACTED]`.
fn redact_sk_prefix_tokens(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        // Check for "sk-" (case-insensitive) at current position
        if i + 2 < bytes.len()
            && bytes[i].eq_ignore_ascii_case(&b's')
            && bytes[i + 1].eq_ignore_ascii_case(&b'k')
            && bytes[i + 2] == b'-'
        {
            // Count alphanumeric chars after "sk-"
            let token_start = i + 3;
            let mut token_end = token_start;
            while token_end < bytes.len() && bytes[token_end].is_ascii_alphanumeric() {
                token_end += 1;
            }
            if token_end - token_start >= 8 {
                result.push_str("sk-");
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
    fn keeps_short_sk_prefixes_and_plain_text() {
        assert_eq!("sk-abc", redact_sensitive_tokens("sk-abc"));
        assert_eq!(
            "provider returned status 500",
            redact_sensitive_tokens("provider returned status 500")
        );
    }
}
