use std::cmp::Reverse;
use std::collections::BTreeMap;

use crate::domain::{
    has_text, AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    RoutingCapability, UpstreamAccountRoute,
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
    routes: Vec<UpstreamAccountRoute>,
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
        Self::from_upstream_account_routes(catalog.list_upstream_account_routes())
    }

    pub fn from_upstream_account_routes(routes: Vec<UpstreamAccountRoute>) -> Self {
        let mut group_binding_count = 0;
        let mut by_group_api = BTreeMap::<(i64, String), Vec<usize>>::new();
        for (index, route) in routes.iter().enumerate() {
            for binding in &route.account_group_bindings {
                group_binding_count += 1;
                if binding.api_scope.is_empty() {
                    by_group_api
                        .entry((binding.account_group_id, "*".to_owned()))
                        .or_default()
                        .push(index);
                } else {
                    for api_scope in &binding.api_scope {
                        by_group_api
                            .entry((
                                binding.account_group_id,
                                normalize_api_scope_value(api_scope),
                            ))
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

    pub fn matching_accounts(
        &self,
        group_id: i64,
        api_code: &str,
        capability: RoutingCapability,
        _catalog_key: Option<&str>,
        _requested_model: Option<&str>,
    ) -> Vec<UpstreamAccountRoute> {
        let api_scope_keys = [api_code];

        if self.group_binding_count == 0 {
            return sorted_callable_routes(
                self.routes
                    .iter()
                    .filter(|route| account_route_is_callable(route))
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
            .filter(|route| account_route_is_callable(route))
            .filter_map(|route| {
                let matched_bindings = route
                    .account_group_bindings
                    .iter()
                    .filter(|binding| {
                        binding.account_group_id == group_id
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
                best_binding_sort_key(matched_bindings).map(|sort_key| (sort_key, route.clone()))
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
        BillingMeter::SttAudioMinute,
    ),
    model(
        "openai.audio.transcriptions",
        "openai.audio.transcriptions",
        RoutingCapability::Audio,
        BillingMeter::SttAudioMinute,
    ),
    model(
        "openai.audio.translations",
        "openai.audio.translations",
        RoutingCapability::Audio,
        BillingMeter::SttAudioMinute,
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
        BillingMeter::SttAudioMinute,
        "realtime_session",
    ),
    sticky_model(
        "openai.video",
        "openai.video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video",
    ),
    model(
        "openai.videos.generations",
        "openai.videos.generations",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
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
    account(
        "openai.models",
        "openai.models",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    account(
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
        BillingMeter::SttAudioMinute,
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
        "anthropic.messages",
        "anthropic.messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    // Anthropic Messages served by vendors other than Anthropic itself.
    //
    // These vendors publish an Anthropic-compatible endpoint at their own base
    // URL (the catalog records it under
    // `models/<vendor>/<region>/vendor.json -> protocolBaseUrls.anthropic_messages`),
    // so a caller pointing Claude Code at `https://api.deepseek.com/anthropic`
    // reaches the same `/v1/messages` wire path. The gateway publishes that
    // through the `/anthropic/` namespace, and each vendor needs its own route
    // because the classification must land on a meter; without these entries
    // the classifier's synthesized key (`<vendor>.messages`) matches nothing and
    // the request fails closed with `meter: None` even though the account, the
    // credential, the group membership and the resource grant are all present.
    model(
        "alibaba.anthropic_messages",
        "alibaba.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "deepseek.anthropic_messages",
        "deepseek.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "meituan.anthropic_messages",
        "meituan.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "moonshot.anthropic_messages",
        "moonshot.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "stepfun.anthropic_messages",
        "stepfun.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "tencent.anthropic_messages",
        "tencent.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "xiaomi.anthropic_messages",
        "xiaomi.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "zhipu.anthropic_messages",
        "zhipu.anthropic_messages",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
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
        BillingMeter::SttAudioMinute,
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
    account(
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
    account(
        "jimeng.task_query",
        "jimeng.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    // ByteDance's catalog surface is Volcengine Ark, whose `doubao-seedance-*`
    // video and `doubao-seedream-*` image families bind here. These are separate
    // routes from `jimeng.*` because the two surfaces are different hosts with
    // different paths; folding them (as the old `"bytedance" | "jimeng"`
    // descriptor arm did) left every seedance model carrying a `jimeng.*` api
    // code while the request dialled an Ark path.
    media_task(
        "bytedance.image_generation",
        "bytedance.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    media_task(
        "bytedance.video_generation",
        "bytedance.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    account(
        "bytedance.task_query",
        "bytedance.task_query",
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
    account(
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
    // Runway serves every image model from `POST /v1/text_to_image` and
    // discriminates them by the body's `model` field, so the model requirement
    // is Optional (absent `model` the account's default is used) and the result
    // arrives asynchronously through `/v1/tasks/{id}`.
    media_task(
        "runway.image_generation",
        "runway.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    account(
        "runway.task_query",
        "runway.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    // Stability names the model in the trailing path segment
    // (`/v2beta/stable-image/generate/{core,ultra,sd3}`) and answers
    // synchronously, so there is no task-poll route to register.
    model(
        "stability_ai.image_generation",
        "stability_ai.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    // FLUX takes the model in the path (`POST /v1/{model}`) and returns a
    // `polling_url`; `/v1/get_result?id=` is the documented result route.
    media_task(
        "black_forest_labs.image_generation",
        "black_forest_labs.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
        "image_task",
    ),
    account(
        "black_forest_labs.task_query",
        "black_forest_labs.task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    media_task(
        "vidu.start_end_to_video",
        "vidu.start_end_to_video",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    account(
        "elevenlabs.text_to_speech",
        "elevenlabs.text_to_speech",
        RoutingCapability::Audio,
        BillingMeter::TtsInputCharacter,
    ),
    account(
        "elevenlabs.sound_generation",
        "elevenlabs.sound_generation",
        RoutingCapability::Audio,
        BillingMeter::ApiRequest,
    ),
    account(
        "volcengine.speech",
        "volcengine.speech",
        RoutingCapability::Audio,
        BillingMeter::TtsInputCharacter,
    ),
    media_task(
        "suno.music_generation",
        "suno.music_generation",
        RoutingCapability::Music,
        BillingMeter::MusicOutputSecond,
        "music_task",
    ),
    // The *generic* music surface `model_catalog_import::model_endpoint_descriptor`
    // binds every `primaryCapability = "music"` catalog model to. It sits next to
    // the vendor-native `suno.music_generation` arm deliberately: `suno.music`
    // (declared in `data/ai-routing/resources/vendor-native-resources.json`) is
    // the vendor-agnostic fallback the OpenAI-compatible surface routes music
    // through, while `suno.music_generation` is Suno's own protocol. A route
    // code that exists in the seed but not here is unreachable by construction
    // and answers 50201, which the ai-routing consistency gate rejects.
    media_task(
        "suno.music",
        "suno.music",
        RoutingCapability::Music,
        BillingMeter::MusicOutputSecond,
        "music_task",
    ),
    // Sound effects (音效).
    //
    // The catalog carries `primaryCapability = "sfx"` models for four vendors
    // (`elevenlabs/eleven_text_to_sound_v2`, `kuaishou/kling-sound-{t2a,v2a}`,
    // `stability_ai/stable-audio-2.5-sfx`, `vidu/audio1.0-{text2audio,timing2audio}`)
    // and the price book already rates them under `sfx_result` on
    // `sound.generate`. What was missing was the endpoint they bind to:
    // `model_endpoint_descriptor` had no `"sfx"` arm, so every one of those
    // models fell through to the generic chat branch and was bound to
    // `openai.chat_completions`. This arm gives the capability a real
    // vendor-native endpoint, and this route is what makes it reachable —
    // a route code declared in the seed but absent here answers 50201.
    media_task(
        "sfx.sound",
        "sfx.sound",
        RoutingCapability::Audio,
        BillingMeter::SfxResult,
        "audio_task",
    ),
    media_task(
        "kling.avatar",
        "kling.avatar",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    media_task(
        "kling.motion_control",
        "kling.motion_control",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    media_task(
        "vidu.motion_sync",
        "vidu.motion_sync",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
        "video_task",
    ),
    account(
        "suno.music_task_query",
        "suno.music_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    // Vendor-native surfaces for the catalog vendors that reach the gateway
    // through their own OpenAI-compatible host.
    //
    // These vendors (`alibaba`, `baidu`, `deepseek`, `meituan`, `moonshot`,
    // `stepfun`, `tencent`, `xai`, `xiaomi`, `zhipu`, plus `luma_ai`,
    // `pixverse` and `mureka`) each ship a bundled official account whose
    // `official.<vendor>.full` resource group granted only the `vendor.<vendor>`
    // marker. A resource group that names no `api.*` resource produces no
    // resource entitlement, and `account_route_allows_api_resource` fails
    // closed for every request — so the account existed, the group existed, and
    // no request could ever reach it. The seed declares one api resource per
    // real vendor surface; these routes are what make each one addressable. A
    // route code present in the seed but absent here is unreachable by
    // construction and answers 50201, which the ai-routing consistency gate
    // rejects.
    //
    // Every arm uses `model` (synchronous, stateless failover) because none of
    // these hosts answers with a vendor task id the router polls; `mureka` and
    // `luma_ai`/`pixverse` are registered here too, and if a vendor later
    // documents asynchronous polling its arm should become `media_task`.
    model(
        "alibaba.chat_completions",
        "alibaba.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "alibaba.embeddings",
        "alibaba.embeddings",
        RoutingCapability::Embedding,
        BillingMeter::EmbeddingInputToken,
    ),
    model(
        "alibaba.image_generation",
        "alibaba.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "alibaba.video_generation",
        "alibaba.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    model(
        "baidu.chat_completions",
        "baidu.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "deepseek.chat_completions",
        "deepseek.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "luma_ai.video_generation",
        "luma_ai.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    model(
        "meituan.chat_completions",
        "meituan.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "moonshot.chat_completions",
        "moonshot.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "mureka.music_generation",
        "mureka.music_generation",
        RoutingCapability::Music,
        BillingMeter::MusicOutputSecond,
    ),
    model(
        "pixverse.video_generation",
        "pixverse.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    model(
        "stepfun.chat_completions",
        "stepfun.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "tencent.chat_completions",
        "tencent.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "xai.chat_completions",
        "xai.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "xai.image_generation",
        "xai.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "xai.video_generation",
        "xai.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    model(
        "xiaomi.chat_completions",
        "xiaomi.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "xiaomi.image_generation",
        "xiaomi.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "xiaomi.speech",
        "xiaomi.speech",
        RoutingCapability::Audio,
        BillingMeter::TtsInputCharacter,
    ),
    model(
        "xiaomi.video_generation",
        "xiaomi.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    model(
        "zhipu.chat_completions",
        "zhipu.chat_completions",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ),
    model(
        "zhipu.embeddings",
        "zhipu.embeddings",
        RoutingCapability::Embedding,
        BillingMeter::EmbeddingInputToken,
    ),
    model(
        "zhipu.image_generation",
        "zhipu.image_generation",
        RoutingCapability::Image,
        BillingMeter::ImageResult,
    ),
    model(
        "zhipu.video_generation",
        "zhipu.video_generation",
        RoutingCapability::Video,
        BillingMeter::VideoResult,
    ),
    // Async task-poll surfaces. Each of these vendors submits a generation
    // task and then exposes the result behind a separate GET, so the poll is
    // its own routable endpoint rather than a path the create operation
    // answers. They are `account` routes like `kling.task_query` and
    // `suno.music_task_query`: the poll itself performs no generation, so it
    // meters as a plain API request.
    account(
        "alibaba.video_generation_task_query",
        "alibaba.video_generation_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    account(
        "luma_ai.video_generation_task_query",
        "luma_ai.video_generation_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    account(
        "pixverse.video_generation_task_query",
        "pixverse.video_generation_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    account(
        "zhipu.video_generation_task_query",
        "zhipu.video_generation_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
    ),
    account(
        "mureka.music_generation_task_query",
        "mureka.music_generation_task_query",
        RoutingCapability::Network,
        BillingMeter::ApiRequest,
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

const fn account(
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
        route_strategy: AiRouteStrategy::PrimaryAccount,
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

fn sorted_callable_routes(routes: Vec<UpstreamAccountRoute>) -> Vec<UpstreamAccountRoute> {
    let mut routes = routes;
    routes.sort_by_key(|route| route.account_id);
    routes
}

type BoundRouteCandidate = ((i32, Reverse<i32>, i64), UpstreamAccountRoute);

fn sorted_bound_routes(candidates: Vec<BoundRouteCandidate>) -> Vec<UpstreamAccountRoute> {
    let mut candidates = candidates;
    candidates.sort_by_key(|(sort_key, route)| (sort_key.0, sort_key.1, route.account_id));
    candidates
        .into_iter()
        .map(|(_sort_key, route)| route)
        .collect()
}

fn best_binding_sort_key<'a, I>(bindings: I) -> Option<(i32, Reverse<i32>, i64)>
where
    I: IntoIterator<Item = &'a crate::domain::UpstreamAccountGroupBinding>,
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

fn account_route_is_callable(route: &UpstreamAccountRoute) -> bool {
    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
}
