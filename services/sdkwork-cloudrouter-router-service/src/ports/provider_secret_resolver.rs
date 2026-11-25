use crate::domain::{DomainError, DomainResult};

/// Prefix of a resolver reference derived from
/// `ai_upstream_account_credential.id` (`SQL` snapshot loader).
///
/// The reference names the credential the route must use. Keeping the prefix
/// and the ownership check in one place means every resolution path agrees on
/// what a managed reference means.
pub const MANAGED_CREDENTIAL_SECRET_REF_PREFIX: &str = "managed://upstream-account-credential/";

pub trait ProviderSecretResolver: Send + Sync {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String>;
}

/// Returns the credential id named by a managed secret reference.
pub fn managed_credential_id(secret_ref: &str) -> Option<i64> {
    secret_ref
        .trim()
        .strip_prefix(MANAGED_CREDENTIAL_SECRET_REF_PREFIX)?
        .parse()
        .ok()
}

/// Rejects a managed secret reference that does not name the credential the
/// route selected.
///
/// Managed references are derived from the database, but a route is assembled
/// from several snapshots (catalog, sticky binding, failover candidate), so a
/// stale or mis-bound reference could otherwise resolve *another* account's
/// credential through the shared, tenant-agnostic resolver map. External
/// references (`vault://…`, environment-injected) are not governed by this
/// invariant and stay untouched.
pub fn ensure_managed_secret_belongs_to_account(
    secret_ref: &str,
    account_credential_id: Option<i64>,
) -> DomainResult<()> {
    let Some(referenced) = managed_credential_id(secret_ref) else {
        return Ok(());
    };
    if account_credential_id == Some(referenced) {
        return Ok(());
    }
    Err(DomainError::new(format!(
        "provider secret reference does not belong to the selected account credential (referenced credential {referenced}, account credential {})",
        account_credential_id
            .map(|id| id.to_string())
            .unwrap_or_else(|| "none".to_owned())
    )))
}

#[cfg(test)]
mod tests {
    use super::{ensure_managed_secret_belongs_to_account, managed_credential_id};

    #[test]
    fn managed_reference_must_name_the_selected_account_credential() {
        assert!(ensure_managed_secret_belongs_to_account(
            "managed://upstream-account-credential/77",
            Some(77)
        )
        .is_ok());
        assert!(ensure_managed_secret_belongs_to_account(
            "managed://upstream-account-credential/88",
            Some(77)
        )
        .is_err_and(|error| error.to_string().contains("does not belong")));
        assert!(
            ensure_managed_secret_belongs_to_account(
                "managed://upstream-account-credential/88",
                None
            )
            .is_err(),
            "a managed reference without a selected credential is a configuration fault"
        );
    }

    #[test]
    fn external_references_are_not_governed_by_the_managed_invariant() {
        assert!(
            ensure_managed_secret_belongs_to_account("vault://provider/openrouter", None).is_ok()
        );
        assert!(ensure_managed_secret_belongs_to_account("env:OPENAI_KEY", None).is_ok());
        assert_eq!(
            Some(77),
            managed_credential_id("managed://upstream-account-credential/77")
        );
        assert_eq!(
            None,
            managed_credential_id("managed://upstream-account-credential/not-a-number")
        );
        assert_eq!(None, managed_credential_id("vault://provider/openrouter"));
    }
}
