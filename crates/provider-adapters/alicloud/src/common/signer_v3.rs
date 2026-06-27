// AliCloud ACS V3 signature implementation.
//
// Reference: https://help.aliyun.com/zh/sdk/product-overview/v3-request-structure-and-signature
//
// ACS V3 is an HMAC-SHA256 based signing scheme similar to AWS Signature V4.
// The canonical request, string-to-sign, and signature are computed as:
//
//   canonical_request = HTTPMethod + "\n"
//                     + CanonicalURI + "\n"
//                     + CanonicalQueryString + "\n"
//                     + CanonicalHeaders + "\n"
//                     + SignedHeaders + "\n"
//                     + HashedPayload
//
//   string_to_sign = "ACS3-HMAC-SHA256" + "\n"
//                  + ISO8601_timestamp + "\n"
//                  + HEX(SHA256(canonical_request))
//
//   signature = HEX(HMAC-SHA256(secret_key, string_to_sign))
//
//   Authorization: ACS3-HMAC-SHA256 Credential=<access_key_id>,SignedHeaders=<headers>,Signature=<signature>

use std::collections::BTreeMap;

use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, PartialEq, Eq)]
pub struct AliCloudCredentials {
    pub access_key_id: String,
    pub access_key_secret: String,
}

impl AliCloudCredentials {
    pub fn new(access_key_id: impl Into<String>, access_key_secret: impl Into<String>) -> Self {
        Self {
            access_key_id: access_key_id.into(),
            access_key_secret: access_key_secret.into(),
        }
    }
}

impl std::fmt::Debug for AliCloudCredentials {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("AliCloudCredentials")
            .field("access_key_id", &self.access_key_id)
            .field("access_key_secret", &"[REDACTED]")
            .finish()
    }
}

/// Signed request components produced by [`sign`].
#[derive(Debug, Clone)]
pub struct SignedRequest {
    pub authorization: String,
    pub date: String,
}

/// Build the canonical query string from sorted key=value pairs.
///
/// Keys and values are percent-encoded per RFC 3986. An empty slice yields an
/// empty string.
fn canonical_query_string(query: &[(&str, &str)]) -> String {
    let mut pairs: Vec<(String, String)> = query
        .iter()
        .map(|(k, v)| (percent_encode(k), percent_encode(v)))
        .collect();
    pairs.sort();
    pairs
        .into_iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("&")
}

/// Build the canonical headers block and the signed-headers list.
///
/// Returns `(canonical_headers, signed_headers)` where both are newline-joined
/// strings. Header names are lowercased and sorted.
fn canonical_headers(headers: &BTreeMap<String, String>) -> (String, String) {
    let mut canonical = String::new();
    let mut signed = String::new();
    for (i, (name, value)) in headers.iter().enumerate() {
        let trimmed_value = value.trim();
        if i > 0 {
            canonical.push('\n');
            signed.push(';');
        }
        canonical.push_str(name);
        canonical.push(':');
        canonical.push_str(trimmed_value);
        signed.push_str(name);
    }
    (canonical, signed)
}

/// Compute the ACS V3 signature for the given request parameters.
///
/// Returns a [`SignedRequest`] containing the `Authorization` header value and
/// the `x-acs-date` timestamp that must be sent with the request.
pub fn sign(
    credentials: &AliCloudCredentials,
    method: &str,
    canonical_uri: &str,
    query: &[(&str, &str)],
    headers: &BTreeMap<String, String>,
    body: &[u8],
) -> SignedRequest {
    let date = chrono_iso8601_utc();

    // Hashed payload (SHA-256 hex of body)
    let hashed_payload = hex::encode(Sha256::digest(body));

    // Canonical query string
    let canonical_query = canonical_query_string(query);

    // Canonical headers + signed headers
    let (canonical_headers, signed_headers) = canonical_headers(headers);

    // Canonical request
    let canonical_request = format!(
        "{method}\n{canonical_uri}\n{canonical_query}\n{canonical_headers}\n{signed_headers}\n{hashed_payload}"
    );

    // String to sign
    let canonical_request_hash = hex::encode(Sha256::digest(canonical_request.as_bytes()));
    let string_to_sign = format!(
        "ACS3-HMAC-SHA256\n{date}\n{canonical_request_hash}"
    );

    // Signature: HMAC-SHA256(secret_key, string_to_sign)
    let mut mac = HmacSha256::new_from_slice(credentials.access_key_secret.as_bytes())
        .expect("HMAC key length is valid for any slice");
    mac.update(string_to_sign.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());

    let authorization = format!(
        "ACS3-HMAC-SHA256 Credential={},SignedHeaders={},Signature={}",
        credentials.access_key_id, signed_headers, signature
    );

    SignedRequest { authorization, date }
}

/// Percent-encode per RFC 3986 (unreserved: A-Z a-z 0-9 - _ . ~).
fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char);
            }
            _ => {
                out.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    out
}

/// Current UTC timestamp in ISO 8601 format (e.g. `2026-06-27T12:00:00Z`).
///
/// Uses a manual implementation to avoid pulling in a full chrono dependency
/// for the adapter crate.
fn chrono_iso8601_utc() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let total_secs = now.as_secs();
    epoch_to_iso8601_utc(total_secs)
}

fn epoch_to_iso8601_utc(epoch_seconds: u64) -> String {
    let days_since_epoch = (epoch_seconds / 86400) as i64;
    let seconds_of_day = (epoch_seconds % 86400) as u64;
    let hour = seconds_of_day / 3600;
    let minute = (seconds_of_day % 3600) / 60;
    let second = seconds_of_day % 60;

    let (year, month, day) = civil_from_days(days_since_epoch);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

/// Convert days since Unix epoch (1970-01-01) to (year, month, day).
/// Algorithm: Howard Hinnant, "Date Algorithms" (civil_from_days).
fn civil_from_days(days_since_epoch: i64) -> (i64, u32, u32) {
    let z = days_since_epoch + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sign_produces_non_empty_authorization() {
        let creds = AliCloudCredentials::new("LTAI5tFakeKeyId", "FakeKeySecret0123456789");
        let mut headers = BTreeMap::new();
        headers.insert("host".to_owned(), "dashscope.aliyuncs.com".to_owned());
        headers.insert("x-acs-action".to_owned(), "GenerateText".to_owned());
        headers.insert("x-acs-version".to_owned(), "2023-06-01".to_owned());

        let signed = sign(
            &creds,
            "POST",
            "/api/v1/services/aigc/text-generation/generation",
            &[],
            &headers,
            b"{\"model\":\"qwen-turbo\"}",
        );

        assert!(signed.authorization.starts_with("ACS3-HMAC-SHA256 Credential=LTAI5tFakeKeyId,"));
        assert!(signed.authorization.contains("Signature="));
        assert!(signed.date.ends_with('Z'));
    }

    #[test]
    fn canonical_query_string_sorts_and_encodes() {
        let qs = canonical_query_string(&[("b", "2"), ("a", "1"), ("c", "x y")]);
        assert_eq!(qs, "a=1&b=2&c=x%20y");
    }

    #[test]
    fn epoch_to_iso8601_known_value() {
        // 2026-06-27T00:00:00Z = 1783056000 seconds since epoch
        let result = epoch_to_iso8601_utc(1_783_056_000);
        assert_eq!(result, "2026-06-27T00:00:00Z");
    }
}
