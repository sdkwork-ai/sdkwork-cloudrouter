use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to activate or deactivate certificates.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCertificateActivationRequest {
    /// Certificate identifiers to activate or deactivate.
    pub certificate_ids: Vec<String>,
}
