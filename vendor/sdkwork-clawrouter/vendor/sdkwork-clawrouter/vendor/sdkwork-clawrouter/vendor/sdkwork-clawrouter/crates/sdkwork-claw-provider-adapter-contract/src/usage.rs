use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterUsage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billing_units: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<i64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub usage_lines: Vec<AdapterUsageLine>,
}

impl AdapterUsage {
    pub fn is_empty(&self) -> bool {
        self.billing_units.is_none()
            && self.input_tokens.is_none()
            && self.output_tokens.is_none()
            && self.usage_lines.is_empty()
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterUsageLine {
    pub meter_code: String,
    pub billable_quantity: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billable_unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub character_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_seconds: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_seconds: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_native_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requested_model_catalog_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pricing_snapshot: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated: Option<bool>,
}

impl AdapterUsageLine {
    pub fn new(meter_code: impl Into<String>, billable_quantity: impl Into<String>) -> Self {
        Self {
            meter_code: meter_code.into(),
            billable_quantity: billable_quantity.into(),
            ..Self::default()
        }
    }

    pub fn with_billable_unit(mut self, billable_unit: impl Into<String>) -> Self {
        self.billable_unit = Some(billable_unit.into());
        self
    }

    pub fn with_request_count(mut self, request_count: i64) -> Self {
        self.request_count = Some(request_count);
        self
    }

    pub fn with_result_count(mut self, result_count: i64) -> Self {
        self.result_count = Some(result_count);
        self
    }

    pub fn with_item_count(mut self, item_count: i64) -> Self {
        self.item_count = Some(item_count);
        self
    }

    pub fn with_character_count(mut self, character_count: i64) -> Self {
        self.character_count = Some(character_count);
        self
    }

    pub fn with_image_count(mut self, image_count: i64) -> Self {
        self.image_count = Some(image_count);
        self
    }

    pub fn with_audio_seconds(mut self, audio_seconds: impl Into<String>) -> Self {
        self.audio_seconds = Some(audio_seconds.into());
        self
    }

    pub fn with_video_seconds(mut self, video_seconds: impl Into<String>) -> Self {
        self.video_seconds = Some(video_seconds.into());
        self
    }

    pub fn with_provider_native_model(mut self, provider_native_model: impl Into<String>) -> Self {
        self.provider_native_model = Some(provider_native_model.into());
        self
    }

    pub fn with_requested_model_catalog_key(
        mut self,
        requested_model_catalog_key: impl Into<String>,
    ) -> Self {
        self.requested_model_catalog_key = Some(requested_model_catalog_key.into());
        self
    }

    pub fn with_pricing_snapshot(mut self, pricing_snapshot: Value) -> Self {
        self.pricing_snapshot = Some(pricing_snapshot);
        self
    }

    pub fn with_estimated(mut self, estimated: bool) -> Self {
        self.estimated = Some(estimated);
        self
    }
}
