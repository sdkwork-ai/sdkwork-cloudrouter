use serde::{Deserialize, Serialize};

/// Messaging template create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingTemplateCreateRequest {
    /// Body template field on messaging template create request.
    #[serde(rename = "bodyTemplate")]
    pub body_template: String,

    /// Category field on messaging template create request.
    pub category: String,

    /// Channel field on messaging template create request.
    pub channel: String,

    /// Content format field on messaging template create request.
    #[serde(rename = "contentFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_format: Option<String>,

    /// Delivery purpose field on messaging template create request.
    #[serde(rename = "deliveryPurpose")]
    pub delivery_purpose: String,

    /// Locale field on messaging template create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,

    /// Scene code field on messaging template create request.
    #[serde(rename = "sceneCode")]
    pub scene_code: String,

    /// Subject template field on messaging template create request.
    #[serde(rename = "subjectTemplate")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject_template: Option<String>,

    /// Template code field on messaging template create request.
    #[serde(rename = "templateCode")]
    pub template_code: String,

    /// Template name field on messaging template create request.
    #[serde(rename = "templateName")]
    pub template_name: String,

    /// Variable schema field on messaging template create request.
    #[serde(rename = "variableSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variable_schema: Option<std::collections::HashMap<String, String>>,
}
