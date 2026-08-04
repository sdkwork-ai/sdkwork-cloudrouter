use std::sync::Arc;

use sdkwork_claw_config::ApiKeySecretStorageMode;

use crate::domain::DomainResult;

/// Scope the raw API key secret ciphertext is bound to. A ciphertext encrypted
/// for one key can never be decrypted under a different tenant/org/key scope.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ApiKeySecretContext {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub api_key_id: i64,
}

impl ApiKeySecretContext {
    pub fn new(tenant_id: i64, organization_id: i64, api_key_id: i64) -> Self {
        Self {
            tenant_id,
            organization_id,
            api_key_id,
        }
    }

    pub(crate) fn aad(&self) -> String {
        format!(
            "sdkwork-clawrouter:api-key-secret:v1:{}:{}:{}",
            self.tenant_id, self.organization_id, self.api_key_id
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncodedApiKeySecret {
    pub ciphertext: String,
    pub key_id: String,
}

pub trait ApiKeySecretCodec {
    fn encode_secret(
        &self,
        context: ApiKeySecretContext,
        secret: &str,
    ) -> DomainResult<EncodedApiKeySecret>;

    fn decode_secret(
        &self,
        context: ApiKeySecretContext,
        key_id: &str,
        ciphertext: &str,
    ) -> DomainResult<String>;
}

/// How raw API key secrets are persisted and how they can be re-read.
///
/// `Plaintext` (the default) stores the raw key directly; `Ciphertext`
/// stores an AEAD-encrypted copy that is decrypted on read.
#[derive(Clone)]
pub struct ApiKeySecretStorageConfig {
    mode: ApiKeySecretStorageMode,
    codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
}

impl ApiKeySecretStorageConfig {
    pub fn new(
        mode: ApiKeySecretStorageMode,
        codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self { mode, codec }
    }

    pub fn mode(&self) -> ApiKeySecretStorageMode {
        self.mode
    }

    pub fn codec(&self) -> &(dyn ApiKeySecretCodec + Send + Sync) {
        self.codec.as_ref()
    }

    pub fn is_ciphertext(&self) -> bool {
        self.mode.is_ciphertext()
    }
}
