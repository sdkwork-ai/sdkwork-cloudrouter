use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::operation::PaasOperation;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PaasProviderRequestContext {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub supplier_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credential_ref: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PaasStandardRequest {
    Ocr(PaasOcrRequest),
    FaceCompare(PaasFaceCompareRequest),
    FaceLiveness(PaasFaceLivenessRequest),
}

impl PaasStandardRequest {
    pub fn operation(&self) -> PaasOperation {
        match self {
            Self::Ocr(request) => request.operation,
            Self::FaceCompare(request) => request.operation,
            Self::FaceLiveness(request) => request.operation,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PaasStandardResponse {
    Ocr(PaasOcrResponse),
    FaceCompare(PaasFaceCompareResponse),
    FaceLiveness(PaasFaceLivenessResponse),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasOcrRequest {
    pub operation: PaasOperation,
    pub image: PaasImageInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language_hint: Option<String>,
    #[serde(default)]
    pub options: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasFaceCompareRequest {
    pub operation: PaasOperation,
    pub source: PaasImageInput,
    pub target: PaasImageInput,
    #[serde(default)]
    pub options: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasFaceLivenessRequest {
    pub operation: PaasOperation,
    pub image: PaasImageInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub real_name: Option<String>,
    #[serde(default)]
    pub options: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", tag = "inputType")]
pub enum PaasImageInput {
    Url {
        url: String,
    },
    Base64 {
        media_type: String,
        data: String,
    },
    ObjectRef {
        bucket: String,
        #[serde(rename = "objectKey")]
        object_key: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasOcrResponse {
    #[serde(rename = "providerCode")]
    pub supplier_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    #[serde(default)]
    pub pages: Vec<PaasDocumentPage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_provider_response: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasDocumentPage {
    pub page_index: u32,
    pub text: String,
    #[serde(default)]
    pub blocks: Vec<PaasDocumentBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasDocumentBlock {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bounding_box: Option<PaasBlockBoundingBox>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasBlockBoundingBox {
    pub left: f32,
    pub top: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasFaceCompareResponse {
    #[serde(rename = "providerCode")]
    pub supplier_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    pub similarity: f32,
    pub passed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_provider_response: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaasFaceLivenessResponse {
    #[serde(rename = "providerCode")]
    pub supplier_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    pub live: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_provider_response: Option<Value>,
}
