use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::sync::Arc;

use arc_swap::ArcSwap;

use crate::domain::{
    has_text, AccountRateCard, AiModel, BillingMeter, DecimalValue, DomainError, DomainResult,
    GatewayAccessPolicy, GatewayApiKey, GatewayRiskRule, ModelMappingRule, ModelPrice,
    ModelUpstreamRoute, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRule,
    QuotaPolicy, ResolveModelMappingContext, UpstreamAccountGroup,
    UpstreamAccountGroupMetricSnapshot, UpstreamAccountRoute,
};
use crate::infrastructure::in_memory_pricing_catalog::resolve_model_mapping_from_rules;
use crate::infrastructure::sql::rows::{
    AccountRateCardRow, AiModelRow, GatewayAccessPolicyRow, GatewayApiKeyRow, GatewayRiskRuleRow,
    ModelMappingRuleRow, ModelPriceRow, ModelUpstreamRouteRow, ModelVendorRow,
    ModelVideoProfileRow, PricingDefaultRegionRow, PricingPlanRow, PricingRuleRow, QuotaPolicyRow,
    UpstreamAccountGroupMetricSnapshotRow, UpstreamAccountGroupRow, UpstreamAccountModelAccessRow,
    UpstreamAccountRouteRow, UpstreamSupplierModelAccessRow,
};
use crate::ports::{
    AccountBaseUrlConfig, AccountGroupModelAccess, AccountModelAccess, AdminLlmProtocolConfig,
    PricingCatalog, PricingDefaultRegionProvider, SupplierModelAccess, UpstreamAccountRouteCatalog,
    UpstreamRouteGateDiagnosis, VendorModelListEntry, VideoPricingTierDecision, VideoPricingTierGap,
};

#[derive(Default)]
pub struct PricingCatalogRows {
    pub vendors: Vec<ModelVendorRow>,
    pub models: Vec<AiModelRow>,
    /// 目录声明的视频计价档位（`ai_model_video_profile`）。空 = 未加载或目录未声明；
    /// 后者会让条件费率无法计价，因此加载失败是硬错误而非降级。
    pub model_video_profiles: Vec<ModelVideoProfileRow>,
    pub model_upstream_routes: Vec<ModelUpstreamRouteRow>,
    pub upstream_account_routes: Vec<UpstreamAccountRouteRow>,
    pub model_mappings: Vec<ModelMappingRuleRow>,
    pub pricing_plans: Vec<PricingPlanRow>,
    pub pricing_rules: Vec<PricingRuleRow>,
    pub account_rate_cards: Vec<AccountRateCardRow>,
    pub upstream_account_groups: Vec<UpstreamAccountGroupRow>,
    pub upstream_supplier_model_access: Vec<UpstreamSupplierModelAccessRow>,
    pub upstream_account_model_access: Vec<UpstreamAccountModelAccessRow>,
    pub api_keys: Vec<GatewayApiKeyRow>,
    pub access_policies: Vec<GatewayAccessPolicyRow>,
    pub quota_policies: Vec<QuotaPolicyRow>,
    pub gateway_risk_rules: Vec<GatewayRiskRuleRow>,
    pub upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshotRow>,
    pub prices: Vec<ModelPriceRow>,
    pub default_regions: Vec<PricingDefaultRegionRow>,
    /// Captured only when `upstream_account_routes` loads empty; explains
    /// which configuration gate blocked the whole account pool.
    pub upstream_route_gate_diagnosis: Option<UpstreamRouteGateDiagnosis>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlPricingCatalogSnapshotSummary {
    pub vendors: usize,
    pub models: usize,
    pub model_upstream_routes: usize,
    pub callable_model_upstream_routes: usize,
    pub upstream_account_routes: usize,
    pub callable_upstream_account_routes: usize,
    pub provider_upstream_account_group_bindings: usize,
    pub model_mappings: usize,
    pub pricing_plans: usize,
    pub pricing_rules: usize,
    pub upstream_account_groups: usize,
    pub upstream_suppliers: usize,
    pub api_keys: usize,
    pub prices: usize,
    pub managed_provider_secrets: usize,
}

#[derive(Clone)]
struct ScopedPricingPlan {
    id: i64,
    tenant_id: i64,
    organization_id: i64,
    value: PricingPlan,
}

#[derive(Clone)]
struct ScopedModelPrice {
    tenant_id: i64,
    organization_id: i64,
    value: ModelPrice,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct ModelPriceBusinessIdentity {
    catalog_key: String,
    region_code: String,
    price_side: PriceSide,
    billing_meter: BillingMeter,
    supplier_code: Option<String>,
    account_id: Option<i64>,
    pricing_plan_code: Option<String>,
    rate_hash: Option<String>,
}

impl From<&ModelPrice> for ModelPriceBusinessIdentity {
    fn from(price: &ModelPrice) -> Self {
        Self {
            catalog_key: price.catalog_key.clone(),
            region_code: price.region_code.clone(),
            price_side: price.price_side,
            billing_meter: price.billing_meter.clone(),
            supplier_code: price.supplier_code.clone(),
            account_id: price.account_id,
            pricing_plan_code: price.pricing_plan_code.clone(),
            rate_hash: price
                .rate_metadata
                .as_ref()
                .map(|metadata| metadata.rate_hash.clone()),
        }
    }
}

pub struct SqlPricingCatalogSnapshot {
    vendors: Vec<ModelVendorDefinition>,
    models: Vec<AiModel>,
    model_upstream_routes: Vec<ModelUpstreamRoute>,
    upstream_account_routes: Arc<[UpstreamAccountRoute]>,
    model_mappings: Vec<ModelMappingRule>,
    pricing_plans: Vec<ScopedPricingPlan>,
    pricing_rules: Vec<PricingRule>,
    account_rate_cards: Vec<AccountRateCard>,
    upstream_account_groups: Vec<UpstreamAccountGroup>,
    api_keys: Vec<GatewayApiKey>,
    access_policies: Vec<GatewayAccessPolicy>,
    quota_policies: Vec<QuotaPolicy>,
    gateway_risk_rules: Vec<GatewayRiskRule>,
    upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshot>,
    prices: Vec<ScopedModelPrice>,
    managed_provider_secrets: BTreeMap<String, String>,
    upstream_route_gate_diagnosis: Option<UpstreamRouteGateDiagnosis>,
    account_group_model_access_by_id: HashMap<i64, AccountGroupModelAccess>,
    supplier_model_access_by_code: HashMap<String, SupplierModelAccess>,
    account_model_access_by_id: HashMap<i64, AccountModelAccess>,
    supplier_default_base_url_by_code: HashMap<String, String>,
    account_base_url_config_by_id: HashMap<i64, AccountBaseUrlConfig>,
    account_billing_modes: HashMap<i64, String>,
    // --- Indexes for O(1) hot-path lookups ---
    models_by_key: HashMap<String, AiModel>,
    models_by_name: HashMap<String, Vec<String>>,
    api_keys_by_hash: HashMap<String, GatewayApiKey>,
    api_keys_by_id: HashMap<i64, GatewayApiKey>,
    upstream_account_groups_by_id: HashMap<i64, UpstreamAccountGroup>,
    pricing_plans_by_code: HashMap<String, Vec<ScopedPricingPlan>>,
    vendors_by_code: HashMap<String, ModelVendorDefinition>,
    model_upstream_routes_by_key: HashMap<String, Vec<ModelUpstreamRoute>>,
    prices_by_key: HashMap<String, Vec<ScopedModelPrice>>,
    /// Default billing region per (tenant, organization, catalog_key).
    default_regions_by_key: HashMap<(i64, i64, String), String>,
    /// 目录声明的视频计价档位，按模型 catalog key 索引。每个键下按
    /// (sort_order, 声明分辨率, 生成模式) 稳定排序，默认档位优先于其它档位。
    video_pricing_tiers_by_model: HashMap<String, Vec<VideoPricingTier>>,
    /// 目录**实际报价**的视频档位：`(catalog_key, meter_code)` → 费率里
    /// `tier_code` 条件的取值集合（均已小写化）。与声明侧取交集才得到可用的档位。
    priced_video_tier_codes_by_model_meter: HashMap<(String, String), BTreeSet<String>>,
}

/// 目录为某个视频模型声明的计价档位（`ai_model_video_profile` 的一行）。
#[derive(Debug, Clone)]
struct VideoPricingTier {
    generation_mode: Option<String>,
    resolution: Option<String>,
    /// 该 profile 声明的全部档位码，**主档位在前**：`resolutionTierCode`
    /// 优先，回落 `durationTierCode`，再并入 `pricingTierCodes` /
    /// `durationTierCodes`。目录里一个 profile 只声明一个主档位，但确实有把
    /// 附加档位写进 `pricingTierCodes` 的模型（`vidu/viduq3-pro`
    /// 的 `["dur_5s"]`），丢掉这些声明会让那些模型连"声明过的档位"都选不出来。
    tier_codes: Vec<String>,
    is_default: bool,
}

impl VideoPricingTier {
    /// 请求给出的分辨率是否命中本档位声明。目录里的 `resolution` 是
    /// `1080p` 这类短标签，请求可能给 `1080p` 或 `1920x1080`，因此同时接受
    /// 精确相等与出现在请求值中的形式。
    fn matches_resolution(&self, requested: &str) -> bool {
        let requested = requested.trim().to_ascii_lowercase();
        if requested.is_empty() {
            return false;
        }
        self.resolution.as_deref().is_some_and(|declared| {
            let declared = declared.trim().to_ascii_lowercase();
            !declared.is_empty() && (declared == requested || requested.contains(&declared))
        })
    }
}

/// 把厂商原生 api code 映射到目录的 `generationMode` 词汇表。
///
/// `kling.text_to_video` → `text_to_video`、`kling.image_to_video` →
/// `image_to_video`：厂商原生资源声明 api code，`ai_model_video_profile` 声明
/// 生成模式，两者对目录建模的这四种模式用的是同一套名字，因此按 api code 的
/// 最后一段对齐即可，不需要另建映射表。目录未建模的端点（如 `kling.avatar`、
/// `kling.motion_control`）返回 `None`，调用方据此报
/// `ApiCodeIsNotAGenerationMode` 缺口。
fn video_generation_mode_for_api_code(api_code: &str) -> Option<&'static str> {
    const MODES: &[&str] = &[
        "text_to_video",
        "image_to_video",
        "reference_to_video",
        "multi_shot",
    ];
    let suffix = api_code.rsplit('.').next()?.trim();
    MODES.iter().copied().find(|mode| *mode == suffix)
}

/// 把 `ai_model_video_profile` 行折叠成"模型 → 档位列表"的索引。
///
/// 没有声明任何档位码的行不产生候选——没有 `tier_code` 就没有可用的计价维度。
///
/// 一个 profile 的候选档位按**权威性递降**排列：`pricing_tier_codes`（目录显式
/// 指定的费率档位码）→ `resolution_tier_code` → 时长档位码。裁决时取首个"同时
/// 出现在费率表里"的候选，所以顺序即优先级；显式声明永远压过按形状推断。
fn index_video_pricing_tiers(
    rows: Vec<ModelVideoProfileRow>,
) -> HashMap<String, Vec<VideoPricingTier>> {
    let mut index: HashMap<String, Vec<VideoPricingTier>> = HashMap::new();
    for row in rows {
        let mut tier_codes = Vec::new();
        let mut push = |value: Option<&str>| {
            let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
                return;
            };
            if !tier_codes.iter().any(|existing| existing == value) {
                tier_codes.push(value.to_owned());
            }
        };
        // `pricingTierCodes` 排在最前：目录用它显式写下"这个档位在费率表里叫
        // 什么"，`tools/seed-video-profiles.mjs` 正是从该模型定价文件的 `tierCode`
        // 集合里取的值。它一旦被填上，就是目录给出的权威答案，必须盖过下面按
        // 形状推断出来的规范档位——例如 1080p 的费率在费率表里叫 `audio_res_1080p`
        // 时，只有它能命中。
        for code in row.pricing_tier_codes.iter() {
            push(Some(code.as_str()));
        }
        // 规范档位：分辨率优先，回落时长——目录里确有只声明时长档位、由时长条件
        // 定价的模型（`luma_ai/ray-3`），丢掉这一支会让那些模型同样"明明有价
        // 却说无价"。
        push(row.resolution_tier_code.as_deref());
        push(row.duration_tier_code.as_deref());
        for code in row.duration_tier_codes.iter() {
            push(Some(code.as_str()));
        }
        if tier_codes.is_empty() {
            continue;
        }
        let key = row.model_catalog_key.trim();
        if key.is_empty() {
            continue;
        }
        index.entry(key.to_owned()).or_default().push(VideoPricingTier {
            generation_mode: row.generation_mode,
            resolution: row.resolution,
            tier_codes,
            is_default: row.is_default,
        });
    }
    // 默认档位排在最前，其次分辨率更具体的档位，最后按主档位码稳定排序：调用方
    // 只需取首个满足条件的档位，结果与加载顺序无关。
    for tiers in index.values_mut() {
        tiers.sort_by(|left, right| {
            right
                .is_default
                .cmp(&left.is_default)
                .then_with(|| right.resolution.is_some().cmp(&left.resolution.is_some()))
                .then_with(|| left.tier_codes.cmp(&right.tier_codes))
        });
    }
    index
}

/// 目录**实际报价**的视频档位：`(catalog_key, meter_code)` → 费率里
/// `tier_code` 条件的取值集合。
///
/// 只取条件维度为 `tier_code` 的费率，且只取 `eq` 之外的比较符也一起收进来
/// （目录目前全是 `eq`）：这个索引的用途是"目录在这个计量单位上到底按哪些档位
/// 报价"，不是"某个请求会命中哪条费率"，所以条件操作符不影响取值集合。
fn index_priced_video_tier_codes(
    prices: &[ScopedModelPrice],
) -> HashMap<(String, String), BTreeSet<String>> {
    let mut index: HashMap<(String, String), BTreeSet<String>> = HashMap::new();
    for price in prices {
        let Some(metadata) = price.value.rate_metadata.as_ref() else {
            continue;
        };
        for condition in metadata.conditions.iter() {
            if !condition.dimension_code.eq_ignore_ascii_case("tier_code") {
                continue;
            }
            // 条件值以 JSON 承载（`PricingRateCondition.value`），档位是其中的
            // 字符串标量；非字符串取值不是档位，跳过而不是转成字面量。
            let Some(value) = condition.value.as_str() else {
                continue;
            };
            let value = value.trim();
            if value.is_empty() {
                continue;
            }
            index
                .entry((
                    price.value.catalog_key.trim().to_ascii_lowercase(),
                    price.value.billing_meter.code().trim().to_ascii_lowercase(),
                ))
                .or_default()
                .insert(value.to_owned());
        }
    }
    index
}

/// 档位裁决的纯核心：输入声明侧候选、报价侧集合与请求事实，输出判决。
///
/// 抽成自由函数是为了让"两处目录数据取交集"这条规则可以被直接单测，而不必
/// 先搭一个完整快照。语义与 `SqlPricingCatalogSnapshot::resolve_video_pricing_tier`
/// 的文档一致，这里只重复两处判序原因：
///
/// * **报价侧为空先行判定**：该计量单位在这个模型下没有任何档位条件费率，此时
///   无论声明侧怎么写都无价可查，原因与声明无关；
/// * **声明侧命中后取首个「同在报价侧」的档位码**：`tier_codes` 已按
///   `is_default` → 有分辨率 → 档位码排序，因此结果与加载顺序无关。
fn decide_video_pricing_tier(
    api_code: &str,
    meter_code: &str,
    resolution: Option<&str>,
    tiers: Option<&Vec<VideoPricingTier>>,
    priced: &BTreeSet<String>,
) -> VideoPricingTierDecision {
    let mut decision = VideoPricingTierDecision {
        priced_tier_codes: priced.iter().cloned().collect(),
        ..VideoPricingTierDecision::default()
    };

    if priced.is_empty() {
        decision.gap = Some(VideoPricingTierGap::MeterHasNoTierConditionedRate {
            meter: meter_code.to_owned(),
        });
        return decision;
    }

    let Some(expected_mode) = video_generation_mode_for_api_code(api_code) else {
        decision.gap = Some(VideoPricingTierGap::ApiCodeIsNotAGenerationMode {
            api_code: api_code.trim().to_owned(),
        });
        return decision;
    };
    let mode_tiers = tiers
        .map(|tiers| {
            tiers
                .iter()
                .filter(|tier| tier.generation_mode.as_deref() == Some(expected_mode))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if mode_tiers.is_empty() {
        decision.gap = Some(VideoPricingTierGap::NoProfileForGenerationMode {
            generation_mode: expected_mode.to_owned(),
        });
        return decision;
    }

    // 请求声明了分辨率时只认目录为该分辨率声明的档位：借另一个分辨率的价格
    // 等于凭空捏造费率。未给分辨率时按目录的排序取默认档位优先者。
    let requested = resolution.map(str::trim).filter(|value| !value.is_empty());
    let ordered = match requested {
        Some(requested) => mode_tiers
            .into_iter()
            .filter(|tier| tier.matches_resolution(requested))
            .collect::<Vec<_>>(),
        None => mode_tiers,
    };
    decision.declared_tier_codes = ordered
        .iter()
        .flat_map(|tier| tier.tier_codes.iter().cloned())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    for tier in &ordered {
        if let Some(code) = tier
            .tier_codes
            .iter()
            .find(|code| priced.contains(*code))
        {
            decision.tier_code = Some(code.clone());
            return decision;
        }
    }
    decision.gap = Some(VideoPricingTierGap::DeclaredTierNotPriced {
        declared: decision.declared_tier_codes.clone(),
        priced: decision.priced_tier_codes.clone(),
    });
    decision
}

impl SqlPricingCatalogSnapshot {
    pub fn from_rows(rows: PricingCatalogRows) -> DomainResult<Self> {
        Self::from_rows_and_managed_provider_secrets(rows, BTreeMap::new())
    }

    /// 目录对「这个模型的这个计量单位」的视频计价档位裁决。共享给两个 trait 实现，
    /// 使进程内快照与可刷新包装器不可能给出不同答案。
    ///
    /// 判决完全由目录两处数据取交集得到，不做任何命名猜测：
    ///
    /// * **声明侧**（`ai_model_video_profile`）：api code 的最后一段必须是目录的
    ///   `generationMode` 词汇（`kling.text_to_video` → `text_to_video`），
    ///   在该模式下按请求分辨率挑 profile（未给分辨率则取 `isDefault`，
    ///   再退回首个），取它声明的全部档位码；
    /// * **报价侧**（`pricing_rate` 的 `tier_code` 条件）：该
    ///   `(catalog_key, meter)` 实际报价的档位码集合。
    ///
    /// 只有**同时出现在两侧**的档位码才会成为 `tier_code`。两侧不相交时返回
    /// 带具体原因的缺口，绝不回退到"该模型的某个 profile"：`kling.avatar` /
    /// `kling.motion_control` 由 `audio_res_*`/`motion_res_*` 档位定价，而没有任何
    /// profile 声明它们，按普通视频档位兜底会把它们按更低的单价计费。全库还有 41
    /// 个模型存在同类不相交（profile 声明 `res_1080p`、费率只报
    /// `audio_res_1080p` 之类），档位价差可达 50%，因此"报缺口"是唯一正确结果：
    /// 按错误的档位收费比有诊断的缺口更糟。
    pub(crate) fn resolve_video_pricing_tier(
        &self,
        catalog_key: &str,
        api_code: &str,
        meter: &BillingMeter,
        resolution: Option<&str>,
    ) -> VideoPricingTierDecision {
        let priced = self
            .priced_video_tier_codes_by_model_meter
            .get(&(
                catalog_key.trim().to_ascii_lowercase(),
                meter.code().to_ascii_lowercase(),
            ))
            .cloned()
            .unwrap_or_default();
        decide_video_pricing_tier(
            api_code,
            meter.code(),
            resolution,
            self.video_pricing_tiers_by_model.get(catalog_key.trim()),
            &priced,
        )
    }

    pub fn from_rows_and_managed_provider_secrets(
        mut rows: PricingCatalogRows,
        managed_provider_secrets: BTreeMap<String, String>,
    ) -> DomainResult<Self> {
        // Diagnosis only applies to an empty pool; take it out before the row
        // vectors are consumed below.
        let upstream_route_gate_diagnosis = if rows.upstream_account_routes.is_empty() {
            rows.upstream_route_gate_diagnosis.take()
        } else {
            None
        };
        let pricing_plans = scoped_pricing_plans_with_standard_fallback(rows.pricing_plans)?;
        let prices = map_scoped_model_prices(rows.prices)?;
        let account_group_model_access_by_id = rows
            .upstream_account_groups
            .iter()
            .map(|row| {
                Ok((
                    row.id,
                    AccountGroupModelAccess {
                        group_id: row.id,
                        blacklist: parse_vendor_model_list(&row.model_blacklist_json)?,
                        whitelist: parse_vendor_model_list(&row.model_whitelist_json)?,
                    },
                ))
            })
            .collect::<DomainResult<HashMap<_, _>>>()?;
        let supplier_model_access_by_code = rows
            .upstream_supplier_model_access
            .iter()
            .map(|row| {
                Ok((
                    row.supplier_code.clone(),
                    SupplierModelAccess {
                        supplier_code: row.supplier_code.clone(),
                        blacklist: parse_vendor_model_list(&row.model_blacklist_json)?,
                        whitelist: parse_vendor_model_list(&row.model_whitelist_json)?,
                    },
                ))
            })
            .collect::<DomainResult<HashMap<_, _>>>()?;
        // 账号级模型黑白名单（scope_type='account' 聚合）
        let account_model_access_by_id = rows
            .upstream_account_model_access
            .into_iter()
            .map(|row| {
                Ok((
                    row.account_id,
                    AccountModelAccess {
                        account_id: row.account_id,
                        blacklist: parse_vendor_model_list(&row.model_blacklist_json)?,
                        whitelist: parse_vendor_model_list(&row.model_whitelist_json)?,
                    },
                ))
            })
            .collect::<DomainResult<HashMap<_, _>>>()?;
        // 账号计费模式映射（prepay/postpay）；同一账号多行取同一值
        let account_billing_modes = rows
            .upstream_account_routes
            .iter()
            .filter_map(|row| {
                row.billing_mode
                    .trim()
                    .is_empty()
                    .then(|| ())
                    .map(|_| (row.account_id, row.billing_mode.clone()))
            })
            .collect::<HashMap<_, _>>();
        // 默认计费 region 映射；按 tenant/org/catalog_key 唯一键组装。全局
        // (0,0) 配置作为未匹配时的兜底，具体租户配置优先。
        let default_regions_by_key = default_regions_by_key_from_rows(&rows.default_regions);
        // 供应商默认 Base URL 映射（非 LLM 资源请求走默认端点）；同一供应商多行取同一值
        let supplier_default_base_url_by_code = rows
            .upstream_account_routes
            .iter()
            .filter_map(|row| {
                row.supplier_default_base_url
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(|value| (row.supplier_code.clone(), value.to_owned()))
            })
            .collect::<HashMap<_, _>>();
        // 账号 Base URL 配置映射（账号覆盖 + 供应商协议 URL；账号优先于供应商的解析数据源）
        let account_base_url_config_by_id = rows
            .upstream_account_routes
            .iter()
            .filter_map(|row| {
                let account_protocol_base_urls =
                    parse_protocol_configs(&row.account_protocols_json);
                let supplier_protocol_base_urls =
                    parse_protocol_configs(&row.supplier_protocols_json);
                let has_config = row
                    .account_default_base_url
                    .as_deref()
                    .map(str::trim)
                    .is_some_and(|value| !value.is_empty())
                    || !account_protocol_base_urls.is_empty()
                    || !supplier_protocol_base_urls.is_empty();
                if !has_config {
                    return None;
                }
                Some((
                    row.account_id,
                    AccountBaseUrlConfig {
                        account_default_base_url: row.account_default_base_url.clone(),
                        account_protocol_base_urls,
                        supplier_protocol_base_urls,
                    },
                ))
            })
            .collect::<HashMap<_, _>>();
        let video_pricing_tiers_by_model = index_video_pricing_tiers(rows.model_video_profiles);
        // 报价侧与声明侧在同一个快照里取交集：两者必须来自同一次加载，否则
        // 刷新期间会拿旧声明配新费率。
        let priced_video_tier_codes_by_model_meter = index_priced_video_tier_codes(&prices);
        let mut snapshot = Self {
            vendors: map_rows(rows.vendors, ModelVendorRow::try_into_domain)?,
            models: map_rows(rows.models, AiModelRow::try_into_domain)?,
            model_upstream_routes: map_rows(
                rows.model_upstream_routes,
                ModelUpstreamRouteRow::try_into_domain,
            )?,
            upstream_account_routes: map_rows(
                rows.upstream_account_routes,
                UpstreamAccountRouteRow::try_into_domain,
            )?
            .into(),
            model_mappings: map_rows(rows.model_mappings, ModelMappingRuleRow::try_into_domain)?,
            pricing_plans,
            pricing_rules: rows
                .pricing_rules
                .into_iter()
                .map(|row| row.value)
                .collect(),
            account_rate_cards: rows
                .account_rate_cards
                .into_iter()
                .map(|row| row.value)
                .collect(),
            upstream_account_groups: map_rows(
                rows.upstream_account_groups,
                UpstreamAccountGroupRow::try_into_domain,
            )?,
            api_keys: map_rows(rows.api_keys, GatewayApiKeyRow::try_into_domain)?,
            access_policies: map_rows(
                rows.access_policies,
                GatewayAccessPolicyRow::try_into_domain,
            )?,
            quota_policies: map_rows(rows.quota_policies, QuotaPolicyRow::try_into_domain)?,
            gateway_risk_rules: map_rows(
                rows.gateway_risk_rules,
                GatewayRiskRuleRow::try_into_domain,
            )?,
            upstream_account_group_metric_snapshots: map_rows(
                rows.upstream_account_group_metric_snapshots,
                UpstreamAccountGroupMetricSnapshotRow::try_into_domain,
            )?,
            prices,
            managed_provider_secrets,
            upstream_route_gate_diagnosis,
            account_group_model_access_by_id,
            supplier_model_access_by_code,
            account_model_access_by_id,
            supplier_default_base_url_by_code,
            account_base_url_config_by_id,
            account_billing_modes,
            models_by_key: HashMap::new(),
            models_by_name: HashMap::new(),
            api_keys_by_hash: HashMap::new(),
            api_keys_by_id: HashMap::new(),
            upstream_account_groups_by_id: HashMap::new(),
            pricing_plans_by_code: HashMap::new(),
            vendors_by_code: HashMap::new(),
            model_upstream_routes_by_key: HashMap::new(),
            prices_by_key: HashMap::new(),
            default_regions_by_key,
            video_pricing_tiers_by_model,
            priced_video_tier_codes_by_model_meter,
        };
        snapshot.build_indexes();
        Ok(snapshot)
    }

    /// Build HashMap indexes from the Vec collections for O(1) hot-path
    /// lookups. Called once after snapshot creation; all subsequent
    /// `find_*` calls use these indexes instead of linear scans.
    fn build_indexes(&mut self) {
        self.models_by_key = self
            .models
            .iter()
            .map(|model| (model.catalog_key.clone(), model.clone()))
            .collect();
        self.models_by_name = self.models.iter().fold(HashMap::new(), |mut index, model| {
            for name in [&model.catalog_key, &model.model] {
                let keys = index.entry(name.clone()).or_default();
                if !keys.contains(&model.catalog_key) {
                    keys.push(model.catalog_key.clone());
                }
            }
            index
        });
        self.api_keys_by_hash = self
            .api_keys
            .iter()
            .map(|api_key| (api_key.key_hash.clone(), api_key.clone()))
            .collect();
        self.api_keys_by_id = self
            .api_keys
            .iter()
            .map(|api_key| (api_key.id, api_key.clone()))
            .collect();
        self.upstream_account_groups_by_id = self
            .upstream_account_groups
            .iter()
            .map(|group| (group.id, group.clone()))
            .collect();
        self.pricing_plans_by_code =
            self.pricing_plans
                .iter()
                .fold(HashMap::new(), |mut index, plan| {
                    index
                        .entry(plan.value.plan_code.clone())
                        .or_default()
                        .push(plan.clone());
                    index
                });
        self.vendors_by_code = self
            .vendors
            .iter()
            .map(|vendor| (vendor.vendor_code.clone(), vendor.clone()))
            .collect();
        self.model_upstream_routes_by_key =
            self.model_upstream_routes
                .iter()
                .fold(HashMap::new(), |mut acc, route| {
                    acc.entry(route.catalog_key.trim().to_owned())
                        .or_default()
                        .push(route.clone());
                    acc
                });
        self.prices_by_key = self.prices.iter().fold(HashMap::new(), |mut index, price| {
            index
                .entry(price.value.catalog_key.trim().to_owned())
                .or_default()
                .push(price.clone());
            index
        });
    }

    pub fn managed_provider_secrets(&self) -> BTreeMap<String, String> {
        self.managed_provider_secrets.clone()
    }

    pub fn summary(&self) -> SqlPricingCatalogSnapshotSummary {
        SqlPricingCatalogSnapshotSummary {
            vendors: self.vendors.len(),
            models: self.models.len(),
            model_upstream_routes: self.model_upstream_routes.len(),
            callable_model_upstream_routes: self
                .model_upstream_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            upstream_account_routes: self.upstream_account_routes.len(),
            callable_upstream_account_routes: self
                .upstream_account_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            provider_upstream_account_group_bindings: self
                .upstream_account_routes
                .iter()
                .map(|route| route.account_group_bindings.len())
                .sum(),
            model_mappings: self.model_mappings.len(),
            pricing_plans: self.pricing_plans.len(),
            pricing_rules: self.pricing_rules.len(),
            upstream_account_groups: self.upstream_account_groups.len(),
            upstream_suppliers: self.supplier_model_access_by_code.len(),
            api_keys: self.api_keys.len(),
            prices: self.prices.len(),
            managed_provider_secrets: self.managed_provider_secrets.len(),
        }
    }

    fn visible_model_prices(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        matches: impl Fn(&ModelPrice) -> bool,
    ) -> Vec<ModelPrice> {
        let Some(prices) = self.prices_by_key.get(model.trim()) else {
            return Vec::new();
        };

        let mut best_specificity: HashMap<ModelPriceBusinessIdentity, u8> = HashMap::new();
        for price in prices {
            if !matches(&price.value) {
                continue;
            }
            let Some(specificity) = scope_specificity(
                price.tenant_id,
                price.organization_id,
                tenant_id,
                organization_id,
            ) else {
                continue;
            };
            let identity = ModelPriceBusinessIdentity::from(&price.value);
            best_specificity
                .entry(identity)
                .and_modify(|current| *current = (*current).max(specificity))
                .or_insert(specificity);
        }

        let mut emitted = HashSet::new();
        prices
            .iter()
            .filter_map(|price| {
                if !matches(&price.value) {
                    return None;
                }
                let specificity = scope_specificity(
                    price.tenant_id,
                    price.organization_id,
                    tenant_id,
                    organization_id,
                )?;
                let identity = ModelPriceBusinessIdentity::from(&price.value);
                if best_specificity.get(&identity) != Some(&specificity)
                    || !emitted.insert(identity)
                {
                    return None;
                }
                Some(price.value.clone())
            })
            .collect()
    }

    fn scoped_pricing_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        let plans = self.pricing_plans_by_code.get(plan_code.trim())?;
        let mut selected: Option<(u8, &PricingPlan)> = None;
        for plan in plans {
            let Some(specificity) = scope_specificity(
                plan.tenant_id,
                plan.organization_id,
                tenant_id,
                organization_id,
            ) else {
                continue;
            };
            if selected
                .as_ref()
                .map(|(current, _)| specificity > *current)
                .unwrap_or(true)
            {
                selected = Some((specificity, &plan.value));
            }
        }
        selected.map(|(_, plan)| plan.clone())
    }
}

pub struct RefreshableSqlPricingCatalog {
    snapshot: ArcSwap<SqlPricingCatalogSnapshot>,
}

impl RefreshableSqlPricingCatalog {
    pub fn new(snapshot: SqlPricingCatalogSnapshot) -> Self {
        Self {
            snapshot: ArcSwap::from_pointee(snapshot),
        }
    }

    pub fn replace_snapshot(&self, snapshot: SqlPricingCatalogSnapshot) {
        self.snapshot.store(Arc::new(snapshot));
    }

    fn current_snapshot(&self) -> Arc<SqlPricingCatalogSnapshot> {
        self.snapshot.load_full()
    }
}

impl UpstreamAccountRouteCatalog for RefreshableSqlPricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]> {
        Arc::clone(&self.current_snapshot().upstream_account_routes)
    }

    fn video_pricing_tier(
        &self,
        catalog_key: &str,
        api_code: &str,
        meter: &BillingMeter,
        resolution: Option<&str>,
    ) -> VideoPricingTierDecision {
        self.current_snapshot()
            .resolve_video_pricing_tier(catalog_key, api_code, meter, resolution)
    }

    fn upstream_route_gate_diagnosis(&self) -> Option<UpstreamRouteGateDiagnosis> {
        self.current_snapshot().upstream_route_gate_diagnosis()
    }

    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        self.current_snapshot().account_group_model_access(group_id)
    }

    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        self.current_snapshot().supplier_model_access(supplier_code)
    }

    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        self.current_snapshot()
            .supplier_default_base_url_by_code
            .get(supplier_code)
            .cloned()
    }

    fn account_base_url_config(&self, account_id: i64) -> Option<AccountBaseUrlConfig> {
        self.current_snapshot()
            .account_base_url_config_by_id
            .get(&account_id)
            .cloned()
    }

    fn model_catalog_keys_by_name(&self, model_name: &str) -> Vec<String> {
        self.current_snapshot()
            .model_catalog_keys_by_name(model_name)
    }
}

impl PricingCatalog for RefreshableSqlPricingCatalog {
    fn visit_models(&self, vendor_code: Option<&str>, visitor: &mut dyn FnMut(&AiModel) -> bool) {
        self.current_snapshot().visit_models(vendor_code, visitor);
    }

    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.current_snapshot().list_model_upstream_routes(model)
    }

    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.current_snapshot().list_upstream_account_routes()
    }

    fn list_model_mappings(&self) -> Vec<ModelMappingRule> {
        self.current_snapshot().list_model_mappings()
    }

    fn list_api_keys(&self) -> Vec<GatewayApiKey> {
        self.current_snapshot().list_api_keys()
    }

    fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
        self.current_snapshot().list_upstream_account_groups()
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.current_snapshot()
            .list_model_prices(model, price_side, billing_meter)
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.current_snapshot()
            .list_model_prices_for_side(model, price_side)
    }

    fn list_model_prices_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.current_snapshot().list_model_prices_for_scope(
            tenant_id,
            organization_id,
            model,
            price_side,
            billing_meter,
        )
    }

    fn list_model_prices_for_scope_side(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
    ) -> Vec<ModelPrice> {
        self.current_snapshot().list_model_prices_for_scope_side(
            tenant_id,
            organization_id,
            model,
            price_side,
        )
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key(api_key_id)
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key_by_hash(key_hash)
    }

    fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.current_snapshot()
            .find_upstream_account_group(group_id)
    }

    fn find_access_policy(&self, policy_id: i64) -> Option<GatewayAccessPolicy> {
        self.current_snapshot().find_access_policy(policy_id)
    }

    fn find_quota_policy(&self, policy_id: i64) -> Option<QuotaPolicy> {
        self.current_snapshot().find_quota_policy(policy_id)
    }

    fn list_gateway_risk_rules(&self) -> Vec<GatewayRiskRule> {
        self.current_snapshot().list_gateway_risk_rules()
    }

    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<UpstreamAccountGroupMetricSnapshot> {
        self.current_snapshot()
            .find_latest_upstream_account_group_metric_snapshot(group_id)
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.current_snapshot().find_pricing_plan(plan_code)
    }

    fn list_pricing_rules_for_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Vec<PricingRule> {
        self.current_snapshot().list_pricing_rules_for_plan(
            tenant_id,
            organization_id,
            pricing_plan_id,
            plan_code,
        )
    }

    fn list_account_rate_cards(
        &self,
        tenant_id: i64,
        organization_id: i64,
    ) -> Vec<AccountRateCard> {
        self.current_snapshot()
            .list_account_rate_cards(tenant_id, organization_id)
    }

    fn find_pricing_plan_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.current_snapshot()
            .find_pricing_plan_for_scope(tenant_id, organization_id, plan_code)
    }

    fn find_pricing_plan_by_identity(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.current_snapshot().find_pricing_plan_by_identity(
            tenant_id,
            organization_id,
            pricing_plan_id,
            plan_code,
        )
    }

    fn find_model(&self, model: &str) -> Option<AiModel> {
        self.current_snapshot().find_model(model)
    }

    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.current_snapshot().find_vendor(vendor_code)
    }

    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &ResolveModelMappingContext,
    ) -> Option<ModelMappingRule> {
        self.current_snapshot()
            .resolve_model_mapping(source_model, context)
    }

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.current_snapshot()
            .find_model_upstream_route(model, supplier_code)
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.current_snapshot().find_model_price(
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }

    fn find_model_price_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.current_snapshot().find_model_price_for_scope(
            tenant_id,
            organization_id,
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }
}

impl PricingDefaultRegionProvider for RefreshableSqlPricingCatalog {
    fn default_billing_region(
        &self,
        tenant_id: i64,
        organization_id: i64,
        catalog_key: &str,
    ) -> Option<String> {
        self.current_snapshot()
            .default_billing_region(tenant_id, organization_id, catalog_key)
    }
}

impl PricingCatalog for SqlPricingCatalogSnapshot {
    fn visit_models(&self, vendor_code: Option<&str>, visitor: &mut dyn FnMut(&AiModel) -> bool) {
        for model in self.models.iter().filter(|model| {
            vendor_code
                .map(|vendor_code| model.vendor_code == vendor_code)
                .unwrap_or(true)
        }) {
            if !visitor(model) {
                break;
            }
        }
    }

    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.model_upstream_routes_by_key
            .get(model.trim())
            .cloned()
            .unwrap_or_default()
    }

    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.upstream_account_routes.to_vec()
    }

    fn list_model_mappings(&self) -> Vec<ModelMappingRule> {
        self.model_mappings.clone()
    }

    fn list_api_keys(&self) -> Vec<GatewayApiKey> {
        self.api_keys.clone()
    }

    fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
        self.upstream_account_groups.clone()
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.visible_model_prices(0, 0, model, |price| {
            price.price_side == price_side && price.billing_meter == billing_meter
        })
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.visible_model_prices(0, 0, model, |price| price.price_side == price_side)
    }

    fn list_model_prices_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side && price.billing_meter == billing_meter
        })
    }

    fn list_model_prices_for_scope_side(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
    ) -> Vec<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side
        })
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.api_keys_by_id.get(&api_key_id).cloned()
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.api_keys_by_hash.get(key_hash).cloned()
    }

    fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups_by_id.get(&group_id).cloned()
    }

    fn find_access_policy(&self, policy_id: i64) -> Option<GatewayAccessPolicy> {
        self.access_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    fn find_quota_policy(&self, policy_id: i64) -> Option<QuotaPolicy> {
        self.quota_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    fn list_gateway_risk_rules(&self) -> Vec<GatewayRiskRule> {
        self.gateway_risk_rules.clone()
    }

    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<UpstreamAccountGroupMetricSnapshot> {
        self.upstream_account_group_metric_snapshots
            .iter()
            .find(|snapshot| snapshot.account_group_id == group_id)
            .cloned()
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.scoped_pricing_plan(0, 0, plan_code)
    }

    fn list_pricing_rules_for_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Vec<PricingRule> {
        self.pricing_rules
            .iter()
            .filter(|rule| {
                rule.tenant_id == tenant_id
                    && rule.organization_id == organization_id
                    && rule.pricing_plan_id == pricing_plan_id
                    && rule.plan_code == plan_code
            })
            .cloned()
            .collect()
    }

    fn list_account_rate_cards(
        &self,
        tenant_id: i64,
        organization_id: i64,
    ) -> Vec<AccountRateCard> {
        self.account_rate_cards
            .iter()
            .filter(|card| {
                (card.tenant_id == tenant_id && card.organization_id == organization_id)
                    || (card.tenant_id == 0 && card.organization_id == 0)
            })
            .cloned()
            .collect()
    }

    fn find_pricing_plan_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.scoped_pricing_plan(tenant_id, organization_id, plan_code)
    }

    fn find_pricing_plan_by_identity(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.pricing_plans
            .iter()
            .find(|plan| {
                plan.id == pricing_plan_id
                    && plan.tenant_id == tenant_id
                    && plan.organization_id == organization_id
                    && plan.value.plan_code == plan_code
            })
            .map(|plan| plan.value.clone())
    }

    fn find_model(&self, model: &str) -> Option<AiModel> {
        self.models_by_key.get(model.trim()).cloned()
    }

    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.vendors_by_code.get(vendor_code).cloned()
    }

    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &ResolveModelMappingContext,
    ) -> Option<ModelMappingRule> {
        resolve_model_mapping_from_rules(&self.model_mappings, source_model, context)
    }

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.model_upstream_routes_by_key
            .get(model.trim())
            .and_then(|routes| {
                routes
                    .iter()
                    .find(|route| route.supplier_code == supplier_code)
                    .cloned()
            })
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.find_model_price_for_scope(
            0,
            0,
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }

    fn find_model_price_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side
                && price.billing_meter == billing_meter
                && option_matches(price.supplier_code.as_deref(), supplier_code)
                && option_matches(price.pricing_plan_code.as_deref(), pricing_plan_code)
        })
        .into_iter()
        .next()
    }
}

impl UpstreamAccountRouteCatalog for SqlPricingCatalogSnapshot {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]> {
        Arc::clone(&self.upstream_account_routes)
    }

    fn video_pricing_tier(
        &self,
        catalog_key: &str,
        api_code: &str,
        meter: &BillingMeter,
        resolution: Option<&str>,
    ) -> VideoPricingTierDecision {
        self.resolve_video_pricing_tier(catalog_key, api_code, meter, resolution)
    }

    fn upstream_route_gate_diagnosis(&self) -> Option<UpstreamRouteGateDiagnosis> {
        self.upstream_route_gate_diagnosis
    }

    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        self.account_group_model_access_by_id
            .get(&group_id)
            .cloned()
    }

    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        self.supplier_model_access_by_code
            .get(supplier_code)
            .cloned()
    }

    fn account_model_access(&self, account_id: i64) -> Option<AccountModelAccess> {
        self.account_model_access_by_id.get(&account_id).cloned()
    }

    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        self.supplier_default_base_url_by_code
            .get(supplier_code)
            .cloned()
    }

    fn account_base_url_config(&self, account_id: i64) -> Option<AccountBaseUrlConfig> {
        self.account_base_url_config_by_id.get(&account_id).cloned()
    }

    fn account_billing_mode(&self, account_id: i64) -> Option<String> {
        self.account_billing_modes.get(&account_id).cloned()
    }

    fn model_catalog_keys_by_name(&self, model_name: &str) -> Vec<String> {
        self.models_by_name
            .get(model_name)
            .cloned()
            .unwrap_or_default()
    }

    fn model_vendor_codes_by_name(&self, model_name: &str) -> Vec<String> {
        let mut vendors = Vec::new();
        if let Some(keys) = self.models_by_name.get(model_name) {
            for key in keys {
                if let Some(model) = self.models_by_key.get(key) {
                    if !vendors.contains(&model.vendor_code) {
                        vendors.push(model.vendor_code.clone());
                    }
                }
            }
        }
        // 兜底：按 catalog key 前缀 "vendor/" 或完整模型名再扫描一次，
        // 覆盖 catalog key 恰好等于模型名的情形。
        if vendors.is_empty() {
            for model in self.models_by_key.values() {
                if model.catalog_key == model_name
                    || model.catalog_key.starts_with(&format!("{model_name}/"))
                {
                    if !vendors.contains(&model.vendor_code) {
                        vendors.push(model.vendor_code.clone());
                    }
                }
            }
        }
        vendors
    }
}

impl PricingDefaultRegionProvider for SqlPricingCatalogSnapshot {
    fn default_billing_region(
        &self,
        tenant_id: i64,
        organization_id: i64,
        catalog_key: &str,
    ) -> Option<String> {
        self.default_regions_by_key
            .get(&(tenant_id, organization_id, catalog_key.to_owned()))
            .or_else(|| {
                self.default_regions_by_key
                    .get(&(0, 0, catalog_key.to_owned()))
            })
            .cloned()
    }
}

/// Builds a (tenant, organization, catalog_key) -> default region map from the
/// persisted `pricing_default_region` rows. The schema's unique constraint
/// guarantees at most one active default per catalog key within a scope, so the
/// later global-scope row only serves as a `(0,0)` fallback entry.
fn default_regions_by_key_from_rows(
    rows: &[PricingDefaultRegionRow],
) -> HashMap<(i64, i64, String), String> {
    rows.iter()
        .map(|row| {
            (
                (row.tenant_id, row.organization_id, row.catalog_key.clone()),
                row.default_region_code.clone(),
            )
        })
        .collect()
}

fn map_rows<R, T>(rows: Vec<R>, mapper: impl Fn(R) -> DomainResult<T>) -> DomainResult<Vec<T>> {
    rows.into_iter().map(mapper).collect()
}

/// 协议配置 JSON 字符串（[{"protocolCode","baseUrl"}]）→ 配置列表；解析失败/空串按空处理
/// （快照加载容错：管理面写入时已校验，这里仅作防御性解析）。
fn parse_protocol_configs(value: &str) -> Vec<AdminLlmProtocolConfig> {
    serde_json::from_str::<Vec<AdminLlmProtocolConfig>>(value).unwrap_or_default()
}

fn parse_vendor_model_list(value: &str) -> DomainResult<Vec<VendorModelListEntry>> {
    let items = serde_json::from_str::<Vec<serde_json::Value>>(value).map_err(|error| {
        DomainError::new(format!(
            "failed to parse upstream account group model list JSON: {error}"
        ))
    })?;
    items
        .into_iter()
        .map(|item| {
            let vendor_code = item
                .get("vendorCode")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    DomainError::new(
                        "upstream account group model list entry requires a vendorCode",
                    )
                })?
                .to_owned();
            let models = item
                .get("models")
                .and_then(|value| value.as_array())
                .map(|models| {
                    models
                        .iter()
                        .filter_map(|value| value.as_str())
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .map(ToOwned::to_owned)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            Ok(VendorModelListEntry {
                vendor_code,
                models,
            })
        })
        .collect()
}

fn scoped_pricing_plans_with_standard_fallback(
    rows: Vec<PricingPlanRow>,
) -> DomainResult<Vec<ScopedPricingPlan>> {
    let mut pricing_plans = rows
        .into_iter()
        .map(|row| {
            let tenant_id = row.tenant_id;
            let organization_id = row.organization_id;
            Ok(ScopedPricingPlan {
                id: row.id,
                tenant_id,
                organization_id,
                value: row.try_into_domain()?,
            })
        })
        .collect::<DomainResult<Vec<_>>>()?;
    if pricing_plans.iter().all(|plan| {
        plan.tenant_id != 0
            || plan.organization_id != 0
            || plan.value.plan_code.trim() != "standard"
    }) {
        pricing_plans.push(ScopedPricingPlan {
            id: 0,
            tenant_id: 0,
            organization_id: 0,
            value: PricingPlan::new(
                "standard",
                PriceSide::OfficialReference,
                DecimalValue::parse("1.000000")?,
                Money::usd("0.000000")?,
            ),
        });
    }
    Ok(pricing_plans)
}

fn map_scoped_model_prices(rows: Vec<ModelPriceRow>) -> DomainResult<Vec<ScopedModelPrice>> {
    rows.into_iter()
        .map(|row| {
            let tenant_id = row.tenant_id;
            let organization_id = row.organization_id;
            Ok(ScopedModelPrice {
                tenant_id,
                organization_id,
                value: row.try_into_domain()?,
            })
        })
        .collect()
}

fn scope_specificity(
    candidate_tenant_id: i64,
    candidate_organization_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> Option<u8> {
    if candidate_tenant_id == tenant_id && candidate_organization_id == organization_id {
        return Some(3);
    }
    if tenant_id > 0 && candidate_tenant_id == tenant_id && candidate_organization_id == 0 {
        return Some(2);
    }
    if candidate_tenant_id == 0 && candidate_organization_id == 0 {
        return Some(1);
    }
    None
}

fn option_matches(actual: Option<&str>, expected: Option<&str>) -> bool {
    match expected {
        Some(expected) => actual == Some(expected),
        None => actual.is_none(),
    }
}

#[cfg(test)]
mod video_pricing_tier_tests {
    use super::{decide_video_pricing_tier, index_video_pricing_tiers, VideoPricingTier};
    use crate::infrastructure::sql::rows::ModelVideoProfileRow;
    use crate::ports::{VideoPricingTierDecision, VideoPricingTierGap};
    use std::collections::BTreeSet;

    fn tier(
        mode: &str,
        resolution: Option<&str>,
        codes: &[&str],
        is_default: bool,
    ) -> VideoPricingTier {
        VideoPricingTier {
            generation_mode: Some(mode.to_owned()),
            resolution: resolution.map(str::to_owned),
            tier_codes: codes.iter().map(|code| (*code).to_owned()).collect(),
            is_default,
        }
    }

    fn priced(codes: &[&str]) -> BTreeSet<String> {
        codes.iter().map(|code| (*code).to_owned()).collect()
    }

    #[test]
    fn declared_tier_that_is_also_priced_is_selected() {
        // 实况 `kuaishou/kling-v3`：profile 声明 `res_1080p`，费率确实报了
        // `res_1080p`（0.112/秒）与其它档位。这是唯一可以放心计价的形态。
        let tiers = vec![tier("text_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_output_second",
            Some("1080p"),
            Some(&tiers),
            &priced(&["res_720p", "res_1080p", "res_4k", "audio_res_1080p"]),
        );
        assert_eq!(decision.tier_code(), Some("res_1080p"));
        assert!(decision.gap.is_none());
    }

    #[test]
    fn declared_tier_absent_from_the_rates_reports_a_gap_instead_of_guessing() {
        // 实况 `kuaishou/kling-3.0-turbo`：profile 声明 `res_1080p`，费率却只报
        // `audio_res_1080p` / `audio_res_720p`。此处绝不能挑 `audio_res_1080p`
        // 顶上——它正好是更贵的档位（0.168 vs 0.112），猜错就是按错误价收费。
        let tiers = vec![tier("text_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_output_second",
            Some("1080p"),
            Some(&tiers),
            &priced(&["audio_res_720p", "audio_res_1080p"]),
        );
        assert_eq!(decision.tier_code(), None);
        assert_eq!(
            decision.gap,
            Some(VideoPricingTierGap::DeclaredTierNotPriced {
                declared: vec!["res_1080p".to_owned()],
                priced: vec!["audio_res_1080p".to_owned(), "audio_res_720p".to_owned()],
            })
        );
        let description = decision.gap_description().expect("gap description");
        assert!(description.contains("res_1080p"), "{description}");
        assert!(description.contains("audio_res_1080p"), "{description}");
    }

    #[test]
    fn api_code_that_is_not_a_generation_mode_reports_that_specific_gap() {
        // 实况 `kling.avatar` / `kling.motion_control`：目录为它们发布了
        // `audio_res_*` / `motion_res_*` 费率，却没有声明对应生成模式。缺口是
        // "目录没有这个模式"，不是"没有 profile 文件"——说清楚才能定位。
        let tiers = vec![tier("text_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.avatar",
            "video_output_second",
            None,
            Some(&tiers),
            &priced(&["audio_res_720p", "audio_res_1080p"]),
        );
        assert_eq!(decision.tier_code(), None);
        assert_eq!(
            decision.gap,
            Some(VideoPricingTierGap::ApiCodeIsNotAGenerationMode {
                api_code: "kling.avatar".to_owned(),
            })
        );
    }

    #[test]
    fn meter_without_any_tier_conditioned_rate_reports_the_meter_gap_first() {
        // `video_result` 之类只在部分模型上按档位报价的计量单位：报价侧为空时
        // 原因与声明侧无关，先报计量单位这一条，避免把运维引向"改 profile"。
        let tiers = vec![tier("text_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_result",
            None,
            Some(&tiers),
            &BTreeSet::new(),
        );
        assert_eq!(
            decision.gap,
            Some(VideoPricingTierGap::MeterHasNoTierConditionedRate {
                meter: "video_result".to_owned(),
            })
        );
    }

    #[test]
    fn extra_declared_tier_codes_are_considered_in_order() {
        // 实况 `vidu/viduq3-pro`：同一个计量单位既按分辨率档也按时长档报价，
        // profile 把时长档写进 `pricingTierCodes`。主档位对不上报价时，附加
        // 声明必须能被选中，否则这份目录声明等于被丢掉。
        let tiers = vec![VideoPricingTier {
            generation_mode: Some("text_to_video".to_owned()),
            resolution: Some("720p".to_owned()),
            tier_codes: vec![
                "res_720p".to_owned(),
                "dur_5s".to_owned(),
                "dur_10s".to_owned(),
            ],
            is_default: true,
        }];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_result",
            Some("720p"),
            Some(&tiers),
            &priced(&["dur_5s", "dur_10s"]),
        );
        assert_eq!(decision.tier_code(), Some("dur_5s"));
        assert!(decision.gap.is_none());
    }

    #[test]
    fn resolution_filter_keeps_the_gap_when_no_profile_matches_the_requested_resolution() {
        // 请求 4k 而目录只声明 1080p 档位：既不能借 1080p 的价，也不能凭空报
        // 一个 4k 档位——两者都会把便宜档位的价格套到贵档位上。
        let tiers = vec![tier("text_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_output_second",
            Some("4k"),
            Some(&tiers),
            &priced(&["res_1080p", "res_4k"]),
        );
        assert_eq!(decision.tier_code(), None);
        assert_eq!(
            decision.gap,
            Some(VideoPricingTierGap::DeclaredTierNotPriced {
                declared: Vec::new(),
                priced: vec!["res_1080p".to_owned(), "res_4k".to_owned()],
            })
        );
    }

    #[test]
    fn missing_profile_for_generation_mode_is_reported_separately() {
        // api code 对得上是生成模式，但该模型在这个模式下没有 profile。
        let tiers = vec![tier("image_to_video", Some("1080p"), &["res_1080p"], true)];
        let decision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_output_second",
            None,
            Some(&tiers),
            &priced(&["res_1080p"]),
        );
        assert_eq!(
            decision.gap,
            Some(VideoPricingTierGap::NoProfileForGenerationMode {
                generation_mode: "text_to_video".to_owned(),
            })
        );
    }

    #[test]
    fn unknown_catalog_entries_never_yield_a_tier() {
        // 内存目录默认实现（无档位表、无费率表）必须保持"未知"，而不是回退成
        // 某个可计价的档位。
        let decision: VideoPricingTierDecision = decide_video_pricing_tier(
            "kling.text_to_video",
            "video_output_second",
            None,
            None,
            &BTreeSet::new(),
        );
        assert_eq!(decision.tier_code(), None);
        assert!(decision.gap.is_some());
    }

    #[test]
    fn explicit_pricing_tier_codes_outrank_the_canonical_resolution_tier() {
        // `pricingTierCodes` 是目录从该模型定价文件的 `tierCode` 集合里取值的
        // 显式声明，必须排在按形状推断出来的 `resolutionTierCode` 之前。实况
        // `vidu/viduq3-pro`：profile 同时写了 `res_720p` 与 `pricingTierCodes:
        // ["dur_5s"]`，而 `video_result` 这个计量单位只按 `dur_5s`/`dur_10s` 报价。
        let row = ModelVideoProfileRow {
            model_catalog_key: "vidu/viduq3-pro".to_owned(),
            generation_mode: Some("text_to_video".to_owned()),
            resolution: Some("720p".to_owned()),
            resolution_tier_code: Some("res_720p".to_owned()),
            duration_tier_code: None,
            duration_tier_codes: Vec::new(),
            pricing_tier_codes: vec!["dur_5s".to_owned()],
            is_default: true,
            sort_order: 10,
        };
        let index = index_video_pricing_tiers(vec![row]);
        let tiers = index.get("vidu/viduq3-pro").expect("indexed");
        assert_eq!(tiers[0].tier_codes, vec!["dur_5s", "res_720p"]);

        let decision = decide_video_pricing_tier(
            "vidu.text_to_video",
            "video_result",
            None,
            Some(tiers),
            &priced(&["dur_5s", "dur_10s"]),
        );
        assert_eq!(decision.tier_code(), Some("dur_5s"));
        assert!(decision.gap.is_none());
    }
}
