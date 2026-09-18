//! 调用定价身份（Invocation Pricing Identity）
//!
//! 一个请求"按什么计费"，由两件事唯一决定：**定价资源键**（catalog key）与
//! **计费计量单位**（billing meter）。本模块是这两件事的唯一权威，路由规划
//! 的计价预检与调用层的计价/结算都必须经由它，避免两侧各自推断出不同身份
//! ——历史上正是这种双源导致"预检通过、结算失败"或反之。
//!
//! ## 为什么必须由 sdkwork-models 目录驱动
//!
//! 计费的两端都锚在 sdkwork-models 目录上：`pricing_price_book` /
//! `pricing_rate` 由目录的 `pricing/*.json` 投影而来，`ai_model` 由目录的
//! `models/*.json` 投影而来。因此"某个模型按什么计量单位计价"这件事，
//! **目录是唯一事实来源**，路由 taxonomy 里写的 meter 只是缺省建议。
//!
//! 实测（2026-09-17）两侧确有系统性偏差：
//!
//! | 路由 | taxonomy 声明 meter | 目录对该模型定义的 meter |
//! |---|---|---|
//! | `openai.images`（`openai/gpt-image-2`） | `image_result` | `image_input_token` / `image_output_token` / `llm_cache_read_token` |
//! | `kling.text_to_video`（`kuaishou/kling-v3`） | `video_result` | `video_output_second` |
//! | `elevenlabs.sound_generation` | `api_request` | `audio_output_minute` |
//!
//! 若只信 taxonomy，预检会以"目录里根本不存在的 meter"去找价，得到
//! `price_not_found`，而真正的资源是有价的。
//!
//! ## 定价资源键的两类语义
//!
//! - **模型类**（`RouteKind::Model`）：键是模型目录键，由
//!   `route_planning::resolve_catalog_key` 依据请求模型名解析。
//! - **API 资源类**（`RouteKind::Api`）：键首先取路由键本身——目录若把该
//!   路由键当作资源发布（例如 `anthropic.messages` 这类目录内 API 资源），
//!   它就是权威键，这与历史语义一致。**但**厂商原生媒体路由（如
//!   `kling.text_to_video`、`elevenlabs.text_to_speech`）的"路由键"是 api
//!   code，不是目录资源；目录对这些能力计价的对象是**模型**。此时若请求携带
//!   模型名（`model` / `model_name` / `model_id`），必须按目录名解析出模型
//!   键，否则拿 api code 去查价必然 `model not found`。
//!
//! ## 计量单位对账规则
//!
//! 1. 目录对该键没有定义任何官方费率 → 保留路由声明的计量单位（保持历史
//!    行为，交由计价预检给出精确诊断）。
//! 2. 目录定义与声明**有交集** → 取交集（声明顺序），常规链路（chat /
//!    embedding）完全不受影响。
//! 3. 目录定义与声明**无交集** → 以目录定义为准（按 meter code 排序，确定性），
//!    并把计费配置（meter + mode + quantity_source）回写到调用上，使
//!    预检、用量抽取、结算三者读到同一个身份。

use crate::domain::BillingMeter;
use crate::ports::PricingCatalog;

use super::{
    BillingMode, BillingQuantitySource, Invocation, InvocationBilling, InvocationBody, RouteKind,
};

/// 从调用请求体里读请求方声明的分辨率。
///
/// 目录把大部分视频费率条件化在 `tier_code` 维度上，而请求方在线上说的是
/// `resolution` / `size`；档位要靠目录声明把二者对上（见
/// [`crate::ports::UpstreamAccountRouteCatalog::video_pricing_tier`]）。这里只负责
/// 把请求侧的原始值取出来，不做任何猜测性映射。
///
/// 指针集合与调用层 `pricing::pricing_dimensions` 的 `resolution` 档保持一致，
/// 保证预检与结算看到同一个请求分辨率。
pub fn requested_resolution(invocation: &Invocation) -> Option<String> {
    let InvocationBody::Json(body) = &invocation.request.body else {
        return None;
    };
    ["/resolution", "/size", "/output/size"]
        .iter()
        .find_map(|pointer| body.pointer(pointer))
        .and_then(|value| match value {
            serde_json::Value::String(text) => Some(text.clone()),
            serde_json::Value::Number(number) => Some(number.to_string()),
            _ => None,
        })
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

/// 定价资源键的来源，用于日志与失败诊断。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PricingKeySource {
    /// 路由键本身就是目录资源（API 资源类路由的常规情形）。
    RouteKey,
    /// 请求携带的模型名按目录唯一解析出的模型键。
    RequestedModel,
    /// 载荷抽取阶段预置的模型目录键。
    PresetCatalogKey,
    /// 都没有命中；键退化为路由键，交由计价预检失败并给出诊断。
    Unresolved,
}

/// 计费计量单位的来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PricingMeterSource {
    /// 目录未定义该键的费率，沿用路由声明的计量单位。
    RouteDeclared,
    /// 目录定义与路由声明有交集，取交集。
    RouteDeclaredWithinCatalog,
    /// 目录定义与路由声明无交集，以目录定义为准。
    CatalogDefinition,
}

/// 调用定价身份：本次请求按哪个资源、按哪些计量单位计价。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationPricingIdentity {
    pub catalog_key: String,
    pub meters: Vec<BillingMeter>,
    pub key_source: PricingKeySource,
    pub meter_source: PricingMeterSource,
}

impl InvocationPricingIdentity {
    /// 主计量单位：回写到调用计费配置的那一个。
    pub fn primary_meter(&self) -> Option<&BillingMeter> {
        self.meters.first()
    }

    /// 目录是否改写了路由声明的计量单位。
    pub fn overrides_declared_meters(&self) -> bool {
        self.meter_source == PricingMeterSource::CatalogDefinition
    }
}

/// 解析调用的定价身份。
///
/// `RouteKind::Model` 时调用方应已把模型键写入
/// `resource.requested_model_catalog_key`；本函数优先采信它。
pub fn resolve_pricing_identity<C>(catalog: &C, invocation: &Invocation) -> InvocationPricingIdentity
where
    C: PricingCatalog,
{
    let (catalog_key, key_source) = resolve_pricing_key(catalog, invocation);
    let declared = declared_pricing_meters(invocation);
    let defined = catalog_pricing_meters(
        catalog,
        invocation.subject.tenant_id,
        invocation.subject.organization_id,
        &catalog_key,
    );
    let (meters, meter_source) = reconcile_pricing_meters(&declared, &defined);
    InvocationPricingIdentity {
        catalog_key,
        meters,
        key_source,
        meter_source,
    }
}

/// 解析定价资源键。
fn resolve_pricing_key<C>(catalog: &C, invocation: &Invocation) -> (String, PricingKeySource)
where
    C: PricingCatalog,
{
    let resource = &invocation.resource;
    let route_key = resource.route_key.trim();
    let kind = RouteKind::of(resource);

    if kind == RouteKind::Model {
        if let Some(key) = non_empty(resource.requested_model_catalog_key.as_deref()) {
            return (key.to_owned(), PricingKeySource::PresetCatalogKey);
        }
    }

    // 路由键是目录资源时它是权威键。API 资源类路由（provider-native
    // media / 目录内 API 资源）与模型类路由在这一点上一致：只要目录把该键
    // 当资源发布，就不允许请求里的模型名劫持定价键。
    if !route_key.is_empty() && catalog.find_model(route_key).is_some() {
        return (route_key.to_owned(), PricingKeySource::RouteKey);
    }

    if let Some(model) = requested_model_name(invocation) {
        if let Some(key) = resolve_model_catalog_key(catalog, &model, resource) {
            return (key, PricingKeySource::RequestedModel);
        }
    }

    if let Some(key) = non_empty(resource.requested_model_catalog_key.as_deref()) {
        return (key.to_owned(), PricingKeySource::PresetCatalogKey);
    }

    let fallback = if route_key.is_empty() {
        resource.api_code.trim().to_owned()
    } else {
        route_key.to_owned()
    };
    (fallback, PricingKeySource::Unresolved)
}

/// 请求携带的模型名。
///
/// 载荷抽取已把 `model` / `model_name` / `model_id` 归一进
/// `requested_model`；这里再对预置的 `supplier/<model>` 目录键做一次去前缀，
/// 使"只有 provider-native 键"的调用也能按目录名解析。
fn requested_model_name(invocation: &Invocation) -> Option<String> {
    let resource = &invocation.resource;
    if let Some(model) = non_empty(resource.requested_model.as_deref()) {
        return Some(model.to_owned());
    }
    let preset = non_empty(resource.requested_model_catalog_key.as_deref())?;
    let (_, tail) = preset.split_once('/')?;
    non_empty(Some(tail)).map(str::to_owned)
}

/// 按模型名解析目录键候选（与 `UpstreamAccountRouteCatalog::model_catalog_keys_by_name`
/// 同一语义，但只依赖 `PricingCatalog::visit_models`，使计价侧拦截器也能用）。
fn catalog_model_keys_by_name<C>(catalog: &C, model_name: &str) -> Vec<String>
where
    C: PricingCatalog,
{
    let mut keys = Vec::new();
    catalog.visit_models(None, &mut |model| {
        if model.catalog_key == model_name || model.model == model_name {
            if !keys.contains(&model.catalog_key) {
                keys.push(model.catalog_key.clone());
            }
        }
        true
    });
    keys
}

/// 按目录模型名解析目录键。
///
/// 与 `route_planning::resolve_catalog_key` 同一语义：目录按名称索引，命中唯
/// 一即采用；命中多个时若预置键在其中则采用预置键，否则判为歧义（不猜）。
fn resolve_model_catalog_key<C>(
    catalog: &C,
    model: &str,
    resource: &super::InvocationResource,
) -> Option<String>
where
    C: PricingCatalog,
{
    let keys = catalog_model_keys_by_name(catalog, model);
    match keys.as_slice() {
        [key] => Some(key.clone()),
        [] => None,
        resolved => {
            let preset = non_empty(resource.requested_model_catalog_key.as_deref());
            preset
                .filter(|preset| resolved.iter().any(|key| key == preset))
                .map(str::to_owned)
        }
    }
}

/// 目录对该资源键定义的官方费率计量单位。
///
/// 排序不是装饰：列表首项会成为**主计量单位**，决定用量抽取与结算按哪个口径
/// 计量。因此按"离产出最近"排序——产出侧（`*_output_*`）优先，其次是结果计
/// 数（`*_result`），再次是输入侧（`*_input_*`），缓存/推理/存储等辅助口径
/// 最后；同档按 meter code 排序，保证确定性。
fn catalog_pricing_meters<C>(
    catalog: &C,
    tenant_id: i64,
    organization_id: i64,
    catalog_key: &str,
) -> Vec<BillingMeter>
where
    C: PricingCatalog,
{
    if catalog_key.trim().is_empty() {
        return Vec::new();
    }
    let mut meters = catalog
        .list_model_prices_for_scope_side(
            tenant_id,
            organization_id,
            catalog_key,
            crate::domain::PriceSide::OfficialReference,
        )
        .into_iter()
        .map(|price| price.billing_meter)
        .collect::<Vec<_>>();
    meters.sort_by(|left, right| {
        meter_preference(left)
            .cmp(&meter_preference(right))
            .then_with(|| left.code().cmp(right.code()))
    });
    meters.dedup();
    meters
}

/// 主计量单位的优先档位：越小越靠近产出。
fn meter_preference(meter: &BillingMeter) -> u8 {
    let code = meter.code();
    if code.contains("output") {
        return 0;
    }
    if code.ends_with("_result") || code.ends_with("_call") || code.ends_with("_session") {
        return 1;
    }
    if code.contains("cache") || code.contains("reasoning") || code.contains("storage") {
        return 3;
    }
    if code.contains("input") {
        return 2;
    }
    2
}

/// 按"声明 ∩ 目录"对账计量单位，并对无交集情形以目录为准。
fn reconcile_pricing_meters(
    declared: &[BillingMeter],
    defined: &[BillingMeter],
) -> (Vec<BillingMeter>, PricingMeterSource) {
    if defined.is_empty() {
        return (declared.to_vec(), PricingMeterSource::RouteDeclared);
    }
    let retained = declared
        .iter()
        .filter(|meter| defined.contains(meter))
        .cloned()
        .collect::<Vec<_>>();
    if !retained.is_empty() {
        return (dedupe_meters(retained), PricingMeterSource::RouteDeclaredWithinCatalog);
    }
    (defined.to_vec(), PricingMeterSource::CatalogDefinition)
}

/// 路由声明的计费计量单位（计价侧口径）。
///
/// 与调用层 `pricing::meters_for_pricing` 同一规则：chat 走 input/output/cache
/// 复合档，媒体类走自身单档，外部用量行档按数量来源展开。
pub(crate) fn declared_pricing_meters(invocation: &Invocation) -> Vec<BillingMeter> {
    declared_meters_for(&invocation.billing)
}

/// 由计费配置推导声明计量单位（供预检在 `before` 阶段、用量未产生时使用）。
pub fn declared_meters_for(billing: &InvocationBilling) -> Vec<BillingMeter> {
    let mut meters = Vec::new();
    match billing.mode {
        BillingMode::Free => {}
        BillingMode::Composite => {
            if let Some(meter) = billing.meter.clone() {
                meters.push(meter);
            }
            meters.push(BillingMeter::LlmOutputToken);
            meters.push(BillingMeter::LlmCacheReadToken);
        }
        BillingMode::ExternalUsageLine => {
            // 路由声明的计量单位排在最前，它才是"这个媒体路由按什么计价"的
            // 权威主张。曾经这里对 `AdapterUsageLines` 只展开
            // `[ApiResult, ApiItem, ApiRequest]` 而**丢掉** `billing.meter`，
            // 后果是媒体路由的目录价被自己屏蔽掉：taxonomy 明确写了
            // `suno.music_generation → music_output_second`，目录也为
            // `suno/suno-v5` 报了 `music_output_second` 的价，但声明侧从不
            // 提出这个单位，于是 `reconcile_pricing_meters` 判为"无交集"，
            // 价格永远匹配不上，最终报 `meter api_request: model not found`。
            // 声明侧先列自己，报价侧才可能对上；对不上的部分仍由下面的
            // `*_result` / `api_request` 兜底，历史行为不变。
            if let Some(meter) = billing.meter.clone() {
                meters.push(meter);
            }
            match billing.quantity_source {
                BillingQuantitySource::FixedRequest => {
                    meters.push(BillingMeter::ApiRequest);
                }
                BillingQuantitySource::AdapterUsageLines => {
                    meters.push(BillingMeter::ApiResult);
                    meters.push(BillingMeter::ApiItem);
                    meters.push(BillingMeter::ApiRequest);
                }
                _ => {
                    meters.push(BillingMeter::ApiResult);
                    meters.push(BillingMeter::ApiItem);
                    meters.push(BillingMeter::ApiRequest);
                }
            }
        }
        _ => {
            if let Some(meter) = billing.meter.clone() {
                meters.push(meter);
            }
        }
    }
    dedupe_meters(meters)
}

fn dedupe_meters(meters: Vec<BillingMeter>) -> Vec<BillingMeter> {
    let mut deduped = Vec::new();
    for meter in meters {
        if !deduped.contains(&meter) {
            deduped.push(meter);
        }
    }
    deduped
}

/// 把定价身份回写到调用计费配置。
///
/// 只在目录改写了计量单位时动手：把主计量单位与对应的计量档
/// （mode + quantity_source）一起换上，使后续的用量抽取与结算都按目录口径
/// 计量。目录未改写时保持计费策略拦截器算出的配置不变。
pub fn apply_pricing_identity(invocation: &mut Invocation, identity: &InvocationPricingIdentity) {
    if !identity.overrides_declared_meters() {
        return;
    }
    let Some(primary) = identity.primary_meter().cloned() else {
        return;
    };
    let Some((mode, quantity_source)) = measurement_profile_for_catalog_meter(&primary) else {
        // 目录改写的计量单位没有可推导的计量档：保持原状，让预检以精确的
        // 诊断失败，而不是换上一个无法计量的单位。
        return;
    };
    let billing = &mut invocation.billing;
    billing.meter = Some(primary);
    billing.mode = mode;
    billing.quantity_source = quantity_source;
}

/// 由目录计量单位推导计量档（mode + 数量来源）。
///
/// 这是"目录定义 → 计量方式"的唯一映射表：目录说某模型按什么计价，网关就按
/// 什么去量。`None` 表示该计量单位没有比既有计量档更贴切的形态，调用方应
/// 保持原配置（不猜测）。
pub(crate) fn measurement_profile_for_catalog_meter(
    meter: &BillingMeter,
) -> Option<(BillingMode, BillingQuantitySource)> {
    use BillingMeter::*;
    let profile = match meter {
        LlmInputToken | LlmOutputToken | LlmReasoningToken | LlmCacheWriteToken
        | LlmCacheReadToken | LlmCacheStorageTokenHour | EmbeddingInputToken | ImageInputToken
        | ImageOutputToken | AudioInputToken | AudioOutputToken | VideoInputToken
        | VideoOutputToken => (BillingMode::Token, BillingQuantitySource::ResponseBody),
        EmbeddingImage | ImageResult | VideoResult | SfxResult | ApiResult | RerankSearch
        | RerankDocument | WebSearchCall | FileSearchCall | ToolCall => {
            (BillingMode::ResultCount, BillingQuantitySource::ResponseBody)
        }
        ImagePixel | ImageMegapixel | ApiItem => {
            (BillingMode::ItemCount, BillingQuantitySource::ResponseBody)
        }
        TtsInputCharacter | SpeechCharacter => {
            (BillingMode::Character, BillingQuantitySource::ResponseBody)
        }
        VideoInputSecond | VideoOutputSecond => {
            (BillingMode::VideoSecond, BillingQuantitySource::ResponseBody)
        }
        AudioInputSecond | AudioOutputSecond | MusicOutputSecond => {
            (BillingMode::AudioSecond, BillingQuantitySource::ResponseBody)
        }
        AudioInputMinute | AudioOutputMinute | SttAudioMinute => {
            (BillingMode::AudioSecond, BillingQuantitySource::ResponseBody)
        }
        ApiRequest => (BillingMode::ApiRequest, BillingQuantitySource::FixedRequest),
        CodeInterpreterSession | ContainerSession => {
            (BillingMode::ItemCount, BillingQuantitySource::ResponseBody)
        }
        StorageGbDay => (BillingMode::Storage, BillingQuantitySource::ResponseBody),
        BandwidthGb => (BillingMode::Bandwidth, BillingQuantitySource::ResponseBody),
        Unknown => return None,
    };
    Some(profile)
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}
