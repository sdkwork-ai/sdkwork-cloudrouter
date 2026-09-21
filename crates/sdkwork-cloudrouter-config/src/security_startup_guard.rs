//! Fail-closed secret hygiene guard for server deployments.
//!
//! Published or trivially guessable secret material must never protect a
//! server deployment: an attacker who reads this repository (or its git
//! history) could otherwise decrypt persisted credential ciphertext or forge
//! session tokens offline. [`ensure_no_known_default_secret_material`] rejects
//! startup for every non-desktop deployment whose runtime secret material
//! still embeds a known default fragment, independent of how the value was
//! injected (environment variable, secret file, or runtime TOML).

/// How much trust the deployment posture grants local development defaults.
///
/// This is deliberately **not** [`crate::DeploymentMode`]. `DeploymentMode`
/// defaults to `Desktop` and every component that reads it through
/// `from_env_or_runtime_toml` inherits that default, so using
/// `DeploymentMode::is_production_like()` as the secret-hygiene input made the
/// guard silently fail open on a PostgreSQL server deployment that simply had
/// not exported a deployment-profile variable. A caller that has *already*
/// proven it is running the server runtime (PostgreSQL-only) must not be able
/// to re-derive a desktop posture from an unset environment variable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecretHygienePosture {
    /// Single-process desktop runtime on a client-local database. Local
    /// development defaults are explicitly permitted.
    LocalDevelopment,
    /// Any server, container, or cluster runtime. Published default material is
    /// rejected outright.
    ServerDeployment,
}

impl SecretHygienePosture {
    /// Posture for a caller that has already proven the server runtime is in
    /// use. The assertion is *not* re-derived from the environment, so an
    /// unset deployment-profile variable cannot downgrade it.
    pub const fn server_deployment() -> Self {
        Self::ServerDeployment
    }

    /// Posture for single-process desktop development on a client-local
    /// database.
    pub const fn local_development() -> Self {
        Self::LocalDevelopment
    }

    /// Derives the posture from a resolved deployment mode. Only
    /// `DeploymentMode::Desktop` is treated as local development; every other
    /// mode is a server deployment.
    pub const fn from_deployment_mode(mode: crate::DeploymentMode) -> Self {
        if matches!(mode, crate::DeploymentMode::Desktop) {
            Self::LocalDevelopment
        } else {
            Self::ServerDeployment
        }
    }

    /// Returns true when the posture tolerates published default material.
    pub const fn allows_default_secret_material(self) -> bool {
        matches!(self, Self::LocalDevelopment)
    }

    /// Returns true when published default material must be rejected.
    pub const fn rejects_default_secret_material(self) -> bool {
        matches!(self, Self::ServerDeployment)
    }
}

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
///
/// `posture` is a *decision* the caller has already made, not a raw
/// environment flag. Callers that have proven the server runtime is in use
/// must pass [`SecretHygienePosture::server_deployment`]; see the type docs for
/// why a bare `bool` derived from `DeploymentMode` allowed a fail-open.
pub fn ensure_no_known_default_secret_material<'a>(
    secrets: impl IntoIterator<Item = (&'a str, Option<&'a str>)>,
    posture: SecretHygienePosture,
) -> Result<(), String> {
    if posture.allows_default_secret_material() {
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

/// Guard variant for callers that resolved a [`crate::DeploymentMode`] and have
/// **not** independently proven the server runtime is in use. Prefer
/// [`SecretHygienePosture::server_deployment`] when a PostgreSQL-only
/// precondition has already been enforced, because `DeploymentMode` defaults to
/// `Desktop` when no profile variable is exported.
pub fn ensure_no_known_default_secret_material_for_mode<'a>(
    secrets: impl IntoIterator<Item = (&'a str, Option<&'a str>)>,
    mode: crate::DeploymentMode,
) -> Result<(), String> {
    ensure_no_known_default_secret_material(
        secrets,
        SecretHygienePosture::from_deployment_mode(mode),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::DeploymentMode;

    fn guard(
        secrets: &[(&str, Option<&str>)],
        posture: SecretHygienePosture,
    ) -> Result<(), String> {
        ensure_no_known_default_secret_material(
            secrets
                .iter()
                .map(|(label, value)| (*label, *value)),
            posture,
        )
    }

    #[test]
    fn rejects_key_ring_embedding_published_key_material() {
        let payload = format!(
            r#"{{"activeKeyId":"prod-ring","activeKey":"{}","fingerprintKey":"other","decryptionKeys":[]}}"#,
            KNOWN_DEFAULT_SECRET_FRAGMENTS[1]
        );
        assert!(guard(
            &[("key_ring", Some(payload.as_str()))],
            SecretHygienePosture::server_deployment()
        )
        .is_err());
    }

    #[test]
    fn rejects_placeholder_pepper_on_server_deployments() {
        assert!(guard(
            &[("api_key_pepper", Some("cloudrouter-local-dev-pepper-change-me"))],
            SecretHygienePosture::server_deployment()
        )
        .is_err());
    }

    #[test]
    fn allows_desktop_deployments_and_unique_values() {
        assert!(guard(
            &[("api_key_pepper", Some("cloudrouter-local-dev-pepper-change-me"))],
            SecretHygienePosture::local_development()
        )
        .is_ok());
        assert!(guard(
            &[("api_key_pepper", Some("c2VjcmV0LXZhbHVlLWZyb20tdmF1bHQ"))],
            SecretHygienePosture::server_deployment()
        )
        .is_ok());
        assert!(guard(&[("api_key_pepper", None)], SecretHygienePosture::server_deployment()).is_ok());
    }

    #[test]
    fn violation_message_never_echoes_secret_material() {
        let error = guard(
            &[(
                "app_session_secret",
                Some("prefix-cloudrouter-local-dev-app-session-change-me-suffix"),
            )],
            SecretHygienePosture::server_deployment(),
        )
        .unwrap_err();
        assert!(!error.contains("prefix-"));
        assert!(error.contains("app_session_secret"));
    }

    /// Regression for the fail-open defect: a PostgreSQL server deployment that
    /// never exported a deployment-profile variable resolves
    /// `DeploymentMode::Desktop` through `#[derive(Default)]`. The posture a
    /// server-runtime caller passes must still reject published material.
    #[test]
    fn server_posture_rejects_default_material_even_when_mode_defaults_to_desktop() {
        let unset_profile_mode = DeploymentMode::default();
        assert_eq!(unset_profile_mode, DeploymentMode::Desktop);
        assert!(
            !unset_profile_mode.is_production_like(),
            "DeploymentMode::default() must remain non-production-like for compatibility"
        );

        let published = [(
            "SDKWORK_CLOUDROUTER_API_KEY_PEPPER",
            Some("cloudrouter-local-dev-pepper-change-me"),
        )];

        // The mode-derived path still tolerates the value (documented legacy behavior)...
        assert!(
            ensure_no_known_default_secret_material_for_mode(published.iter().copied(), unset_profile_mode)
                .is_ok()
        );

        // ...but the server-runtime path, which has already proven PostgreSQL-only,
        // is immune to the missing variable.
        assert!(guard(&published, SecretHygienePosture::server_deployment()).is_err());
    }

    #[test]
    fn posture_classification_is_exhaustive_over_deployment_modes() {
        assert!(SecretHygienePosture::from_deployment_mode(DeploymentMode::Desktop).allows_default_secret_material());
        for mode in [
            DeploymentMode::Server,
            DeploymentMode::Docker,
            DeploymentMode::Kubernetes,
        ] {
            assert!(
                SecretHygienePosture::from_deployment_mode(mode).rejects_default_secret_material(),
                "{mode:?} must reject published default material"
            );
        }
    }
}
