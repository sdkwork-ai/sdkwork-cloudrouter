use std::future::Future;
use std::pin::Pin;

use serde::de::IgnoredAny;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::domain::{BillingMeter, DecimalValue, DomainError, DomainResult};

pub type GatewayUsageRecordFuture<'a> = Pin<Box<dyn Future<Output = DomainResult<()>> + Send + 'a>>;

// The PostgreSQL baseline enforces this textual ceiling for NUMERIC(38, 12)
// persistence fields. Check it before DecimalValue parses the input so a
// malformed upstream value cannot force unbounded parser work.
const DECIMAL_INPUT_MAX_BYTES: usize = 40;
pub(crate) const MAX_PRICING_SNAPSHOT_BYTES: i32 = 16 * 1024;

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

    fn record_gateway_usage_batch<'a>(
        &'a self,
        commands: Vec<GatewayUsageRecordCommand>,
    ) -> GatewayUsageRecordFuture<'a>
    where
        Self: Sync,
    {
        Box::pin(async move {
            for command in commands {
                self.record_gateway_usage(command).await?;
            }
            Ok(())
        })
    }

    fn record_gateway_trace_with_context<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
        _context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        self.record_gateway_trace(command)
    }

    fn record_gateway_usage_with_context<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
        _context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        self.record_gateway_usage(command)
    }
}

/// Immutable identity captured by the process that handled a gateway request.
///
/// Every field is optional so an old deployment can continue recording traces
/// during the expand phase. Once a non-null snapshot has been stored, SQL
/// upserts preserve it instead of replacing history with a later process
/// identity.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct GatewayTraceAttribution {
    pub gateway_instance_id: Option<i64>,
    pub gateway_instance_code_snapshot: Option<String>,
    pub gateway_region_code_snapshot: Option<String>,
    pub gateway_node_name_snapshot: Option<String>,
}

/// Immutable persistence context captured by the gateway that handled the
/// provider request. Durable retries must replay this context instead of using
/// the retry worker's clock or node identity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GatewayAccountingRecordContext {
    pub attribution: GatewayTraceAttribution,
    pub started_at_epoch_millis: i64,
    pub ended_at_epoch_millis: i64,
    pub user_agent_hash: Option<String>,
}

impl GatewayAccountingRecordContext {
    pub fn from_trace(
        command: &GatewayRequestTraceCommand,
        attribution: GatewayTraceAttribution,
        ended_at_epoch_millis: i64,
    ) -> DomainResult<Self> {
        let latency_millis = command.latency_ms.unwrap_or_default().max(0);
        let context = Self {
            attribution,
            started_at_epoch_millis: ended_at_epoch_millis.saturating_sub(latency_millis),
            ended_at_epoch_millis,
            user_agent_hash: hash_optional_text(command.user_agent.as_deref()),
        };
        context.validate()?;
        Ok(context)
    }

    pub fn from_usage(
        command: &GatewayUsageRecordCommand,
        attribution: GatewayTraceAttribution,
        ended_at_epoch_millis: i64,
    ) -> DomainResult<Self> {
        Self::from_trace(&command.trace_command(), attribution, ended_at_epoch_millis)
    }

    pub fn validate(&self) -> DomainResult<()> {
        self.attribution.validate()?;
        if self.started_at_epoch_millis < 0 || self.ended_at_epoch_millis < 0 {
            return Err(DomainError::new(
                "gateway accounting timestamps must be non-negative",
            ));
        }
        if self.ended_at_epoch_millis < self.started_at_epoch_millis {
            return Err(DomainError::new(
                "gateway accounting ended_at must not precede started_at",
            ));
        }
        if self.user_agent_hash.as_ref().is_some_and(|value| {
            value.len() != 64 || !value.bytes().all(|byte| byte.is_ascii_hexdigit())
        }) {
            return Err(DomainError::new(
                "gateway accounting user_agent_hash must be a SHA-256 hex digest",
            ));
        }
        Ok(())
    }
}

impl GatewayTraceAttribution {
    pub fn validate(&self) -> DomainResult<()> {
        if let Some(gateway_instance_id) = self.gateway_instance_id {
            positive_i64("gateway_instance_id", gateway_instance_id)?;
        }
        validate_optional_snapshot_text(
            "gateway_instance_code_snapshot",
            self.gateway_instance_code_snapshot.as_deref(),
            128,
        )?;
        validate_optional_snapshot_text(
            "gateway_region_code_snapshot",
            self.gateway_region_code_snapshot.as_deref(),
            64,
        )?;
        validate_optional_snapshot_text(
            "gateway_node_name_snapshot",
            self.gateway_node_name_snapshot.as_deref(),
            128,
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GatewayRequestTraceCommand {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub api_key_id: i64,
    pub api_key_name_snapshot: String,
    pub account_group_id: i64,
    pub upstream_account_group_snapshot: String,
    pub catalog_key: String,
    pub requested_model: String,
    pub requested_model_catalog_key: String,
    pub supplier_code: String,
    pub account_id: i64,
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
        for (field, value, max_characters) in [
            (
                "api_key_name_snapshot",
                self.api_key_name_snapshot.as_str(),
                128,
            ),
            (
                "upstream_account_group_snapshot",
                self.upstream_account_group_snapshot.as_str(),
                128,
            ),
            ("supplier_code", self.supplier_code.as_str(), 128),
            ("requested_model", self.requested_model.as_str(), 256),
            (
                "requested_model_catalog_key",
                self.requested_model_catalog_key.as_str(),
                256,
            ),
            ("provider_model", self.provider_model.as_str(), 256),
            (
                "provider_native_model",
                self.provider_native_model.as_str(),
                256,
            ),
            ("region_code", self.region_code.as_str(), 64),
            ("request_path", self.request_path.as_str(), 256),
            ("http_method", self.http_method.as_str(), 16),
        ] {
            validate_text_width(field, value, max_characters)?;
        }
        for (field, value, max_characters) in [
            ("trace_id", self.trace_id.as_deref(), 128),
            (
                "provider_error_code",
                self.provider_error_code.as_deref(),
                128,
            ),
            ("error_type", self.error_type.as_deref(), 128),
            (
                "error_message_masked",
                self.error_message_masked.as_deref(),
                1024,
            ),
        ] {
            validate_optional_text_width(field, value, max_characters)?;
        }
        validate_http_status(self.http_status)?;
        for (field, value) in [
            ("prompt_tokens", self.prompt_tokens),
            ("completion_tokens", self.completion_tokens),
            ("cached_tokens", self.cached_tokens),
            ("total_tokens", self.total_tokens),
        ] {
            non_negative_i64(field, value)?;
        }
        validate_optional_non_negative_i32("latency_ms", self.latency_ms)?;
        validate_optional_non_negative_i32("ttft_ms", self.ttft_ms)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GatewayUsageRecordCommand {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub api_key_id: i64,
    pub api_key_name_snapshot: String,
    pub account_group_id: i64,
    pub upstream_account_group_snapshot: String,
    pub catalog_key: String,
    pub requested_model: String,
    pub requested_model_catalog_key: String,
    pub supplier_code: String,
    pub account_id: i64,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
        non_negative_i32("modality", self.modality)?;
        non_negative_i32("usage_type", self.usage_type)?;
        validate_text_width("catalog_key", &self.catalog_key, 256)?;
        required_text("billing_meter_code", &self.billing_meter_code, 64)?;
        required_text("currency", &self.currency, 10)?;
        validate_text_width("pricing_plan_code", &self.pricing_plan_code, 64)?;
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
        validate_json_object(
            "pricing_snapshot",
            &self.pricing_snapshot,
            MAX_PRICING_SNAPSHOT_BYTES,
        )?;
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
            account_group_id: self.account_group_id,
            upstream_account_group_snapshot: self.upstream_account_group_snapshot.clone(),
            catalog_key: self.catalog_key.clone(),
            requested_model: self.requested_model.clone(),
            requested_model_catalog_key: self.requested_model_catalog_key.clone(),
            supplier_code: self.supplier_code.clone(),
            account_id: self.account_id,
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

fn non_negative_i32(field: &str, value: i64) -> DomainResult<()> {
    non_negative_i64(field, value)?;
    if value > i64::from(i32::MAX) {
        return Err(DomainError::new(format!(
            "{field} must not exceed {}",
            i32::MAX
        )));
    }
    Ok(())
}

fn validate_optional_non_negative_i32(field: &str, value: Option<i64>) -> DomainResult<()> {
    if let Some(value) = value {
        non_negative_i32(field, value)?;
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
    validate_text_width(field, value, max_characters)
}

fn validate_text_width(field: &str, value: &str, max_characters: usize) -> DomainResult<()> {
    if value.chars().nth(max_characters).is_some() {
        return Err(DomainError::new(format!(
            "{field} must not exceed {max_characters} characters"
        )));
    }
    Ok(())
}

fn validate_optional_text_width(
    field: &str,
    value: Option<&str>,
    max_characters: usize,
) -> DomainResult<()> {
    if let Some(value) = value {
        validate_text_width(field, value, max_characters)?;
    }
    Ok(())
}

fn validate_optional_snapshot_text(
    field: &str,
    value: Option<&str>,
    max_characters: usize,
) -> DomainResult<()> {
    let Some(value) = value else {
        return Ok(());
    };
    required_text(field, value, max_characters)
}

pub fn hash_optional_text(value: Option<&str>) -> Option<String> {
    let value = value?.as_bytes();
    let mut hasher = Sha256::new();
    hasher.update(value);
    Some(hex::encode(hasher.finalize()))
}

fn non_negative_decimal(field: &str, value: &str) -> DomainResult<()> {
    validate_decimal_input_length(field, value)?;
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

fn validate_decimal_input_length(field: &str, value: &str) -> DomainResult<()> {
    if value.len() > DECIMAL_INPUT_MAX_BYTES {
        return Err(DomainError::new(format!(
            "{field} must not exceed {DECIMAL_INPUT_MAX_BYTES} bytes"
        )));
    }
    Ok(())
}

fn validate_json_object(field: &str, value: &str, max_bytes: i32) -> DomainResult<()> {
    if value.len() > max_bytes as usize {
        return Err(DomainError::new(format!(
            "{field} must not exceed {max_bytes} bytes"
        )));
    }
    let mut deserializer = serde_json::Deserializer::from_str(value);
    IgnoredAny::deserialize(&mut deserializer)
        .and_then(|_| deserializer.end())
        .map_err(|_| DomainError::new(format!("{field} must be valid JSON")))?;
    if !value.trim_start().starts_with('{') {
        return Err(DomainError::new(format!("{field} must be a JSON object")));
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
    validate_decimal_input_length(field, value)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pricing_snapshot_is_bounded_by_utf8_bytes_before_json_parsing() {
        validate_json_object("pricing_snapshot", "{}", MAX_PRICING_SNAPSHOT_BYTES)
            .expect("small object must pass");

        let oversized = format!(
            "{{\"value\":\"{}\"}}",
            "x".repeat(MAX_PRICING_SNAPSHOT_BYTES as usize)
        );
        let error =
            validate_json_object("pricing_snapshot", &oversized, MAX_PRICING_SNAPSHOT_BYTES)
                .expect_err("oversized object must fail before parsing");
        assert!(error.to_string().contains("must not exceed 16384 bytes"));

        let multibyte = format!("{{\"value\":\"{}\"}}", "\u{754c}".repeat(5_500));
        assert!(multibyte.chars().count() < MAX_PRICING_SNAPSHOT_BYTES as usize);
        assert!(
            validate_json_object("pricing_snapshot", &multibyte, MAX_PRICING_SNAPSHOT_BYTES,)
                .is_err()
        );
    }
}
