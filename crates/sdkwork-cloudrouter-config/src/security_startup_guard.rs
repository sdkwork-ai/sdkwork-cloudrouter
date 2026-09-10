//! Fail-closed secret hygiene guard for server deployments.
//!
//! Published or trivially guessable secret material must never protect a
//! server deployment: an attacker who reads this repository (or its git
//! history) could otherwise decrypt persisted credential ciphertext or forge
//! session tokens offline. [`ensure_no_known_default_secret_material`] rejects
//! startup for every non-desktop deployment whose runtime secret material
//! still embeds a known default fragment, independent of how the value was
//! injected (environment variable, secret file, or runtime TOML).

/// Secret material that was once shipped in this repository (or its generated
/// environment templates) and must therefore be treated as public knowledge.
/// Matching is substring-based so a key-ring payload embedding one of these
/// fragments is rejected regardless of its `activeKeyId` or rotation metadata.
pub const KNOWN_DEFAULT_SECRET_FRAGMENTS: &[&str] = &[
    // Upstream credential key ring material published in historical
    // compose/env-template defaults (removed; rotation required).
    "local-dev-key-ring-001",
    "dyfeQDB++uTwSSRGuRju9yHE8iX3wTH+ySmqpjimX6w=",
    "kg/5KOatnHH9XgtbCS16VkjUEQoohdS5miD2U5GhtBc=",
    // Historical local-development placeholder secrets.
    "cloudrouter-local-dev-pepper-change-me",
    "cloudrouter-local-dev-signing-secret-change-me",
    "cloudrouter-local-dev-trusted-subject-change-me",
    "cloudrouter-local-dev-app-session-change-me",
];

/// Rejects startup when any provided secret still embeds known default
/// material. `secrets` pairs a configuration label with the resolved secret
/// value (`None` when the value is legitimately absent); absent values are
/// skipped because the callers already enforce their own presence rules.
///
/// The guard is intentionally value-based rather than source-based: it fires
/// no matter which channel carried the default value.
pub fn ensure_no_known_default_secret_material<'a>(
    secrets: impl IntoIterator<Item = (&'a str, Option<&'a str>)>,
    deployment_allows_default_material: bool,
) -> Result<(), String> {
    if deployment_allows_default_material {
        return Ok(());
    }
    let mut violations: Vec<String> = Vec::new();
    for (label, secret) in secrets {
        let Some(secret) = secret else {
            continue;
        };
        if KNOWN_DEFAULT_SECRET_FRAGMENTS
            .iter()
            .any(|fragment| secret.contains(*fragment))
        {
            violations.push(format!(
                "{label} still uses published default secret material; generate a unique per-deployment value (for the compose stack run `node scripts/generate-dev-secrets.mjs`)"
            ));
        }
    }
    if violations.is_empty() {
        return Ok(());
    }
    Err(violations.join("; "))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn guard(
        secrets: &[(&str, Option<&str>)],
        allows_default_material: bool,
    ) -> Result<(), String> {
        ensure_no_known_default_secret_material(
            secrets
                .iter()
                .map(|(label, value)| (*label, *value)),
            allows_default_material,
        )
    }

    #[test]
    fn rejects_key_ring_embedding_published_key_material() {
        let payload = format!(
            r#"{{"activeKeyId":"prod-ring","activeKey":"{}","fingerprintKey":"other","decryptionKeys":[]}}"#,
            KNOWN_DEFAULT_SECRET_FRAGMENTS[1]
        );
        assert!(guard(&[("key_ring", Some(payload.as_str()))], false).is_err());
    }

    #[test]
    fn rejects_placeholder_pepper_on_server_deployments() {
        assert!(guard(
            &[("api_key_pepper", Some("cloudrouter-local-dev-pepper-change-me"))],
            false
        )
        .is_err());
    }

    #[test]
    fn allows_desktop_deployments_and_unique_values() {
        assert!(guard(
            &[("api_key_pepper", Some("cloudrouter-local-dev-pepper-change-me"))],
            true
        )
        .is_ok());
        assert!(guard(
            &[("api_key_pepper", Some("c2VjcmV0LXZhbHVlLWZyb20tdmF1bHQ"))],
            false
        )
        .is_ok());
        assert!(guard(&[("api_key_pepper", None)], false).is_ok());
    }

    #[test]
    fn violation_message_never_echoes_secret_material() {
        let error = guard(
            &[(
                "app_session_secret",
                Some("prefix-cloudrouter-local-dev-app-session-change-me-suffix"),
            )],
            false,
        )
        .unwrap_err();
        assert!(!error.contains("prefix-"));
        assert!(error.contains("app_session_secret"));
    }
}
