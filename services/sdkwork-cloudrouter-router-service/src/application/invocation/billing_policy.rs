use super::{
    measurement_profile_for_catalog_meter, meter_is_streamable, result_gate_for_api_code,
    BillingMode, BillingQuantitySource, BillingResultGate, Invocation, InvocationBilling,
    InvocationFuture, InvocationInterceptor, InvocationShape, InvocationSurface, ResourceType,
};
use crate::domain::{AiRouteModelRequirement, BillingMeter, RoutingCapability};

#[derive(Debug, Clone, Default)]
pub struct BillingPolicyInterceptor;

impl InvocationInterceptor for BillingPolicyInterceptor {
    fn name(&self) -> &str {
        "billing_policy"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            invocation.billing = billing_policy_for(invocation);
            Ok(())
        })
    }
}

fn billing_policy_for(invocation: &Invocation) -> InvocationBilling {
    if invocation.resource.resource_type == ResourceType::FreeEndpoint {
        return InvocationBilling::free();
    }

    let billing = match invocation.resource.surface {
        InvocationSurface::ProviderNative => {
            if matches!(
                invocation.dispatch.invocation_shape,
                InvocationShape::SseStream
            ) && declared_meter_is_streamable(invocation)
            {
                // Provider-native SSE streaming — use composite token billing.
                //
                // 只有**按 token 计费**的路由可以这么塌。媒体路由声明的是
                // `video_result` / `image_result` / `music_output_second` /
                // `tts_input_character` 这类必须从**完整响应体**量出来的单位，
                // 而流式没有完整响应体：套上 `streaming_composite_policy` 之后
                // `quantity_source` 变成 `StreamingAccumulator`，累加器在媒体响应
                // 里找不到 token 字段 ⇒ 产不出用量行 ⇒ 结算层见空行直接跳过。
                // 也就是说：**客户端只要在请求体里加一个 `"stream": true`，一条
                // 视频 / 一首曲子 / 一次图片生成就免单了**。这是可被客户端输入
                // 触发的计费绕过，不是形态偏好问题。
                streaming_composite_policy(
                    invocation
                        .billing
                        .meter
                        .clone()
                        .unwrap_or(BillingMeter::LlmInputToken),
                )
            } else {
                provider_native_non_streaming_policy(invocation)
            }
        }
        InvocationSurface::OpenAiCompatible => openai_compatible_policy(invocation),
        InvocationSurface::CloudStorage => storage_policy(invocation),
        InvocationSurface::CloudIaas => api_request_policy(),
        InvocationSurface::AppApi | InvocationSurface::AdminApi | InvocationSurface::Internal => {
            InvocationBilling::free()
        }
    };
    // A route that *declared* a measurable media meter must be billed that
    // meter. Collapsing it to `api_request` is how the gateway used to charge a
    // flat per-call fee for a 12-second video, a per-character TTS call or a
    // per-second music track: the upstream cost scales with the produced
    // quantity while the customer charge did not. Only routes whose declared
    // meter has no response-measurable profile (i.e. `api_request` itself, or
    // `unknown`) stay per-call.
    let billing = if billing.mode == BillingMode::ApiRequest {
        declared_media_meter_policy(invocation).unwrap_or(billing)
    } else {
        billing
    };
    // Vendor result gates ride along with the policy rather than being inferred
    // later: the settlement path must not need to know which api code it is
    // looking at in order to decide whether a 2xx call was billable.
    with_result_gate(invocation, billing)
}

fn with_result_gate(invocation: &Invocation, mut billing: InvocationBilling) -> InvocationBilling {
    billing.result_gate = result_gate_for_api_code(&invocation.resource.api_code);
    billing
}

/// Billing for a route whose declared meter is measured from the provider
/// response (video second, image result, music second, TTS character, STT
/// minute, rerank document, ...).
///
/// The measurement profile is not re-derived here: it comes from
/// `measurement_profile_for_catalog_meter`, the same table the pricing identity
/// uses when the catalog overrides a declared meter. One table, one meaning.
///
/// Returns `None` when the declared meter is itself per-call (`api_request`) or
/// unknown, so the caller keeps the per-request fallback.
fn declared_media_meter_policy(invocation: &Invocation) -> Option<InvocationBilling> {
    let meter = invocation.billing.meter.clone()?;
    if !is_response_measured_media_meter(&meter) {
        return None;
    }
    let (mode, quantity_source) = measurement_profile_for_catalog_meter(&meter)?;
    if quantity_source == BillingQuantitySource::FixedRequest {
        return None;
    }
    Some(InvocationBilling {
        mode,
        meter: Some(meter),
        quantity_source,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    })
}

/// Meters whose billable quantity is an artifact the provider produced (a
/// video, an image, a track, a synthesized utterance, a transcript, a ranked
/// document set).
///
/// Deliberately an allow-list instead of "anything with a measurement
/// profile": token and storage meters also have profiles, but a `Thread`,
/// `Conversation` or `Response` management route merely *declares* an LLM meter
/// so the catalog can price its model — it must still bill per request, and
/// letting the media rule capture it turned `GET /v1/threads/{id}` into a token
/// charge.
fn is_response_measured_media_meter(meter: &BillingMeter) -> bool {
    matches!(
        meter,
        BillingMeter::ImageResult
            | BillingMeter::ImagePixel
            | BillingMeter::ImageMegapixel
            | BillingMeter::EmbeddingImage
            | BillingMeter::VideoResult
            | BillingMeter::VideoInputSecond
            | BillingMeter::VideoOutputSecond
            | BillingMeter::MusicOutputSecond
            | BillingMeter::SfxResult
            | BillingMeter::TtsInputCharacter
            | BillingMeter::SpeechCharacter
            | BillingMeter::AudioInputSecond
            | BillingMeter::AudioOutputSecond
            | BillingMeter::AudioInputMinute
            | BillingMeter::AudioOutputMinute
            | BillingMeter::SttAudioMinute
            | BillingMeter::RerankSearch
            | BillingMeter::RerankDocument
    )
}

fn is_vector_store_file_storage(invocation: &Invocation) -> bool {
    invocation.request.method == "POST"
        && invocation.request.path.starts_with("/v1/vector_stores/")
        && invocation.request.path.ends_with("/files")
}

fn openai_compatible_policy(invocation: &Invocation) -> InvocationBilling {
    // 管理面必须在 `Ignored` 短路**之前**判定：`/v1/files` 这类路由没有模型，
    // 会先落到 `api_request_policy`，而目录没有 `api_request` 价。
    if openai_management_is_free(invocation) {
        return InvocationBilling::free();
    }
    // Responses 压缩是**同步模型调用**：请求带 model、响应是带 usage 的
    // `OpenAiResponse`。按次报价会因目录无 `api_request` 价而 500，而它明明
    // 有可回收的 token 用量。
    if invocation.request.path == "/v1/responses/compact" {
        return model_composite_policy(invocation, BillingMeter::LlmInputToken);
    }
    // Vector-store file ingestion is storage byte-day, not a per-request tool
    // call. The file object response carries `usage_bytes`, so this route can
    // be priced and settled on the same storage meter as bucket/object routes.
    if is_vector_store_file_storage(invocation) {
        return storage_policy(invocation);
    }
    if invocation.resource.model_requirement == AiRouteModelRequirement::Ignored {
        return api_request_policy();
    }
    openai_compatible_policy_by_resource_type(invocation)
}

/// Non-streaming provider-native billing. The interceptor used to collapse
/// every non-streaming provider-native request onto a single ApiRequest fact,
/// which under-billed the token-based endpoints whose streaming siblings
/// already bill tokens (`anthropic.messages`, `gemini.generate_content`,
/// `gemini.embed_content`). The body extraction chain
/// (`extract_composite_usage_from_body`) understands all three providers'
/// non-streaming usage shapes, so those meters now settle tokens exactly like
/// the OpenAI-compatible surface does. Media/task meters keep the request
/// fact: their result quantities are produced asynchronously by provider
/// adapters, not by this response body.
fn provider_native_non_streaming_policy(invocation: &Invocation) -> InvocationBilling {
    // 文件 / 缓存 / 批量查询 / 计数工具是**管理面**：上游不按量计费，目录也没有
    // `api_request` 费率。此前它们落到 `ExternalUsageLine`，预检虽能过（目录有
    // token 价），但抽取层产不出任何用量行 ⇒ 结算报"没有可结算金额" ⇒ 上游已经
    // 执行完，客户却收到 500，预扣还被保留。按 Free 放行才是行业口径。
    // 批量**创建**不在此列：它仍由预检守卫拒单（结果回收链路未落地）。
    if provider_native_management_is_free(invocation) {
        return InvocationBilling::free();
    }
    // Gemini `:batchEmbedContents` returns embeddings without a usage frame.
    // Google bills embedding input tokens; estimate them from the request's
    // text parts before dispatch so the request is precharged and settled on
    // the same token meter as the single `:embedContent` call.
    if invocation.resource.api_code == "gemini.batch_embed_contents" {
        return InvocationBilling {
            mode: BillingMode::Token,
            meter: Some(BillingMeter::EmbeddingInputToken),
            quantity_source: BillingQuantitySource::RequestBody,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        };
    }

    // 异步任务的轮询面只是**读状态**：上游不按次收费，目录也没有 `api_request`
    // 价。按次报价会让所有视频/音乐/图片任务的轮询 500，客户拿不到已生成的
    // 结果（而生成面已经计过费）。轮询/读取一律 Free。
    if invocation.resource.api_code.ends_with("task_query") {
        return InvocationBilling::free();
    }
    match invocation.billing.meter.as_ref() {
        Some(BillingMeter::LlmInputToken) => composite_policy(BillingMeter::LlmInputToken),
        Some(BillingMeter::EmbeddingInputToken) => {
            single_token_policy(BillingMeter::EmbeddingInputToken)
        }
        // The taxonomy already says "one request" for these routes (the
        // `*.task_query` read faces and the management surfaces). Saying it
        // explicitly keeps the billed mode equal to the declared one; falling
        // through to the `ExternalUsageLine` default billed the same amount but
        // reported a mode the route never asked for.
        Some(BillingMeter::ApiRequest) => api_request_policy(),
        // Media routes (video / image / music / TTS) declare the unit their
        // vendor bills in the taxonomy — `music_output_second` for Suno,
        // `image_result` for Vidu, `video_result` for Kling. Routing them
        // through `FixedRequest` billed one `api_request` per call, so the
        // upstream per-second cost never reached the customer. They now settle
        // the declared meter, measured from the provider response.
        Some(_) => declared_media_meter_policy(invocation).unwrap_or_else(|| InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: invocation.billing.meter.clone(),
            quantity_source: BillingQuantitySource::FixedRequest,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        }),
        None => InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::FixedRequest,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        },
    }
}

/// 厂商原生的管理 / 免费工具端点。
///
/// 只认三类：文件与缓存管理面、批量任务的查询/取消、上游免费的计数工具。
/// 批量**创建**（`POST .../batches`）刻意排除，保持"无结果回收则拒单"的守卫。
fn provider_native_management_is_free(invocation: &Invocation) -> bool {
    // 用路径而不是 api code：模板化的 `{file_id}` 在真实请求里是任意 id，分类器
    // 会把它拼成 `anthropic.file.1` 这类实例化 code，按 code 匹配会漏。
    let path = invocation.request.path.as_str();
    let method = invocation.request.method.as_str();
    if path.starts_with("/anthropic/v1/files")
        || path.starts_with("/google/v1beta/files")
        || path.starts_with("/google/v1beta/cachedContents")
    {
        return true;
    }
    if path == "/anthropic/v1/messages/count_tokens" || path.ends_with(":countTokens") {
        return true;
    }
    if path.starts_with("/anthropic/v1/messages/batches") {
        // 查询 / 取详情 / 取消免费；创建仍由预检守卫拒单。
        return method == "GET" || path.ends_with("/cancel");
    }
    false
}

fn openai_compatible_policy_by_resource_type(invocation: &Invocation) -> InvocationBilling {
    match invocation.resource.resource_type {
        ResourceType::FreeEndpoint => InvocationBilling::free(),
        ResourceType::ChatCompletion
        | ResourceType::Response
        | ResourceType::Thread
        | ResourceType::RealtimeSession => {
            if optional_model_absent(invocation) {
                api_request_policy()
            } else {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            }
        }
        ResourceType::Embedding => InvocationBilling {
            mode: BillingMode::Token,
            meter: Some(BillingMeter::EmbeddingInputToken),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        },
        ResourceType::Image => result_policy(BillingMeter::ImageResult),
        ResourceType::Audio => audio_policy(invocation),
        ResourceType::Video => result_policy(BillingMeter::VideoResult),
        ResourceType::ModelCall => match invocation.resource.capability {
            RoutingCapability::Chat => {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            }
            RoutingCapability::Embedding => single_token_policy(BillingMeter::EmbeddingInputToken),
            RoutingCapability::Image => result_policy(BillingMeter::ImageResult),
            RoutingCapability::Audio => duration_policy(BillingMeter::AudioInputSecond),
            RoutingCapability::Music => duration_policy(BillingMeter::MusicOutputSecond),
            RoutingCapability::Video => result_policy(BillingMeter::VideoResult),
            RoutingCapability::Rerank => item_policy(BillingMeter::RerankDocument),
            RoutingCapability::Network => api_request_policy(),
        },
        ResourceType::ProviderNativeApi => InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        },
        ResourceType::File
        | ResourceType::Moderation
        | ResourceType::Upload
        | ResourceType::Assistant
        | ResourceType::VectorStore
        | ResourceType::Batch
        | ResourceType::FineTuningJob
        | ResourceType::Conversation
        | ResourceType::Container
        | ResourceType::StorageBucket
        | ResourceType::StorageObject
        | ResourceType::IaasInstance
        | ResourceType::Unknown => {
            if optional_model_present(invocation) {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            } else {
                api_request_policy()
            }
        }
    }
}

/// OpenAI 兼容面里**不按次计费**的管理/CRUD 端点。
///
/// 只覆盖"对象本身的增删改查/轮询"；带上游计算或存储计费的子端点刻意排除：
///
/// * `POST /v1/threads/{id}/runs`（及其 `submit_tool_outputs`）会消耗模型 token；
/// * `POST /v1/responses/compact` 会消耗模型 token；
/// * `POST /v1/vector_stores/{id}/file_batches` 会触发文件摄取；
/// * `POST /v1/vector_stores/{id}/search` / `/files` 涉及检索与存储；
/// * `POST /v1/videos` 本身是视频生成（VideoSecond，不在这里）。
///
/// 轮询（GET）、取消、删除、状态查询一律免费——客户必须能善后已提交的任务。
fn openai_management_is_free(invocation: &Invocation) -> bool {
    let path = invocation.request.path.as_str();
    let method = invocation.request.method.as_str();
    if path == "/v1/files" || path.starts_with("/v1/files/") {
        return true;
    }
    if path == "/v1/uploads" || path.starts_with("/v1/uploads/") {
        return true;
    }
    if path == "/v1/moderations" {
        return true;
    }
    if path == "/v1/batches" {
        return method == "GET";
    }
    if path.starts_with("/v1/batches/") {
        return method == "GET" || path.ends_with("/cancel");
    }
    if path == "/v1/assistants" || path.starts_with("/v1/assistants/") {
        return true;
    }
    if path == "/v1/threads" || path.starts_with("/v1/threads/") {
        if path.contains("/runs") {
            // 创建 run / 提交工具输出会消耗 token；查询、取消、**更新 run 元数据**
            // 免费。`POST .../runs/{run_id}` 只是改 metadata，不是新计算。
            if method == "GET" || path.ends_with("/cancel") {
                return true;
            }
            if path.ends_with("/submit_tool_outputs") {
                return false;
            }
            let after_runs = path
                .split("/runs")
                .nth(1)
                .unwrap_or_default()
                .trim_matches('/');
            return !after_runs.is_empty() && !after_runs.contains('/');
        }
        return true;
    }
    if path == "/v1/conversations" || path.starts_with("/v1/conversations/") {
        return true;
    }
    if path == "/v1/containers" || path.starts_with("/v1/containers/") {
        // 容器按**会话**计费；对象/文件的上传、读取、删除都是管理面，免费。
        // 会话本身的用量发生在 Responses 的 code interpreter 调用里（不在本表）。
        return true;
    }
    if path == "/v1/vector_stores" || path.starts_with("/v1/vector_stores/") {
        if path.contains("/file_batches") || path.ends_with("/search") {
            return method == "GET" || path.ends_with("/cancel");
        }
        // 更新单个文件的属性不触发摄取/存储，免费；向集合新增文件才计费。
        if method == "POST" && is_single_file_attribute_update(path) {
            return true;
        }
        return !has_sub_resource(path, "/v1/vector_stores") || method != "POST";
    }
    if path == "/v1/audio/voices" || path.starts_with("/v1/audio/voices/") {
        return true;
    }
    if path == "/v1/audio/voice_consents" || path.starts_with("/v1/audio/voice_consents/") {
        return true;
    }
    if path == "/v1/realtime/client_secrets" {
        return true;
    }
    if path.starts_with("/v1/realtime/calls/") {
        return true;
    }
    if path == "/v1/chat/completions" {
        return method == "GET";
    }
    if path.starts_with("/v1/chat/completions/") {
        return true;
    }
    if path == "/v1/responses/input_tokens" {
        // 免费的 token 计数工具，不产生模型推理。
        return true;
    }
    if path.starts_with("/v1/responses/") {
        return method == "GET"
            || method == "DELETE"
            || path.ends_with("/cancel")
            || path.ends_with("/input_items");
    }
    if path == "/v1/videos" {
        return method == "GET";
    }
    if path.starts_with("/v1/videos/") {
        // 角色（Sora character）是素材对象，创建/查询/删除都不产生视频渲染成本；
        // edits/extensions/remix 才是生成面，按 VideoSecond 计费。
        if path.starts_with("/v1/videos/characters") {
            return true;
        }
        return method == "GET" || method == "DELETE";
    }
    false
}

/// `/v1/vector_stores/{id}/files/{file_id}`：单文件属性更新，不是集合新增。
fn is_single_file_attribute_update(path: &str) -> bool {
    path.split_once("/files/")
        .map(|(_, file_id)| !file_id.is_empty() && !file_id.contains('/'))
        .unwrap_or(false)
}

/// `/v1/x` 之外还有路径段（例如 `/v1/x/{id}/files`）。
fn has_sub_resource(path: &str, prefix: &str) -> bool {
    path.strip_prefix(prefix)
        .map(|rest| rest.trim_start_matches('/').contains('/'))
        .unwrap_or(false)
}

fn optional_model_absent(invocation: &Invocation) -> bool {
    invocation.resource.model_requirement == AiRouteModelRequirement::Optional
        && !optional_model_present(invocation)
}

fn optional_model_present(invocation: &Invocation) -> bool {
    invocation
        .resource
        .requested_model
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
}

fn api_request_policy() -> InvocationBilling {
    InvocationBilling::api_request(BillingMeter::ApiRequest)
}

fn composite_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling::composite(meter)
}

fn streaming_composite_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        quantity_source: BillingQuantitySource::StreamingAccumulator,
        ..InvocationBilling::composite(meter)
    }
}

/// 该路由声明的计量单位能否**从流里**量出来。
///
/// 只有 token 类单位可以在流式响应里逐帧累计；媒体类单位（按条 / 按张 / 按秒 /
/// 按字符 / 按分钟）必须读完整响应体，流式下没有完整响应体。声明里没有计量单位
/// （`None`）时保持历史行为，按可流式处理——那是"还没定价"的路由，不该被这条
/// 守卫卡住。
fn declared_meter_is_streamable(invocation: &Invocation) -> bool {
    meter_is_streamable(invocation.billing.meter.as_ref())
}

fn model_composite_policy(invocation: &Invocation, meter: BillingMeter) -> InvocationBilling {
    if matches!(
        invocation.dispatch.invocation_shape,
        InvocationShape::SseStream
    ) {
        streaming_composite_policy(meter)
    } else {
        composite_policy(meter)
    }
}

fn single_token_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::Token,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    }
}

fn result_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::ResultCount,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    }
}

fn item_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::ItemCount,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    }
}

fn audio_policy(invocation: &Invocation) -> InvocationBilling {
    match invocation.billing.meter.clone() {
        Some(BillingMeter::TtsInputCharacter) | Some(BillingMeter::SpeechCharacter) => {
            character_policy(invocation.billing.meter.clone().unwrap())
        }
        Some(BillingMeter::AudioInputSecond)
        | Some(BillingMeter::AudioOutputSecond)
        | Some(BillingMeter::AudioInputMinute)
        | Some(BillingMeter::AudioOutputMinute)
        | Some(BillingMeter::SttAudioMinute) => {
            duration_policy(invocation.billing.meter.clone().unwrap())
        }
        Some(meter) => duration_policy(meter),
        None => duration_policy(BillingMeter::AudioInputSecond),
    }
}

fn character_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::Character,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    }
}

fn duration_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::AudioSecond,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        result_gate: BillingResultGate::Any,
    }
}

fn storage_policy(invocation: &Invocation) -> InvocationBilling {
    match invocation.resource.resource_type {
        ResourceType::StorageBucket | ResourceType::StorageObject | ResourceType::VectorStore => {
            InvocationBilling {
                mode: BillingMode::Storage,
                meter: Some(BillingMeter::StorageGbDay),
                quantity_source: BillingQuantitySource::ResponseBody,
                pricing_required: true,
                settlement_required: true,
                result_gate: BillingResultGate::Any,
            }
        }
        _ => api_request_policy(),
    }
}
