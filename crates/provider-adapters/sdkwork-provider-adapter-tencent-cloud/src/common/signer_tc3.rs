#[derive(Clone, PartialEq, Eq)]
pub struct Tc3Credentials {
    pub secret_id: String,
    pub secret_key: String,
}

impl Tc3Credentials {
    pub fn new(secret_id: impl Into<String>, secret_key: impl Into<String>) -> Self {
        Self {
            secret_id: secret_id.into(),
            secret_key: secret_key.into(),
        }
    }
}

impl std::fmt::Debug for Tc3Credentials {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("Tc3Credentials")
            .field("secret_id", &self.secret_id)
            .field("secret_key", &"[REDACTED]")
            .finish()
    }
}
