use crate::domain::DomainResult;

pub trait ProviderSecretResolver: Send + Sync {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String>;
}
