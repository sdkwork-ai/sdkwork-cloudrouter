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

use crate::domain::{BillingMeter, PriceSide};
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
pub fn resolve_pricing_identity<C>(
    catalog: &C,
    invocation: &Invocation,
) -> InvocationPricingIdentity
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
/// 精确未命中时同样走 OpenRouter 风格容错解析（relay 前缀剥离 → slug 层级），
/// 保证延迟计价/批量结算按请求原名回放时与路由期解析到同一个目录键。
fn catalog_model_keys_by_name<C>(catalog: &C, model_name: &str) -> Vec<String>
where
    C: PricingCatalog,
{
    let mut keys = Vec::new();
    catalog.visit_models(None, &mut |model| {
        if (model.catalog_key == model_name || model.model == model_name)
            && !keys.contains(&model.catalog_key)
        {
            keys.push(model.catalog_key.clone());
        }
        true
    });
    if !keys.is_empty() {
        return keys;
    }
    crate::ports::resolve_model_alias_catalog_keys(catalog, model_name)
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
pub(crate) fn catalog_pricing_meters<C>(
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

/// 目录为某图像模型/计量单位定义的**唯一** `tier_code`，仅在"没有选择余地"时返回。
///
/// sdkwork-models 把一批图像费率条件化在 `tier_code` 上，而对应的请求 schema
/// 并不暴露档位（`kuaishou/kling-image-3.0` 只有一条 `res_1k_2k` 费率，
/// `KlingImageGenerationRequest` 里没有 resolution/tier 字段）。计费侧原先只给
/// **视频**计量单位解析档位（`ai_model_video_profile`），图像计量单位拿到的是
/// "未知档位"，于是带条件的候选全部被过滤 ⇒ 预检 `PriceNotFound` ⇒ 有价却卖
/// 不出去。
///
/// 这里只处理**不会改变价格**的情形：
/// * 该计量单位的所有官方费率都带条件（存在无条件费率时走正常解析）；
/// * 所有候选共享**同一个** `tier_code`；
/// * 其余条件维度都是解析器能从计量单位自身推导的
///   （`media_type` / `output_type` / `input_type`）。
///
/// 多档位模型（Seedream / Runway 等）返回 `None`，继续 fail-closed——按错误的
/// 档位计价比"有诊断的缺口"更糟。
pub(crate) fn single_catalog_tier_code<C>(
    catalog: &C,
    tenant_id: i64,
    organization_id: i64,
    catalog_key: &str,
    meter: &BillingMeter,
) -> Option<String>
where
    C: PricingCatalog,
{
    if !matches!(
        meter,
        BillingMeter::ImageResult
            | BillingMeter::ImageMegapixel
            | BillingMeter::ImagePixel
            | BillingMeter::ImageInputToken
            | BillingMeter::ImageOutputToken
            | BillingMeter::EmbeddingImage
            // 缓存档位也存在"目录只发布一条"的形态（Alibaba 的
            // `explicit_cache_write`）。只有一条价时注入它不会改变价格；
            // 多条档位仍由 cache_write/cache_read/context 的专用规则处理。
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::LlmCacheWriteToken
    ) {
        return None;
    }
    let prices = catalog.list_model_prices_for_scope_side(
        tenant_id,
        organization_id,
        catalog_key,
        PriceSide::OfficialReference,
    );
    let mut tier: Option<String> = None;
    let mut saw_rate = false;
    for price in prices.iter().filter(|price| &price.billing_meter == meter) {
        saw_rate = true;
        let Some(metadata) = price.rate_metadata.as_ref() else {
            // 存在无条件费率：正常解析就能命中，不需要也不应该注入档位。
            return None;
        };
        if metadata.conditions.is_empty() {
            return None;
        }
        let mut rate_tier: Option<&str> = None;
        for condition in &metadata.conditions {
            match condition.dimension_code.as_str() {
                "tier_code" => {
                    if condition.operator_code != "eq" {
                        return None;
                    }
                    let value = condition.value.as_str()?;
                    match rate_tier {
                        Some(existing) if existing != value => return None,
                        _ => rate_tier = Some(value),
                    }
                }
                // 解析器会从计量单位自身推导这些维度。
                "media_type" | "output_type" | "input_type" => {}
                _ => return None,
            }
        }
        let rate_tier = rate_tier?;
        match &tier {
            Some(existing) if existing != rate_tier => return None,
            _ => tier = Some(rate_tier.to_owned()),
        }
    }
    saw_rate.then_some(tier).flatten()
}

/// 目录用**可解析的上下文分档**定义该计量单位时，按上下文长度选档。
///
/// 一批旗舰 chat 模型（Bytedance Doubao/Seed）把 input/output/cache-read 三个
/// 计量单位都条件化在同一组上下文档位上：
///
/// ```text
/// input_le_32k        → [0, 32k)
/// input_32k_128k      → [32k, 128k)
/// input_128k_256k     → [128k, 256k)
/// ```
///
/// 请求侧没有档位字段；不注入 `tier_code` 时所有候选都会被过滤，模型直接
/// `PriceNotFound`（有价却不可售）。这里接受两种**语义明确**的词汇：
///
/// * 显式区间：`input_le_<n>k` / `input_<n>k_<m>k` / `input_gt_<n>k`，要求
///   档位集合从 0 开始连续、不重叠；
/// * 累计上界：`tier_<n>k` / `tier_<n>m`（Alibaba/Baidu）。集合里没有更小的
///   下界，唯一自洽的解释就是"递增上界"——`tier_32k`/`tier_128k` 即
///   `[0,32k)`、`[32k,128k)`。
///
/// 两种词汇都不匹配（如 `tier_fast`）时返回 None，继续 fail-closed——猜错会按
/// 错误档位收费。
///
/// `context_tokens = None` 表示调用方只做"有没有价"的资格预检（路由选择阶段
/// 还没有响应用量）：此时返回最低档，仅用于证明该模型可定价，不产生金额。
pub(crate) fn context_tier_code<C>(
    catalog: &C,
    tenant_id: i64,
    organization_id: i64,
    catalog_key: &str,
    meter: &BillingMeter,
    context_tokens: Option<i64>,
) -> Option<String>
where
    C: PricingCatalog,
{
    if !matches!(
        meter,
        BillingMeter::LlmInputToken
            | BillingMeter::LlmOutputToken
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::LlmCacheWriteToken
            | BillingMeter::LlmReasoningToken
            | BillingMeter::EmbeddingInputToken
    ) {
        return None;
    }
    let prices = catalog.list_model_prices_for_scope_side(
        tenant_id,
        organization_id,
        catalog_key,
        PriceSide::OfficialReference,
    );
    let mut codes: Vec<String> = Vec::new();
    for price in prices.iter().filter(|price| &price.billing_meter == meter) {
        let Some(metadata) = price.rate_metadata.as_ref() else {
            // 存在无条件费率：正常解析即可命中，不需要注入档位。
            return None;
        };
        if metadata.conditions.is_empty() {
            return None;
        }
        let mut tier_code: Option<String> = None;
        for condition in &metadata.conditions {
            if condition.dimension_code != "tier_code" || condition.operator_code != "eq" {
                return None;
            }
            let value = condition.value.as_str()?.trim().to_owned();
            match &tier_code {
                Some(existing) if existing != &value => return None,
                _ => tier_code = Some(value),
            }
        }
        codes.push(tier_code?);
    }
    if codes.is_empty() {
        return None;
    }
    codes.sort();
    codes.dedup();
    // 词汇一：显式区间（`input_le_32k` / `input_32k_128k`）。
    if let Some(tiers) = explicit_context_tiers(&codes) {
        return select_explicit_context_tier(&tiers, context_tokens);
    }
    // 词汇二：累计上界（`tier_32k` / `tier_256k` / `tier_1m`）。集合里没有更小
    // 的下界，唯一自洽的解释就是"递增上界"；无法解析的命名（`tier_fast`）返回 None。
    let tiers = cumulative_context_tiers(&codes)?;
    select_cumulative_context_tier(&tiers, context_tokens)
}

fn explicit_context_tiers(codes: &[String]) -> Option<Vec<(i64, Option<i64>, String)>> {
    let mut tiers = Vec::with_capacity(codes.len());
    for code in codes {
        let (lower, upper) = parse_context_tier(code)?;
        tiers.push((lower, upper, code.clone()));
    }
    tiers.sort_by_key(|(lower, _, _)| *lower);
    // 必须从 0 开始、连续、不重叠；出现无法判定上界的档位时它只能排在最后。
    let mut expected_lower = 0_i64;
    for (index, (lower, upper, _)) in tiers.iter().enumerate() {
        if *lower != expected_lower {
            return None;
        }
        match upper {
            Some(upper) if *upper > *lower => expected_lower = *upper,
            _ => {
                if index + 1 != tiers.len() {
                    return None;
                }
            }
        }
    }
    Some(tiers)
}

fn select_explicit_context_tier(
    tiers: &[(i64, Option<i64>, String)],
    context_tokens: Option<i64>,
) -> Option<String> {
    match context_tokens {
        Some(context) => tiers
            .iter()
            .find(|(lower, upper, _)| {
                context >= *lower && upper.is_none_or(|upper| context < upper)
            })
            // 超出目录最后一档：用最高档，绝不因为目录缺一档就免单。
            .or_else(|| tiers.last())
            .map(|(_, _, code)| code.clone()),
        // 资格预检：最低档足以证明"该模型有价"。
        None => tiers.first().map(|(_, _, code)| code.clone()),
    }
}

/// 解析 `tier_32k` 这类"累计上界"命名（返回上界 token 数）。
fn parse_cumulative_tier(code: &str) -> Option<i64> {
    let normalized = code.trim().to_ascii_lowercase();
    parse_token_bound(normalized.strip_prefix("tier_")?)
}

fn cumulative_context_tiers(codes: &[String]) -> Option<Vec<(i64, String)>> {
    let mut tiers = codes
        .iter()
        .map(|code| Some((parse_cumulative_tier(code)?, code.clone())))
        .collect::<Option<Vec<_>>>()?;
    tiers.sort_by_key(|(bound, _)| *bound);
    for pair in tiers.windows(2) {
        if pair[0].0 >= pair[1].0 {
            return None;
        }
    }
    Some(tiers)
}

fn select_cumulative_context_tier(
    tiers: &[(i64, String)],
    context_tokens: Option<i64>,
) -> Option<String> {
    match context_tokens {
        // 每个档位是"小于该上界"的累计区间。
        Some(context) => tiers
            .iter()
            .find(|(upper, _)| context < *upper)
            .or_else(|| tiers.last())
            .map(|(_, code)| code.clone()),
        None => tiers.first().map(|(_, code)| code.clone()),
    }
}

/// 解析 `input_le_32k` / `input_32k_128k` / `input_gt_32k` 为数值区间。
fn parse_context_tier(code: &str) -> Option<(i64, Option<i64>)> {
    let normalized = code.trim().to_ascii_lowercase();
    let rest = normalized.strip_prefix("input_")?;
    if let Some(value) = rest.strip_prefix("le_") {
        return Some((0, Some(parse_token_bound(value)?)));
    }
    if let Some(value) = rest.strip_prefix("gt_") {
        return Some((parse_token_bound(value)?, None));
    }
    let (lower, upper) = rest.split_once('_')?;
    Some((parse_token_bound(lower)?, Some(parse_token_bound(upper)?)))
}

fn parse_token_bound(value: &str) -> Option<i64> {
    if let Some(number) = value.strip_suffix('k') {
        return number
            .parse::<i64>()
            .ok()
            .map(|number| number.saturating_mul(1024));
    }
    if let Some(number) = value.strip_suffix('m') {
        return number
            .parse::<i64>()
            .ok()
            .map(|number| number.saturating_mul(1024 * 1024));
    }
    None
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
    // 文本输入是"没有模态明细时的缺省输入档"。目录只给一组输入侧模态报
    // 价时（`google/gemini-embedding-2`：audio/image/video/llm 四个），按
    // meter code 字母序会把 `audio_input_token` 选成主档，整段文本输入将被
    // 按音频价结算。文本档必须排在模态输入之前。
    if matches!(code, "llm_input_token" | "embedding_input_token") {
        return 2;
    }
    if code.contains("input") {
        return 4;
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
        return (
            dedupe_meters(retained),
            PricingMeterSource::RouteDeclaredWithinCatalog,
        );
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
            // 缓存写入也是目录单独定价的计量单位（Anthropic：5m 1.25×、1h 2×）。
            // 不声明它，预检就不会为它出价，抽取层的"无价则并入输入"会把
            // 缓存写入按 1× 输入价结算——系统性少收。
            meters.push(BillingMeter::LlmCacheWriteToken);
            // 复合模式原先只声明文本三档，而目录给多模态模型**按模态**单独定价
            // （`openai/gpt-realtime-2`：`audio_input_token` $32/1M 对
            // `llm_input_token` $4/1M，8×；`audio_output_token` $64 对 $24；
            // `image_input_token` $5 对 $4）。声明侧不提出这些码位，报价侧就永远
            // 拿不到价格，抽取层只能把音频/图像令牌并进文本行按文本价结算。
            //
            // 声明顺序**必须**保持文本档在前：`apply_pricing_identity` 取
            // `meters.first()` 当主档，顺序变了会改写路由声明的计量单位。
            // 目录没有这些码位时 `reconcile_pricing_meters` 取交集会把它们丢掉，
            // 行为与从前完全一致（不会触发 fail-closed：`requires_complete_pricing`
            // 只把主档与 `llm_output_token` 当必需项）。
            meters.push(BillingMeter::AudioInputToken);
            meters.push(BillingMeter::ImageInputToken);
            meters.push(BillingMeter::AudioOutputToken);
            // Google 的 TTS / 图像模型把**产出侧**单独定价为
            // `audio_output_token` / `image_output_token`，没有 `llm_output_token`；
            // 实时模型还按 `video_input_token` 收视频输入。声明侧不提出这些码位，
            // 抽取层即使按模态拆出了令牌也拿不到报价（结算失败 = 免单）。
            // 顺序仍保持文本档在前：主计量单位不变。
            meters.push(BillingMeter::ImageOutputToken);
            meters.push(BillingMeter::VideoInputToken);
            // Hosted server tools are priced per call independently of tokens.
            // Declaring them lets preflight quote the catalog rate; extraction
            // emits the line only when the provider reports the tool call.
            // They are optional: `requires_complete_pricing` keeps only the
            // primary/output meters mandatory, and `reconcile_pricing_meters`
            // drops them when a model's catalog declares no tool rate.
            meters.push(BillingMeter::WebSearchCall);
            meters.push(BillingMeter::FileSearchCall);
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
                // Token 模式原先只声明主档一个计量单位，报价侧就只会给主档出价。
                // 而目录把多模态模型拆成"输入侧 / 产出侧"两个码位
                // （`openai/gpt-image-*`、`openai/gpt-realtime-*`），主档取产出侧时
                // 输入侧永远拿不到报价 ⇒ 抽取层即使量到输入量也只能不记。
                // 声明顺序保持主档在前：`apply_pricing_identity` 取 `meters.first()`
                // 当主档，顺序变了会把主计量单位换成输入侧。
                let complement = match meter {
                    BillingMeter::ImageOutputToken => Some(BillingMeter::ImageInputToken),
                    BillingMeter::ImageInputToken => Some(BillingMeter::ImageOutputToken),
                    BillingMeter::AudioOutputToken => Some(BillingMeter::AudioInputToken),
                    BillingMeter::AudioInputToken => Some(BillingMeter::AudioOutputToken),
                    BillingMeter::VideoOutputToken => Some(BillingMeter::VideoInputToken),
                    BillingMeter::VideoInputToken => Some(BillingMeter::VideoOutputToken),
                    _ => None,
                };
                meters.push(meter);
                if let Some(complement) = complement {
                    meters.push(complement);
                    // 图片的提示词部分按文本价计（OpenAI：文本输入 $5/1M 对
                    // 图像输入 $10/1M），只有上游给出 `text_tokens` 拆分时才会用到。
                    meters.push(BillingMeter::LlmInputToken);
                }
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
    // 无论是否改写主档，都要把**完整**的计量单位集合钉在调用上：预检与结算
    // 按它取价。改写后再重新解析身份会丢掉未写进路由声明的模态档（见
    // `InvocationUsage::pricing_meters` 的说明）。
    invocation.usage.pricing_meters = identity.meters.clone();
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
        LlmInputToken
        | LlmOutputToken
        | LlmReasoningToken
        | LlmCacheWriteToken
        | LlmCacheReadToken
        | LlmCacheStorageTokenHour
        | EmbeddingInputToken
        | ImageInputToken
        | ImageOutputToken
        | AudioInputToken
        | AudioOutputToken
        | VideoInputToken
        | VideoOutputToken => (BillingMode::Token, BillingQuantitySource::ResponseBody),
        EmbeddingImage | ImageResult | VideoResult | SfxResult | ApiResult | RerankSearch
        | RerankDocument | WebSearchCall | FileSearchCall | ToolCall => (
            BillingMode::ResultCount,
            BillingQuantitySource::ResponseBody,
        ),
        ImagePixel | ImageMegapixel | ApiItem => {
            (BillingMode::ItemCount, BillingQuantitySource::ResponseBody)
        }
        TtsInputCharacter | SpeechCharacter => {
            (BillingMode::Character, BillingQuantitySource::ResponseBody)
        }
        VideoInputSecond | VideoOutputSecond => (
            BillingMode::VideoSecond,
            BillingQuantitySource::ResponseBody,
        ),
        AudioInputSecond | AudioOutputSecond | MusicOutputSecond => (
            BillingMode::AudioSecond,
            BillingQuantitySource::ResponseBody,
        ),
        AudioInputMinute | AudioOutputMinute | SttAudioMinute => (
            BillingMode::AudioSecond,
            BillingQuantitySource::ResponseBody,
        ),
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
