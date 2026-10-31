//! Credit estimation for the federated Generations app surface.
//!
//! Implements the `GenerationPricingPort` that `sdkwork-generations` defines
//! for `POST /app/v3/api/generations/pricing/estimate`. The estimate prices a
//! generation command with the **same engine the invocation billing pipeline
//! charges with** — the shared [`RefreshableSqlPricingCatalog`], the
//! sdkwork-models [`PriceService`], and the cash-to-points settings the
//! settlement worker converts charges with — so the displayed number is the
//! projection of the actual wallet debit, not an independent price table.
//!
//! What the estimate deliberately does not do: reserve funds, resolve an
//! upstream account, or guess a quantity the command does not declare. A
//! command the catalog cannot price (unknown model, tiered rate without the
//! requested resolution, per-token metering without a token budget) answers
//! `priced: false` with a diagnosis.

use std::sync::Arc;

use sqlx::PgPool;

use crate::application::invocation::{
    add_meter_dimensions, billing_region_prefers_china, catalog_pricing_meters,
    catalog_vendor_code, deployment_billing_region, single_catalog_tier_code,
};
use crate::application::{PriceResolutionStatus, PriceService};
use crate::domain::{BillingMeter, DecimalValue, PricingDimensionContext, ResourceDefinition};
use crate::infrastructure::sql::catalog::RefreshableSqlPricingCatalog;
use crate::infrastructure::sql::postgres::load_recharge_settings_model;
use crate::ports::{
    AdminMarketingSubject, PricingDefaultRegionProvider, UpstreamAccountRouteCatalog,
};
use sdkwork_intelligence_generations_service::domain::pricing::{
    GenerationPricingError, GenerationPricingEstimate, GenerationPricingEstimateLine,
    GenerationPricingEstimateRequest, GenerationPricingPort, GenerationPricingScope,
};

/// One point of token-bank credit is stored as 1e6 micro-points.
const MICRO_POINTS_PER_POINT: i64 = 1_000_000;

/// Formats micro-points as a decimal string in points, trimming the
/// micro-scale trailing zeros so whole points render without a fraction.
fn micros_to_points_string(micros: i64) -> String {
    let whole = micros / MICRO_POINTS_PER_POINT;
    let fraction = micros % MICRO_POINTS_PER_POINT;
    if fraction == 0 {
        return whole.to_string();
    }
    let digits = format!("{:06}", fraction.abs());
    let trimmed = digits.trim_end_matches('0');
    format!("{whole}.{trimmed}")
}

/// Canonical decimal display: `to_fixed_string` always renders a fraction,
/// so trim the zero fraction for whole numbers ("4.0" -> "4", "2.5" stays).
fn decimal_to_canonical_string(value: DecimalValue) -> String {
    let fixed = value.to_fixed_string(12);
    let trimmed = fixed.trim_end_matches('0').trim_end_matches('.');
    if trimmed.is_empty() {
        return "0".to_owned();
    }
    trimmed.to_owned()
}

/// Vendor-native generation-mode api code the pricing catalog's video tier
/// profiles declare. The tier decision suffix-matches the api code's last
/// segment against the mode names; known operations map to their catalog
/// mode, and anything else passes through so the decision reports the gap
/// instead of guessing.
fn generation_mode_api_code(operation: &str) -> String {
    match operation {
        "motion_mimicry" => "motion_control".to_owned(),
        other => other.to_owned(),
    }
}

fn string_field(source: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        source.get(*key).and_then(|value| match value {
            serde_json::Value::String(text) => {
                let trimmed = text.trim();
                (!trimmed.is_empty()).then(|| trimmed.to_owned())
            }
            serde_json::Value::Number(number) => Some(number.to_string()),
            _ => None,
        })
    })
}

fn decimal_field(source: &serde_json::Value, keys: &[&str]) -> Option<DecimalValue> {
    keys.iter().find_map(|key| {
        let value = source.get(*key)?;
        match value {
            serde_json::Value::Number(number) => DecimalValue::parse(&number.to_string()).ok(),
            serde_json::Value::String(text) => DecimalValue::parse(text.trim()).ok(),
            _ => None,
        }
    })
}

/// Client-declared quantity fields of a generation command. The creative
/// composer nests its values under `generationConfig` (`aspectRatio`,
/// `resolution`, `durationSeconds`, `imageCount`, ...); vendor-shaped
/// top-level spellings are accepted as well so a caller that forwards
/// provider parameters still estimates.
struct CommandQuantities {
    resolution: Option<String>,
    pixel_size: Option<(i64, i64)>,
    duration_seconds: Option<DecimalValue>,
    result_count: Option<DecimalValue>,
    quality: Option<String>,
    vendor: Option<String>,
}

impl CommandQuantities {
    fn from_parameters(parameters: Option<&serde_json::Value>) -> Self {
        let empty = serde_json::Value::Null;
        let parameters = parameters.unwrap_or(&empty);
        let config = parameters
            .get("generationConfig")
            .filter(|value| value.is_object());
        let read_string = |keys: &[&str]| -> Option<String> {
            config
                .and_then(|config| string_field(config, keys))
                .or_else(|| string_field(parameters, keys))
        };
        let read_decimal = |keys: &[&str]| -> Option<DecimalValue> {
            config
                .and_then(|config| decimal_field(config, keys))
                .or_else(|| decimal_field(parameters, keys))
        };
        let pixel_size = read_decimal(&["imageWidth", "width"])
            .zip(read_decimal(&["imageHeight", "height"]))
            .and_then(|(width, height)| {
                let width = decimal_to_canonical_string(width).parse::<i64>().ok()?;
                let height = decimal_to_canonical_string(height).parse::<i64>().ok()?;
                (width > 0 && height > 0).then_some((width, height))
            });
        Self {
            resolution: read_string(&["resolution", "size"]),
            pixel_size,
            duration_seconds: read_decimal(&["durationSeconds", "duration_seconds", "duration"]),
            result_count: read_decimal(&[
                "imageCount",
                "result_count",
                "count",
                "n",
                "num_images",
            ]),
            // The gateway's quality pointers are `/quality` and Kling's
            // `/mode` spelling (std/pro); the composer's own videoMode rides
            // `videoMode`, so no collision.
            quality: read_string(&["quality", "mode"]),
            vendor: config
                .and_then(|config| string_field(config, &["vendor", "vendorCode"]))
                .or_else(|| string_field(parameters, &["vendor", "vendorCode"])),
        }
    }
}

/// Per-meter quantity the estimate charges against, mirroring the prepaid
/// hold's rule: media meters reserve what the request declares.
struct MeterQuantity {
    value: DecimalValue,
    unit: &'static str,
    basis: &'static str,
}

const BASIS_REQUESTED: &str = "requested";
const BASIS_SINGLE_UNIT: &str = "single_unit";

fn meter_quantity(
    meter: &BillingMeter,
    quantities: &CommandQuantities,
    prompt_characters: Option<i64>,
) -> MeterQuantity {
    let declared = |value: Option<DecimalValue>, unit: &'static str| MeterQuantity {
        value: value.unwrap_or(DecimalValue::ONE),
        unit,
        basis: if value.is_some() {
            BASIS_REQUESTED
        } else {
            BASIS_SINGLE_UNIT
        },
    };
    match meter {
        BillingMeter::VideoOutputSecond
        | BillingMeter::VideoInputSecond
        | BillingMeter::MusicOutputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputSecond => {
            declared(quantities.duration_seconds, "second")
        }
        BillingMeter::AudioOutputMinute
        | BillingMeter::AudioInputMinute
        | BillingMeter::SttAudioMinute => {
            let minutes = quantities.duration_seconds.and_then(|seconds| {
                seconds
                    .checked_divide(DecimalValue::parse("60").ok()?)
                    .ok()
            });
            declared(minutes, "minute")
        }
        BillingMeter::TtsInputCharacter | BillingMeter::SpeechCharacter => {
            let characters = prompt_characters
                .filter(|count| *count > 0)
                .and_then(|count| DecimalValue::parse(&count.to_string()).ok());
            declared(characters, "character")
        }
        BillingMeter::ImageResult
        | BillingMeter::VideoResult
        | BillingMeter::SfxResult
        | BillingMeter::ApiResult => declared(quantities.result_count, "item"),
        BillingMeter::ImageMegapixel => {
            let megapixels = quantities.pixel_size.and_then(|(width, height)| {
                DecimalValue::parse(&(width * height).to_string())
                    .ok()?
                    .checked_divide(DecimalValue::parse("1000000").ok()?)
                    .ok()
            });
            declared(megapixels, "megapixel")
        }
        BillingMeter::ImagePixel => {
            let pixels = quantities
                .pixel_size
                .and_then(|(width, height)| DecimalValue::parse(&(width * height).to_string()).ok());
            declared(pixels, "pixel")
        }
        _ => MeterQuantity {
            value: DecimalValue::ONE,
            unit: "item",
            basis: BASIS_SINGLE_UNIT,
        },
    }
}

/// Reports whether the meter measures tokens: media commands carry no token
/// budget, so a token-metered model cannot be estimated from the command.
fn is_token_meter(meter: &BillingMeter) -> bool {
    matches!(
        meter,
        BillingMeter::LlmInputToken
            | BillingMeter::LlmOutputToken
            | BillingMeter::LlmReasoningToken
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::LlmCacheWriteToken
            | BillingMeter::LlmCacheStorageTokenHour
            | BillingMeter::EmbeddingInputToken
            | BillingMeter::ImageInputToken
            | BillingMeter::ImageOutputToken
            | BillingMeter::AudioInputToken
            | BillingMeter::AudioOutputToken
            | BillingMeter::VideoInputToken
            | BillingMeter::VideoOutputToken
    )
}

/// Whether the eventual vendor request body will carry a pricing dimension
/// where the gateway's pointer scan can see it.
///
/// The gateway reads pricing dimensions from the **vendor body**; the estimate
/// reads them from the generation command. The two agree only when the vendor
/// adapter forwards the knob, so the estimate injects a dimension only when the
/// dispatched body will actually carry it — otherwise the estimate would price
/// a tier the settlement never uses. Mirrors the vendor adapters' forwarding
/// tables in `sdkwork-generations-provider-adapter` (`dispatch_*` per vendor):
///
/// * `kuaishou` (Kling video): `duration`, no resolution field exists.
/// * `bytedance`/`jimeng` (Seedance): `resolution`/`ratio`/`duration` as
///   top-level fields; the Minimax music face drops `duration` entirely.
/// * `vidu`: `duration` + `resolution`.
/// * `openai` video: `seconds` (read as duration), no size from the video flow.
/// * `google` (Veo): knobs nest under `parameters`, invisible to the pointers.
/// * `suno` music: `duration`. Unknown vendors fail open with both injected.
fn vendor_dimension_visibility(vendor: &str, operation: &str) -> (bool, bool) {
    let is_music = operation == "text_to_music" || operation == "lyrics_to_music";
    match vendor {
        "kuaishou" => (false, true),
        "vidu" => (true, true),
        "bytedance" | "jimeng" => {
            if is_music {
                (false, false)
            } else {
                (true, true)
            }
        }
        "openai" => (false, true),
        "google" => (false, false),
        "suno" => (false, true),
        "minimax" | "mureka" => (false, false),
        _ => (true, true),
    }
}

/// Parses a caller scope id, treating blank or non-numeric values as the
/// platform default (0) so a personal scope still resolves the catalog's
/// standard pricing plan.
fn parse_scope_id(value: &str) -> i64 {
    value.trim().parse::<i64>().unwrap_or(0)
}

/// Estimates credits from the shared pricing catalog. The catalog is an
/// `Arc`-shared pointer-swapped snapshot and the pool connection is checked
/// out per call, so one estimator serves every request.
pub struct SqlGenerationsPricingEstimator {
    catalog: Arc<RefreshableSqlPricingCatalog>,
    pool: PgPool,
    price_service: PriceService,
}

impl SqlGenerationsPricingEstimator {
    pub fn new(catalog: Arc<RefreshableSqlPricingCatalog>, pool: PgPool) -> Self {
        Self {
            catalog,
            pool,
            price_service: PriceService::new(),
        }
    }

    fn resolve_catalog_key(
        &self,
        model: &str,
        vendor_hint: Option<&str>,
    ) -> Result<String, String> {
        let mut keys = self.catalog.model_catalog_keys_by_name(model);
        if keys.is_empty() {
            return Err(format!(
                "model {model:?} is not present in the pricing catalog"
            ));
        }
        if let Some(vendor) = vendor_hint.map(str::trim).filter(|value| !value.is_empty()) {
            let matching: Vec<String> = keys
                .iter()
                .filter(|key| catalog_vendor_code(key).eq_ignore_ascii_case(vendor))
                .cloned()
                .collect();
            // The creative catalog's vendor codes and the pricing catalog's
            // vendor segments share a namespace, but callers may carry an
            // aliased spelling; an empty match falls back to the unfiltered
            // set instead of rejecting a priceable model.
            if !matching.is_empty() {
                keys = matching;
            }
        }
        match keys.as_slice() {
            [key] => Ok(key.clone()),
            many => Err(format!(
                "model {model:?} resolves to {} catalog keys ({}); the estimate refuses to guess",
                many.len(),
                many.join(", ")
            )),
        }
    }

    fn estimate_billing_region(
        &self,
        catalog_key: &str,
        configured_default_region: Option<String>,
    ) -> String {
        if let Some(default) = configured_default_region
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            return default.to_owned();
        }
        if let Some(deployment) = deployment_billing_region() {
            return deployment;
        }
        if billing_region_prefers_china(&*self.catalog, catalog_key) {
            return "cn".to_owned();
        }
        // No account pins a region on the app surface; the generic bucket is
        // the last fallback the catalog itself rates in.
        "global".to_owned()
    }

    fn unpriced(
        &self,
        request: &GenerationPricingEstimateRequest,
        reason: String,
    ) -> GenerationPricingEstimate {
        GenerationPricingEstimate {
            priced: false,
            points_total: "0".to_owned(),
            points_micros: 0,
            currency_code: None,
            model: request.model.clone(),
            catalog_key: None,
            vendor_code: None,
            region_code: None,
            lines: Vec::new(),
            unpriced_reason: Some(reason),
            quoted_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[async_trait::async_trait]
impl GenerationPricingPort for SqlGenerationsPricingEstimator {
    async fn estimate(
        &self,
        request: &GenerationPricingEstimateRequest,
        scope: &GenerationPricingScope,
    ) -> Result<GenerationPricingEstimate, GenerationPricingError> {
        let tenant_id = parse_scope_id(&scope.tenant_id);
        let organization_id = scope
            .organization_id
            .as_deref()
            .map(parse_scope_id)
            .unwrap_or(0);

        let quantities = CommandQuantities::from_parameters(request.parameters.as_ref());
        let prompt_characters = request
            .prompt
            .as_deref()
            .map(|prompt| prompt.chars().count() as i64)
            .filter(|count| *count > 0);

        let Some(model) = request
            .model
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
        else {
            return Ok(self.unpriced(
                request,
                "model is required for a priced estimate".to_owned(),
            ));
        };
        let catalog_key = match self.resolve_catalog_key(&model, quantities.vendor.as_deref()) {
            Ok(key) => key,
            Err(reason) => return Ok(self.unpriced(request, reason)),
        };

        let meters =
            catalog_pricing_meters(&*self.catalog, tenant_id, organization_id, &catalog_key);
        if meters.is_empty() {
            return Ok(self.unpriced(
                request,
                format!("the pricing catalog defines no rates for {catalog_key}"),
            ));
        }

        let configured_default_region = self
            .catalog
            .default_billing_region(tenant_id, organization_id, &catalog_key);
        let region_code = self.estimate_billing_region(&catalog_key, configured_default_region.clone());

        let cash_to_points = load_recharge_settings_model(
            &self.pool,
            AdminMarketingSubject {
                tenant_id,
                organization_id,
                operator_id: 0,
                operator_type: 0,
            },
        )
        .await
        .map_err(|error| {
            GenerationPricingError::Backend(format!(
                "cash-to-points settings are unavailable: {error}"
            ))
        })?;

        let operation = request
            .operation_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| {
                sdkwork_intelligence_generations_service::default_operation_for_modality(
                    &request.modality,
                )
                .to_owned()
            });
        let api_code = generation_mode_api_code(&operation);

        let mut lines: Vec<GenerationPricingEstimateLine> = Vec::new();
        let mut unpriced_reason: Option<String> = None;
        let mut attempted_non_token_meter = false;

        for meter in &meters {
            if is_token_meter(meter) {
                // Token-metered media models cannot be estimated from a
                // command. Keep scanning: some models carry both a result
                // meter and token meters, and the result meter prices.
                unpriced_reason
                    .get_or_insert_with(|| format!("model {catalog_key} is metered per token ({})", meter.code()));
                continue;
            }
            attempted_non_token_meter = true;
            let quantity = meter_quantity(meter, &quantities, prompt_characters);

            // Same tier chain as the billing preflight: video tiers from the
            // catalog's profile tables, image tiers from the single-tier
            // fallback. When neither resolves, the price resolution itself
            // reports the diagnosis — no tier is invented here.
            let tier_decision = self.catalog.video_pricing_tier(
                &catalog_key,
                &api_code,
                meter,
                quantities.resolution.as_deref(),
            );
            let tier_code = tier_decision.tier_code.clone().or_else(|| {
                single_catalog_tier_code(&*self.catalog, tenant_id, organization_id, &catalog_key, meter)
            });

            let (resolution_visible, duration_visible) =
                vendor_dimension_visibility(catalog_vendor_code(&catalog_key), &operation);
            let mut dimensions = PricingDimensionContext::new()
                .with_value("api_code", serde_json::json!(api_code));
            if resolution_visible {
                if let Some(resolution) = quantities.resolution.as_deref() {
                    dimensions.insert("resolution", serde_json::json!(resolution));
                }
            }
            if duration_visible {
                if let Some(duration) = quantities.duration_seconds {
                    dimensions.insert(
                        "duration_seconds",
                        serde_json::json!(duration.to_fixed_string(12).trim_end_matches('0')),
                    );
                }
            }
            if let Some(count) = quantities.result_count {
                dimensions.insert(
                    "result_count",
                    serde_json::json!(count.to_fixed_string(12).trim_end_matches('0')),
                );
            }
            if let Some(quality) = quantities.quality.as_deref() {
                dimensions.insert("quality", serde_json::json!(quality));
            }
            if let Some(tier) = tier_code.as_deref() {
                dimensions.insert("tier_code", serde_json::json!(tier));
            }
            add_meter_dimensions(&mut dimensions, meter, None);

            let resource = ResourceDefinition::new(catalog_key.clone(), meter.clone(), chrono::Utc::now())
                .with_vendor_code(catalog_vendor_code(&catalog_key))
                .with_region_code(region_code.clone())
                .with_default_billing_region(configured_default_region.clone())
                .with_api_code(api_code.to_owned())
                .with_dimensions(dimensions)
                .with_model(model.clone())
                .with_measured_quantity(quantity.value);

            let resolution = self
                .price_service
                .resolve(&*self.catalog, resource)
                .map_err(|error| {
                    GenerationPricingError::Backend(format!(
                        "pricing resolution failed for meter {}: {error}",
                        meter.code()
                    ))
                })?;

            match resolution.status {
                PriceResolutionStatus::Rated | PriceResolutionStatus::Quoted => {
                    let Some(resolved) = resolution.resolved_price.as_ref() else {
                        return Err(GenerationPricingError::Backend(format!(
                            "meter {} resolved without a price",
                            meter.code()
                        )));
                    };
                    let customer_charge = resolution
                        .billing
                        .as_ref()
                        .map(|billing| billing.customer_charge_amount.clone())
                        .unwrap_or_else(|| resolved.customer_charge.clone());
                    let amount = customer_charge.to_fixed_string(12);
                    let currency = customer_charge.currency.clone();
                    let points_micros = crate::ports::token_points_for_charge(
                        &amount,
                        &currency,
                        &cash_to_points,
                    )
                    .map_err(|error| {
                        GenerationPricingError::Backend(format!(
                            "token-points conversion failed: {error}"
                        ))
                    })?;
                    lines.push(GenerationPricingEstimateLine {
                        meter_code: meter.code().to_owned(),
                        quantity: decimal_to_canonical_string(quantity.value),
                        quantity_basis: quantity.basis.to_owned(),
                        quantity_unit: quantity.unit.to_owned(),
                        unit_price: resolved.customer_charge.to_fixed_string(12),
                        currency_code: currency,
                        unit_size: resolution
                            .billing
                            .as_ref()
                            .map(|billing| billing.unit_size.to_fixed_string(0))
                            .unwrap_or_else(|| "1".to_owned()),
                        amount,
                        points: micros_to_points_string(points_micros),
                        points_micros,
                        tier_code: tier_code.clone(),
                    });
                }
                PriceResolutionStatus::NonChargeable => {
                    // Free/not-applicable rates consume no credits; skip.
                }
                _ => {
                    let message = resolution
                        .failure
                        .map(|failure| format!("{failure:?}"))
                        .unwrap_or_else(|| format!("meter {} did not resolve a rate", meter.code()));
                    unpriced_reason.get_or_insert(message);
                }
            }
        }

        if lines.is_empty() && unpriced_reason.is_none() && !attempted_non_token_meter {
            unpriced_reason = Some(format!(
                "model {catalog_key} defines no command-estimable meter"
            ));
        }

        let points_micros = lines.iter().map(|line| line.points_micros).sum::<i64>();
        let currency_code = lines.first().map(|line| line.currency_code.clone());

        Ok(GenerationPricingEstimate {
            priced: unpriced_reason.is_none() && !lines.is_empty(),
            points_total: micros_to_points_string(points_micros),
            points_micros,
            currency_code,
            model: Some(model),
            catalog_key: Some(catalog_key.clone()),
            vendor_code: Some(catalog_vendor_code(&catalog_key).to_owned()),
            region_code: Some(region_code),
            lines,
            unpriced_reason,
            quoted_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn micros_format_as_whole_or_trimmed_points() {
        assert_eq!(micros_to_points_string(0), "0");
        assert_eq!(micros_to_points_string(36_000_000), "36");
        assert_eq!(micros_to_points_string(31_360_000), "31.36");
        assert_eq!(micros_to_points_string(1), "0.000001");
        assert_eq!(micros_to_points_string(1_500_000), "1.5");
    }

    #[test]
    fn generation_mode_maps_motion_mimicry_to_the_catalog_mode() {
        assert_eq!(generation_mode_api_code("motion_mimicry"), "motion_control");
        assert_eq!(generation_mode_api_code("avatar"), "avatar");
        assert_eq!(generation_mode_api_code("text_to_video"), "text_to_video");
    }

    #[test]
    fn quantities_read_generation_config_then_top_level_spellings() {
        let parameters = serde_json::json!({
            "vendor": "bytedance",
            "generationConfig": {
                "aspectRatio": "16:9",
                "resolution": "1080P",
                "durationSeconds": 4,
                "imageCount": 2
            }
        });
        let quantities = CommandQuantities::from_parameters(Some(&parameters));
        assert_eq!(quantities.vendor.as_deref(), Some("bytedance"));
        assert_eq!(quantities.resolution.as_deref(), Some("1080P"));
        assert_eq!(
            quantities.duration_seconds.map(decimal_to_canonical_string),
            Some("4".to_owned())
        );
        assert_eq!(
            quantities.result_count.map(decimal_to_canonical_string),
            Some("2".to_owned())
        );
        assert!(quantities.pixel_size.is_none());
    }

    #[test]
    fn quality_reads_klings_mode_spelling_but_not_videomode() {
        // Kling's std/pro quality knob rides `mode`, exactly like the
        // gateway's quality pointer list.
        let quantities = CommandQuantities::from_parameters(Some(&serde_json::json!({
            "generationConfig": { "mode": "pro" }
        })));
        assert_eq!(quantities.quality.as_deref(), Some("pro"));

        // The composer's reference mode is a different knob and must not be
        // misread as quality.
        let quantities = CommandQuantities::from_parameters(Some(&serde_json::json!({
            "generationConfig": { "videoMode": "first_last" }
        })));
        assert!(quantities.quality.is_none());
    }

    #[test]
    fn quantities_read_custom_image_size_and_vendor_alias_key() {
        let parameters = serde_json::json!({
            "vendorCode": "openai",
            "generationConfig": { "imageWidth": 1024, "imageHeight": 1024 }
        });
        let quantities = CommandQuantities::from_parameters(Some(&parameters));
        assert_eq!(quantities.pixel_size, Some((1024, 1024)));
        assert_eq!(quantities.vendor.as_deref(), Some("openai"));
    }

    #[test]
    fn quantities_default_to_empty_without_parameters() {
        let quantities = CommandQuantities::from_parameters(None);
        assert!(quantities.resolution.is_none());
        assert!(quantities.duration_seconds.is_none());
        assert!(quantities.result_count.is_none());
        assert!(quantities.vendor.is_none());
    }

    #[test]
    fn media_meters_reserve_the_declared_quantity() {
        let quantities = CommandQuantities::from_parameters(Some(&serde_json::json!({
            "generationConfig": { "durationSeconds": 4, "imageCount": 3 }
        })));
        let video = meter_quantity(&BillingMeter::VideoOutputSecond, &quantities, None);
        assert_eq!(decimal_to_canonical_string(video.value), "4");
        assert_eq!(video.unit, "second");
        assert_eq!(video.basis, BASIS_REQUESTED);

        let images = meter_quantity(&BillingMeter::ImageResult, &quantities, None);
        assert_eq!(decimal_to_canonical_string(images.value), "3");
        assert_eq!(images.unit, "item");

        // Minute meters fold seconds into fractional minutes so a 12-second
        // request does not freeze a full minute of credit.
        let minutes = meter_quantity(&BillingMeter::AudioOutputMinute, &quantities, None);
        assert_eq!(minutes.unit, "minute");
    }

    #[test]
    fn undeclared_quantities_fall_back_to_a_single_unit_lower_bound() {
        let quantities = CommandQuantities::from_parameters(None);
        let video = meter_quantity(&BillingMeter::VideoOutputSecond, &quantities, None);
        assert_eq!(decimal_to_canonical_string(video.value), "1");
        assert_eq!(video.basis, BASIS_SINGLE_UNIT);

        let speech = meter_quantity(&BillingMeter::SpeechCharacter, &quantities, Some(120));
        assert_eq!(decimal_to_canonical_string(speech.value), "120");
        assert_eq!(speech.unit, "character");
        assert_eq!(speech.basis, BASIS_REQUESTED);
    }

    #[test]
    fn token_meters_are_recognized_for_the_unpriceable_diagnosis() {
        assert!(is_token_meter(&BillingMeter::ImageOutputToken));
        assert!(is_token_meter(&BillingMeter::LlmInputToken));
        assert!(!is_token_meter(&BillingMeter::VideoOutputSecond));
        assert!(!is_token_meter(&BillingMeter::ImageResult));
    }

    #[test]
    fn dimension_visibility_mirrors_the_vendor_forwarding_tables() {
        // Kling's video body carries duration but no resolution field.
        assert_eq!(vendor_dimension_visibility("kuaishou", "text_to_video"), (false, true));
        // Seedance forwards both after the adapter fix.
        assert_eq!(vendor_dimension_visibility("bytedance", "text_to_video"), (true, true));
        assert_eq!(vendor_dimension_visibility("bytedance", "image_to_video"), (true, true));
        // The Minimax music face drops duration entirely.
        assert_eq!(vendor_dimension_visibility("bytedance", "text_to_music"), (false, false));
        // Veo nests its knobs under `parameters`, invisible to the pointers.
        assert_eq!(vendor_dimension_visibility("google", "text_to_video"), (false, false));
        // OpenAI video carries seconds but no size from the video flow.
        assert_eq!(vendor_dimension_visibility("openai", "text_to_video"), (false, true));
        // Unknown vendors fail open with the fuller estimate.
        assert_eq!(vendor_dimension_visibility("vidu", "text_to_video"), (true, true));
    }

    #[test]
    fn scope_ids_parse_with_a_platform_zero_default() {
        assert_eq!(parse_scope_id(" 42 "), 42);
        assert_eq!(parse_scope_id("not-a-number"), 0);
        assert_eq!(parse_scope_id(""), 0);
    }
}
