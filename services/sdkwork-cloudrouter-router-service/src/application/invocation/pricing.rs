use std::sync::Arc;

use super::{
    context_tier_code, quote_rate_hash, requested_resolution, resolve_pricing_identity,
    single_catalog_tier_code, BillingMode, BillingQuantitySource, DispatchMode, Invocation,
    InvocationAccount, InvocationBody, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationPreflightResolution, InvocationPricingQuote, InvocationUsageLine, RouteKind,
};
use crate::application::{
    InvocationInterceptor, PriceResolution, PriceResolutionStatus, PriceService, ResolvedModelPrice,
};
use crate::domain::{
    AiRouteModelRequirement, BillingMeter, DecimalValue, PriceSide, PricingDimensionContext,
    ResourceDefinition,
};
use crate::ports::{
    GatewayUsageQuantity, PricingCatalog, PricingDefaultRegionProvider, UpstreamAccountRouteCatalog,
};

#[derive(Clone)]
pub struct PricingPreflightInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

#[derive(Clone)]
pub struct PricingFinalizationInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> PricingPreflightInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> PricingFinalizationInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> InvocationInterceptor for PricingPreflightInterceptor<C>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    fn name(&self) -> &str {
        "pricing_preflight"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.dispatch.mode == DispatchMode::SyntheticLocalResponse {
                return Ok(());
            }
            if !invocation.billing.pricing_required || invocation.billing.mode == BillingMode::Free
            {
                return Ok(());
            }

            // 语音合成端点的 2xx 响应是**二进制音频**，上游不回 `usage`。
            // 目录若把这类路由改写成 token 计费，数量在派发后根本量不出来：
            // 抽取失败发生在音频已经发给客户之后，结算不执行 ⇒ 整条合成免单。
            // 预检是最后一道能"拒单"的关口；放行等于免费，拒单至少账目诚实。
            if binary_audio_synthesis_without_usage(invocation) {
                return Err(pricing_error(format!(
                    "route {} returns binary audio and the provider reports no token usage, so a \
                     token-priced request on it cannot be metered after dispatch; refusing before \
                     dispatch instead of serving the call unmetered. Configure a per-character \
                     rate for this model, or keep the route on its declared character meter.",
                    invocation.resource.api_code
                )));
            }

            // 批量任务在上游异步执行，逐请求 `usage` 只出现在**输出文件**里，而
            // 网关目前不回收批结果（没有任何代码读 `output_file_id` / JSONL）。
            // 放行一次 10k 条的 batch，等于只收一次管理请求费、却承担全部上游
            // token 成本。在批价与结果回收链路落地前拒单。
            if unmetered_batch_submission(invocation) {
                return Err(billing_unavailable_error(format!(
                    "route {} submits a batch whose per-request usage is produced asynchronously \
                     in an output file the gateway does not reconcile, so the workload would run \
                     unbilled; refusing the submission until batch usage reconciliation is \
                     enabled. Use the synchronous endpoints for billable traffic.",
                    invocation.resource.api_code
                )));
            }

            // `background: true` 的 Responses 会先回一个 queued 响应（没有 usage），
            // 真正的 token 用量在完成后的 `GET /v1/responses/{id}` 里；而那次
            // GET 按 `api_request` 收。也就是说模型调用本身完全不进账。在
            // "异步响应完成时回填结算"落地前拒单。
            if unmetered_background_response(invocation) {
                return Err(billing_unavailable_error(
                    "background responses return before the provider reports usage; the usage \
                     only appears on a later poll that the gateway bills per request, so the \
                     model call would run unbilled. Refusing background=true until async \
                     response usage reconciliation is enabled; use a synchronous response \
                     for billable traffic.",
                ));
            }

            // 实时语音的创建面只回一个会话对象（含上游签发的 `client_secret`），
            // 音频随后走 WebSocket 直连上游；本仓没有任何 WebSocket 代理或
            // `response.done` 用量回收。放行的结果是：客户拿着上游临时密钥
            // 绕过网关，音频 token 完全不进账。在 WS 代理 + 用量结算落地前拒单。
            if unmetered_realtime_session(invocation) {
                return Err(billing_unavailable_error(format!(
                    "route {} mints an upstream realtime client secret and the audio then streams \
                     over a WebSocket the gateway does not proxy, so the realtime usage would run \
                     unbilled and outside gateway controls; refusing session creation until \
                     WebSocket proxying and usage settlement are enabled.",
                    invocation.resource.api_code
                )));
            }

            // Vector-store ingestion is billed by storage byte-day at the
            // vendor, not by request. Until the daily storage worker exists,
            // refuse it as an unimplemented billing mode (501) rather than a
            // price-book gap (502), which would invite meaningless retries.
            if unmetered_vector_store_ingestion(invocation) {
                return Err(billing_unavailable_error(
                    "vector store ingestion is billed by storage byte-day; the daily \
                     storage reconciliation worker is not enabled yet, so the request \
                     was not dispatched. Remove or batch files only after storage \
                     metering is enabled.",
                ));
            }

            let price_service = PriceService::new();
            let meters = meters_for_pricing(self.catalog.as_ref(), invocation);
            for meter in meters {
                let mut resolution = resolve_price(
                    &price_service,
                    self.catalog.as_ref(),
                    invocation,
                    meter.clone(),
                    None,
                    None,
                )?;
                // 缓存读的费率可能按 `media_type`（text/audio/image）分档
                // （OpenAI realtime / gpt-image）。预检没有响应，不知道这一行
                // 属于哪个模态；若直接放弃出价，抽取层会把缓存命中折进输入
                // 按全价收（多收客户）。用合成行逐个模态试探，拿到任一可用价
                // 即可阻断"折进输入"，真实模态在结算时按行解析。
                if meter == BillingMeter::LlmCacheReadToken
                    && !matches!(
                        resolution.status,
                        PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
                    )
                {
                    if let Some(retried) = resolve_cache_read_by_media_type(
                        &price_service,
                        self.catalog.as_ref(),
                        invocation,
                        &meter,
                    ) {
                        resolution = retried;
                    }
                }
                tracing::debug!(
                    stage = "pricing_preflight",
                    meter = %meter.code(),
                    status = ?resolution.status,
                    billability = ?resolution.billability,
                    customer_charge_amount = %resolution
                        .resolved_price
                        .as_ref()
                        .map(|price| {
                            format!(
                                "{} {:?}",
                                price.customer_charge_before_sale_multiplier.currency,
                                price.customer_charge_before_sale_multiplier.unit_price
                            )
                        })
                        .unwrap_or_default(),
                    upstream_cost_amount = %resolution
                        .resolved_price
                        .as_ref()
                        .and_then(|price| price.procurement_cost.as_ref())
                        .map(|money| format!("{} {:?}", money.currency, money.unit_price))
                        .unwrap_or_default(),
                    failure = ?resolution.failure.as_ref().map(|failure| failure.code),
                    request_id = %invocation.request.request_id,
                    trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                    "pricing preflight resolution"
                );
                // Fail-closed: a billable meter whose price cannot be fully
                // resolved must reject the request BEFORE upstream dispatch —
                // the same invariant as the openai relay preflight — instead
                // of silently relaying traffic that can never be charged.
                // Cache meters stay optional: providers may report cache hits
                // on catalogs without cache pricing, and rejecting the request
                // for a missing cache rate would drop otherwise-billable
                // traffic.
                // 但"可选"不等于"收 0"：没有缓存价时，抽取层会把缓存 token
                // 并入输入行按输入价结算（见 `extract_composite_usage_from_body`
                // 与 `billing_cache_token_fallback`），不会留下 0 元事实。
                let fully_resolved = matches!(
                    resolution.status,
                    PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
                );
                if requires_complete_pricing(invocation, &meter) && !fully_resolved {
                    let failure_code = resolution
                        .failure
                        .as_ref()
                        .map(|failure| format!("{:?}", failure.code))
                        .unwrap_or_else(|| "unresolved".to_owned());
                    return Err(pricing_error(format!(
                        "pricing is not fully resolved for meter {} (status {}, reason {failure_code}) — refusing to dispatch billable traffic without a complete price",
                        meter.code(),
                        resolution.status.code(),
                    )));
                }
                let quote = fully_resolved
                    .then(|| quote_from_resolution(invocation, resolution.clone(), false));
                invocation
                    .usage
                    .add_preflight_resolution(InvocationPreflightResolution {
                        meter: meter.clone(),
                        resolution,
                    });
                if let Some(quote) = quote {
                    invocation.usage.add_pricing_quote(quote);
                }
            }

            if invocation.billing.quantity_source == BillingQuantitySource::FixedRequest
                && !invocation
                    .usage
                    .lines
                    .iter()
                    .any(|line| line.meter == BillingMeter::ApiRequest)
            {
                invocation
                    .usage
                    .add_line(InvocationUsageLine::fixed_request());
            }

            Ok(())
        })
    }
}

impl<C> InvocationInterceptor for PricingFinalizationInterceptor<C>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    fn name(&self) -> &str {
        "pricing_finalization"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if !invocation.billing.pricing_required
                || invocation.billing.mode == BillingMode::Free
                || invocation.usage.lines.is_empty()
            {
                return Ok(());
            }

            let price_service = PriceService::new();
            let line_pricing: Vec<_> = invocation
                .usage
                .lines
                .iter()
                .map(|line| {
                    let resolution = resolve_price(
                        &price_service,
                        self.catalog.as_ref(),
                        invocation,
                        line.meter.clone(),
                        line.requested_model_catalog_key.as_deref(),
                        Some(line),
                    )?;
                    // The preflight resolution is the single price object of
                    // the pipeline. Finalization must re-rate with the
                    // measured quantity (Rated settlement requires the usage
                    // line quantity inside the billing structure), but the
                    // price identity — region, rate hash, plan, unit price —
                    // must still come from the same resolution the precharge
                    // was estimated against. Any drift means two pricing
                    // reads disagreed, which is a defect, not a silent
                    // rebilling.
                    if let Some(preflight) = invocation
                        .usage
                        .preflight_resolution_for_meter(&line.meter)
                    {
                        // 带逐行模态的行本来就会解析到不同费率（预检用合成
                        // 行试探 text 档），这不是漂移。
                        if line.pricing_media_type.is_none()
                            && !preflight_resolution_matches(preflight, &resolution)
                        {
                            tracing::warn!(
                                stage = "pricing_finalization",
                                meter = %line.meter.code(),
                                preflight_status = ?preflight.status,
                                finalization_status = ?resolution.status,
                                request_id = %invocation.request.request_id,
                                "finalized usage pricing drifted from the pricing preflight resolution"
                            );
                        }
                    }
                    let quote = matches!(
                        resolution.status,
                        PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
                    )
                    .then(|| {
                        quote_from_resolution(
                            invocation,
                            resolution.clone(),
                            line.requested_model_catalog_key.is_some(),
                        )
                    });
                    Ok::<_, InvocationError>((resolution, quote))
                })
                .collect::<Result<Vec<_>, _>>()?;
            for (line, (resolution, quote)) in invocation.usage.lines.iter_mut().zip(line_pricing) {
                line.pricing_quote = quote;
                line.pricing_resolution = Some(resolution);
            }
            let pricing_quotes = dedupe_quotes(
                invocation
                    .usage
                    .lines
                    .iter()
                    .filter_map(|line| line.pricing_quote.as_ref()),
            );
            invocation.usage.pricing_quotes = pricing_quotes;
            Ok(())
        })
    }
}

/// Reports whether a finalized usage-line resolution carries the same price
/// identity as the preflight resolution for the same meter. Identity covers
/// everything that determines the charged unit price: resolution status,
/// billing region, rate hash (conditional pricing), pricing plan, and the
/// effective customer charge. Quantity differences are expected — the
/// finalization re-rates with the measured quantity — and must not count as
/// drift.
fn preflight_resolution_matches(preflight: &PriceResolution, fresh: &PriceResolution) -> bool {
    if preflight.status != fresh.status {
        return false;
    }
    match (
        preflight.resolved_price.as_ref(),
        fresh.resolved_price.as_ref(),
    ) {
        (Some(preflight_price), Some(fresh_price)) => {
            preflight_price.official_reference.region_code
                == fresh_price.official_reference.region_code
                && preflight_price.official_reference.rate_metadata
                    == fresh_price.official_reference.rate_metadata
                && preflight_price.pricing_plan_code == fresh_price.pricing_plan_code
                && preflight_price.customer_charge == fresh_price.customer_charge
        }
        (None, None) => true,
        _ => false,
    }
}

/// Reports whether the meter is guaranteed to produce a chargeable usage
/// line for this invocation, so an unresolved price must fail the request at
/// the preflight instead of silently relaying unbillable traffic. Cache
/// meters are excluded: providers may report cache hits even when the
/// catalog defines no cache price, and those hits are folded into the input
/// line at the input rate by the usage extractor — never zero-amount facts.
fn requires_complete_pricing(invocation: &Invocation, meter: &BillingMeter) -> bool {
    if matches!(
        meter,
        BillingMeter::LlmCacheReadToken | BillingMeter::LlmCacheWriteToken
    ) {
        return false;
    }
    match invocation.billing.mode {
        BillingMode::Composite => {
            Some(meter) == invocation.billing.meter.as_ref()
                || *meter == BillingMeter::LlmOutputToken
        }
        BillingMode::ExternalUsageLine => match invocation.billing.quantity_source {
            BillingQuantitySource::FixedRequest => *meter == BillingMeter::ApiRequest,
            BillingQuantitySource::AdapterUsageLines => {
                Some(meter) == invocation.billing.meter.as_ref()
                    || matches!(meter, BillingMeter::ApiResult | BillingMeter::ApiItem)
            }
            _ => Some(meter) == invocation.billing.meter.as_ref(),
        },
        _ => Some(meter) == invocation.billing.meter.as_ref(),
    }
}

/// 需要计价解析的计量单位集合。
///
/// 身份由 `pricing_identity` 唯一决定：先取路由声明的计量档，再与
/// sdkwork-models 目录为该资源键定义的官方费率计量单位对账；目录与声明完全
/// 无交集时以目录为准。预检与结算都走这里，保证两侧算的是同一组口径。
fn meters_for_pricing<C>(catalog: &C, invocation: &Invocation) -> Vec<BillingMeter>
where
    C: PricingCatalog,
{
    // 路由规划已经把身份解析结果钉在调用上；重新解析会在主档回写之后把
    // "声明 ∩ 目录"缩成主档一个（多模态路由的其余档位没有写进路由声明），
    // 抽取层随后因"无报价"拒绝拆行。只有没走过路由规划的调用
    // （单测 / 直接构造）才回退到即时解析。
    if !invocation.usage.pricing_meters.is_empty() {
        return invocation.usage.pricing_meters.clone();
    }
    resolve_pricing_identity(catalog, invocation).meters
}

fn dedupe_quotes<'a>(
    quotes: impl IntoIterator<Item = &'a InvocationPricingQuote>,
) -> Vec<InvocationPricingQuote> {
    let mut deduped = Vec::new();
    for quote in quotes {
        if deduped.iter().any(|existing: &InvocationPricingQuote| {
            existing.meter == quote.meter
                && existing.catalog_key == quote.catalog_key
                && existing.supplier_code == quote.supplier_code
                && existing.account_id == quote.account_id
                && existing.region_code == quote.region_code
                && quote_rate_hash(existing) == quote_rate_hash(quote)
        }) {
            continue;
        }
        deduped.push(quote.clone());
    }
    deduped
}

fn resolve_price<C>(
    price_service: &PriceService,
    catalog: &C,
    invocation: &Invocation,
    meter: BillingMeter,
    catalog_key_override: Option<&str>,
    usage_line: Option<&InvocationUsageLine>,
) -> Result<PriceResolution, InvocationError>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    let account = invocation
        .account
        .as_ref()
        .ok_or_else(|| pricing_error("pricing requires resolved invocation account"))?;
    let api_key_id = invocation
        .subject
        .api_key_id
        .ok_or_else(|| pricing_error("pricing requires api key context"))?;
    let catalog_key = priced_catalog_key(catalog, invocation, catalog_key_override)?;
    // 与路由规划同一处权威：档位按目录声明与目录报价取交集解析，预检与结算必须
    // 注入同一个 `tier_code`，否则预检通过的资源会在结算时因缺维度而"无价"。
    // 按 `meter` 分别解析：同一个模型不同计量单位挂在不同的档位维度上
    // （`video_output_second` 按分辨率档、`video_result` 按时长档），用同一个档位
    // 覆盖全部计量单位会把其中一支全部过滤掉。
    let pricing_tier_decision = catalog.video_pricing_tier(
        &catalog_key,
        &invocation.resource.api_code,
        &meter,
        requested_resolution(invocation).as_deref(),
    );
    // 视频档位只覆盖视频计量单位。图像模型有一批费率同样条件化在 `tier_code`
    // 上，而请求 schema 不暴露档位；当目录对该计量单位只有**一个**档位时，
    // 注入它不会改变价格（见 `single_catalog_tier_code` 的边界）。
    let tier_code = pricing_tier_decision
        .tier_code()
        .map(str::to_owned)
        .or_else(|| cache_write_tier_code(catalog, invocation, &catalog_key, &meter))
        .or_else(|| cache_read_tier_code(catalog, invocation, &catalog_key, &meter))
        .or_else(|| image_mode_tier_code(catalog, invocation, &catalog_key, &meter))
        .or_else(|| {
            // 上下文分档：预检用请求估算，结算用已抽取的输入/缓存用量。
            context_tier_code(
                catalog,
                invocation.subject.tenant_id,
                invocation.subject.organization_id,
                &catalog_key,
                &meter,
                pricing_context_tokens(invocation),
            )
        })
        .or_else(|| {
            single_catalog_tier_code(
                catalog,
                invocation.subject.tenant_id,
                invocation.subject.organization_id,
                &catalog_key,
                &meter,
            )
        });
    let dimensions = pricing_dimensions(invocation, &meter, usage_line, tier_code.as_deref());
    // 账号未显式指定 region（空或 global）时，回退到该模型配置的默认计费
    // region，使多 region 模型仍按正确的地域价格计费；未配置默认 region 则
    // 保持账号原值，历史行为不变。默认 region 同时挂到资源上，作为价格解析
    // 的 region 回退链（请求 region → 默认 region → global）的第一顺位回退，
    // 即请求地域无价目时优先采用默认地域价格，而非直接借用 global。
    let configured_default_region = catalog.default_billing_region(
        invocation.subject.tenant_id,
        invocation.subject.organization_id,
        &catalog_key,
    );
    let region_code = effective_billing_region(
        catalog,
        account,
        &catalog_key,
        configured_default_region.as_deref(),
    );
    let mut resource = ResourceDefinition::new(catalog_key.clone(), meter, invocation.occurred_at)
        .with_pricing_subject(
            api_key_id,
            account
                .account_group_id
                .or(invocation.subject.account_group_id),
        )
        .with_vendor_code(catalog_vendor_code(&catalog_key))
        .with_provider(account.supplier_code.clone(), Some(account.account_id))
        .with_region_code(region_code)
        .with_default_billing_region(configured_default_region)
        .with_api_code(invocation.resource.api_code.clone())
        // product/operation code 不在此处推断填充：条件定价（rate_metadata）
        // 的 product_code/operation_code 以定价目录为准，若用模型名/api_code
        // 强塞会导致 resource_mismatch 将合法条件价格误判为不匹配。
        // 与 openai_usage.rs 的 resource 构造保持一致（字段保持 None）。
        .with_dimensions(dimensions);
    if let Some(model) = invocation.resource.requested_model.as_deref() {
        resource = resource.with_model(model);
    }
    if let Some(line) = usage_line {
        resource = resource.with_measured_quantity(
            DecimalValue::parse(&line.quantity.billable_quantity)
                .map_err(|error| pricing_error(error.to_string()))?,
        );
    } else if invocation.billing.quantity_source == BillingQuantitySource::FixedRequest {
        resource = resource.with_measured_quantity(DecimalValue::ONE);
    }
    price_service
        .resolve(catalog, resource)
        .map_err(|error| pricing_error(error.to_string()))
}

/// Resolves the billing region for a resource. When the account carries no
/// explicit region (blank or the generic `global` placeholder), falls back to
/// the model's configured default billing region so multi-region models rate
/// against the correct regional price. Next, an explicitly configured
/// deployment region (REGION_SPEC `SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE`,
/// active registry code other than `global`) takes effect, so a China
/// mainland deployment bills `cn` even when the account pins no region. When
/// neither a default nor a deployment region is set, prefers the China
/// mainland region (`cn`) when the model genuinely presents multiple billing
/// regions that include `cn`; otherwise keeps the account's original region
/// so single-region and legacy catalogs behave exactly as before.
fn effective_billing_region<C>(
    catalog: &C,
    account: &InvocationAccount,
    catalog_key: &str,
    configured_default_region: Option<&str>,
) -> String
where
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync + 'static,
{
    let region = account.region_code.trim();
    if !region.is_empty() && !region.eq_ignore_ascii_case("global") {
        return account.region_code.clone();
    }
    if let Some(default) = configured_default_region {
        return default.to_owned();
    }
    if let Some(deployment_region) = deployment_billing_region() {
        return deployment_region;
    }
    if billing_region_prefers_china(catalog, catalog_key) {
        return "cn".to_owned();
    }
    account.region_code.clone()
}

/// Resolves the explicitly configured deployment billing region. Returns
/// `Some(region)` only when `SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE` names an
/// active REGION_SPEC registry code other than the generic `global` bucket;
/// `None` otherwise so the billing chain keeps falling back to catalog
/// defaults and the China-region preference.
fn deployment_billing_region() -> Option<String> {
    let region = sdkwork_cloudrouter_config::resolve_region_code().ok()?;
    let region = region.trim();
    if region.is_empty() || region.eq_ignore_ascii_case("global") {
        return None;
    }
    if sdkwork_cloudrouter_config::is_active_region_code(region) {
        Some(region.to_owned())
    } else {
        None
    }
}

/// Reports whether a model advertises prices in more than one distinct billing
/// region and includes the China mainland (`cn`) region among them. When true,
/// the engine defaults billing to the China region for accounts that pin no
/// specific region, instead of landing on the generic `global` bucket.
///
/// The `global` bucket counts as a real partition here: a model that rates in
/// both `cn` and `global` (the typical mainland-china deployment shape, e.g.
/// deepseek) genuinely presents two billing regions, so the account that pins
/// no region must prefer `cn` — otherwise it silently falls back to the
/// `global` price. Skipping `global` from the count would collapse such a
/// model to a single region and defeat the preference entirely.
fn billing_region_prefers_china<C>(catalog: &C, catalog_key: &str) -> bool
where
    C: PricingCatalog,
{
    let mut regions: Vec<String> = Vec::new();
    let mut has_cn = false;
    for price in catalog.list_model_prices_for_side(catalog_key, PriceSide::OfficialReference) {
        let region = price.region_code.trim();
        if region.is_empty() {
            continue;
        }
        if !regions
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(region))
        {
            regions.push(region.to_owned());
        }
        if region.eq_ignore_ascii_case("cn") {
            has_cn = true;
        }
    }
    regions.len() >= 2 && has_cn
}

/// 用合成行逐个 `media_type` 试探缓存读价格，返回第一个可用的解。
///
/// 只用于**预检**：真实行还没有产生。按 text → audio → image 顺序试探；
/// 首个命中即可阻止抽取层把缓存命中折进输入。预扣按该价估算（可能略低于
/// audio 档），结算仍按真实行的模态重算。
fn resolve_cache_read_by_media_type<C>(
    price_service: &PriceService,
    catalog: &C,
    invocation: &Invocation,
    meter: &BillingMeter,
) -> Option<PriceResolution>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    for media_type in ["text", "audio", "image"] {
        let quantity = GatewayUsageQuantity::tokens(1).ok()?;
        let line =
            InvocationUsageLine::new(meter.clone(), quantity).with_pricing_media_type(media_type);
        if let Ok(resolution) = resolve_price(
            price_service,
            catalog,
            invocation,
            meter.clone(),
            None,
            Some(&line),
        ) {
            if matches!(
                resolution.status,
                PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
            ) {
                return Some(resolution);
            }
        }
    }
    None
}

fn priced_catalog_key<C>(
    catalog: &C,
    invocation: &Invocation,
    catalog_key_override: Option<&str>,
) -> Result<String, InvocationError>
where
    C: PricingCatalog,
{
    if let Some(catalog_key) = catalog_key_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(catalog_key.to_owned());
    }
    // 定价键的唯一权威是 `pricing_identity`：它与计价预检、路由规划读到的是
    // 同一个键，因此"预检放行的账号 ⇒ 结算必然能解析出同一资源"。历史上
    // 这里对 API 资源类路由无条件取 route key，导致厂商原生媒体路由（route
    // key 是 api code，如 `kling.text_to_video`）拿 api code 去目录查价，
    // 直接 `model not found`。
    let identity = resolve_pricing_identity(catalog, invocation);
    let catalog_key = identity.catalog_key.trim();
    if catalog_key.is_empty() {
        return Err(pricing_error("pricing requires a resource catalog key"));
    }
    Ok(catalog_key.to_owned())
}

pub(super) fn quote_from_resolution(
    invocation: &Invocation,
    resolution: PriceResolution,
    catalog_key_override: bool,
) -> InvocationPricingQuote {
    let resolved = resolution
        .resolved_price
        .as_ref()
        .expect("quoted and rated resolutions contain a resolved price");
    InvocationPricingQuote {
        catalog_key: resolved.official_reference.catalog_key.clone(),
        requested_model: priced_requested_model(invocation, resolved, catalog_key_override),
        supplier_code: resolved.supplier_code.clone(),
        account_id: invocation
            .account
            .as_ref()
            .map(|account| account.account_id),
        region_code: resolved.official_reference.region_code.clone(),
        meter: resolved.billing_meter.clone(),
        unit_size: resolved.official_reference.unit_size.to_fixed_string(0),
        official_reference_unit_price: resolved.official_reference.unit_price.clone(),
        raw_upstream_cost_unit_price: resolved
            .raw_upstream_cost
            .as_ref()
            .map(|price| price.unit_price.clone()),
        procurement_cost_unit_price: resolved.procurement_cost.clone(),
        account_contract_cost_multiplier: resolved
            .account_contract_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        account_group_cost_multiplier: resolved
            .account_group_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        procurement_cost_multiplier: resolved
            .procurement_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        customer_charge_before_sale_multiplier: resolved
            .customer_charge_before_sale_multiplier
            .clone(),
        customer_charge_unit_price: resolved.customer_charge.clone(),
        sale_multiplier: resolved.sale_multiplier.to_fixed_string(6),
        reference_multiplier: resolved.reference_multiplier.to_fixed_string(6),
        pricing_plan_code: resolved.pricing_plan_code.clone(),
        group_code: resolved.group_code.clone(),
        rate_metadata: resolved.official_reference.rate_metadata.clone(),
        billing: resolution.billing,
        pricing_audit_snapshot: resolution.audit_snapshot,
    }
}

fn catalog_vendor_code(catalog_key: &str) -> &str {
    catalog_key
        .split_once('/')
        .map(|(vendor_code, _)| vendor_code)
        .unwrap_or("")
}

fn pricing_dimensions(
    invocation: &Invocation,
    meter: &BillingMeter,
    usage_line: Option<&InvocationUsageLine>,
    pricing_tier_code: Option<&str>,
) -> PricingDimensionContext {
    let mut dimensions = PricingDimensionContext::new()
        .with_value(
            "api_code",
            serde_json::json!(invocation.resource.api_code.as_str()),
        )
        .with_value(
            "operation_id",
            serde_json::json!(invocation.resource.operation_id.as_deref()),
        );
    if let InvocationBody::Json(body) = &invocation.request.body {
        for (dimension_code, pointers) in [
            ("tier_code", &["/tier_code", "/service_tier", "/tier"][..]),
            // `quality` is the vendor's quality-mode knob. `mode` is Kling's spelling of that
            // knob — the digital-human endpoint documents it as exactly a quality choice
            // (`std`：标准模式，性价比高 / `pro`：专家模式（高品质）) and the official price table
            // quotes the two levels separately, so the catalog conditions those rates on it.
            // No rate in the whole catalog used `quality` before this pointer was added, so
            // extending the list cannot re-price any request that already resolved.
            ("quality", &["/quality", "/output/quality", "/mode"][..]),
            ("resolution", &["/resolution", "/size", "/output/size"][..]),
            (
                "duration_seconds",
                &["/duration_seconds", "/duration", "/seconds"][..],
            ),
            ("result_count", &["/result_count", "/n"][..]),
            ("media_type", &["/media_type"][..]),
            ("input_type", &["/input_type"][..]),
            ("output_type", &["/output_type"][..]),
            ("context_tokens", &["/context_tokens"][..]),
        ] {
            if let Some(value) = pointers.iter().find_map(|pointer| body.pointer(pointer)) {
                dimensions.insert(dimension_code, value.clone());
            }
        }
    }
    // 目录声明的计价档位优先于请求体里的 `tier_code`：请求体里的值由调用方
    // 自行填写，目录声明才是计费依据；两者一致时无差别，不一致时以目录为准。
    if let Some(tier_code) = pricing_tier_code.map(str::trim).filter(|v| !v.is_empty()) {
        dimensions.insert("tier_code", serde_json::json!(tier_code));
    }
    add_meter_dimensions(&mut dimensions, meter, usage_line);
    // 逐行模态维度优先于"计量单位推导的模态"：同一条缓存读 meter 在
    // realtime 上可以同时有音频行与文本行，调用级只能给一个值。
    if let Some(media_type) = usage_line.and_then(|line| line.pricing_media_type.as_deref()) {
        dimensions.insert("media_type", serde_json::json!(media_type));
    }
    if dimensions.get("context_tokens").is_none() {
        if let Some(context_tokens) = billed_context_tokens(invocation) {
            dimensions.insert("context_tokens", serde_json::json!(context_tokens));
        }
    }
    dimensions
}

fn add_meter_dimensions(
    dimensions: &mut PricingDimensionContext,
    meter: &BillingMeter,
    usage_line: Option<&InvocationUsageLine>,
) {
    let media_type = match meter {
        BillingMeter::ImageInputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::ImagePixel
        | BillingMeter::ImageMegapixel
        | BillingMeter::EmbeddingImage => Some("image"),
        BillingMeter::AudioInputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::SttAudioMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::SfxResult => Some("audio"),
        BillingMeter::VideoInputToken
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoInputSecond
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => Some("video"),
        _ => None,
    };
    if let Some(media_type) = media_type {
        dimensions.insert("media_type", serde_json::json!(media_type));
    }
    let Some(line) = usage_line else {
        return;
    };
    if line.quantity.result_count > 0 {
        dimensions.insert(
            "result_count",
            serde_json::json!(line.quantity.result_count),
        );
    }
    if line.quantity.image_count > 0 {
        dimensions.insert("image_count", serde_json::json!(line.quantity.image_count));
    }
    if let Some(duration) = line
        .quantity
        .video_seconds
        .as_deref()
        .or(line.quantity.audio_seconds.as_deref())
    {
        dimensions.insert("duration_seconds", serde_json::json!(duration));
    }
    match meter {
        BillingMeter::ImageInputToken
        | BillingMeter::AudioInputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::VideoInputToken
        | BillingMeter::VideoInputSecond => {
            if let Some(media_type) = media_type {
                dimensions.insert("input_type", serde_json::json!(media_type));
            }
        }
        BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioOutputMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::SfxResult
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => {
            if let Some(media_type) = media_type {
                dimensions.insert("output_type", serde_json::json!(media_type));
            }
        }
        _ => {}
    }
}

fn priced_requested_model(
    invocation: &Invocation,
    resolved: &ResolvedModelPrice,
    catalog_key_override: bool,
) -> String {
    if should_price_by_route_key_only(invocation) || catalog_key_override {
        return resolved.model.clone();
    }
    invocation
        .resource
        .requested_model
        .clone()
        .unwrap_or_else(|| resolved.model.clone())
}

/// 响应体是**二进制音频**、且上游不上报 `usage` 的语音合成端点。
///
/// 只列"合成"面：`/v1/audio/transcriptions` 等识别端点回的是 JSON（有的还带
/// `usage`），按 token 计费是可量的，不能一并拒掉。新增厂商合成端点时，
/// 只有确认"二进制 + 无 usage"才加进来。
const BINARY_AUDIO_SYNTHESIS_API_CODES: &[&str] = &[
    "elevenlabs.text_to_speech",
    "openai.audio.speech",
    "volcengine.speech",
];

/// 该调用是否属于"token 计价但数量不可测"的二进制语音合成。
///
/// 判定读的是**目录改写之后**的计费档（预检在 `RoutingPipeline::plan_route`
/// 之后执行）：路由声明是 Character/ApiRequest 时不会命中；只有目录把它改成
/// Token（或 Composite）才会命中。`Composite` 也要挡：响应没有 `usage` 时复合
/// 抽取产出 0 行，结算层同样当"无可结算量"跳过。
fn binary_audio_synthesis_without_usage(invocation: &Invocation) -> bool {
    matches!(
        invocation.billing.mode,
        BillingMode::Token | BillingMode::Composite
    ) && BINARY_AUDIO_SYNTHESIS_API_CODES.contains(&invocation.resource.api_code.as_str())
}

/// 批量**提交**（不是轮询/取消）：逐请求用量在异步输出文件里，网关不回收。
///
/// 只匹配创建动作的精确路径：`POST /v1/batches/{id}/cancel` 与各类 GET 轮询
/// 不产生新的上游 token 成本，必须继续放行，否则客户连取消/查询都做不了。
fn unmetered_vector_store_ingestion(invocation: &Invocation) -> bool {
    // `/files` is storage byte-day and now billable; `/file_batches` has no
    // byte count in its response, so it stays fail-closed until a batch
    // storage worker can read each file object.
    let path = invocation.request.path.as_str();
    invocation.request.method == axum::http::Method::POST
        && path.starts_with("/v1/vector_stores/")
        && path.ends_with("/file_batches")
}

fn unmetered_batch_submission(invocation: &Invocation) -> bool {
    if invocation.request.method != axum::http::Method::POST {
        return false;
    }
    match (
        invocation.resource.api_code.as_str(),
        invocation.request.path.as_str(),
    ) {
        ("openai.batches", "/v1/batches") => true,
        ("anthropic.batches", "/anthropic/v1/messages/batches") => true,
        _ => false,
    }
}

/// `POST /v1/responses` 且请求体 `background: true`。
///
/// 只认创建路径与布尔真值：同步 Responses 必须继续放行；轮询 / 取消等 GET、
/// POST 不产生新的模型用量。字符串 `"true"` 不接受——契约声明的是 boolean，
/// 宽容解析只会让"以为后台、实际同步"的账单歧义更难查。
fn unmetered_background_response(invocation: &Invocation) -> bool {
    if invocation.request.method != axum::http::Method::POST
        || invocation.resource.api_code != "openai.responses"
        || invocation.request.path != "/v1/responses"
    {
        return false;
    }
    let InvocationBody::Json(body) = &invocation.request.body else {
        return false;
    };
    body.get("background").and_then(serde_json::Value::as_bool) == Some(true)
        // Accept the create only when the reconciliation worker can later price
        // and charge the completion. With the worker disabled, accepting it
        // would leave an upstream call unbilled.
        && !async_usage_reconciliation_enabled()
}

/// True when the deployment enabled asynchronous usage reconciliation.
///
/// The worker is opt-in (default off). This flag is deliberately read at the
/// gate rather than cached: enabling it is a deliberate deployment change, and
/// the gate is the only place where an acceptance would otherwise become a
/// permanent unbilled call.
fn async_usage_reconciliation_enabled() -> bool {
    crate::application::async_usage_worker_config_from_env(None)
        .map(|config| config.enabled)
        .unwrap_or(false)
}

/// 实时语音的**创建**面：响应只含会话对象与上游 `client_secret`，真正的音频
/// 用量在 WebSocket 流里。
///
/// 管理动作（accept / hangup / refer / reject）不在表内：它们不创建新的模型
/// 用量；真正创建会话的是下面四条路径。
const UNMETERED_REALTIME_CREATION_PATHS: &[&str] = &[
    "/v1/realtime/calls",
    "/v1/realtime/sessions",
    "/v1/realtime/transcription_sessions",
    "/v1/realtime/translations",
];

fn unmetered_realtime_session(invocation: &Invocation) -> bool {
    invocation.request.method == axum::http::Method::POST
        && invocation.resource.api_code == "openai.realtime"
        && UNMETERED_REALTIME_CREATION_PATHS.contains(&invocation.request.path.as_str())
}

/// 已抽取的上下文长度：输入 + 缓存读 + 缓存写（三者互斥地覆盖同一段 prompt）。
fn billed_context_tokens(invocation: &Invocation) -> Option<i64> {
    let tokens = invocation
        .usage
        .lines
        .iter()
        .filter(|line| {
            matches!(
                line.meter,
                BillingMeter::LlmInputToken
                    | BillingMeter::LlmCacheReadToken
                    | BillingMeter::LlmCacheWriteToken
            )
        })
        .filter_map(|line| line.quantity.billable_quantity.parse::<i64>().ok())
        .fold(0_i64, i64::saturating_add);
    (tokens > 0).then_some(tokens)
}

/// 预检阶段的上下文长度估算（请求体字节数 ÷ 4 + 1）。
///
/// 预检发生在派发前，拿不到 `usage`；上下文分档模型的"有没有价"必须在此刻
/// 判定。估算偏保守（CJK 的 UTF-8 字节数约为字符数的 3 倍，会高估 token），
/// 因此只会把请求推进更高的档位，不会漏收；真实档位在结算阶段按
/// `billed_context_tokens` 重算。
fn estimated_context_tokens(invocation: &Invocation) -> Option<i64> {
    let bytes = match &invocation.request.body {
        InvocationBody::Json(value) => serde_json::to_string(value).ok()?.len(),
        InvocationBody::Bytes(value) => value.len(),
        InvocationBody::Empty => 0,
    };
    (bytes > 0).then(|| ((bytes as i64) / 4).saturating_add(1).clamp(1, 10_000_000))
}

/// 定价用的上下文长度：优先用真实用量，其次用请求估算。
fn pricing_context_tokens(invocation: &Invocation) -> Option<i64> {
    billed_context_tokens(invocation).or_else(|| estimated_context_tokens(invocation))
}

/// 图像模型的**输入模式**档位（`t2i_*` / `i2i_*` / `multi_ref_*`）。
///
/// Kling v2.1 图像按文生图 / 图生图 / 多参考图三档报价（价格 1:2:4），请求
/// schema 没有档位字段，但模式完全由请求形状决定：
///
/// * `image_reference_list` / `reference_images` 非空 ⇒ `multi_ref`；
/// * `image` 非空 ⇒ `i2i`；
/// * 否则 ⇒ `t2i`。
///
/// 只在**所有**档位都属于这三种模式词汇、且请求模式恰好对应一条费率时返回；
/// 带分辨率后缀的档位（同一模式多条）或多词汇混用一律返回 None，继续
/// fail-closed——按错误模式计费会差数倍。
fn image_mode_tier_code<C>(
    catalog: &C,
    invocation: &Invocation,
    catalog_key: &str,
    meter: &BillingMeter,
) -> Option<String>
where
    C: PricingCatalog,
{
    if !matches!(
        meter,
        BillingMeter::ImageResult | BillingMeter::ImageMegapixel | BillingMeter::ImagePixel
    ) {
        return None;
    }
    let prices = catalog.list_model_prices_for_scope_side(
        invocation.subject.tenant_id,
        invocation.subject.organization_id,
        catalog_key,
        PriceSide::OfficialReference,
    );
    let mut tiers: Vec<String> = Vec::new();
    for price in prices.iter().filter(|price| &price.billing_meter == meter) {
        let Some(metadata) = price.rate_metadata.as_ref() else {
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
        tiers.push(tier_code?);
    }
    if tiers.is_empty() {
        return None;
    }
    tiers.sort();
    tiers.dedup();
    let mut per_mode = std::collections::BTreeMap::<&'static str, Vec<&String>>::new();
    for tier in &tiers {
        let normalized = tier.to_ascii_lowercase();
        let mode = if normalized.starts_with("multi_ref") {
            "multi_ref"
        } else if normalized.starts_with("i2i") {
            "i2i"
        } else if normalized.starts_with("t2i") {
            "t2i"
        } else {
            return None;
        };
        per_mode.entry(mode).or_default().push(tier);
    }
    let candidates = per_mode.get(request_image_mode(invocation))?;
    (candidates.len() == 1).then(|| candidates[0].clone())
}

/// 请求形状对应的图像输入模式。
fn request_image_mode(invocation: &Invocation) -> &'static str {
    let InvocationBody::Json(body) = &invocation.request.body else {
        return "t2i";
    };
    if ["image_reference_list", "reference_images"]
        .iter()
        .any(|field| {
            body.get(*field)
                .and_then(serde_json::Value::as_array)
                .is_some_and(|items| !items.is_empty())
        })
    {
        return "multi_ref";
    }
    let has_image = body.get("image").is_some_and(|image| match image {
        serde_json::Value::String(value) => !value.trim().is_empty(),
        serde_json::Value::Array(items) => !items.is_empty(),
        serde_json::Value::Object(_) => true,
        _ => false,
    });
    if has_image {
        "i2i"
    } else {
        "t2i"
    }
}

/// Anthropic 缓存写入的 TTL 档位（`cache_write_5m` / `cache_write_1h`）。
///
/// 目录为每个 Anthropic 模型发布两条 `llm_cache_write_token` 费率，条件分别是
/// 两个 TTL 档。请求侧只有 `cache_control.ttl` 能区分：缺省 = 5m，显式
/// `"1h"` = 1h。不传这一维时两条候选都会被过滤，预检因"缓存档可选"不报错，
/// 抽取层则把缓存写入并入输入按 1× 收（实际应为 1.25× / 2×）。
///
/// 只在目录**同时**提供这两个档位时返回；其他档位词汇
/// （`long_context` / `explicit_cache_write`）不猜，交给
/// `single_catalog_tier_code` 或"无价则并入输入"兜底。
fn cache_write_tier_code<C>(
    catalog: &C,
    invocation: &Invocation,
    catalog_key: &str,
    meter: &BillingMeter,
) -> Option<String>
where
    C: PricingCatalog,
{
    if *meter != BillingMeter::LlmCacheWriteToken {
        return None;
    }
    let prices = catalog.list_model_prices_for_scope_side(
        invocation.subject.tenant_id,
        invocation.subject.organization_id,
        catalog_key,
        PriceSide::OfficialReference,
    );
    let mut saw_rate = false;
    let mut has_5m = false;
    let mut has_1h = false;
    for price in prices.iter().filter(|price| &price.billing_meter == meter) {
        saw_rate = true;
        let Some(metadata) = price.rate_metadata.as_ref() else {
            // 存在无条件费率：正常解析即可命中。
            return None;
        };
        if metadata.conditions.is_empty() {
            return None;
        }
        for condition in &metadata.conditions {
            if condition.dimension_code != "tier_code" || condition.operator_code != "eq" {
                return None;
            }
            match condition.value.as_str()? {
                "cache_write_5m" => has_5m = true,
                "cache_write_1h" => has_1h = true,
                _ => return None,
            }
        }
    }
    (saw_rate && has_5m && has_1h).then(|| {
        if request_uses_one_hour_cache(invocation) {
            "cache_write_1h".to_owned()
        } else {
            "cache_write_5m".to_owned()
        }
    })
}

/// 请求体里是否有一个 `cache_control` 声明了 1 小时 TTL。
///
/// 遍历深度上限 64：请求体是客户可控 JSON，递归扫描必须有界。只认
/// `cache_control.ttl == "1h"`（大小写不敏感），不把别处的同名字段当信号。
fn request_uses_one_hour_cache(invocation: &Invocation) -> bool {
    scan_cache_control(invocation, true)
}

/// 请求体里是否有任意 `cache_control` 标记（显式缓存断点）。
///
/// Alibaba 的显式上下文缓存与隐式缓存是**两个不同费率**
/// （`explicit_cache_read` / `implicit_cache`）；请求侧没有强制字段，行业实现
/// 以 `cache_control` 标记区分显式缓存，缺省即隐式缓存。
fn request_has_cache_control(invocation: &Invocation) -> bool {
    scan_cache_control(invocation, false)
}

fn scan_cache_control(invocation: &Invocation, require_one_hour: bool) -> bool {
    fn walk(value: &serde_json::Value, depth: u8, require_one_hour: bool) -> bool {
        if depth > 64 {
            return false;
        }
        match value {
            serde_json::Value::Object(map) => {
                if let Some(cache) = map
                    .get("cache_control")
                    .and_then(serde_json::Value::as_object)
                {
                    if !require_one_hour {
                        return true;
                    }
                    if cache
                        .get("ttl")
                        .and_then(serde_json::Value::as_str)
                        .is_some_and(|ttl| ttl.eq_ignore_ascii_case("1h"))
                    {
                        return true;
                    }
                }
                map.values()
                    .any(|child| walk(child, depth + 1, require_one_hour))
            }
            serde_json::Value::Array(items) => items
                .iter()
                .any(|child| walk(child, depth + 1, require_one_hour)),
            _ => false,
        }
    }
    let InvocationBody::Json(body) = &invocation.request.body else {
        return false;
    };
    walk(body, 0, require_one_hour)
}

/// Alibaba 缓存读的显式/隐式档位。
///
/// 目录为该模型只提供 `explicit_cache_read` 与 `implicit_cache` 两条缓存读
/// 费率（价格不同：显式通常更便宜）。请求带 `cache_control` 标记即为显式，
/// 否则为隐式。只在恰好这两档时返回，其他词汇不猜。
fn cache_read_tier_code<C>(
    catalog: &C,
    invocation: &Invocation,
    catalog_key: &str,
    meter: &BillingMeter,
) -> Option<String>
where
    C: PricingCatalog,
{
    if *meter != BillingMeter::LlmCacheReadToken {
        return None;
    }
    let prices = catalog.list_model_prices_for_scope_side(
        invocation.subject.tenant_id,
        invocation.subject.organization_id,
        catalog_key,
        PriceSide::OfficialReference,
    );
    let mut saw_rate = false;
    let mut has_explicit = false;
    let mut has_implicit = false;
    for price in prices.iter().filter(|price| &price.billing_meter == meter) {
        saw_rate = true;
        let Some(metadata) = price.rate_metadata.as_ref() else {
            return None;
        };
        if metadata.conditions.is_empty() {
            return None;
        }
        for condition in &metadata.conditions {
            if condition.dimension_code != "tier_code" || condition.operator_code != "eq" {
                return None;
            }
            match condition.value.as_str()? {
                "explicit_cache_read" => has_explicit = true,
                "implicit_cache" => has_implicit = true,
                _ => return None,
            }
        }
    }
    (saw_rate && has_explicit && has_implicit).then(|| {
        if request_has_cache_control(invocation) {
            "explicit_cache_read".to_owned()
        } else {
            "implicit_cache".to_owned()
        }
    })
}

fn pricing_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Pricing, message)
}

fn billing_unavailable_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::BillingUnavailable, message)
}

fn should_price_by_route_key_only(invocation: &Invocation) -> bool {
    // 路由类型是定价键平面的权威：API 资源类（provider-native media/回退
    // 路径等）一律按 route key 计价，与路由规划的无模型账号预检
    // （`ensure_account_route_is_priced`）保持同一资源键；即使请求携带
    // 模型名，payload 提取预置的 `supplier/<model>` key 也不得劫持定价键。
    if let Some(kind) = invocation.resource.route_kind {
        return kind == RouteKind::Api;
    }
    if invocation.resource.model_requirement == AiRouteModelRequirement::Ignored {
        return true;
    }
    invocation.resource.model_requirement == AiRouteModelRequirement::Optional
        && invocation
            .resource
            .requested_model
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{PriceResolutionStatus, PricingAuditSnapshot, ResourceBillability};
    use crate::domain::{AiModel, ModelPrice, Money};
    use crate::infrastructure::InMemoryPricingCatalog;
    use std::sync::Mutex;

    /// Serializes tests that mutate `SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE`.
    static REGION_ENV_LOCK: Mutex<()> = Mutex::new(());

    /// A catalog where the model advertises official prices in both `cn`
    /// (CNY) and `global` (USD) but declares no model upstream routes — the
    /// real-world shape of a mainland-China deployment such as deepseek.
    /// Routing-related predicates must play no part in the China billing
    /// preference, so this scaffold deliberately carries zero model routes.
    fn catalog_with_dual_region_chat_prices() -> InMemoryPricingCatalog {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_model(
            AiModel::new("deepseek-chat", "DeepSeek Chat", "deepseek", vec!["chat"])
                .with_catalog_key("deepseek/deepseek-chat"),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "deepseek/deepseek-chat",
                "deepseek-chat",
                PriceSide::OfficialReference,
                BillingMeter::LlmInputToken,
                Money::cny("0.020000").expect("valid cn price"),
            )
            .with_region_code("cn"),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "deepseek/deepseek-chat",
                "deepseek-chat",
                PriceSide::OfficialReference,
                BillingMeter::LlmInputToken,
                Money::usd("0.030000").expect("valid global price"),
            )
            .with_region_code("global"),
        );
        catalog
    }

    fn catalog_with_single_global_region_chat_prices() -> InMemoryPricingCatalog {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_model(
            AiModel::new("legacy-model", "Legacy Model", "openai", vec!["chat"])
                .with_catalog_key("openai/legacy-model"),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/legacy-model",
                "legacy-model",
                PriceSide::OfficialReference,
                BillingMeter::LlmInputToken,
                Money::usd("0.100000").expect("valid global price"),
            )
            .with_region_code("global"),
        );
        catalog
    }

    fn quote(
        meter: BillingMeter,
        requested_model: &str,
        pricing_plan_code: &str,
    ) -> InvocationPricingQuote {
        let price = Money::usd("0.100000").expect("valid test price");
        InvocationPricingQuote {
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: requested_model.to_owned(),
            supplier_code: Some("openrouter".to_owned()),
            account_id: Some(3001),
            region_code: "global".to_owned(),
            meter,
            unit_size: "1".to_owned(),
            official_reference_unit_price: price.clone(),
            raw_upstream_cost_unit_price: Some(price.clone()),
            procurement_cost_unit_price: Some(price.clone()),
            account_contract_cost_multiplier: Some("1.000000".to_owned()),
            account_group_cost_multiplier: Some("1.000000".to_owned()),
            procurement_cost_multiplier: Some("1.000000".to_owned()),
            customer_charge_before_sale_multiplier: price.clone(),
            customer_charge_unit_price: price,
            sale_multiplier: "1.000000".to_owned(),
            reference_multiplier: "1.000000".to_owned(),
            pricing_plan_code: pricing_plan_code.to_owned(),
            group_code: "standard-group".to_owned(),
            rate_metadata: None,
            billing: None,
            pricing_audit_snapshot: PricingAuditSnapshot {
                resource: ResourceDefinition::new(
                    "openai/gpt-4o-mini",
                    BillingMeter::LlmInputToken,
                    chrono::Utc::now(),
                ),
                status: PriceResolutionStatus::Quoted,
                billability: ResourceBillability::Chargeable,
                rate_identity: None,
                strategy: None,
                failure: None,
            },
        }
    }

    #[test]
    fn dedupe_quotes_keeps_the_first_matching_quote_and_input_order() {
        let first = quote(BillingMeter::LlmInputToken, "first-model", "first-plan");
        let duplicate = quote(BillingMeter::LlmInputToken, "later-model", "later-plan");
        let next = quote(BillingMeter::LlmOutputToken, "output-model", "output-plan");

        let deduped = dedupe_quotes([&first, &duplicate, &next]);

        assert_eq!(2, deduped.len());
        assert_eq!(BillingMeter::LlmInputToken, deduped[0].meter);
        assert_eq!("first-model", deduped[0].requested_model);
        assert_eq!("first-plan", deduped[0].pricing_plan_code);
        assert_eq!(BillingMeter::LlmOutputToken, deduped[1].meter);
        assert_eq!("output-model", deduped[1].requested_model);
    }

    /// The China billing preference must be driven by the price geography of
    /// the model — `cn` + `global` official prices — not by model upstream
    /// routes. The scaffold carries no model routes at all; with the old
    /// route-coupled predicate this test failed because `has_cn_route` was
    /// always false, and with the old partition count this test failed
    /// because `global` was excluded so `cn` + `global` looked single-region.
    #[test]
    fn china_preference_is_driven_by_multi_region_prices_not_routes() {
        let dual = catalog_with_dual_region_chat_prices();
        assert!(
            billing_region_prefers_china(&dual, "deepseek/deepseek-chat"),
            "cn + global official prices must prefer the China billing region"
        );

        let single = catalog_with_single_global_region_chat_prices();
        assert!(
            !billing_region_prefers_china(&single, "openai/legacy-model"),
            "a single-region catalog must not flip billing to cn"
        );
    }

    /// `deployment_billing_region` must surface the deployment region exactly
    /// as configured through `SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE` when it
    /// names an active registry code other than `global` — this is the direct
    /// fix for "the gateway boots with region `cn` yet prices in `global`".
    ///
    /// Env-mutating tests are serialized behind `REGION_ENV_LOCK` because Rust
    /// runs tests in parallel and `std::env::set_var` is process-global —
    /// without the lock the cases clobber each other's variable.
    #[test]
    fn deployment_billing_region_surfaces_an_active_non_global_region() {
        let _guard = REGION_ENV_LOCK.lock().unwrap();
        set_region_env("cn");
        let region = deployment_billing_region();
        clear_region_env();
        assert_eq!(Some("cn".to_owned()), region);
    }

    #[test]
    fn deployment_billing_region_ignores_global_and_unset_env() {
        let _guard = REGION_ENV_LOCK.lock().unwrap();
        set_region_env("global");
        let global_region = deployment_billing_region();
        clear_region_env();

        let unset_region = deployment_billing_region();

        assert_eq!(None, global_region);
        assert_eq!(None, unset_region);
    }

    #[test]
    fn deployment_billing_region_ignores_codes_outside_the_active_registry() {
        let _guard = REGION_ENV_LOCK.lock().unwrap();
        set_region_env("unknown-market");
        let region = deployment_billing_region();
        clear_region_env();
        assert_eq!(None, region);
    }

    fn set_region_env(value: &str) {
        std::env::set_var(
            sdkwork_cloudrouter_config::deployment::ENV_REGION_CODE,
            value,
        );
    }

    fn clear_region_env() {
        std::env::remove_var(sdkwork_cloudrouter_config::deployment::ENV_REGION_CODE);
    }

    /// The digital-human endpoint picks its price level with `mode` (`std`/`pro`) instead of a
    /// resolution, so the catalog conditions those two rates on `quality` — the same dimension
    /// the router already had a pointer list for, but which no rate used before. The router
    /// only supplies a dimension it holds a pointer for, so with `quality` reading just
    /// `/quality` and `/output/quality` the pro rate could never match and every pro request
    /// would be refused as unpriced. This pins the pointer, not the price.
    #[test]
    fn kling_avatar_mode_reaches_the_quality_dimension() {
        use crate::application::invocation::{
            InvocationAuthType, InvocationBilling, InvocationRequest, InvocationResource,
            InvocationSubject,
        };
        use crate::domain::{BillingOwnerKind, RoutingCapability};

        fn invocation_with_body(body: serde_json::Value) -> Invocation {
            Invocation::new(
                InvocationRequest::new(axum::http::Method::POST, "/v1/videos/avatar/image2video")
                    .with_body(InvocationBody::Json(body)),
                InvocationSubject {
                    auth_type: InvocationAuthType::GatewayApiKey,
                    api_key_id: Some(1),
                    api_key_name_snapshot: None,
                    tenant_id: 10,
                    organization_id: 20,
                    user_id: 30,
                    billing_organization_id: 0,
                    billing_owner: BillingOwnerKind::Personal,
                    account_group_id: Some(1),
                    account_group_code: Some("group-1".to_owned()),
                    pricing_plan_code: None,
                    roles: Vec::new(),
                    scopes: Vec::new(),
                },
                InvocationResource::model_call(
                    "kuaishou/kling-ai-avatar-v2",
                    "kling.avatar",
                    RoutingCapability::Video,
                    AiRouteModelRequirement::Required,
                )
                .with_requested_model("kling-ai-avatar-v2"),
                InvocationBilling::free(),
            )
        }

        let pro = invocation_with_body(serde_json::json!({
            "model_name": "kling-ai-avatar-v2",
            "mode": "pro"
        }));
        let dimensions = pricing_dimensions(&pro, &BillingMeter::VideoOutputSecond, None, None);
        assert_eq!(
            Some(&serde_json::json!("pro")),
            dimensions.get("quality"),
            "`mode` must reach the `quality` dimension, otherwise the pro rate can never match"
        );

        // `mode` is optional at the vendor and defaults to `std`, which is why the catalog also
        // publishes an unconditional rate at the default-mode price: leaving `quality` unset is
        // what makes that rate the one that matches, and materialising a default here would
        // instead make the request match nothing.
        let without_mode = invocation_with_body(serde_json::json!({
            "model_name": "kling-ai-avatar-v2"
        }));
        let dimensions =
            pricing_dimensions(&without_mode, &BillingMeter::VideoOutputSecond, None, None);
        assert!(
            dimensions.get("quality").is_none(),
            "an omitted `mode` must leave `quality` unset so the default-mode rate matches"
        );
    }
}
