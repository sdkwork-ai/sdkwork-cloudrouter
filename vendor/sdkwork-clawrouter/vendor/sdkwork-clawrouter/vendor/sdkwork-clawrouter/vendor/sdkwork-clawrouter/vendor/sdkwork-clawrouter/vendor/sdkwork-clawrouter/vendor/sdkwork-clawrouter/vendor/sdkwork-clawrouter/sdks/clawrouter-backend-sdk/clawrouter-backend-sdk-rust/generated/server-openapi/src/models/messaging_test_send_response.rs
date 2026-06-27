use serde::{Deserialize, Serialize};

/// Messaging test send response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingTestSendResponse {
    /// Delivery status field on messaging test send response.
    #[serde(rename = "deliveryStatus")]
    pub delivery_status: String,

    /// Provider code field on messaging test send response.
    #[serde(rename = "providerCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_code: Option<String>,

    /// Request id field on messaging test send response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
