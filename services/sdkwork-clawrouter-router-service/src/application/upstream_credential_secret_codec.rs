use crate::domain::DomainResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UpstreamCredentialSecretContext {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub account_id: i64,
    pub credential_id: i64,
}

impl UpstreamCredentialSecretContext {
    pub fn new(tenant_id: i64, organization_id: i64, account_id: i64, credential_id: i64) -> Self {
        Self {
            tenant_id,
            organization_id,
            account_id,
            credential_id,
        }
    }

    pub(crate) fn aad(&self) -> String {
        format!(
            "sdkwork-clawrouter:upstream-credential:v2:{}:{}:{}:{}",
            self.tenant_id, self.organization_id, self.account_id, self.credential_id
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncodedUpstreamCredentialSecret {
    pub ciphertext: String,
    pub key_id: String,
    pub fingerprint: String,
}

pub trait UpstreamCredentialSecretCodec {
    fn encode_secret(
        &self,
        context: UpstreamCredentialSecretContext,
        secret: &str,
    ) -> DomainResult<EncodedUpstreamCredentialSecret>;

    fn decode_secret(
        &self,
        context: UpstreamCredentialSecretContext,
        key_id: &str,
        ciphertext: &str,
    ) -> DomainResult<String>;
}
