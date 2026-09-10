use crate::application::{ApiKeySecretGenerator, EntityUuidGenerator};
use crate::domain::{DomainError, DomainResult};

#[derive(Debug, Default, Clone)]
pub struct OsApiKeySecretGenerator;

impl EntityUuidGenerator for OsApiKeySecretGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        let mut bytes = [0_u8; 16];
        fill_random_bytes(&mut bytes)?;
        Ok(hex::encode(bytes))
    }
}

impl ApiKeySecretGenerator for OsApiKeySecretGenerator {
    fn generate_api_key_secret(&self) -> DomainResult<String> {
        let mut bytes = [0_u8; 32];
        fill_random_bytes(&mut bytes)?;
        Ok(format!("sk-{}", hex::encode(bytes)))
    }
}

/// Fill `bytes` from the operating system CSPRNG via `getrandom`. This is
/// non-blocking and cross-platform, and keeps the workspace `unsafe`-free on
/// the API-key generation path.
fn fill_random_bytes(bytes: &mut [u8]) -> DomainResult<()> {
    getrandom::fill(bytes).map_err(|_| DomainError::new("failed to generate secure random bytes"))
}
