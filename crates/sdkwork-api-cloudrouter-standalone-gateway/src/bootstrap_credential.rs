//! Bootstrap Access-Token provisioning for the standalone gateway.
//!
//! Every packaged deployment (Docker container, install package, desktop
//! bundle) resolves the portal bootstrap Access-Token here. Resolution is
//! delegated to the shared IAM mechanism so the issuance order on first boot
//! is fixed everywhere: the tenant signing key (the tenant secret) is
//! ensured/updated first, then a signed JWT is issued with the tenant
//! context and the tenant application's access permissions and persisted as
//! an IAM session — so the IAM resolver verifies the token through the
//! database path (signature + tenant binding + permission scope) instead of
//! the payload-only development fallback.

/// Resolves the portal bootstrap Access-Token for this deployment.
///
/// Priority:
/// 1. an explicitly configured `SDKWORK_ACCESS_TOKEN` wins unchanged;
/// 2. otherwise a signed tenant-bound token is issued (see module docs);
/// 3. when no IAM database is available the caller falls back to the
///    payload-only development token (dev workstations without PostgreSQL).
pub async fn resolve_bootstrap_access_token() -> Result<Option<String>, String> {
    sdkwork_iam_web_adapter::resolve_deployment_bootstrap_access_token(None, None).await
}
