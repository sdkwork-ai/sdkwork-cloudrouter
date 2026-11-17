//! Deploy application identity anchor for this installation.
//!
//! IAM makes the *deploy application* the identity of every access token
//! (`feat(iam)!: make the deploy application the identity of every access
//! token`, IAM `b918c3ce`): token issuance, session claims, API-key lookup,
//! OAuth integration exchange, service-account credentials, runtime auth
//! metadata, and the host audience allow-list all resolve the installation
//! through `iam_tenant_application.deploy_application_id`. The former IAM
//! runtime app id (`sdkwork-cloudrouter` / `app_<tenant>`) is no longer an
//! identity anywhere and a credential that still carries it fails closed.
//!
//! Therefore the anchor is process configuration, exactly like IAM's own
//! bootstrap read of [`DEPLOY_APPLICATION_ID_ENV`]:
//!
//! - it is read from the environment, never compiled in;
//! - a deployment that does not configure it fails to start with an error that
//!   names the variable;
//! - there is no fallback to the retired IAM runtime app id, because a silent
//!   fallback would boot a gateway whose allow-list can never accept a
//!   deployment credential.

/// Environment variable that carries the installation's deploy application id.
///
/// Same key IAM reads in
/// `sdkwork-iam-web-adapter::application_registry::DEPLOY_APPLICATION_ID_ENV`,
/// so one deployment-level variable feeds both sides.
pub const DEPLOY_APPLICATION_ID_ENV: &str = "SDKWORK_DEPLOY_APPLICATION_ID";

/// The deployment did not configure a deploy application anchor.
///
/// Carries the environment key so callers (startup logs, CLI errors, test
/// assertions) can point the operator at the exact variable to set.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeployApplicationIdNotConfigured {
    /// Environment variable that must carry the anchor.
    pub env_key: &'static str,
}

impl std::fmt::Display for DeployApplicationIdNotConfigured {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "deploy application is not configured: set {} to the deploy application id of this \
             installation; an installation is one-to-one with a deploy application and must not \
             run on the retired IAM runtime app id",
            self.env_key
        )
    }
}

impl std::error::Error for DeployApplicationIdNotConfigured {}

/// Trimmed, non-empty anchor from one configured value.
///
/// `None`, `""`, and whitespace-only values are all "not configured": IAM fails
/// that way too, so both sides reject a blank anchor instead of shipping a
/// gateway that can never accept a credential.
/// @param value - already-read environment value, if any.
/// @param env_key - variable the value came from, named in the error.
/// @returns the trimmed anchor, or a named configuration error.
pub fn deploy_application_id_from_configured_value(
    value: Option<&str>,
    env_key: &'static str,
) -> Result<String, DeployApplicationIdNotConfigured> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .ok_or(DeployApplicationIdNotConfigured { env_key })
}

/// Resolve this installation's deploy application identity anchor.
///
/// Startup/build call sites use this (or the browser projection built on it) so
/// a missing anchor stops the process with an error naming
/// [`DEPLOY_APPLICATION_ID_ENV`] instead of falling back to the retired IAM
/// runtime app id.
/// @returns the trimmed deploy application id, or a named configuration error.
pub fn resolve_deploy_application_id() -> Result<String, DeployApplicationIdNotConfigured> {
    let configured = std::env::var(DEPLOY_APPLICATION_ID_ENV).ok();
    deploy_application_id_from_configured_value(configured.as_deref(), DEPLOY_APPLICATION_ID_ENV)
}

/// Host audience allow-list for the application surfaces of this installation.
///
/// The IAM adapter validates `principal.app_id()` against these audiences
/// (`IamDatabaseWebRequestContextResolver::validate_production_principal`), and
/// a deployment credential's `app_id`/`aud` are both the deploy application, so
/// the anchor is the only entry this host may allow. The retired IAM runtime app
/// id is deliberately absent: allowing it would mean the host still accepts a
/// credential that IAM can no longer issue.
/// @param deploy_application_id - anchor from [`resolve_deploy_application_id`].
/// @returns the allow-list (one entry) in the shape the IAM adapter takes.
#[must_use]
pub fn application_audience_allow_list(deploy_application_id: &str) -> Vec<String> {
    vec![deploy_application_id.trim().to_owned()]
}

#[cfg(test)]
mod tests {
    use super::{
        application_audience_allow_list, deploy_application_id_from_configured_value,
        DEPLOY_APPLICATION_ID_ENV,
    };

    #[test]
    fn configured_anchor_is_accepted_and_trimmed() {
        let anchor = deploy_application_id_from_configured_value(
            Some("  app-cy3d99 \n"),
            DEPLOY_APPLICATION_ID_ENV,
        )
        .expect("a configured anchor must be accepted");

        assert_eq!("app-cy3d99", anchor);
    }

    #[test]
    fn missing_or_blank_anchor_names_the_configuration_variable() {
        for missing in [None, Some(""), Some("   ")] {
            let error =
                deploy_application_id_from_configured_value(missing, DEPLOY_APPLICATION_ID_ENV)
                    .expect_err("an unconfigured anchor must fail closed");

            let message = error.to_string();
            assert!(
                message.contains(DEPLOY_APPLICATION_ID_ENV),
                "error must name the variable, got: {message}"
            );
            assert!(
                message.contains("deploy application"),
                "error must name what is missing, got: {message}"
            );
            assert_eq!(DEPLOY_APPLICATION_ID_ENV, error.env_key);
        }
    }

    #[test]
    fn audience_allow_list_carries_the_anchor_only() {
        let allow_list = application_audience_allow_list("app-cy3d99");

        assert_eq!(vec!["app-cy3d99".to_owned()], allow_list);
        assert!(
            allow_list.iter().any(|audience| audience == "app-cy3d99"),
            "the anchor must be an accepted audience"
        );
        assert!(
            !allow_list
                .iter()
                .any(|audience| audience == "sdkwork-cloudrouter"),
            "the retired IAM runtime app id must never be an accepted audience"
        );
    }
}
