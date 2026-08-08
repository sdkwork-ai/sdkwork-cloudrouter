//! Commercial license verification for sdkwork-cloudrouter.
//!
//! Editions follow docs/commercial/PRICING.md: community (AGPL, free) is the
//! default when no license is configured; pro / enterprise / oem require a
//! signed license key issued by SDKWork (see tools/generate-license-key.mjs).
//!
//! A license key is a compact Ed25519-signed payload:
//! `v1.<base64url(json)>.base64url(signature)` with
//! `{"tier":"pro","customer":"acme","issued_at":"2026-08-07","expires_at":"2027-08-07"}`.
//! Verification uses the SDKWork public key embedded below; the signing
//! private key stays with the SDKWork commercial team and is never shipped.

use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

/// SDKWork license signing public key — the raw 32-byte Ed25519 public key,
/// base64url encoded. The private key is held by the SDKWork commercial team
/// and never distributed.
pub const SDKWORK_LICENSE_ED25519_PUBLIC_KEY: &str =
    "W0dHSvM-bc8-yxowrh5enOr-GVvH7uihrAQcqrhWzAA";

/// License key environment variable.
pub const LICENSE_KEY_ENV: &str = "SDKWORK_CLOUDROUTER_LICENSE_KEY";
/// License key file (mounted or on the data volume).
pub const LICENSE_FILE_ENV: &str = "SDKWORK_CLOUDROUTER_LICENSE_FILE";
pub const DEFAULT_LICENSE_FILE: &str = "/etc/sdkwork/router/license.key";

const LICENSE_PREFIX: &str = "v1.";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Edition {
    Community,
    Pro,
    Enterprise,
    Oem,
}

impl Edition {
    pub fn as_str(self) -> &'static str {
        match self {
            Edition::Community => "community",
            Edition::Pro => "pro",
            Edition::Enterprise => "enterprise",
            Edition::Oem => "oem",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub tier: String,
    pub customer: String,
    pub issued_at: String,
    #[serde(default)]
    pub expires_at: Option<String>,
}

impl LicenseInfo {
    pub fn edition(&self) -> Edition {
        match self.tier.to_ascii_lowercase().as_str() {
            "pro" => Edition::Pro,
            "enterprise" => Edition::Enterprise,
            "oem" => Edition::Oem,
            _ => Edition::Community,
        }
    }

    /// True when the license has an expiry and it is in the past.
    pub fn is_expired(&self) -> bool {
        let Some(expires_at) = &self.expires_at else {
            return false;
        };
        chrono::DateTime::parse_from_rfc3339(expires_at)
            .map(|expires| expires < chrono::Utc::now())
            .unwrap_or(false)
    }
}

/// Resolved license posture for this deployment.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum LicenseStatus {
    /// Valid signed license.
    Licensed {
        #[serde(flatten)]
        info: LicenseInfo,
    },
    /// No license configured — community edition.
    Unlicensed,
    /// A license key is configured but invalid or expired — community
    /// edition with a warning.
    Invalid { reason: String },
}

impl LicenseStatus {
    pub fn edition(&self) -> Edition {
        match self {
            LicenseStatus::Licensed { info } => info.edition(),
            LicenseStatus::Unlicensed | LicenseStatus::Invalid { .. } => Edition::Community,
        }
    }
}

fn decode_base64url(value: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|error| format!("license key encoding is invalid: {error}"))
}

/// Verifies a license key and returns its payload. Fails on structure,
/// signature, or JSON errors; expiry is reported through [`LicenseInfo`].
pub fn verify_license_key(license_key: &str) -> Result<LicenseInfo, String> {
    let key = license_key.trim();
    let payload_b64 = key
        .strip_prefix(LICENSE_PREFIX)
        .ok_or_else(|| "license key must start with v1.".to_owned())?;
    let mut parts = payload_b64.splitn(3, '.');
    let (payload_b64, signature_b64) = match (parts.next(), parts.next(), parts.next()) {
        (Some(payload), Some(signature), None) => (payload, signature),
        _ => return Err("license key must be v1.<payload>.<signature>".to_owned()),
    };

    let public_key_bytes = decode_base64url(SDKWORK_LICENSE_ED25519_PUBLIC_KEY)?;
    let public_key = VerifyingKey::from_bytes(
        &public_key_bytes
            .try_into()
            .map_err(|_| "embedded license public key is malformed".to_owned())?,
    )
    .map_err(|error| format!("embedded license public key is invalid: {error}"))?;

    let payload = decode_base64url(payload_b64)?;
    let signature = decode_base64url(signature_b64)?;
    let signature = Signature::from_slice(&signature)
        .map_err(|error| format!("license signature is malformed: {error}"))?;
    public_key
        .verify(&payload, &signature)
        .map_err(|_| "license signature verification failed".to_owned())?;

    let info: LicenseInfo = serde_json::from_slice(&payload)
        .map_err(|error| format!("license payload is invalid: {error}"))?;
    Ok(info)
}

/// Resolves the deployment license from the environment (`SDKWORK_CLOUDROUTER_LICENSE_KEY`)
/// or the license file (`SDKWORK_CLOUDROUTER_LICENSE_FILE`, default
/// `/etc/sdkwork/router/license.key`).
pub fn resolve_license() -> LicenseStatus {
    let configured = std::env::var(LICENSE_KEY_ENV)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            let path = std::env::var(LICENSE_FILE_ENV)
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_LICENSE_FILE.to_owned());
            std::fs::read_to_string(path)
                .ok()
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        });

    let Some(license_key) = configured else {
        return LicenseStatus::Unlicensed;
    };

    match verify_license_key(&license_key) {
        Ok(info) if info.is_expired() => LicenseStatus::Invalid {
            reason: format!(
                "license expired at {}",
                info.expires_at.unwrap_or_default()
            ),
        },
        Ok(info) => LicenseStatus::Licensed { info },
        Err(reason) => LicenseStatus::Invalid { reason },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sign_test_license(tier: &str, customer: &str, expires_at: Option<&str>) -> String {
        let mut payload = serde_json::json!({
            "tier": tier,
            "customer": customer,
            "issued_at": "2026-08-07T00:00:00Z",
        });
        if let Some(expires) = expires_at {
            payload["expires_at"] = serde_json::json!(expires);
        }
        let payload_bytes = payload.to_string().into_bytes();
        let private_key = ed25519_dalek::SigningKey::from_bytes(&[7u8; 32]);
        use ed25519_dalek::Signer;
        let signature = private_key.sign(&payload_bytes);
        use base64::Engine;
        let encode = base64::engine::general_purpose::URL_SAFE_NO_PAD;
        format!(
            "v1.{}.{}",
            encode.encode(&payload_bytes),
            encode.encode(signature.to_bytes())
        )
    }

    #[test]
    fn invalid_key_is_rejected() {
        assert!(verify_license_key("v1.bogus.sig").is_err());
        assert!(verify_license_key("not-a-key").is_err());
    }

    #[test]
    fn edition_mapping_covers_all_tiers() {
        assert_eq!(LicenseInfo { tier: "pro".into(), customer: "x".into(), issued_at: "".into(), expires_at: None }.edition(), Edition::Pro);
        assert_eq!(LicenseInfo { tier: "enterprise".into(), customer: "x".into(), issued_at: "".into(), expires_at: None }.edition(), Edition::Enterprise);
        assert_eq!(LicenseInfo { tier: "oem".into(), customer: "x".into(), issued_at: "".into(), expires_at: None }.edition(), Edition::Oem);
        assert_eq!(LicenseInfo { tier: "community".into(), customer: "x".into(), issued_at: "".into(), expires_at: None }.edition(), Edition::Community);
    }
}
