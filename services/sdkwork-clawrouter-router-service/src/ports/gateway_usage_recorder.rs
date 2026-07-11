use std::future::Future;
use std::pin::Pin;

use crate::domain::{BillingMeter, DecimalValue, DomainError, DomainResult};

pub type GatewayUsageRecordFuture<'a> = Pin<Box<dyn Future<Output = DomainResult<()>> + Send + 'a>>;

pub trait GatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        _command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async { Ok(()) })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayRequestTraceCommand {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub api_key_id: i64,
    pub api_key_name_snapshot: String,
    pub channel_group_id: i64,
    pub channel_group_snapshot: String,
    pub catalog_key: String,
    pub requested_model: String,
    pub requested_model_catalog_key: String,
    pub provider_code: String,
    pub channel_id: i64,
    pub provider_model: String,
    pub provider_native_model: String,
    pub region_code: String,
    pub request_path: String,
    pub http_method: String,
    pub user_agent: Option<String>,
    pub http_status: Option<u16>,
    pub streaming: bool,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub cached_tokens: i64,
    pub total_tokens: i64,
    pub latency_ms: Option<i64>,
    pub ttft_ms: Option<i64>,
    pub provider_error_code: Option<String>,
    pub error_type: Option<String>,
    pub error_message_masked: Option<String>,
}

impl GatewayRequestTraceCommand {
    pub fn validate(&self) -> DomainResult<()> {
        positive_i64("tenant_id", self.tenant_id)?;
        non_negative_i64("organization_id", self.organization_id)?;
        required_text("request_id", &self.request_id, 128)?;
        validate_http_status(self.http_status)?;
        for (field, value) in [
            ("prompt_tokens", self.prompt_tokens),
            ("completion_tokens", self.completion_tokens),
            ("cached_tokens", self.cached_tokens),
            ("total_tokens", self.total_tokens),
        ] {
            non_negative_i64(field, value)?;
        }
        validate_optional_non_negative_i64("latency_ms", self.latency_ms)?;
        validate_optional_non_negative_i64("ttft_ms", self.ttft_ms)?;
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayUsageRecordCommand {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub api_key_id: i64,
    pub api_key_name_snapshot: String,
    pub channel_group_id: i64,
    pub channel_group_snapshot: String,
    pub catalog_key: String,
    pub requested_model: String,
    pub requested_model_catalog_key: String,
    pub provider_code: String,
    pub channel_id: i64,
    pub provider_model: String,
    pub provider_native_model: String,
    pub region_code: String,
    pub request_path: String,
    pub http_method: String,
    pub user_agent: Option<String>,
    pub http_status: u16,
    pub streaming: bool,
    pub modality: i64,
    pub usage_type: i64,
    pub billing_meter_code: String,
    pub billable_quantity: String,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub cached_tokens: i64,
    pub total_tokens: i64,
    pub request_count: i64,
    pub result_count: i64,
    pub item_count: i64,
    pub character_count: i64,
    pub image_count: i64,
    pub audio_seconds: Option<String>,
    pub video_seconds: Option<String>,
    pub latency_ms: Option<i64>,
    pub ttft_ms: Option<i64>,
    pub provider_error_code: Option<String>,
    pub error_type: Option<String>,
    pub error_message_masked: Option<String>,
    pub base_input_unit_price: String,
    pub base_output_unit_price: String,
    pub cache_read_unit_price: String,
    pub rate_multiplier: String,
    pub reference_multiplier: String,
    pub official_reference_amount: String,
    pub customer_charge_amount: String,
    pub upstream_cost_amount: String,
    pub currency: String,
    pub pricing_plan_code: String,
    pub pricing_snapshot: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayUsageQuantity {
    pub billable_quantity: String,
    pub request_count: i64,
    pub result_count: i64,
    pub item_count: i64,
    pub character_count: i64,
    pub image_count: i64,
    pub audio_seconds: Option<String>,
    pub video_seconds: Option<String>,
}

impl GatewayUsageQuantity {
    pub fn for_meter(meter: BillingMeter, quantity: impl AsRef<str>) -> DomainResult<Self> {
        let quantity = quantity.as_ref();
        match meter {
            BillingMeter::LlmInputToken
            | BillingMeter::LlmOutputToken
            | BillingMeter::LlmReasoningToken
            | BillingMeter::LlmCacheWriteToken
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::EmbeddingInputToken
            | BillingMeter::AudioInputToken
            | BillingMeter::AudioOutputToken
            | BillingMeter::ImageInputToken
            | BillingMeter::ImageOutputToken
            | BillingMeter::VideoInputToken
            | BillingMeter::VideoOutputToken => Self::tokens(integer_quantity("tokens", quantity)?),
            BillingMeter::ApiRequest
            | BillingMeter::ToolCall
            | BillingMeter::WebSearchCall
            | BillingMeter::FileSearchCall
            | BillingMeter::CodeInterpreterSession
            | BillingMeter::ContainerSession => {
                Self::requests(positive_integer_quantity("request_count", quantity)?)
            }
            BillingMeter::ImageResult | BillingMeter::EmbeddingImage => {
                Self::images(positive_integer_quantity("image_count", quantity)?)
            }
            BillingMeter::ApiResult | BillingMeter::VideoResult | BillingMeter::SfxResult => {
                Self::results(positive_integer_quantity("result_count", quantity)?)
            }
            BillingMeter::ApiItem | BillingMeter::RerankSearch | BillingMeter::RerankDocument => {
                Self::items(positive_integer_quantity("item_count", quantity)?)
            }
            BillingMeter::TtsInputCharacter | BillingMeter::SpeechCharacter => {
                Self::characters(positive_integer_quantity("character_count", quantity)?)
            }
            BillingMeter::AudioInputSecond
            | BillingMeter::AudioOutputSecond
            | BillingMeter::MusicOutputSecond => Self::audio_seconds(quantity),
            BillingMeter::AudioInputMinute
            | BillingMeter::AudioOutputMinute
            | BillingMeter::SttAudioMinute => Self::audio_minutes(quantity),
            BillingMeter::VideoInputSecond | BillingMeter::VideoOutputSecond => {
                Self::video_seconds(quantity)
            }
            BillingMeter::Unknown
            | BillingMeter::LlmCacheStorageTokenHour
            | BillingMeter::ImagePixel
            | BillingMeter::ImageMegapixel
            | BillingMeter::StorageGbDay
            | BillingMeter::BandwidthGb => {
                let quantity = positive_decimal("billable_quantity", quantity)?;
                Ok(Self {
                    billable_quantity: quantity,
                    ..Self::zero()
                })
            }
        }
    }

    pub fn tokens(tokens: i64) -> DomainResult<Self> {
        non_negative_i64("tokens", tokens)?;
        Ok(Self {
            billable_quantity: tokens.to_string(),
            request_count: 1,
            ..Self::zero()
        })
    }

    pub fn single_request() -> Self {
        Self {
            billable_quantity: "1".to_owned(),
            request_count: 1,
            ..Self::zero()
        }
    }

    pub fn requests(count: i64) -> DomainResult<Self> {
        positive_i64("request_count", count)?;
        Ok(Self {
            billable_quantity: count.to_string(),
            request_count: count,
            ..Self::zero()
        })
    }

    pub fn results(count: i64) -> DomainResult<Self> {
        positive_i64("result_count", count)?;
        Ok(Self {
            billable_quantity: count.to_string(),
            result_count: count,
            ..Self::zero()
        })
    }

    pub fn items(count: i64) -> DomainResult<Self> {
        positive_i64("item_count", count)?;
        Ok(Self {
            billable_quantity: count.to_string(),
            item_count: count,
            ..Self::zero()
        })
    }

    pub fn characters(count: i64) -> DomainResult<Self> {
        positive_i64("character_count", count)?;
        Ok(Self {
            billable_quantity: count.to_string(),
            character_count: count,
            ..Self::zero()
        })
    }

    pub fn images(count: i64) -> DomainResult<Self> {
        positive_i64("image_count", count)?;
        Ok(Self {
            billable_quantity: count.to_string(),
            image_count: count,
            ..Self::zero()
        })
    }

    pub fn audio_seconds(seconds: impl AsRef<str>) -> DomainResult<Self> {
        let seconds = positive_decimal("audio_seconds", seconds.as_ref())?;
        Ok(Self {
            billable_quantity: seconds.clone(),
            audio_seconds: Some(seconds),
            ..Self::zero()
        })
    }

    pub fn audio_minutes(minutes: impl AsRef<str>) -> DomainResult<Self> {
        let minutes = positive_decimal_value("audio_minutes", minutes.as_ref())?;
        let seconds = minutes.multiply_i64(60)?;
        Ok(Self {
            billable_quantity: minutes.to_fixed_string(12),
            audio_seconds: Some(seconds.to_fixed_string(12)),
            ..Self::zero()
        })
    }

    pub fn video_seconds(seconds: impl AsRef<str>) -> DomainResult<Self> {
        let seconds = positive_decimal("video_seconds", seconds.as_ref())?;
        Ok(Self {
            billable_quantity: seconds.clone(),
            video_seconds: Some(seconds),
            ..Self::zero()
        })
    }

    fn zero() -> Self {
        Self {
            billable_quantity: "0".to_owned(),
            request_count: 0,
            result_count: 0,
            item_count: 0,
            character_count: 0,
            image_count: 0,
            audio_seconds: None,
            video_seconds: None,
        }
    }
}

impl GatewayUsageRecordCommand {
    pub fn validate(&self) -> DomainResult<()> {
        self.trace_command().validate()?;
        non_negative_i64("modality", self.modality)?;
        non_negative_i64("usage_type", self.usage_type)?;
        required_text("billing_meter_code", &self.billing_meter_code, 64)?;
        required_text("currency", &self.currency, 10)?;
        if self.currency.len() < 3 {
            return Err(DomainError::new(
                "currency must contain at least three characters".to_owned(),
            ));
        }

        for (field, value) in [
            ("request_count", self.request_count),
            ("result_count", self.result_count),
            ("item_count", self.item_count),
            ("character_count", self.character_count),
            ("image_count", self.image_count),
        ] {
            non_negative_i64(field, value)?;
        }

        for (field, value) in [
            ("billable_quantity", self.billable_quantity.as_str()),
            ("base_input_unit_price", self.base_input_unit_price.as_str()),
            (
                "base_output_unit_price",
                self.base_output_unit_price.as_str(),
            ),
            ("cache_read_unit_price", self.cache_read_unit_price.as_str()),
            ("rate_multiplier", self.rate_multiplier.as_str()),
            ("reference_multiplier", self.reference_multiplier.as_str()),
            (
                "official_reference_amount",
                self.official_reference_amount.as_str(),
            ),
            (
                "customer_charge_amount",
                self.customer_charge_amount.as_str(),
            ),
            ("upstream_cost_amount", self.upstream_cost_amount.as_str()),
        ] {
            non_negative_decimal(field, value)?;
        }
        validate_optional_non_negative_decimal("audio_seconds", self.audio_seconds.as_deref())?;
        validate_optional_non_negative_decimal("video_seconds", self.video_seconds.as_deref())?;

        let pricing_snapshot: serde_json::Value = serde_json::from_str(&self.pricing_snapshot)
            .map_err(|_| DomainError::new("pricing_snapshot must be valid JSON".to_owned()))?;
        if !pricing_snapshot.is_object() {
            return Err(DomainError::new(
                "pricing_snapshot must be a JSON object".to_owned(),
            ));
        }
        Ok(())
    }

    pub fn apply_quantity(&mut self, quantity: GatewayUsageQuantity) {
        self.billable_quantity = quantity.billable_quantity;
        self.request_count = quantity.request_count;
        self.result_count = quantity.result_count;
        self.item_count = quantity.item_count;
        self.character_count = quantity.character_count;
        self.image_count = quantity.image_count;
        self.audio_seconds = quantity.audio_seconds;
        self.video_seconds = quantity.video_seconds;
    }

    pub fn with_quantity(mut self, quantity: GatewayUsageQuantity) -> Self {
        self.apply_quantity(quantity);
        self
    }

    pub fn trace_command(&self) -> GatewayRequestTraceCommand {
        GatewayRequestTraceCommand {
            request_id: self.request_id.clone(),
            trace_id: self.trace_id.clone(),
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            user_id: self.user_id,
            api_key_id: self.api_key_id,
            api_key_name_snapshot: self.api_key_name_snapshot.clone(),
            channel_group_id: self.channel_group_id,
            channel_group_snapshot: self.channel_group_snapshot.clone(),
            catalog_key: self.catalog_key.clone(),
            requested_model: self.requested_model.clone(),
            requested_model_catalog_key: self.requested_model_catalog_key.clone(),
            provider_code: self.provider_code.clone(),
            channel_id: self.channel_id,
            provider_model: self.provider_model.clone(),
            provider_native_model: self.provider_native_model.clone(),
            region_code: self.region_code.clone(),
            request_path: self.request_path.clone(),
            http_method: self.http_method.clone(),
            user_agent: self.user_agent.clone(),
            http_status: Some(self.http_status),
            streaming: self.streaming,
            prompt_tokens: self.prompt_tokens,
            completion_tokens: self.completion_tokens,
            cached_tokens: self.cached_tokens,
            total_tokens: self.total_tokens,
            latency_ms: self.latency_ms,
            ttft_ms: self.ttft_ms,
            provider_error_code: self.provider_error_code.clone(),
            error_type: self.error_type.clone(),
            error_message_masked: self.error_message_masked.clone(),
        }
    }
}

fn non_negative_i64(field: &str, value: i64) -> DomainResult<()> {
    if value < 0 {
        return Err(DomainError::new(format!("{field} must be non-negative")));
    }
    Ok(())
}

fn validate_optional_non_negative_i64(field: &str, value: Option<i64>) -> DomainResult<()> {
    if let Some(value) = value {
        non_negative_i64(field, value)?;
    }
    Ok(())
}

fn validate_http_status(value: Option<u16>) -> DomainResult<()> {
    if let Some(value) = value {
        if !(100..=599).contains(&value) {
            return Err(DomainError::new(
                "http_status must be between 100 and 599".to_owned(),
            ));
        }
    }
    Ok(())
}

fn required_text(field: &str, value: &str, max_characters: usize) -> DomainResult<()> {
    if value.is_empty() || value.trim() != value {
        return Err(DomainError::new(format!(
            "{field} must be non-empty and must not contain surrounding whitespace"
        )));
    }
    if value.chars().count() > max_characters {
        return Err(DomainError::new(format!(
            "{field} must not exceed {max_characters} characters"
        )));
    }
    Ok(())
}

fn non_negative_decimal(field: &str, value: &str) -> DomainResult<()> {
    let decimal = DecimalValue::parse(value).map_err(|error| {
        DomainError::new(format!(
            "{field} must be a non-negative decimal value: {error}"
        ))
    })?;
    if decimal < DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "{field} must be a non-negative decimal value"
        )));
    }
    Ok(())
}

fn validate_optional_non_negative_decimal(field: &str, value: Option<&str>) -> DomainResult<()> {
    if let Some(value) = value {
        non_negative_decimal(field, value)?;
    }
    Ok(())
}

fn positive_i64(field: &str, value: i64) -> DomainResult<()> {
    if value <= 0 {
        return Err(DomainError::new(format!("{field} must be positive")));
    }
    Ok(())
}

fn integer_quantity(field: &str, value: &str) -> DomainResult<i64> {
    let value = value.trim();
    let quantity = value.parse::<i64>().map_err(|_| {
        DomainError::new(format!("{field} must be a non-negative integer quantity"))
    })?;
    non_negative_i64(field, quantity)?;
    Ok(quantity)
}

fn positive_integer_quantity(field: &str, value: &str) -> DomainResult<i64> {
    let quantity = integer_quantity(field, value)?;
    positive_i64(field, quantity)?;
    Ok(quantity)
}

fn positive_decimal_value(field: &str, value: &str) -> DomainResult<DecimalValue> {
    let decimal = DecimalValue::parse(value).map_err(|error| {
        DomainError::new(format!(
            "{field} must be a positive decimal quantity: {error}"
        ))
    })?;
    if decimal <= DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "{field} must be a positive decimal quantity"
        )));
    }
    Ok(decimal)
}

fn positive_decimal(field: &str, value: &str) -> DomainResult<String> {
    positive_decimal_value(field, value).map(|decimal| decimal.to_fixed_string(12))
}
