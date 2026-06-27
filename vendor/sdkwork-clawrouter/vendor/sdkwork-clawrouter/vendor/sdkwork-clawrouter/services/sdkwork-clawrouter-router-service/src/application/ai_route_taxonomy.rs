use std::cmp::Reverse;
use std::collections::BTreeMap;

use crate::domain::{
    AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    ProviderChannelRoute, RoutingCapability,
};
use crate::ports::PricingCatalog;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AiRouteTaxonomyEntry {
    pub route_key: &'static str,
    pub api_code: &'static str,
    pub capability: RoutingCapability,
    pub billing_meter: BillingMeter,
    pub model_requirement: AiRouteModelRequirement,
    pub route_strategy: AiRouteStrategy,
    pub failure_strategy: AiRouteFailureStrategy,
    pub sticky_object_type: Option<&'static str>,
    pub sticky_scope: Option<&'static str>,
}

impl AiRouteTaxonomyEntry {
    pub fn routes_model_when_present(&self) -> bool {
        self.model_requirement.routes_model_when_present()
    }

    pub fn permits_missing_model(&self) -> bool {
        self.model_requirement.permits_missing_model()
    }
}

#[derive(Debug, Clone)]
pub struct AiRoutingIndex {
    routes: Vec<ProviderChannelRoute>,
    group_binding_count: usize,
    by_group_api: BTreeMap<(i64, String), Vec<usize>>,
}

pub fn builtin_ai_route_taxonomy() -> &'static [AiRouteTaxonomyEntry] {
    BUILTIN_AI_ROUTE_TAXONOMY
}

pub fn find_builtin_ai_route(route_key: &str) -> Option<&'static AiRouteTaxonomyEntry> {
    let normalized = normalize_route_key(route_key);
    BUILTIN_AI_ROUTE_TAXONOMY
        .iter()
        .find(|route| normalize_route_key(route.route_key) == normalized)
}

impl AiRoutingIndex {
    pub fn compile<C: PricingCatalog>(catalog: &C) -> Self {
        Self::from_channel_routes(catalog.list_provider_channel_routes())
    }

    pub fn from_channel_routes(routes: Vec<ProviderChannelRoute>) -> Self {
        let mut group_binding_count = 0;
        let mut by_group_api = BTreeMap::<(i64, String), Vec<usize>>::new();
        for (index, route) in routes.iter().enumerate() {
            for binding in &route.group_bindings {
                group_binding_count += 1;
                if binding.api_scope.is_empty() {
                    by_group_api
                        .entry((binding.group_id, "*".to_owned()))
                        .or_default()
                        .push(index);
                } else {
                    for api_scope in &binding.api_scope {
                        by_group_api
                            .entry((binding.group_id, normalize_api_scope_value(api_scope)))
                            .or_default()
                            .push(index);
                    }
                }
            }
        }

        for indexes in by_group_api.values_mut() {
            indexes.sort_unstable();
            indexes.dedup();
        }

        Self {
            routes,
            group_binding_count,
            by_group_api,
        }
    }

    pub fn matching_channels(
        &self,
        group_id: i64,
        api_code: &str,
        capability: RoutingCapability,
        _catalog_key: Option<&str>,
        _requested_model: Option<&str>,
    ) -> Vec<ProviderChannelRoute> {
        let api_scope_keys = [api_code];

        if self.group_binding_count == 0 {
            return sorted_callable_routes(
                self.routes
                    .iter()
                    .filter(|route| channel_route_is_callable(route))
                    .cloned()
                    .collect(),
            );
        }

        let mut candidate_indexes = self
            .by_group_api
            .get(&(group_id, normalize_api_scope_value(api_code)))
            .into_iter()
            .chain(self.by_group_api.get(&(group_id, "*".to_owned())))
            .flat_map(|indexes| indexes.iter().copied())
            .collect::<Vec<_>>();
        candidate_indexes.sort_unstable();
        candidate_indexes.dedup();

        let candidates = candidate_indexes
            .into_iter()
            .filter_map(|index| self.routes.get(index))
            .filter(|route| channel_route_is_callable(route))
            .filter_map(|route| {
                let matched_bindings = route
                    .group_bindings
                    .iter()
                    .filter(|binding| {
                        binding.group_id == group_id
                            && binding_matches_api_scope(
                                binding.api_scope.as_slice(),
                                &api_scope_keys,
                            )
                            && binding_matches_capability(
                                binding.capabilities.as_slice(),
                                capability,
                            )
                    })
                    .collect::<Vec<_>>();
                best_binding_sort_key(matched_bindings.into_iter())
                    .map(|sort_key| (sort_key, route.clone()))
            })
            .collect::<Vec<_>>();

        sorted_bound_routes(candidates)
    }
}

const BUILTIN_AI_ROUTE_TAXONOMY: &[AiRouteTaxonomyEntry] = &[
    model(
        "openai.responses",
        "openai.responses",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    sticky_optional(
        "openai.conversations",
        "openai.conversations",
        RoutingCapability::Chat,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "conversation",
    ),
    model(
        "openai.chat_completions",
        "openai.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "openai.completions",
        "openai.completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "openai.embeddings",
        "openai.embeddings",
        RoutingCapability::Embedding,
        BillingMeter::EmbeddingInputToken,
    ),
    model(
        "openai.images",
        "openai.images",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai.images.generations",
        "openai.images.generations",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai.images.edits",
        "openai.images.edits",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai.images.variations",
        "openai.images.variations",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai.audio",
        "openai.audio",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
    ),
    model(
        "openai.audio.transcriptions",
        "openai.audio.transcriptions",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
    ),
    model(
        "openai.audio.translations",
        "openai.audio.translations",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
    ),
    model(
        "openai.audio.speech",
        "openai.audio.speech",
        RoutingCapability::Audio,
        BillingMeter::TtsInputCharacter,
    ),
    sticky_model(
        "openai.realtime",
        "openai.realtime",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
        "realtime_session",
    ),
    sticky_model(
        "openai.video",
        "openai.video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video",
    ),
    sticky_model(
        "openai.videos",
        "openai.videos",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video",
    ),
    sticky_optional(
        "openai.files",
        "openai.files",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "file",
    ),
    sticky_optional(
        "openai.uploads",
        "openai.uploads",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "upload",
    ),
    sticky_optional(
        "openai.batches",
        "openai.batches",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "batch",
    ),
    sticky_optional(
        "openai.fine_tuning",
        "openai.fine_tuning",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "fine_tuning_job",
    ),
    channel(
        "openai.models",
        "openai.models",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    channel(
        "openai.moderations",
        "openai.moderations",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    sticky_optional(
        "openai.assistants",
        "openai.assistants",
        RoutingCapability::Chat,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "assistant",
    ),
    sticky_optional(
        "openai.threads",
        "openai.threads",
        RoutingCapability::Chat,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "thread",
    ),
    sticky_optional(
        "openai.vector_stores",
        "openai.vector_stores",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "vector_store",
    ),
    sticky_optional(
        "openai.evals",
        "openai.evals",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "eval",
    ),
    sticky_optional(
        "openai.chatkit.sessions",
        "openai.chatkit.sessions",
        RoutingCapability::Chat,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Optional,
        "chatkit_session",
    ),
    sticky_optional(
        "openai.containers",
        "openai.containers",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "container",
    ),
    sticky_optional(
        "openai.skills",
        "openai.skills",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
        AiRouteModelRequirement::Ignored,
        "skill",
    ),
    channel(
        "openai.administration",
        "openai.administration",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    model(
        "openai_compatible.responses",
        "openai.responses",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "openai_compatible.chat_completions",
        "openai.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "openai_compatible.embeddings",
        "openai.embeddings",
        RoutingCapability::Embedding,
        BillingMeter::EmbeddingInputToken,
    ),
    model(
        "openai_compatible.images.generations",
        "openai.images.generations",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai_compatible.images.edits",
        "openai.images.edits",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "openai_compatible.audio.transcriptions",
        "openai.audio.transcriptions",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
    ),
    model(
        "openai_compatible.audio.speech",
        "openai.audio.speech",
        RoutingCapability::Audio,
        BillingMeter::TtsInputCharacter,
    ),
    sticky_model(
        "openai.codex.responses",
        "openai.codex.responses",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
        "codex_response",
    ),
    sticky_optional(
        "anthropic.claude_code",
        "anthropic.claude_code",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
        AiRouteModelRequirement::Required,
        "claude_code_session",
    ),
    model(
        "gemini.generate_content",
        "gemini.generate_content",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "gemini.stream_generate_content",
        "gemini.stream_generate_content",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "gemini.embed_content",
        "gemini.embed_content",
        RoutingCapability::Embedding,
        BillingMeter::EmbeddingInputToken,
    ),
    sticky_model(
        "gemini.live",
        "gemini.live",
        RoutingCapability::Audio,
        BillingMeter::AudioInputSecond,
        "live_session",
    ),
    model(
        "gemini.image_generation",
        "gemini.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    sticky_model(
        "gemini.video_generation",
        "gemini.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    model(
        "gemini.nano_banana.image_generation",
        "gemini.nano_banana.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    media_task(
        "kling.text_to_video",
        "kling.text_to_video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    media_task(
        "kling.image_to_video",
        "kling.image_to_video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    media_task(
        "kling.image_generation",
        "kling.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    channel(
        "kling.task_query",
        "kling.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    media_task(
        "jimeng.image_generation",
        "jimeng.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    media_task(
        "jimeng.video_generation",
        "jimeng.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    channel(
        "jimeng.task_query",
        "jimeng.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    media_task(
        "volcengine.image_generation",
        "volcengine.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    media_task(
        "volcengine.video_generation",
        "volcengine.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    channel(
        "volcengine.task_query",
        "volcengine.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    media_task(
        "minimax.music_generation",
        "minimax.music_generation",
        RoutingCapability::Music,
        BillingMeter::MusicOutputSecond,
        "music_task",
    ),
    media_task(
        "vidu.reference_to_image",
        "vidu.reference_to_image",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    media_task(
        "vidu.start_end_to_video",
        "vidu.start_end_to_video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
];

const fn model(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
) -> AiRouteTaxonomyEntry {
    AiRouteTaxonomyEntry {
        route_key,
        api_code,
        capability,
        billing_meter,
        model_requirement: AiRouteModelRequirement::Required,
        route_strategy: AiRouteStrategy::StatelessFailover,
        failure_strategy: AiRouteFailureStrategy::Failover,
        sticky_object_type: None,
        sticky_scope: None,
    }
}

const fn channel(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
) -> AiRouteTaxonomyEntry {
    AiRouteTaxonomyEntry {
        route_key,
        api_code,
        capability,
        billing_meter,
        model_requirement: AiRouteModelRequirement::Ignored,
        route_strategy: AiRouteStrategy::PrimaryChannel,
        failure_strategy: AiRouteFailureStrategy::FailClosed,
        sticky_object_type: None,
        sticky_scope: None,
    }
}

const fn sticky_model(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
    sticky_object_type: &'static str,
) -> AiRouteTaxonomyEntry {
    sticky_optional(
        route_key,
        api_code,
        capability,
        billing_meter,
        AiRouteModelRequirement::Required,
        sticky_object_type,
    )
}

const fn media_task(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
    sticky_object_type: &'static str,
) -> AiRouteTaxonomyEntry {
    sticky_optional(
        route_key,
        api_code,
        capability,
        billing_meter,
        AiRouteModelRequirement::Optional,
        sticky_object_type,
    )
}

const fn sticky_optional(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
    model_requirement: AiRouteModelRequirement,
    sticky_object_type: &'static str,
) -> AiRouteTaxonomyEntry {
    AiRouteTaxonomyEntry {
        route_key,
        api_code,
        capability,
        billing_meter,
        model_requirement,
        route_strategy: AiRouteStrategy::CreateThenSticky,
        failure_strategy: AiRouteFailureStrategy::FailClosed,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: Some("object"),
    }
}

fn sorted_callable_routes(routes: Vec<ProviderChannelRoute>) -> Vec<ProviderChannelRoute> {
    let mut routes = routes;
    routes.sort_by_key(|route| route.channel_id);
    routes
}

fn sorted_bound_routes(
    candidates: Vec<((i32, Reverse<i32>, i64), ProviderChannelRoute)>,
) -> Vec<ProviderChannelRoute> {
    let mut candidates = candidates;
    candidates.sort_by_key(|(sort_key, route)| (sort_key.0, sort_key.1, route.channel_id));
    candidates
        .into_iter()
        .map(|(_sort_key, route)| route)
        .collect()
}

fn best_binding_sort_key<'a, I>(bindings: I) -> Option<(i32, Reverse<i32>, i64)>
where
    I: IntoIterator<Item = &'a crate::domain::ProviderChannelGroupBinding>,
{
    bindings
        .into_iter()
        .map(|binding| {
            (
                binding.priority,
                Reverse(binding.weight),
                i64::from(binding.weight),
            )
        })
        .min()
}

fn binding_matches_api_scope(api_scope: &[String], api_scope_keys: &[&str]) -> bool {
    if api_scope.is_empty() {
        return true;
    }
    if api_scope_keys.is_empty() {
        return false;
    }
    api_scope.iter().any(|scope| {
        api_scope_keys
            .iter()
            .any(|key| api_scope_value_matches_key(scope, key))
    })
}

fn api_scope_value_matches_key(scope: &str, key: &str) -> bool {
    let scope = normalize_api_scope_value(scope);
    let key = normalize_api_scope_value(key);
    if scope.is_empty() || key.is_empty() {
        return false;
    }
    scope == "*" || scope == "all" || scope == key
}

fn binding_matches_capability(capabilities: &[String], capability: RoutingCapability) -> bool {
    if capabilities.is_empty() {
        return true;
    }
    let expected = capability_binding_codes(capability);
    capabilities.iter().any(|value| {
        expected
            .iter()
            .any(|expected| value.trim().eq_ignore_ascii_case(expected))
    })
}

fn capability_binding_codes(capability: RoutingCapability) -> &'static [&'static str] {
    match capability {
        RoutingCapability::Chat => &["llm", "chat", "text"],
        RoutingCapability::Image => &["image"],
        RoutingCapability::Audio => &["audio", "sfx", "speech"],
        RoutingCapability::Music => &["music"],
        RoutingCapability::Video => &["video"],
        RoutingCapability::Embedding => &["llm", "embedding", "embeddings"],
        RoutingCapability::Rerank => &["llm", "rerank", "ranking"],
        RoutingCapability::Network => &["network", "http"],
    }
}

fn normalize_api_scope_value(value: &str) -> String {
    let normalized = value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', ':', '-'], ".");
    normalized
        .strip_prefix("api.")
        .unwrap_or(&normalized)
        .trim_matches('.')
        .to_owned()
}

fn normalize_route_key(value: &str) -> String {
    value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', ':', '-'], ".")
}

fn channel_route_is_callable(route: &ProviderChannelRoute) -> bool {
    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
}

fn has_text(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}
