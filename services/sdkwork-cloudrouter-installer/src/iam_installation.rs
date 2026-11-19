//! IAM-side half of the bootstrap-credential **dual ensure**.
//!
//! The credential is signed from `iam_tenant_application.access_permissions` and
//! names the installation through `iam_tenant_application.deploy_application_id`.
//! Issuance therefore needs an installation that is **both** linked to the deploy
//! application and `enabled`; today
//! [`sdkwork_iam_web_adapter::issue_standalone_bootstrap_access_credential`]
//! resolves that row and refuses when it is missing or disabled, but nothing on
//! the Cloud Router side ever created it for the configured anchor, so a fresh
//! deployment could only fail.
//!
//! This module closes that half with IAM's own service functions on the shared
//! PostgreSQL pool — the same functions the IAM startup bootstrap and the Deploy
//! provisioning port call, so the provisioning rules cannot drift:
//!
//! - [`resolve_tenant_application_by_deploy_application_id`] — read the existing
//!   installation for the anchor.
//! - [`enable_tenant_application`] — the IAM enable path, used when the
//!   installation exists but is not `enabled`.
//! - [`ensure_tenant_application_runtime`] — IAM provisioning (create or
//!   reconcile) driven by the application manifest, with the configured anchor
//!   overriding the manifest's deploy link so both sides name the same
//!   application.
//!
//! # Why the anchor overrides the manifest
//!
//! `agent.app.config.json` declares the runtime application id and the API scope,
//! but the deploy application id is *deployment configuration*: IAM's own
//! `ensure_platform_tenant_application_with_deploy_application` exists for exactly
//! this reason. Without the override the manifest falls back to the runtime app id
//! (`backend.appId`) as the deploy link, which is the retired IAM runtime identity
//! the credential must not carry.
//!
//! # Idempotency
//!
//! There is no new idempotency key to invent: the installation is identified by
//! `iam_tenant_application.deploy_application_id` (partial unique index
//! `uk_iam_tenant_application_deploy`), and IAM's own bootstrap resolves the row by
//! runtime `app_id`, then `instance_key`, then its canonical id. Re-running the
//! installer therefore reads the row it created the first time, and a concurrent
//! second runner loses on the unique index instead of minting a second
//! installation.

use std::path::{Path, PathBuf};

use sdkwork_iam_web_adapter::{
    enable_tenant_application, ensure_tenant_application_runtime, load_manifest_from_app_root,
    manifest_to_ensure_command, relink_tenant_application_deploy_application_id,
    resolve_bootstrap_environment, resolve_tenant_application_by_deploy_application_id,
    tenant_application_instance_key, EmbeddedApplicationBootstrapOptions, TenantApplication,
};
use sqlx::PgPool;

/// Application root that carries `agent.app.config.json`.
pub const APP_ROOT_ENV: &str = "SDKWORK_APP_ROOT";
/// The anchor variable this module refuses to invent a value for.
pub const DEPLOY_APPLICATION_ID_ENV: &str = sdkwork_cloudrouter_config::DEPLOY_APPLICATION_ID_ENV;

/// One installation that is ready to sign a bootstrap credential.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnsuredInstallation {
    /// Deploy application the installation was verified against.
    pub anchor_id: String,
    /// `iam_tenant_application.id`.
    pub tenant_application_id: String,
    /// IAM runtime application id (the OAuth client id of the installation).
    pub runtime_app_id: String,
    /// `enabled` after the ensure.
    pub status: String,
    /// `true` when this call provisioned the installation.
    pub created: bool,
}

/// One legacy IAM installation whose anchor is still the deploy uuid.
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyIdentityLink {
    pub tenant_id: String,
    pub iam_application_id: String,
    pub instance_key: String,
    pub legacy_anchor: String,
    pub deploy_uuid: String,
    pub canonical_anchor: String,
    pub canonical_iam_application_id: Option<String>,
}

/// One anchor that no deploy application resolves.
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrphanIdentityLink {
    pub tenant_id: String,
    pub iam_application_id: String,
    pub instance_key: String,
    pub anchor: String,
}

/// Read-only IAM ↔ Deploy identity reconciliation report.
#[derive(Clone, Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityLinkAudit {
    pub legacy_links: Vec<LegacyIdentityLink>,
    pub duplicate_links: Vec<LegacyIdentityLink>,
    pub orphan_links: Vec<OrphanIdentityLink>,
}

/// Audits legacy uuid-anchored IAM installations against the deploy app table.
///
/// Read-only by contract: the installer prints the pairs and an operator
/// decides whether to relink. It never deletes an installation, because the
/// duplicate rows carry OAuth clients and audit history.
pub async fn audit_identity_links(pg: &PgPool) -> anyhow::Result<IdentityLinkAudit> {
    let rows = sqlx::query(
        "SELECT t.tenant_id, t.app_id AS iam_application_id, t.instance_key,
                t.deploy_application_id AS legacy_anchor,
                d.uuid AS deploy_uuid, d.id::text AS canonical_anchor,
                c.app_id AS canonical_iam_application_id
         FROM iam_tenant_application t
         JOIN deploy_app d
           ON d.uuid = t.deploy_application_id
          AND d.tenant_id::text = t.tenant_id
          AND d.deleted_at IS NULL
         LEFT JOIN iam_tenant_application c
           ON c.tenant_id = t.tenant_id
          AND c.deploy_application_id = d.id::text
         WHERE t.deploy_application_id IS NOT NULL
           AND TRIM(t.deploy_application_id) <> ''
           AND t.deploy_application_id !~ '^[0-9]+$'
         ORDER BY t.tenant_id, d.uuid",
    )
    .fetch_all(pg)
    .await?;

    let mut report = IdentityLinkAudit::default();
    for row in rows {
        use sqlx::Row;
        let link = LegacyIdentityLink {
            tenant_id: row.get("tenant_id"),
            iam_application_id: row.get("iam_application_id"),
            instance_key: row.get("instance_key"),
            legacy_anchor: row.get("legacy_anchor"),
            deploy_uuid: row.get("deploy_uuid"),
            canonical_anchor: row.get("canonical_anchor"),
            canonical_iam_application_id: row.get("canonical_iam_application_id"),
        };
        if link.canonical_iam_application_id.is_some() {
            report.duplicate_links.push(link);
        } else {
            report.legacy_links.push(link);
        }
    }

    let orphan_rows = sqlx::query(
        "SELECT t.tenant_id, t.app_id AS iam_application_id, t.instance_key,
                t.deploy_application_id AS anchor
         FROM iam_tenant_application t
         LEFT JOIN deploy_app d
           ON d.uuid = t.deploy_application_id
          AND d.tenant_id::text = t.tenant_id
          AND d.deleted_at IS NULL
         WHERE t.deploy_application_id IS NOT NULL
           AND TRIM(t.deploy_application_id) <> ''
           AND t.deploy_application_id !~ '^[0-9]+$'
           AND d.id IS NULL
         ORDER BY t.tenant_id, t.app_id",
    )
    .fetch_all(pg)
    .await?;
    for row in orphan_rows {
        use sqlx::Row;
        report.orphan_links.push(OrphanIdentityLink {
            tenant_id: row.get("tenant_id"),
            iam_application_id: row.get("iam_application_id"),
            instance_key: row.get("instance_key"),
            anchor: row.get("anchor"),
        });
    }

    let decimal_orphans = sqlx::query(
        "SELECT t.tenant_id, t.app_id AS iam_application_id, t.instance_key,
                t.deploy_application_id AS anchor
         FROM iam_tenant_application t
         WHERE t.deploy_application_id IS NOT NULL
           AND TRIM(t.deploy_application_id) <> ''
           AND t.deploy_application_id ~ '^[0-9]+$'
           AND NOT EXISTS (
             SELECT 1 FROM deploy_app d
             WHERE d.id::text = t.deploy_application_id
               AND d.tenant_id::text = t.tenant_id
               AND d.deleted_at IS NULL
           )
         ORDER BY t.tenant_id, t.app_id",
    )
    .fetch_all(pg)
    .await?;
    for row in decimal_orphans {
        use sqlx::Row;
        report.orphan_links.push(OrphanIdentityLink {
            tenant_id: row.get("tenant_id"),
            iam_application_id: row.get("iam_application_id"),
            instance_key: row.get("instance_key"),
            anchor: row.get("anchor"),
        });
    }
    Ok(report)
}

/// Result of a legacy-anchor reconciliation pass.
#[derive(Clone, Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityReconcileReport {
    pub applied: bool,
    pub candidates: Vec<LegacyIdentityLink>,
    pub relinked: Vec<String>,
}

/// Relinks legacy uuid-anchored installations to their canonical decimal anchor.
///
/// Only the unambiguous `legacyLinks` are eligible: a duplicate (uuid + decimal
/// both present) is never guessed at. Dry-run by default; `apply` calls the same
/// guarded IAM relink used by `ensure_iam_installation`.
pub async fn reconcile_legacy_identity_links(
    pg: &PgPool,
    apply: bool,
) -> anyhow::Result<IdentityReconcileReport> {
    let audit = audit_identity_links(pg).await?;
    let mut report = IdentityReconcileReport {
        applied: apply,
        candidates: audit.legacy_links,
        relinked: Vec::new(),
    };
    if !apply {
        return Ok(report);
    }
    for link in &report.candidates {
        match relink_tenant_application_deploy_application_id(
            pg,
            link.tenant_id.as_str(),
            link.legacy_anchor.as_str(),
            link.canonical_anchor.as_str(),
        )
        .await
        {
            Ok(Some(_)) => report
                .relinked
                .push(format!("{}:{}", link.tenant_id, link.deploy_uuid)),
            Ok(None) => {}
            Err(error) => {
                return Err(anyhow::Error::msg(format!(
                    "relink {}:{} failed: {error}",
                    link.tenant_id, link.deploy_uuid
                )))
            }
        }
    }
    Ok(report)
}

///
/// `deploy_application_id` is the canonical decimal anchor deploy's
/// `apps.create` provisioning writes; `deploy_application_uuid` is the public
/// deploy id, checked only as a legacy fallback so an older uuid-anchored
/// Ensures the IAM installation of a deploy application exists and is enabled.
///
/// installation is reused instead of duplicated. The returned installation is
/// guaranteed to be `enabled` and linked to the resolved anchor; anything else
/// is an error that names what is wrong, never a value the caller could mistake
/// for a working installation.
pub async fn ensure_iam_installation(
    pg: &PgPool,
    tenant_id: &str,
    deploy_application_id: &str,
    deploy_application_uuid: &str,
    app_root: &Path,
) -> Result<EnsuredInstallation, String> {
    validate_identity_before_provisioning(tenant_id, deploy_application_id)?;
    let tenant_id = tenant_id.trim();
    // The decimal `deploy_app.id` is the canonical IAM anchor: deploy's
    // `apps.create` identity provisioning writes it, so reusing it is what keeps
    // one installation per deploy application. Older installer runs used the
    // public uuid, so fall back to that row instead of minting a second one.
    let canonical_anchor = deploy_application_id.trim();
    if let Some(existing) =
        resolve_tenant_application_by_deploy_application_id(pg, tenant_id, canonical_anchor).await?
    {
        let application = if existing.status == "enabled" {
            existing
        } else {
            // The IAM enable path owns the transition; re-resolving afterwards is
            // what proves the row actually reached `enabled` instead of trusting
            // the write.
            enable_tenant_application(pg, tenant_id, existing.id.as_str()).await?
        };
        return finish_installation(application, canonical_anchor, false);
    }

    let legacy_anchor = deploy_application_uuid.trim();
    if !legacy_anchor.is_empty() {
        if let Some(existing) =
            resolve_tenant_application_by_deploy_application_id(pg, tenant_id, legacy_anchor)
                .await?
        {
            // Heal the legacy uuid anchor onto the canonical decimal one when the
            // installation's instance key proves it belongs to this deploy app.
            // A failed relink is not fatal: the legacy row is still a valid
            // one-installation identity and is reused as-is.
            if let Ok(Some(relinked)) = relink_tenant_application_deploy_application_id(
                pg,
                tenant_id,
                legacy_anchor,
                canonical_anchor,
            )
            .await
            {
                return finish_installation(relinked, canonical_anchor, false);
            }
            let application = if existing.status == "enabled" {
                existing
            } else {
                enable_tenant_application(pg, tenant_id, existing.id.as_str()).await?
            };
            return finish_installation(application, legacy_anchor, false);
        }
    }
    let anchor = canonical_anchor;
    let instance_anchor = if legacy_anchor.is_empty() {
        canonical_anchor
    } else {
        legacy_anchor
    };

    let manifest = load_manifest_from_app_root(app_root).map_err(|error| {
        format!(
            "the IAM installation of deploy application {anchor} does not exist and cannot be \
             provisioned: {error}. Set {APP_ROOT_ENV} (or SDKWORK_CLOUDROUTER_APP_ROOT) to the \
             directory that contains agent.app.config.json; no bootstrap access credential was \
             issued"
        )
    })?;
    let environment = resolve_bootstrap_environment();
    let options = EmbeddedApplicationBootstrapOptions {
        environment: environment.clone(),
        ..EmbeddedApplicationBootstrapOptions::default()
    };
    let mut command = manifest_to_ensure_command(&manifest, &options, None).map_err(|error| {
        format!(
            "the application manifest cannot describe the IAM installation of deploy application \
             {anchor}: {error}"
        )
    })?;
    // The anchor is deployment configuration, never a manifest default: without
    // this override IAM would link the installation to the retired IAM runtime app
    // id and the credential would name an identity the gateway allow-list rejects.
    command.deploy_application_id = Some(anchor.to_owned());
    command.tenant_id = tenant_id.to_owned();
    command.environment = environment.clone();
    // Anchor-scoped instance key: a manifest instance key derived from the runtime
    // app id could match an installation that belongs to a different deploy
    // application, and adopting that row would move another deployment's identity.
    command.instance_key = tenant_application_instance_key(instance_anchor, environment.as_str());

    let application = ensure_tenant_application_runtime(pg, &command)
        .await
        .map_err(|error| {
            format!(
                "IAM did not provision an installation for deploy application {anchor} in tenant \
                 {tenant_id}: {error}. An installation is one-to-one with a deploy application, so \
                 an anchor already claimed by another installation is refused; no bootstrap access \
                 credential was issued"
            )
        })?;
    finish_installation(application, anchor, true)
}

fn finish_installation(
    application: TenantApplication,
    anchor: &str,
    created: bool,
) -> Result<EnsuredInstallation, String> {
    if application.status != "enabled" {
        return Err(format!(
            "IAM installation {} of deploy application {anchor} is {} instead of enabled; no \
             bootstrap access credential was issued",
            application.id, application.status
        ));
    }
    match application.deploy_application_id.as_deref() {
        Some(linked) if linked.trim() == anchor => Ok(EnsuredInstallation {
            anchor_id: anchor.to_owned(),
            tenant_application_id: application.id,
            runtime_app_id: application.app_id,
            status: application.status,
            created,
        }),
        Some(linked) => Err(format!(
            "IAM installation {} resolved for deploy application {anchor} is linked to {linked} \
             instead; no bootstrap access credential was issued",
            application.id
        )),
        None => Err(format!(
            "IAM installation {} is not linked to a deploy application (expected {anchor}); no \
             bootstrap access credential was issued",
            application.id
        )),
    }
}

/// Refuses a blank tenant or anchor before any database write.
///
/// Kept separate from the async body so the fail-closed rule is testable without a
/// database.
fn validate_identity_before_provisioning(tenant_id: &str, anchor: &str) -> Result<(), String> {
    if anchor.trim().is_empty() {
        return Err(format!(
            "deploy application is not configured: set {DEPLOY_APPLICATION_ID_ENV} to the deploy \
             application id of this installation; no bootstrap access credential was issued"
        ));
    }
    if tenant_id.trim().is_empty() {
        return Err(
            "IAM tenant is not configured: the bootstrap access credential needs the tenant that \
             owns the installation; no bootstrap access credential was issued"
                .to_owned(),
        );
    }
    Ok(())
}

/// Resolves the application root that carries `agent.app.config.json`.
///
/// `SDKWORK_APP_ROOT` is the generic SDKWork contract value an image sets; the
/// compile-time manifest directory is the development fallback. A binary moved out
/// of its build tree still resolves through the environment variable, and the
/// caller's error names it when neither exists.
#[must_use]
pub fn resolve_installer_app_root() -> PathBuf {
    if let Some(root) = sdkwork_iam_web_adapter::resolve_application_app_root() {
        return root;
    }
    if let Ok(value) = std::env::var("SDKWORK_CLOUDROUTER_APP_ROOT") {
        if !value.trim().is_empty() {
            return PathBuf::from(value);
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_blank_anchor_names_the_variable_and_never_touches_the_database() {
        let error = validate_identity_before_provisioning("100001", "   ")
            .expect_err("a blank anchor must fail closed");
        assert!(
            error.contains(DEPLOY_APPLICATION_ID_ENV),
            "the error must name the variable, got: {error}"
        );
        assert!(
            error.contains("no bootstrap access credential was issued"),
            "the error must state the outcome, got: {error}"
        );
    }

    #[test]
    fn a_blank_tenant_is_refused_before_any_write() {
        let error = validate_identity_before_provisioning("  ", "app-anchor-1")
            .expect_err("a blank tenant must fail closed");
        assert!(error.contains("tenant"), "got: {error}");
    }

    #[test]
    fn a_configured_identity_passes_the_gate() {
        assert!(validate_identity_before_provisioning("100001", "app-anchor-1").is_ok());
    }
}
