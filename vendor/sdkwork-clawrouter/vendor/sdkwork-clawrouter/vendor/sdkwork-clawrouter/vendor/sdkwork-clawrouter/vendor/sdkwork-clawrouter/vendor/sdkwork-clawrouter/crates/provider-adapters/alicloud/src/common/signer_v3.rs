#[derive(Clone, PartialEq, Eq)]
pub struct AliCloudCredentials {
    pub access_key_id: String,
    pub access_key_secret: String,
}

impl AliCloudCredentials {
    pub fn new(access_key_id: impl Into<String>, access_key_secret: impl Into<String>) -> Self {
        Self {
            access_key_id: access_key_id.into(),
            access_key_secret: access_key_secret.into(),
        }
    }
}

impl std::fmt::Debug for AliCloudCredentials {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("AliCloudCredentials")
            .field("access_key_id", &self.access_key_id)
            .field("access_key_secret", &"[REDACTED]")
            .finish()
    }
}
