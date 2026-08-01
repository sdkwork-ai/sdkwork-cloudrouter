use super::classification::normalize_key;
use super::{
    BillingMode, BillingQuantitySource, InvocationBilling, InvocationClassification,
    InvocationClassificationRequest, InvocationError, InvocationErrorKind, InvocationResource,
    InvocationResourceClassifier, InvocationRouting, InvocationSurface, ResourceType,
    StickyRouting,
};
use crate::application::find_builtin_ai_route;
use crate::domain::{
    AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    RoutingCapability,
};

#[derive(Debug, Clone, Default)]
pub struct ProviderNativeResourceClassifier;

impl InvocationResourceClassifier for ProviderNativeResourceClassifier {
    fn classify(
        &self,
        request: &InvocationClassificationRequest,
    ) -> Result<InvocationClassification, InvocationError> {
        let supplier_code = request
            .supplier_code
            .as_deref()
            .and_then(normalize_supplier_code)
            .ok_or_else(|| {
                InvocationError::new(
                    InvocationErrorKind::ResourceClassification,
                    "provider-native classification requires supplier_code",
                )
            })?;
        let spec = classify_provider_native_spec(&supplier_code, request);
        let resource = InvocationResource {
            surface: InvocationSurface::ProviderNative,
            provider_family: request.provider_family.clone(),
            supplier_code: Some(supplier_code),
            route_key: spec.route_key.clone(),
            api_code: spec.api_code.clone(),
            endpoint_key: Some(spec.endpoint_key.clone()),
            operation_id: request.operation_id.clone(),
            resource_type: ResourceType::ProviderNativeApi,
            resource_id: None,
            parent_resource_type: None,
            parent_resource_id: None,
            capability: request.capability.unwrap_or(spec.capability),
            model_requirement: spec.model_requirement,
            requested_model: spec.requested_model.clone(),
            requested_model_catalog_key: spec.requested_model_catalog_key.clone(),
            provider_native_model: spec.provider_native_model.clone(),
        };
        let billing = external_usage_line_billing(spec.meter.clone());
        let mut routing = InvocationRouting::new(spec.strategy, spec.sticky.clone());
        routing.failure_strategy = spec.failure_strategy;
        Ok(InvocationClassification::new(resource, billing, routing))
    }
}

#[derive(Debug, Clone)]
struct ProviderNativeRouteSpec {
    route_key: String,
    api_code: String,
    endpoint_key: String,
    capability: RoutingCapability,
    meter: Option<BillingMeter>,
    model_requirement: AiRouteModelRequirement,
    strategy: AiRouteStrategy,
    failure_strategy: AiRouteFailureStrategy,
    sticky: Option<StickyRouting>,
    requested_model: Option<String>,
    requested_model_catalog_key: Option<String>,
    provider_native_model: Option<String>,
}

fn classify_provider_native_spec(
    supplier_code: &str,
    request: &InvocationClassificationRequest,
) -> ProviderNativeRouteSpec {
    if let Some(api_code) =
        provider_native_api_code_from_standard_path(supplier_code, &request.path)
    {
        if let Some(route) = find_builtin_ai_route(&api_code) {
            let provider_native_model = provider_native_model_from_standard_path(&request.path);
            return ProviderNativeRouteSpec {
                route_key: route.route_key.to_owned(),
                api_code: route.api_code.to_owned(),
                endpoint_key: request
                    .endpoint_key
                    .as_deref()
                    .and_then(normalize_endpoint_key)
                    .unwrap_or_else(|| route.api_code.to_owned()),
                capability: route.capability,
                meter: Some(route.billing_meter.clone()),
                model_requirement: route.model_requirement,
                strategy: route.route_strategy,
                failure_strategy: route.failure_strategy,
                sticky: route.sticky_object_type.map(StickyRouting::create),
                requested_model: provider_native_model.clone(),
                requested_model_catalog_key: provider_native_model
                    .as_ref()
                    .map(|model| canonical_provider_native_catalog_key(supplier_code, model)),
                provider_native_model,
            };
        }
    }

    let endpoint_key = request
        .endpoint_key
        .as_deref()
        .and_then(normalize_endpoint_key)
        .unwrap_or_else(|| infer_endpoint_key(&request.path));
    let route_key = fallback_route_key(supplier_code, &endpoint_key);
    let builtin = find_builtin_ai_route(&route_key);
    ProviderNativeRouteSpec {
        route_key: builtin
            .map(|route| route.route_key.to_owned())
            .unwrap_or_else(|| route_key.clone()),
        api_code: builtin
            .map(|route| route.api_code.to_owned())
            .unwrap_or_else(|| route_key.clone()),
        endpoint_key: builtin
            .map(|route| route.api_code.to_owned())
            .unwrap_or(endpoint_key),
        capability: builtin
            .map(|route| route.capability)
            .or(request.capability)
            .unwrap_or(RoutingCapability::Network),
        meter: builtin.map(|route| route.billing_meter.clone()),
        model_requirement: builtin
            .map(|route| route.model_requirement)
            .unwrap_or(AiRouteModelRequirement::Optional),
        strategy: builtin
            .map(|route| route.route_strategy)
            .unwrap_or(AiRouteStrategy::StatelessFailClosed),
        failure_strategy: builtin
            .map(|route| route.failure_strategy)
            .unwrap_or(AiRouteFailureStrategy::FailClosed),
        sticky: builtin.and_then(|route| route.sticky_object_type.map(StickyRouting::create)),
        requested_model: None,
        requested_model_catalog_key: None,
        provider_native_model: None,
    }
}

fn external_usage_line_billing(meter: Option<BillingMeter>) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::ExternalUsageLine,
        meter,
        quantity_source: BillingQuantitySource::AdapterUsageLines,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn provider_native_api_code_from_standard_path(
    supplier_code: &str,
    standard_path: &str,
) -> Option<String> {
    let provider = normalize_provider_match_key(supplier_code);
    let path = normalize_provider_api_path(supplier_code, provider.as_str(), standard_path);
    let api_code = match provider.as_str() {
        "anthropic" if path == "/v1/claude-code/sessions" => "anthropic.claude_code",
        "google" | "gemini" if path == "/v1beta/live/sessions" => "gemini.live",
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generatecontent") => {
            "gemini.generate_content"
        }
        "google" | "gemini"
            if gemini_model_action_matches(path.as_str(), "streamgeneratecontent") =>
        {
            "gemini.stream_generate_content"
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "embedcontent") => {
            "gemini.embed_content"
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generateimages") => {
            if path.contains("/nano-banana:") {
                "gemini.nano_banana.image_generation"
            } else {
                "gemini.image_generation"
            }
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generatevideos") => {
            "gemini.video_generation"
        }
        "kling" if path == "/v1/videos/text2video" => "kling.text_to_video",
        "kling" if path == "/v1/videos/image2video" => "kling.image_to_video",
        "kling" if path == "/v1/images/generations" => "kling.image_generation",
        "kling" if task_query_path_matches(path.as_str()) => "kling.task_query",
        "jimeng" if path == "/v1/images/generations" => "jimeng.image_generation",
        "jimeng" if path == "/v1/videos/generations" => "jimeng.video_generation",
        "jimeng" if task_query_path_matches(path.as_str()) => "jimeng.task_query",
        "volcengine" if path == "/v1/images/generations" => "volcengine.image_generation",
        "volcengine" if path == "/v1/videos/generations" => "volcengine.video_generation",
        "volcengine" if task_query_path_matches(path.as_str()) => "volcengine.task_query",
        "minimax" if path == "/v1/music_generation" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generations" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generation" => "minimax.music_generation",
        "vidu" if path == "/ent/v2/reference2image" => "vidu.reference_to_image",
        "vidu" if path == "/ent/v2/start-end2video" => "vidu.start_end_to_video",
        "tencent.cloud" if path == "/vidu/ent/v2/reference2image" => "vidu.reference_to_image",
        "tencent.cloud" if path == "/vidu/ent/v2/start-end2video" => "vidu.start_end_to_video",
        _ => return None,
    };
    Some(api_code.to_owned())
}

fn gemini_model_action_matches(path: &str, action: &str) -> bool {
    path.starts_with("/v1beta/models/") && path.ends_with(&format!(":{action}"))
}

fn task_query_path_matches(path: &str) -> bool {
    path == "/v1/tasks/{task_id}"
        || path
            .strip_prefix("/v1/tasks/")
            .is_some_and(|task_id| !task_id.trim().is_empty())
}

fn provider_native_model_from_standard_path(path: &str) -> Option<String> {
    path.trim_matches('/')
        .strip_prefix("v1beta/models/")
        .and_then(|suffix| suffix.split_once(':').map(|(model, _)| model))
        .or_else(|| {
            path.trim_matches('/')
                .strip_prefix("v1/models/")
                .and_then(|suffix| suffix.split_once(':').map(|(model, _)| model))
        })
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn canonical_provider_native_catalog_key(
    supplier_code: &str,
    provider_native_model: &str,
) -> String {
    let supplier_code = supplier_code.trim();
    let provider_native_model = provider_native_model.trim();
    let provider_prefix = provider_native_model
        .split('/')
        .map(str::trim)
        .find(|part| !part.is_empty());
    if provider_prefix == Some(supplier_code) {
        provider_native_model.to_owned()
    } else {
        format!("{supplier_code}/{provider_native_model}")
    }
}

fn normalize_provider_api_path(
    supplier_code: &str,
    provider_match_key: &str,
    standard_path: &str,
) -> String {
    let path = normalize_standard_api_path(standard_path);
    let provider_path_prefix = format!(
        "/{}/",
        supplier_code.trim().trim_matches('/').to_ascii_lowercase()
    );
    if let Some(suffix) = path.strip_prefix(&provider_path_prefix) {
        return format!("/{suffix}");
    }
    path.strip_prefix(&format!("/{provider_match_key}/"))
        .map(|suffix| format!("/{suffix}"))
        .unwrap_or(path)
}

fn normalize_standard_api_path(value: &str) -> String {
    let value = value.trim();
    let value = if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    };
    value.to_ascii_lowercase()
}

fn normalize_provider_match_key(value: &str) -> String {
    value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', '-', ':'], ".")
        .trim_matches('.')
        .to_owned()
}

fn normalize_supplier_code(value: &str) -> Option<String> {
    let supplier_code = value.trim().trim_matches('/').to_ascii_lowercase();
    (!supplier_code.is_empty()).then_some(supplier_code)
}

fn normalize_endpoint_key(value: &str) -> Option<String> {
    let endpoint_key = normalize_key(value);
    (!endpoint_key.is_empty()).then_some(endpoint_key)
}

fn fallback_route_key(supplier_code: &str, endpoint_key: &str) -> String {
    if endpoint_key.starts_with(&format!("{supplier_code}.")) {
        endpoint_key.to_owned()
    } else {
        format!("{supplier_code}.{endpoint_key}")
    }
}

fn infer_endpoint_key(path: &str) -> String {
    path.trim_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .next_back()
        .map(normalize_key)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "native_api".to_owned())
}
