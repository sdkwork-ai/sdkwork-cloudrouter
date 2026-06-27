use crate::domain::DomainResult;

pub trait ProviderSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String>;
}
