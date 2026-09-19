use super::classification::normalize_key;
use super::{
    BillingMode, BillingQuantitySource, InvocationBilling, InvocationClassification,
    InvocationClassificationRequest, InvocationError, InvocationErrorKind, InvocationResource,
    InvocationResourceClassifier, InvocationRouting, InvocationSurface, ResourceType, RouteKind,
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
            route_kind: spec.route_kind,
            requested_model: spec.requested_model.clone(),
            requested_model_catalog_key: spec.requested_model_catalog_key.clone(),
            resolved_vendor_codes: Vec::new(),
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
    /// 内建路由的类型标记由 taxonomy 的 `model_requirement` 推导：
    /// `Required`（anthropic.messages / gemini.* 等模型类路由）保持 `None`，
    /// 交由统一推导（`RouteKind::of`，在模型提取后执行）与资源管理持久化
    /// 标记决定；`Optional`/`Ignored` 及未知回退路径维持 API 资源类。
    route_kind: Option<RouteKind>,
}

fn route_kind_for_model_requirement(
    model_requirement: AiRouteModelRequirement,
) -> Option<RouteKind> {
    match model_requirement {
        AiRouteModelRequirement::Required => None,
        AiRouteModelRequirement::Optional | AiRouteModelRequirement::Ignored => {
            Some(RouteKind::Api)
        }
    }
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
                route_kind: route_kind_for_model_requirement(route.model_requirement),
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
        // 未知回退路径 fail-closed：保持 API 资源类直通，不参与模型路由。
        route_kind: Some(RouteKind::Api),
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

/// Maps a provider-native inbound path to its catalogued `api_code`.
///
/// Kling publishes two path families for the same abilities and the open-api
/// contract declares both, so both must classify: the Kling-native names
/// (`/v1/videos/text2video`, `/v1/videos/image2video`) that callers speaking
/// Kling's own protocol use verbatim, and the RESTful names the gateway
/// advertises in `generated_open_http_route_manifest`
/// (`/v1/videos/generations`, `/v1/videos/generations/{task_id}`). Only the
/// native names used to be recognised, so the published
/// `POST /kling/v1/videos/generations` fell through to the catch-all `None`
/// arm and failed closed with 50201 "no upstream account routes are
/// configured" even though the account, credential, group membership and
/// resource grant were all present.
///
/// Volcengine has the mirror-image problem: the contract publishes Ark's own
/// paths (`/api/v3/contents/generations/tasks`, `/api/v3/images/generations`)
/// — which are what the seeded account actually serves, its base URL being
/// `https://ark.cn-beijing.volces.com` — while only the OpenAI-shaped
/// `/v1/videos/generations` and `/v1/images/generations` were recognised. A
/// vendor-native request is relayed verbatim (`provider_request`), so the
/// OpenAI-shaped names reach Ark as 404 while the published Ark names never
/// reach the classifier at all. Both families now classify: the Ark names
/// because they are the correct ones, the OpenAI-shaped names because callers
/// may already speak them.
///
/// Every arm shape here is modelled by
/// `tools/check-cloudrouter-ai-routing-consistency.mjs`, which refuses to pass
/// when it meets a shape it cannot evaluate — an arm the gate cannot read is an
/// arm whose drift nobody notices.
///
/// The `sfx.sound` arms cover sound effects (音效). The four sfx vendors each
/// answer a different path; all of them resolve onto the one `sfx.sound` route
/// so the capability has a single reachable endpoint code. `elevenlabs` is
/// deliberately absent from those arms: it keeps its own vendor-native
/// `elevenlabs.sound_generation` classification, which is the more specific one
/// and must win.
///
/// This map is duplicated in the edge runtime
/// (`crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`); the same gate
/// compares the two arm sets, so an arm added to only one side fails the build
/// rather than silently dropping the passthrough.
fn provider_native_api_code_from_standard_path(
    supplier_code: &str,
    standard_path: &str,
) -> Option<String> {
    let provider = normalize_provider_match_key(supplier_code);
    let path = normalize_provider_api_path(supplier_code, provider.as_str(), standard_path);
    // --- Vendor-native surfaces whose models declare
    // `apiFormat = vendor_native`. Without these arms the catch-all below
    // synthesises `<vendor>.<last.path.segment>` (for example
    // `alibaba.video.synthesis`), which matches no taxonomy route, so the
    // classification carries `meter: None` and the fail-closed pricing
    // preflight refuses the request even though the resource grant, the
    // account and the credential are all present.
    //
    // Only endpoints a `vendor_native` model actually binds to are listed.
    // Each vendor's `openai_compatible` models keep the generic face, so
    // `alibaba` chat / embedding / image and `zhipu` chat / embedding /
    // image deliberately stay out.
    let api_code = match provider.as_str() {
        "anthropic" if path == "/v1/claude-code/sessions" => "anthropic.claude_code",
        "anthropic" if path == "/v1/messages" => "anthropic.messages",
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
        "kling" if path == "/v1/videos/generations" => "kling.text_to_video",
        "kling" if path == "/v1/videos/avatar" => "kling.avatar",
        "kling" if path == "/v1/videos/motion-control" => "kling.motion_control",
        "kling" if path == "/v1/videos/image2video" => "kling.image_to_video",
        "kling" if path == "/v1/images/generations" => "kling.image_generation",
        "kling" if task_poll_path_matches(path.as_str(), "v1/tasks") => "kling.task_query",
        "kling" if task_poll_path_matches(path.as_str(), "v1/videos/generations") => {
            "kling.task_query"
        }
        "jimeng" if path == "/v1/images/generations" => "jimeng.image_generation",
        "jimeng" if path == "/v1/videos/generations" => "jimeng.video_generation",
        "jimeng" if task_poll_path_matches(path.as_str(), "v1/tasks") => "jimeng.task_query",
        "volcengine" if path == "/v1/images/generations" => "volcengine.image_generation",
        "volcengine" if path == "/v1/videos/generations" => "volcengine.video_generation",
        "volcengine" if path == "/api/v3/audio/speech" => "volcengine.speech",
        "volcengine" if path == "/api/v3/images/generations" => "volcengine.image_generation",
        "volcengine" if path == "/api/v3/contents/generations/tasks" => {
            "volcengine.video_generation"
        }
        "volcengine" if task_poll_path_matches(path.as_str(), "v1/tasks") => {
            "volcengine.task_query"
        }
        "volcengine"
            if task_poll_path_matches(path.as_str(), "api/v3/contents/generations/tasks") =>
        {
            "volcengine.task_query"
        }
        "elevenlabs" if path == "/v1/text-to-speech/{voice_id}" => "elevenlabs.text_to_speech",
        "elevenlabs" if path.starts_with("/v1/text-to-speech/") => "elevenlabs.text_to_speech",
        "elevenlabs" if path == "/v1/sound-generation" => "elevenlabs.sound_generation",
        "kling" if path == "/v1/sound/generate" => "sfx.sound",
        "stability_ai" if path == "/v1/sound/generate" => "sfx.sound",
        "stability_ai" if path == "/v2beta/audio/stable-audio-2/text-to-audio" => "sfx.sound",
        "vidu" if path == "/ent/v2/text2audio" => "sfx.sound",
        "vidu" if path == "/ent/v2/timing2audio" => "sfx.sound",
        "minimax" if path == "/v1/music_generation" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generations" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generation" => "minimax.music_generation",
        "suno" if path == "/v1/music/generations" => "suno.music_generation",
        "suno" if task_poll_path_matches(path.as_str(), "v1/music/generations") => {
            "suno.music_task_query"
        }
        "vidu" if path == "/ent/v2/reference2image" => "vidu.reference_to_image",
        "alibaba"
            if path == "/api/v1/services/aigc/video-generation/video-synthesis" =>
        {
            "alibaba.video_generation"
        }
        "alibaba" if task_poll_path_matches(path.as_str(), "api/v1/tasks") => {
            "alibaba.video_generation_task_query"
        }
        "luma_ai" if path == "/dream-machine/v1/generations" => "luma_ai.video_generation",
        "luma_ai"
            if task_poll_path_matches(path.as_str(), "dream-machine/v1/generations") =>
        {
            "luma_ai.video_generation_task_query"
        }
        "pixverse" if path == "/openapi/v2/video/text/generate" => "pixverse.video_generation",
        "pixverse" if task_poll_path_matches(path.as_str(), "openapi/v2/video/result") => {
            "pixverse.video_generation_task_query"
        }
        "zhipu" if path == "/api/paas/v4/videos/generations" => "zhipu.video_generation",
        "zhipu" if task_poll_path_matches(path.as_str(), "api/paas/v4/async-result") => {
            "zhipu.video_generation_task_query"
        }
        "mureka" if path == "/v1/song/generate" => "mureka.music_generation",
        "mureka" if task_poll_path_matches(path.as_str(), "v1/song/query") => {
            "mureka.music_generation_task_query"
        }
        "baidu" if path == "/v2/chat/completions" => "baidu.chat_completions",
        "runway" | "runwayml" if path == "/v1/text_to_image" => "runway.image_generation",
        "runway" | "runwayml" if task_poll_path_matches(path.as_str(), "v1/tasks") => {
            "runway.task_query"
        }
        "stability_ai" | "stability"
            if path.starts_with("/v2beta/stable-image/generate/") =>
        {
            "stability_ai.image_generation"
        }
        "black_forest_labs" | "bfl" if path == "/v1/get_result" => "black_forest_labs.task_query",
        "black_forest_labs" | "bfl" if path.starts_with("/v1/flux-") => {
            "black_forest_labs.image_generation"
        }
        "vidu" if path == "/ent/v2/template" => "vidu.motion_sync",
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

/// Matches the task-polling path of a vendor family, for example
/// `v1/music/generations`, `v1/videos/generations` or
/// `api/v3/contents/generations/tasks`.
///
/// The family carries its own prefix because the vendors disagree on it: the
/// OpenAI-shaped families answer under `/v1/...` (Kling image tasks, Suno
/// music) while Volcengine's Ark answers the generation task under
/// `/api/v3/contents/generations/tasks`. Every call site passes the full family
/// so there is exactly one poll predicate to reason about (and exactly one for
/// the consistency gate to model — three near-identical helpers used to hide
/// the arms behind names the gate could not resolve).
///
/// Both the literal template and a concrete id are accepted because the
/// inbound path arrives either pre-substituted or templated depending on
/// whether the router resolved a path parameter.
fn task_poll_path_matches(path: &str, family: &str) -> bool {
    let prefix = format!("/{family}/");
    path == format!("/{family}/{{task_id}}")
        || path
            .strip_prefix(prefix.as_str())
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
        .rfind(|segment| !segment.is_empty())
        .map(normalize_key)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "native_api".to_owned())
}

#[cfg(test)]
mod tests {
    use axum::http::Method;

    use super::*;

    fn classify_post(path: &str, supplier_code: &str) -> InvocationClassification {
        let request = InvocationClassificationRequest::new(Method::POST, path)
            .with_supplier_code(supplier_code);
        ProviderNativeResourceClassifier
            .classify(&request)
            .expect("provider-native classification")
    }

    #[test]
    fn anthropic_v1_messages_classifies_as_builtin_chat_route() {
        let classification = classify_post("/v1/messages", "anthropic");
        assert_eq!("anthropic.messages", classification.resource.route_key);
        assert_eq!("anthropic.messages", classification.resource.api_code);
        assert_eq!(
            Some(BillingMeter::LlmInputToken),
            classification.billing.meter
        );
        assert_eq!(RoutingCapability::Chat, classification.resource.capability);
        assert_eq!(
            AiRouteModelRequirement::Required,
            classification.resource.model_requirement
        );
        assert_eq!(
            AiRouteStrategy::StatelessFailover,
            classification.routing.strategy
        );
        assert_eq!(
            AiRouteFailureStrategy::Failover,
            classification.routing.failure_strategy
        );
    }

    #[test]
    fn model_required_builtin_routes_leave_route_kind_to_unified_derivation() {
        // taxonomy 声明 Required 的模型类路由（anthropic.messages）不得再被
        // 分类器硬编码为 API 资源类——历史行为会把请求推进无模型账号路由，
        // 定价预检按 route_key 找价导致 price_not_found(50201)。
        let classification = classify_post("/anthropic/v1/messages", "anthropic");
        assert_eq!(
            None, classification.resource.route_kind,
            "Required 模型类路由必须交由 RouteKind::of 统一推导"
        );

        let classification = classify_post(
            "/google/v1beta/models/gemini-2.5-pro:generateContent",
            "google",
        );
        assert_eq!("gemini.generate_content", classification.resource.route_key);
        assert_eq!(None, classification.resource.route_kind);
    }

    #[test]
    fn optional_and_ignored_builtin_routes_stay_api_resource_class() {
        // media_task（Optional）与 account（Ignored）路由维持 API 资源类，
        // 即使请求体携带模型名也不参与模型路由。
        let classification = classify_post("/kling/v1/videos/text2video", "kling");
        assert_eq!("kling.text_to_video", classification.resource.route_key);
        assert_eq!(Some(RouteKind::Api), classification.resource.route_kind);

        let classification = classify_post("/kling/v1/tasks/task_123", "kling");
        assert_eq!("kling.task_query", classification.resource.route_key);
        assert_eq!(Some(RouteKind::Api), classification.resource.route_kind);
    }

    /// The open-api contract publishes `/kling/v1/videos/generations` and
    /// `/kling/v1/videos/generations/{task_id}` alongside the Kling-native
    /// `/v1/videos/text2video`. A path the gateway advertises but the
    /// classifier cannot name fails closed with 50201
    /// "no upstream account routes are configured", even when the account,
    /// credential, group membership and resource grant all exist — so both
    /// families must resolve to the same route keys.
    #[test]
    fn kling_restful_video_paths_classify_like_the_native_ones() {
        let native = classify_post("/kling/v1/videos/text2video", "kling");
        assert_eq!("kling.text_to_video", native.resource.route_key);

        let restful = classify_post("/kling/v1/videos/generations", "kling");
        assert_eq!("kling.text_to_video", restful.resource.route_key);
        assert_eq!(Some(RouteKind::Api), restful.resource.route_kind);

        for path in [
            "/kling/v1/videos/generations/{task_id}",
            "/kling/v1/videos/generations/task_abc123",
        ] {
            let request =
                InvocationClassificationRequest::new(Method::GET, path).with_supplier_code("kling");
            let poll = ProviderNativeResourceClassifier
                .classify(&request)
                .expect("kling task polling classification");
            assert_eq!("kling.task_query", poll.resource.route_key, "for {path}");
            assert_eq!(Some(RouteKind::Api), poll.resource.route_kind, "for {path}");
        }
    }

    /// Ark — the account's real base URL is `https://ark.cn-beijing.volces.com`,
    /// and a vendor-native request is relayed verbatim. The contract therefore
    /// publishes Ark's own paths, and both the create call and the task poll
    /// the generation adapter issues must classify; the OpenAI-shaped aliases
    /// stay recognised for callers already speaking them.
    #[test]
    fn volcengine_ark_paths_classify_alongside_the_openai_shaped_aliases() {
        for path in [
            "/volcengine/api/v3/contents/generations/tasks",
            "/volcengine/v1/videos/generations",
        ] {
            let classification = classify_post(path, "volcengine");
            assert_eq!(
                "volcengine.video_generation", classification.resource.route_key,
                "for {path}"
            );
        }

        let classification = classify_post("/volcengine/api/v3/images/generations", "volcengine");
        assert_eq!(
            "volcengine.image_generation",
            classification.resource.route_key
        );

        for path in [
            "/volcengine/api/v3/contents/generations/tasks/{task_id}",
            "/volcengine/api/v3/contents/generations/tasks/task_abc123",
        ] {
            let request = InvocationClassificationRequest::new(Method::GET, path)
                .with_supplier_code("volcengine");
            let poll = ProviderNativeResourceClassifier
                .classify(&request)
                .expect("volcengine task polling classification");
            assert_eq!(
                "volcengine.task_query", poll.resource.route_key,
                "for {path}"
            );
        }
    }

    #[test]
    fn unknown_fallback_route_keeps_explicit_api_route_kind() {
        let classification = classify_post("/v1/totally-unknown", "anthropic");
        assert_eq!(
            Some(RouteKind::Api),
            classification.resource.route_kind,
            "未知回退路径 fail-closed：显式 API 资源类，不参与模型路由"
        );
    }

    #[test]
    fn anthropic_messages_with_supplier_prefix_still_hits_the_builtin_route() {
        // 公共代理与内部转发会分别以 /anthropic/v1/messages 与
        // /v1/messages 形态到达；supplier 前缀必须被剥掉后命中同一路由。
        let classification = classify_post("/anthropic/v1/messages", "anthropic");
        assert_eq!("anthropic.messages", classification.resource.route_key);
        assert_eq!(
            Some(BillingMeter::LlmInputToken),
            classification.billing.meter
        );
    }

    #[test]
    fn unknown_anthropic_path_still_falls_back_fail_closed() {
        let classification = classify_post("/v1/totally-unknown", "anthropic");
        assert_eq!(
            "anthropic.totally.unknown",
            classification.resource.route_key
        );
        assert_eq!(None, classification.billing.meter);
        assert_eq!(
            RoutingCapability::Network,
            classification.resource.capability
        );
        assert_eq!(
            AiRouteStrategy::StatelessFailClosed,
            classification.routing.strategy
        );
    }

    #[test]
    fn claude_code_route_is_unchanged() {
        let classification = classify_post("/v1/claude-code/sessions", "anthropic");
        assert_eq!("anthropic.claude_code", classification.resource.route_key);
        assert_eq!(
            Some(BillingMeter::LlmInputToken),
            classification.billing.meter
        );
    }

    #[test]
    fn gemini_stream_generate_content_route_is_unchanged() {
        let classification = classify_post(
            "/v1beta/models/gemini-2.5-pro:streamGenerateContent",
            "google",
        );
        assert_eq!(
            "gemini.stream_generate_content",
            classification.resource.route_key
        );
    }

    #[test]
    fn runway_image_and_task_paths_classify_like_the_native_ones() {
        let image = classify_post("/v1/text_to_image", "runway");
        assert_eq!("runway.image_generation", image.resource.route_key);
        assert_eq!(Some(BillingMeter::ImageResult), image.billing.meter);

        let image_ml = classify_post("/v1/text_to_image", "runwayml");
        assert_eq!("runway.image_generation", image_ml.resource.route_key);

        let task = classify_post("/v1/tasks/task_abc123", "runway");
        assert_eq!("runway.task_query", task.resource.route_key);
        assert_eq!(Some(BillingMeter::ApiRequest), task.billing.meter);
    }

    #[test]
    fn black_forest_labs_flux_paths_classify_like_the_native_ones() {
        let image = classify_post("/v1/flux-2-pro", "black_forest_labs");
        assert_eq!(
            "black_forest_labs.image_generation",
            image.resource.route_key
        );
        assert_eq!(Some(BillingMeter::ImageResult), image.billing.meter);

        let image_bfl = classify_post("/v1/flux-2-pro", "bfl");
        assert_eq!(
            "black_forest_labs.image_generation",
            image_bfl.resource.route_key
        );

        let task = classify_post("/v1/get_result?id=abc", "black_forest_labs");
        assert_eq!("black_forest_labs.task_query", task.resource.route_key);
        assert_eq!(Some(BillingMeter::ApiRequest), task.billing.meter);
    }

    #[test]
    fn stability_ai_stable_image_generate_path_classifies_like_the_native_one() {
        let core = classify_post("/v2beta/stable-image/generate/core", "stability_ai");
        assert_eq!(
            "stability_ai.image_generation",
            core.resource.route_key
        );
        assert_eq!(Some(BillingMeter::ImageResult), core.billing.meter);

        let ultra = classify_post("/v2beta/stable-image/generate/ultra", "stability");
        assert_eq!(
            "stability_ai.image_generation",
            ultra.resource.route_key
        );
        assert_eq!(Some(BillingMeter::ImageResult), ultra.billing.meter);
    }

    /// The vendors whose catalog models declare `apiFormat = vendor_native` must
    /// classify onto their own catalogued route, not onto the catch-all's
    /// synthesised `<vendor>.<last.path.segment>` key.
    ///
    /// The synthesised key matches no taxonomy entry, so the classification
    /// carries `meter: None` and `StatelessFailClosed`, and the fail-closed
    /// pricing preflight then refuses a request whose account, credential,
    /// group membership and resource grant are all present. `alibaba` and
    /// `zhipu` are the pairs that make the point: their *video* models are
    /// native while their chat / embedding / image models are
    /// `openai_compatible`, so only the video path may classify and the others
    /// must keep falling through to the generic face.
    #[test]
    fn vendor_native_models_classify_onto_their_own_endpoints() {
        let native_video = [
            (
                "alibaba",
                "/api/v1/services/aigc/video-generation/video-synthesis",
                "alibaba.video_generation",
            ),
            (
                "luma_ai",
                "/dream-machine/v1/generations",
                "luma_ai.video_generation",
            ),
            (
                "pixverse",
                "/openapi/v2/video/text/generate",
                "pixverse.video_generation",
            ),
            (
                "zhipu",
                "/api/paas/v4/videos/generations",
                "zhipu.video_generation",
            ),
        ];
        for (vendor, path, route_key) in native_video {
            let classification = classify_post(path, vendor);
            assert_eq!(route_key, classification.resource.route_key, "for {vendor}");
            assert_eq!(
                Some(BillingMeter::VideoResult),
                classification.billing.meter,
                "for {vendor}"
            );
        }

        let music = classify_post("/v1/song/generate", "mureka");
        assert_eq!("mureka.music_generation", music.resource.route_key);
        assert_eq!(
            Some(BillingMeter::MusicOutputSecond),
            music.billing.meter
        );

        let chat = classify_post("/v2/chat/completions", "baidu");
        assert_eq!("baidu.chat_completions", chat.resource.route_key);
        assert_eq!(
            Some(BillingMeter::LlmInputToken),
            chat.billing.meter
        );
    }

    /// The async poll each of those vendors exposes is its own routable
    /// endpoint. Without an arm the poll falls through to the synthesised key
    /// and loses its meter, so a caller that submits a task can never collect
    /// the result.
    #[test]
    fn vendor_native_async_polls_classify_onto_their_task_query_routes() {
        let polls = [
            (
                "alibaba",
                "/api/v1/tasks/task_abc123",
                "alibaba.video_generation_task_query",
            ),
            (
                "luma_ai",
                "/dream-machine/v1/generations/gen_abc123",
                "luma_ai.video_generation_task_query",
            ),
            (
                "pixverse",
                "/openapi/v2/video/result/12345",
                "pixverse.video_generation_task_query",
            ),
            (
                "zhipu",
                "/api/paas/v4/async-result/task_abc123",
                "zhipu.video_generation_task_query",
            ),
            (
                "mureka",
                "/v1/song/query/435134",
                "mureka.music_generation_task_query",
            ),
        ];
        for (vendor, path, route_key) in polls {
            let request = InvocationClassificationRequest::new(Method::GET, path)
                .with_supplier_code(vendor);
            let classification = ProviderNativeResourceClassifier
                .classify(&request)
                .expect("vendor-native task polling classification");
            assert_eq!(route_key, classification.resource.route_key, "for {path}");
            assert_eq!(
                Some(BillingMeter::ApiRequest),
                classification.billing.meter,
                "for {path}"
            );
        }
    }
}
